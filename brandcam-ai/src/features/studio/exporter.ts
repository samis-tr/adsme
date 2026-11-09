import { exportVideoComposition, getValidEncoderConfigurations, type VideoComposition } from '@azzapp/react-native-skia-video';
import { ImageFormat, Skia, type SkImage } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { ASPECTS, compositionDuration } from '../../lib/adSpec';
import type { AdDraft, BrandDNA, ExportRecord, Project } from '../../lib/types';
import { buildRenderSpec, drawAd, loadLogo } from './render';

export const toPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));
const toUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`);

export function buildComposition(project: Project, draft: AdDraft): VideoComposition {
  const clip = draft.trimEnd - draft.trimStart;
  return {
    duration: compositionDuration(draft),
    items: [
      {
        id: 'main',
        path: toPath(project.mediaUri),
        compositionStartTime: 0,
        startTime: draft.trimStart,
        duration: clip,
        audio: draft.originalAudio ? { volume: 1 } : false,
      },
    ],
  };
}

/** Decode a photo with EXIF orientation applied, so Skia gets upright pixels. */
export async function loadUprightImage(uri: string): Promise<SkImage | null> {
  const upright = await manipulateAsync(uri, [], { compress: 1, format: SaveFormat.JPEG });
  const data = await Skia.Data.fromURI(upright.uri);
  return Skia.Image.MakeImageFromEncoded(data);
}

function exportDir(projectId: string) {
  const dir = new Directory(Paths.document, 'projects', projectId, 'exports');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export async function exportImage(project: Project, draft: AdDraft, brand: BrandDNA): Promise<ExportRecord> {
  const { width, height } = ASPECTS[draft.aspect];
  const [media, logo] = await Promise.all([loadUprightImage(project.mediaUri), loadLogo(brand.logoUri)]);
  if (!media) throw new Error('Could not decode photo');
  const spec = buildRenderSpec({ draft, brand, width, height, logo, clipDuration: 0, animated: false });
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Could not create offscreen surface');
  drawAd(surface.getCanvas(), media, 0, 0, spec);
  surface.flush();
  const image = surface.makeImageSnapshot().makeNonTextureImage();
  if (!image) throw new Error('Could not read rendered image');
  const bytes = image.encodeToBytes(ImageFormat.JPEG, 94);
  const file = new File(exportDir(project.id), `ad-${draft.aspect.replace(':', 'x')}-${Date.now()}.jpg`);
  file.create();
  file.write(bytes);
  if (!file.exists || file.size === 0) throw new Error('Export produced no file');
  return { uri: file.uri, kind: 'image', aspect: draft.aspect, width, height, sizeBytes: file.size, createdAt: Date.now() };
}

export async function exportVideo(
  project: Project,
  draft: AdDraft,
  brand: BrandDNA,
  onProgress: (p: number) => void,
  signal: AbortSignal,
): Promise<ExportRecord> {
  let { width, height } = ASPECTS[draft.aspect];
  let frameRate = 30;
  let bitRate = 8_000_000;
  let encoderName: string | null = null;
  if (Platform.OS === 'android') {
    // Some devices can't encode every size; take the closest supported configuration.
    const configs = getValidEncoderConfigurations(width, height, frameRate, bitRate);
    const c = configs?.[0];
    if (c) {
      width = c.width;
      height = c.height;
      frameRate = c.frameRate;
      bitRate = c.bitRate;
      encoderName = c.encoderName;
    }
  }
  const logo = await loadLogo(brand.logoUri);
  const clip = draft.trimEnd - draft.trimStart;
  const spec = buildRenderSpec({ draft, brand, width, height, logo, clipDuration: clip, animated: true });
  const file = new File(exportDir(project.id), `ad-${draft.aspect.replace(':', 'x')}-${Date.now()}.mp4`);
  const composition = buildComposition(project, draft);

  await exportVideoComposition({
    videoComposition: composition,
    outPath: toPath(file.uri),
    width,
    height,
    frameRate,
    bitRate,
    encoderName,
    abortSignal: signal,
    onProgress: ({ framesCompleted, nbFrames }) => onProgress(nbFrames > 0 ? framesCompleted / nbFrames : 0),
    drawFrame: ({ canvas, frames, currentTime }) => {
      'worklet';
      const f = frames.main;
      const img = f ? Skia.Image.MakeImageFromNativeTextureUnstable(f.texture, f.width, f.height) : null;
      drawAd(canvas, img, f ? f.rotation : 0, currentTime, spec);
    },
  });

  const out = new File(toUri(toPath(file.uri)));
  if (!out.exists || out.size === 0) throw new Error('Export produced no playable file');
  return {
    uri: out.uri,
    kind: 'video',
    aspect: draft.aspect,
    width,
    height,
    durationSec: compositionDuration(draft),
    sizeBytes: out.size,
    createdAt: Date.now(),
  };
}
