import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import {
    LucideArrowLeft,
    LucideCheck,
    LucideMapPin,
    LucidePlus,
    LucideTrash2
} from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Button, FAB, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddressesScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { convexUser } = useAuthStore();

    // Convex Hooks
    const addresses = useQuery(api.users.listAddresses, { userId: convexUser?._id as any }) || [];
    const deleteAddressMutation = useMutation(api.users.deleteAddress);
    const setDefaultAddressMutation = useMutation(api.users.setDefaultAddress);

    const loading = addresses === undefined;

    const handleDelete = (id: string, fullName: string) => {
        Alert.alert(
            'Delete Address',
            `Are you sure you want to delete the address for "${fullName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAddressMutation({ id: id as any });
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to delete address');
                        }
                    }
                }
            ]
        );
    };

    const handleSetDefault = async (id: string) => {
        try {
            await setDefaultAddressMutation({ id: id as any, userId: convexUser?._id as any });
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to set default address');
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, item.isDefault && styles.defaultCard]}
            onPress={() => router.push(`/profile/address/${item._id}` as any)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                    <LucideMapPin size={18} color={theme.colors.primary} />
                    <Text variant="titleMedium" style={styles.name}>{item.fullName}</Text>
                    {item.isDefault && (
                        <View style={[styles.defaultBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Default</Text>
                        </View>
                    )}
                </View>
                <Text variant="bodySmall" style={styles.phone}>{item.phoneNumber}</Text>
            </View>

            <Text variant="bodyMedium" style={styles.address} numberOfLines={2}>
                {item.streetAddress}, {item.barangay}
            </Text>
            <Text variant="bodySmall" style={styles.cityProvince}>
                {item.city}, {item.province} {item.postalCode || ''}
            </Text>

            <View style={styles.actions}>
                {!item.isDefault && (
                    <Button
                        icon={({ size, color }) => <LucideCheck size={size} color={color} />}
                        mode="text"
                        compact
                        onPress={() => handleSetDefault(item._id)}
                    >
                        Set Default
                    </Button>
                )}
                <Button
                    icon={({ size, color }) => <LucideTrash2 size={size} color={theme.colors.error} />}
                    mode="text"
                    textColor={theme.colors.error}
                    compact
                    onPress={() => handleDelete(item._id, item.fullName)}
                >
                    Delete
                </Button>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.colors.elevation.level2 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>My Addresses</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={addresses}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 80 }
                    ]}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={() => { }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LucideMapPin size={64} color="#CBD5E1" />
                            <Text variant="titleMedium" style={styles.emptyText}>No addresses yet</Text>
                            <Text variant="bodyMedium" style={styles.emptySubtext}>
                                Add your first delivery address
                            </Text>
                            <Button
                                mode="contained"
                                style={styles.emptyButton}
                                onPress={() => router.push('/profile/address/new' as any)}
                            >
                                Add Address
                            </Button>
                        </View>
                    }
                />
            )}

            <FAB
                icon={({ size, color }) => <LucidePlus size={24} color={color} />}
                style={[styles.fab, { bottom: insets.bottom + 20 }]}
                onPress={() => router.push('/profile/address/new' as any)}
                label="Add New"
            />
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
        elevation: 2,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
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
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
    },
    defaultCard: {
        borderWidth: 2,
        borderColor: '#0061A4',
    },
    cardHeader: {
        marginBottom: 8,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        fontWeight: 'bold',
        flex: 1,
    },
    defaultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    phone: {
        color: '#64748B',
        marginTop: 4,
        marginLeft: 26,
    },
    address: {
        color: '#334155',
        marginLeft: 26,
    },
    cityProvince: {
        color: '#64748B',
        marginLeft: 26,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 8,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        backgroundColor: '#0061A4',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyText: {
        marginTop: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    emptySubtext: {
        marginTop: 4,
        color: '#64748B',
    },
    emptyButton: {
        marginTop: 20,
    },
});
