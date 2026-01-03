import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { Notification } from '@/types';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import {
    LucideArrowLeft,
    LucideBell,
    LucideCheckCircle2,
    LucideClock,
    LucideMessageCircle,
    LucidePackage
} from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { convexUser } = useAuthStore();

    // Convex Hooks
    const notifications = useQuery(api.notifications.list, convexUser ? { userId: convexUser._id as any } : "skip") || [];
    const markAsReadMutation = useMutation(api.notifications.markAsRead);
    const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);

    const loading = notifications === undefined;

    const handleNotificationPress = async (notification: Notification) => {
        if (!notification.isRead) {
            await markAsReadMutation({ id: notification._id });
        }

        // Navigate based on type
        if (notification.type.startsWith('ORDER')) {
            router.push('/orders' as any);
        } else if (notification.type === 'NEW_MESSAGE') {
            router.push('/(tabs)/messages' as any);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (convexUser?._id) {
            await markAllAsReadMutation({ userId: convexUser._id as any });
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'NEW_ORDER':
            case 'ORDER_UPDATE':
                return <LucidePackage size={20} color={theme.colors.primary} />;
            case 'NEW_MESSAGE':
                return <LucideMessageCircle size={20} color="#10B981" />;
            case 'PAYMENT_SUCCESS':
                return <LucideCheckCircle2 size={20} color="#3B82F6" />;
            default:
                return <LucideBell size={20} color="#64748B" />;
        }
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const date = new Date(item._creationTime);
        const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <TouchableOpacity
                style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
                onPress={() => handleNotificationPress(item)}
            >
                <View style={[styles.iconContainer, { backgroundColor: item.isRead ? '#F1F5F9' : theme.colors.primaryContainer }]}>
                    {getIcon(item.type)}
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.itemHeader}>
                        <Text variant="titleSmall" style={[styles.title, !item.isRead && styles.unreadText]}>
                            {item.title}
                        </Text>
                        {!item.isRead && <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]} />}
                    </View>
                    <Text variant="bodyMedium" style={styles.message} numberOfLines={2}>
                        {item.message}
                    </Text>
                    <View style={styles.itemFooter}>
                        <LucideClock size={12} color="#94A3B8" />
                        <Text variant="bodySmall" style={styles.timeText}>{timeStr}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const hasUnread = notifications.some((n: Notification) => !n.isRead);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity onPress={handleMarkAllAsRead} disabled={!hasUnread}>
                    <Text style={{ color: hasUnread ? theme.colors.primary : '#94A3B8', fontWeight: '600' }}>
                        Read All
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={() => { }} />
                    }
                    ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconCircle}>
                                <LucideBell size={48} color="#CBD5E1" />
                            </View>
                            <Text variant="titleMedium" style={styles.emptyTitle}>No notifications yet</Text>
                            <Text variant="bodyMedium" style={styles.emptySubtitle}>
                                We'll let you know when something important happens.
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
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontWeight: 'bold',
    },
    backButton: {
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        flexGrow: 1,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
    },
    unreadItem: {
        backgroundColor: '#F8FAFC',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        color: '#475569',
        fontWeight: '500',
    },
    unreadText: {
        color: '#1E293B',
        fontWeight: 'bold',
    },
    unreadBadge: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    message: {
        color: '#64748B',
        marginBottom: 8,
    },
    itemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        color: '#94A3B8',
    },
    divider: {
        backgroundColor: '#F1F5F9',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    emptySubtitle: {
        textAlign: 'center',
        color: '#64748B',
    },
});
