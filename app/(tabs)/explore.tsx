import { api } from '@/convex/_generated/api';
import { Category, Product } from '@/types';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LucideFilter, LucideMapPin, LucideStar, LucideX } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Chip, Divider, RadioButton, Searchbar, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

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
            {product.rating || 0} ({product.reviews?.length || 0})
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
  const [selectedCategory, setSelectedCategory] = useState(params.category || 'all');

  // Convex Hooks
  const dbCategories = useQuery(api.categories.list) || [];

  // Note: For complex filtering, we might need a more specialized query or handle it on the client
  // for now we'll pass search and status
  const products = useQuery(api.products.list, {
    search: searchQuery || undefined,
    status: "ACTIVE"
  }) || [];

  // Filter States
  const [filterVisible, setFilterVisible] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const loading = products === undefined || dbCategories === undefined;
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

  const filteredProducts = products.filter((p: Product) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (minPrice && p.price < parseFloat(minPrice)) return false;
    if (maxPrice && p.price > parseFloat(maxPrice)) return false;
    if (city && !p.city.toLowerCase().includes(city.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>Explore</Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>Find your perfect aquatic pet</Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
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
          style={[styles.categoryChip, selectedCategory === 'all' && { backgroundColor: theme.colors.primaryContainer }]}
          textStyle={[styles.categoryChipText, selectedCategory === 'all' && { color: theme.colors.primary, fontWeight: 'bold' }]}
        >
          🐟 All
        </Chip>
        {dbCategories.map((category: Category) => (
          <Chip
            key={category._id}
            selected={selectedCategory === category._id}
            onPress={() => setSelectedCategory(category._id)}
            style={[styles.categoryChip, selectedCategory === category._id && { backgroundColor: theme.colors.primaryContainer }]}
            textStyle={[styles.categoryChipText, selectedCategory === category._id && { color: theme.colors.primary, fontWeight: 'bold' }]}
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

      {/* Filter Modal */}
      <Modal visible={filterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <LucideX size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
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

            <View style={styles.modalFooter}>
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
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  searchInput: {
    fontSize: 14,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    marginRight: 10,
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 4,
    height: 44,
  },
  categoryChipText: {
    fontSize: 15,
    paddingHorizontal: 4,
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
    maxHeight: '80%',
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
  },
  footerBtn: {
    flex: 1,
    borderRadius: 12,
  },
});
