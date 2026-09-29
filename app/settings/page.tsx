"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    if (
      !confirm(
        "Import will replace all existing contacts. Continue?",
      )
    ) {
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
      <main className="mx-auto max-w-2xl flex-1 px-4 py-6 space-y-6">
        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Storage</h2>
          {usage ? (
            <p className="text-sm text-muted-foreground">
              {usage.contacts} contact{usage.contacts !== 1 ? "s" : ""} ·{" "}
              {formatBytes(usage.bytes)} used (photos)
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          <p className="text-xs text-muted-foreground">
            Data is stored locally in your browser. Clearing browser data will
            delete your contacts unless you export a backup.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Backup</h2>
          <p className="text-sm text-muted-foreground">
            Export all contacts, photos, tags, and notes as a JSON file.
          </p>
          <Button onClick={() => void exportBackup()}>
            <Download className="size-4" />
            Export backup
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-medium">Restore</h2>
          <p className="text-sm text-muted-foreground">
            Import a previously exported backup file.
          </p>
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
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            Import backup
          </Button>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </Card>
      </main>
    </>
  );
}
