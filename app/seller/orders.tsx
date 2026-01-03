import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { LucideArrowLeft, LucideClipboardList, LucidePhone } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Menu, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellerOrdersScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { convexUser } = useAuthStore();

    // Convex Hooks
    const orders = useQuery(api.orders.listIncomingOrders, { sellerId: convexUser?._id as any }) || [];
    const updateOrderStatus = useMutation(api.orders.updateStatus);

    const loading = orders === undefined;
    const [menuVisible, setMenuVisible] = useState<string | null>(null);

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        setMenuVisible(null);
        try {
            await updateOrderStatus({
                orderId: orderId as any,
                status: newStatus as any,
            });
            Alert.alert('Success', `Order status updated to ${newStatus}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#F59E0B';
            case 'CONFIRMED': return '#3B82F6';
            case 'SHIPPED': return '#8B5CF6';
            case 'DELIVERED': return '#10B981';
            case 'CANCELLED': return '#EF4444';
            default: return '#64748B';
        }
    };

    const renderOrderItem = ({ item }: { item: any }) => {
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
                        <Text variant="titleSmall">Buyer: {item.buyer?.firstName} {item.buyer?.lastName}</Text>
                        <View style={styles.contactRow}>
                            <LucidePhone size={14} color={theme.colors.primary} />
                            <Text variant="bodySmall" style={styles.contactText}>{item.buyer?.phoneNumber || 'No phone'}</Text>
                        </View>
                        <Text variant="bodySmall" style={styles.addressText} numberOfLines={2}>
                            {item.address?.streetAddress}, {item.address?.barangay}, {item.address?.city}
                        </Text>
                    </View>

                    <Divider style={styles.divider} />

                    {/* Product Preview */}
                    {item.items.map((orderItem: any) => (
                        <View key={orderItem._id} style={styles.productRow}>
                            <Text variant="bodyMedium" style={{ flex: 1 }}>{orderItem.productName}</Text>
                            <Text variant="bodyMedium">x{orderItem.quantity}</Text>
                            <Text variant="bodyMedium" style={styles.itemPrice}>₱{orderItem.subtotal.toLocaleString()}</Text>
                        </View>
                    ))}

                    <View style={styles.orderFooter}>
                        <Text variant="titleMedium">Total: ₱{item.total.toLocaleString()}</Text>

                        <Menu
                            visible={menuVisible === item._id}
                            onDismiss={() => setMenuVisible(null)}
                            anchor={
                                <Button
                                    mode="outlined"
                                    onPress={() => setMenuVisible(item._id)}
                                    style={styles.actionBtn}
                                >
                                    Update Status
                                </Button>
                            }
                        >
                            <Menu.Item onPress={() => handleUpdateStatus(item._id, 'CONFIRMED')} title="Confirm Order" />
                            <Menu.Item onPress={() => handleUpdateStatus(item._id, 'SHIPPED')} title="Mark Shipped" />
                            <Menu.Item onPress={() => handleUpdateStatus(item._id, 'DELIVERED')} title="Mark Delivered" />
                            <Divider />
                            <Menu.Item onPress={() => handleUpdateStatus(item._id, 'CANCELLED')} title="Cancel Order" titleStyle={{ color: 'red' }} />
                        </Menu>
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
                    data={orders}
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
    itemPrice: {
        width: 80,
        textAlign: 'right',
        fontWeight: '600',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    actionBtn: {
        borderRadius: 8,
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
});
