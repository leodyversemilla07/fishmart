import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { LucideArrowLeft, LucideEdit, LucidePlus, LucideStore, LucideTrash2 } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, FAB, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyListingsScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { convexUser, sessionToken } = useAuthStore();

    // Convex Hooks
    const productsQuery = useQuery(
        api.products.list,
        convexUser?._id ? { sellerId: convexUser._id } : "skip"
    );
    const products = productsQuery ?? [];
    type ListingProduct = NonNullable<(typeof products)[number]>;
    const deleteProduct = useMutation(api.products.deleteProduct);

    const loading = productsQuery === undefined;

    const handleDelete = (id: ListingProduct["_id"], name: string) => {
        Alert.alert(
            'Delete Product',
            `Are you sure you want to delete "${name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!sessionToken) return;
                            await deleteProduct({ sessionToken, id });
                        } catch (err) {
                            const message = err instanceof Error ? err.message : 'Failed to delete product';
                            Alert.alert('Error', message);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: ListingProduct }) => {
        const coverImage = item.images && item.images.length > 0 ? item.images[0].imageUrl : null;

        return (
            <View style={styles.card}>
                <View style={styles.row}>
                    <ExpoImage
                        source={coverImage ? { uri: coverImage } : undefined}
                        style={styles.image}
                        contentFit="cover"
                        transition={200}
                    />
                    <View style={styles.info}>
                        <Text variant="titleMedium" numberOfLines={1} style={styles.title}>{item.name}</Text>
                        <Text variant="bodySmall" style={styles.price}>₱{item.price}</Text>
                        <View style={styles.stockBadge}>
                            <Text variant="labelSmall" style={styles.stockText}>Stock: {item.stock}</Text>
                        </View>
                        <Text variant="labelSmall" style={styles.statusText} numberOfLines={1}>
                            {item.status} • {new Date(item._creationTime).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.actions}>
                    <Button
                        icon={({ size, color }) => <LucideEdit size={size} color={color} />}
                        mode="text"
                        compact
                        onPress={() => router.push(`/product/edit/${item._id}`)}
                    >
                        Edit
                    </Button>
                    <Button
                        icon={({ size, color }) => <LucideTrash2 size={size} color={theme.colors.error} />}
                        mode="text"
                        textColor={theme.colors.error}
                        compact
                        onPress={() => handleDelete(item._id, item.name)}
                    >
                        Delete
                    </Button>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.colors.elevation.level2 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>My Listings</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 80 } // Extra padding for FAB
                    ]}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={() => { }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LucideStore size={64} color="#CBD5E1" />
                            <Text variant="titleMedium" style={styles.emptyText}>No listings yet</Text>
                            <Text variant="bodyMedium" style={styles.emptySubtext}>
                                Start selling by adding your first product!
                            </Text>
                            <Button
                                mode="contained"
                                style={styles.emptyButton}
                                onPress={() => router.push('/(tabs)/sell')}
                            >
                                List an Item
                            </Button>
                        </View>
                    }
                />
            )}

            <FAB
                icon={({ size, color }) => <LucidePlus size={24} color={color} />}
                style={[styles.fab, { bottom: insets.bottom + 20 }]}
                onPress={() => router.push('/(tabs)/sell')}
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
        marginBottom: 16,
        elevation: 1,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        padding: 12,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    info: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    price: {
        color: '#0061A4',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    stockBadge: {
        backgroundColor: '#F1F5F9',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    stockText: {
        color: '#64748B',
    },
    statusText: {
        color: '#94A3B8',
    },
    divider: {
        backgroundColor: '#F1F5F9',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 4,
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
