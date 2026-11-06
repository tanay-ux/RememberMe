"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BadgeCapture } from "@/components/contacts/badge-capture";
import { FollowUpFields } from "@/components/contacts/follow-up-fields";
import { MeetingContextForm } from "@/components/contacts/meeting-context-form";
import { PhotoCapture } from "@/components/contacts/photo-capture";
import { SocialLinksFields } from "@/components/contacts/social-links-fields";
import {
  createContact,
  getPhotoUrl,
  updateContact,
} from "@/lib/db/contacts";
import type { ContactWithDetails, ReferralStatus } from "@/lib/db/schema";
import {
  hasCredibleBadgeInfo,
  sanitizeBadgeInfo,
  type ExtractedBadgeInfo,
} from "@/lib/photos/badge-ocr";
import { fetchLinkedInAvatar } from "@/lib/photos/linkedin-avatar";
import {
  normalizeLinkedInProfileUrl,
  resolveLinkedInProfile,
} from "@/lib/photos/linkedin-profile";
import { contactDetailPath, extractLinkedInFromText } from "@/lib/routes";
import { setFlashToast } from "@/lib/ui/flash-toast";
import { contactFormSchema } from "@/lib/validation/contact";

export interface ContactFormCaptureSeed {
  badgeBlob?: Blob;
  badgePreviewUrl?: string;
  photoBlob?: Blob;
  photoPreviewUrl?: string;
  extracted?: ExtractedBadgeInfo;
  linkedinUrl?: string;
  statusMessage?: string;
}

