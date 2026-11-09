import { Ionicons } from '@expo/vector-icons';
import { FilterMode, ImageFormat, MipmapMode, Skia, TileMode } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { router, useIsFocused, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CommonResolutions,
  useCameraPermission,
  useMicrophonePermission,
  useVideoOutput,
  type Recorder,
  type TargetVideoPixelFormat,
} from 'react-native-vision-camera';
import { SkiaCamera, type SkiaCameraRef } from 'react-native-vision-camera-skia';
import { useBrand } from '../../features/brand/BrandProvider';
import { FilterStrip } from '../../features/camera/FilterStrip';
import { ShutterButton } from '../../features/camera/ShutterButton';
import { useProjects } from '../../features/projects/ProjectsProvider';
import { buildUniforms, colorGradeEffect } from '../../lib/filters';
import { useT } from '../../lib/i18n';
import type { FilterId } from '../../lib/types';
import { Button, GlassPanel, Tap, Text } from '../../ui/primitives';
import { colors, radius } from '../../ui/theme';

const EXPOSURE_STEPS = [0, 0.5, 1, -1, -0.5];

function RoundButton({ icon, onPress, active, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; active?: boolean; label: string }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label}>
      <GlassPanel style={[styles.round, active && { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={21} color="#fff" />
      </GlassPanel>
    </Tap>
  );
}

export default function CameraScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const { brand } = useBrand();
  const { add } = useProjects();

  const cam = useCameraPermission();
  const mic = useMicrophonePermission();

  const cameraRef = useRef<SkiaCameraRef>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const stopRequested = useRef(false);

  const [position, setPosition] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [exposureIdx, setExposureIdx] = useState(0);
  const [filter, setFilter] = useState<FilterId>(brand?.defaultFilter ?? 'brand');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  // SkiaCamera defaults to GPU-only PRIVATE frames on Android. Some devices reject
  // PRIVATE for ImageAnalysis at the negotiated size; fall back to YUV once.
  const [pixelFormat, setPixelFormat] = useState<TargetVideoPixelFormat>('native');
  const onCameraError = useCallback(
    (error: Error) => {
      if (pixelFormat === 'native' && /PRIVATE format/i.test(error.message)) {
        console.warn('[camera] PRIVATE frames unsupported on this device, falling back to YUV');
        setPixelFormat('yuv');
        return;
      }
      // CameraX cancels torch/exposure updates sent while the session is (re)binding.
      // Expected during the YUV fallback; not a user-facing failure.
      if (/Camera is not active/i.test(error.message)) return;
      console.error('[camera]', error);
    },
    [pixelFormat],
  );

  const videoOutput = useVideoOutput({
    targetResolution: CommonResolutions.HD_16_9,
    enableAudio: true,
  });

  // Uniforms live in a shared value so filter changes reach the GPU worklet without re-mounting the camera.
  const primary = brand?.palette[0] ?? '#8B5CF6';
  const uniforms = useSharedValue<number[]>(buildUniforms(filter, primary));
  const isNatural = useSharedValue(filter === 'natural');
  useEffect(() => {
    uniforms.value = buildUniforms(filter, primary);
    isNatural.value = filter === 'natural';
  }, [filter, primary, uniforms, isNatural]);

  // Hide the tab bar while recording; ask for the camera on first focus.
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: recording ? 'none' : 'flex' } });
  }, [recording, navigation]);

  useEffect(() => {
    if (!recording) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const toProject = useCallback(
    async (args: Parameters<typeof add>[0]) => {
      const p = await add(args);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push({ pathname: '/project/[id]', params: { id: p.id } });
    },
    [add],
  );

  const takePhoto = useCallback(async () => {
    if (busy || recording) return;
    setBusy(true);
    try {
      const snap = cameraRef.current?.takeSnapshot();
      if (!snap) throw new Error('No frame rendered yet');
      const bytes = snap.encodeToBytes(ImageFormat.JPEG, 92);
      snap.dispose();
      const tmp = new File(Paths.cache, `shot-${Date.now()}.jpg`);
      tmp.create();
      tmp.write(bytes);
      await toProject({ kind: 'photo', sourceUri: tmp.uri, filterId: filter, filterBaked: true, move: true });
    } catch {
      Alert.alert(t('cam.saveFailed'));
    } finally {
      setBusy(false);
    }
  }, [busy, recording, filter, toProject, t]);

  const startVideo = useCallback(async () => {
    if (recording || busy) return;
    if (!mic.hasPermission && !(await mic.requestPermission())) {
      Alert.alert(t('cam.permission.title'), t('cam.permission.body'));
      return;
    }
    stopRequested.current = false;
    try {
      const recorder = await videoOutput.createRecorder({});
      recorderRef.current = recorder;
      setRecording(true);
      await recorder.startRecording(
        (filePath) => {
          setRecording(false);
          recorderRef.current = null;
          const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
          toProject({
            kind: 'video',
            sourceUri: uri,
            filterId: filter,
            filterBaked: false, // video is stored unfiltered; filter is baked on export (phase 2)
            durationSec: recorder.recordedDuration,
            move: true,
          }).catch(() => Alert.alert(t('cam.saveFailed')));
        },
        () => {
          setRecording(false);
          recorderRef.current = null;
          Alert.alert(t('cam.saveFailed'));
        },
      );
      if (stopRequested.current) await recorder.stopRecording();
    } catch {
      setRecording(false);
      recorderRef.current = null;
      Alert.alert(t('cam.saveFailed'));
    }
  }, [recording, busy, mic, videoOutput, filter, toProject, t]);

  const stopVideo = useCallback(async () => {
    stopRequested.current = true;
    try {
      await recorderRef.current?.stopRecording();
    } catch {}
  }, []);

  const importMedia = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 1 });
    if (res.canceled) return;
    const a = res.assets[0];
    try {
      await toProject({
        kind: a.type === 'video' ? 'video' : 'photo',
        sourceUri: a.uri,
        filterId: 'natural',
        filterBaked: false,
        durationSec: a.duration ? a.duration / 1000 : undefined,
      });
    } catch {
      Alert.alert(t('cam.saveFailed'));
    }
  }, [toProject, t]);

  if (!cam.hasPermission) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={44} color={colors.accent} />
        <Text variant="title" style={{ textAlign: 'center' }}>{t('cam.permission.title')}</Text>
        <Text muted style={{ textAlign: 'center', maxWidth: 300 }}>{t('cam.permission.body')}</Text>
        {cam.canRequestPermission ? (
          <Button label={t('cam.permission.cta')} onPress={() => cam.requestPermission()} />
        ) : (
          <Button label={t('cam.permission.settings')} onPress={() => Linking.openSettings()} />
        )}
      </View>
    );
  }

  const ev = EXPOSURE_STEPS[exposureIdx];

  return (
    <View style={styles.fill}>
      <SkiaCamera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={position}
        isActive={focused}
        outputs={[videoOutput]}
        pixelFormat={pixelFormat}
        onError={onCameraError}
        torchMode={torch && position === 'back' ? 'on' : 'off'}
        exposure={ev}
        onFrame={(frame, render) => {
          'worklet';
          render(({ canvas, frameTexture }) => {
            if (isNatural.value || colorGradeEffect == null) {
              canvas.drawImage(frameTexture, 0, 0);
              return;
            }
            const w = frameTexture.width();
            const h = frameTexture.height();
            const u = uniforms.value.slice();
            u[6] = w;
            u[7] = h;
            const image = frameTexture.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
            const shader = colorGradeEffect.makeShaderWithChildren(u, [image]);
            const paint = Skia.Paint();
            paint.setShader(shader);
            canvas.drawRect(Skia.XYWHRect(0, 0, w, h), paint);
          });
          frame.dispose();
        }}
      />

      {/* Brand watermark: preview only in phase 1, baked into exports in phase 2. */}
      {brand && !recording && (
        <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="none" style={[styles.brandTag, { top: insets.top + 18 }]}>
          <View style={[styles.brandDot, { backgroundColor: brand.palette[0] }]} />
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }} numberOfLines={1}>
            {brand.businessName}
          </Text>
        </Animated.View>
      )}

      {recording && (
        <View style={[styles.recBadge, { top: insets.top + 14 }]}>
          <View style={styles.recDot} />
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
            {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
          </Text>
        </View>
      )}

      {/* Right-side controls */}
      {!recording && (
        <View style={[styles.side, { top: insets.top + 12 }]}>
          <RoundButton icon="camera-reverse-outline" label="Flip" onPress={() => setPosition((p) => (p === 'back' ? 'front' : 'back'))} />
          {position === 'back' && (
            <RoundButton icon={torch ? 'flash' : 'flash-off-outline'} label="Flash" active={torch} onPress={() => setTorch((v) => !v)} />
          )}
          <RoundButton icon="sunny-outline" label="Exposure" active={ev !== 0} onPress={() => setExposureIdx((i) => (i + 1) % EXPOSURE_STEPS.length)} />
          {ev !== 0 && (
            <Text variant="caption" style={styles.evText}>
              {`${ev > 0 ? '+' : ''}${ev} EV`}
            </Text>
          )}
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + (recording ? 28 : 84) }]}>
        {!recording && <FilterStrip value={filter} onChange={setFilter} />}
        <View style={styles.shutterRow}>
          <View style={styles.slot}>
            {!recording && <RoundButton icon="images-outline" label={t('cam.import')} onPress={importMedia} />}
          </View>
          <ShutterButton recording={recording} disabled={busy} onTap={takePhoto} onHoldStart={startVideo} onHoldEnd={stopVideo} />
          <View style={styles.slot}>{busy && <ActivityIndicator color="#fff" />}</View>
        </View>
        {!recording && (
          <Text variant="caption" style={styles.hint}>
            {t('cam.hint')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  round: { width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  side: { position: 'absolute', right: 16, gap: 12, alignItems: 'center' },
  evText: { color: '#fff', fontWeight: '700', textShadowColor: 'rgba(0,0,0,.6)', textShadowRadius: 4 },
  brandTag: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '55%', opacity: 0.95 },
  brandDot: { width: 10, height: 10, borderRadius: 5 },
  recBadge: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 18 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  slot: { width: 56, alignItems: 'center' },
  hint: { color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
});
