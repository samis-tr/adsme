import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius, spring, type } from './theme';

type Variant = keyof typeof type;

export function Text({
  variant = 'body',
  muted,
  faint,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean; faint?: boolean; style?: StyleProp<TextStyle> }) {
  return (
    <RNText
      {...rest}
      style={[type[variant] as TextStyle, { color: faint ? colors.textFaint : muted ? colors.textMuted : colors.text }, style]}
    />
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Press-scale wrapper with haptics. Used by every tappable surface. */
export function Tap({
  onPress,
  disabled,
  haptic = 'light',
  style,
  children,
  accessibilityLabel,
}: {
  onPress?: () => void;
  disabled?: boolean;
  haptic?: 'light' | 'selection' | 'none';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => (s.value = withSpring(0.96, spring))}
      onPressOut={() => (s.value = withSpring(1, spring))}
      onPress={() => {
        if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        else if (haptic === 'selection') Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={[anim, style, disabled && { opacity: 0.4 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'glass';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary' ? colors.accent : variant === 'glass' ? colors.glass : 'transparent';
  return (
    <Tap onPress={onPress} disabled={disabled} style={[styles.button, { backgroundColor: bg }, variant === 'ghost' && styles.ghost, style]}>
      <Text variant="headline" style={{ color: variant === 'ghost' ? colors.textMuted : '#fff' }}>
        {label}
      </Text>
    </Tap>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Tap
      onPress={onPress}
      haptic="selection"
      style={[styles.chip, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}
    >
      <Text variant="body" style={{ fontWeight: '600', color: selected ? '#fff' : colors.textMuted }}>
        {label}
      </Text>
    </Tap>
  );
}

export function GlassPanel({ children, style, intensity = 40 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; intensity?: number }) {
  return (
    <View style={[styles.glassWrap, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  ghost: { borderWidth: 1, borderColor: colors.hairlineStrong },
  chip: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  glassWrap: { overflow: 'hidden', borderWidth: 1, borderColor: colors.hairlineStrong },
});