interface ContactFormProps {
  contact?: ContactWithDetails;
  draft?: {
    name?: string;
    email?: string;
    company?: string;
    linkedin_url?: string;
    phone?: string;
    title?: string;
  };
  /** Prefill from the camera-first capture step */
  captureSeed?: ContactFormCaptureSeed;
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

function existingMeetingNotes(contact?: ContactWithDetails): string {
  if (!contact) return "";
  return (
    contact.meeting_context?.initial_context ||
    contact.notes.find((n) => n.note_type === "meeting")?.body ||
    ""
  );
}

export function ContactForm({
  contact,
  draft,
  captureSeed,
  onSaved,
  onCancel,
}: ContactFormProps) {
  const router = useRouter();
  const isEdit = Boolean(contact);
  const seed = captureSeed?.extracted
    ? sanitizeBadgeInfo(captureSeed.extracted)
    : undefined;

  const [name, setName] = useState(
    contact?.name ?? draft?.name ?? seed?.name ?? "",
  );
  const [company, setCompany] = useState(
    contact?.company ?? draft?.company ?? seed?.company ?? "",
  );
  const [title, setTitle] = useState(
    contact?.title ?? draft?.title ?? seed?.title ?? "",
  );
  const [phone, setPhone] = useState(
    contact?.phone ?? draft?.phone ?? seed?.phone ?? "",
  );
  const [email, setEmail] = useState(
    contact?.email ?? draft?.email ?? seed?.email ?? "",
  );
  const [linkedin_url, setLinkedinUrl] = useState(
    contact?.linkedin_url ??
      draft?.linkedin_url ??
      captureSeed?.linkedinUrl ??
      "",
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
  const [meetingNotes, setMeetingNotes] = useState(existingMeetingNotes(contact));
  const [tags, setTags] = useState<string[]>(
    contact?.tags.map((t) => t.name) ?? [],
  );
  const [photoBlob, setPhotoBlob] = useState<Blob | null | undefined>(
    captureSeed?.photoBlob,
  );
  const [badgeBlob, setBadgeBlob] = useState<Blob | null | undefined>(
    captureSeed?.badgeBlob,
  );
  const [removePhoto, setRemovePhoto] = useState(false);
  const [removeBadge, setRemoveBadge] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | undefined>(
    captureSeed?.photoPreviewUrl,
  );
  const [existingBadgeUrl, setExistingBadgeUrl] = useState<string | undefined>(
    captureSeed?.badgePreviewUrl,
  );
  const [extractToast, setExtractToast] = useState<string | null>(
    captureSeed?.statusMessage ?? null,
  );

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

  // Deep link / share / draft LinkedIn URL — resolve real name + photo whenever URL appears
  useEffect(() => {
    if (isEdit) return;
    const cleaned =
      extractLinkedInFromText(linkedin_url) || linkedin_url.trim();
    if (!cleaned || !/linkedin\.com\/in\//i.test(cleaned)) return;

    const canonical = normalizeLinkedInProfileUrl(cleaned);
    if (canonical !== linkedin_url.trim()) {
      setLinkedinUrl(canonical);
    }

    const needsName = !name.trim();
    const needsTitle = !title.trim();
    const needsPhoto = !photoBlob && !existingPhotoUrl;
    if (!needsName && !needsTitle && !needsPhoto) return;

    let cancelled = false;
    void (async () => {
      setExtractToast("Looking up LinkedIn profile…");
      const profile = await resolveLinkedInProfile(canonical);
      if (cancelled) return;

      if (profile.name && needsName) setName(profile.name);
      if (profile.headline && needsTitle) setTitle(profile.headline);

      if (needsPhoto) {
        const avatar = await fetchLinkedInAvatar(
          canonical,
          profile.photoUrl,
        );
        if (cancelled) return;
        if (avatar) {
          const objectUrl = URL.createObjectURL(avatar);
          setExistingPhotoUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return objectUrl;
          });
          setPhotoBlob(avatar);
          setRemovePhoto(false);
        }
      }

      if (cancelled) return;
      const displayName = profile.name || name.trim();
      setExtractToast(
        displayName
          ? `LinkedIn found for ${displayName} — review and save.`
          : profile.privateProfile
            ? "This LinkedIn profile isn’t public — enter the name manually."
            : "LinkedIn URL filled — add the name if needed.",
      );
    })();

    return () => {
      cancelled = true;
    };
    // Re-run when a share/deep link sets the LinkedIn URL (not on every keystroke field)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedin_url, isEdit]);

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

  function handlePhotoChange(blob: Blob | null) {
    if (blob === null) {
      setPhotoBlob(null);
      setRemovePhoto(true);
      setExistingPhotoUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return undefined;
      });
    } else {
      setPhotoBlob(blob);
      setRemovePhoto(false);
    }
  }

  async function handleLinkedInFound(url: string) {
    setLinkedinUrl(url);

    const hasPhoto = Boolean(photoBlob) || Boolean(existingPhotoUrl);
    setExtractToast("LinkedIn found — looking up profile…");
    const profile = await resolveLinkedInProfile(url);
    if (profile.name && !name.trim()) {
      setName(profile.name);
    }
    if (profile.headline && !title.trim()) {
      setTitle(profile.headline);
    }

    if (hasPhoto) {
      setExtractToast(
        profile.name
          ? `LinkedIn found for ${profile.name} — review before saving.`
          : "LinkedIn profile filled from QR — review before saving.",
      );
      return;
    }

    setExtractToast("Fetching LinkedIn photo…");
    const avatar = await fetchLinkedInAvatar(url, profile.photoUrl);
    if (!avatar) {
      setExtractToast(
        profile.name
          ? `LinkedIn found for ${profile.name} — add a photo if you can.`
          : "LinkedIn URL filled — add the name and photo.",
      );
      return;
    }

    const objectUrl = URL.createObjectURL(avatar);
    setExistingPhotoUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    setPhotoBlob(avatar);
    setRemovePhoto(false);
    setExtractToast(
      profile.name
        ? `LinkedIn found for ${profile.name} — photo filled.`
        : "LinkedIn photo filled — add the name, then save.",
    );
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
    const clean = sanitizeBadgeInfo(info);
    if (!hasCredibleBadgeInfo(clean)) {
      setExtractToast(
        "Couldn’t read a clear name from that photo — enter details manually.",
      );
      return;
    }

    const filled: string[] = [];
    if (clean.name?.trim() && !name.trim()) {
      setName(clean.name.trim());
      filled.push("name");
    }
    if (clean.company?.trim() && !company.trim()) {
      setCompany(clean.company.trim());
      filled.push("company");
    }
    if (clean.title?.trim() && !title.trim()) {
      setTitle(clean.title.trim());
      filled.push("title");
    }
    if (clean.email?.trim() && !email.trim()) {
      setEmail(clean.email.trim());
      filled.push("email");
    }
    if (clean.phone?.trim() && !phone.trim()) {
      setPhone(clean.phone.trim());
      filled.push("phone");
    }
    setExtractToast(
      filled.length
        ? `Filled: ${filled.join(", ")}. Review before saving.`
        : "Nothing new filled — fields may already have values, or OCR was unclear.",
    );
  }

  async function handleSubmit() {
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
      initial_context: meetingNotes,
      first_note: isEdit ? undefined : meetingNotes,
      tag_names: tags,
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
        initial_context: meetingNotes,
        first_note: isEdit ? undefined : meetingNotes.trim() || undefined,
        tag_names: tags,
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
        await createContact(input);
        setFlashToast(`Saved ${name.trim()}`);
        router.replace("/");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="w-full max-w-full space-y-12 pb-[calc(7rem+var(--app-sab,0px))]">
        <div className="space-y-3">
          <Label className="text-base font-semibold tracking-tight">
            Add photo
          </Label>
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
          onLinkedInFound={(url) => {
            void handleLinkedInFound(url);
          }}
        />
        {extractToast && (
          <p className="-mt-6 text-sm leading-relaxed text-muted-foreground">
            {extractToast}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title / role</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Role"
            />
          </div>
        </div>

        <SocialLinksFields
          values={{ phone, email, linkedin_url, website, instagram, twitter }}
          onChange={handleSocialChange}
          errors={errors}
        />

        <Separator />

        <MeetingContextForm
          value={meetingNotes}
          onChange={setMeetingNotes}
          tags={tags}
          onTagsChange={setTags}
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
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-50 w-full max-w-full border-t border-border/80 bg-background/95 backdrop-blur-md"
        style={{ paddingBottom: "max(0.5rem, var(--app-sab, 0px))" }}
      >
        <div className="mx-auto flex w-full max-w-2xl gap-3 px-5 py-3">
          <Button
            type="button"
            variant="secondary"
            className="h-11 flex-1 rounded-lg"
            onClick={() => (onCancel ? onCancel() : router.back())}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 flex-[1.4] rounded-lg text-base shadow-md shadow-primary/20"
          >
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
