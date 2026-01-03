import {
    FishmartDarkTheme,
    FishmartLightTheme,
    NavigationDarkTheme,
    NavigationLightTheme,
} from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';

export default function RootWrapper() {
    const colorScheme = useColorScheme();
    const { isAuthenticated, initialized, setInitialized } = useAuthStore();
    const [isReady, setIsReady] = useState(false);

    const paperTheme = colorScheme === 'dark' ? FishmartDarkTheme : FishmartLightTheme;
    const navigationTheme = colorScheme === 'dark' ? NavigationDarkTheme : NavigationLightTheme;

    useEffect(() => {
        // Zustand persist rehydration happens automatically.
        // We can add a small delay or check specific hydrated state if we want strictness.
        // For now, assuming hydration is fast or already happened by mount in many cases.
        // But better is to just check state.

        setIsReady(true);
        setInitialized(true);

        if (isAuthenticated) {
            // Check if we are already on a deeper route? 
            // Expo router might duplicate navigation if we replace aggressively.
            // But this is RootWrapper.
            router.replace('/(tabs)');
        } else {
            router.replace('/login');
        }
    }, [isAuthenticated]); // Reacting to auth changes

    if (!isReady) {
        return null; // Or Splash Screen
    }

    return (
        <PaperProvider theme={paperTheme}>
            <ThemeProvider value={navigationTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} />
                    <Stack.Screen name="(auth)/signup" options={{ title: 'Sign Up' }} />
                    {/* Remove forgot-password if not supported yet, or keep as placeholder */}
                    <Stack.Screen name="(auth)/forgot-password" options={{ title: 'Reset Password' }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
                <StatusBar style="auto" />
            </ThemeProvider>
        </PaperProvider>
    );
}
