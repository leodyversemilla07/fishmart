import { ProductCard } from '@/components/fish/product-card';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LucideBell, LucideShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { ImageBackground, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Badge, Button, Searchbar, Text, useTheme } from 'react-native-paper';

export default function HomeScreen() {
  const theme = useTheme();
  const cartCount = useCartStore((state) => state.totalItems());
  const { sessionToken } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Use Convex hooks instead of local state and useEffect
  const categoriesQuery = useQuery(api.categories.list);
  const featuredProductsQuery = useQuery(api.products.list, { status: "ACTIVE" });
  const categories = categoriesQuery ?? [];
  const featuredProducts = featuredProductsQuery ?? [];

  // Fetch unread notification count
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    sessionToken ? { sessionToken } : "skip"
  ) ?? 0;

  const loading = categoriesQuery === undefined || featuredProductsQuery === undefined;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Convex queries auto-refresh, so we just simulate a delay for the spinner
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to explore with search param
      router.push({ pathname: '/(tabs)/explore', params: { search: searchQuery } });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <StatusBar style="light" />

      {/* Hero Section */}
      <ImageBackground
        source={require('@/assets/images/hero.png')}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={styles.headerIcons}>
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                style={styles.headerIconButton}
              >
                <View style={styles.iconWrapper}>
                  <LucideBell color="white" size={24} />
                  {unreadCount > 0 && (
                    <Badge style={styles.notificationBadge} size={16}>
                      {unreadCount}
                    </Badge>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/cart')}
                style={styles.headerIconButton}
              >
                <View style={styles.iconWrapper}>
                  <LucideShoppingCart color="white" size={24} />
                  {cartCount > 0 && (
                    <Badge style={styles.cartBadge} size={18}>
                      {cartCount}
                    </Badge>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text variant="displaySmall" style={styles.heroTitle}>
              Find Your Perfect Aquatic Companion
            </Text>
            <Text variant="bodyLarge" style={styles.heroSubtitle}>
              Philippines&apos; premier marketplace for premium guppies and small fish.
            </Text>
          </View>
        </View>
      </ImageBackground>

      <View style={styles.content}>
        {/* Search Section */}
        <Searchbar
          placeholder="Search for fish, strains, or sellers..."
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          elevation={2}
        />

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Categories</Text>
          <Button mode="text" compact onPress={() => router.push('/(tabs)/explore')}>See All</Button>
        </View>

        {loading && categories.length === 0 ? (
          <ActivityIndicator style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={styles.categoryCard}
                onPress={() => router.push({ pathname: '/(tabs)/explore', params: { category: cat.slug } })}
              >
                <Avatar.Image
                  size={64}
                  source={{ uri: cat.imageUrl || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=100' }}
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
                <Text variant="labelMedium" style={styles.categoryLabel}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Featured Products Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Featured Arrivals</Text>
          <Button mode="text" compact onPress={() => router.push('/(tabs)/explore')}>View More</Button>
        </View>

        {loading && featuredProducts.length === 0 ? (
          <ActivityIndicator style={{ marginVertical: 40 }} />
        ) : (
          <View style={styles.featuredGrid}>
            {featuredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={{
                  id: product._id,
                  name: product.name,
                  price: product.price,
                  images: product.images,
                  category: product.category ?? undefined,
                  stock: product.stock,
                  city: product.city,
                  province: product.province,
                  rating: product.rating ?? undefined,
                  reviewCount: product.reviewCount,
                }}
                onPress={() => router.push(`/product/${product._id}`)}
                style={styles.homeProductCard}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  hero: {
    height: 400,
  },
  heroImage: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 40,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4D4D',
    color: 'white',
    fontWeight: 'bold',
  },
  heroContent: {
    marginTop: 60,
  },
  heroTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
  content: {
    padding: 20,
    marginTop: -30,
  },
  searchBar: {
    marginBottom: 25,
    borderRadius: 15,
    backgroundColor: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  categoriesScroll: {
    marginBottom: 30,
    marginHorizontal: -5,
  },
  categoryCard: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: 80,
  },
  categoryLabel: {
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  featuredGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  homeProductCard: {
    width: '48%',
    marginBottom: 20,
  },
});
