import {
  FishmartDarkTheme,
  FishmartLightTheme,
  NavigationDarkTheme,
  NavigationLightTheme,
} from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { convex } from '@/lib/convex';
import { useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexProvider } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, useColorScheme as useRNColorScheme } from 'react-native';
import { PaperProvider, Text, useTheme } from 'react-native-paper';
import 'react-native-reanimated';

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

function SplashScreen() {
  const scheme = useRNColorScheme();
  const isDark = scheme === 'dark';
  return (
    <View style={[styles.splash, { backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa' }]}>
      <ActivityIndicator size="large" color={isDark ? '#60A5FA' : '#0A84FF'} />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Register for push notifications when authenticated and hydrated
  usePushNotifications();

  // Zustand persist middleware fires onRehydrateStorage callback.
  // We use a small effect to wait for hydration.
  useEffect(() => {
    // Zustand persist middleware fires rehydration synchronously
    // on first access, so checking after a microtask is enough
    const unsubFinish = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated (e.g. re-render), mark it
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsubFinish();
    };
  }, []);

  // After hydration, ensure initialized is set so downstream knows we're ready
  useEffect(() => {
    if (hydrated) {
      useAuthStore.getState().setInitialized(true);
    }
  }, [hydrated]);

  const paperTheme = colorScheme === 'dark' ? FishmartDarkTheme : FishmartLightTheme;
  const navigationTheme = colorScheme === 'dark' ? NavigationDarkTheme : NavigationLightTheme;
  const theme = useTheme();

  // Show splash until Zustand has hydrated persisted auth state.
  if (!hydrated) {
    return (
      <PaperProvider theme={paperTheme}>
        <SplashScreen />
      </PaperProvider>
    );
  }

  // Handle case where Convex is not initialized (e.g., web without config)
  if (!convex) {
    return (
      <PaperProvider theme={paperTheme}>
        <View style={styles.splash}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>
            Loading Fishmart...
          </Text>
        </View>
      </PaperProvider>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <ThemeProvider value={navigationTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={isAuthenticated}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="admin" options={{ headerShown: false }} />
                <Stack.Screen name="cart" options={{ headerShown: false }} />
                <Stack.Screen
                  name="cart/checkout"
                  options={{ headerShown: false, presentation: 'card' }}
                />
                <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                <Stack.Screen name="orders" options={{ headerShown: false }} />
                <Stack.Screen name="payment-cancelled" options={{ headerShown: false }} />
                <Stack.Screen name="payment-success" options={{ headerShown: false }} />
                <Stack.Screen name="product/edit/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="profile/address/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="profile/addresses" options={{ headerShown: false }} />
                <Stack.Screen name="profile/reservations" options={{ headerShown: false }} />
                <Stack.Screen name="profile/update" options={{ headerShown: false }} />
                <Stack.Screen name="reviews/create" options={{ headerShown: false }} />
                <Stack.Screen name="seller/listings" options={{ headerShown: false }} />
                <Stack.Screen name="seller/orders" options={{ headerShown: false }} />
              </Stack.Protected>

              <Stack.Protected guard={!isAuthenticated}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack.Protected>

              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              <Stack.Screen
                name="product/[id]"
                options={{ headerShown: false, presentation: 'card' }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </PaperProvider>
      </QueryClientProvider>
    </ConvexProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});