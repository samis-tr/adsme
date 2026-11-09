import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { LENSES, type LensId } from '../lib/lenses';

const ITEM = 64;
const GAP = 14;
const STEP = ITEM + GAP;

function LensItem({
  index,
  scrollX,
  emoji,
  name,
  active,
}: {
  index: number;
  scrollX: SharedValue<number>;
  emoji: string;
  name: string;
  active: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.value / STEP - index);
    return {
      transform: [{ scale: interpolate(d, [0, 1, 2], [1.15, 0.8, 0.7], 'clamp') }],
      opacity: interpolate(d, [0, 1, 2], [1, 0.6, 0.4], 'clamp'),
    };
  });
  return (
    <Animated.View style={[styles.item, style]}>
      <View style={[styles.bubble, active && styles.bubbleActive]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
    </Animated.View>
  );
}

export function LensCarousel({ value, onChange }: { value: LensId; onChange: (id: LensId) => void }) {
  const { width } = useWindowDimensions();
  const listRef = useRef<Animated.FlatList<(typeof LENSES)[number]>>(null);
  const scrollX = useSharedValue(0);
  const lastIndex = useRef(LENSES.findIndex((l) => l.id === value));
  const side = (width - ITEM) / 2;

  const pick = (i: number) => {
    const clamped = Math.max(0, Math.min(LENSES.length - 1, i));
    if (clamped === lastIndex.current) return;
    lastIndex.current = clamped;
    Haptics.selectionAsync().catch(() => {});
    onChange(LENSES[clamped].id);
  };

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
    runOnJS(pick)(Math.round(e.contentOffset.x / STEP));
  });

  // Sync when the value is set from outside (e.g. after onboarding).
  useEffect(() => {
    const i = LENSES.findIndex((l) => l.id === value);
    lastIndex.current = i;
    listRef.current?.scrollToOffset({ offset: i * STEP, animated: false });
  }, [value]);

  const active = LENSES.findIndex((l) => l.id === value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{LENSES[active]?.name}</Text>
      <Animated.FlatList
        ref={listRef}
        data={LENSES}
        horizontal
        keyExtractor={(l) => l.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentOffset={{ x: Math.max(active, 0) * STEP, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: side - GAP / 2, alignItems: 'center' }}
        renderItem={({ item, index }) => (
          <LensItem index={index} scrollX={scrollX} emoji={item.emoji} name={item.name} active={index === active} />
        )}
        style={{ height: 90 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
  },
  item: { width: ITEM, marginHorizontal: GAP / 2, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    width: ITEM,
    height: ITEM,
    borderRadius: ITEM / 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleActive: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.25)' },
  emoji: { fontSize: 28 },
});
