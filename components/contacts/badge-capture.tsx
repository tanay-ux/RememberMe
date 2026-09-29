"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  extractBadgeInfo,
  type ExtractedBadgeInfo,
} from "@/lib/photos/badge-ocr";

interface BadgeCaptureProps {
  previewUrl?: string;
  onBadgeChange: (blob: Blob | null) => void;
  onExtracted: (info: ExtractedBadgeInfo) => void;
}

export function BadgeCapture({
  previewUrl,
  onBadgeChange,
  onExtracted,
}: BadgeCaptureProps) {
  const [localPreview, setLocalPreview] = useState<string | undefined>();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const display = localPreview ?? previewUrl;

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function applyFile(file: File) {
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    setBlob(file);
    onBadgeChange(file);
    setError(null);
    setStatus(null);
  }

  function handleRemove() {
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    setLocalPreview(undefined);
    setBlob(null);
    onBadgeChange(null);
    setStatus(null);
    setError(null);
  }

  async function handleExtract() {
    if (!blob && !previewUrl) {
      setError("Add a badge photo first.");
      return;
    }

    setExtracting(true);
    setError(null);
    try {
      let image = blob;
      if (!image && previewUrl) {
        const res = await fetch(previewUrl);
        image = await res.blob();
      }
      if (!image) {
        setError("Could not read badge image.");
        return;
      }
      const info = await extractBadgeInfo(image, setStatus);
      if (!info.name && !info.company && !info.email && !info.phone) {
        setError(
          "Couldn't read clear text from this badge. Try a sharper photo, better lighting, or fill fields manually.",
        );
        onExtracted(info);
      } else {
        setStatus("Extracted — review fields below.");
        onExtracted(info);
      }
    } catch {
      setError("OCR failed. You can still fill fields manually.");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-base">Conference badge</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Snap the badge, then extract name, company, and email.
          </p>
        </div>
        {display && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={handleRemove}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      {display ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={display}
          alt="Conference badge"
          className="w-full max-h-48 object-contain rounded-lg bg-muted"
        />
      ) : (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          <Camera className="size-8" />
          <span className="text-sm">Tap to photograph badge</span>
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="size-4" />
          Take photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => galleryRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Gallery
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={extracting || !display}
          onClick={() => void handleExtract()}
        >
          <ScanText className="size-4" />
          {extracting ? "Extracting…" : "Extract info"}
        </Button>
      </div>

      {status && <p className="text-xs text-muted-foreground">{status}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
