"use client";

import { useCallback, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import {
  AtSign,
  Bell,
  Check,
  Globe,
  Link2,
  Mail,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ContactForm } from "@/components/contacts/contact-form";
import { NotesTimeline } from "@/components/contacts/notes-timeline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
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

  if (!id || contact === null) {
    return (
      <>
        <AppHeader title="Not found" backHref="/" />
        <main className="mx-auto max-w-2xl px-5 py-12 text-center">
          <p className="mb-6 text-muted-foreground">
            {!id ? "Missing contact." : "Contact not found."}
          </p>
          <Link
            href="/"
            className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-lg px-6")}
          >
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
        <main className="mx-auto max-w-2xl px-5 py-12 text-center text-muted-foreground">
          Loading…
        </main>
      </>
    );
  }

  if (editing) {
    return (
      <>
        <AppHeader title="Edit contact" backHref={contactDetailPath(id)} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-x-hidden px-5 pb-[calc(3rem+var(--app-sab,0px))] pt-4">
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
    contact.phone
      ? { icon: Phone, label: contact.phone, href: `tel:${contact.phone}` }
      : null,
    contact.email
      ? { icon: Mail, label: contact.email, href: `mailto:${contact.email}` }
      : null,
    contact.linkedin_url
      ? {
          icon: Link2,
          label: "LinkedIn",
          href: formatLinkedInUrl(contact.linkedin_url),
        }
      : null,
    contact.website
      ? {
          icon: Globe,
          label: "Website",
          href: formatWebsiteUrl(contact.website),
        }
      : null,
    contact.instagram
      ? {
          icon: AtSign,
          label: "Instagram",
          href: formatInstagramUrl(contact.instagram),
        }
      : null,
    contact.twitter
      ? {
          icon: AtSign,
          label: contact.twitter.startsWith("http")
            ? "X / Twitter"
            : contact.twitter,
          href: contact.twitter.startsWith("http")
            ? contact.twitter
            : `https://twitter.com/${contact.twitter.replace(/^@/, "")}`,
        }
      : null,
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
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-lg"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4 stroke-[1.5]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-lg text-destructive"
              onClick={() => void handleDelete()}
            >
              <Trash2 className="size-4 stroke-[1.5]" />
            </Button>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-12 overflow-x-hidden px-5 pb-[calc(5rem+var(--app-sab,0px))] pt-4">
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-20 text-xl">
            {photoUrl ? (
              <AvatarImage src={photoUrl} alt={contact.name} />
            ) : null}
            <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
          </Avatar>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            {contact.name}
          </h2>
          {(contact.title || contact.company) && (
            <p className="mt-2 text-base text-muted-foreground leading-relaxed">
              {[contact.title, contact.company].filter(Boolean).join(" · ")}
            </p>
          )}
          {(contact.willing_to_refer &&
            contact.willing_to_refer !== "unknown") ||
          contact.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2">
              {contact.willing_to_refer &&
                contact.willing_to_refer !== "unknown" && (
                  <span className="text-sm font-medium text-primary">
                    {REFERRAL_LABELS[contact.willing_to_refer]}
                  </span>
                )}
              {contact.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-sm font-medium text-muted-foreground"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {contact.reminder_at && (
          <div
            className={cn(
              "flex items-start gap-3 border-l-2 py-1 pl-4",
              reminderDue ? "border-amber-400" : "border-primary/40",
            )}
          >
            <Bell
              className={cn(
                "mt-0.5 size-4 shrink-0 stroke-[1.5]",
                reminderDue ? "text-amber-700" : "text-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                {reminderDue ? "Reach out today" : "Reminder"}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {format(contact.reminder_at, "EEE, MMM d, yyyy")}
                {contact.reminder_note ? ` · ${contact.reminder_note}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg"
              onClick={() => void handleClearReminder()}
            >
              <Check className="size-4" />
              Done
            </Button>
          </div>
        )}

        {links.length > 0 && (
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <a
                key={link.href + link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-3 text-base font-medium text-foreground transition-colors hover:text-primary"
              >
                <link.icon className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                <span className="truncate">{link.label}</span>
              </a>
            ))}
          </div>
        )}

        {badgeUrl && (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Badge / LinkedIn capture
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgeUrl}
              alt="Conference badge"
              className="max-h-56 w-full rounded-lg bg-secondary object-contain p-2"
            />
          </section>
        )}

        {contact.meeting_context?.initial_context && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Meeting context
            </h3>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
              {contact.meeting_context.initial_context}
            </p>
          </section>
        )}

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
        <main className="mx-auto max-w-2xl px-5 py-12 text-center text-muted-foreground">
          Loading…
        </main>
      }
    >
      <ContactDetailInner />
    </Suspense>
  );
}
