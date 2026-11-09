import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BrandProvider, useBrand } from '../features/brand/BrandProvider';
import { ProjectsProvider } from '../features/projects/ProjectsProvider';
import { I18nProvider } from '../lib/i18n';
import { colors } from '../ui/theme';

function Routes() {
  const { ready, brand } = useBrand();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!brand}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!!brand}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
        <Stack.Screen name="studio/[id]" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <I18nProvider>
          <BrandProvider>
            <ProjectsProvider>
              <StatusBar style="light" />
              <Routes />
            </ProjectsProvider>
          </BrandProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
