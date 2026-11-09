import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBrand } from '../../features/brand/BrandProvider';
import { ColorStep, FontStep, LogoStep, NameStep, StyleStep } from '../../features/brand/steps';
import { useT } from '../../lib/i18n';
import type { BrandDNA } from '../../lib/types';
import { Button, Text } from '../../ui/primitives';
import { colors } from '../../ui/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 14 }}>
      <Text variant="headline" muted>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function BrandTab() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { brand, save, reset } = useBrand();
  const [draft, setDraft] = useState<BrandDNA | null>(brand);

  useEffect(() => setDraft(brand), [brand]);
  if (!brand || !draft) return null;

  const dirty = JSON.stringify({ ...draft, updatedAt: 0 }) !== JSON.stringify({ ...brand, updatedAt: 0 });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 180, gap: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="display">{t('brand.title')}</Text>
        <Section title={t('onb.name.title')}>
          <NameStep value={draft} onChange={setDraft} />
        </Section>
        <Section title={t('onb.logo.title')}>
          <LogoStep value={draft} onChange={setDraft} />
        </Section>
        <Section title={t('onb.style.title')}>
          <StyleStep value={draft} onChange={setDraft} />
        </Section>
        <Section title={t('onb.color.title')}>
          <ColorStep value={draft} onChange={setDraft} />
        </Section>
        <Section title={t('onb.font.title')}>
          <FontStep value={draft} onChange={setDraft} />
        </Section>
        <Button
          variant="ghost"
          label={t('brand.reset')}
          onPress={() =>
            Alert.alert(t('brand.reset'), undefined, [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.delete'), style: 'destructive', onPress: () => reset() },
            ])
          }
        />
      </ScrollView>

      {dirty && (
        <Animated.View entering={FadeInDown.springify()} style={[styles.saveBar, { bottom: insets.bottom + 84 }]}>
          <Button
            label={t('common.save')}
            onPress={async () => {
              await save({ ...draft, businessName: draft.businessName.trim() || brand.businessName });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  saveBar: { position: 'absolute', left: 20, right: 20 },
});
