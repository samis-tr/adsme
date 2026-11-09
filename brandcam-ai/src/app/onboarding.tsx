import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { defaultBrand, useBrand } from '../features/brand/BrandProvider';
import { ColorStep, FontStep, LogoStep, NameStep, StyleStep } from '../features/brand/steps';
import { useT, type TKey } from '../lib/i18n';
import type { BrandDNA } from '../lib/types';
import { Button, Text } from '../ui/primitives';
import { colors, spring } from '../ui/theme';

const STEPS = ['welcome', 'name', 'logo', 'style', 'color', 'font'] as const;
type Step = (typeof STEPS)[number];

const TITLES: Partial<Record<Step, TKey>> = {
  name: 'onb.name.title',
  logo: 'onb.logo.title',
  style: 'onb.style.title',
  color: 'onb.color.title',
  font: 'onb.font.title',
};
const SUBS: Partial<Record<Step, TKey>> = { logo: 'onb.logo.sub', color: 'onb.color.sub' };

export default function Onboarding() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { save } = useBrand();
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState<BrandDNA>(defaultBrand());
  const [saving, setSaving] = useState(false);
  const step = STEPS[i];

  const progressStyle = useAnimatedStyle(() => ({
    width: withSpring(`${(i / (STEPS.length - 1)) * 100}%` as `${number}%`, spring),
  }));

  const canNext = step !== 'name' || draft.businessName.trim().length > 0;

  const next = async () => {
    if (i < STEPS.length - 1) {
      setI(i + 1);
      return;
    }
    setSaving(true);
    try {
      await save({ ...draft, businessName: draft.businessName.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // The guarded Stack swaps to the tabs automatically once the brand exists.
    } finally {
      setSaving(false);
    }
  };

  if (step === 'welcome') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1B1233', colors.bg]} style={StyleSheet.absoluteFill} />
        <View style={[styles.welcome, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <Text variant="caption" style={{ color: colors.accent, letterSpacing: 3, marginBottom: 16 }}>
              BRANDCAM AI
            </Text>
            <Text variant="display" style={{ fontSize: 46, lineHeight: 50 }}>
              {t('onb.welcome')}
            </Text>
            <Text variant="body" muted style={{ marginTop: 16, maxWidth: 320 }}>
              {t('onb.welcomeSub')}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(500)}>
            <Button label={t('onb.start')} onPress={() => setI(1)} />
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24 }}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, progressStyle]} />
        </View>
      </View>

      <Animated.View key={step} entering={FadeInDown.springify().damping(20)} exiting={FadeOut.duration(100)} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 36, gap: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 8 }}>
            <Text variant="title">{t(TITLES[step]!)}</Text>
            {SUBS[step] && (
              <Text muted>{t(SUBS[step]!)}</Text>
            )}
          </View>
          {step === 'name' && <NameStep value={draft} onChange={setDraft} />}
          {step === 'logo' && <LogoStep value={draft} onChange={setDraft} />}
          {step === 'style' && <StyleStep value={draft} onChange={setDraft} />}
          {step === 'color' && <ColorStep value={draft} onChange={setDraft} />}
          {step === 'font' && <FontStep value={draft} onChange={setDraft} />}
        </ScrollView>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button variant="ghost" label={t('common.back')} onPress={() => setI(i - 1)} style={{ flex: 1 }} />
        <Button
          label={i === STEPS.length - 1 ? t('onb.finish') : step === 'logo' && !draft.logoUri ? t('common.skip') : t('common.next')}
          onPress={next}
          disabled={!canNext || saving}
          style={{ flex: 2 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  welcome: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 12 },
});
