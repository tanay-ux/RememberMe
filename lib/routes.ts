export function contactDetailPath(id: string): string {
  return `/contacts/detail/?id=${encodeURIComponent(id)}`;
}

export function newContactPath(params?: {
  linkedin?: string;
  name?: string;
  email?: string;
  company?: string;
  url?: string;
}): string {
  const q = new URLSearchParams();
  if (params?.linkedin) q.set("linkedin", params.linkedin);
  if (params?.name) q.set("name", params.name);
  if (params?.email) q.set("email", params.email);
  if (params?.company) q.set("company", params.company);
  if (params?.url) q.set("url", params.url);
  const qs = q.toString();
  return qs ? `/contacts/new/?${qs}` : "/contacts/new/";
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
      if (/linkedin\.com\/in\//i.test(rawUrl)) {
        return newContactPath({ linkedin: rawUrl, url: rawUrl });
      }
      return null;
    }

    const hostOrPath = (url.hostname + url.pathname).replace(/^\/+|\/+$/g, "");
    const action = hostOrPath.split("/")[0] || url.hostname;

    if (action === "add" || action === "share" || action === "new") {
      const linkedin =
        url.searchParams.get("linkedin") ||
        url.searchParams.get("url") ||
        url.searchParams.get("text") ||
        undefined;
      return newContactPath({
        linkedin: linkedin || undefined,
        name: url.searchParams.get("name") || undefined,
        email: url.searchParams.get("email") || undefined,
        company: url.searchParams.get("company") || undefined,
        url: url.searchParams.get("url") || undefined,
      });
    }

    if (action === "contact") {
      const id = url.searchParams.get("id");
      if (id) return contactDetailPath(id);
    }

    return "/";
  } catch {
    if (/linkedin\.com\/in\//i.test(rawUrl)) {
      return newContactPath({ linkedin: rawUrl });
    }
    return null;
  }
}

export function extractLinkedInFromText(text: string): string | undefined {
  const match = text.match(
    /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w%-]+\/?/i,
  );
  return match?.[0];
}
