"use client";

import { useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelected: (file: File) => void;
  title?: string;
}

/**
 * In-app source picker: Take photo (opens camera) or Choose from gallery.
 * Android WebView often skips the OS chooser for bare &lt;input type=file&gt;,
 * so we offer explicit sources instead.
 */
export function ImageSourceSheet({
  open,
  onOpenChange,
  onImageSelected,
  title = "Add image",
}: ImageSourceSheetProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    onOpenChange(false);
    onImageSelected(file);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-x-0 bottom-0 top-auto z-50 max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] data-open:zoom-in-100 data-closed:zoom-out-100 sm:inset-x-auto sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2"
        >
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Take a new photo or pick one from your gallery.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col p-2">
            <button
              type="button"
              className="flex items-center gap-3 rounded-lg px-4 py-3.5 text-left text-base font-medium text-foreground transition-colors hover:bg-secondary/70 active:bg-secondary"
              onClick={() => cameraInputRef.current?.click()}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-primary">
                <Camera className="size-5 stroke-[1.5]" />
              </span>
              Take photo
            </button>
            <button
              type="button"
              className="flex items-center gap-3 rounded-lg px-4 py-3.5 text-left text-base font-medium text-foreground transition-colors hover:bg-secondary/70 active:bg-secondary"
              onClick={() => galleryInputRef.current?.click()}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-primary">
                <ImagePlus className="size-5 stroke-[1.5]" />
              </span>
              Choose from gallery
            </button>
            <button
              type="button"
              className="mt-1 rounded-lg px-4 py-3.5 text-center text-base font-medium text-muted-foreground transition-colors hover:bg-secondary/70 active:bg-secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera — capture attribute forces the camera app */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {/* Gallery — no capture attribute */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}
