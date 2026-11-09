import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colors, spring } from '../../ui/theme';

const SIZE = 84;

/** Tap = photo, hold = video. Pulses red while recording. */
export function ShutterButton({
  recording,
  disabled,
  onTap,
  onHoldStart,
  onHoldEnd,
}: {
  recording: boolean;
  disabled?: boolean;
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  const press = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (recording) pulse.value = withRepeat(withSequence(withTiming(1.12, { duration: 600 }), withTiming(1, { duration: 600 })), -1);
    else pulse.value = withTiming(1, { duration: 150 });
  }, [recording, pulse]);

  const outer = useAnimatedStyle(() => ({ transform: [{ scale: press.value * pulse.value }] }));
  const inner = useAnimatedStyle(() => ({
    width: withSpring(recording ? 34 : SIZE - 14, spring),
    height: withSpring(recording ? 34 : SIZE - 14, spring),
    borderRadius: withSpring(recording ? 9 : SIZE, spring),
    backgroundColor: recording ? colors.danger : '#fff',
  }));

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Shutter"
      onPressIn={() => (press.value = withSpring(0.92, spring))}
      onPressOut={() => {
        press.value = withSpring(1, spring);
        if (recording) onHoldEnd();
      }}
      onPress={onTap}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onHoldStart();
      }}
      delayLongPress={300}
      hitSlop={16}
    >
      <Animated.View style={[styles.ring, outer, recording && { borderColor: colors.danger }]}>
        <Animated.View style={inner} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: { width: SIZE + 12, height: SIZE + 12, borderRadius: 999, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
