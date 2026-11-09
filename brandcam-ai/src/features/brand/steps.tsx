import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, StyleSheet, TextInput, View } from 'react-native';
import { useT, type TKey } from '../../lib/i18n';
import type { BrandDNA, BusinessType, VisualStyle } from '../../lib/types';
import { Button, Chip, Tap, Text } from '../../ui/primitives';
import { colors, FONT_FAMILIES, radius, type FontToken } from '../../ui/theme';
import { PALETTES, persistLogo } from './BrandProvider';

type StepProps = { value: BrandDNA; onChange: (b: BrandDNA) => void };

const TYPES: BusinessType[] = ['cafe', 'restaurant', 'bakery', 'salon', 'fashion', 'auto', 'other'];
const STYLES: VisualStyle[] = ['luxury', 'modern', 'warm', 'minimal', 'playful'];
const FONTS: FontToken[] = ['modern', 'elegant', 'friendly'];

export function NameStep({ value, onChange }: StepProps) {
  const t = useT();
  return (
    <View style={{ gap: 20 }}>
      <TextInput
        value={value.businessName}
        onChangeText={(businessName) => onChange({ ...value, businessName })}
        placeholder={t('onb.name.placeholder')}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        maxLength={40}
        autoCapitalize="words"
        returnKeyType="done"
      />
      <View style={styles.wrap}>
        {TYPES.map((ty) => (
          <Chip
            key={ty}
            label={t(`type.${ty}` as TKey)}
            selected={value.businessType === ty}
            onPress={() => onChange({ ...value, businessType: ty })}
          />
        ))}
      </View>
    </View>
  );
}

export function LogoStep({ value, onChange }: StepProps) {
  const t = useT();
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (res.canceled) return;
    try {
      onChange({ ...value, logoUri: persistLogo(res.assets[0].uri) });
    } catch {
      onChange({ ...value, logoUri: res.assets[0].uri });
    }
  };
  return (
    <View style={{ alignItems: 'center', gap: 20 }}>
      <Tap onPress={pick} style={styles.logoBox}>
        {value.logoUri ? (
          <Image source={{ uri: value.logoUri }} style={styles.logoImg} />
        ) : (
          <Text variant="display" faint>
            +
          </Text>
        )}
      </Tap>
      <Button variant="glass" label={value.logoUri ? t('onb.logo.change') : t('onb.logo.pick')} onPress={pick} />
    </View>
  );
}

export function StyleStep({ value, onChange }: StepProps) {
  const t = useT();
  return (
    <View style={styles.wrap}>
      {STYLES.map((s) => (
        <Chip
          key={s}
          label={t(`style.${s}` as TKey)}
          selected={value.style === s}
          onPress={() => onChange({ ...value, style: s, palette: PALETTES[s][0] })}
        />
      ))}
    </View>
  );
}

export function ColorStep({ value, onChange }: StepProps) {
  const options = PALETTES[value.style];
  return (
    <View style={{ gap: 14 }}>
      {options.map((p, i) => {
        const selected = p.join() === value.palette.join();
        return (
          <Tap
            key={i}
            haptic="selection"
            onPress={() => onChange({ ...value, palette: p })}
            style={[styles.paletteRow, selected && { borderColor: colors.accent }]}
          >
            {p.map((c) => (
              <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
            ))}
          </Tap>
        );
      })}
    </View>
  );
}

export function FontStep({ value, onChange }: StepProps) {
  const t = useT();
  return (
    <View style={{ gap: 12 }}>
      {FONTS.map((f) => (
        <Tap
          key={f}
          haptic="selection"
          onPress={() => onChange({ ...value, font: f })}
          style={[styles.fontRow, value.font === f && { borderColor: colors.accent }]}
        >
          <Text style={{ fontFamily: FONT_FAMILIES[f], fontSize: 28, fontWeight: '700' }}>
            {value.businessName || 'BrandCam'}
          </Text>
          <Text variant="caption" muted>
            {t(`font.${f}` as TKey)}
          </Text>
        </Tap>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: {
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 18,
  },
  logoBox: {
    width: 148,
    height: 148,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  paletteRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  swatch: { flex: 1, height: 44, borderRadius: radius.sm },
  fontRow: {
    padding: 18,
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
});
