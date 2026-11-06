"use client";

import Link from "next/link";
import { Bell, Building2 } from "lucide-react";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import type { ContactWithDetails } from "@/lib/db/schema";
import { format } from "date-fns";
import { contactDetailPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface ContactCardProps {
  contact: ContactWithDetails;
}

function isReminderDue(reminderAt?: number): boolean {
  if (!reminderAt) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return reminderAt <= end.getTime();
}

export function ContactCard({ contact }: ContactCardProps) {
  const subtitle =
    [contact.title, contact.company].filter(Boolean).join(" · ") ||
    contact.meeting_context?.event_name ||
    contact.email ||
    contact.phone;

  const due = isReminderDue(contact.reminder_at);
  const meta =
    contact.meeting_context?.event_name ||
    (contact.reminder_at
      ? due
        ? "Reminder due"
        : `Reach out ${format(contact.reminder_at, "MMM d")}`
      : null);

  return (
    <Link
      href={contactDetailPath(contact.id)}
      className={cn(
        "flex items-center gap-4 border-b border-border py-5 first:pt-2 last:border-b-0",
        "transition-colors active:bg-secondary/60",
      )}
    >
      <ContactAvatar
        name={contact.name}
        photoId={contact.photo_id}
        className="size-12 shrink-0 rounded-full"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-semibold tracking-tight text-foreground">
            {contact.name}
          </p>
          {due && (
            <Bell
              className="size-3.5 shrink-0 text-amber-700"
              aria-label="Reminder due"
            />
          )}
        </div>
        {subtitle && (
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            {contact.company ? (
              <Building2 className="size-3.5 shrink-0" />
            ) : null}
            {subtitle}
          </p>
        )}
        {meta && (
          <p className="truncate text-sm text-muted-foreground">{meta}</p>
        )}
      </div>
    </Link>
  );
}
