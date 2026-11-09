# BrandCam AI

Camera-first AI ad studio for small businesses. React Native 0.88 · Expo SDK 58 · Expo Router · VisionCamera v5 + Skia.

Docs: [`docs/`](docs) (PRD & journeys, architecture, design system, roadmap & AI risk).

## Status — Phase 1 (code complete, not yet run on a device)
| Feature | State |
|---|---|
| Onboarding → Brand DNA (name, type, logo, style, palette, typeface), persisted, editable in Brand tab | done |
| Three floating tabs: Kamera · Projekte · Marke | done |
| Live GPU filters (SkSL shader on every camera frame) incl. brand-colour split-tone | done, untested on device |
| Photo capture **with filter baked in** (Skia snapshot → JPEG) | done, untested on device |
| Video capture (hold shutter), stored **unfiltered**; filter recorded for phase-2 export | done, untested on device |
| Flip, torch, exposure steps, import from library | done, untested on device |
| Projects library + detail (play, save to library, share, delete) | done |
| German UI, English fallback, key-based i18n | done |
| "Anzeige erstellen" | placeholder — editor is phase 2 |

Verified on this machine: `npm run typecheck` ✔, `npm test` ✔ (5 tests), `npx expo-doctor` ✔ 20/20, `npx expo export --platform android` ✔ (JS bundle builds).

## Run it (needs a development build — Expo Go cannot load VisionCamera/Skia)
**Option A — EAS cloud build (no Android SDK needed):**
```bash
npm i -g eas-cli
eas login
eas build -p android --profile development
npx expo start --dev-client
```
**Option B — local:** install JDK 17 + Android Studio (SDK + platform-tools), enable USB debugging on a phone, then `npx expo run:android`.
