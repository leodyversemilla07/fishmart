import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { useAction, useQuery } from 'convex/react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideXCircle, LucideRefreshCw, LucideHome } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withSpring,
    withSequence,
    withDelay,
} from 'react-native-reanimated';

export default function PaymentCancelledScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { orderId } = useLocalSearchParams<{ orderId: Id<"orders"> }>();
    const { sessionToken } = useAuthStore();
    const retryPayment = useAction(api.orders.retryPayment);

    // Fetch order details
    const order = useQuery(
        api.orders.get, 
        orderId && sessionToken ? { sessionToken, id: orderId } : "skip"
    );

    // Animation values
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Animate X icon
        scale.value = withSequence(
            withSpring(1.2, { damping: 8 }),
            withSpring(1, { damping: 12 })
        );
        // Fade in content
        opacity.value = withDelay(300, withSpring(1));

        // Haptic feedback on error
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, [opacity, scale]);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const handleRetryPayment = async () => {
        if (!sessionToken || !orderId) {
            router.push('/orders');
            return;
        }

        try {
            const successUrl = Linking.createURL('payment-success', { queryParams: { orderId } });
            const cancelUrl = Linking.createURL('payment-cancelled', { queryParams: { orderId } });
            const result = await retryPayment({
                sessionToken,
                orderId,
                successUrl,
                cancelUrl,
            });

            if ('error' in result) {
                router.push({ pathname: '/orders/[id]', params: { id: orderId } });
                return;
            }

            await WebBrowser.openBrowserAsync(result.checkoutUrl, {
                dismissButtonStyle: 'cancel',
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            });
        } catch (error) {
            console.error('Failed to retry payment:', error);
            router.push({ pathname: '/orders/[id]', params: { id: orderId } });
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
            {/* Cancel Icon */}
            <Animated.View style={[styles.iconContainer, iconStyle]}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <LucideXCircle size={80} color="#EF4444" />
                </View>
            </Animated.View>

            {/* Content */}
            <Animated.View style={[styles.content, contentStyle]}>
                <Text variant="headlineMedium" style={styles.title}>
                    Payment Cancelled
                </Text>
                <Text variant="bodyLarge" style={styles.subtitle}>
                    Your payment was not completed. Don&apos;t worry, your order has been saved.
                </Text>

                {order && (
                    <View style={styles.orderInfo}>
                        <View style={styles.orderRow}>
                            <Text variant="bodyMedium" style={styles.orderLabel}>Order Number</Text>
                            <Text variant="titleMedium" style={styles.orderValue}>
                                {order.orderNumber}
                            </Text>
                        </View>
                        <View style={styles.orderRow}>
                            <Text variant="bodyMedium" style={styles.orderLabel}>Amount Due</Text>
                            <Text variant="titleMedium" style={[styles.orderValue, { color: theme.colors.primary }]}>
                                ₱{order.total?.toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.orderRow}>
                            <Text variant="bodyMedium" style={styles.orderLabel}>Payment Status</Text>
                            <View style={styles.statusBadge}>
                                <Text variant="labelSmall" style={styles.statusText}>
                                    PENDING
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <Text variant="bodySmall" style={styles.infoText}>
                        You can complete your payment later from the Orders page, or contact the seller for alternative payment options.
                    </Text>
                </View>
            </Animated.View>

            {/* Actions */}
            <View style={styles.actions}>
                <Button
                    mode="contained"
                    onPress={handleRetryPayment}
                    style={styles.primaryButton}
                    contentStyle={styles.buttonContent}
                    icon={({ size, color }) => <LucideRefreshCw size={size} color={color} />}
                >
                    Try Again
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => router.push('/(tabs)')}
                    style={styles.secondaryButton}
                    contentStyle={styles.buttonContent}
                    icon={({ size, color }) => <LucideHome size={size} color={color} />}
                >
                    Back to Home
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        paddingHorizontal: 24,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
        color: '#1F2937',
    },
    subtitle: {
        textAlign: 'center',
        color: '#6B7280',
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    orderInfo: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderLabel: {
        color: '#6B7280',
    },
    orderValue: {
        fontWeight: '600',
        color: '#1F2937',
    },
    statusBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#D97706',
        fontWeight: '600',
    },
    infoBox: {
        width: '100%',
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    infoText: {
        color: '#991B1B',
        lineHeight: 18,
    },
    actions: {
        gap: 12,
    },
    primaryButton: {
        borderRadius: 12,
    },
    secondaryButton: {
        borderRadius: 12,
    },
    buttonContent: {
        paddingVertical: 12,
    },
});
