import { db } from "./index";
import { blobToDataUrl, dataUrlToBlob } from "../photos/compress";
import type {
  Contact,
  ContactTag,
  MeetingContext,
  Note,
  Photo,
  Tag,
} from "./schema";

interface ExportPayload {
  version: 1;
  exported_at: string;
  contacts: Contact[];
  photos: Array<{ id: string; mime_type: string; data: string }>;
  meeting_contexts: MeetingContext[];
  tags: Tag[];
  contact_tags: ContactTag[];
  notes: Note[];
}

export async function exportBackup(): Promise<void> {
  const [contacts, photos, meeting_contexts, tags, contact_tags, notes] =
    await Promise.all([
      db.contacts.toArray(),
      db.photos.toArray(),
      db.meeting_contexts.toArray(),
      db.tags.toArray(),
      db.contact_tags.toArray(),
      db.notes.toArray(),
    ]);

  const serializedPhotos = await Promise.all(
    photos.map(async (photo: Photo) => ({
      id: photo.id,
      mime_type: photo.mime_type,
      data: await blobToDataUrl(photo.data),
    })),
  );

  const payload: ExportPayload = {
    version: 1,
    exported_at: new Date().toISOString(),
    contacts,
    photos: serializedPhotos,
    meeting_contexts,
    tags,
    contact_tags,
    notes,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rememberme-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const payload = JSON.parse(text) as ExportPayload;

  if (payload.version !== 1) {
    throw new Error("Unsupported backup version");
  }

  const photos: Photo[] = await Promise.all(
    payload.photos.map(async (p) => ({
      id: p.id,
      mime_type: p.mime_type,
      data: await dataUrlToBlob(p.data),
      created_at: Date.now(),
    })),
  );

  await db.transaction(
    "rw",
    [
      db.contacts,
      db.photos,
      db.meeting_contexts,
      db.tags,
      db.contact_tags,
      db.notes,
    ],
    async () => {
      await Promise.all([
        db.contacts.clear(),
        db.photos.clear(),
        db.meeting_contexts.clear(),
        db.tags.clear(),
        db.contact_tags.clear(),
        db.notes.clear(),
      ]);

      await db.contacts.bulkAdd(payload.contacts);
      await db.photos.bulkAdd(photos);
      await db.meeting_contexts.bulkAdd(payload.meeting_contexts);
      await db.tags.bulkAdd(payload.tags);
      await db.contact_tags.bulkAdd(payload.contact_tags);
      await db.notes.bulkAdd(payload.notes);
    },
  );
}
