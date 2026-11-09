# Phase 2 — Ad Editor & Real Export

Phase 1 was verified on a physical Samsung device on 2026-11-04 (camera, live filters, video, saving: all passed).

## Export technology decision
| Option | Verdict |
|---|---|
| FFmpeg-kit | Retired upstream; no maintained RN package. Rejected. |
| Custom Expo module (Android Media3 Transformer + iOS AVFoundation) | Robust, but two native code bases to write and maintain. Kept as fallback. |
| **`@azzapp/react-native-skia-video` 0.10.1** | **Chosen.** Decodes clips to GPU textures, lets us draw every output frame with Skia, encodes H.264 + AAC MP4 (MediaCodec / AVAssetWriter). Supports trim (`startTime`/`duration`), original audio and extra audio tracks, progress and cancel. Library is marked *beta* by its authors → pinned exactly, verified on device before relying on it. Requires Android minSdk 28 (Android 9+). |

**Key property:** preview and export call the *same* `drawAd()` worklet with the same SkSL colour-grade shader used by the camera. What the user previews is what is written to the file.

## What the editor does (deterministic, no AI)
- Goal: *Neues Produkt / Sonderangebot / Markenauftritt* → template (layout, offer badge, centred brand layout).
- German copy suggestions per goal + business type (editable). AI copy is phase 3.
- Look: same 6 filters as the camera, applied on top of the original media (photos captured with a filter default to *Natürlich* to avoid double grading).
- Branding: logo (or business name), brand colours for accent bar / CTA / badge, brand typeface, branded outro card for videos.
- Format: 9:16 (1080×1920), 4:5 (1080×1350), 1:1 (1080×1080). On Android the encoder may lower the size if the device can't encode it; the result card shows the real dimensions.
- Cut: single trim range (1–60 s). Transitions: animated text entrance + cross-fade into the outro card.
- Sound: original audio on/off. **No music is bundled** until a properly licensed library is integrated.
- Export writes `documents/projects/<id>/exports/*.mp4|jpg`, verifies the file exists and is non-empty, records it on the project, then offers save-to-library and native share.
- Editor state is saved on the project, so ads can be reopened and edited.

## Not in phase 2
Multi-clip timelines, music library, AI analysis/auto-edit (phase 3), iOS build/test.
