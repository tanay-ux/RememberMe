"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ContactCard } from "@/components/contacts/contact-card";
import { ListControls } from "@/components/contacts/list-controls";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  countDueReminders,
  listContactsWithDetails,
} from "@/lib/db/contacts";
import { seedMockContactsIfNeeded } from "@/lib/db/seed";
import type {
  ContactWithDetails,
  ListFilter,
  SortOption,
} from "@/lib/db/schema";
import { consumeFlashToast } from "@/lib/ui/flash-toast";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const [sort, setSort] = useState<SortOption>("recent");
  const [seedTick, setSeedTick] = useState(0);
  const [flashToast, setFlashToast] = useState<string | null>(null);

  useEffect(() => {
    void seedMockContactsIfNeeded().then((n) => {
      if (n > 0) setSeedTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    const message = consumeFlashToast();
    if (!message) return;
    setFlashToast(message);
    const t = window.setTimeout(() => setFlashToast(null), 3200);
    return () => window.clearTimeout(t);
  }, []);

  const dueCount = useLiveQuery(() => countDueReminders(), [seedTick]) ?? 0;

  const contacts = useLiveQuery(
    async () => {
      return listContactsWithDetails({
        search: search || undefined,
        sort,
        filter,
      });
    },
    [search, filter, sort, seedTick],
  );

  const hasFilters = Boolean(search) || filter !== "all";

  return (
    <>
      <AppHeader large />
      <main className="mx-auto w-full max-w-2xl flex-1 overflow-x-hidden px-5 pb-[calc(7rem+var(--app-sab,0px))] pt-6">
        <div className="space-y-8">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people, notes, companies…"
              className="h-12 rounded-lg border-0 bg-secondary pl-10 text-base shadow-none focus-visible:ring-primary/25"
              autoComplete="off"
            />
          </div>

          {flashToast && (
            <div
              role="status"
              className="border-l-[3px] border-primary bg-brand-soft px-4 py-3.5 text-sm font-medium text-foreground"
            >
              {flashToast}
            </div>
          )}

          {dueCount > 0 && filter !== "reminders_due" && (
            <button
              type="button"
              onClick={() => setFilter("reminders_due")}
              className="w-full border-l-[3px] border-amber-700 bg-amber-50 px-4 py-3.5 text-left text-sm font-medium text-amber-950"
            >
              {dueCount} reminder{dueCount === 1 ? "" : "s"} due — tap to view
            </button>
          )}

          {contacts === undefined ? (
            <p className="py-20 text-center text-base text-muted-foreground">
              Loading…
            </p>
          ) : contacts.length === 0 ? (
            <div className="px-1 py-20 text-center">
              <p className="mx-auto mb-8 max-w-xs text-base text-muted-foreground leading-relaxed">
                {hasFilters
                  ? "Nothing matches. Try a different search or filter."
                  : "No contacts yet. Add someone you met — LinkedIn, a badge photo, and a quick note."}
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "h-11 rounded-lg px-5",
                  )}
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href="/contacts/new/"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-11 rounded-lg px-6",
                  )}
                >
                  Add your first contact
                </Link>
              )}
            </div>
          ) : (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-0.5 pb-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {contacts.length} contact{contacts.length === 1 ? "" : "s"}
                </p>
                <ListControls
                  sort={sort}
                  filter={filter}
                  dueCount={dueCount}
                  onSortChange={setSort}
                  onFilterChange={setFilter}
                />
              </div>

              <div>
                {contacts.map((contact: ContactWithDetails) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-5"
        style={{ paddingBottom: "max(1rem, var(--app-sab, 0px))" }}
      >
        <Link
          href="/contacts/new/"
          className={cn(
            buttonVariants({ size: "lg" }),
            "pointer-events-auto h-12 max-w-[min(100%,20rem)] gap-2 rounded-full px-6 text-base shadow-lg shadow-primary/30",
          )}
        >
          <Plus className="size-5 stroke-[2]" />
          Add contact
        </Link>
      </div>
    </>
  );
}
