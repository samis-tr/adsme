import * as Haptics from 'expo-haptics';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { clampTrim } from '../../lib/adSpec';
import { colors, radius } from '../../ui/theme';

const HANDLE = 28;

/** Two-handle range selector for trimming a clip (seconds). */
export function TrimBar({
  duration,
  start,
  end,
  onChange,
  onCommit,
}: {
  duration: number;
  start: number;
  end: number;
  onChange: (s: number, e: number) => void;
  onCommit: () => void;
}) {
  const [w, setW] = useState(0);
  const state = useRef({ start, end, w, duration });
  state.current = { start, end, w, duration };
  // PanResponders are created once; route callbacks through refs so they never go stale.
  const cb = useRef({ onChange, onCommit });
  cb.current = { onChange, onCommit };
  const origin = useRef(0);

  const make = (which: 'start' | 'end') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        origin.current = which === 'start' ? state.current.start : state.current.end;
        Haptics.selectionAsync().catch(() => {});
      },
      onPanResponderMove: (_, g) => {
        const { w: width, duration: d, start: s, end: e } = state.current;
        if (width <= 0) return;
        const v = origin.current + (g.dx / width) * d;
        const next = which === 'start' ? clampTrim(v, e, d) : clampTrim(s, v, d);
        cb.current.onChange(next.start, next.end);
      },
      onPanResponderRelease: () => cb.current.onCommit(),
      onPanResponderTerminate: () => cb.current.onCommit(),
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startPan = useMemo(() => make('start'), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const endPan = useMemo(() => make('end'), []);

  const d = Math.max(duration, 0.001);
  const left = (start / d) * w;
  const right = (end / d) * w;

  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width - HANDLE)}>
      <View style={[styles.track, { left: HANDLE / 2, right: HANDLE / 2 }]} />
      <View style={[styles.range, { left: left + HANDLE / 2, width: Math.max(0, right - left) }]} />
      <View {...startPan.panHandlers} style={[styles.handle, { left }]} hitSlop={12}>
        <View style={styles.grip} />
      </View>
      <View {...endPan.panHandlers} style={[styles.handle, { left: right }]} hitSlop={12}>
        <View style={styles.grip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 56, justifyContent: 'center' },
  track: { position: 'absolute', height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceHigh },
  range: { position: 'absolute', height: 40, borderRadius: radius.sm, backgroundColor: colors.accentGlow, borderWidth: 2, borderColor: colors.accent },
  handle: { position: 'absolute', width: HANDLE, height: 52, borderRadius: radius.sm, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  grip: { width: 3, height: 18, borderRadius: 2, backgroundColor: '#fff' },
});
