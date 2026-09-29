import Dexie, { type Table } from "dexie";
import type {
  Contact,
  ContactTag,
  MeetingContext,
  Note,
  Photo,
  Tag,
} from "./schema";

export class RememberMeDB extends Dexie {
  contacts!: Table<Contact, string>;
  photos!: Table<Photo, string>;
  meeting_contexts!: Table<MeetingContext, string>;
  tags!: Table<Tag, string>;
  contact_tags!: Table<ContactTag, [string, string]>;
  notes!: Table<Note, string>;

  constructor() {
    super("RememberMeDB");
    this.version(1).stores({
      contacts: "id, name, created_at, updated_at, photo_id",
      photos: "id, created_at",
      meeting_contexts: "id, contact_id",
      tags: "id, name",
      contact_tags: "[contact_id+tag_id], contact_id, tag_id",
      notes: "id, contact_id, created_at",
    });
    this.version(2).stores({
      contacts:
        "id, name, company, created_at, updated_at, photo_id, badge_photo_id, reminder_at, willing_to_refer",
      photos: "id, created_at",
      meeting_contexts: "id, contact_id",
      tags: "id, name",
      contact_tags: "[contact_id+tag_id], contact_id, tag_id",
      notes: "id, contact_id, created_at",
    });
  }
}

export const db = new RememberMeDB();
