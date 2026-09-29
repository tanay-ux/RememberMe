"use client";

import Link from "next/link";
import { Bell, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import type { ContactWithDetails } from "@/lib/db/schema";
import { format } from "date-fns";

import { contactDetailPath } from "@/lib/routes";

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
    contact.tags[0]?.name ||
    contact.linkedin_url ||
    contact.email ||
    contact.phone;

  const due = isReminderDue(contact.reminder_at);

  return (
    <Link href={contactDetailPath(contact.id)}>
      <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50">
        <ContactAvatar
          name={contact.name}
          photoId={contact.photo_id}
          className="size-12 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{contact.name}</p>
            {due && (
              <Bell className="size-3.5 shrink-0 text-amber-600" aria-label="Reminder due" />
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
              {contact.company && !contact.title ? (
                <Building2 className="size-3.5 shrink-0" />
              ) : null}
              {subtitle}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {contact.willing_to_refer === "yes" && (
              <Badge variant="secondary" className="text-xs text-teal-700 bg-teal-50">
                Refers
              </Badge>
            )}
            {contact.reminder_at && (
              <Badge
                variant="secondary"
                className={`text-xs ${due ? "text-amber-800 bg-amber-50" : ""}`}
              >
                {due ? "Due" : format(contact.reminder_at, "MMM d")}
              </Badge>
            )}
            {contact.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs"
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
      </Card>
    </Link>
  );
}
