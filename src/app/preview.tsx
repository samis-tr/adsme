import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { BrandOverlay, LensFilter, PriceTag, type PriceTagData } from '../components/Overlays';
import { useBrand } from '../lib/brand';
import { categoryById, lensById, type LensId } from '../lib/lenses';

export default function Preview() {
  const insets = useSafeAreaInsets();
  const { brand } = useBrand();
  const p = useLocalSearchParams<{ type: 'photo' | 'video'; uris: string; lens: LensId; price?: string }>();
  const uris = useMemo<string[]>(() => {
    try {
      return JSON.parse(p.uris ?? '[]');
    } catch {
      return [];
    }
  }, [p.uris]);
  const price = useMemo<PriceTagData | null>(() => {
    try {
      return p.price ? JSON.parse(p.price) : null;
    } catch {
      return null;
    }
  }, [p.price]);

  const lens = lensById(p.lens ?? 'cinema');
  const accent = brand ? categoryById(brand.category).accent : '#fff';
  const isVideo = p.type === 'video';
  const stageRef = useRef<React.ComponentRef<typeof View>>(null);
  const [saving, setSaving] = useState(false);
  const [clipIndex, setClipIndex] = useState(0);

  const player = useVideoPlayer(isVideo ? uris[0] ?? null : null, (pl) => {
    pl.loop = false;
    pl.play();
  });

  // Play multiple clips back to back.
  useEffect(() => {
    if (!isVideo) return;
    const sub = player.addListener('playToEnd', () => {
      setClipIndex((i) => {
        const next = (i + 1) % uris.length;
        player.replace(uris[next]);
        player.play();
        return next;
      });
    });
    return () => sub.remove();
  }, [player, isVideo, uris]);

  const saveAndShare = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert('الإذن مطلوب', 'اسمح بالوصول للمعرض لحفظ الإعلان.');
        return;
      }
      let shareUri: string;
      if (isVideo) {
        // Videos are saved as recorded; the live overlay is not burned into the file yet.
        for (const u of uris) await MediaLibrary.saveToLibraryAsync(u);
        shareUri = uris[0];
      } else {
        shareUri = await captureRef(stageRef, { format: 'jpg', quality: 1, result: 'tmpfile' });
        await MediaLibrary.saveToLibraryAsync(shareUri);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareUri, { dialogTitle: 'شارك على إنستغرام / تيك توك' });
      } else {
        Alert.alert('تم الحفظ ✅', 'تم حفظ الإعلان في المعرض.');
      }
    } catch {
      Alert.alert('تعذّر الحفظ', 'حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.fill}>
      <View ref={stageRef} collapsable={false} style={StyleSheet.absoluteFill}>
        {isVideo ? (
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        ) : (
          <Image source={{ uri: uris[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <LensFilter lens={lens} />
        {brand && <BrandOverlay brand={brand} topInset={insets.top} />}
        {brand && price && lens.id === 'price' && <PriceTag data={price} accent={accent} />}
      </View>

      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()}>
          <BlurView intensity={40} tint="dark" style={styles.round}>
            <Text style={styles.icon}>✕</Text>
          </BlurView>
        </Pressable>
        {isVideo && uris.length > 1 && (
          <BlurView intensity={40} tint="dark" style={styles.counter}>
            <Text style={styles.counterText}>
              {clipIndex + 1} / {uris.length}
            </Text>
          </BlurView>
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() => Alert.alert('✨ المونتاج الذكي', 'الكتابة التلقائية والموسيقى قيد التطوير وستتوفر قريباً.')}
        >
          <BlurView intensity={50} tint="dark" style={styles.magic}>
            <Text style={styles.magicText}>✨ إضافة مونتاج ذكي (كتابة تلقائية + موسيقى)</Text>
          </BlurView>
        </Pressable>

        <Pressable onPress={saveAndShare} disabled={saving} style={styles.cta}>
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.ctaText}>⬇️ حفظ ومشاركة على إنستغرام / تيك توك</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  round: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  icon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  counter: { paddingHorizontal: 14, height: 34, borderRadius: 17, overflow: 'hidden', justifyContent: 'center' },
  counterText: { color: '#fff', fontWeight: '700' },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0, gap: 12 },
  magic: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  magicText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cta: { height: 58, borderRadius: 29, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
