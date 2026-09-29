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
  /\b(ceo|cto|cfo|coo|founder|co-founder|engineer|developer|manager|director|designer|product|vp|head of|lead|intern|student|recruiter|partner)\b/i;

const NOISE =
  /^(name|company|title|role|email|phone|badge|conference|summit|expo|pass|visitor|attendee|hello|welcome)$/i;

function cleanLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2 && !NOISE.test(line));
}

export function parseBadgeText(rawText: string): ExtractedBadgeInfo {
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
    return true;
  });

  for (const line of remaining) {
    if (!title && TITLE_HINTS.test(line) && line.length < 60) {
      title = line;
      continue;
    }
  }

  const candidates = remaining.filter((line) => line !== title);

  if (candidates[0] && !/[0-9@]/.test(candidates[0])) {
    name = candidates[0];
  }
  if (candidates[1] && candidates[1] !== title && !/[0-9@]/.test(candidates[1])) {
    // Prefer shorter all-caps or mid-length company-looking lines
    company = candidates[1];
  } else if (candidates[2] && !title) {
    company = candidates[2];
  }

  // If second line looked like a title, third may be company
  if (title && candidates[1] === title && candidates[2]) {
    company = candidates[2];
  }

  return {
    name,
    company,
    title,
    email,
    phone,
    rawText,
  };
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
        onProgress?.(`Reading badge… ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  try {
    onProgress?.("Reading badge…");
    const {
      data: { text },
    } = await worker.recognize(image);
    return parseBadgeText(text || "");
  } finally {
    await worker.terminate();
  }
}
