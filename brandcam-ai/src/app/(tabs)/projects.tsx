import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjects } from '../../features/projects/ProjectsProvider';
import { useT } from '../../lib/i18n';
import type { Project } from '../../lib/types';
import { Tap, Text } from '../../ui/primitives';
import { colors, radius } from '../../ui/theme';

const GAP = 10;
const PAD = 16;

function Cell({ p, size, index }: { p: Project; size: number; index: number }) {
  const t = useT();
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
      <Tap onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })} style={[styles.cell, { width: size, height: size * 1.4 }]}>
        {p.kind === 'photo' || p.thumbUri ? (
          <Image source={{ uri: p.kind === 'photo' ? p.mediaUri : p.thumbUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.videoBg]} />
        )}
        {p.kind === 'video' && (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.85)" />
          </View>
        )}
        <View style={styles.badge}>
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
            {p.status === 'exported' ? t('proj.exported') : t('proj.draft')}
          </Text>
        </View>
      </Tap>
    </Animated.View>
  );
}

export default function Projects() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { projects, ready } = useProjects();
  const size = (width - PAD * 2 - GAP) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={projects}
        numColumns={2}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ padding: PAD, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110, gap: GAP }}
        ListHeaderComponent={<Text variant="display" style={{ marginBottom: 12 }}>{t('proj.title')}</Text>}
        ListEmptyComponent={
          ready ? (
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={40} color={colors.textFaint} />
              <Text variant="headline">{t('proj.empty.title')}</Text>
              <Text muted style={{ textAlign: 'center', maxWidth: 260 }}>{t('proj.empty.body')}</Text>
            </View>
          ) : undefined
        }
        renderItem={({ item, index }) => <Cell p={item} size={size} index={index} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  videoBg: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  badge: { position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 10, height: 24, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingTop: 120 },
});
