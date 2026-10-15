import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
    LucideArrowLeft,
    LucideBox,
    LucideCreditCard,
    LucideMapPin,
    LucidePackage,
    LucideTruck
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OrderItemRow = {
    _id: string;
    productId: Id<"products">;
    sellerId: Id<"users">;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    subtotal: number;
};

function formatRemainingTime(ms: number) {
    if (ms <= 0) return 'Expired';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

export default function OrderDetailsScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { id: orderId } = useLocalSearchParams<{ id: Id<"orders"> }>();
    const { sessionToken } = useAuthStore();

    // Convex Query
    const order = useQuery(api.orders.get, sessionToken && orderId ? { sessionToken, id: orderId } : "skip");
    const retryPayment = useAction(api.orders.retryPayment);
    const cancelOrder = useMutation(api.orders.cancel);
    const ensureConversation = useMutation(api.chat.ensureConversation);
    const loading = order === undefined;
    const [now, setNow] = useState(Date.now());

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#F59E0B';
            case 'CONFIRMED': return '#3B82F6';
            case 'PROCESSING': return '#8B5CF6';
            case 'SHIPPED': return '#06B6D4';
            case 'DELIVERED': return '#10B981';
            case 'CANCELLED': return '#EF4444';
            case 'REFUNDED': return '#6B7280';
            default: return '#64748B';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return LucideBox;
            case 'CONFIRMED': return LucidePackage;
            case 'PROCESSING': return LucidePackage;
            case 'SHIPPED': return LucideTruck;
            case 'DELIVERED': return LucideBox;
            default: return LucideBox;
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPaymentMethod = (method: string) => {
        switch (method) {
            case 'COD': return 'Cash on Delivery';
            case 'GCASH': return 'GCash';
            case 'MAYA': return 'Maya';
            case 'CARD': return 'Credit/Debit Card';
            case 'BANK_TRANSFER': return 'Bank Transfer';
            default: return method;
        }
    };

    const handleRetryPayment = async () => {
        if (!sessionToken || !orderId) return;
        try {
            const result = await retryPayment({
                sessionToken,
                orderId,
                successUrl: Linking.createURL('payment-success', { queryParams: { orderId } }),
                cancelUrl: Linking.createURL('payment-cancelled', { queryParams: { orderId } }),
            });
            if ('error' in result) {
                Alert.alert('Payment Error', result.error);
                return;
            }
            await WebBrowser.openBrowserAsync(result.checkoutUrl, {
                dismissButtonStyle: 'cancel',
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            });
        } catch (error) {
            console.error('Failed to retry payment:', error);
            Alert.alert('Payment Error', 'Unable to retry payment right now. Please try again.');
        }
    };

    const handleCancelOrder = () => {
        Alert.alert(
            'Cancel Order',
            'Are you sure you want to cancel this order? This cannot be undone.',
            [
                { text: 'Keep Order', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        if (!sessionToken || !orderId) return;
                        try {
                            await cancelOrder({ sessionToken, orderId });
                        } catch {
                            Alert.alert('Error', 'Unable to cancel this order.');
                        }
                    },
                },
            ]
        );
    };

    const handleContactSeller = async () => {
        if (!sessionToken) {
            Alert.alert('Login required', 'Please log in to message the seller.');
            return;
        }

        const sellerId = order?.items?.[0]?.sellerId;
        if (!sellerId) {
            router.push('/(tabs)/messages');
            return;
        }

        try {
            const result = await ensureConversation({
                sessionToken,
                recipientId: sellerId,
            });

            router.push({
                pathname: '/chat/[id]',
                params: {
                    id: result.conversationId,
                    recipientName: 'Seller',
                    recipientId: sellerId,
                },
            });
        } catch (error) {
            console.error('Failed to open seller chat:', error);
            Alert.alert('Error', 'Unable to open chat right now.');
        }
    };

    const reservationRemainingMs = useMemo(() => {
        if (!order?.reservationExpiresAt) return null;
        return order.reservationExpiresAt - now;
    }, [order?.reservationExpiresAt, now]);

    const showReservationTimer = Boolean(
        order &&
        order.paymentMethod !== 'COD' &&
        order.paymentStatus !== 'PAID' &&
        order.status === 'PENDING' &&
        order.reservationExpiresAt
    );

    useEffect(() => {
        if (!showReservationTimer) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [showReservationTimer]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
                    Order not found
                </Text>
                <Button mode="text" onPress={() => router.back()}>Go Back</Button>
            </View>
        );
    }

    const StatusIcon = getStatusIcon(order.status);
    const canCancelOrder = order.status === 'PENDING' && order.paymentStatus !== 'PAID';

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.colors.elevation.level2 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Order Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Order Status Card */}
                <Card style={styles.statusCard}>
                    <Card.Content>
                        <View style={styles.statusHeader}>
                            <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                                <StatusIcon size={32} color={getStatusColor(order.status)} />
                            </View>
                            <View style={styles.statusInfo}>
                                <Chip
                                    textStyle={{ color: 'white', fontWeight: 'bold' }}
                                    style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}
                                >
                                    {order.status}
                                </Chip>
                                <Text variant="labelMedium" style={styles.orderNumber}>#{order.orderNumber}</Text>
                            </View>
                        </View>

                        <Text variant="bodySmall" style={styles.orderDate}>
                            Placed on {formatDate(order._creationTime)}
                        </Text>

                        {order.trackingNumber && (
                            <View style={styles.trackingInfo}>
                                <LucideTruck size={16} color="#64748B" />
                                <Text variant="bodySmall" style={styles.trackingText}>
                                    {order.courier}: {order.trackingNumber}
                                </Text>
                            </View>
                        )}

                        {showReservationTimer && reservationRemainingMs !== null && (
                            <View style={styles.reservationInfo}>
                                <Text variant="bodySmall" style={styles.reservationLabel}>
                                    Payment window remaining
                                </Text>
                                <Text
                                    variant="titleSmall"
                                    style={[
                                        styles.reservationValue,
                                        reservationRemainingMs > 0 ? styles.reservationActive : styles.reservationExpired,
                                    ]}
                                >
                                    {formatRemainingTime(reservationRemainingMs)}
                                </Text>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                {/* Order Items */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Order Items</Text>

                        {order.items.map((item: OrderItemRow, index: number) => (
                            <View key={item._id}>
                                <TouchableOpacity
                                    style={styles.orderItem}
                                    onPress={() => router.push(`/product/${item.productId}`)}
                                >
                                    <ExpoImage
                                        source={item.productImage ? { uri: item.productImage } : undefined}
                                        style={styles.itemImage}
                                        contentFit="cover"
                                    />
                                    <View style={styles.itemDetails}>
                                        <Text variant="bodyMedium" style={styles.itemName} numberOfLines={2}>
                                            {item.productName}
                                        </Text>
                                        <Text variant="bodySmall" style={styles.itemQuantity}>
                                            Qty: {item.quantity} x ₱{item.price.toLocaleString()}
                                        </Text>
                                    </View>
                                    <Text variant="titleSmall" style={styles.itemSubtotal}>
                                        ₱{item.subtotal.toLocaleString()}
                                    </Text>
                                </TouchableOpacity>
                                {index < order.items.length - 1 && <Divider style={styles.itemDivider} />}
                            </View>
                        ))}
                    </Card.Content>
                </Card>

                {/* Delivery Address */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <LucideMapPin size={20} color={theme.colors.primary} />
                            <Text variant="titleMedium" style={styles.sectionTitle}>Delivery Address</Text>
                        </View>

                        <Text variant="bodyMedium" style={styles.addressName}>{`${order.address?.firstName} ${order.address?.lastName}`}</Text>
                        <Text variant="bodySmall" style={styles.addressPhone}>{order.address?.phoneNumber}</Text>
                        <Text variant="bodySmall" style={styles.addressText}>
                            {order.address?.streetAddress}, {order.address?.barangay}
                        </Text>
                        <Text variant="bodySmall" style={styles.addressText}>
                            {order.address?.city}, {order.address?.province} {order.address?.postalCode || ''}
                        </Text>
                    </Card.Content>
                </Card>

                {/* Payment Information */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <LucideCreditCard size={20} color={theme.colors.primary} />
                            <Text variant="titleMedium" style={styles.sectionTitle}>Payment</Text>
                        </View>

                        <View style={styles.paymentRow}>
                            <Text variant="bodyMedium">Method</Text>
                            <Text variant="bodyMedium" style={styles.paymentValue}>
                                {formatPaymentMethod(order.paymentMethod)}
                            </Text>
                        </View>
                        <View style={styles.paymentRow}>
                            <Text variant="bodyMedium">Status</Text>
                            <Chip
                                textStyle={{ fontSize: 10 }}
                                style={[
                                    styles.paymentStatusChip,
                                    { backgroundColor: order.paymentStatus === 'PAID' ? '#10B98120' : '#F59E0B20' }
                                ]}
                            >
                                {order.paymentStatus}
                            </Chip>
                        </View>
                    </Card.Content>
                </Card>

                {/* Order Summary */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Order Summary</Text>

                        <View style={styles.summaryRow}>
                            <Text variant="bodyMedium" style={styles.summaryLabel}>Subtotal</Text>
                            <Text variant="bodyMedium">₱{order.subtotal.toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text variant="bodyMedium" style={styles.summaryLabel}>Shipping Fee</Text>
                            <Text variant="bodyMedium">₱{order.shippingFee.toLocaleString()}</Text>
                        </View>

                        <Divider style={styles.summaryDivider} />

                        <View style={styles.summaryRow}>
                            <Text variant="titleMedium" style={styles.totalLabel}>Total</Text>
                            <Text variant="titleLarge" style={styles.totalValue}>
                                ₱{order.total.toLocaleString()}
                            </Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Buyer Notes */}
                {order.buyerNotes && (
                    <Card style={styles.card}>
                        <Card.Content>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
                            <Text variant="bodyMedium" style={styles.notes}>{order.buyerNotes}</Text>
                        </Card.Content>
                    </Card>
                )}

                {/* Action Buttons */}
                <View style={styles.actions}>
                    {order.paymentMethod !== 'COD' && order.paymentStatus !== 'PAID' && order.status === 'PENDING' && (
                        <Button
                            mode="contained"
                            style={styles.actionButton}
                            onPress={handleRetryPayment}
                        >
                            Retry Payment
                        </Button>
                    )}
                    {canCancelOrder && (
                        <Button
                            mode="outlined"
                            style={styles.actionButton}
                            textColor="#EF4444"
                            onPress={handleCancelOrder}
                        >
                            Cancel Order
                        </Button>
                    )}
                    <Button
                        mode="outlined"
                        style={styles.actionButton}
                        onPress={handleContactSeller}
                    >
                        Contact Seller
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 15,
        elevation: 2,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    backButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    statusCard: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 1,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statusInfo: {
        flex: 1,
    },
    statusChip: {
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    orderNumber: {
        color: '#64748B',
    },
    orderDate: {
        color: '#94A3B8',
    },
    trackingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        gap: 8,
    },
    trackingText: {
        color: '#64748B',
    },
    reservationInfo: {
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    reservationLabel: {
        color: '#9A3412',
        marginBottom: 4,
    },
    reservationValue: {
        fontWeight: '700',
    },
    reservationActive: {
        color: '#C2410C',
    },
    reservationExpired: {
        color: '#B91C1C',
    },
    card: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 12,
    },
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontWeight: '500',
        color: '#1E293B',
    },
    itemQuantity: {
        color: '#64748B',
        marginTop: 4,
    },
    itemSubtotal: {
        fontWeight: 'bold',
        color: '#0061A4',
    },
    itemDivider: {
        backgroundColor: '#F1F5F9',
    },
    addressName: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    addressPhone: {
        color: '#64748B',
        marginTop: 2,
    },
    addressText: {
        color: '#64748B',
        marginTop: 2,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    paymentValue: {
        fontWeight: '500',
    },
    paymentStatusChip: {
        height: 24,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryLabel: {
        color: '#64748B',
    },
    summaryDivider: {
        marginVertical: 12,
        backgroundColor: '#E2E8F0',
    },
    totalLabel: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    totalValue: {
        fontWeight: 'bold',
        color: '#0061A4',
    },
    notes: {
        color: '#64748B',
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
    },
});
