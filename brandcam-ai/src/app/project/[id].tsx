import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjects } from '../../features/projects/ProjectsProvider';
import { useT, type TKey } from '../../lib/i18n';
import { Button, GlassPanel, Tap, Text } from '../../ui/primitives';
import { colors, radius } from '../../ui/theme';

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

export default function ProjectDetail() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { get, remove } = useProjects();
  const project = get(id);
  const [info, setInfo] = useState<string | null>(null);

  if (!project) {
    return (
      <View style={styles.center}>
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const latest = project.exports?.[0];

  const saveToLibrary = async () => {
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert(t('detail.permissionDenied'));
        return;
      }
      await MediaLibrary.saveToLibraryAsync(project.mediaUri);
      setInfo(t('detail.savedToLibrary'));
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  const share = async () => {
    try {
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(project.mediaUri);
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  const del = () =>
    Alert.alert(t('detail.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          router.back();
          await remove(project.id);
        },
      },
    ]);

  return (
    <View style={styles.fill}>
      {project.kind === 'video' ? (
        <VideoPreview uri={project.mediaUri} />
      ) : (
        <Image source={{ uri: project.mediaUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}

      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Tap onPress={() => router.back()} accessibilityLabel={t('common.back')}>
          <GlassPanel style={styles.round}>
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </GlassPanel>
        </Tap>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Tap onPress={saveToLibrary} accessibilityLabel={t('detail.saveDevice')}>
            <GlassPanel style={styles.round}>
              <Ionicons name="download-outline" size={20} color="#fff" />
            </GlassPanel>
          </Tap>
          <Tap onPress={share} accessibilityLabel={t('detail.share')}>
            <GlassPanel style={styles.round}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </GlassPanel>
          </Tap>
          <Tap onPress={del} accessibilityLabel={t('common.delete')}>
            <GlassPanel style={styles.round}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </GlassPanel>
          </Tap>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {info && (
          <GlassPanel style={styles.note}>
            <Text variant="caption" style={{ color: '#fff' }}>{info}</Text>
          </GlassPanel>
        )}
        {project.kind === 'video' && !project.filterBaked && project.filterId !== 'natural' && (
          <GlassPanel style={styles.note}>
            <Text variant="caption" style={{ color: '#fff' }}>
              {t('detail.filterNotBaked', { filter: t(`filter.${project.filterId}` as TKey) })}
            </Text>
          </GlassPanel>
        )}
        {latest && (
          <Tap onPress={() => Sharing.shareAsync(latest.uri).catch(() => {})}>
            <GlassPanel style={[styles.note, styles.exportRow]}>
              <Ionicons name={latest.kind === 'video' ? 'film-outline' : 'image-outline'} size={18} color="#fff" />
              <Text variant="caption" style={{ color: '#fff', flex: 1 }}>
                {`${t('detail.exports')}: ${project.exports!.length} · ${latest.aspect} · ${latest.width}×${latest.height}`}
              </Text>
              <Ionicons name="share-outline" size={18} color="#fff" />
            </GlassPanel>
          </Tap>
        )}
        <Button
          label={`✨  ${project.ad ? t('detail.openStudio') : t('detail.createAd')}`}
          onPress={() => router.push({ pathname: '/studio/[id]', params: { id: project.id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0, gap: 12 },
  note: { borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
