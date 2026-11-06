import { extractLinkedInFromText } from "@/lib/routes";

export interface ExtractedBadgeInfo {
  name?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  rawText: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}/;

const TITLE_HINTS =
  /\b(ceo|cto|cfo|coo|founder|co-founder|engineer|developer|manager|director|designer|product|vp|head of|lead|intern|student|recruiter|partner|president|chief|officer|scientist|analyst|consultant|advisor|chairman|chairwoman|owner|specialist|associate|coordinator|executive)\b/i;

const NOISE =
  /^(name|company|title|role|email|phone|badge|conference|summit|expo|pass|visitor|attendee|hello|welcome|scan|qr|linkedin|www|http|https|connect|message|follow|more|about|experience|education|skills|activity|interests|featured|posts|comments|home|my network|jobs|messaging|notifications|me|open to work|hiring|services|followers|connections|contact info|add section|public profile|enhance profile|show details|show all|highlights|resources|analytics|activity|groups|mutual|following)$/i;

/** LinkedIn chrome — never a person name / company (even with relaxCasing). */
const LINKEDIN_UI_LINE =
  /\b(linkedin|connect|message|follow|followers|connections|open to|open to work|about|experience|education|skills|activity|interests|featured|highlights|resources|analytics|groups|show all|show details|contact info|people also viewed|more profiles|accessible for everyone|he\/him|she\/her|they\/them|mutual|premium|services|view profile|see all|edit profile|add section|enhance profile)\b/i;

/** Location / metro lines common under LinkedIn headlines. */
const LOCATION_LINE =
  /\b(area|bay area|greater|metro|region|remote|united states|usa|uk|canada|india|germany|france|australia|singapore|london|new york|san francisco|seattle|austin|chicago|boston|los angeles|toronto|berlin|paris|mumbai|bangalore|bengaluru|hyderabad|delhi|pune)\b/i;

const NAME_PARTICLES = new Set([
  "de",
  "da",
  "di",
  "del",
  "della",
  "van",
  "von",
  "la",
  "le",
  "du",
  "st",
  "jr",
  "sr",
  "ii",
  "iii",
  "iv",
]);

/**
 * LinkedIn puts connection degree / pronouns / verified junk beside the
 * display name. Strip that chrome before name detection.
 */
