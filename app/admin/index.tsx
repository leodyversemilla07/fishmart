import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import {
    LucideActivity,
    LucideAlertCircle,
    LucideClock,
    LucidePackage,
    LucideSettings,
    LucideShoppingBag,
    LucideShieldCheck,
    LucideUsers,
} from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Divider, List, Text, useTheme } from 'react-native-paper';

function formatCurrency(value: number) {
    return `₱${value.toLocaleString()}`;
}

export default function AdminDashboardScreen() {
    const { user, sessionToken } = useAuthStore();
    const theme = useTheme();
    const stats = useQuery(
        api.admin.getDashboardStats,
        sessionToken && user?.role === 'ADMIN' ? { sessionToken } : 'skip'
    );

    if (!user || user.role !== 'ADMIN') return null;

    const showComingSoon = (feature: string) => {
        Alert.alert('Coming soon', `${feature} management will be added next.`);
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                <Text variant="headlineSmall" style={styles.greeting}>
                    Welcome, {user.firstName}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                    Fishmart Admin Panel
                </Text>

                {stats === undefined ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>Loading platform metrics...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.statsGrid}>
                            <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}> 
                                <Card.Content style={styles.statContent}>
                                    <LucideUsers size={28} color={theme.colors.primary} />
                                    <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.primary }]}>{stats.users.total}</Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Users</Text>
                                    <Text variant="labelSmall" style={styles.statSubtext}>{stats.users.sellers} sellers</Text>
                                </Card.Content>
                            </Card>
                            <Card style={[styles.statCard, { backgroundColor: theme.colors.tertiaryContainer }]}> 
                                <Card.Content style={styles.statContent}>
                                    <LucidePackage size={28} color={theme.colors.tertiary} />
                                    <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.tertiary }]}>{stats.products.total}</Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Products</Text>
                                    <Text variant="labelSmall" style={styles.statSubtext}>{stats.products.active} active</Text>
                                </Card.Content>
                            </Card>
                            <Card style={[styles.statCard, { backgroundColor: theme.colors.secondaryContainer }]}> 
                                <Card.Content style={styles.statContent}>
                                    <LucideShoppingBag size={28} color={theme.colors.secondary} />
                                    <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.secondary }]}>{stats.orders.total}</Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Orders</Text>
                                    <Text variant="labelSmall" style={styles.statSubtext}>{stats.orders.pending} pending</Text>
                                </Card.Content>
                            </Card>
                            <Card style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}> 
                                <Card.Content style={styles.statContent}>
                                    <LucideActivity size={28} color="#059669" />
                                    <Text variant="titleLarge" style={[styles.statNumber, { color: '#059669' }]}>{formatCurrency(stats.orders.revenue)}</Text>
                                    <Text variant="labelSmall" style={{ color: '#047857' }}>Paid Revenue</Text>
                                    <Text variant="labelSmall" style={styles.statSubtext}>{stats.orders.paid} paid orders</Text>
                                </Card.Content>
                            </Card>
                        </View>

                        <Card style={styles.summaryCard}>
                            <Card.Content>
                                <View style={styles.summaryHeader}>
                                    <LucideClock size={18} color={theme.colors.primary} />
                                    <Text variant="titleMedium" style={styles.summaryTitle}>Recent Orders</Text>
                                </View>
                                <Divider style={styles.divider} />
                                {stats.recentOrders.length === 0 ? (
                                    <Text variant="bodyMedium" style={styles.muted}>No orders yet.</Text>
                                ) : (
                                    stats.recentOrders.map((order) => (
                                        <View key={order._id} style={styles.recentOrderRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text variant="labelLarge">#{order.orderNumber}</Text>
                                                <Text variant="bodySmall" style={styles.muted}>{order.status} • {order.paymentStatus}</Text>
                                            </View>
                                            <Text variant="labelLarge">{formatCurrency(order.total)}</Text>
                                        </View>
                                    ))
                                )}
                            </Card.Content>
                        </Card>
                    </>
                )}

                <List.Section style={styles.listSection}>
                    <List.Subheader>Manage</List.Subheader>
                    <List.Item
                        title="Manage Users"
                        description={stats ? `${stats.users.active} active • ${stats.users.verified} verified` : 'View, verify, suspend user accounts'}
                        left={() => <LucideUsers size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => showComingSoon('User')}
                    />
                    <Divider />
                    <List.Item
                        title="Manage Categories"
                        description="Add, edit, or disable product categories"
                        left={() => <LucidePackage size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => showComingSoon('Category')}
                    />
                    <Divider />
                    <List.Item
                        title="All Orders"
                        description={stats ? `${stats.orders.total} total • ${stats.orders.pending} pending` : 'View all platform orders'}
                        left={() => <LucideShoppingBag size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => router.push('/admin/orders' as any)}
                    />
                    <Divider />
                    <List.Item
                        title="Reservation Metrics"
                        description="Monitor unpaid reservation expiry and release stock"
                        left={() => <LucideShieldCheck size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => router.push('/profile/reservations')}
                    />
                </List.Section>

                <List.Section style={styles.listSection}>
                    <List.Subheader>Moderation</List.Subheader>
                    <List.Item
                        title="Flagged Content"
                        description="Review reported products and reviews"
                        left={() => <LucideAlertCircle size={24} color={theme.colors.error} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => showComingSoon('Flagged content')}
                    />
                    <Divider />
                    <List.Item
                        title="Settings"
                        description="Platform configuration"
                        left={() => <LucideSettings size={24} color={theme.colors.outline} />}
                        right={() => <List.Icon icon="chevron-right" />}
                        onPress={() => showComingSoon('Settings')}
                    />
                </List.Section>

                <View style={{ height: 40 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    greeting: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    loadingCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statCard: {
        width: '48%',
        borderRadius: 15,
        marginBottom: 12,
    },
    statContent: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    statNumber: {
        fontWeight: 'bold',
        marginTop: 8,
    },
    statSubtext: {
        color: '#64748B',
        marginTop: 2,
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        marginBottom: 16,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryTitle: {
        fontWeight: 'bold',
    },
    divider: {
        marginVertical: 12,
    },
    muted: {
        color: '#64748B',
    },
    recentOrderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    listSection: {
        backgroundColor: 'white',
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 1,
    },
});
