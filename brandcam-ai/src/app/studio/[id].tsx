import { Ionicons } from '@expo/vector-icons';
import type { SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../../features/brand/BrandProvider';
import { FilterStrip } from '../../features/camera/FilterStrip';
import { useProjects } from '../../features/projects/ProjectsProvider';
import { PhotoAdPreview, VideoAdPreview } from '../../features/studio/AdPreview';
import { buildComposition, exportImage, exportVideo, loadUprightImage } from '../../features/studio/exporter';
import { buildRenderSpec, loadLogo } from '../../features/studio/render';
import { TrimBar } from '../../features/studio/TrimBar';
import { ASPECT_ORDER, ASPECTS, defaultDraft, suggestCopy } from '../../lib/adSpec';
import { useT, type TKey } from '../../lib/i18n';
import type { AdDraft, AdGoal, ExportRecord } from '../../lib/types';
import { Button, Chip, GlassPanel, Tap, Text } from '../../ui/primitives';
import { colors, radius } from '../../ui/theme';

const GOALS: { id: AdGoal; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'product', icon: 'sparkles-outline' },
  { id: 'offer', icon: 'pricetag-outline' },
  { id: 'brand', icon: 'storefront-outline' },
];

type Tab = 'text' | 'look' | 'format' | 'cut' | 'sound';

