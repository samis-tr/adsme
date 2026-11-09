import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 96;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

type Props = {
  recording: boolean;
  maxSeconds: number;
  accent: string;
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

/** Tap = photo. Hold = video with a progress ring. */
export function ShutterButton({ recording, maxSeconds, accent, onTap, onHoldStart, onHoldEnd }: Props) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (recording) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: maxSeconds * 1000, easing: Easing.linear });
      scale.value = withTiming(1.12, { duration: 150 });
    } else {
      cancelAnimation(progress);
      progress.value = 0;
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [recording, maxSeconds, progress, scale]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - progress.value) }));
  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onTap}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onHoldStart();
      }}
      delayLongPress={280}
      onPressOut={() => {
        if (recording) onHoldEnd();
      }}
      hitSlop={16}
    >
      <Animated.View style={[styles.wrap, wrapStyle]}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.9)" strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={accent}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            animatedProps={ringProps}
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={[styles.inner, recording && styles.innerRec]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  inner: { width: SIZE - 24, height: SIZE - 24, borderRadius: SIZE, backgroundColor: '#fff' },
  innerRec: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FF3B4E' },
});
