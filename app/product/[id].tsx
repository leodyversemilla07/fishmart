import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useCartStore } from '@/store/cartStore';
import { Review } from '@/types';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
    LucideArrowLeft,
    LucideHeart,
    LucideMapPin,
    LucideMessageCircle,
    LucideShare2,
    LucideStar
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    NativeScrollEvent, // Added
    NativeSyntheticEvent, // Added
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Avatar, Button, Chip, Divider, Snackbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 350;

export default function ProductDetailScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const cart = useCartStore();

    // Convex Hooks
    const product = useQuery(api.products.get, { id: id as Id<"products"> });
    const reviews = useQuery(api.reviews.listByProduct, { productId: id as Id<"products"> }) as Review[] || [];

    const loading = product === undefined;
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const imageListRef = useRef<FlatList>(null);

    const handleAddToCart = () => {
        if (product) {
            cart.addItem({
                ...product,
                id: product._id, // Map Convex _id to store's id
            });
            setSnackbarVisible(true);
        }
    };

    const getSellerInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 12 }}>Hooking in product details...</Text>
            </View>
        );
    }

    if (!product) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text>Product not found</Text>
                <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 20 }}>
                    Go Back
                </Button>
            </View>
        );
    }

    // Default image if none provided
    const images = product.images?.length > 0
        ? product.images.map((img: { imageUrl: string }) => img.imageUrl)
        : ['https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800'];
    const sellerName = product.seller?.shopName || `${product.seller?.firstName} ${product.seller?.lastName}`;

    const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentImageIndex(slideIndex);
    };

    const renderImageItem = ({ item }: { item: string }) => (
        <Image
            source={{ uri: item }}
            style={styles.productImage}
            contentFit="cover"
            transition={300}
        />
    );

    return (
        <View style={styles.container}>
            {/* Product Image Carousel */}
            <View style={styles.imageContainer}>
                <FlatList
                    ref={imageListRef}
                    data={images}
                    renderItem={renderImageItem}
                    keyExtractor={(item, index) => `image-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleImageScroll}
                    scrollEventThrottle={16}
                    bounces={false}
                />

                {/* Image Indicators */}
                {images.length > 1 && (
                    <View style={styles.imageIndicators}>
                        {images.map((_: string, index: number) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    imageListRef.current?.scrollToIndex({ index, animated: true });
                                    setCurrentImageIndex(index);
                                }}
                            >
                                <View
                                    style={[
                                        styles.indicator,
                                        currentImageIndex === index && styles.indicatorActive
                                    ]}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                    <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                            {currentImageIndex + 1} / {images.length}
                        </Text>
                    </View>
                )}

                {/* Header Overlay */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => router.back()}
                    >
                        <LucideArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerButton}>
                            <LucideShare2 size={22} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButton}>
                            <LucideHeart size={22} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Product Info */}
                <View style={styles.productInfo}>
                    <View style={styles.categoryRow}>
                        <Chip compact style={styles.categoryChip}>{product.category?.name || 'Fish'}</Chip>
                        <Text variant="bodySmall" style={styles.stockText}>
                            {product.stock} in stock
                        </Text>
                    </View>

                    <Text variant="headlineSmall" style={styles.productName}>
                        {product.name}
                    </Text>

                    <Text variant="headlineMedium" style={[styles.price, { color: theme.colors.primary }]}>
                        ₱{product.price?.toLocaleString()}
                    </Text>

                    <View style={styles.ratingRow}>
                        <LucideStar size={18} color="#FFB800" fill="#FFB800" />
                        <Text variant="bodyMedium" style={styles.ratingText}>
                            {reviews.length > 0
                                ? (reviews.reduce((acc: number, r: Review) => acc + r.rating, 0) / reviews.length).toFixed(1)
                                : 'New'} ({reviews.length} reviews)
                        </Text>
                        <View style={styles.locationRow}>
                            <LucideMapPin size={14} color="#64748B" />
                            <Text variant="bodySmall" style={styles.locationText}>
                                {product.city}, {product.province}
                            </Text>
                        </View>
                    </View>

                    {/* Species / Strain specific details */}
                    {(product.species || product.strain || product.gender) && (
                        <View style={styles.detailsGrid}>
                            {product.species && (
                                <View style={styles.detailItem}>
                                    <Text variant="bodySmall" style={styles.detailLabel}>Species</Text>
                                    <Text variant="bodyMedium">{product.species}</Text>
                                </View>
                            )}
                            {product.strain && (
                                <View style={styles.detailItem}>
                                    <Text variant="bodySmall" style={styles.detailLabel}>Strain</Text>
                                    <Text variant="bodyMedium">{product.strain}</Text>
                                </View>
                            )}
                            {product.gender && (
                                <View style={styles.detailItem}>
                                    <Text variant="bodySmall" style={styles.detailLabel}>Gender</Text>
                                    <Text variant="bodyMedium">{product.gender}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                <Divider style={styles.divider} />

                {/* Seller Info */}
                <View style={styles.sellerSection}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Seller</Text>
                    <TouchableOpacity
                        style={styles.sellerCard}
                        onPress={() => router.push(`/seller/${product.sellerId}`)}
                    >
                        <Avatar.Text
                            size={50}
                            label={getSellerInitials(sellerName)}
                            style={{ backgroundColor: theme.colors.primaryContainer }}
                            labelStyle={{ color: theme.colors.primary }}
                        />
                        <View style={styles.sellerInfo}>
                            <View style={styles.sellerNameRow}>
                                <Text variant="titleMedium" style={styles.sellerName}>
                                    {sellerName}
                                </Text>
                                {product.seller?.isVerified && (
                                    <Chip compact style={styles.verifiedChip} textStyle={{ fontSize: 10 }}>
                                        ✓ Verified
                                    </Chip>
                                )}
                            </View>
                            <View style={styles.sellerRating}>
                                <LucideStar size={14} color="#FFB800" fill="#FFB800" />
                                <Text variant="bodySmall">
                                    {/* TODO: Add seller rating */}
                                    New • 0 reviews
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.chatButton, { backgroundColor: theme.colors.primaryContainer }]}
                        >
                            <LucideMessageCircle size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>

                <Divider style={styles.divider} />

                {/* Description */}
                <View style={styles.descriptionSection}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
                    <Text variant="bodyMedium" style={styles.description}>
                        {product.description}
                    </Text>
                </View>

                <Divider style={styles.divider} />

                {/* Reviews Section */}
                <View style={styles.reviewsSection}>
                    <View style={styles.sectionHeaderReview}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
                        {reviews.length > 0 && (
                            <Button
                                mode="text"
                                compact
                                onPress={() => router.push(`/reviews/product/${id}`)}
                            >
                                See All
                            </Button>
                        )}
                    </View>

                    {reviews.length > 0 ? (
                        reviews.slice(0, 3).map((review: Review) => (
                            <View key={review._id} style={styles.reviewItem}>
                                <View style={styles.reviewHeader}>
                                    <Avatar.Text
                                        size={32}
                                        label={review.userId?.[0] || 'U'} // Note: Should probably join with user data
                                        style={{ backgroundColor: theme.colors.primaryContainer }}
                                        labelStyle={{ color: theme.colors.primary, fontSize: 12 }}
                                    />
                                    <View style={styles.reviewUser}>
                                        <Text variant="labelLarge">User</Text>
                                        <View style={styles.starsRow}>
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <LucideStar
                                                    key={s}
                                                    size={12}
                                                    color={s <= review.rating ? "#FFB800" : "#E2E8F0"}
                                                    fill={s <= review.rating ? "#FFB800" : "transparent"}
                                                />
                                            ))}
                                            <Text variant="labelSmall" style={styles.reviewDate}>
                                                {new Date(review._creationTime).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <Text variant="bodyMedium" style={styles.reviewComment}>
                                    {review.comment}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyReviews}>
                            <Text variant="bodyMedium" style={{ color: '#64748B' }}>No reviews yet. Be the first to review!</Text>
                        </View>
                    )}

                    <Button
                        mode="outlined"
                        style={styles.writeReviewBtn}
                        onPress={() => router.push(`/reviews/create?productId=${product._id}&name=${encodeURIComponent(product.name)}`)}
                    >
                        Write a Review
                    </Button>
                </View>

                {/* Spacer for bottom buttons */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                <Button
                    mode="outlined"
                    icon="message-text"
                    style={styles.messageButton}
                    contentStyle={styles.buttonContent}
                >
                    Message
                </Button>
                <Button
                    mode="contained"
                    icon="cart"
                    style={styles.cartButton}
                    contentStyle={styles.buttonContent}
                    onPress={handleAddToCart}
                >
                    Add to Cart
                </Button>
            </View>

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                action={{
                    label: 'View Cart',
                    onPress: () => router.push('/cart'),
                }}
            >
                Product added to cart!
            </Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        position: 'relative',
        height: IMAGE_HEIGHT,
    },
    productImage: {
        width: SCREEN_WIDTH,
        height: IMAGE_HEIGHT,
    },
    imageIndicators: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    indicatorActive: {
        backgroundColor: 'white',
        width: 24,
    },
    imageCounter: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imageCounterText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 10,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    productInfo: {
        padding: 20,
        backgroundColor: 'white',
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryChip: {
        backgroundColor: '#E2E8F0',
    },
    stockText: {
        color: '#22C55E',
        fontWeight: '600',
    },
    productName: {
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    price: {
        fontWeight: 'bold',
        marginBottom: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    ratingText: {
        color: '#1E293B',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        color: '#64748B',
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
    detailItem: {
        minWidth: '28%',
    },
    detailLabel: {
        color: '#64748B',
        textTransform: 'uppercase',
        fontSize: 10,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    divider: {
        marginVertical: 0,
    },
    sellerSection: {
        padding: 20,
        backgroundColor: 'white',
    },
    sectionTitle: {
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sellerInfo: {
        flex: 1,
    },
    sellerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sellerName: {
        fontWeight: '600',
    },
    verifiedChip: {
        backgroundColor: '#DCFCE7',
        height: 24,
    },
    sellerRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    chatButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    descriptionSection: {
        padding: 20,
        backgroundColor: 'white',
    },
    description: {
        color: '#475569',
        lineHeight: 24,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    messageButton: {
        flex: 1,
        borderRadius: 12,
    },
    cartButton: {
        flex: 2,
        borderRadius: 12,
    },
    buttonContent: {
        paddingVertical: 6,
    },
    reviewsSection: {
        padding: 20,
        backgroundColor: 'white',
    },
    sectionHeaderReview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    reviewItem: {
        marginBottom: 20,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    reviewUser: {
        flex: 1,
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    reviewDate: {
        color: '#94A3B8',
        marginLeft: 8,
    },
    reviewComment: {
        color: '#475569',
        lineHeight: 20,
    },
    emptyReviews: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    writeReviewBtn: {
        marginTop: 10,
        borderRadius: 12,
    },
});
