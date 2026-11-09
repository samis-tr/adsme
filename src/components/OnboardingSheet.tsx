import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import type { Brand } from '../lib/brand';
import { CATEGORIES, LENSES, type Category, type LensId } from '../lib/lenses';

export function OnboardingSheet({ onDone }: { onDone: (b: Brand) => void }) {
  const [category, setCategory] = useState<Category>('restaurant');
  const [shopName, setShopName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [lens, setLens] = useState<LensId>('cinema');

  const chooseCategory = (c: (typeof CATEGORIES)[number]) => {
    Haptics.selectionAsync().catch(() => {});
    setCategory(c.id);
    setLens(c.lens);
  };

  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setLogoUri(res.assets[0].uri);
  };

  const canFinish = shopName.trim().length > 0 || !!logoUri;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
      pointerEvents="box-none"
    >
      <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.sheet}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.grabber} />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>أهلاً بك في AdsMe ✨</Text>
          <Text style={styles.sub}>ثلاث خطوات سريعة لتجهيز هويتك</Text>

          <Text style={styles.step}>1 · نوع النشاط</Text>
          <View style={styles.row}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => chooseCategory(c)}
                style={[styles.chip, category === c.id && { borderColor: c.accent, backgroundColor: 'rgba(255,255,255,0.18)' }]}
              >
                <Text style={styles.chipEmoji}>{c.emoji}</Text>
                <Text style={styles.chipText}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.step}>2 · اللوغو أو اسم المحل</Text>
          <View style={styles.row}>
            <Pressable onPress={pickLogo} style={styles.logoBtn}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImg} />
              ) : (
                <Text style={styles.logoPlus}>＋</Text>
              )}
            </Pressable>
            <TextInput
              value={shopName}
              onChangeText={setShopName}
              placeholder="اسم المحل"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
              maxLength={28}
            />
          </View>

          <Text style={styles.step}>3 · العدسة الأساسية</Text>
          <View style={styles.row}>
            {LENSES.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setLens(l.id);
                }}
                style={[styles.lensChip, lens === l.id && styles.lensChipOn]}
              >
                <Text style={{ fontSize: 22 }}>{l.emoji}</Text>
                <Text style={styles.lensText} numberOfLines={1}>
                  {l.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            disabled={!canFinish}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onDone({ category, shopName: shopName.trim(), logoUri, defaultLens: lens });
            }}
            style={[styles.cta, !canFinish && { opacity: 0.4 }]}
          >
            <Text style={styles.ctaText}>ابدأ التصوير 🎥</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)', marginBottom: 14 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'right' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'right', marginTop: 2 },
  step: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'right', marginTop: 20, marginBottom: 10 },
  row: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipEmoji: { fontSize: 24 },
  chipText: { color: '#fff', fontSize: 13, marginTop: 4, fontWeight: '600' },
  logoBtn: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 64, height: 64 },
  logoPlus: { color: '#fff', fontSize: 28 },
  input: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  lensChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lensChipOn: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' },
  lensText: { color: '#fff', fontSize: 10, marginTop: 4, fontWeight: '600' },
  cta: { marginTop: 24, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#000', fontSize: 17, fontWeight: '800' },
});
