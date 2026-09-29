"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPhotoUrl } from "@/lib/db/contacts";
import { getInitials } from "@/lib/utils/format";

interface ContactAvatarProps {
  name: string;
  photoId?: string;
  className?: string;
}

export function ContactAvatar({ name, photoId, className }: ContactAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;

    void getPhotoUrl(photoId).then((url) => {
      objectUrl = url;
      if (active) setPhotoUrl(url);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  return (
    <Avatar className={className}>
      {photoUrl ? <AvatarImage src={photoUrl} alt={name} /> : null}
      <AvatarFallback className="bg-muted text-muted-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
