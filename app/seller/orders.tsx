import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { LucideArrowLeft, LucideCheckCircle, LucideClipboardList, LucidePackage, LucidePhone, LucideTruck, LucideX, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
type SellerOrderItem = { _id: string; productName: string; quantity: number; subtotal: number };
type SellerOrder = {
    _id: Id<"orders">;
    _creationTime: number;
    orderNumber: string;
    status: OrderStatus;
    total: number;
    trackingNumber?: string;
    courier?: string;
    buyer?: { firstName?: string; middleName?: string; lastName?: string; phoneNumber?: string } | null;
    address?: { phoneNumber?: string; streetAddress?: string; barangay?: string; city?: string; province?: string } | null;
    items: SellerOrderItem[];
};
type IncomingSellerOrder = Omit<SellerOrder, 'items'> & { items: SellerOrderItem[] };

const STATUS_FLOW: Record<OrderStatus, { next: OrderStatus | null; label: string; icon: LucideIcon }> = {
    PENDING: { next: 'CONFIRMED', label: 'Confirm Order', icon: LucideCheckCircle },
    CONFIRMED: { next: 'PROCESSING', label: 'Start Processing', icon: LucidePackage },
    PROCESSING: { next: 'SHIPPED', label: 'Mark as Shipped', icon: LucideTruck },
    SHIPPED: { next: 'DELIVERED', label: 'Mark Delivered', icon: LucideCheckCircle },
    DELIVERED: { next: null, label: 'Completed', icon: LucideCheckCircle },
    CANCELLED: { next: null, label: 'Cancelled', icon: LucideX },
    REFUNDED: { next: null, label: 'Refunded', icon: LucideX },
};

export default function SellerOrdersScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { sessionToken } = useAuthStore();

    // Convex Hooks
    const orders = useQuery(api.orders.listIncomingOrders, sessionToken ? { sessionToken } : "skip");
    const updateOrderStatus = useMutation(api.orders.updateStatus);

    const loading = orders === undefined;
    const sellerOrders: SellerOrder[] = (orders ?? []).flatMap((order: IncomingSellerOrder | null) => {
        if (!order) return [];
        return [{
            _id: order._id,
            _creationTime: order._creationTime,
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.total,
            trackingNumber: order.trackingNumber,
            courier: order.courier,
            buyer: order.buyer,
            address: order.address,
            items: order.items.map((orderItem: SellerOrderItem) => ({
                _id: orderItem._id,
                productName: orderItem.productName,
                quantity: orderItem.quantity,
                subtotal: orderItem.subtotal,
            })),
        }];
    });
    
    // Shipping modal state
    const [shippingModalVisible, setShippingModalVisible] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<Id<"orders"> | null>(null);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courier, setCourier] = useState('');
    const [updating, setUpdating] = useState(false);

    const handleUpdateStatus = async (orderId: Id<"orders">, newStatus: OrderStatus, tracking?: string, courierName?: string) => {
        if (!sessionToken) {
            Alert.alert('Error', 'Session expired. Please log in again.');
            return;
        }

        setUpdating(true);
        try {
            await updateOrderStatus({
                sessionToken,
                orderId,
                status: newStatus,
                trackingNumber: tracking,
                courier: courierName,
            });
            Alert.alert('Success', `Order status updated to ${newStatus}`);
        } catch {
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleNextStatus = (order: SellerOrder) => {
        const currentStatus = order.status;
        const nextStatus = STATUS_FLOW[currentStatus]?.next;

        if (!nextStatus) return;

        // If shipping, show modal for tracking number
        if (nextStatus === 'SHIPPED') {
            setSelectedOrderId(order._id);
            setTrackingNumber('');
            setCourier('');
            setShippingModalVisible(true);
            return;
        }

        // Confirm before status change
        Alert.alert(
            'Update Order Status',
            `Are you sure you want to mark this order as ${nextStatus}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => handleUpdateStatus(order._id, nextStatus) },
            ]
        );
    };

    const handleShipOrder = () => {
        if (!selectedOrderId) return;
        
        setShippingModalVisible(false);
        handleUpdateStatus(selectedOrderId, 'SHIPPED', trackingNumber || undefined, courier || undefined);
        setSelectedOrderId(null);
    };

    const handleCancelOrder = (orderId: Id<"orders">) => {
        Alert.alert(
            'Cancel Order',
            'Are you sure you want to cancel this order? This action cannot be undone.',
            [
                { text: 'No', style: 'cancel' },
                { 
                    text: 'Yes, Cancel', 
                    style: 'destructive',
                    onPress: () => handleUpdateStatus(orderId, 'CANCELLED') 
                },
            ]
        );
    };

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

    const renderOrderItem = ({ item }: { item: SellerOrder }) => {
        const currentStatus = item.status;
        const statusInfo = STATUS_FLOW[currentStatus];
        const canProgress = statusInfo?.next && currentStatus !== 'CANCELLED' && currentStatus !== 'DELIVERED';
        const canCancel = currentStatus === 'PENDING' || currentStatus === 'CONFIRMED';

        return (
            <Card style={styles.orderCard}>
                <Card.Content>
                    <View style={styles.orderHeader}>
                        <View>
                            <Text variant="labelSmall" style={styles.orderNumber}>#{item.orderNumber}</Text>
                            <Text variant="bodySmall" style={styles.orderDate}>
                                {new Date(item._creationTime).toLocaleDateString()}
                            </Text>
                        </View>
                        <Chip
                            textStyle={{ color: 'white', fontSize: 10 }}
                            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
                        >
                            {item.status}
                        </Chip>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Buyer Info */}
                    <View style={styles.buyerInfo}>
                        <Text variant="titleSmall">
                            {item.buyer?.firstName} {item.buyer?.middleName ? item.buyer?.middleName + ' ' : ''}{item.buyer?.lastName}
                        </Text>
                        <View style={styles.contactRow}>
                            <LucidePhone size={14} color={theme.colors.primary} />
                            <Text variant="bodySmall" style={styles.contactText}>
                                {item.address?.phoneNumber || item.buyer?.phoneNumber || 'No phone'}
                            </Text>
                        </View>
                        <Text variant="bodySmall" style={styles.addressText} numberOfLines={2}>
                            {item.address?.streetAddress}, {item.address?.barangay}, {item.address?.city}, {item.address?.province}
                        </Text>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Product List */}
                    {item.items.map((orderItem) => (
                        <View key={orderItem._id} style={styles.productRow}>
                            <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>{orderItem.productName}</Text>
                            <Text variant="bodyMedium" style={styles.quantity}>x{orderItem.quantity}</Text>
                            <Text variant="bodyMedium" style={styles.itemPrice}>₱{orderItem.subtotal.toLocaleString()}</Text>
                        </View>
                    ))}

                    {/* Tracking Info (if shipped) */}
                    {item.trackingNumber && (
                        <View style={styles.trackingInfo}>
                            <LucideTruck size={14} color="#06B6D4" />
                            <Text variant="bodySmall" style={styles.trackingText}>
                                {item.courier ? `${item.courier}: ` : ''}{item.trackingNumber}
                            </Text>
                        </View>
                    )}

                    <View style={styles.orderFooter}>
                        <View>
                            <Text variant="bodySmall" style={styles.totalLabel}>Total Amount</Text>
                            <Text variant="titleMedium" style={[styles.totalAmount, { color: theme.colors.primary }]}>
                                ₱{item.total.toLocaleString()}
                            </Text>
                        </View>

                        <View style={styles.actionButtons}>
                            {canCancel && (
                                <Button
                                    mode="outlined"
                                    onPress={() => handleCancelOrder(item._id)}
                                    style={styles.cancelBtn}
                                    textColor="#EF4444"
                                    compact
                                >
                                    Cancel
                                </Button>
                            )}
                            {canProgress && (
                                <Button
                                    mode="contained"
                                    onPress={() => handleNextStatus(item)}
                                    style={styles.actionBtn}
                                    loading={updating}
                                    disabled={updating}
                                    icon={({ size, color }) => {
                                        const IconComponent = statusInfo.icon;
                                        return <IconComponent size={size} color={color} />;
                                    }}
                                >
                                    {statusInfo.label}
                                </Button>
                            )}
                        </View>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Incoming Orders</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={sellerOrders}
                    renderItem={renderOrderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={() => { }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LucideClipboardList size={64} color={theme.colors.outline} style={{ opacity: 0.3 }} />
                            <Text variant="titleMedium" style={styles.emptyText}>No incoming orders</Text>
                            <Text variant="bodySmall" style={styles.emptySubtext}>
                                When buyers order your products, they will appear here.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Shipping Modal */}
            <Modal visible={shippingModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text variant="titleLarge" style={styles.modalTitle}>Shipping Details</Text>
                            <TouchableOpacity onPress={() => setShippingModalVisible(false)}>
                                <LucideX size={24} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text variant="bodyMedium" style={styles.modalHint}>
                                Add tracking information to help the buyer track their order.
                            </Text>

                            <TextInput
                                label="Courier (Optional)"
                                value={courier}
                                onChangeText={setCourier}
                                mode="outlined"
                                style={styles.modalInput}
                                placeholder="e.g. J&T, LBC, Grab Express"
                                outlineStyle={{ borderRadius: 12 }}
                            />

                            <TextInput
                                label="Tracking Number (Optional)"
                                value={trackingNumber}
                                onChangeText={setTrackingNumber}
                                mode="outlined"
                                style={styles.modalInput}
                                placeholder="Enter tracking number"
                                outlineStyle={{ borderRadius: 12 }}
                            />
                        </View>

                        <View style={styles.modalFooter}>
                            <Button
                                mode="outlined"
                                onPress={() => setShippingModalVisible(false)}
                                style={styles.modalBtn}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleShipOrder}
                                style={styles.modalBtn}
                                loading={updating}
                            >
                                Mark as Shipped
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontWeight: 'bold',
    },
    backButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
    },
    orderCard: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        elevation: 1,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderNumber: {
        color: '#64748B',
        fontWeight: 'bold',
    },
    orderDate: {
        color: '#94A3B8',
        marginTop: 2,
    },
    statusChip: {
        height: 24,
    },
    divider: {
        marginVertical: 12,
        backgroundColor: '#F1F5F9',
    },
    buyerInfo: {
        marginBottom: 4,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    contactText: {
        marginLeft: 6,
        color: '#475569',
    },
    addressText: {
        color: '#64748B',
        marginTop: 6,
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    quantity: {
        width: 40,
        textAlign: 'center',
        color: '#64748B',
    },
    itemPrice: {
        width: 80,
        textAlign: 'right',
        fontWeight: '600',
    },
    trackingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        padding: 10,
        backgroundColor: '#F0FDFA',
        borderRadius: 8,
    },
    trackingText: {
        color: '#0D9488',
        fontWeight: '500',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    totalLabel: {
        color: '#64748B',
    },
    totalAmount: {
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        borderRadius: 8,
    },
    cancelBtn: {
        borderRadius: 8,
        borderColor: '#FCA5A5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    emptySubtext: {
        textAlign: 'center',
        color: '#64748B',
        marginTop: 8,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    modalBody: {
        padding: 20,
    },
    modalHint: {
        color: '#64748B',
        marginBottom: 20,
    },
    modalInput: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    modalBtn: {
        flex: 1,
        borderRadius: 12,
    },
});
