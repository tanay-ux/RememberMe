"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExtraFieldId = "email" | "website" | "instagram" | "twitter";

const EXTRA_FIELDS: Record<
  ExtraFieldId,
  { label: string; placeholder: string; type: string }
> = {
  email: {
    label: "Email",
    placeholder: "Email",
    type: "email",
  },
  website: {
    label: "Website",
    placeholder: "Website",
    type: "url",
  },
  instagram: {
    label: "Instagram",
    placeholder: "Instagram",
    type: "text",
  },
  twitter: {
    label: "Twitter / X",
    placeholder: "Twitter / X",
    type: "text",
  },
};

interface SocialLinksFieldsProps {
  values: {
    phone?: string;
    email?: string;
    linkedin_url?: string;
    website?: string;
    instagram?: string;
    twitter?: string;
  };
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export function SocialLinksFields({
  values,
  onChange,
  errors,
}: SocialLinksFieldsProps) {
  const initiallyVisible = useMemo(() => {
    const extras: ExtraFieldId[] = [];
    (Object.keys(EXTRA_FIELDS) as ExtraFieldId[]).forEach((id) => {
      if (values[id]?.trim()) extras.push(id);
    });
    return extras;
    // Seed once from existing contact values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [visibleExtras, setVisibleExtras] =
    useState<ExtraFieldId[]>(initiallyVisible);
  const [pickerOpen, setPickerOpen] = useState(false);

  const availableToAdd = (Object.keys(EXTRA_FIELDS) as ExtraFieldId[]).filter(
    (id) => !visibleExtras.includes(id),
  );

  function addField(id: ExtraFieldId) {
    setVisibleExtras((prev) => [...prev, id]);
    setPickerOpen(false);
  }

  function removeField(id: ExtraFieldId) {
    setVisibleExtras((prev) => prev.filter((f) => f !== id));
    onChange(id, "");
  }

  return (
    <div className="space-y-7">
      <h3 className="text-base font-semibold tracking-tight text-foreground">
        How to reach them
      </h3>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn</Label>
          <Input
            id="linkedin_url"
            type="text"
            value={values.linkedin_url ?? ""}
            onChange={(e) => onChange("linkedin_url", e.target.value)}
            placeholder="LinkedIn URL"
            inputMode="url"
          />
          {errors?.linkedin_url && (
            <p className="text-sm text-destructive">{errors.linkedin_url}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={values.phone ?? ""}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="Phone"
          />
          {errors?.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        {visibleExtras.map((id) => {
          const field = EXTRA_FIELDS[id];
          return (
            <div key={id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={id}>{field.label}</Label>
                <button
                  type="button"
                  onClick={() => removeField(id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              <Input
                id={id}
                type={field.type}
                value={values[id] ?? ""}
                onChange={(e) => onChange(id, e.target.value)}
                placeholder={field.placeholder}
              />
              {errors?.[id] && (
                <p className="text-sm text-destructive">{errors[id]}</p>
              )}
            </div>
          );
        })}
      </div>

      {availableToAdd.length > 0 && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => setPickerOpen((o) => !o)}
          >
            <Plus className="size-4" />
            Add field
          </Button>
          {pickerOpen && (
            <div className="flex flex-wrap gap-2">
              {availableToAdd.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => addField(id)}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-brand-soft"
                >
                  {EXTRA_FIELDS[id].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
