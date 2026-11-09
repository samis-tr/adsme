import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Brand } from '../lib/brand';
import { categoryById, type Lens } from '../lib/lenses';

export type PriceTagData = { price: string; offer: string };

/** Colour wash + vignette that fakes a lens look on top of the camera/photo. */
export function LensFilter({ lens }: { lens: Lens }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {lens.tintOpacity > 0 && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: lens.tint, opacity: lens.tintOpacity }]} />
      )}
      {lens.dim > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: lens.dim }]} />}
      {lens.vignette > 0 && (
        <>
          <LinearGradient
            colors={[`rgba(0,0,0,${lens.vignette})`, 'transparent']}
            style={[styles.edge, { top: 0, height: '28%' }]}
          />
          <LinearGradient
            colors={['transparent', `rgba(0,0,0,${lens.vignette})`]}
            style={[styles.edge, { bottom: 0, height: '34%' }]}
          />
        </>
      )}
    </View>
  );
}

/** Logo / shop-name watermark and corner frame in the category accent colour. */
export function BrandOverlay({ brand, topInset = 0 }: { brand: Brand; topInset?: number }) {
  const accent = categoryById(brand.category).accent;
  const corner = { borderColor: accent } as const;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.frame, { top: topInset + 56, bottom: 210 }]}>
        <View style={[styles.corner, styles.tl, corner]} />
        <View style={[styles.corner, styles.tr, corner]} />
        <View style={[styles.corner, styles.bl, corner]} />
        <View style={[styles.corner, styles.br, corner]} />
      </View>
      <View style={[styles.brandTag, { top: topInset + 72 }]}>
        {brand.logoUri ? (
          <Image source={{ uri: brand.logoUri }} style={styles.logo} />
        ) : (
          <Text style={[styles.shopName, { color: accent }]} numberOfLines={1}>
            {brand.shopName}
          </Text>
        )}
      </View>
    </View>
  );
}

/** Price + offer sticker. Editable on the camera screen, read-only in the preview. */
export function PriceTag({
  data,
  accent,
  onChange,
}: {
  data: PriceTagData;
  accent: string;
  onChange?: (d: PriceTagData) => void;
}) {
  const editable = !!onChange;
  return (
    <View pointerEvents={editable ? 'auto' : 'none'} style={[styles.price, { borderColor: accent }]}>
      <TextInput
        editable={editable}
        value={data.offer}
        onChangeText={(offer) => onChange?.({ ...data, offer })}
        placeholder="العرض"
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={[styles.offer, { color: accent }]}
        maxLength={24}
      />
      <TextInput
        editable={editable}
        value={data.price}
        onChangeText={(price) => onChange?.({ ...data, price })}
        placeholder="السعر"
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={styles.priceText}
        keyboardType="default"
        maxLength={12}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0 },
  frame: { position: 'absolute', left: 14, right: 14 },
  corner: { position: 'absolute', width: 26, height: 26, opacity: 0.9 },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  brandTag: { position: 'absolute', left: 28, maxWidth: '55%' },
  logo: { width: 64, height: 64, borderRadius: 14, resizeMode: 'contain' },
  shopName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  price: {
    position: 'absolute',
    right: 28,
    bottom: 240,
    minWidth: 130,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  offer: { fontSize: 14, fontWeight: '700', textAlign: 'center', padding: 0 },
  priceText: { fontSize: 30, fontWeight: '900', color: '#fff', textAlign: 'center', padding: 0 },
});
