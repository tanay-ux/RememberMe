import {
  LINKEDIN_SLUG_PATTERN,
  linkedInSlugFromUrl,
} from "@/lib/photos/linkedin-profile";
import { extractLinkedInFromText } from "@/lib/routes";

export {
  nameHintFromLinkedInUrl,
  resolveLinkedInProfile,
} from "@/lib/photos/linkedin-profile";

export function normalizeLinkedInCandidate(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const fromText = extractLinkedInFromText(trimmed);
  if (fromText) {
    const slug = linkedInSlugFromUrl(fromText);
    if (slug) return `https://www.linkedin.com/in/${slug}`;
    return fromText.replace(/\/+$/, "");
  }

  // linkedin://in/username or linkedin://profile/…
  const deep = trimmed.match(
    new RegExp(`^linkedin://(?:in|profile)/(${LINKEDIN_SLUG_PATTERN})`, "i"),
  );
  if (deep?.[1]) {
    return `https://www.linkedin.com/in/${decodeURIComponent(deep[1])}`;
  }

  // www.linkedin.com/in/… without scheme (hyphens allowed in slug)
  const bare = trimmed.match(
    new RegExp(
      `(?:https?://)?(?:www\\.)?linkedin\\.com/(?:in|pub|mwlite/in)/(${LINKEDIN_SLUG_PATTERN})/?`,
      "i",
    ),
  );
  if (bare?.[1]) {
    return `https://www.linkedin.com/in/${bare[1]}`;
  }

  if (new RegExp(`^/?in/${LINKEDIN_SLUG_PATTERN}/?$`, "i").test(trimmed)) {
    return `https://www.linkedin.com/${trimmed.replace(/^\//, "").replace(/\/+$/, "")}`;
  }

  // Query-param style QR payloads
  try {
    const asUrl = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    const host = asUrl.hostname.replace(/^www\./, "");
    if (host === "linkedin.com") {
      const slug = linkedInSlugFromUrl(asUrl.href);
      if (slug) return `https://www.linkedin.com/in/${slug}`;
    }
  } catch {
    // not a URL
  }

  return undefined;
}

export function decodeQrFromImageData(
  image: ImageData,
): string | undefined {
  try {
    const jsQR = (
      globalThis as unknown as {
        __remembermeJsQR?: (typeof import("jsqr"))["default"];
      }
    ).__remembermeJsQR;
    if (!jsQR) return undefined;
    const code = jsQR(image.data, image.width, image.height, {
      inversionAttempts: "attemptBoth",
    });
    return code?.data;
  } catch {
    return undefined;
  }
}

let jsQRReady: Promise<void> | null = null;

export async function ensureJsQR(): Promise<void> {
  if (
    (globalThis as unknown as { __remembermeJsQR?: unknown }).__remembermeJsQR
  ) {
    return;
  }
  if (!jsQRReady) {
    jsQRReady = import("jsqr").then((mod) => {
      (
        globalThis as unknown as {
          __remembermeJsQR: (typeof import("jsqr"))["default"];
        }
      ).__remembermeJsQR = mod.default;
    });
  }
  await jsQRReady;
}

export async function decodeQrFromBlob(file: Blob): Promise<string | undefined> {
  try {
    await ensureJsQR();
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return undefined;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return decodeQrFromImageData(image);
  } catch {
    return undefined;
  }
}

export function videoFrameToImageData(
  video: HTMLVideoElement,
  maxSide = 640,
): ImageData | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(
    1,
    maxSide / Math.max(video.videoWidth, video.videoHeight),
  );
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export async function videoFrameToJpegBlob(
  video: HTMLVideoElement,
  quality = 0.95,
): Promise<Blob | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  // Prefer PNG for OCR of on-screen LinkedIn profiles (sharper text than JPEG)
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        canvas.toBlob((jpg) => resolve(jpg), "image/jpeg", quality);
      },
      "image/png",
    ),
  );
}