function GoalPicker({ onPick }: { onPick: (g: AdGoal) => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.goalRoot, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 24 }]}>
      <Tap onPress={() => router.back()} style={[styles.close, { top: insets.top + 8 }]} accessibilityLabel={t('common.back')}>
        <Ionicons name="close" size={24} color={colors.text} />
      </Tap>
      <Text variant="title" style={{ marginBottom: 24 }}>
        {t('studio.goal.title')}
      </Text>
      <View style={{ gap: 12 }}>
        {GOALS.map((g, i) => (
          <Animated.View key={g.id} entering={FadeInDown.delay(80 * i).springify()}>
            <Tap onPress={() => onPick(g.id)} style={styles.goalCard}>
              <View style={styles.goalIcon}>
                <Ionicons name={g.icon} size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="headline">{t(`studio.goal.${g.id}` as TKey)}</Text>
                <Text variant="caption" muted>
                  {t(`studio.goal.${g.id}.sub` as TKey)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Tap>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

export default function Studio() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { get, update } = useProjects();
  const { brand } = useBrand();
  const project = get(id);

  const [draft, setDraft] = useState<AdDraft | null>(project?.ad ?? null);
  const [tab, setTab] = useState<Tab>('text');
  const [logo, setLogo] = useState<SkImage | null>(null);
  const [media, setMedia] = useState<SkImage | null>(null);
  const [trim, setTrim] = useState<{ start: number; end: number } | null>(null);
  const [exporting, setExporting] = useState<number | null>(null);
  const [result, setResult] = useState<ExportRecord | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const trimRef = useRef<{ start: number; end: number } | null>(null);

  // Assets for rendering.
  useEffect(() => {
    loadLogo(brand?.logoUri ?? null).then(setLogo);
  }, [brand?.logoUri]);
  useEffect(() => {
    if (project?.kind === 'photo') loadUprightImage(project.mediaUri).then(setMedia).catch(() => setMedia(null));
  }, [project?.kind, project?.mediaUri]);

  // Persist the editor state so the ad can be reopened later.
  useEffect(() => {
    if (!draft || !project) return;
    const h = setTimeout(() => update(project.id, { ad: draft }), 400);
    return () => clearTimeout(h);
  }, [draft, project, update]);

  const isVideo = project?.kind === 'video';
  const duration = project?.durationSec ?? 0;

  const spec = useMemo(() => {
    if (!draft || !brand) return null;
    const { width, height } = ASPECTS[draft.aspect];
    try {
      return buildRenderSpec({ draft, brand, width, height, logo, clipDuration: draft.trimEnd - draft.trimStart, animated: true });
    } catch {
      return null;
    }
  }, [draft, brand, logo]);

  // Only rebuild the decoder when the cut or the sound actually changes.
  const composition = useMemo(
    () => (project && draft && isVideo ? buildComposition(project, draft) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project?.mediaUri, isVideo, draft?.trimStart, draft?.trimEnd, draft?.originalAudio, draft?.endCard],
  );

  if (!project || !brand) {
    return (
      <View style={styles.center}>
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  if (!draft) {
    return <GoalPicker onPick={(g) => setDraft(defaultDraft(project, brand, g))} />;
  }

  const set = (patch: Partial<AdDraft>) => setDraft({ ...draft, ...patch, updatedAt: Date.now() });

  // Preview box: fit the chosen aspect into the space above the panel.
  const a = ASPECTS[draft.aspect];
  const maxW = screenW - 32;
  const maxH = screenH * 0.56 - insets.top;
  const scale = Math.min(maxW / a.width, maxH / a.height);
  const size = { width: Math.round(a.width * scale), height: Math.round(a.height * scale) };

  const runExport = async () => {
    if (exporting !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setExporting(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const rec = isVideo
        ? await exportVideo(project, draft, brand, (p) => setExporting(p), ctrl.signal)
        : await exportImage(project, draft, brand);
      await update(project.id, { status: 'exported', ad: draft, exports: [rec, ...(project.exports ?? [])] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult(rec);
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        console.error('[export]', e);
        Alert.alert(t('studio.failed'), String((e as Error)?.message ?? e));
      }
    } finally {
      setExporting(null);
      abortRef.current = null;
    }
  };

  const shareResult = async () => {
    if (result && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(result.uri);
  };
  const saveResult = async () => {
    if (!result) return;
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return Alert.alert(t('detail.permissionDenied'));
    await MediaLibrary.saveToLibraryAsync(result.uri);
    Alert.alert(t('detail.savedToLibrary'));
  };

  const tabs: Tab[] = isVideo ? ['text', 'look', 'format', 'cut', 'sound'] : ['text', 'look', 'format'];
  const shownTrim = trim ?? { start: draft.trimStart, end: draft.trimEnd };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Tap onPress={() => router.back()} accessibilityLabel={t('common.back')}>
          <GlassPanel style={styles.round}>
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </GlassPanel>
        </Tap>
        <Text variant="headline">{t(`studio.goal.${draft.goal}` as TKey)}</Text>
        <Button label={t('studio.export')} onPress={runExport} disabled={!spec || exporting !== null} style={styles.exportBtn} />
      </View>

      {/* Preview */}
      <View style={styles.stage}>
        <View style={[styles.frame, size]}>
          {spec && isVideo && composition && <VideoAdPreview spec={spec} composition={composition} size={size} playing={exporting === null} />}
          {spec && !isVideo && <PhotoAdPreview spec={spec} media={media} size={size} />}
          {!spec && <ActivityIndicator color="#fff" style={{ flex: 1 }} />}
        </View>
      </View>

      {/* Panel */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((k) => (
            <Chip key={k} label={t(`studio.tab.${k}` as TKey)} selected={tab === k} onPress={() => setTab(k)} />
          ))}
        </ScrollView>

        <ScrollView style={{ maxHeight: 230 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
          {tab === 'text' && (
            <>
              <Text variant="caption" faint>
                {t('studio.suggestion')}
              </Text>
              <Field label={t('studio.headline')} value={draft.headline} onChange={(headline) => set({ headline })} max={60} />
              <Field label={t('studio.subline')} value={draft.subline} onChange={(subline) => set({ subline })} max={60} />
              <Field label={t('studio.cta')} value={draft.cta} onChange={(cta) => set({ cta })} max={24} />
              <Tap onPress={() => set(suggestCopy(draft.goal, brand))} style={styles.resetCopy}>
                <Ionicons name="refresh" size={16} color={colors.accent} />
                <Text variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>
                  {t('studio.suggestion')}
                </Text>
              </Tap>
            </>
          )}
          {tab === 'look' && (
            <View style={{ gap: 12, marginHorizontal: -16 }}>
              <FilterStrip value={draft.filterId} onChange={(filterId) => set({ filterId })} />
              {project.kind === 'photo' && project.filterBaked && draft.filterId !== 'natural' && (
                <Text variant="caption" muted style={{ paddingHorizontal: 16 }}>
                  {t('studio.photoFilterBaked')}
                </Text>
              )}
              <Row label={t('studio.logo')} value={draft.showLogo} onChange={(showLogo) => set({ showLogo })} />
              {isVideo && <Row label={t('studio.endCard')} value={draft.endCard} onChange={(endCard) => set({ endCard })} />}
            </View>
          )}
          {tab === 'format' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {ASPECT_ORDER.map((id) => (
                <Tap key={id} haptic="selection" onPress={() => set({ aspect: id })} style={[styles.aspect, draft.aspect === id && styles.aspectOn]}>
                  <View style={[styles.aspectGlyph, { aspectRatio: ASPECTS[id].width / ASPECTS[id].height }]} />
                  <Text variant="headline">{id}</Text>
                  <Text variant="caption" muted>
                    {ASPECTS[id].label}
                  </Text>
                </Tap>
              ))}
            </View>
          )}
          {tab === 'cut' && isVideo && (
            <View style={{ gap: 6 }}>
              <Text variant="caption" muted>
                {t('studio.trim', { len: (shownTrim.end - shownTrim.start).toFixed(1) })}
              </Text>
              <TrimBar
                duration={duration}
                start={shownTrim.start}
                end={shownTrim.end}
                onChange={(s, e) => {
                  trimRef.current = { start: s, end: e };
                  setTrim(trimRef.current);
                }}
                onCommit={() => {
                  const cur = trimRef.current;
                  trimRef.current = null;
                  setTrim(null);
                  if (cur) set({ trimStart: cur.start, trimEnd: cur.end });
                }}
              />
            </View>
          )}
          {tab === 'sound' && isVideo && (
            <View style={{ gap: 12 }}>
              <Row label={t('studio.originalAudio')} value={draft.originalAudio} onChange={(originalAudio) => set({ originalAudio })} />
              <View style={styles.musicNote}>
                <Ionicons name="musical-notes-outline" size={18} color={colors.textMuted} />
                <Text variant="caption" muted style={{ flex: 1 }}>
                  {t('studio.musicSoon')}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Export progress */}
      {exporting !== null && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overlay}>
          <GlassPanel style={styles.progressCard} intensity={60}>
            <Text variant="headline">{t('studio.exporting', { pct: String(Math.round(exporting * 100)) })}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(exporting * 100)}%` }]} />
            </View>
            {isVideo && <Button variant="ghost" label={t('studio.cancel')} onPress={() => abortRef.current?.abort()} />}
          </GlassPanel>
        </Animated.View>
      )}

      {/* Result */}
      {result && (
        <Animated.View entering={FadeIn} style={styles.overlay}>
          <GlassPanel style={styles.progressCard} intensity={60}>
            <Ionicons name="checkmark-circle" size={44} color={colors.accent} />
            <Text variant="headline" style={{ textAlign: 'center' }}>
              {t('studio.done')}
            </Text>
            <Text variant="caption" muted>
              {`${result.width}×${result.height} · ${(result.sizeBytes / 1_000_000).toFixed(1)} MB${result.durationSec ? ` · ${result.durationSec.toFixed(1)} s` : ''}`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Button variant="glass" label={t('detail.saveDevice')} onPress={saveResult} style={{ flex: 1 }} />
              <Button label={t('detail.share')} onPress={shareResult} style={{ flex: 1 }} />
            </View>
            <Button variant="ghost" label={t('common.done')} onPress={() => setResult(null)} style={{ alignSelf: 'stretch' }} />
          </GlassPanel>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, max }: { label: string; value: string; onChange: (v: string) => void; max: number }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <TextInput value={value} onChangeText={onChange} maxLength={max} style={styles.input} placeholderTextColor={colors.textFaint} />
    </View>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.surfaceHigh }} thumbColor="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  goalRoot: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  close: { position: 'absolute', right: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  goalIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  round: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  exportBtn: { height: 44, paddingHorizontal: 18 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' },
  panel: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: 12, gap: 12 },
  tabs: { gap: 8, paddingHorizontal: 16 },
  input: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  resetCopy: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 44 },
  aspect: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, borderWidth: 1.5, borderColor: 'transparent' },
  aspectOn: { borderColor: colors.accent },
  aspectGlyph: { height: 40, borderRadius: 4, borderWidth: 2, borderColor: colors.textMuted },
  musicNote: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  progressCard: { alignSelf: 'stretch', borderRadius: radius.lg, padding: 22, gap: 14, alignItems: 'center' },
  progressTrack: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.accent },
});
