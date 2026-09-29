export type NoteType = "meeting" | "follow_up" | "general";
export type ReferralStatus = "yes" | "maybe" | "no" | "unknown";

export interface Contact {
  id: string;
  name: string;
  company?: string;
  title?: string;
  phone?: string;
  email?: string;
  linkedin_url?: string;
  website?: string;
  instagram?: string;
  twitter?: string;
  custom_links?: Record<string, string>;
  photo_id?: string;
  badge_photo_id?: string;
  willing_to_refer?: ReferralStatus;
  reminder_at?: number;
  reminder_note?: string;
  created_at: number;
  updated_at: number;
}

export interface Photo {
  id: string;
  data: Blob;
  mime_type: string;
  created_at: number;
}

export interface MeetingContext {
  id: string;
  contact_id: string;
  event_name?: string;
  location?: string;
  date_met?: string;
  initial_context?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface ContactTag {
  contact_id: string;
  tag_id: string;
}

export interface Note {
  id: string;
  contact_id: string;
  body: string;
  note_type: NoteType;
  created_at: number;
}

export interface ContactWithDetails extends Contact {
  tags: Tag[];
  meeting_context?: MeetingContext;
  notes: Note[];
}

export type SortOption = "recent" | "updated" | "alphabetical" | "reminder";

export type ListFilter =
  | "all"
  | "reminders_due"
  | "willing_to_refer"
  | "has_linkedin";

export const TAG_COLORS = [
  "#0f766e",
  "#0369a1",
  "#b45309",
  "#be123c",
  "#4d7c0f",
  "#7c3aed",
  "#0e7490",
  "#a16207",
  "#334155",
  "#c2410c",
] as const;

export const REFERRAL_LABELS: Record<ReferralStatus, string> = {
  yes: "Willing to refer",
  maybe: "Maybe later",
  no: "Not open to referring",
  unknown: "Not asked",
};
