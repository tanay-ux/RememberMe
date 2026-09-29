"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCapture } from "@/components/contacts/badge-capture";
import { FollowUpFields } from "@/components/contacts/follow-up-fields";
import { MeetingContextForm } from "@/components/contacts/meeting-context-form";
import { PhotoCapture } from "@/components/contacts/photo-capture";
import { SocialLinksFields } from "@/components/contacts/social-links-fields";
import { TagPicker } from "@/components/tags/tag-picker";
import {
  createContact,
  getPhotoUrl,
  updateContact,
} from "@/lib/db/contacts";
import type { ContactWithDetails, ReferralStatus } from "@/lib/db/schema";
import type { ExtractedBadgeInfo } from "@/lib/photos/badge-ocr";
import { contactDetailPath } from "@/lib/routes";
import { contactFormSchema } from "@/lib/validation/contact";

interface ContactFormProps {
  contact?: ContactWithDetails;
  /** Prefill from Share Extension / deep link */
  draft?: {
    name?: string;
    email?: string;
    company?: string;
    linkedin_url?: string;
    phone?: string;
    title?: string;
  };
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}

function reminderToDateString(ms?: number): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

function dateStringToMs(value?: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  return new Date(value + "T09:00:00").getTime();
}

export function ContactForm({ contact, draft, onSaved, onCancel }: ContactFormProps) {
  const router = useRouter();
  const isEdit = Boolean(contact);

  const [name, setName] = useState(contact?.name ?? draft?.name ?? "");
  const [company, setCompany] = useState(contact?.company ?? draft?.company ?? "");
  const [title, setTitle] = useState(contact?.title ?? draft?.title ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? draft?.phone ?? "");
  const [email, setEmail] = useState(contact?.email ?? draft?.email ?? "");
  const [linkedin_url, setLinkedinUrl] = useState(
    contact?.linkedin_url ?? draft?.linkedin_url ?? "",
  );
  const [website, setWebsite] = useState(contact?.website ?? "");
  const [instagram, setInstagram] = useState(contact?.instagram ?? "");
  const [twitter, setTwitter] = useState(contact?.twitter ?? "");
  const [willingToRefer, setWillingToRefer] = useState<ReferralStatus>(
    contact?.willing_to_refer ?? "unknown",
  );
  const [reminderDate, setReminderDate] = useState(
    reminderToDateString(contact?.reminder_at),
  );
  const [reminderNote, setReminderNote] = useState(contact?.reminder_note ?? "");
  const [event_name, setEventName] = useState(
    contact?.meeting_context?.event_name ?? "",
  );
  const [location, setLocation] = useState(
    contact?.meeting_context?.location ?? "",
  );
  const [date_met, setDateMet] = useState(
    contact?.meeting_context?.date_met ?? "",
  );
  const [initial_context, setInitialContext] = useState(
    contact?.meeting_context?.initial_context ?? "",
  );
  const [first_note, setFirstNote] = useState("");
  const [tag_names, setTagNames] = useState<string[]>(
    contact?.tags.map((t) => t.name) ?? [],
  );
  const [photoBlob, setPhotoBlob] = useState<Blob | null | undefined>(undefined);
  const [badgeBlob, setBadgeBlob] = useState<Blob | null | undefined>(undefined);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [removeBadge, setRemoveBadge] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | undefined>();
  const [existingBadgeUrl, setExistingBadgeUrl] = useState<string | undefined>();
  const [extractToast, setExtractToast] = useState<string | null>(null);

  useEffect(() => {
    if (!contact?.photo_id) return;
    let url: string | undefined;
    void getPhotoUrl(contact.photo_id).then((u) => {
      url = u;
      setExistingPhotoUrl(u);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [contact?.photo_id]);

  useEffect(() => {
    if (!contact?.badge_photo_id) return;
    let url: string | undefined;
    void getPhotoUrl(contact.badge_photo_id).then((u) => {
      url = u;
      setExistingBadgeUrl(u);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [contact?.badge_photo_id]);

  function handleSocialChange(field: string, value: string) {
    const setters: Record<string, (v: string) => void> = {
      phone: setPhone,
      email: setEmail,
      linkedin_url: setLinkedinUrl,
      website: setWebsite,
      instagram: setInstagram,
      twitter: setTwitter,
    };
    setters[field]?.(value);
  }

  function handleMeetingChange(field: string, value: string) {
    const setters: Record<string, (v: string) => void> = {
      event_name: setEventName,
      location: setLocation,
      date_met: setDateMet,
      initial_context: setInitialContext,
    };
    setters[field]?.(value);
  }

  function handlePhotoChange(blob: Blob | null) {
    if (blob === null) {
      setPhotoBlob(null);
      setRemovePhoto(true);
      setExistingPhotoUrl(undefined);
    } else {
      setPhotoBlob(blob);
      setRemovePhoto(false);
    }
  }

  function handleBadgeChange(blob: Blob | null) {
    if (blob === null) {
      setBadgeBlob(null);
      setRemoveBadge(true);
      setExistingBadgeUrl(undefined);
    } else {
      setBadgeBlob(blob);
      setRemoveBadge(false);
    }
  }

  function applyExtracted(info: ExtractedBadgeInfo) {
    const filled: string[] = [];
    // Only fill empty fields so we never wipe user edits
    if (info.name?.trim() && !name.trim()) {
      setName(info.name.trim());
      filled.push("name");
    }
    if (info.company?.trim() && !company.trim()) {
      setCompany(info.company.trim());
      filled.push("company");
    }
    if (info.title?.trim() && !title.trim()) {
      setTitle(info.title.trim());
      filled.push("title");
    }
    if (info.email?.trim() && !email.trim()) {
      setEmail(info.email.trim());
      filled.push("email");
    }
    if (info.phone?.trim() && !phone.trim()) {
      setPhone(info.phone.trim());
      filled.push("phone");
    }
    setExtractToast(
      filled.length
        ? `Filled: ${filled.join(", ")}. Review before saving.`
        : "Nothing new filled — fields may already have values, or OCR was unclear. Edit manually if needed.",
    );
  }

  function resetFormKeepEvent() {
    setName("");
    setCompany("");
    setTitle("");
    setPhone("");
    setEmail("");
    setLinkedinUrl("");
    setWebsite("");
    setInstagram("");
    setTwitter("");
    setWillingToRefer("unknown");
    setReminderDate("");
    setReminderNote("");
    setFirstNote("");
    setPhotoBlob(undefined);
    setBadgeBlob(undefined);
    setRemovePhoto(false);
    setRemoveBadge(false);
    setExistingPhotoUrl(undefined);
    setExistingBadgeUrl(undefined);
    setExtractToast(null);
    setErrors({});
  }

  async function handleSubmit(saveAndAddAnother = false) {
    const values = {
      name,
      company,
      title,
      phone,
      email,
      linkedin_url,
      website,
      instagram,
      twitter,
      willing_to_refer: willingToRefer,
      reminder_at: reminderDate,
      reminder_note: reminderNote,
      event_name,
      location,
      date_met,
      initial_context,
      first_note: isEdit ? undefined : first_note,
      tag_names,
    };

    const result = contactFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const input = {
        name,
        company,
        title,
        phone,
        email,
        linkedin_url,
        website,
        instagram,
        twitter,
        willing_to_refer: willingToRefer,
        reminder_at: dateStringToMs(reminderDate),
        reminder_note: reminderNote,
        event_name,
        location,
        date_met,
        initial_context,
        first_note: isEdit ? undefined : first_note,
        tag_names,
        photoBlob: photoBlob ?? undefined,
        badgePhotoBlob: badgeBlob ?? undefined,
        removePhoto: isEdit ? removePhoto : undefined,
        removeBadgePhoto: isEdit ? removeBadge : undefined,
      };

      if (isEdit && contact) {
        await updateContact({ id: contact.id, ...input });
        onSaved?.(contact.id);
        if (!onSaved) router.push(contactDetailPath(contact.id));
      } else {
        const id = await createContact(input);
        if (saveAndAddAnother) {
          resetFormKeepEvent();
        } else {
          onSaved?.(id);
          router.push(contactDetailPath(id));
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(false);
      }}
    >
      <div className="space-y-2">
        <Label className="text-base">Face photo</Label>
        <PhotoCapture
          name={name}
          previewUrl={existingPhotoUrl}
          onPhotoChange={handlePhotoChange}
        />
      </div>

      <BadgeCapture
        previewUrl={existingBadgeUrl}
        onBadgeChange={handleBadgeChange}
        onExtracted={applyExtracted}
      />
      {extractToast && (
        <p className="text-sm text-muted-foreground -mt-3">{extractToast}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            autoFocus={!isEdit}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Robotics"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Title / role</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product Manager"
          />
        </div>
      </div>

      <SocialLinksFields
        values={{ phone, email, linkedin_url, website, instagram, twitter }}
        onChange={handleSocialChange}
        errors={errors}
      />

      <Separator />

      <FollowUpFields
        willingToRefer={willingToRefer}
        reminderDate={reminderDate}
        reminderNote={reminderNote}
        onWillingChange={setWillingToRefer}
        onReminderDateChange={setReminderDate}
        onReminderNoteChange={setReminderNote}
      />

      <Separator />

      <MeetingContextForm
        values={{ event_name, location, date_met, initial_context }}
        onChange={handleMeetingChange}
      />

      <Separator />

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagPicker selected={tag_names} onChange={setTagNames} />
      </div>

      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="first_note">First note</Label>
          <Textarea
            id="first_note"
            value={first_note}
            onChange={(e) => setFirstNote(e.target.value)}
            placeholder="What you talked about — searchable later"
            rows={3}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {isEdit ? "Save changes" : "Save contact"}
        </Button>
        {!isEdit && (
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => void handleSubmit(true)}
          >
            Save & add another
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
