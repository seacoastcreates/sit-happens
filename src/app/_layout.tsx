import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { DATABASE_NAME, migrate } from '@/db/schema';
import '@/services/reminders';
import { DogProvider, useDog } from '@/state/DogContext';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      <DogProvider>
        <RootStack />
      </DogProvider>
    </SQLiteProvider>
  );
}

function RootStack() {
  const { loading, dog } = useDog();
  const scheme = useColorScheme();
  const c = useColors();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.accent, background: c.background, card: c.background, text: c.text, border: c.border },
  };

  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          headerTintColor: c.accent,
          headerTitleStyle: { color: c.text },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.background },
        }}>
        <Stack.Protected guard={!!dog}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="skill/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="session/run"
            options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen
            name="session/summary"
            options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen name="edit-dog" options={{ presentation: 'modal', title: 'Edit profile' }} />
          <Stack.Screen name="edit-goals" options={{ presentation: 'modal', title: 'Training goals' }} />
        </Stack.Protected>
        <Stack.Protected guard={!dog}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
