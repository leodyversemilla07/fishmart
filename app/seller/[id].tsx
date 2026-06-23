import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideArrowLeft, LucideCalendar, LucideMessageCircle, LucideShoppingBag, LucideStar, LucideVerified } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Card, Divider, Text, Chip, useTheme } from 'react-native-paper';
import { useAuthStore } from '@/store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellerProfileScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { id: sellerId } = useLocalSearchParams<{ id: Id<"users"> }>();
    const { sessionToken } = useAuthStore();

    // Convex Query
    const seller = useQuery(api.users.getPublicProfile, sellerId ? { id: sellerId } : "skip");
    const ensureConversation = useMutation(api.chat.ensureConversation);
    const loading = seller === undefined;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!seller) {
        return (
            <View style={styles.centered}>
                <Text>Seller not found</Text>
                <Button onPress={() => router.back()}>Go Back</Button>
            </View>
        );
    }

    const joinDate = new Date(seller._creationTime).toLocaleDateString();

    const handleChatWithSeller = async () => {
        if (!sellerId) return;
        if (!sessionToken) {
            Alert.alert('Login required', 'Please log in to message this seller.');
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
                    recipientName: seller.shopName || `${seller.firstName} ${seller.lastName}`,
                    recipientId: sellerId,
                },
            });
        } catch (error) {
            console.error('Failed to open seller chat:', error);
            Alert.alert('Error', 'Could not open chat right now.');
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContent}>
            <View style={styles.sellerBasicInfo}>
                <Avatar.Image
                    size={80}
                    source={{ uri: seller.shopLogo || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=200' }}
                    style={styles.avatar}
                />
                <View style={styles.nameSection}>
                    <View style={styles.shopNameRow}>
                        <Text variant="headlineSmall" style={styles.shopName}>{seller.shopName || 'Shop Name'}</Text>
                        {seller.isVerified && <LucideVerified size={20} color="#0061A4" fill="#E0F2FE" />}
                    </View>
                    <Text variant="bodyMedium" style={styles.sellerRealName}>{seller.firstName} {seller.middleName ? seller.middleName + ' ' : ''}{seller.lastName}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text variant="titleLarge" style={styles.statValue}>{seller.averageRating ? seller.averageRating.toFixed(1) : '—'}</Text>
                    <View style={styles.ratingStars}>
                        <LucideStar size={12} color="#FFB800" fill="#FFB800" />
                        <Text variant="labelSmall" style={styles.statLabel}>Rating</Text>
                    </View>
                </View>
                <Divider style={styles.verticalDivider} />
                <View style={styles.statItem}>
                    <Text variant="titleLarge" style={styles.statValue}>{seller.reviewCount}</Text>
                    <Text variant="labelSmall" style={styles.statLabel}>Reviews</Text>
                </View>
                <Divider style={styles.verticalDivider} />
                <View style={styles.statItem}>
                    <Text variant="titleLarge" style={styles.statValue}>{seller._count?.products || 0}</Text>
                    <Text variant="labelSmall" style={styles.statLabel}>Items</Text>
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                    <LucideCalendar size={16} color="#64748B" />
                    <Text variant="bodySmall" style={styles.infoText}>Joined {joinDate}</Text>
                </View>
                {seller.shopDescription && (
                    <Text variant="bodyMedium" style={styles.description}>
                        {seller.shopDescription}
                    </Text>
                )}
            </View>

            <View style={styles.actionButtons}>
                <Button
                    mode="contained"
                    icon={() => <LucideMessageCircle size={18} color="white" />}
                    style={styles.chatButton}
                    onPress={handleChatWithSeller}
                >
                    Chat with Seller
                </Button>
            </View>

            <Divider style={styles.sectionDivider} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Listings</Text>
        </View>
    );

    const renderProductItem = ({ item }: { item: (typeof seller.products)[number] }) => {
        const coverImage = item.images?.[0]?.imageUrl;
        return (
            <Card
                style={styles.productCard}
                onPress={() => router.push(`/product/${item._id}`)}
            >
                <View style={styles.productImageWrapper}>
                    {coverImage ? (
                        <Image source={{ uri: coverImage }} style={styles.productImage} contentFit="cover" transition={200} />
                    ) : (
                        <View style={[styles.productImagePlaceholder, { backgroundColor: theme.colors.primaryContainer }]}>
                            <LucideShoppingBag size={28} color={theme.colors.primary} />
                        </View>
                    )}
                    <View style={styles.productStockBadge}>
                        <Chip compact style={[styles.stockChip, { backgroundColor: item.stock > 0 ? '#DCFCE7' : '#FEF2F2' }]} textStyle={{ fontSize: 9, color: item.stock > 0 ? '#059669' : '#DC2626' }}>
                            {item.stock > 0 ? `${item.stock} left` : 'Out of stock'}
                        </Chip>
                    </View>
                </View>
                <Card.Content style={styles.productContent}>
                    <Text variant="titleSmall" numberOfLines={2} style={styles.productName}>{item.name}</Text>
                    <Text variant="titleMedium" style={styles.price}>₱{item.price.toLocaleString()}</Text>
                </Card.Content>
            </Card>
        );
    };

    const renderReviewItem = (review: (typeof seller.recentReviews)[number]) => (
        <View key={review._id} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
                <Text variant="labelLarge">{review.user?.firstName} {review.user?.middleName ? review.user?.middleName + ' ' : ''}{review.user?.lastName}</Text>
                <View style={styles.ratingRow}>
                    <LucideStar size={12} color="#FFB800" fill="#FFB800" />
                    <Text variant="labelSmall">{review.rating}</Text>
                </View>
            </View>
            <Text variant="bodySmall" style={styles.reviewComment}>{review.comment}</Text>
            <Text variant="labelSmall" style={styles.reviewProduct}>on {review.product?.name}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.navHeader, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.navTitle}>Seller Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={seller.products}
                keyExtractor={item => item._id}
                renderItem={renderProductItem}
                numColumns={seller.products.length > 0 ? 2 : 1}
                ListHeaderComponent={renderHeader}
                columnWrapperStyle={seller.products.length > 0 ? styles.productRow : undefined}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={() => { }} />
                }
                ListEmptyComponent={
                    <View style={styles.emptySection}>
                        <LucideShoppingBag size={48} color="#CBD5E1" />
                        <Text variant="bodyMedium" style={{ color: '#64748B', marginTop: 12 }}>
                            No products listed yet
                        </Text>
                    </View>
                }
                ListFooterComponent={() => (
                    <View style={styles.footer}>
                        <Divider style={styles.sectionDivider} />
                        <View style={styles.reviewsSectionHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Recent Reviews</Text>
                            {seller.recentReviews?.length > 0 && (
                                <Button
                                    mode="text"
                                    compact
                                    onPress={() => sellerId && router.push(`/reviews/seller/${sellerId}`)}
                                >
                                    See All
                                </Button>
                            )}
                        </View>
                        {seller.recentReviews?.length > 0 ? (
                            seller.recentReviews.map(renderReviewItem)
                        ) : (
                            <Text variant="bodySmall" style={styles.emptyReviews}>No reviews yet.</Text>
                        )}
                        <View style={{ height: insets.bottom + 40 }} />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    navTitle: {
        fontWeight: 'bold',
    },
    backButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
    },
    headerContent: {
        marginBottom: 20,
    },
    sellerBasicInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        backgroundColor: '#F1F5F9',
    },
    nameSection: {
        marginLeft: 16,
        flex: 1,
    },
    shopNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shopName: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    sellerRealName: {
        color: '#64748B',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontWeight: 'bold',
        color: '#1E293B',
    },
    statLabel: {
        color: '#64748B',
        marginTop: 2,
    },
    ratingStars: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verticalDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
    },
    infoSection: {
        marginBottom: 20,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    infoText: {
        color: '#64748B',
    },
    description: {
        color: '#334155',
        lineHeight: 22,
    },
    actionButtons: {
        marginBottom: 20,
    },
    chatButton: {
        borderRadius: 12,
    },
    sectionDivider: {
        marginVertical: 10,
        backgroundColor: '#F1F5F9',
    },
    sectionTitle: {
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 12,
    },
    productRow: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    productCard: {
        width: '48%',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 0,
    },
    productImageWrapper: {
        position: 'relative',
        width: '100%',
        height: 120,
    },
    productImage: {
        width: '100%',
        height: 120,
    },
    productImagePlaceholder: {
        width: '100%',
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productStockBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
    },
    stockChip: {
        height: 20,
    },
    productName: {
        fontWeight: '600',
        color: '#1E293B',
        minHeight: 40,
    },
    productContent: {
        padding: 10,
    },
    price: {
        fontWeight: 'bold',
        color: '#0061A4',
        marginTop: 4,
    },
    footer: {
        marginTop: 20,
    },
    reviewsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    reviewItem: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewComment: {
        color: '#334155',
    },
    reviewProduct: {
        color: '#94A3B8',
        marginTop: 4,
        fontStyle: 'italic',
    },
    emptySection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyReviews: {
        textAlign: 'center',
        color: '#94A3B8',
        marginVertical: 20,
    },
});
