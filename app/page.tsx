"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ContactCard } from "@/components/contacts/contact-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  countDueReminders,
  getDistinctEventNames,
  listContactsWithDetails,
  getAllTags,
} from "@/lib/db/contacts";
import type {
  ContactWithDetails,
  ListFilter,
  SortOption,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [tagId, setTagId] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [filter, setFilter] = useState<ListFilter>("all");

  const tags = useLiveQuery(() => getAllTags(), []) ?? [];
  const dueCount = useLiveQuery(() => countDueReminders(), []) ?? 0;
  const eventNames = useLiveQuery(() => getDistinctEventNames(), []) ?? [];

  const contacts = useLiveQuery(
    async () => {
      return listContactsWithDetails({
        search: search || undefined,
        tagId: tagId === "all" ? undefined : tagId,
        eventName: eventFilter || undefined,
        sort,
        filter,
      });
    },
    [search, tagId, eventFilter, sort, filter],
  );

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-4 pb-24">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, company, notes, email…"
              className="pl-9"
              autoComplete="off"
            />
          </div>

          {dueCount > 0 && filter !== "reminders_due" && (
            <button
              type="button"
              onClick={() => setFilter("reminders_due")}
              className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-sm text-amber-950"
            >
              {dueCount} reminder{dueCount === 1 ? "" : "s"} due — tap to view
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            <Select
              value={filter}
              onValueChange={(v) => v && setFilter(v as ListFilter)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contacts</SelectItem>
                <SelectItem value="reminders_due">Reminders due</SelectItem>
                <SelectItem value="willing_to_refer">Will refer</SelectItem>
                <SelectItem value="has_linkedin">Has LinkedIn</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sort}
              onValueChange={(v) => v && setSort(v as SortOption)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently added</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="reminder">Reminder date</SelectItem>
                <SelectItem value="alphabetical">A → Z</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tagId} onValueChange={(v) => v && setTagId(v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {eventNames.length > 0 && (
              <Select
                value={eventFilter || "all"}
                onValueChange={(v) => setEventFilter(v === "all" || !v ? "" : v)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {eventNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {contacts === undefined ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading contacts...
            </p>
          ) : contacts.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center px-4">
              <p className="text-muted-foreground mb-4">
                {search || tagId !== "all" || eventFilter || filter !== "all"
                  ? "No contacts match your search or filters."
                  : "No contacts yet. Capture someone you met — LinkedIn, badge photo, and a quick note."}
              </p>
              {search || filter !== "all" ? (
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "secondary" }))}
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                    setTagId("all");
                    setEventFilter("");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link href="/contacts/new/" className={cn(buttonVariants())}>
                  Add your first contact
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground px-0.5">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"}
              </p>
              {contacts.map((contact: ContactWithDetails) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <Link
          href="/contacts/new/"
          className={cn(
            buttonVariants({ size: "lg" }),
            "rounded-full shadow-lg h-14 px-5",
          )}
        >
          <Plus className="size-5" />
          Add contact
        </Link>
      </div>
    </>
  );
}
