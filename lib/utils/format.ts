export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatInstagramUrl(handle: string): string {
  const trimmed = handle.trim();
  if (trimmed.startsWith("http")) return trimmed;
  const username = trimmed.replace(/^@/, "");
  return `https://instagram.com/${username}`;
}

export function formatLinkedInUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http")) return trimmed;
  return `https://${trimmed}`;
}

export function formatWebsiteUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http")) return trimmed;
  return `https://${trimmed}`;
}

export const NOTE_TYPE_LABELS: Record<string, string> = {
  meeting: "Meeting",
  follow_up: "Follow-up",
  general: "General",
};
