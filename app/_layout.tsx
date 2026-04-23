import {
  FishmartDarkTheme,
  FishmartLightTheme,
  NavigationDarkTheme,
  NavigationLightTheme,
} from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { convex } from '@/lib/convex';
import { useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexProvider } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, setInitialized } = useAuthStore();

  const paperTheme = colorScheme === 'dark' ? FishmartDarkTheme : FishmartLightTheme;
  const navigationTheme = colorScheme === 'dark' ? NavigationDarkTheme : NavigationLightTheme;

  useEffect(() => {
    setInitialized(true);
  }, [setInitialized]);

  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <ThemeProvider value={navigationTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              {isAuthenticated ? (
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              ) : (
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              )}
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </PaperProvider>
      </QueryClientProvider>
    </ConvexProvider>
  );
}
