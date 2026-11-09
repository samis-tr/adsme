import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FILTER_ORDER } from '../../lib/filters';
import { useT, type TKey } from '../../lib/i18n';
import type { FilterId } from '../../lib/types';
import { Tap, Text } from '../../ui/primitives';
import { colors, radius, spring } from '../../ui/theme';

const W = 74;

const SWATCH: Record<FilterId, string> = {
  natural: '#D8D8E0',
  brand: colors.accent,
  warm: '#FFB066',
  crisp: '#7FD4FF',
  film: '#B5A58A',
  noir: '#555560',
};

function Item({ id, active, onPress }: { id: FilterId; active: boolean; onPress: () => void }) {
  const t = useT();
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(active ? 1 : 0.86, spring) }],
    opacity: withSpring(active ? 1 : 0.6, spring),
  }));
  return (
    <Tap onPress={onPress} haptic="none" style={{ width: W, alignItems: 'center' }}>
      <Animated.View style={[styles.dotWrap, style, active && { borderColor: '#fff' }]}>
        <View style={[styles.dot, { backgroundColor: SWATCH[id] }]} />
      </Animated.View>
      <Text variant="caption" style={{ color: active ? '#fff' : colors.textMuted, marginTop: 6, fontWeight: active ? '700' : '500' }}>
        {t(`filter.${id}` as TKey)}
      </Text>
    </Tap>
  );
}

/** Horizontal, snapping filter selector. Selecting (by tap or swipe) ticks haptically. */
export function FilterStrip({ value, onChange }: { value: FilterId; onChange: (f: FilterId) => void }) {
  const { width } = useWindowDimensions();
  const ref = useRef<FlatList<FilterId>>(null);
  const side = (width - W) / 2;
  const last = useRef(value);

  useEffect(() => {
    const idx = FILTER_ORDER.indexOf(value);
    ref.current?.scrollToOffset({ offset: idx * W, animated: true });
  }, [value]);

  const select = (f: FilterId) => {
    if (f === last.current) return;
    last.current = f;
    Haptics.selectionAsync().catch(() => {});
    onChange(f);
  };

  return (
    <FlatList
      ref={ref}
      data={FILTER_ORDER}
      horizontal
      keyExtractor={(f) => f}
      showsHorizontalScrollIndicator={false}
      snapToInterval={W}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: side }}
      contentOffset={{ x: FILTER_ORDER.indexOf(value) * W, y: 0 }}
      onScroll={(e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / W);
        const f = FILTER_ORDER[Math.max(0, Math.min(FILTER_ORDER.length - 1, idx))];
        select(f);
      }}
      scrollEventThrottle={16}
      renderItem={({ item }) => <Item id={item} active={item === value} onPress={() => select(item)} />}
      style={{ flexGrow: 0 }}
    />
  );
}

const styles = StyleSheet.create({
  dotWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 40, height: 40, borderRadius: radius.pill },
});
