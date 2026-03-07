import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideCheckCircle, LucidePackage, LucideHome } from 'lucide-react-native';
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

export default function PaymentSuccessScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { sessionToken } = useAuthStore();

    // Fetch order details
    const order = useQuery(
        api.orders.get, 
        orderId && sessionToken ? { sessionToken, id: orderId as Id<"orders"> } : "skip"
    );

    // Animation values
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Animate check icon
        scale.value = withSequence(
            withSpring(1.2, { damping: 8 }),
            withSpring(1, { damping: 12 })
        );
        // Fade in content
        opacity.value = withDelay(300, withSpring(1));
    }, []);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
            {/* Success Icon */}
            <Animated.View style={[styles.iconContainer, iconStyle]}>
                <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <LucideCheckCircle size={80} color="#10B981" />
                </View>
            </Animated.View>

            {/* Content */}
            <Animated.View style={[styles.content, contentStyle]}>
                <Text variant="headlineMedium" style={styles.title}>
                    Payment Successful!
                </Text>
                <Text variant="bodyLarge" style={styles.subtitle}>
                    Thank you for your purchase. Your order has been confirmed.
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
                            <Text variant="bodyMedium" style={styles.orderLabel}>Total Paid</Text>
                            <Text variant="titleMedium" style={[styles.orderValue, { color: theme.colors.primary }]}>
                                ₱{order.total?.toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.orderRow}>
                            <Text variant="bodyMedium" style={styles.orderLabel}>Status</Text>
                            <View style={styles.statusBadge}>
                                <Text variant="labelSmall" style={styles.statusText}>
                                    {order.status}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                <Text variant="bodySmall" style={styles.note}>
                    You will receive a notification when your order is shipped.
                </Text>
            </Animated.View>

            {/* Actions */}
            <View style={styles.actions}>
                <Button
                    mode="contained"
                    onPress={() => router.push('/orders' as any)}
                    style={styles.primaryButton}
                    contentStyle={styles.buttonContent}
                    icon={({ size, color }) => <LucidePackage size={size} color={color} />}
                >
                    View My Orders
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
        marginBottom: 24,
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
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#059669',
        fontWeight: '600',
    },
    note: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontStyle: 'italic',
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
        paddingVertical: 8,
    },
});
