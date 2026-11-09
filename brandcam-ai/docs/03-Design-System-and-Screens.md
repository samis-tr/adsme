# Design System & Screen Architecture

## Look
Dark, cinematic, restrained. Near-black surfaces, one refined violet accent, glass only where it floats over the camera. Large calm typography, generous spacing, no icons-for-icons'-sake.

## Tokens (`src/ui/theme.ts`)
- Surfaces: `bg #0A0A0F`, `surface #14141C`, `surfaceHigh #1D1D28`, `hairline rgba(255,255,255,.08)`
- Accent: `violet #8B5CF6` (pressed `#7C4DEB`), soft glow `rgba(139,92,246,.35)`
- Text: `#F5F5FA`, secondary `#A3A3B8`, tertiary `#6B6B80`; danger `#FF5C7A`
- Radius 10/16/24/pill · spacing 4-pt scale · type scale display 34 / title 24 / headline 17 / body 15 / caption 12 (tight tracking on display)
- Motion: spring (damping 18, stiffness 220) for sheets; 120 ms for presses; haptics: selection on snap, light on tap, success on save.

## Components
`Text`, `Button` (primary/ghost/glass), `Chip`, `GlassPanel` (BlurView), `Screen`, `StepHeader`, `ColorSwatch`, `FilterStrip`, `ShutterButton`, `FloatingTabBar`.

## Navigation (three tabs, floating glass pill)
`Camera` (default, full-bleed) · `Projects` · `Brand`. Tab bar hides while recording.

## Screens
| Route | Purpose |
|---|---|
| `/onboarding` | 5-step Brand DNA wizard (name+type → logo → style → colours → typography) with animated progress |
| `/(tabs)/camera` | Live Skia viewfinder, filter strip, shutter, flash/flip/exposure, import |
| `/(tabs)/projects` | Grid of drafts & exports; empty state |
| `/(tabs)/brand` | View/edit Brand DNA |
| `/project/[id]` | Preview of a capture, "Create My Ad" CTA (Phase 2 editor), share/save |

## Anti-patterns avoided
No dashboards, no stock gradients on everything, no emoji as icons, no more than one primary action per screen.
