import { z } from "zod";

export const contactFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    company: z.string().optional(),
    title: z.string().optional(),
    phone: z.string().optional(),
    email: z
      .string()
      .optional()
      .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), {
        message: "Invalid email",
      }),
    linkedin_url: z
      .string()
      .optional()
      .refine(
        (v) =>
          !v ||
          /linkedin\.com\/in\//i.test(v) ||
          /^https?:\/\//i.test(v) ||
          /^[\w-]+$/i.test(v.trim()),
        { message: "Enter a LinkedIn URL or profile slug" },
      ),
    website: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    willing_to_refer: z.enum(["yes", "maybe", "no", "unknown"]).optional(),
    reminder_at: z.string().optional(),
    reminder_note: z.string().optional(),
    event_name: z.string().optional(),
    location: z.string().optional(),
    date_met: z.string().optional(),
    initial_context: z.string().optional(),
    first_note: z.string().optional(),
    tag_names: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      const identifiers = [
        data.phone,
        data.email,
        data.linkedin_url,
        data.website,
        data.instagram,
        data.twitter,
        data.company,
      ];
      return identifiers.some((v) => v && v.trim().length > 0);
    },
    {
      message:
        "Add at least one of: phone, email, LinkedIn, website, Instagram, or company",
      path: ["linkedin_url"],
    },
  );

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const noteFormSchema = z.object({
  body: z.string().trim().min(1, "Note cannot be empty"),
  note_type: z.enum(["meeting", "follow_up", "general"]),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;
