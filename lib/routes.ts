export function contactDetailPath(id: string): string {
  return `/contacts/detail/?id=${encodeURIComponent(id)}`;
}

export function newContactPath(params?: {
  linkedin?: string;
  name?: string;
  title?: string;
  email?: string;
  company?: string;
  url?: string;
  text?: string;
}): string {
  const q = new URLSearchParams();
  if (params?.linkedin) q.set("linkedin", params.linkedin);
  if (params?.name) q.set("name", params.name);
  if (params?.title) q.set("title", params.title);
  if (params?.email) q.set("email", params.email);
  if (params?.company) q.set("company", params.company);
  if (params?.url) q.set("url", params.url);
  if (params?.text) q.set("text", params.text);
  const qs = q.toString();
  return qs ? `/contacts/new/?${qs}` : "/contacts/new/";
}

/**
 * Pull a LinkedIn /in/ profile URL out of arbitrary share text or OCR.
 * LinkedIn Android/iOS often share multi-line bodies: name, headline, then URL.
 */
export function extractLinkedInFromText(text: string): string | undefined {
  if (!text) return undefined;
  // Include hyphens in slug — [\w] alone truncates jane-doe → jane.
  // Share cards / OCR often drop the scheme; accept bare linkedin.com/in/...
  const match = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub|mwlite\/in)\/[A-Za-z0-9._%~-]+\/?/i,
  );
  if (!match?.[0]) return undefined;
  const withScheme = /^https?:\/\//i.test(match[0])
    ? match[0]
    : `https://${match[0]}`;
  return withScheme
    .replace(/\/(?:pub|mwlite\/in)\//i, "/in/")
    .replace(/\/+$/, "");
}

/** Prefer a clean /in/ URL when a param may be a full share body. */
function linkedInParam(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  return extractLinkedInFromText(raw) || undefined;
}

/**
 * LinkedIn’s share sheet often sends:
 *   Name
 *   Headline
 *   https://www.linkedin.com/in/…
 * or “Check out Name's profile on LinkedIn”.
 */
export function extractProfileHintsFromShareText(text: string): {
  linkedin?: string;
  name?: string;
  title?: string;
} {
  if (!text?.trim()) return {};
  const linkedin = extractLinkedInFromText(text);
  const checkOut = text.match(
    /check\s+out\s+(.+?)(?:'s|’s)?\s+profile/i,
  );
  let name = checkOut?.[1]?.replace(/\s+/g, " ").trim();
  let title: string | undefined;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(
      (l) =>
        l.length >= 2 &&
        !/linkedin\.com/i.test(l) &&
        !/^https?:\/\//i.test(l) &&
        !/^(check out|view|connect|message)\b/i.test(l),
    );

  function looksLikeShareName(line: string): boolean {
    if (line.length > 48) return false;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) return false;
    return words.every((w) =>
      /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ.'-]*$/.test(w),
    );
  }

  if (!name && lines[0] && looksLikeShareName(lines[0])) {
    name = lines[0];
    if (lines[1] && lines[1].length >= 3 && lines[1].length <= 120) {
      title = lines[1];
    }
  }

  return { linkedin, name, title };
}

/** Parse rememberme:// or https deep links into an in-app path. */
export function pathFromDeepLink(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const isApp =
      url.protocol === "rememberme:" ||
      url.hostname === "rememberme.app" ||
      url.hostname.endsWith(".rememberme.app");

    if (!isApp && url.protocol !== "rememberme:") {
      // Shared raw LinkedIn / web URL → add contact
      const hints = extractProfileHintsFromShareText(rawUrl);
      if (hints.linkedin) {
        return newContactPath({
          linkedin: hints.linkedin,
          url: hints.linkedin,
          name: hints.name,
          title: hints.title,
          text: rawUrl,
        });
      }
      return null;
    }

    const hostOrPath = (url.hostname + url.pathname).replace(/^\/+|\/+$/g, "");
    const action = hostOrPath.split("/")[0] || url.hostname;

    if (action === "add" || action === "share" || action === "new") {
      const rawText =
        url.searchParams.get("text") ||
        url.searchParams.get("linkedin") ||
        url.searchParams.get("url") ||
        undefined;
      const hints = extractProfileHintsFromShareText(rawText || "");
      const linkedin =
        linkedInParam(url.searchParams.get("linkedin")) ||
        linkedInParam(url.searchParams.get("url")) ||
        hints.linkedin;
      return newContactPath({
        linkedin: linkedin || undefined,
        name: url.searchParams.get("name") || hints.name || undefined,
        title: url.searchParams.get("title") || hints.title || undefined,
        email: url.searchParams.get("email") || undefined,
        company: url.searchParams.get("company") || undefined,
        url: linkedin || url.searchParams.get("url") || undefined,
        text: rawText || undefined,
      });
    }

    if (action === "contact") {
      const id = url.searchParams.get("id");
      if (id) return contactDetailPath(id);
    }

    return "/";
  } catch {
    const hints = extractProfileHintsFromShareText(rawUrl);
    if (hints.linkedin) {
      return newContactPath({
        linkedin: hints.linkedin,
        name: hints.name,
      });
    }
    return null;
  }
}
