import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/authStore';
import { Order } from '@/types';
import { useAction, useQuery } from 'convex/react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { LucideArrowLeft, LucideBox, LucideChevronRight } from 'lucide-react-native';
import React from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrdersScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { sessionToken } = useAuthStore();

    // Convex Query
    const orders = useQuery(api.orders.listByBuyer, sessionToken ? { sessionToken } : "skip");
    const retryPayment = useAction(api.orders.retryPayment);
    const loading = orders === undefined;
    const orderList = orders || [];

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

    const handleRetryPayment = async (orderId: Id<"orders">) => {
        if (!sessionToken) return;
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

    const renderOrderItem = ({ item }: { item: Order }) => {
        const showRetry = item.paymentMethod !== 'COD' && item.paymentStatus !== 'PAID' && item.status === 'PENDING';
        return (
            <Card style={styles.orderCard} onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item._id } })}>
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

                    <View style={styles.itemsPreview}>
                        <Text variant="bodyMedium" numberOfLines={1}>
                            {item.items[0]?.productName}
                            {item.items.length > 1 && ` + ${item.items.length - 1} more items`}
                        </Text>
                        <LucideChevronRight size={20} color={theme.colors.outline} />
                    </View>

                    <View style={styles.orderFooter}>
                        <Text variant="bodySmall" style={styles.itemCount}>{item.items.length} items</Text>
                        <Text variant="titleMedium" style={styles.totalPrice}>₱{item.total.toLocaleString()}</Text>
                    </View>
                    {showRetry && (
                        <TouchableOpacity onPress={() => handleRetryPayment(item._id)}>
                            <Text style={[styles.retryText, { color: theme.colors.primary }]}>Retry Payment</Text>
                        </TouchableOpacity>
                    )}
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
                <Text variant="titleLarge" style={styles.headerTitle}>My Orders</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={orderList}
                    renderItem={renderOrderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={() => { }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LucideBox size={64} color={theme.colors.outline} style={{ opacity: 0.3 }} />
                            <Text variant="titleMedium" style={styles.emptyText}>No orders yet</Text>
                            <Text variant="bodySmall" style={styles.emptySubtext}>
                                When you buy something, it will appear here.
                            </Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                                <Text style={[styles.browseText, { color: theme.colors.primary }]}>
                                    Browse Products
                                </Text>
                            </TouchableOpacity>
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
        marginBottom: 12,
        backgroundColor: 'white',
        borderRadius: 12,
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
    itemsPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    itemCount: {
        color: '#64748B',
    },
    totalPrice: {
        fontWeight: 'bold',
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
    browseText: {
        marginTop: 20,
        fontWeight: 'bold',
    },
    retryText: {
        marginTop: 10,
        fontWeight: '700',
    }
});
