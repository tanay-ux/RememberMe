"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import {
  CaptureFirstScreen,
  type CaptureFirstResult,
} from "@/components/contacts/capture-first-screen";
import { ContactForm } from "@/components/contacts/contact-form";
import {
  extractLinkedInFromText,
  extractProfileHintsFromShareText,
} from "@/lib/routes";

function NewContactInner() {
  const searchParams = useSearchParams();

  const draft = useMemo(() => {
    const linkedinRaw =
      searchParams.get("linkedin") ||
      searchParams.get("url") ||
      searchParams.get("text") ||
      "";
    const hints = extractProfileHintsFromShareText(
      searchParams.get("text") || linkedinRaw,
    );
    const linkedin =
      extractLinkedInFromText(linkedinRaw) ||
      hints.linkedin ||
      (linkedinRaw.includes("linkedin.com") ? linkedinRaw : undefined);

    return {
      name: searchParams.get("name") || hints.name || undefined,
      title: searchParams.get("title") || hints.title || undefined,
      email: searchParams.get("email") || undefined,
      company: searchParams.get("company") || undefined,
      linkedin_url: linkedin,
    };
  }, [searchParams]);

  const sharedBanner = Boolean(
    draft.linkedin_url || draft.name || draft.email || draft.company,
  );

  // Shared LinkedIn / deep-link drafts skip straight to the form
  const [step, setStep] = useState<"capture" | "form">(
    sharedBanner ? "form" : "capture",
  );
  const [captureSeed, setCaptureSeed] = useState<CaptureFirstResult | null>(
    null,
  );

  // If a share arrives while this page is already open, jump to the form
  useEffect(() => {
    if (sharedBanner) setStep("form");
  }, [sharedBanner]);

  function handleCaptured(result: CaptureFirstResult) {
    setCaptureSeed(result);
    setStep("form");
  }

  if (step === "capture") {
    return (
      <>
        <AppHeader title="Add contact" backHref="/" />
        <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden">
          <CaptureFirstScreen
            onCaptured={handleCaptured}
            onSkip={() => setStep("form")}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Add contact" backHref="/" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col space-y-8 overflow-x-hidden px-5 pb-6 pt-4">
        {sharedBanner && (
          <div className="border-l-[3px] border-primary bg-brand-soft px-4 py-3.5 text-sm font-medium text-foreground leading-relaxed">
            Shared into RememberMe — review details, add a note, then save.
          </div>
        )}
        <ContactForm
          key={draft.linkedin_url || draft.name || "manual"}
          draft={draft}
          captureSeed={
            captureSeed
              ? {
                  badgeBlob: captureSeed.badgeBlob,
                  badgePreviewUrl: captureSeed.badgePreviewUrl,
                  photoBlob: captureSeed.photoBlob,
                  photoPreviewUrl: captureSeed.photoPreviewUrl,
                  extracted: captureSeed.extracted,
                  linkedinUrl: captureSeed.linkedinUrl,
                  statusMessage: captureSeed.statusMessage,
                }
              : undefined
          }
        />
      </main>
    </>
  );
}

export default function NewContactPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-5 py-12 text-center text-muted-foreground">
          Loading…
        </main>
      }
    >
      <NewContactInner />
    </Suspense>
  );
}
