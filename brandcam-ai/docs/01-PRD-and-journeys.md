# BrandCam AI — Product Requirements & User Journeys

## Vision
A camera-first studio that lets a small-business owner (café, shop, salon, restaurant) produce consistent, professional ads in under a minute, with no editing skills. A persistent **Brand DNA** drives every filter, template, caption and export.

## Users
Owner-operators on mid-range Android and iPhone, German-speaking first, shooting one-handed in their shop.

## Principles
Camera first · three tabs only (Camera | Projects | Brand) · one primary action per screen · never fake a result (no export button unless a real file is produced) · never alter a real product's shape, packaging, logo or labels without explicit approval.

## Functional requirements (by phase)
| Area | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Onboarding → Brand DNA (name, type, logo, style, colours, typography) | ✅ | | AI colour suggestions | |
| Persistent, editable Brand DNA | ✅ local | | | cloud sync (Supabase) |
| Real camera: photo, video, flip, flash, exposure | ✅ | | | |
| Live GPU filters on the preview + brand presets | ✅ | | | |
| Filtered photo saved to device | ✅ | | | |
| Import from device | ✅ | | | |
| Projects library (photos, videos, drafts, exports) | ✅ local | reopen/edit | | cloud |
| "Create My Ad" flow (goal: product / offer / brand) | scaffold | templates, text, trim, transitions, 9:16 / 4:5 / 1:1 export | AI analysis & copy | |
| Filter baked into exported video | | ✅ (offline Skia render) | | |
| Music (licensed only) | | | ✅ | |
| Auth, subscriptions, privacy | | | | ✅ |

## Core journeys
1. **First launch:** language (German default) → business name & type → logo (optional) → style (Luxury/Modern/Warm/Minimal/Playful) → colours (suggested palette per style, editable) → typography → Brand DNA saved → Camera.
2. **Capture:** Camera opens → swipe filter strip (haptic ticks) → tap = photo / hold = video → project saved automatically as *draft*.
3. **Create My Ad:** after capture, single CTA "Anzeige erstellen" → pick goal → template + branded text → preview → edit headline/preset → export (real file) → save / share.
4. **Library:** Projects tab → grid of drafts and exports → open → continue editing / share.
5. **Edit brand:** Brand tab → change any Brand DNA field → future content updates automatically.

## Out of scope until approved
Public deployment, store publishing, paid AI calls, paid infrastructure, third-party music licences.
