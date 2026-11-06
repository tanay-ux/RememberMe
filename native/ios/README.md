# iOS native setup (Mac + Xcode)

These files make RememberMe a real App Store iOS app with **Share Sheet → RememberMe**.

## Prerequisites

- Mac with Xcode 16+
- Apple Developer account ($99/year) for device/TestFlight/App Store
- Node 20+

## 1. Build web assets & add iOS platform

```bash
npm install
npm run build:ios
npx cap add ios          # first time only
npx cap sync ios
npx cap open ios
```

`build:ios` runs `next build` (static export → `out/`) then `cap sync`.

## 2. URL scheme + privacy strings

Merge keys from [`Info.plist.snippets.xml`](./Info.plist.snippets.xml) into  
`ios/App/App/Info.plist`:

- `rememberme://` URL scheme
- Camera / Photo Library usage descriptions

## 3. Add Share Extension target

In Xcode:

1. **File → New → Target → Share Extension**
2. Product Name: `RememberMeShare`
3. Bundle ID: `com.rememberme.app.ShareExtension`
4. Language: Swift · Embed in application: App
5. Delete the generated storyboard-based VC if present
6. Replace with sources from [`ShareExtension/`](./ShareExtension/):
   - `ShareViewController.swift`
   - `Info.plist` (extension)
   - `RememberMeShare.entitlements`
7. Set the extension’s **Principal class** via Info.plist (`ShareViewController`)
8. Enable **App Groups** for **both** App and Share Extension:
   - `group.com.rememberme.app`
9. Cold-start handoff (recommended): add [`App/PendingShareHandoff.swift`](./App/PendingShareHandoff.swift) to the **App** target and call `PendingShareHandoff.openIfNeeded()` from `applicationDidBecomeActive` (see [`App/AppDelegate+Share.snippet.swift`](./App/AppDelegate+Share.snippet.swift)). This clears `pendingShareURL` written by the Share Extension when `appUrlOpen` is missed.

## 4. Signing

- Team: your Apple Developer team
- App bundle: `com.rememberme.app`
- Extension: `com.rememberme.app.ShareExtension`

## 5. Test Share Sheet

1. Run the **App** scheme on a device (Share Extension needs a real device for LinkedIn)
2. In Safari/LinkedIn, open a profile → **Share** → **RememberMe**
3. App should open **Add contact** with LinkedIn prefilled (name/photo when the profile is public)

Deep link format:

```text
rememberme://add?linkedin=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fjane-doe
```

**Android** (already wired in-repo): Share any LinkedIn profile text/URL → RememberMe appears in the share sheet → same Add Contact autofill.

## 6. App Store checklist

- [ ] App icon 1024×1024 (no alpha) in Assets.xcassets
- [ ] Screenshots for 6.7" and 6.1" iPhones
- [ ] Privacy Nutrition Labels (data is on-device; no tracking)
- [ ] Privacy policy URL (required if you later add accounts/analytics)
- [ ] Archive → Distribute → App Store Connect
- [ ] TestFlight internal test before public submit

## Notes

- Contacts live in **IndexedDB inside the app WebView** (on-device). Clearing the app deletes data unless the user exports a backup in Settings.
- OCR for badges runs on-device via Tesseract (first run may download language data).