export function stripLinkedInNameChrome(line: string): string {
  let s = line.replace(/\s+/g, " ").trim();
  // OCR of verified / connection badge often becomes "# © 1st", "✓ · 2nd", etc.
  s = s.replace(/[©®™✓✔✅★☆#]/g, " ");
  // "Jane Doe · 1st" / "Jane Doe • 2nd" / "Jane Doe - 3rd"
  s = s.replace(
    /\s*[·•|\-–—]\s*(?:1st|2nd|3rd|1ST|2ND|3RD)\b.*$/i,
    "",
  );
  s = s.replace(/\s+(?:1st|2nd|3rd)\b.*$/i, "");
  // Pronouns: (She/Her), He/Him, They/Them
  s = s.replace(
    /\s*[(\[]?\s*(?:he|she|they)\s*\/\s*(?:him|her|them)\s*[)\]]?\s*/gi,
    " ",
  );
  // Verified / Premium OCR leftovers
  s = s.replace(/\b(verified|premium|influencer)\b/gi, " ");
  // Trailing credential after comma: "Jane Doe, MBA" → keep name only for matching
  // (caller may still want full line — we only use this for name candidacy)
  s = s.replace(/\s+/g, " ").trim();
  // Share-card / button crumbs: "Connect with Jane Doe", "Message Jane Doe"
  s = s.replace(
    /^(?:connect|message|follow|share)\s+with\s+/i,
    "",
  );
  s = s.replace(
    /^(?:connect|message|follow|more|share|save|pending)\s+/i,
    "",
  );
  return s.trim();
}

/** OCR noise / scene gibberish — reject as name/company candidates. */
export function looksLikeGarbage(line: string): boolean {
  const letters = (line.match(/[a-zA-ZÀ-ÖØ-öø-ÿ]/g) || []).length;
  const digits = (line.match(/\d/g) || []).length;
  const symbols = (line.match(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9\s.&'-]/g) || []).length;
  if (letters < 3) return true;
  if (symbols > 0 && symbols >= Math.max(1, Math.floor(letters / 4))) return true;
  if (digits > letters) return true;
  if (/[©®™]/.test(line)) return true;
  if (line.length > 4 && !/\s/.test(line) && !/^[A-ZÀ-Ö][a-zø-ÿ]+(?:[A-ZÀ-Ö][a-zø-ÿ]+)*$/.test(line)) {
    const vowels = (line.match(/[aeiouyAEIOUYÀ-ö]/g) || []).length;
    if (vowels === 0 && letters > 3) return true;
  }
  return false;
}

function wordHasVowel(word: string): boolean {
  return /[aeiouyAEIOUYÀ-ö]/i.test(word);
}

function isNameWord(word: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ.'-]*$/.test(word);
}

export function looksLikePersonName(
  line: string,
  opts?: { relaxCasing?: boolean; stripLinkedInChrome?: boolean },
): boolean {
  const cleaned =
    opts?.stripLinkedInChrome !== false
      ? stripLinkedInNameChrome(line)
      : line.trim();
  if (!cleaned) return false;
  if (looksLikeGarbage(cleaned)) return false;
  if (EMAIL_RE.test(cleaned) || /@/.test(cleaned)) return false;
  if (TITLE_HINTS.test(cleaned)) return false;
  if (LOCATION_LINE.test(cleaned) && cleaned.split(/\s+/).length >= 3) {
    return false;
  }
  // Always reject LinkedIn chrome — relaxCasing only affects letter case checks
  if (LINKEDIN_UI_LINE.test(cleaned)) return false;
  if (NOISE.test(cleaned.trim())) return false;
  if (cleaned.length > 48) return false;

  // Drop trailing credentials after comma for word checks ("Jane Doe, MBA")
  const forWords = cleaned.split(",")[0]?.trim() || cleaned;
  const words = forWords.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  if (!words.every(isNameWord)) return false;

  const substantial = words.filter(
    (w) =>
      w.length >= 2 &&
      wordHasVowel(w) &&
      !NAME_PARTICLES.has(w.toLowerCase()),
  );
  if (substantial.length < 2) return false;

  const tiny = words.filter(
    (w) => w.length <= 2 && !NAME_PARTICLES.has(w.toLowerCase()),
  );
  if (tiny.length >= 2 && tiny.length >= words.length / 2) return false;

  const avgLen =
    words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);
  if (avgLen < 2.8) return false;

  // Reject leftover share-card grammar even after chrome strip
  if (/^(with|and|or|the|from)\b/i.test(forWords)) return false;

  // All-lowercase phrases are almost never real badge/LinkedIn names
  // (OCR yields Title Case, ALL CAPS, or mixed — not scene labels).
  const alphaWords = words.filter((w) => /[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(w));
  if (
    alphaWords.length >= 2 &&
    alphaWords.every((w) => w === w.toLowerCase())
  ) {
    return false;
  }

  if (!opts?.relaxCasing) {
    // Prefer Title Case; OCR on screenshots often returns odd casing
    const weirdCase = words.filter(
      (w) =>
        w.length >= 2 &&
        !/^[A-ZÀ-Ö][a-zø-ÿ]+$/.test(w) &&
        !/^[A-ZÀ-Ö]+$/.test(w) &&
        !NAME_PARTICLES.has(w.toLowerCase()),
    );
    if (weirdCase.length >= words.length) return false;
  }

  return true;
}

function looksLikeCompany(line: string): boolean {
  if (looksLikeGarbage(line)) return false;
  if (EMAIL_RE.test(line) || /@/.test(line)) return false;
  if (TITLE_HINTS.test(line) && line.length < 28) return false;
  if (LINKEDIN_UI_LINE.test(line)) return false;
  if (NOISE.test(line.trim())) return false;
  if (line.length < 3 || line.length > 60) return false;
  if (/[©®™]/.test(line)) return false;

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 8) return false;

  const substantial = words.filter(
    (w) => /[a-zA-Z]{3,}/.test(w) && wordHasVowel(w.replace(/[^a-zA-Z]/g, "")),
  );
  if (substantial.length === 0) return false;

  const tiny = words.filter((w) => w.replace(/[^a-zA-Z]/g, "").length <= 2);
  if (tiny.length >= 2 && tiny.length >= words.length / 2) return false;

  return true;
}

function titleCaseName(line: string): string {
  return line
    .split(/\s+/)
    .map((w) => {
      if (NAME_PARTICLES.has(w.toLowerCase())) return w.toLowerCase();
      if (w.length <= 2 && w === w.toUpperCase()) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function cleanLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(
      (line) =>
        line.length >= 2 && !NOISE.test(line) && !looksLikeGarbage(line),
    );
}

/** LinkedIn profile UI — including photos of another phone’s screen. */
export function isLinkedInScreenshot(text: string): boolean {
  const lower = text.toLowerCase();
  const hasBrand = /\blinkedin\b/.test(lower);
  const hasProfileUrl = /linkedin\.com\/(?:in|pub|mwlite)/i.test(text);
  const uiHits = [
    "connect",
    "message",
    "about",
    "experience",
    "followers",
    "connections",
    "open to",
    "contact info",
    "people also viewed",
    "add section",
    "enhance profile",
    "highlights",
    "show details",
    "pending",
  ].filter((w) => lower.includes(w)).length;
  const hasDegree = /\b(?:1st|2nd|3rd)\b/i.test(text);
  // Brand + UI, URL + UI, or strong UI alone (OCR often drops the logo word)
  if (hasBrand && uiHits >= 1) return true;
  if (hasProfileUrl && uiHits >= 1) return true;
  if (uiHits >= 2) return true;
  // Degree markers next to names are a strong LinkedIn signal
  if (hasDegree && (hasBrand || hasProfileUrl || uiHits >= 1)) return true;
  if (hasDegree && /\b(followers|connections)\b/i.test(text)) return true;
  return false;
}

function nameScore(line: string, index: number): number {
  const cleaned = stripLinkedInNameChrome(line);
  const forWords = cleaned.split(",")[0]?.trim() || cleaned;
  const words = forWords.split(/\s+/).filter(Boolean);
  let score = 40 - index * 2; // prefer earlier (header) lines
  if (words.length === 2) score += 12;
  if (words.length === 3) score += 8;
  // Title Case bonus
  const titleish = words.filter((w) =>
    NAME_PARTICLES.has(w.toLowerCase())
      ? true
      : /^[A-ZÀ-Ö][a-zø-ÿ]+$/.test(w) || /^[A-ZÀ-Ö]+$/.test(w),
  );
  if (titleish.length === words.length) score += 10;
  // ALL CAPS OCR (common on screenshots) is still fine
  if (words.every((w) => w === w.toUpperCase() && w.length > 1)) score += 4;
  // Slightly prefer shorter display names
  if (forWords.length <= 24) score += 4;
  return score;
}

/**
 * Parse a LinkedIn profile screenshot: name is usually the first real
 * person-name line; headline/company follow.
 */
export function parseLinkedInScreenshot(rawText: string): ExtractedBadgeInfo {
  const allLines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 2);

  // Expand lines that OCR glued name + degree: keep both raw and stripped
  const expanded: string[] = [];
  for (const line of allLines) {
    expanded.push(line);
    const stripped = stripLinkedInNameChrome(line);
    if (stripped && stripped !== line) expanded.push(stripped);
  }

  const lines = expanded.filter(
    (line) =>
      !NOISE.test(line) &&
      !looksLikeGarbage(stripLinkedInNameChrome(line) || line) &&
      !LINKEDIN_UI_LINE.test(stripLinkedInNameChrome(line) || line) &&
      !LOCATION_LINE.test(line) &&
      !/^\d[\d,.\sKMB+]*$/.test(line) &&
      !/\d+\s*(followers|connections)/i.test(line),
  );

  const email = rawText.match(EMAIL_RE)?.[0];
  const phoneMatch = rawText.match(PHONE_RE);
  const phone =
    phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7
      ? phoneMatch[0]
      : undefined;

  // Score name candidates in the header area, then whole screenshot
  const header = lines.slice(0, 16);
  const candidates: { line: string; score: number }[] = [];
  header.forEach((line, i) => {
    if (looksLikePersonName(line, { relaxCasing: true })) {
      candidates.push({ line, score: nameScore(line, i) });
    }
  });
  // Boost a name that sits directly above a headline ("… at Company")
  for (let i = 0; i < header.length - 1; i++) {
    const cur = header[i]!;
    const next = header[i + 1]!;
    if (
      looksLikePersonName(cur, { relaxCasing: true }) &&
      (/\bat\b/i.test(next) || TITLE_HINTS.test(next))
    ) {
      const existing = candidates.find(
        (c) =>
          titleCaseName(stripLinkedInNameChrome(c.line)) ===
          titleCaseName(stripLinkedInNameChrome(cur)),
      );
      if (existing) existing.score += 20;
      else candidates.push({ line: cur, score: nameScore(cur, i) + 20 });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  let name = candidates[0]
    ? titleCaseName(
        stripLinkedInNameChrome(candidates[0].line).split(",")[0] ||
          stripLinkedInNameChrome(candidates[0].line),
      )
    : undefined;

  // Fallback: any later person-name line
  if (!name) {
    for (const line of lines) {
      if (looksLikePersonName(line, { relaxCasing: true })) {
        name = titleCaseName(
          stripLinkedInNameChrome(line).split(",")[0] ||
            stripLinkedInNameChrome(line),
        );
        break;
      }
    }
  }

  // Slug hint from a visible profile URL (share cards) when OCR name fails
  if (!name) {
    const url = extractLinkedInFromText(rawText);
    if (url) {
      const slug = url.match(/\/in\/([^/?#]+)/i)?.[1];
      if (slug) {
        const parts = decodeURIComponent(slug)
          .replace(/\/+$/, "")
          .split(/[-_.]+/)
          .filter((p) => p.length > 1 && !/^\d+$/.test(p));
        if (parts.length >= 2 && parts.length <= 4) {
          name = parts
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(" ");
        }
      }
    }
  }

  let title: string | undefined;
  let company: string | undefined;

  const nameIndex = name
    ? lines.findIndex(
        (l) =>
          titleCaseName(stripLinkedInNameChrome(l).split(",")[0] || l) ===
          name,
      )
    : -1;
  const afterName = nameIndex >= 0 ? lines.slice(nameIndex + 1) : lines;

  for (const line of afterName.slice(0, 10)) {
    if (name && titleCaseName(stripLinkedInNameChrome(line)) === name) {
      continue;
    }
    // "Product Manager at Acme" / "CEO at Microsoft" / "PM @ Acme"
    const atMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (atMatch && !title) {
      const maybeTitle = atMatch[1]?.trim();
      const maybeCompany = atMatch[2]
        ?.trim()
        // Employment-type chrome only — keep LinkedIn "|" headline segments
        .replace(/\s*[·•]\s*(?:full-?time|part-?time|internship|contract|self-?employed).*$/i, "")
        .trim();
      if (maybeTitle && (TITLE_HINTS.test(maybeTitle) || maybeTitle.length < 40)) {
        title = maybeTitle;
        if (maybeCompany && looksLikeCompany(maybeCompany)) {
          company = maybeCompany;
        }
        break;
      }
    }
    if (!title && TITLE_HINTS.test(line) && line.length < 120) {
      title = line
        .replace(/\s*[·•]\s*(?:full-?time|part-?time|internship|contract).*$/i, "")
        .trim();
      continue;
    }
    if (
      !company &&
      looksLikeCompany(line) &&
      !looksLikePersonName(line, { relaxCasing: true })
    ) {
      company = line;
    }
    if (title && company) break;
  }

  return sanitizeBadgeInfo({
    name,
    company,
    title,
    email,
    phone,
    rawText,
  });
}

/**
 * True when OCR/QR produced something trustworthy enough to prefill the form.
 * Title/company alone on a random photo are not enough.
 */
export function hasCredibleBadgeInfo(
  info: ExtractedBadgeInfo,
  linkedinUrl?: string,
): boolean {
  if (linkedinUrl) return true;
  if (info.email) return true;
  if (info.phone) return true;
  if (info.name && looksLikePersonName(info.name, { relaxCasing: true })) {
    return true;
  }
  return false;
}

/** Drop weak OCR fields so garbage never reaches the form. */
export function sanitizeBadgeInfo(info: ExtractedBadgeInfo): ExtractedBadgeInfo {
  return {
    rawText: info.rawText,
    email: info.email,
    phone: info.phone,
    name:
      info.name && looksLikePersonName(info.name, { relaxCasing: true })
        ? titleCaseName(info.name)
        : undefined,
    company:
      info.company && looksLikeCompany(info.company) ? info.company : undefined,
    title:
      info.title && info.title.length < 120
        ? info.title
        : undefined,
  };
}

export function parseBadgeText(rawText: string): ExtractedBadgeInfo {
  if (isLinkedInScreenshot(rawText)) {
    return parseLinkedInScreenshot(rawText);
  }

  const lines = cleanLines(rawText);
  const joined = lines.join("\n");

  const email = joined.match(EMAIL_RE)?.[0];
  const phoneMatch = joined.match(PHONE_RE);
  const phone =
    phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7
      ? phoneMatch[0]
      : undefined;

  let name: string | undefined;
  let company: string | undefined;
  let title: string | undefined;

  const remaining = lines.filter((line) => {
    if (email && line.includes(email)) return false;
    if (phone && line.includes(phone)) return false;
    if (LINKEDIN_UI_LINE.test(line)) return false;
    return true;
  });

  for (const line of remaining) {
    if (!title && TITLE_HINTS.test(line) && line.length < 60) {
      title = line;
    }
  }

  const candidates = remaining.filter((line) => line !== title);

  const nameCandidate = candidates.find((line) =>
    looksLikePersonName(line, { relaxCasing: true }),
  );
  if (nameCandidate) name = titleCaseName(nameCandidate);

  const companyCandidate = candidates.find(
    (line) => line !== name && line !== title && looksLikeCompany(line),
  );
  if (companyCandidate) company = companyCandidate;

  const generic = sanitizeBadgeInfo({
    name,
    company,
    title,
    email,
    phone,
    rawText,
  });

  // Camera photos of another phone’s LinkedIn often miss the brand word;
  // if generic found nothing useful, still try the LinkedIn header parser.
  if (!generic.name && /\b(connect|message|1st|2nd|followers|highlights)\b/i.test(rawText)) {
    const linkedInPass = parseLinkedInScreenshot(rawText);
    if (linkedInPass.name) return linkedInPass;
  }

  return generic;
}

/** Upscale + contrast so phone-screen / camera captures OCR more cleanly. */
async function preprocessForOcr(image: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(image);
    const maxSide = Math.max(bitmap.width, bitmap.height);
    // Camera frames of another phone are often soft — upscale more aggressively
    const scale =
      maxSide < 720 ? 2.5 : maxSide < 1100 ? 1.75 : maxSide < 1600 ? 1.25 : 1;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return image;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    // Mild contrast boost helps white LinkedIn text on phone screens
    try {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const contrast = 1.15;
      const intercept = 128 * (1 - contrast);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, Math.max(0, d[i]! * contrast + intercept));
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1]! * contrast + intercept));
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2]! * contrast + intercept));
      }
      ctx.putImageData(img, 0, 0);
    } catch {
      // getImageData may fail on huge canvases — keep the upscale alone
    }
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    return out ?? image;
  } catch {
    return image;
  }
}

export async function extractBadgeInfo(
  image: Blob,
  onProgress?: (status: string) => void,
): Promise<ExtractedBadgeInfo> {
  onProgress?.("Loading OCR…");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(`Reading image… ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  try {
    onProgress?.("Reading image…");
    const prepared = await preprocessForOcr(image);
    const {
      data: { text },
    } = await worker.recognize(prepared);
    const parsed = parseBadgeText(text || "");

    // If OCR saw a LinkedIn URL, keep it in rawText for callers to resolve
    const url = extractLinkedInFromText(text || "");
    if (url && !parsed.rawText.includes("linkedin.com")) {
      return { ...parsed, rawText: `${parsed.rawText}\n${url}`.trim() };
    }
    return parsed;
  } finally {
    await worker.terminate();
  }
}
