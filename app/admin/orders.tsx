import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from 'convex/react';
import { LucideClipboardList, LucideMapPin, LucidePhone } from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';

interface AdminOrderItem {
    _id: Id<'order_items'>;
    productName: string;
    quantity: number;
    subtotal: number;
}

interface AdminOrder {
    _id: Id<'orders'>;
    _creationTime: number;
    orderNumber: string;
    total: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    buyer: {
        email: string;
        firstName?: string;
        middleName?: string;
        lastName?: string;
        phoneNumber?: string;
    } | null;
    address: {
        phoneNumber?: string;
        streetAddress?: string;
        barangay?: string;
        city?: string;
        province?: string;
    } | null;
    items: AdminOrderItem[];
}

function formatCurrency(value: number) {
    return `₱${value.toLocaleString()}`;
}

function getStatusColor(status: string) {
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
}

export default function AdminOrdersScreen() {
    const theme = useTheme();
    const { sessionToken, user } = useAuthStore();
    const ordersQuery = useQuery(
        api.admin.listOrders,
        sessionToken && user?.role === 'ADMIN' ? { sessionToken } : 'skip'
    );
    const orders = (ordersQuery ?? []) as AdminOrder[];

    if (ordersQuery === undefined) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const renderOrder = ({ item }: { item: AdminOrder }) => {
        const buyerName = item.buyer
            ? `${item.buyer.firstName || ''} ${item.buyer.middleName ? item.buyer.middleName + ' ' : ''}${item.buyer.lastName || ''}`.trim()
            : 'Unknown buyer';

        return (
            <Card style={styles.orderCard}>
                <Card.Content>
                    <View style={styles.orderHeader}>
                        <View style={{ flex: 1 }}>
                            <Text variant="labelSmall" style={styles.orderNumber}>#{item.orderNumber}</Text>
                            <Text variant="bodySmall" style={styles.muted}>
                                {new Date(item._creationTime).toLocaleString()}
                            </Text>
                        </View>
                        <Chip
                            compact
                            textStyle={{ color: 'white', fontSize: 10 }}
                            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
                        >
                            {item.status}
                        </Chip>
                    </View>

                    <Divider style={styles.divider} />

                    <Text variant="titleSmall">{buyerName || item.buyer?.email || 'Unknown buyer'}</Text>
                    <Text variant="bodySmall" style={styles.muted}>{item.buyer?.email}</Text>
                    <View style={styles.metaRow}>
                        <LucidePhone size={14} color={theme.colors.primary} />
                        <Text variant="bodySmall" style={styles.metaText}>
                            {item.address?.phoneNumber || item.buyer?.phoneNumber || 'No phone'}
                        </Text>
                    </View>
                    <View style={styles.metaRow}>
                        <LucideMapPin size={14} color={theme.colors.primary} />
                        <Text variant="bodySmall" style={styles.metaText} numberOfLines={2}>
                            {item.address
                                ? `${item.address.streetAddress}, ${item.address.barangay}, ${item.address.city}, ${item.address.province}`
                                : 'No address'}
                        </Text>
                    </View>

                    <Divider style={styles.divider} />

                    {item.items.map((orderItem) => (
                        <View key={orderItem._id} style={styles.productRow}>
                            <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>{orderItem.productName}</Text>
                            <Text variant="bodyMedium" style={styles.quantity}>x{orderItem.quantity}</Text>
                            <Text variant="bodyMedium" style={styles.itemPrice}>{formatCurrency(orderItem.subtotal)}</Text>
                        </View>
                    ))}

                    <View style={styles.footerRow}>
                        <View>
                            <Text variant="bodySmall" style={styles.muted}>Payment</Text>
                            <Text variant="labelLarge">{item.paymentMethod} • {item.paymentStatus}</Text>
                        </View>
                        <Text variant="titleMedium" style={[styles.total, { color: theme.colors.primary }]}>
                            {formatCurrency(item.total)}
                        </Text>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={orders}
                renderItem={renderOrder}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <LucideClipboardList size={64} color={theme.colors.outline} style={{ opacity: 0.35 }} />
                        <Text variant="titleMedium" style={styles.emptyTitle}>No orders yet</Text>
                        <Text variant="bodyMedium" style={styles.muted}>Platform orders will appear here.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        padding: 16,
    },
    orderCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    orderNumber: {
        color: '#64748B',
        fontWeight: 'bold',
    },
    statusChip: {
        height: 24,
    },
    muted: {
        color: '#64748B',
    },
    divider: {
        marginVertical: 12,
        backgroundColor: '#F1F5F9',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    metaText: {
        flex: 1,
        color: '#475569',
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
        width: 90,
        textAlign: 'right',
        fontWeight: '600',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    total: {
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
        marginTop: 80,
    },
    emptyTitle: {
        marginTop: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
});
