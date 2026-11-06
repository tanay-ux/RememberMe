import { createContact } from "./contacts";
import { db } from "./index";

const MOCK_SEED_FLAG = "rememberme_demo_contacts_v1";

/** Conference-style demo contacts for local testing (runs once per browser). */
export async function seedMockContactsIfNeeded(
  force = false,
): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (!force && localStorage.getItem(MOCK_SEED_FLAG) === "1") return 0;

  const mocks = [
    {
      name: "Priya Sharma",
      company: "Northwind Labs",
      title: "Head of Product",
      email: "priya@northwindlabs.io",
      phone: "+1 415 555 0142",
      linkedin_url: "https://www.linkedin.com/in/priyasharma",
      willing_to_refer: "yes" as const,
      reminder_at: Date.now() + 3 * 24 * 60 * 60 * 1000,
      reminder_note: "Send portfolio + ask about PM openings",
      initial_context:
        "Met at React Summit booth 42 — talked hiring and their Series A. Follow up with case study.",
      first_note:
        "Met at React Summit booth 42 — talked hiring and their Series A. Follow up with case study.",
      tag_names: ["React Summit 2026", "Hiring", "Warm intro"],
      event_name: "React Summit 2026",
      location: "Amsterdam, Booth 42",
      date_met: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    },
    {
      name: "Marcus Chen",
      company: "Lattice Robotics",
      title: "Staff Engineer",
      email: "marcus.chen@lattice.dev",
      linkedin_url: "https://www.linkedin.com/in/marcuschen",
      willing_to_refer: "maybe" as const,
      reminder_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      reminder_note: "Share the open-source demo repo",
      initial_context:
        "Badge scan at AI Expo. Interested in edge inference; asked about Capacitor + on-device ML.",
      first_note:
        "Badge scan at AI Expo. Interested in edge inference; asked about Capacitor + on-device ML.",
      tag_names: ["AI Expo", "Engineering"],
      event_name: "AI Expo",
      location: "SF Pier 27",
      date_met: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    },
    {
      name: "Sofia Alvarez",
      company: "Brightline Ventures",
      title: "Partner",
      email: "sofia@brightline.vc",
      phone: "+1 646 555 0198",
      linkedin_url: "https://www.linkedin.com/in/sofiaalvarez",
      website: "https://brightline.vc",
      willing_to_refer: "yes" as const,
      reminder_at: Date.now() - 24 * 60 * 60 * 1000,
      reminder_note: "Due: send one-pager before Thursday",
      initial_context:
        "Investor happy hour. Likes local-first tools; suggested intro to two portfolio founders.",
      first_note:
        "Investor happy hour. Likes local-first tools; suggested intro to two portfolio founders.",
      tag_names: ["Investor", "Local-first", "Warm intro"],
      event_name: "Founder Happy Hour",
      location: "SoHo House",
      date_met: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    },
    {
      name: "Jordan Blake",
      company: "Figma",
      title: "Design Systems Lead",
      linkedin_url: "https://www.linkedin.com/in/jordanblake",
      twitter: "@jordanblake",
      willing_to_refer: "unknown" as const,
      initial_context:
        "LinkedIn QR at Config. Chatted about component libraries and conference CRM UX.",
      first_note:
        "LinkedIn QR at Config. Chatted about component libraries and conference CRM UX.",
      tag_names: ["Config", "Design"],
      event_name: "Config",
      location: "Moscone Center",
      date_met: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    },
    {
      name: "Amina Okonkwo",
      company: "Stripe",
      title: "Recruiter, Early Career",
      email: "amina.okonkwo@stripe.com",
      phone: "+1 628 555 0177",
      linkedin_url: "https://www.linkedin.com/in/aminaokonkwo",
      willing_to_refer: "yes" as const,
      reminder_at: Date.now() + 14 * 24 * 60 * 60 * 1000,
      reminder_note: "Check in after next interview loop",
      initial_context:
        "Career fair booth. Collecting strong fullstack candidates for SF roles.",
      first_note:
        "Career fair booth. Collecting strong fullstack candidates for SF roles.",
      tag_names: ["Career Fair", "Recruiting"],
      event_name: "University Career Fair",
      location: "Stanford",
      date_met: new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    },
    {
      name: "Leo Nakamura",
      company: "Notion",
      title: "Product Manager",
      email: "leo@notion.so",
      linkedin_url: "https://www.linkedin.com/in/leonakamura",
      willing_to_refer: "no" as const,
      initial_context:
        "Quiet hallway chat — not hiring right now, but open to product feedback swap later.",
      first_note:
        "Quiet hallway chat — not hiring right now, but open to product feedback swap later.",
      tag_names: ["React Summit 2026", "Product"],
      event_name: "React Summit 2026",
      location: "Amsterdam",
      date_met: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    },
  ];

  // Skip names that already exist so re-runs / force don't duplicate forever
  const existingNames = new Set(
    (await db.contacts.toArray()).map((c) => c.name.toLowerCase()),
  );
  let created = 0;
  for (const mock of mocks) {
    if (existingNames.has(mock.name.toLowerCase())) continue;
    await createContact(mock);
    created += 1;
  }

  localStorage.setItem(MOCK_SEED_FLAG, "1");
  return created;
}
