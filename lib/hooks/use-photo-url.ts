"use client";

import { useEffect, useState } from "react";
import { getPhotoUrl } from "@/lib/db/contacts";

export function usePhotoUrl(photoId?: string) {
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;

    async function load() {
      if (!photoId) {
        if (active) setUrl(undefined);
        return;
      }
      const next = await getPhotoUrl(photoId);
      objectUrl = next;
      if (active) setUrl(next);
    }

    void load();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  return url;
}
