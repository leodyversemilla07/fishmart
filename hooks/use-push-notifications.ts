import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';

// Configure how notifications are shown when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Register the device for push notifications and sync the token to Convex.
 * Call once from the app root layout.
 * Note: Push notifications are not supported on web and will no-op.
 */
export function usePushNotifications() {
    // We store sessionToken in a ref so we don't trigger re-renders from the store
    const sessionTokenRef = useRef<string | null>(null);
    const isWeb = Platform.OS === 'web';

    useEffect(() => {
        // Skip push notifications on web
        if (isWeb) return;

        // Dynamically read the token from the store to avoid import issues
        let isMounted = true;

        async function init() {
            // Read session token
            const { useAuthStore } = await import('@/store/authStore');
            const token = useAuthStore.getState().sessionToken;
            sessionTokenRef.current = token;

            if (!token) return;

            if (!Device.isDevice) {
                // Simulator/emulator - skip registration (notifications require physical device)
                return;
            }

            // Request permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                // Permission denied - notifications won't work
                return;
            }

            // Android notification channel
            if (Platform.OS === 'android') {
                Notifications.setNotificationChannelAsync('fishmart-default', {
                    name: 'Fishmart Notifications',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#0A84FF',
                });
            }

            // Get Expo push token
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
            });

            if (!isMounted) return;

            // Register with Convex via the HTTP client directly
            try {
                const { convex } = await import('@/lib/convex');
                if (convex) {
                    await (convex as any).mutation("push:registerPushToken", {
                        sessionToken: token,
                        token: tokenData.data,
                        platform: Platform.OS === 'ios' ? 'ios' : 'android',
                    });
                }
            } catch (e) {
                console.error('[Push] Token registration failed:', e);
            }
        }

        init();

        // Listen for incoming notifications
        const notificationSub = Notifications.addNotificationReceivedListener(() => {
            // Handle received notification
        });

        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            // Handle notification tap - navigation handled elsewhere via deep linking
            void response;
        });

        return () => {
            isMounted = false;
            notificationSub.remove();
            responseSub.remove();
        };
    }, [isWeb]);
}