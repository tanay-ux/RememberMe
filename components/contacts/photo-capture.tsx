"use client";

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageSourceSheet } from "@/components/contacts/image-source-sheet";
import { getInitials } from "@/lib/utils/format";

interface PhotoCaptureProps {
  name?: string;
  previewUrl?: string;
  size?: "sm" | "lg";
  onPhotoChange: (blob: Blob | null) => void;
}

export function PhotoCapture({
  name = "",
  previewUrl,
  size = "lg",
  onPhotoChange,
}: PhotoCaptureProps) {
  const [localPreview, setLocalPreview] = useState<string | undefined>();
  const [sourceOpen, setSourceOpen] = useState(false);
  const displayPreview = localPreview ?? previewUrl;

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const avatarSize = size === "lg" ? "size-28" : "size-12";

  function handleFile(file: File) {
    if (localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    onPhotoChange(file);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(undefined);
    onPhotoChange(null);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <button
          type="button"
          aria-label="Add photo"
          className={`${avatarSize} overflow-hidden rounded-full ring-2 ring-border ring-offset-2 ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          onClick={() => setSourceOpen(true)}
        >
          <Avatar className={`${avatarSize} text-2xl`}>
            {displayPreview ? (
              <AvatarImage src={displayPreview} alt={name || "Contact photo"} />
            ) : null}
            <AvatarFallback className="bg-brand-soft text-primary">
              {name ? getInitials(name) : <Camera className="size-8 stroke-[1.5]" />}
            </AvatarFallback>
          </Avatar>
        </button>
        {displayPreview && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -top-1 -right-1 size-7 rounded-full shadow-sm"
            onClick={handleRemove}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Tap to take a photo or choose from gallery
      </p>

      <ImageSourceSheet
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        title="Add photo"
        onImageSelected={handleFile}
      />
    </div>
  );
}
