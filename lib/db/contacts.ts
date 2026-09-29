import { db } from "./index";
import type {
  Contact,
  ContactWithDetails,
  ListFilter,
  MeetingContext,
  Note,
  NoteType,
  ReferralStatus,
  SortOption,
  Tag,
} from "./schema";
import { TAG_COLORS } from "./schema";
import { compressImage } from "../photos/compress";

export interface CreateContactInput {
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
  photoBlob?: Blob;
  badgePhotoBlob?: Blob;
  willing_to_refer?: ReferralStatus;
  reminder_at?: number | null;
  reminder_note?: string;
  event_name?: string;
  location?: string;
  date_met?: string;
  initial_context?: string;
  first_note?: string;
  tag_names?: string[];
}

export interface UpdateContactInput extends CreateContactInput {
  id: string;
  removePhoto?: boolean;
  removeBadgePhoto?: boolean;
}

export interface ListContactsOptions {
  search?: string;
  tagId?: string;
  eventName?: string;
  sort?: SortOption;
  filter?: ListFilter;
}

function normalizeLinkedIn(url?: string): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/linkedin\.com\//i.test(trimmed)) return `https://${trimmed}`;
  return `https://www.linkedin.com/in/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

async function savePhoto(blob: Blob): Promise<string> {
  const compressed = await compressImage(blob);
  const id = crypto.randomUUID();
  await db.photos.add({
    id,
    data: compressed,
    mime_type: compressed.type || "image/jpeg",
    created_at: Date.now(),
  });
  return id;
}

async function deletePhoto(photoId: string): Promise<void> {
  await db.photos.delete(photoId);
}

async function getOrCreateTags(names: string[]): Promise<Tag[]> {
  const trimmed = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const tags: Tag[] = [];

  for (const name of trimmed) {
    const existing = await db.tags
      .filter((t) => t.name.toLowerCase() === name.toLowerCase())
      .first();
    if (existing) {
      tags.push(existing);
    } else {
      const allTags = await db.tags.toArray();
      const color = TAG_COLORS[allTags.length % TAG_COLORS.length];
      const tag: Tag = { id: crypto.randomUUID(), name, color };
      await db.tags.add(tag);
      tags.push(tag);
    }
  }

  return tags;
}

async function setContactTags(contactId: string, tagIds: string[]): Promise<void> {
  await db.contact_tags.where("contact_id").equals(contactId).delete();
  if (tagIds.length) {
    await db.contact_tags.bulkAdd(
      tagIds.map((tag_id) => ({ contact_id: contactId, tag_id })),
    );
  }
}

function buildContactFields(
  input: CreateContactInput,
  existing?: Contact,
  photo_id?: string,
  badge_photo_id?: string,
): Contact {
  const now = Date.now();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: input.name.trim(),
    company: input.company?.trim() || undefined,
    title: input.title?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    linkedin_url: normalizeLinkedIn(input.linkedin_url),
    website: input.website?.trim() || undefined,
    instagram: input.instagram?.trim() || undefined,
    twitter: input.twitter?.trim() || undefined,
    custom_links: input.custom_links,
    photo_id,
    badge_photo_id,
    willing_to_refer: input.willing_to_refer ?? "unknown",
    reminder_at:
      input.reminder_at === null
        ? undefined
        : input.reminder_at ?? existing?.reminder_at,
    reminder_note: input.reminder_note?.trim() || undefined,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

async function upsertMeeting(
  contactId: string,
  input: CreateContactInput,
): Promise<void> {
  const meeting = await db.meeting_contexts
    .where("contact_id")
    .equals(contactId)
    .first();

  const meetingData = {
    event_name: input.event_name?.trim() || undefined,
    location: input.location?.trim() || undefined,
    date_met: input.date_met || undefined,
    initial_context: input.initial_context?.trim() || undefined,
  };

  const hasMeeting = Object.values(meetingData).some(Boolean);

  if (meeting) {
    if (hasMeeting) {
      await db.meeting_contexts.put({ ...meeting, ...meetingData });
    } else {
      await db.meeting_contexts.delete(meeting.id);
    }
  } else if (hasMeeting) {
    const row: MeetingContext = {
      id: crypto.randomUUID(),
      contact_id: contactId,
      ...meetingData,
    };
    await db.meeting_contexts.add(row);
  }
}

export async function createContact(input: CreateContactInput): Promise<string> {
  const now = Date.now();
  let photo_id: string | undefined;
  let badge_photo_id: string | undefined;

  if (input.photoBlob) photo_id = await savePhoto(input.photoBlob);
  if (input.badgePhotoBlob) badge_photo_id = await savePhoto(input.badgePhotoBlob);

  const contact = buildContactFields(input, undefined, photo_id, badge_photo_id);
  const id = contact.id;

  await db.transaction(
    "rw",
    [db.contacts, db.meeting_contexts, db.notes, db.tags, db.contact_tags],
    async () => {
      await db.contacts.add(contact);
      await upsertMeeting(id, input);

      if (input.first_note?.trim()) {
        const note: Note = {
          id: crypto.randomUUID(),
          contact_id: id,
          body: input.first_note.trim(),
          note_type: "meeting",
          created_at: now,
        };
        await db.notes.add(note);
      }

      if (input.tag_names?.length) {
        const tags = await getOrCreateTags(input.tag_names);
        await setContactTags(
          id,
          tags.map((t) => t.id),
        );
      }
    },
  );

  return id;
}

export async function updateContact(input: UpdateContactInput): Promise<void> {
  const existing = await db.contacts.get(input.id);
  if (!existing) throw new Error("Contact not found");

  let photo_id = existing.photo_id;
  let badge_photo_id = existing.badge_photo_id;

  if (input.removePhoto && photo_id) {
    await deletePhoto(photo_id);
    photo_id = undefined;
  }
  if (input.photoBlob) {
    if (photo_id) await deletePhoto(photo_id);
    photo_id = await savePhoto(input.photoBlob);
  }

  if (input.removeBadgePhoto && badge_photo_id) {
    await deletePhoto(badge_photo_id);
    badge_photo_id = undefined;
  }
  if (input.badgePhotoBlob) {
    if (badge_photo_id) await deletePhoto(badge_photo_id);
    badge_photo_id = await savePhoto(input.badgePhotoBlob);
  }

  const contact = buildContactFields(
    input,
    existing,
    photo_id,
    badge_photo_id,
  );

  if (input.reminder_at === undefined) {
    contact.reminder_at = existing.reminder_at;
    if (input.reminder_note === undefined) {
      contact.reminder_note = existing.reminder_note;
    }
  } else if (input.reminder_at === null) {
    contact.reminder_at = undefined;
  }

  await db.transaction(
    "rw",
    [db.contacts, db.meeting_contexts, db.notes, db.tags, db.contact_tags],
    async () => {
      await db.contacts.put(contact);
      await upsertMeeting(input.id, input);

      if (input.tag_names) {
        const tags = await getOrCreateTags(input.tag_names);
        await setContactTags(
          input.id,
          tags.map((t) => t.id),
        );
      }
    },
  );
}

export async function deleteContact(id: string): Promise<void> {
  const contact = await db.contacts.get(id);
  if (!contact) return;

  await db.transaction(
    "rw",
    [
      db.contacts,
      db.photos,
      db.meeting_contexts,
      db.notes,
      db.contact_tags,
    ],
    async () => {
      if (contact.photo_id) await deletePhoto(contact.photo_id);
      if (contact.badge_photo_id) await deletePhoto(contact.badge_photo_id);
      await db.meeting_contexts.where("contact_id").equals(id).delete();
      await db.notes.where("contact_id").equals(id).delete();
      await db.contact_tags.where("contact_id").equals(id).delete();
      await db.contacts.delete(id);
    },
  );
}

export async function getContactWithDetails(
  id: string,
): Promise<ContactWithDetails | undefined> {
  const contact = await db.contacts.get(id);
  if (!contact) return undefined;

  const [contactTagRows, meeting_context, notes] = await Promise.all([
    db.contact_tags.where("contact_id").equals(id).toArray(),
    db.meeting_contexts.where("contact_id").equals(id).first(),
    db.notes.where("contact_id").equals(id).sortBy("created_at"),
  ]);

  const tagIds = contactTagRows.map((ct) => ct.tag_id);
  const tags = tagIds.length ? await db.tags.bulkGet(tagIds) : [];

  return {
    ...contact,
    tags: tags.filter((t): t is Tag => t !== undefined),
    meeting_context,
    notes: notes.reverse(),
  };
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function listContactsWithDetails(
  options: ListContactsOptions = {},
): Promise<ContactWithDetails[]> {
  const {
    search,
    tagId,
    eventName,
    sort = "recent",
    filter = "all",
  } = options;

  const contacts = await db.contacts.toArray();
  const today = startOfToday();

  if (sort === "recent") {
    contacts.sort((a, b) => b.created_at - a.created_at);
  } else if (sort === "updated") {
    contacts.sort((a, b) => b.updated_at - a.updated_at);
  } else if (sort === "reminder") {
    contacts.sort((a, b) => {
      const ar = a.reminder_at ?? Number.MAX_SAFE_INTEGER;
      const br = b.reminder_at ?? Number.MAX_SAFE_INTEGER;
      return ar - br;
    });
  } else {
    contacts.sort((a, b) => a.name.localeCompare(b.name));
  }

  const results: ContactWithDetails[] = [];

  for (const contact of contacts) {
    const details = await getContactWithDetails(contact.id);
    if (!details) continue;

    if (filter === "reminders_due") {
      if (!details.reminder_at || details.reminder_at > today + 86400000 - 1) {
        continue;
      }
    }
    if (filter === "willing_to_refer" && details.willing_to_refer !== "yes") {
      continue;
    }
    if (filter === "has_linkedin" && !details.linkedin_url) continue;

    if (tagId && !details.tags.some((t) => t.id === tagId)) continue;

    if (eventName) {
      const event = details.meeting_context?.event_name?.toLowerCase() ?? "";
      if (!event.includes(eventName.toLowerCase())) continue;
    }

    if (search) {
      const q = search.toLowerCase().trim();
      if (!q) {
        results.push(details);
        continue;
      }
      const haystack = [
        details.name,
        details.company,
        details.title,
        details.phone,
        details.email,
        details.linkedin_url,
        details.website,
        details.instagram,
        details.twitter,
        details.reminder_note,
        details.willing_to_refer,
        details.meeting_context?.event_name,
        details.meeting_context?.location,
        details.meeting_context?.initial_context,
        ...details.tags.map((t) => t.name),
        ...details.notes.map((n) => n.body),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(q)) continue;
    }

    results.push(details);
  }

  return results;
}

export async function addNote(
  contactId: string,
  body: string,
  noteType: NoteType,
): Promise<void> {
  await db.notes.add({
    id: crypto.randomUUID(),
    contact_id: contactId,
    body: body.trim(),
    note_type: noteType,
    created_at: Date.now(),
  });
  await db.contacts.update(contactId, { updated_at: Date.now() });
}

export async function deleteNote(noteId: string): Promise<void> {
  const note = await db.notes.get(noteId);
  if (!note) return;
  await db.notes.delete(noteId);
  await db.contacts.update(note.contact_id, { updated_at: Date.now() });
}

export async function clearReminder(contactId: string): Promise<void> {
  await db.contacts.update(contactId, {
    reminder_at: undefined,
    reminder_note: undefined,
    updated_at: Date.now(),
  });
}

export async function getAllTags(): Promise<Tag[]> {
  return db.tags.orderBy("name").toArray();
}

export async function getPhotoUrl(photoId?: string): Promise<string | undefined> {
  if (!photoId) return undefined;
  const photo = await db.photos.get(photoId);
  if (!photo) return undefined;
  return URL.createObjectURL(photo.data);
}

export async function getPhotoBlob(photoId?: string): Promise<Blob | undefined> {
  if (!photoId) return undefined;
  const photo = await db.photos.get(photoId);
  return photo?.data;
}

export async function getStorageUsage(): Promise<{ bytes: number; contacts: number }> {
  const [contacts, photos] = await Promise.all([
    db.contacts.count(),
    db.photos.toArray(),
  ]);
  const bytes = photos.reduce((sum, p) => sum + p.data.size, 0);
  return { bytes, contacts };
}

export async function getDistinctEventNames(): Promise<string[]> {
  const meetings = await db.meeting_contexts.toArray();
  const names = new Set<string>();
  for (const m of meetings) {
    if (m.event_name?.trim()) names.add(m.event_name.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export async function countDueReminders(): Promise<number> {
  const todayEnd = startOfToday() + 86400000 - 1;
  const all = await db.contacts.toArray();
  return all.filter((c) => c.reminder_at && c.reminder_at <= todayEnd).length;
}
