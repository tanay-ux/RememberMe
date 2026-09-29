"use client";

import { useCallback, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import {
  AtSign,
  Bell,
  Building2,
  Check,
  Globe,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ContactForm } from "@/components/contacts/contact-form";
import { NotesTimeline } from "@/components/contacts/notes-timeline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  clearReminder,
  deleteContact,
  getContactWithDetails,
} from "@/lib/db/contacts";
import { usePhotoUrl } from "@/lib/hooks/use-photo-url";
import { REFERRAL_LABELS } from "@/lib/db/schema";
import {
  formatInstagramUrl,
  formatLinkedInUrl,
  formatWebsiteUrl,
  getInitials,
} from "@/lib/utils/format";
import { contactDetailPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

function ContactDetailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") ?? "";

  const [editing, setEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const contact = useLiveQuery(async () => {
    if (!id) return null;
    const data = await getContactWithDetails(id);
    return data ?? null;
  }, [id, refreshKey]);

  const photoUrl = usePhotoUrl(contact?.photo_id);
  const badgeUrl = usePhotoUrl(contact?.badge_photo_id);

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  async function handleDelete() {
    if (!confirm("Delete this contact? This cannot be undone.")) return;
    await deleteContact(id);
    router.push("/");
  }

  async function handleClearReminder() {
    await clearReminder(id);
    reload();
  }

  if (!id) {
    return (
      <>
        <AppHeader title="Not found" backHref="/" />
        <main className="mx-auto max-w-2xl px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Missing contact id.</p>
          <Link href="/" className={cn(buttonVariants())}>
            Back to contacts
          </Link>
        </main>
      </>
    );
  }

  if (contact === undefined) {
    return (
      <>
        <AppHeader title="Contact" backHref="/" />
        <main className="mx-auto max-w-2xl px-4 py-8 text-center text-muted-foreground">
          Loading...
        </main>
      </>
    );
  }

  if (contact === null) {
    return (
      <>
        <AppHeader title="Not found" backHref="/" />
        <main className="mx-auto max-w-2xl px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Contact not found.</p>
          <Link href="/" className={cn(buttonVariants())}>
            Back to contacts
          </Link>
        </main>
      </>
    );
  }

  if (editing) {
    return (
      <>
        <AppHeader title="Edit contact" backHref={contactDetailPath(id)} />
        <main className="mx-auto max-w-2xl flex-1 px-4 py-6">
          <ContactForm
            contact={contact}
            onSaved={() => {
              setEditing(false);
              reload();
            }}
            onCancel={() => setEditing(false)}
          />
        </main>
      </>
    );
  }

  const links = [
    contact.linkedin_url && {
      icon: Link2,
      label: "LinkedIn",
      href: formatLinkedInUrl(contact.linkedin_url),
    },
    contact.email && {
      icon: Mail,
      label: contact.email,
      href: `mailto:${contact.email}`,
    },
    contact.phone && {
      icon: Phone,
      label: contact.phone,
      href: `tel:${contact.phone}`,
    },
    contact.website && {
      icon: Globe,
      label: "Website",
      href: formatWebsiteUrl(contact.website),
    },
    contact.instagram && {
      icon: AtSign,
      label: contact.instagram,
      href: formatInstagramUrl(contact.instagram),
    },
    contact.twitter && {
      icon: AtSign,
      label: contact.twitter,
      href: contact.twitter.startsWith("http")
        ? contact.twitter
        : `https://twitter.com/${contact.twitter.replace(/^@/, "")}`,
    },
  ].filter(Boolean) as Array<{
    icon: typeof Phone;
    label: string;
    href: string;
  }>;

  const reminderDue =
    contact.reminder_at &&
    contact.reminder_at <=
      (() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d.getTime();
      })();

  return (
    <>
      <AppHeader
        title={contact.name}
        backHref="/"
        action={
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => void handleDelete()}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-6 space-y-6 pb-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="size-28 text-3xl">
            {photoUrl ? (
              <AvatarImage src={photoUrl} alt={contact.name} />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold">{contact.name}</h2>
            {(contact.title || contact.company) && (
              <p className="text-muted-foreground mt-1">
                {[contact.title, contact.company].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {contact.willing_to_refer && contact.willing_to_refer !== "unknown" && (
              <Badge
                variant="secondary"
                className={
                  contact.willing_to_refer === "yes"
                    ? "text-teal-800 bg-teal-50"
                    : ""
                }
              >
                {REFERRAL_LABELS[contact.willing_to_refer]}
              </Badge>
            )}
            {contact.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>

        {contact.reminder_at && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              reminderDue
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "bg-card",
            )}
          >
            <Bell className="size-5 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium text-sm">
                {reminderDue ? "Reach out today" : "Reminder"}
              </p>
              <p className="text-sm">
                {format(contact.reminder_at, "EEE, MMM d, yyyy")}
                {contact.reminder_note ? ` · ${contact.reminder_note}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleClearReminder()}
            >
              <Check className="size-4" />
              Done
            </Button>
          </div>
        )}

        {links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {links.map((link) => (
              <a
                key={link.href + link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <link.icon className="size-4" />
                <span className="max-w-40 truncate">{link.label}</span>
              </a>
            ))}
          </div>
        )}

        {contact.company && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-4" />
            {contact.company}
          </div>
        )}

        {badgeUrl && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Conference badge</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgeUrl}
              alt="Conference badge"
              className="w-full max-h-56 object-contain rounded-lg border bg-muted"
            />
          </section>
        )}

        {contact.meeting_context && (
          <>
            <Separator />
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Where you met</h3>
              <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
                {contact.meeting_context.event_name && (
                  <p className="font-medium">
                    {contact.meeting_context.event_name}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  {contact.meeting_context.date_met && (
                    <span>
                      {format(
                        new Date(contact.meeting_context.date_met + "T00:00:00"),
                        "MMM d, yyyy",
                      )}
                    </span>
                  )}
                  {contact.meeting_context.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {contact.meeting_context.location}
                    </span>
                  )}
                </div>
                {contact.meeting_context.initial_context && (
                  <p className="text-foreground whitespace-pre-wrap pt-1">
                    {contact.meeting_context.initial_context}
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        <Separator />

        <NotesTimeline
          contactId={contact.id}
          notes={contact.notes}
          onNotesChange={reload}
        />
      </main>
    </>
  );
}

export default function ContactDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-8 text-center text-muted-foreground">
          Loading...
        </main>
      }
    >
      <ContactDetailInner />
    </Suspense>
  );
}
