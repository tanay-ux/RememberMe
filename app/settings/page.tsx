"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { exportBackup, importBackup } from "@/lib/db/export";
import { getStorageUsage } from "@/lib/db/contacts";
import { formatBytes } from "@/lib/utils/format";

export default function SettingsPage() {
  const [usage, setUsage] = useState<{ bytes: number; contacts: number } | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getStorageUsage().then(setUsage);
  }, []);

  async function handleImport(file: File) {
    if (!confirm("Import will replace all existing contacts. Continue?")) {
      return;
    }

    setImporting(true);
    setMessage(null);
    try {
      await importBackup(file);
      setMessage("Backup imported successfully.");
      void getStorageUsage().then(setUsage);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <AppHeader title="Settings" backHref="/" />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-12 overflow-x-hidden px-5 pb-[calc(3rem+var(--app-sab,0px))] pt-4">
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Storage
          </h2>
          {usage ? (
            <p className="text-sm text-muted-foreground">
              {usage.contacts} contact{usage.contacts !== 1 ? "s" : ""} ·{" "}
              {formatBytes(usage.bytes)} in photos
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            Data stays on this device. Clearing browser or app data deletes
            contacts unless you export a backup.
          </p>
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Backup</h2>
            <p className="text-sm text-muted-foreground">
              Download contacts, photos, tags, and notes as JSON.
            </p>
          </div>
          <Button
            onClick={() => void exportBackup()}
            className="h-10 rounded-lg px-4"
          >
            <Download className="size-4" />
            Export backup
          </Button>
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">Restore</h2>
            <p className="text-sm text-muted-foreground">
              Import a previously exported backup file.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            disabled={importing}
            className="h-10 rounded-lg px-4"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            Import backup
          </Button>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </section>
      </main>
    </>
  );
}
