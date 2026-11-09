# Roadmap, AI Cost & Operational Risk

## Roadmap
**Phase 1 — Foundation (in progress):** shell, onboarding, Brand DNA, Skia live-filter camera, projects library, local saving. *Milestone: Android development build running on a device.*
**Phase 2 — Ad editor:** template engine (headline/CTA/logo layers), trim/cut, transitions, offline Skia render → MP4/JPEG in 9:16, 4:5, 1:1; filter baked into video.
**Phase 3 — AI:** `AiProvider` interface, job queue, analysis (scene/moment detection), German copy generation, failure recovery, cost ledger.
**Phase 4 — Commercial:** Supabase auth hardening + RLS review, RevenueCat entitlements, privacy (consent, delete-account/data export), tests, performance, EAS production builds.

## Getting an Android dev build on this Windows PC (needs your decision)
- **A. EAS cloud build** — no local toolchain; needs a free Expo account and `eas login`. Build is queued in Expo's cloud (free tier has a monthly quota). Install the APK on a phone.
- **B. Local build** — install JDK 17 + Android Studio (SDK, platform-tools); then `npx expo run:android` with a USB-debugging phone or emulator. ~10 GB download.
iOS: EAS cloud only (needs an Apple Developer account, $99/year).

## AI cost model (estimates — verify with live provider pricing before launch)
| Operation | Driver | Mitigation |
|---|---|---|
| Video analysis | frames/seconds sent to a vision model | sample ≤1 fps, downscale to 512 px, cap 30 s clip |
| Copy generation | few hundred tokens | cheap small model, cache by (brand, goal, product) |
| Transcription / captions | audio seconds | optional, quota-gated |
| Storage & egress | media GB | 30-day cleanup of drafts, compressed proxies |
Controls: per-plan monthly credits, hard per-job cap, daily org-wide spend alarm and kill switch, no client-side keys.

## Risks
| Risk | Impact | Response |
|---|---|---|
| Native build toolchain absent on dev PC | blocks all device testing | choose route A or B above |
| VisionCamera v5 / Skia plugin are young | API churn, device-specific bugs | pin versions, test on 2+ real devices early |
| Filtered video needs offline re-render | long exports on weak phones | 1080p cap, progress UI, background-safe job |
| AI altering real products | trust / legal | template-only compositing; any generative edit requires explicit user approval |
| Music licensing | legal | only royalty-free library with licence metadata; never user-ripped tracks |
| Store policy (camera/AI disclosure, account deletion) | rejection | privacy manifest, in-app delete, AI-content labelling |
| German GDPR | legal | EU Supabase region, consent screens, data export/delete |
