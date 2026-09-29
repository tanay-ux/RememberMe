import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const fields = [
    {
      id: "linkedin_url",
      label: "LinkedIn",
      placeholder: "linkedin.com/in/jane or paste URL",
      type: "text",
    },
    {
      id: "email",
      label: "Email",
      placeholder: "name@company.com",
      type: "email",
    },
    {
      id: "phone",
      label: "Phone",
      placeholder: "+1 555 123 4567",
      type: "tel",
    },
    {
      id: "website",
      label: "Website",
      placeholder: "https://example.com",
      type: "url",
    },
    {
      id: "instagram",
      label: "Instagram",
      placeholder: "@handle or URL",
      type: "text",
    },
    {
      id: "twitter",
      label: "Twitter / X",
      placeholder: "@handle or URL",
      type: "text",
    },
  ] as const;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">How to reach them</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              id={field.id}
              type={field.type}
              value={values[field.id] ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              inputMode={field.id === "linkedin_url" ? "url" : undefined}
            />
            {errors?.[field.id] && (
              <p className="text-sm text-destructive">{errors[field.id]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
