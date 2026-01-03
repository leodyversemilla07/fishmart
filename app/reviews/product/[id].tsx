import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { Image as ExpoImage } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideArrowLeft, LucideMessageSquare, LucideStar } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Divider, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductReviewsScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();

    const reviews = useQuery(api.reviews.listByProduct, { productId: id as any });
    const loading = reviews === undefined;

    const renderReviewItem = ({ item }: { item: any }) => {
        const date = new Date(item._creationTime).toLocaleDateString();
        return (
            <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                    <View style={styles.userInfo}>
                        <Avatar.Text
                            size={36}
                            label={item.user?.firstName?.[0] || 'U'}
                            style={{ backgroundColor: theme.colors.primaryContainer }}
                            labelStyle={{ color: theme.colors.primary }}
                        />
                        <View style={styles.userMeta}>
                            <Text variant="titleSmall">{item.user?.firstName} {item.user?.lastName}</Text>
                            <Text variant="bodySmall" style={styles.dateText}>{date}</Text>
                        </View>
                    </View>
                    <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <LucideStar
                                key={star}
                                size={14}
                                color={star <= item.rating ? "#FFB800" : "#CBD5E1"}
                                fill={star <= item.rating ? "#FFB800" : "none"}
                            />
                        ))}
                    </View>
                </View>
                <Text variant="bodyMedium" style={styles.comment}>
                    {item.comment || "No comment provided."}
                </Text>
                {item.images && item.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
                        {item.images.map((img: string, idx: number) => (
                            <ExpoImage key={idx} source={{ uri: img }} style={styles.reviewImage} />
                        ))}
                    </ScrollView>
                )}
                {item.sellerResponse && (
                    <View style={styles.sellerResponse}>
                        <View style={styles.sellerResponseHeader}>
                            <LucideMessageSquare size={14} color={theme.colors.primary} />
                            <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold', marginLeft: 6 }}>
                                Seller Response
                            </Text>
                        </View>
                        <Text variant="bodySmall" style={styles.responseText}>
                            {item.sellerResponse}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <LucideArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text variant="titleLarge" style={styles.headerTitle}>Product Reviews</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    renderItem={renderReviewItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                    ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                    refreshControl={
                        <RefreshControl refreshing={false} onRefresh={() => { }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LucideStar size={64} color="#CBD5E1" />
                            <Text variant="titleMedium" style={styles.emptyText}>No reviews yet</Text>
                            <Text variant="bodyMedium" style={styles.emptySubtext}>Be the first to review this product!</Text>
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
        padding: 16,
    },
    reviewCard: {
        paddingVertical: 16,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userMeta: {
        marginLeft: 12,
    },
    dateText: {
        color: '#64748B',
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 2,
    },
    comment: {
        color: '#334155',
        lineHeight: 20,
    },
    imagesContainer: {
        marginTop: 12,
        flexDirection: 'row',
    },
    reviewImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 10,
    },
    sellerResponse: {
        marginTop: 12,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#0061A4',
    },
    sellerResponseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    responseText: {
        color: '#475569',
    },
    divider: {
        backgroundColor: '#F1F5F9',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontWeight: 'bold',
        marginTop: 16,
        color: '#1E293B',
    },
    emptySubtext: {
        color: '#64748B',
        marginTop: 4,
    },
});
