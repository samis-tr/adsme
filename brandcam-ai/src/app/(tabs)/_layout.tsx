import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, type TKey } from '../../lib/i18n';
import { GlassPanel, Tap, Text } from '../../ui/primitives';
import { colors, radius } from '../../ui/theme';

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: TKey }> = {
  camera: { on: 'camera', off: 'camera-outline', label: 'tabs.camera' },
  projects: { on: 'albums', off: 'albums-outline', label: 'tabs.projects' },
  brand: { on: 'color-palette', off: 'color-palette-outline', label: 'tabs.brand' },
};

function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const hidden = descriptors[state.routes[state.index].key].options.tabBarStyle;
  if (hidden && (hidden as { display?: string }).display === 'none') return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 10 }]}>
      <GlassPanel style={styles.bar} intensity={50}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = ICONS[route.name];
          if (!meta) return null;
          return (
            <Tap
              key={route.key}
              haptic="selection"
              accessibilityLabel={t(meta.label)}
              onPress={() => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              }}
              style={[styles.item, focused && styles.itemOn]}
            >
              <Ionicons name={focused ? meta.on : meta.off} size={20} color={focused ? '#fff' : colors.textMuted} />
              {focused && (
                <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
                  {t(meta.label)}
                </Text>
              )}
            </Tap>
          );
        })}
      </GlassPanel>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(p) => <FloatingTabBar {...p} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="camera" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="brand" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: { flexDirection: 'row', padding: 6, gap: 4, borderRadius: radius.pill },
  item: { height: 44, minWidth: 48, paddingHorizontal: 14, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  itemOn: { backgroundColor: colors.accent },
});
