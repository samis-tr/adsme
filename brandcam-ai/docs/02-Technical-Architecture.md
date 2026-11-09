# Technical Architecture

## Camera / filter decision (verified against installed package source, Nov 2026)
| Option | Verdict |
|---|---|
| `expo-camera` | Works in Expo Go, **cannot** process frames → no real live filters. Rejected for the product (fine for prototypes). |
| `react-native-vision-camera` **v5** (Nitro) + `react-native-vision-camera-skia` + `@shopify/react-native-skia` | **Chosen.** `SkiaCamera` receives each camera frame as a GPU texture; we draw it through an SkSL `RuntimeEffect` shader → true real-time filters. Needs a development build (native modules), New Architecture. |
| Custom native GPU pipeline (Metal / OpenGL) | Not needed; Skia already gives GPU access. |

Consequences, stated honestly:
- **Photos:** `SkiaCamera.takeSnapshot()` returns the *already filtered* frame → encoded to JPEG. Resolution is the Skia frame size, not full sensor resolution (acceptable for social ads; revisit for print).
- **Video (Phase 1):** the native `Recorder` records the **unfiltered** camera stream. The chosen filter is stored with the project. Phase 2 bakes filter + branding into the export by re-rendering frames offline. Until then the UI never claims the video is filtered.
- Not testable in Expo Go. Requires an Android/iOS development build.

## Stack
React Native 0.88 · Expo SDK 58 · TypeScript (strict) · Expo Router (typed routes) · Reanimated 4 + Worklets · Gesture Handler · expo-haptics · expo-blur · expo-localization · expo-file-system (new `File`/`Directory` API) · expo-media-library · expo-sharing · AsyncStorage · Supabase JS (+ `expo-secure-store` for session).

## Layers
```
src/
  app/            Expo Router screens (thin)
  features/       camera, onboarding, brand, projects, studio  (domain logic + screen components)
  ui/             design system: tokens, Text, Button, GlassCard, Chip, Sheet, Icon …
  lib/            i18n, storage, supabase client, filters (SkSL), haptics
```
- **State:** React context providers (Brand, Projects) persisted locally first (offline-first); Supabase sync is a repository behind an interface so local and cloud are swappable.
- **Media storage:** files copied into `documentDirectory/projects/<id>/`, metadata in a JSON index. Cloud: Supabase Storage private bucket with RLS (Phase 4).
- **i18n:** key-based dictionaries (`de` default, `en`), `t()` + hook; adding a language = adding one file.

## Backend (Phases 3–4, nothing deployed without approval)
- Supabase: Auth, `brand_profiles`, `projects`, `ad_jobs` tables with RLS (`supabase/schema.sql` drafted later).
- **AI never called from the client.** App → Supabase Edge Function (auth + quota check) → queue (`ad_jobs`) → worker → provider adapter (`AiProvider` interface: analyse, write copy, suggest cuts) → result row. Secrets live only in server env.
- Cost controls: per-user monthly credit ledger, per-job cost cap, idempotency keys, retry with backoff, kill switch.
- Subscriptions: RevenueCat (wraps StoreKit/Play Billing) → entitlement checked server-side. Requires your accounts; not started.

## Build & environment (Windows)
Machine inspected: Node 24, npm 11, git present. **Missing: JDK, Android SDK, adb.** Two supported routes — see roadmap. iOS builds only via EAS cloud (no Mac).
