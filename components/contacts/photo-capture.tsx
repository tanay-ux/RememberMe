"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const displayPreview = localPreview ?? previewUrl;
  const [showWebcam, setShowWebcam] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const avatarSize = size === "lg" ? "size-28" : "size-12";

  async function handleFile(file: File) {
    const blob = file;
    if (localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    const url = URL.createObjectURL(blob);
    setLocalPreview(url);
    onPhotoChange(blob);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  function handleRemove() {
    if (localPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(undefined);
    onPhotoChange(null);
  }

  async function startWebcam() {
    setShowWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setShowWebcam(false);
      galleryInputRef.current?.click();
    }
  }

  function stopWebcam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function captureFromWebcam() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) void handleFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
      stopWebcam();
      setShowWebcam(false);
    }, "image/jpeg", 0.8);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <button
          type="button"
          className={`${avatarSize} rounded-full overflow-hidden ring-2 ring-border ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-ring`}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Avatar className={`${avatarSize} text-2xl`}>
            {displayPreview ? (
              <AvatarImage src={displayPreview} alt={name || "Contact photo"} />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground">
              {name ? getInitials(name) : <Camera className="size-8" />}
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

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-4" />
          Take photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Gallery
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => void startWebcam()}
        >
          Webcam
        </Button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      <Dialog
        open={showWebcam}
        onOpenChange={(open) => {
          if (!open) {
            stopWebcam();
            setShowWebcam(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Take a photo</DialogTitle>
          </DialogHeader>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg bg-black aspect-video object-cover"
          />
          <Button type="button" onClick={captureFromWebcam}>
            Capture
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
