import { Stack } from 'expo-router';

import { DraftProvider } from '@/state/OnboardingDraft';
import { useColors } from '@/theme';

export default function OnboardingLayout() {
  const c = useColors();
  return (
    <DraftProvider>
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerTitle: '',
          headerTintColor: c.accent,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </DraftProvider>
  );
}
