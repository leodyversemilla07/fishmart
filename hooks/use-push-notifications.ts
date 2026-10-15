import { api } from '@/convex/_generated/api';
import { convex } from '@/lib/convex';
import { useAuthStore } from '@/store/authStore';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Configure how notifications are shown when the app is in the foreground.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

type RegisteredPushToken = {
    sessionToken: string;
    token: string;
};

let lastRegisteredPushToken: string | null = null;

/** Returns the most recently registered Expo push token for this device, if any. */
export function getLastRegisteredPushToken() {
    return lastRegisteredPushToken;
}

type FishmartNotificationData = {
    orderId?: string;
    productId?: string;
    screen?: 'orders' | 'messages' | 'notifications';
};

function getEasProjectId() {
    return (
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    );
}

async function ensureAndroidNotificationChannel() {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('fishmart-default', {
        name: 'Fishmart Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A84FF',
    });
}

function navigateFromNotification(data: FishmartNotificationData) {
    if (data.orderId) {
        router.push({ pathname: '/orders/[id]', params: { id: data.orderId } });
        return;
    }

    if (data.productId) {
        router.push({ pathname: '/product/[id]', params: { id: data.productId } });
        return;
    }

    if (data.screen === 'messages') {
        router.push('/(tabs)/messages');
        return;
    }

    if (data.screen === 'orders') {
        router.push('/orders');
        return;
    }

    router.push('/notifications');
}

/**
 * Register the current device for push notifications after auth hydration/login.
 * Push notifications are not supported on web and no-op there.
 */
export function usePushNotifications() {
    const sessionToken = useAuthStore((state) => state.sessionToken);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const registeredTokenRef = useRef<RegisteredPushToken | null>(null);
    const isWeb = Platform.OS === 'web';

    useEffect(() => {
        if (isWeb) return;

        const notificationSub = Notifications.addNotificationReceivedListener(() => {
            // Convex realtime queries update the in-app notification surfaces.
        });

        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as FishmartNotificationData;
            navigateFromNotification(data || {});
        });

        return () => {
            notificationSub.remove();
            responseSub.remove();
        };
    }, [isWeb]);

    useEffect(() => {
        const client = convex;
        const authToken = sessionToken;
        if (isWeb || !isAuthenticated || !authToken || !client) return;
        const convexClient = client;
        const token = authToken;

        let isMounted = true;

        async function registerDevice() {
            if (!Device.isDevice) {
                return;
            }

            await ensureAndroidNotificationChannel();

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return;
            }

            const projectId = getEasProjectId();
            if (!projectId) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[Push] Missing EAS project ID. Push token registration skipped.');
                }
                return;
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            if (!isMounted) return;

            await convexClient.mutation(api.push.registerPushToken, {
                sessionToken: token,
                token: tokenData.data,
                platform: Platform.OS === 'ios' ? 'ios' : 'android',
            });

            registeredTokenRef.current = {
                sessionToken: token,
                token: tokenData.data,
            };
            lastRegisteredPushToken = tokenData.data;
        }

        registerDevice().catch((error) => {
            if (process.env.NODE_ENV === 'development') {
                console.error('[Push] Token registration failed:', error);
            }
        });

        return () => {
            isMounted = false;

            const registration = registeredTokenRef.current;
            if (!registration || registration.sessionToken !== token) return;

            registeredTokenRef.current = null;
            if (lastRegisteredPushToken === registration.token) {
                lastRegisteredPushToken = null;
            }
            convexClient.mutation(api.push.unregisterPushToken, registration).catch((error) => {
                if (process.env.NODE_ENV === 'development') {
                    console.error('[Push] Token unregister failed:', error);
                }
            });
        };
    }, [isAuthenticated, isWeb, sessionToken]);
}
