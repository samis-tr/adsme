import { useVideoCompositionPlayer, type VideoComposition } from '@azzapp/react-native-skia-video';
import { Canvas, Group, Image, Picture, Skia, type SkImage } from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import { useDerivedValue, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { drawAd, type RenderSpec } from './render';

type Size = { width: number; height: number };

/** Photo ad: replays the entrance animation in a loop using the exact export drawing code. */
export function PhotoAdPreview({ spec, media, size }: { spec: RenderSpec; media: SkImage | null; size: Size }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withRepeat(withTiming(4, { duration: 4000, easing: Easing.linear }), -1, false);
  }, [t, spec]);

  const picture = useDerivedValue(() => {
    const rec = Skia.PictureRecorder();
    const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, spec.width, spec.height));
    drawAd(canvas, media, 0, t.value, spec);
    return rec.finishRecordingAsPicture();
  });

  const scale = size.width / spec.width;
  return (
    <Canvas style={size}>
      <Group transform={[{ scale }]}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
}

/** Video ad: decodes the trimmed clip and draws every frame through drawAd. */
export function VideoAdPreview({
  spec,
  composition,
  size,
  playing,
}: {
  spec: RenderSpec;
  composition: VideoComposition;
  size: Size;
  playing: boolean;
}) {
  const { currentFrame, player } = useVideoCompositionPlayer({
    composition,
    width: size.width,
    height: size.height,
    autoPlay: true,
    isLooping: true,
    drawFrame: ({ canvas, frames, currentTime, width, height }) => {
      'worklet';
      const f = frames.main;
      const img = f ? Skia.Image.MakeImageFromNativeTextureUnstable(f.texture, f.width, f.height) : null;
      canvas.save();
      canvas.scale(width / spec.width, height / spec.height);
      drawAd(canvas, img, f ? f.rotation : 0, currentTime, spec);
      canvas.restore();
    },
  });

  useEffect(() => {
    if (!player) return;
    if (playing) player.play();
    else player.pause();
  }, [player, playing]);

  return (
    <Canvas style={size}>
      <Image image={currentFrame} x={0} y={0} width={size.width} height={size.height} fit="fill" />
    </Canvas>
  );
}
