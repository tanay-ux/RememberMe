import { Capacitor } from "@capacitor/core";
import {
  COMMON_FIRST_NAMES,
  COMMON_LAST_NAMES,
} from "@/lib/photos/common-names";

/**
 * LinkedIn vanity slugs: letters, numbers, hyphens, underscores, dots.
 */
export const LINKEDIN_SLUG_PATTERN = "[A-Za-z0-9._%~-]+";

const LINKEDIN_IN_PATH = new RegExp(
  `linkedin\\.com\\/(?:in|pub|mwlite\\/in)\\/(${LINKEDIN_SLUG_PATTERN})`,
  "i",
);

const PROFILE_LOOKUP_TIMEOUT_MS = 12000;

export interface LinkedInProfileInfo {
  name?: string;
  headline?: string;
  /** Public profile photo URL when available (og:image / preview APIs). */
  photoUrl?: string;
  /** True when LinkedIn hid the public profile (privacy / authwall). */
  privateProfile?: boolean;
}

export function linkedInSlugFromUrl(url: string): string | undefined {
  const match = url.match(LINKEDIN_IN_PATH);
  if (!match?.[1]) return undefined;
  return decodeURIComponent(match[1]).replace(/\/+$/, "");
}

/** Canonical profile URL without tracking query params. */
export function normalizeLinkedInProfileUrl(url: string): string {
  const slug = linkedInSlugFromUrl(url);
  if (slug) return `https://www.linkedin.com/in/${slug}/`;
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  if (word.length <= 2 && word === word.toUpperCase()) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function splitNameSlug(slug: string): string[] {
  return slug
    .split(/[-_+.]+/)
    .flatMap((part) =>
      part
        .replace(/([a-z\d])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .split(/\s+/),
    )
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^\d+$/.test(p));
}

function dropTrailingProfileId(parts: string[]): string[] {
  if (parts.length < 2) return parts;
  const last = parts[parts.length - 1] ?? "";
  const looksLikeId =
    /\d/.test(last) ||
    (last.length >= 6 &&
      /^[a-z0-9]+$/i.test(last) &&
      !/^[a-z]+$/i.test(last));
  if (looksLikeId) return parts.slice(0, -1);
  return parts;
}

export function splitJoinedName(word: string): string[] {
  const lower = word.toLowerCase();
  if (lower.length < 5 || !/^[a-z]+$/.test(lower)) return [word];

  let best: string[] | undefined;
  let bestScore = 0;
  for (let i = lower.length - 2; i >= 2; i--) {
    const first = lower.slice(0, i);
    if (!COMMON_FIRST_NAMES.has(first)) continue;
    const rest = lower.slice(i);

    let parts = [first, rest];
    let score = 1 + i / 100;
    if (COMMON_LAST_NAMES.has(rest)) {
      score = 3 + i / 100;
    } else if (rest.length >= 4 && COMMON_LAST_NAMES.has(rest.slice(1))) {
      parts = [first, rest.charAt(0), rest.slice(1)];
      score = 2 + i / 100;
    }
    if (score > bestScore) {
      best = parts;
      bestScore = score;
    }
  }
  return best ?? [word];
}

/**
 * Best-effort name from the vanity slug when LinkedIn privacy blocks the
 * public profile preview (very common for non-famous accounts).
 */
export function nameHintFromLinkedInUrl(url: string): string | undefined {
  const slug = linkedInSlugFromUrl(url);
  if (!slug || slug.length < 2) return undefined;
  if (/^ACoAA/i.test(slug) || /^[a-z0-9]{20,}$/i.test(slug)) return undefined;

  let parts = dropTrailingProfileId(splitNameSlug(slug));
  if (parts.length === 0) return undefined;
  if (parts.length === 1) parts = splitJoinedName(parts[0] ?? "");
  if (parts.length < 2) return undefined;
  if (parts.length > 4) parts = parts.slice(0, 4);

  return parts.map(titleCaseWord).join(" ");
}

const NAME_CACHE_PREFIX = "rememberme:linkedin-profile:v3:";

function readCachedProfile(slug: string): LinkedInProfileInfo | undefined {
  try {
    const raw = localStorage.getItem(NAME_CACHE_PREFIX + slug.toLowerCase());
    return raw ? (JSON.parse(raw) as LinkedInProfileInfo) : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedProfile(slug: string, info: LinkedInProfileInfo) {
  if (!info.name) return;
  try {
    localStorage.setItem(
      NAME_CACHE_PREFIX + slug.toLowerCase(),
      JSON.stringify(info),
    );
  } catch {
    // storage full or unavailable
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    );
}

function cleanPersonName(raw?: string): string | undefined {
  const name = raw ? decodeHtmlEntities(raw).replace(/\s+/g, " ").trim() : "";
  if (!name || /linkedin/i.test(name)) return undefined;
  if (/sign\s*up|log\s*in|authwall|unable to generate/i.test(name)) {
    return undefined;
  }
  if (name.length < 2 || name.length > 80) return undefined;
  // Prefer multi-word display names; allow "Madonna"-style only if long enough
  if (!/\s/.test(name) && name.length < 5) return undefined;
  return name;
}

export function parseLinkedInTitle(title: string): LinkedInProfileInfo {
  const withoutSuffix = decodeHtmlEntities(title)
    .replace(/\s*\|\s*LinkedIn\s*$/i, "")
    .trim();
  const [namePart, ...rest] = withoutSuffix.split(/\s+[-–—]\s+/);
  const headline = rest.join(" - ").trim();
  return {
    name: cleanPersonName(namePart),
    headline: headline || undefined,
  };
}

/** Unwrap Bluesky cardyb image proxy → real media.licdn.com URL. */
export function unwrapPreviewImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    if (/cardyb\.bsky\.app\/v1\/image/i.test(url)) {
      const inner = new URL(url).searchParams.get("url");
      if (inner) return unwrapPreviewImageUrl(inner);
    }
  } catch {
    // keep original
  }
  if (/static\.licdn\.com\/aero|sprite|logo|ghost|icon/i.test(url)) {
    return undefined;
  }
  return url;
}

function metaContent(html: string, property: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const reAlt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  return html.match(re)?.[1] || html.match(reAlt)?.[1];
}

function parseProfileHtml(html: string): LinkedInProfileInfo | undefined {
  const authwalled =
    /authwall|signup-challenge|session_redirect/i.test(html) &&
    !/og:title/i.test(html);
  if (authwalled) return { privateProfile: true };

  const ogTitle = metaContent(html, "og:title");
  const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const info = parseLinkedInTitle(ogTitle || pageTitle || "");

  const ogImage =
    metaContent(html, "og:image") || metaContent(html, "twitter:image");
  const photoUrl = unwrapPreviewImageUrl(
    ogImage &&
      /media\.licdn\.com|licdn\.com\/dms|profile-displayphoto/i.test(ogImage)
      ? decodeHtmlEntities(ogImage)
      : ogImage && !/sprite|logo|icon|ghost|aero/i.test(ogImage)
        ? decodeHtmlEntities(ogImage)
        : undefined,
  );

  if (!info.name) {
    const ldName = html.match(
      /"@type"\s*:\s*"Person"[^}]*?"name"\s*:\s*"([^"]+)"/i,
    )?.[1];
    info.name = cleanPersonName(ldName);
  }

  if (!info.name && !photoUrl) {
    return { privateProfile: true };
  }
  return { ...info, photoUrl };
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) =>
      setTimeout(() => resolve(undefined), ms),
    ),
  ]);
}

const BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

/** Native: fetch LinkedIn HTML directly (no CORS). Often authwalled for private profiles. */
async function fetchProfileNative(
  profileUrl: string,
): Promise<LinkedInProfileInfo | undefined> {
  if (!Capacitor.isNativePlatform()) return undefined;
  const { CapacitorHttp } = await import("@capacitor/core");
  const url = normalizeLinkedInProfileUrl(profileUrl);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await CapacitorHttp.get({
        url,
        headers: {
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": BROWSER_UA,
          "Cache-Control": "no-cache",
        },
        responseType: "text",
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      if (typeof res.data === "string" && res.data.length > 200) {
        const parsed = parseProfileHtml(res.data);
        if (parsed?.name) return parsed;
        if (parsed?.privateProfile) return parsed;
        if (parsed?.photoUrl) return parsed;
      }
      if (res.status === 999 || res.status === 401 || res.status === 403) {
        return { privateProfile: true };
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return undefined;
}

/**
 * Bluesky cardyb — free Open Graph extractor. Works for public LinkedIn
 * profiles without Microlink's daily quota. Fails cleanly when privacy is on.
 */
async function fetchProfileViaCardyb(
  profileUrl: string,
): Promise<LinkedInProfileInfo | undefined> {
  try {
    const url = normalizeLinkedInProfileUrl(profileUrl);
    const endpoint = `https://cardyb.bsky.app/v1/extract?url=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint);
    const json = (await res.json()) as {
      title?: string;
      description?: string;
      image?: string;
      error?: string;
    };

    if (!res.ok || json.error || !json.title) {
      return { privateProfile: true };
    }
    if (/sign\s*up|log\s*in/i.test(json.title)) {
      return { privateProfile: true };
    }

    const fromTitle = parseLinkedInTitle(json.title);
    const photoUrl = unwrapPreviewImageUrl(json.image);
    if (!fromTitle.name && !photoUrl) return { privateProfile: true };
    return { ...fromTitle, photoUrl };
  } catch {
    return undefined;
  }
}

/** Microlink — last resort (strict free-tier rate limit). */
async function fetchProfileViaMicrolink(
  profileUrl: string,
): Promise<LinkedInProfileInfo | undefined> {
  try {
    const url = normalizeLinkedInProfileUrl(profileUrl);
    const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true`;
    const res = await fetch(endpoint);
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      status?: string;
      data?: {
        title?: string;
        author?: string;
        image?: { url?: string } | string;
      };
      message?: string;
    };
    if (json.status !== "success" || !json.data) return undefined;

    const fromTitle = parseLinkedInTitle(json.data.title ?? "");
    const name = cleanPersonName(json.data.author) ?? fromTitle.name;
    const imageField = json.data.image;
    const rawImage =
      typeof imageField === "string" ? imageField : imageField?.url;
    const photoUrl = unwrapPreviewImageUrl(rawImage);
    if (!name && !photoUrl) return undefined;
    return { name, headline: fromTitle.headline, photoUrl };
  } catch {
    return undefined;
  }
}

export async function fetchLinkedInProfile(
  profileUrl: string,
): Promise<LinkedInProfileInfo | undefined> {
  // 1) Native HTML (fast when LinkedIn allows the device IP)
  const native = await withTimeout(
    fetchProfileNative(profileUrl),
    PROFILE_LOOKUP_TIMEOUT_MS,
  );
  if (native?.name) return native;

  // 2) Cardyb OG preview — best free option for public profiles
  const cardyb = await withTimeout(
    fetchProfileViaCardyb(profileUrl),
    PROFILE_LOOKUP_TIMEOUT_MS,
  );
  if (cardyb?.name) {
    return {
      ...cardyb,
      photoUrl: cardyb.photoUrl || native?.photoUrl,
    };
  }

  // 3) Microlink (often rate-limited)
  const micro = await withTimeout(
    fetchProfileViaMicrolink(profileUrl),
    PROFILE_LOOKUP_TIMEOUT_MS,
  );
  if (micro?.name) {
    return {
      ...micro,
      photoUrl: micro.photoUrl || cardyb?.photoUrl || native?.photoUrl,
    };
  }

  if (native?.photoUrl || cardyb?.photoUrl) {
    return {
      photoUrl: native?.photoUrl || cardyb?.photoUrl,
      privateProfile: native?.privateProfile || cardyb?.privateProfile,
    };
  }

  if (native?.privateProfile || cardyb?.privateProfile) {
    return { privateProfile: true };
  }

  return micro ?? cardyb ?? native;
}

/**
 * Prefer the real LinkedIn display name from a public profile preview.
 * If LinkedIn privacy blocks previews (common), fall back to the vanity slug.
 */
export async function resolveLinkedInProfile(
  profileUrl: string,
): Promise<LinkedInProfileInfo> {
  const normalized = normalizeLinkedInProfileUrl(profileUrl);
  const slug = linkedInSlugFromUrl(normalized);
  const cached = slug ? readCachedProfile(slug) : undefined;
  if (cached?.name) return cached;

  const profile = await fetchLinkedInProfile(normalized);
  if (profile?.name) {
    if (slug) writeCachedProfile(slug, profile);
    return profile;
  }

  const fromSlug = nameHintFromLinkedInUrl(normalized);
  return {
    name: fromSlug,
    photoUrl: profile?.photoUrl,
    privateProfile: profile?.privateProfile ?? !fromSlug,
  };
}
