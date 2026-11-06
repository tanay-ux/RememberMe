import { Capacitor } from "@capacitor/core";
import { compressImage } from "@/lib/photos/compress";
import {
  linkedInSlugFromUrl,
  normalizeLinkedInProfileUrl,
  unwrapPreviewImageUrl,
} from "@/lib/photos/linkedin-profile";

function isLikelyBrandLogo(blob: Blob): boolean {
  // LinkedIn fallback logos / sprites are tiny; real headshots are much larger
  if (blob.type.includes("svg")) return true;
  if (blob.size < 2500) return true;
  if (blob.size < 8000 && blob.type.includes("png")) return true;
  return false;
}

async function blobFromHttpUrl(url: string): Promise<Blob | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { CapacitorHttp } = await import("@capacitor/core");
      const res = await CapacitorHttp.get({
        url,
        responseType: "arraybuffer",
        connectTimeout: 10000,
        readTimeout: 10000,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        },
      });
      if (res.status < 200 || res.status >= 300) return null;

      // Capacitor may return base64 string for binary
      const data = res.data;
      let bytes: Uint8Array;
      if (typeof data === "string") {
        const binary = atob(data);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      } else if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data);
      } else {
        return null;
      }

      const contentType =
        (res.headers?.["Content-Type"] as string | undefined) ||
        (res.headers?.["content-type"] as string | undefined) ||
        "image/jpeg";
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      return new Blob([copy], { type: contentType.split(";")[0] });
    }

    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

async function acceptAvatarBlob(blob: Blob | null): Promise<Blob | null> {
  if (!blob) return null;
  if (!blob.type.startsWith("image/") && blob.type !== "application/octet-stream") {
    return null;
  }
  if (isLikelyBrandLogo(blob)) return null;

  // Verify dimensions when possible — logos are often tiny squares
  try {
    const bmp = await createImageBitmap(blob);
    const { width, height } = bmp;
    bmp.close();
    if (width < 64 || height < 64) return null;
    if (width <= 80 && height <= 80) return null;
  } catch {
    // createImageBitmap unavailable — size heuristic already applied
  }

  return compressImage(blob);
}

/**
 * Best-effort profile photo. Prefer an og:image URL from the profile lookup;
 * never keep the LinkedIn brand logo fallback.
 */
export async function fetchLinkedInAvatar(
  profileUrl: string,
  preferredPhotoUrl?: string,
): Promise<Blob | null> {
  const slug = linkedInSlugFromUrl(profileUrl);
  const normalized = normalizeLinkedInProfileUrl(profileUrl);

  const preferred = unwrapPreviewImageUrl(preferredPhotoUrl);
  const candidates = [
    preferred,
    // Prefer the raw media.licdn URL over unavatar (often returns brand logo)
    slug
      ? `https://unavatar.io/linkedin/${encodeURIComponent(slug)}?fallback=false`
      : undefined,
    `https://unavatar.io/${encodeURIComponent(normalized)}?fallback=false`,
  ].filter(Boolean) as string[];

  for (const src of candidates) {
    const blob = await acceptAvatarBlob(await blobFromHttpUrl(src));
    if (blob) return blob;
  }

  return null;
}
