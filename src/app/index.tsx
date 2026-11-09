import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LensCarousel } from '../components/LensCarousel';
import { OnboardingSheet } from '../components/OnboardingSheet';
import { BrandOverlay, LensFilter, PriceTag, type PriceTagData } from '../components/Overlays';
import { ShutterButton } from '../components/ShutterButton';
import { useBrand } from '../lib/brand';
import { categoryById, lensById, type LensId } from '../lib/lenses';

const MAX_CLIP_SECONDS = 30;

function Glass({ children, style, onPress }: { children: React.ReactNode; style?: object; onPress?: () => void }) {
  const inner = (
    <BlurView intensity={40} tint="dark" style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { ready, brand, save, reset } = useBrand();
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [lensId, setLensId] = useState<LensId | null>(null);
  const [recording, setRecording] = useState(false);
  const [clips, setClips] = useState<string[]>([]);
  const [price, setPrice] = useState<PriceTagData>({ price: '', offer: '' });
  const [busy, setBusy] = useState(false);
  const recordingRef = useRef(false);

  const activeLensId = lensId ?? brand?.defaultLens ?? 'cinema';
  const lens = lensById(activeLensId);
  const accent = brand ? categoryById(brand.category).accent : '#fff';

  const openPreview = useCallback(
    (type: 'photo' | 'video', uris: string[]) => {
      router.push({
        pathname: '/preview',
        params: {
          type,
          uris: JSON.stringify(uris),
          lens: activeLensId,
          price: lens.id === 'price' ? JSON.stringify(price) : '',
        },
      });
    },
    [activeLensId, lens.id, price],
  );

  const onTap = useCallback(async () => {
    if (busy || recordingRef.current || !cameraRef.current) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 1, shutterSound: false });
      setClips([]);
      openPreview('photo', [pic.uri]);
    } catch {
      Alert.alert('تعذّر التقاط الصورة', 'حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }, [busy, openPreview]);

  const onHoldStart = useCallback(async () => {
    if (!cameraRef.current || recordingRef.current) return;
    if (!micPerm?.granted) {
      const r = await requestMic();
      if (!r.granted) {
        Alert.alert('الميكروفون مطلوب', 'اسمح بالميكروفون لتسجيل الفيديو بالصوت.');
        return;
      }
    }
    recordingRef.current = true;
    setRecording(true);
    try {
      const res = await cameraRef.current.recordAsync({ maxDuration: MAX_CLIP_SECONDS });
      if (res?.uri) setClips((c) => [...c, res.uri]);
    } catch {
      Alert.alert('تعذّر تسجيل الفيديو', 'تأكد من إذن الميكروفون.');
    } finally {
      recordingRef.current = false;
      setRecording(false);
    }
  }, [micPerm?.granted, requestMic]);

  const onHoldEnd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    cameraRef.current?.stopRecording();
  }, []);

  if (!ready || !camPerm || !micPerm) {
    return <View style={styles.fill}><ActivityIndicator color="#fff" style={{ flex: 1 }} /></View>;
  }

  if (!camPerm.granted) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text style={styles.permTitle}>📸 AdsMe يحتاج الكاميرا</Text>
        <Text style={styles.permSub}>لتصوير إعلانات محلك بهويتك البصرية.</Text>
        <Pressable onPress={requestCam} style={styles.permBtn}>
          <Text style={styles.permBtnText}>السماح بالكاميرا</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        mute={false}
        videoQuality="1080p"
      />

      {/* Live brand preview: what you see is what the customer gets. */}
      <LensFilter lens={lens} />
      {brand && <BrandOverlay brand={brand} topInset={insets.top} />}
      {brand && lens.id === 'price' && <PriceTag data={price} accent={accent} onChange={setPrice} />}

      {/* Top glass controls */}
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Glass
          style={styles.round}
          onPress={() =>
            Alert.alert('إعادة ضبط الهوية', 'هل تريد تغيير اللوغو والنشاط؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'نعم', style: 'destructive', onPress: () => reset() },
            ])
          }
        >
          <Text style={styles.icon}>⚙️</Text>
        </Glass>
        <Glass style={styles.round} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}>
          <Text style={styles.icon}>🔄</Text>
        </Glass>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        <LensCarousel value={activeLensId} onChange={setLensId} />
        <View style={styles.shutterRow}>
          <View style={styles.side}>
            {clips.length > 0 && !recording && (
              <Glass style={styles.clipPill} onPress={() => setClips([])}>
                <Text style={styles.clipText}>🗑 مسح</Text>
              </Glass>
            )}
          </View>
          <ShutterButton
            recording={recording}
            maxSeconds={MAX_CLIP_SECONDS}
            accent={accent}
            onTap={onTap}
            onHoldStart={onHoldStart}
            onHoldEnd={onHoldEnd}
          />
          <View style={styles.side}>
            {clips.length > 0 && !recording && (
              <Glass style={styles.clipPill} onPress={() => openPreview('video', clips)}>
                <Text style={styles.clipText}>✓ {clips.length} {clips.length > 1 ? 'لقطات' : 'لقطة'}</Text>
              </Glass>
            )}
          </View>
        </View>
        <Text style={styles.hint}>{recording ? 'جاري التسجيل… ارفع إصبعك للإيقاف' : 'اضغط للصورة · اضغط مطولاً للفيديو'}</Text>
      </View>

      {ready && !brand && <OnboardingSheet onDone={save} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  permTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  permSub: { color: 'rgba(255,255,255,0.7)', marginTop: 8, textAlign: 'center' },
  permBtn: { marginTop: 24, backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 26 },
  permBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  glass: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  round: { width: 44, height: 44, borderRadius: 22 },
  icon: { fontSize: 20 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginTop: 6 },
  side: { width: 96, alignItems: 'center' },
  clipPill: { paddingHorizontal: 14, height: 40, borderRadius: 20 },
  clipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 10, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
});
