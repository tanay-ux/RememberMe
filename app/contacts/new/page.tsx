"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ContactForm } from "@/components/contacts/contact-form";
import { extractLinkedInFromText } from "@/lib/routes";

function NewContactInner() {
  const searchParams = useSearchParams();

  const draft = useMemo(() => {
    const linkedinRaw =
      searchParams.get("linkedin") ||
      searchParams.get("url") ||
      searchParams.get("text") ||
      "";
    const linkedin =
      extractLinkedInFromText(linkedinRaw) ||
      (linkedinRaw.includes("linkedin.com") ? linkedinRaw : linkedinRaw || undefined);

    return {
      name: searchParams.get("name") || undefined,
      email: searchParams.get("email") || undefined,
      company: searchParams.get("company") || undefined,
      linkedin_url: linkedin,
    };
  }, [searchParams]);

  const sharedBanner = Boolean(
    draft.linkedin_url || draft.name || draft.email || draft.company,
  );

  return (
    <>
      <AppHeader title="Add contact" backHref="/" />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-6 space-y-4">
        {sharedBanner && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm text-teal-950">
            Shared into RememberMe — review details, add a note, then save.
          </div>
        )}
        <ContactForm draft={draft} />
      </main>
    </>
  );
}

export default function NewContactPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-8 text-center text-muted-foreground">
          Loading...
        </main>
      }
    >
      <NewContactInner />
    </Suspense>
  );
}
