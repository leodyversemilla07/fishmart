import { api } from '@/convex/_generated/api';
import { Category, Product } from '@/types';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideFilter, LucideMapPin, LucideStar, LucideX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Chip, Divider, RadioButton, Searchbar, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

function ProductCard({ product }: { product: Product }) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/product/${product._id}`)}
    >
      <Image
        source={{ uri: product.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=400' }}
        style={styles.productImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.productInfo}>
        <Text variant="titleSmall" numberOfLines={2} style={styles.productName}>
          {product.name}
        </Text>
        <Text variant="titleMedium" style={[styles.productPrice, { color: theme.colors.primary }]}>
          ₱{product.price?.toLocaleString()}
        </Text>
        <View style={styles.sellerInfo}>
          <LucideMapPin size={12} color="#666" />
          <Text variant="bodySmall" style={styles.location}>{product.city}, {product.province}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <LucideStar size={12} color="#FFB800" fill="#FFB800" />
          <Text variant="bodySmall" style={styles.rating}>
            {product.rating ? product.rating.toFixed(1) : 'New'} ({product.reviewCount || 0})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ search?: string, category?: string }>();

  const [searchQuery, setSearchQuery] = useState(params.search || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || 'all');

  // Sync search query from URL params when navigating from home
  useEffect(() => {
    if (params.search) {
      setSearchQuery(params.search);
    }
  }, [params.search]);

  // Convex Hooks
  const dbCategories = useQuery(api.categories.list) || [];

  // Find category ID from slug if passed via params
  const categoryIdFromSlug = params.category && params.category !== 'all'
    ? dbCategories.find((c: Category) => c.slug === params.category)?._id
    : undefined;

  // Sync category selection when navigating with category param
  useEffect(() => {
    if (categoryIdFromSlug) {
      setSelectedCategory(categoryIdFromSlug);
    }
  }, [categoryIdFromSlug]);

  // Build query args dynamically
  const activeCategoryId = selectedCategory !== 'all' 
    ? selectedCategory 
    : categoryIdFromSlug;

  const products = useQuery(api.products.list, {
    search: searchQuery.trim() || undefined,
    status: "ACTIVE",
    categoryId: activeCategoryId as any,
  });

  // Filter States
  const [filterVisible, setFilterVisible] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const loading = products === undefined;
  const [refreshing, setRefreshing] = useState(false);

  const applyFilters = () => {
    setFilterVisible(false);
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setCity('');
    setSortBy('newest');
    setFilterVisible(false);
  };

  // Apply client-side filters (price, city) and sorting
  const filteredProducts = (products || [])
    .filter((p: Product) => {
      if (minPrice && p.price < parseFloat(minPrice)) return false;
      if (maxPrice && p.price > parseFloat(maxPrice)) return false;
      if (city && !p.city.toLowerCase().includes(city.toLowerCase())) return false;
      return true;
    })
    .sort((a: Product, b: Product) => {
      switch (sortBy) {
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'newest':
        default:
          return (b._creationTime || 0) - (a._creationTime || 0);
      }
    });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>Explore</Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>Find your perfect aquatic pet</Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search aquatic pets..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={theme.colors.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.colors.primaryContainer }]}
          onPress={() => setFilterVisible(true)}
        >
          <LucideFilter size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
        <Chip
          selected={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
          mode="outlined"
          showSelectedCheck={false}
          style={[
            styles.categoryChip,
            selectedCategory === 'all' ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { backgroundColor: 'white' }
          ]}
          textStyle={[
            styles.categoryChipText,
            selectedCategory === 'all' ? { color: 'white' } : { color: '#64748B' }
          ]}
        >
          All
        </Chip>
        {dbCategories.map((category: Category) => (
          <Chip
            key={category._id}
            selected={selectedCategory === category._id}
            onPress={() => setSelectedCategory(category._id)}
            mode="outlined"
            showSelectedCheck={false}
            style={[
              styles.categoryChip,
              selectedCategory === category._id ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { backgroundColor: 'white' }
            ]}
            textStyle={[
              styles.categoryChipText,
              selectedCategory === category._id ? { color: 'white' } : { color: '#64748B' }
            ]}
          >
            {category.name}
          </Chip>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={({ item }: { item: Product }) => <ProductCard product={item} />}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsContainer}
          onRefresh={() => setRefreshing(true)}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={styles.emptyText}>No products found</Text>
            </View>
          }
        />
      )}

      <Modal visible={filterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <LucideX size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text variant="titleMedium" style={styles.filterGroupTitle}>Sort By</Text>
              <RadioButton.Group onValueChange={value => setSortBy(value)} value={sortBy}>
                <View style={styles.radioRow}>
                  <RadioButton value="newest" />
                  <Text>Newest First</Text>
                </View>
                <View style={styles.radioRow}>
                  <RadioButton value="price_low" />
                  <Text>Price: Low to High</Text>
                </View>
                <View style={styles.radioRow}>
                  <RadioButton value="price_high" />
                  <Text>Price: High to Low</Text>
                </View>
              </RadioButton.Group>

              <Divider style={styles.modalDivider} />

              <Text variant="titleMedium" style={styles.filterGroupTitle}>Price Range</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  mode="outlined"
                  label="Min"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                  style={styles.priceInput}
                />
                <View style={styles.priceSeparator} />
                <TextInput
                  mode="outlined"
                  label="Max"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                  style={styles.priceInput}
                />
              </View>

              <Divider style={styles.modalDivider} />

              <Text variant="titleMedium" style={styles.filterGroupTitle}>Location (City)</Text>
              <TextInput
                mode="outlined"
                placeholder="e.g. Manila"
                value={city}
                onChangeText={setCity}
                style={styles.locationInput}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 10 }]}>
              <Button mode="outlined" onPress={clearFilters} style={styles.footerBtn}>Clear All</Button>
              <Button mode="contained" onPress={applyFilters} style={styles.footerBtn}>Apply Filters</Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    fontSize: 15,
    minHeight: 0,
    alignSelf: 'center',
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: 'white',
    borderRadius: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  productsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    height: 40,
  },
  productPrice: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.8,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  filterGroupTitle: {
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDivider: {
    marginVertical: 20,
    backgroundColor: '#F1F5F9',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'white',
  },
  priceSeparator: {
    width: 10,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  locationInput: {
    backgroundColor: 'white',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: 'white',
  },
  footerBtn: {
    flex: 1,
    borderRadius: 12,
  },
});
