"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  extractBadgeInfo,
  hasCredibleBadgeInfo,
  sanitizeBadgeInfo,
  type ExtractedBadgeInfo,
} from "@/lib/photos/badge-ocr";
import {
  decodeQrFromBlob,
  decodeQrFromImageData,
  ensureJsQR,
  normalizeLinkedInCandidate,
  resolveLinkedInProfile,
  videoFrameToImageData,
  videoFrameToJpegBlob,
} from "@/lib/photos/badge-qr";
import { fetchLinkedInAvatar } from "@/lib/photos/linkedin-avatar";
import { extractLinkedInFromText } from "@/lib/routes";

export interface CaptureFirstResult {
  badgeBlob: Blob;
  badgePreviewUrl: string;
  extracted: ExtractedBadgeInfo;
  linkedinUrl?: string;
  photoBlob?: Blob;
  photoPreviewUrl?: string;
  statusMessage: string;
}

interface CaptureFirstScreenProps {
  onCaptured: (result: CaptureFirstResult) => void;
  onSkip: () => void;
}

export function CaptureFirstScreen({
  onCaptured,
  onSkip,
}: CaptureFirstScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const capturedRef = useRef(false);
  const scanRafRef = useRef<number | null>(null);
  const lastScanAtRef = useRef(0);

  // Desktop laptops only have a front camera; phones prefer the rear one.
  const [facingMode, setFacingMode] = useState<"environment" | "user">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches
      ? "user"
      : "environment",
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [cameraRetryKey, setCameraRetryKey] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState(
    "QR, badge, or LinkedIn profile on a phone",
  );

  useEffect(() => {
    let cancelled = false;

    function cameraErrorMessage(err: unknown): string {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name?: string }).name)
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        return "Camera permission is blocked. Click the camera icon in the address bar → Allow, then tap Retry.";
      }
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        return "No camera found on this device. Use gallery, or skip to enter details manually.";
      }
      if (name === "NotReadableError" || name === "TrackStartError") {
        return "Camera is busy (another tab or app). Close other RememberMe tabs, then tap Retry.";
      }
      if (!window.isSecureContext) {
        return "Camera needs a secure page (localhost or HTTPS). Open http://localhost:3000 — not a LAN IP.";
      }
      return "Couldn’t open the camera. Use gallery, or skip to enter details manually.";
    }

    function isVirtualCamera(label: string): boolean {
      return /virtual|obs|broadcast|many.?cam|snap\s*camera|droidcam|iriun|quest|nvidia|emanuate|unity\s*capture/i.test(
        label,
      );
    }

    function scoreCamera(label: string, mode: "environment" | "user"): number {
      let score = 0;
      if (isVirtualCamera(label)) score -= 50;
      if (/webcam|true\s*vision|integrated|built.?in|facetime|hd\s*camera|lenovo|hp |logitech|microsoft/i.test(label)) {
        score += 20;
      }
      if (mode === "user" && /front|user|facing\s*user/i.test(label)) score += 10;
      if (mode === "environment" && /back|rear|environment/i.test(label)) score += 10;
      return score;
    }

    async function requestStream(
      mode: "environment" | "user",
    ): Promise<MediaStream> {
      let lastError: unknown;

      // Probe once so device labels are available, then pick a real webcam.
      try {
        const probe = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        probe.getTracks().forEach((t) => t.stop());
      } catch (err) {
        lastError = err;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((d) => d.kind === "videoinput" && d.deviceId)
        .sort(
          (a, b) => scoreCamera(b.label, mode) - scoreCamera(a.label, mode),
        );

      for (const cam of cameras) {
        if (isVirtualCamera(cam.label) && cameras.some((c) => !isVirtualCamera(c.label))) {
          continue;
        }
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: { exact: cam.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (err) {
          lastError = err;
        }
      }

      const fallbacks: MediaStreamConstraints[] = [
        { audio: false, video: { facingMode: { ideal: mode } } },
        { audio: false, video: true },
      ];
      for (const constraints of fallbacks) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError;
    }

    async function attachStream(stream: MediaStream) {
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve();
          return;
        }
        const onReady = () => {
          video.removeEventListener("loadeddata", onReady);
          resolve();
        };
        video.addEventListener("loadeddata", onReady);
        // Don't hang forever if metadata never fires
        setTimeout(resolve, 1500);
      });
      await video.play().catch(() => undefined);
    }

    async function startCamera() {
      setCameraReady(false);
      setCameraError(null);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      if (!window.isSecureContext) {
        setCameraError(
          "Camera needs a secure page (localhost or HTTPS). Open http://localhost:3000 — not a LAN IP.",
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera not available in this browser.");
        return;
      }

      try {
        await ensureJsQR();
        const stream = await requestStream(facingMode);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        await attachStream(stream);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setCameraReady(true);
        setScanHint("Scanning… hold steady on a LinkedIn QR");
      } catch (err) {
        if (!cancelled) setCameraError(cameraErrorMessage(err));
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode, cameraRetryKey]);

  async function finishWithLinkedIn(file: Blob, linkedinUrl: string) {
    setStatus("LinkedIn QR found — looking up profile…");
    const profile = await resolveLinkedInProfile(linkedinUrl);
    setStatus(
      profile.name
        ? `Found ${profile.name} — fetching photo…`
        : "Fetching LinkedIn photo…",
    );
    const avatar = await fetchLinkedInAvatar(linkedinUrl, profile.photoUrl);
    const displayName = profile.name;
    const extracted: ExtractedBadgeInfo = {
      name: displayName,
      title: profile.headline,
      rawText: linkedinUrl,
    };

    let photoBlob: Blob | undefined;
    let photoPreviewUrl: string | undefined;
    if (avatar) {
      photoBlob = avatar;
      photoPreviewUrl = URL.createObjectURL(avatar);
    }

    onCaptured({
      badgeBlob: file,
      badgePreviewUrl: URL.createObjectURL(file),
      extracted,
      linkedinUrl,
      photoBlob,
      photoPreviewUrl,
      statusMessage: displayName
        ? `LinkedIn found for ${displayName} — review and save.`
        : profile.privateProfile
          ? "LinkedIn profile isn’t public — enter the name manually."
          : avatar
            ? "LinkedIn photo filled — add the name, then save."
            : "LinkedIn URL filled — add the name, then save.",
    });
  }

  function resetCaptureForRetry(message: string) {
    processingRef.current = false;
    capturedRef.current = false;
    setProcessing(false);
    setStatus(null);
    setCaptureNotice(message);
    setScanHint("Try another photo, or skip to enter details");
  }

  async function finishWithBadge(file: Blob, linkedinFromQr?: string) {
    setStatus("Extracting details…");
    let extracted = sanitizeBadgeInfo(
      await extractBadgeInfo(file, setStatus),
    );
    let linkedinUrl = linkedinFromQr;
    const fromText = extractLinkedInFromText(extracted.rawText || "");
    if (fromText) linkedinUrl = linkedinUrl || fromText;

    // LinkedIn screenshot / share image with a profile URL: prefer live name + photo
    if (linkedinUrl) {
      setStatus("Looking up LinkedIn profile…");
      const profile = await resolveLinkedInProfile(linkedinUrl);
      // Public OG name wins; for private profiles keep OCR name over a slug guess
      if (profile.name && (!profile.privateProfile || !extracted.name)) {
        extracted = {
          ...extracted,
          name: profile.name,
          title: profile.headline || extracted.title,
        };
      } else if (profile.headline && !extracted.title) {
        extracted = { ...extracted, title: profile.headline };
      }
      const avatar = await fetchLinkedInAvatar(linkedinUrl, profile.photoUrl);
      if (!hasCredibleBadgeInfo(extracted, linkedinUrl) && !profile.name) {
        resetCaptureForRetry(
          profile.privateProfile
            ? "This LinkedIn profile isn’t public — enter the name manually, or skip."
            : "Couldn’t find a name on that photo. Retake, use gallery, or skip.",
        );
        return;
      }

      onCaptured({
        badgeBlob: file,
        badgePreviewUrl: URL.createObjectURL(file),
        extracted,
        linkedinUrl,
        photoBlob: avatar || undefined,
        photoPreviewUrl: avatar ? URL.createObjectURL(avatar) : undefined,
        statusMessage: profile.name
          ? `LinkedIn found for ${profile.name} — review and save.`
          : extracted.name
            ? "Details extracted — review and save."
            : "LinkedIn URL filled — add the name, then save.",
      });
      return;
    }

    if (!hasCredibleBadgeInfo(extracted, linkedinUrl)) {
      resetCaptureForRetry(
        "Couldn’t read a name. Hold steady on their LinkedIn profile (or a badge), retake, use gallery, or skip.",
      );
      return;
    }

    onCaptured({
      badgeBlob: file,
      badgePreviewUrl: URL.createObjectURL(file),
      extracted,
      linkedinUrl,
      statusMessage: "Details extracted — review and save.",
    });
  }

  async function processImage(file: Blob) {
    if (processingRef.current || capturedRef.current) return;
    processingRef.current = true;
    capturedRef.current = true;
    setProcessing(true);
    setCaptureNotice(null);
    setStatus("Reading image…");

    try {
      const qrRaw = await decodeQrFromBlob(file);
      const linkedinUrl = qrRaw
        ? normalizeLinkedInCandidate(qrRaw)
        : undefined;

      if (linkedinUrl) {
        // LinkedIn QR: never OCR the QR bitmap — it produces garbage fields
        await finishWithLinkedIn(file, linkedinUrl);
        return;
      }

      await finishWithBadge(file, undefined);
    } catch {
      resetCaptureForRetry(
        "Couldn’t process that image. Try again, use gallery, or skip.",
      );
    }
  }

  async function captureFrameAndProcess(linkedinHint?: string) {
    const video = videoRef.current;
    if (!video || processingRef.current || capturedRef.current) return;

    const blob = await videoFrameToJpegBlob(video);
    if (!blob) return;

    if (linkedinHint) {
      processingRef.current = true;
      capturedRef.current = true;
      setProcessing(true);
      try {
        await finishWithLinkedIn(blob, linkedinHint);
      } catch {
        processingRef.current = false;
        capturedRef.current = false;
        setProcessing(false);
        setStatus(null);
      }
      return;
    }

    void processImage(blob);
  }

  // Live QR auto-capture loop
  useEffect(() => {
    if (!cameraReady || processing || cameraError) {
      if (scanRafRef.current != null) {
        cancelAnimationFrame(scanRafRef.current);
        scanRafRef.current = null;
      }
      return;
    }

    let active = true;

    const tick = (now: number) => {
      if (!active || processingRef.current || capturedRef.current) return;

      // ~4 scans / second to keep UI smooth
      if (now - lastScanAtRef.current >= 250) {
        lastScanAtRef.current = now;
        const video = videoRef.current;
        if (video) {
          const frame = videoFrameToImageData(video, 720);
          if (frame) {
            const raw = decodeQrFromImageData(frame);
            if (raw) {
              const linkedin = normalizeLinkedInCandidate(raw);
              if (linkedin) {
                setScanHint("LinkedIn QR found — capturing…");
                void captureFrameAndProcess(linkedin);
                return;
              }
              // Non-LinkedIn QR on a badge — still auto-capture for OCR
              setScanHint("QR found — capturing badge…");
              void captureFrameAndProcess();
              return;
            }
          }
        }
      }

      scanRafRef.current = requestAnimationFrame(tick);
    };

    scanRafRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (scanRafRef.current != null) {
        cancelAnimationFrame(scanRafRef.current);
        scanRafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture helpers are stable enough for this loop
  }, [cameraReady, processing, cameraError]);

  function flipCamera() {
    capturedRef.current = false;
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-5 pb-[max(1rem,var(--app-sab,0px))] pt-4">
        <div className="mb-4 shrink-0 space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Capture LinkedIn QR/Badge
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Hold a LinkedIn QR in view to auto-capture. Or tap the shutter on a
            badge or someone’s LinkedIn profile on another phone — same as
            uploading a screenshot.
          </p>
        </div>

        {/* Preview shrinks; controls stay pinned — errors overlay, never push UI */}
        <div className="relative min-h-[12rem] flex-1 overflow-hidden rounded-lg bg-black">
          {!cameraError ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 size-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-secondary px-6 py-4 text-center">
              <Camera className="size-10 shrink-0 text-muted-foreground stroke-[1.5]" />
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {cameraError}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="h-10 shrink-0 rounded-lg"
                onClick={() => setCameraRetryKey((k) => k + 1)}
              >
                Retry camera
              </Button>
            </div>
          )}

          {/* Scan reticle */}
          {!processing && cameraReady && !cameraError && !captureNotice && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-48 rounded-lg border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            </div>
          )}

          {!processing && cameraReady && !cameraError && !captureNotice && (
            <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm font-medium text-white drop-shadow">
              {scanHint}
            </p>
          )}

          {processing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
              <Loader2 className="size-7 animate-spin" />
              <p className="text-sm">{status || "Working…"}</p>
            </div>
          )}

          {captureNotice && !processing && (
            <div
              role="status"
              className="absolute inset-x-3 bottom-3 z-20 max-h-[40%] overflow-y-auto rounded-lg bg-background/95 px-3 py-2.5 text-center text-sm leading-snug text-destructive shadow-lg ring-1 ring-border backdrop-blur-sm"
            >
              {captureNotice}
            </div>
          )}
        </div>

        <div className="mt-5 flex shrink-0 flex-col items-center gap-4">
          <div className="flex w-full items-center justify-center gap-6">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-12 rounded-full"
              disabled={processing}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Choose from gallery"
            >
              <ImagePlus className="size-5 stroke-[1.5]" />
            </Button>

            <button
              type="button"
              disabled={!cameraReady || processing || Boolean(cameraError)}
              onClick={() => void captureFrameAndProcess()}
              aria-label="Take photo of badge"
              className="flex size-[4.5rem] items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/35 ring-4 ring-primary/20 transition-transform active:scale-95 disabled:opacity-40"
            >
              <span className="size-14 rounded-full border-[3px] border-primary-foreground/90 bg-primary" />
            </button>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-12 rounded-full"
              disabled={processing || Boolean(cameraError)}
              onClick={flipCamera}
              aria-label="Flip camera"
            >
              <SwitchCamera className="size-5 stroke-[1.5]" />
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full max-w-sm rounded-lg border border-border bg-background text-foreground shadow-sm"
            disabled={processing}
            onClick={onSkip}
          >
            Skip — add details manually
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void processImage(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
