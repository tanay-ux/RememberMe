# RememberMe

Personal CRM for people you meet at conferences. Capture a face photo, LinkedIn link, conference badge (with on-device OCR), notes, referral intent, and follow-up reminders — all stored **on device**.

Built as a Next.js app wrapped with **Capacitor** for native **Android / iOS**, including **Share Sheet → RememberMe**.

**Architecture & LinkedIn name/photo extraction:** see [`NOTES.md`](NOTES.md).

## Features

- Add contacts with LinkedIn, email, phone, company, title
- Face photo + conference badge photo
- Extract name / company / email from a badge (on-device OCR)
- Tags, meeting context, searchable notes
- “Willing to refer?” + remind-me-to-reach-out
- **iOS Share Extension**: share a LinkedIn profile into the app to start a new contact
- Local backup export/import (Settings)
- No login required (v1)

## Quick start (web)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## iOS (App Store path)

Requires a **Mac with Xcode**. Full steps:

→ [`native/ios/README.md`](native/ios/README.md)

Short version:

```bash
npm install
npm run build:ios    # next static export → out/ + cap sync
npx cap add ios      # first time only
npx cap open ios
```

Then add the Share Extension + URL scheme from `native/ios/`.

### Share flow

1. In LinkedIn or Safari, open a profile  
2. Tap **Share** → **RememberMe**  
3. App opens **Add contact** with LinkedIn prefilled  

Deep link: `rememberme://add?linkedin=https://www.linkedin.com/in/...`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local web development |
| `npm run build` | Static export to `out/` |
| `npm run build:ios` | Export + `cap sync ios` |
| `npm run ios` | Build, sync, open Xcode |
| `npm run lint` | ESLint |

## Project layout

```
app/                 Next.js App Router (static export)
components/          UI (contacts, tags, providers)
lib/                 Dexie DB, OCR, validation, routes
native/ios/          Share Extension + Info.plist snippets
exports/ui/          Design reference screenshots
capacitor.config.ts  Capacitor app id: com.rememberme.app
```

## Privacy

- Contact data stays on the device (IndexedDB / app storage)
- Camera and Photos access are used only for contact/badge photos
- No analytics or accounts in v1

## License

Private — all rights reserved unless you add a license file.
