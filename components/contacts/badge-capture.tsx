"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageSourceSheet } from "@/components/contacts/image-source-sheet";
import {
  extractBadgeInfo,
  hasCredibleBadgeInfo,
  sanitizeBadgeInfo,
  type ExtractedBadgeInfo,
} from "@/lib/photos/badge-ocr";
import {
  decodeQrFromBlob,
  normalizeLinkedInCandidate,
  resolveLinkedInProfile,
} from "@/lib/photos/badge-qr";
import { extractLinkedInFromText } from "@/lib/routes";

interface BadgeCaptureProps {
  previewUrl?: string;
  onBadgeChange: (blob: Blob | null) => void;
  onExtracted: (info: ExtractedBadgeInfo) => void;
  onLinkedInFound?: (url: string) => void;
}

export function BadgeCapture({
  previewUrl,
  onBadgeChange,
  onExtracted,
  onLinkedInFound,
}: BadgeCaptureProps) {
  const [localPreview, setLocalPreview] = useState<string | undefined>();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  const display = localPreview ?? previewUrl;

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function processImage(file: File) {
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    onBadgeChange(file);
    setError(null);
    setProcessing(true);
    setStatus("Reading image…");

    try {
      const qrRaw = await decodeQrFromBlob(file);
      const linkedin = qrRaw
        ? normalizeLinkedInCandidate(qrRaw)
        : undefined;

      // LinkedIn QR: skip OCR on the QR image (it fills garbage into fields)
      if (linkedin) {
        onLinkedInFound?.(linkedin);
        setStatus("Looking up LinkedIn profile name…");
        const profile = await resolveLinkedInProfile(linkedin);
        onExtracted({
          name: profile.name,
          title: profile.headline,
          rawText: linkedin,
        });
        setStatus(
          profile.name
            ? `LinkedIn QR detected — ${profile.name}`
            : "LinkedIn QR detected — profile filled.",
        );
        return;
      }

      setStatus("Extracting details…");
      let info = sanitizeBadgeInfo(await extractBadgeInfo(file, setStatus));
      const linkedinFromText = extractLinkedInFromText(info.rawText || "");
      if (linkedinFromText) {
        onLinkedInFound?.(linkedinFromText);
        setStatus("Looking up LinkedIn profile…");
        const profile = await resolveLinkedInProfile(linkedinFromText);
        // Public OG name wins; keep OCR name when privacy only left a slug guess
        if (profile.name && (!profile.privateProfile || !info.name)) {
          info = {
            ...info,
            name: profile.name,
            title: profile.headline || info.title,
          };
        } else if (profile.headline && !info.title) {
          info = { ...info, title: profile.headline };
        }
      }

      if (!hasCredibleBadgeInfo(info, linkedinFromText || undefined)) {
        setError(
          "Couldn't find a name on that photo. Try a clearer LinkedIn screenshot or badge, or fill fields manually.",
        );
        setStatus(null);
        return;
      }

      onExtracted(info);
      setStatus(
        info.name
          ? `Details extracted — ${info.name}`
          : "Details extracted — review below.",
      );
    } catch {
      setError("Couldn't process this image. Try another photo or fill fields manually.");
      setStatus(null);
    } finally {
      setProcessing(false);
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    setLocalPreview(undefined);
    onBadgeChange(null);
    setStatus(null);
    setError(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Capture LinkedIn/Badge
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Tap to photograph a badge or LinkedIn QR — details fill in
            automatically.
          </p>
        </div>
        {display && !processing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <button
        type="button"
        disabled={processing}
        onClick={() => setSourceOpen(true)}
        className="relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-border py-8 text-muted-foreground transition-colors hover:bg-secondary/60 disabled:opacity-60"
      >
        {display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={display}
            alt="LinkedIn or badge capture"
            className="max-h-48 w-full object-contain"
          />
        ) : (
          <>
            <Camera className="size-8 stroke-[1.5]" />
            <span className="text-sm">Tap to photograph or choose from gallery</span>
          </>
        )}
        {processing && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm text-foreground">
            <Loader2 className="size-4 animate-spin" />
            Working…
          </div>
        )}
      </button>

      {status && (
        <p className="text-sm text-muted-foreground leading-relaxed">{status}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ImageSourceSheet
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        title="Capture LinkedIn/Badge"
        onImageSelected={(file) => void processImage(file)}
      />
    </div>
  );
}
