/**
 * Fishmart Design System - Product Card Component
 * 
 * Card component specifically designed for displaying fish products.
 */

import React from 'react';
import { StyleSheet, View, Pressable, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Image } from 'expo-image';
import { LucideMapPin, LucideStar } from 'lucide-react-native';
import type { FishmartTheme } from '@/constants/design-system';
import { FMChip } from '../ui/chip';
import { FMBadge } from '../ui/badge';

export interface Product {
  id: string;
  name: string;
  price: string | number;
  images?: { imageUrl: string }[];
  category?: { name: string; slug?: string };
  stock?: number;
  species?: string;
  strain?: string;
  gender?: 'MALE' | 'FEMALE' | 'PAIR' | 'UNSEXED';
  city?: string;
  province?: string;
  seller?: {
    id: string;
    shopName?: string;
    firstName?: string;
    lastName?: string;
    isVerified?: boolean;
  };
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
}

type ProductCardVariant = 'default' | 'compact' | 'horizontal';

interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  onPress?: () => void;
  onAddToCart?: () => void;
  showSeller?: boolean;
  showRating?: boolean;
  style?: ViewStyle;
}

export function ProductCard({
  product,
  variant = 'default',
  onPress,
  showSeller = false,
  showRating = true,
  style,
}: ProductCardProps) {
  const theme = useTheme<FishmartTheme>();
  
  const imageUrl = product.images?.[0]?.imageUrl 
    || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=400';
  
  const price = typeof product.price === 'string' 
    ? parseFloat(product.price) 
    : product.price;
  
  const getStockStatus = () => {
    if (!product.stock || product.stock === 0) {
      return { label: 'Out of Stock', color: theme.custom.special.stock.outOfStock };
    }
    if (product.stock <= 5) {
      return { label: `${product.stock} left`, color: theme.custom.special.stock.lowStock };
    }
    return { label: 'In Stock', color: theme.custom.special.stock.inStock };
  };
  
  const getGenderColor = () => {
    switch (product.gender) {
      case 'MALE': return theme.custom.special.gender.male;
      case 'FEMALE': return theme.custom.special.gender.female;
      case 'PAIR': return theme.custom.special.gender.pair;
      default: return theme.custom.special.gender.unknown;
    }
  };
  
  const stockStatus = getStockStatus();
  
  if (variant === 'horizontal') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.horizontalCard,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.custom.borderRadius.lg,
            ...theme.custom.shadows.sm,
          },
          pressed && styles.pressed,
          style,
        ]}
      >
        <Image
          source={{ uri: imageUrl }}
          style={[styles.horizontalImage, { borderRadius: theme.custom.borderRadius.md }]}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.horizontalContent}>
          {product.category && (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.secondary, marginBottom: 2 }}
            >
              {product.category.name}
            </Text>
          )}
          <Text
            variant="titleMedium"
            numberOfLines={2}
            style={{ color: theme.colors.onSurface, fontWeight: '600' }}
          >
            {product.name}
          </Text>
          
          {product.city && (
            <View style={styles.locationRow}>
              <LucideMapPin size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {product.city}
              </Text>
            </View>
          )}
          
          <View style={styles.horizontalBottom}>
            <Text
              variant="titleLarge"
              style={{ color: theme.colors.primary, fontWeight: '700' }}
            >
              ₱{price.toLocaleString()}
            </Text>
            <Text variant="bodySmall" style={{ color: stockStatus.color }}>
              {stockStatus.label}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
  
  if (variant === 'compact') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.compactCard,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.custom.borderRadius.lg,
            ...theme.custom.shadows.sm,
          },
          pressed && styles.pressed,
          style,
        ]}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.compactImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.compactContent}>
          <Text
            variant="labelMedium"
            numberOfLines={1}
            style={{ color: theme.colors.onSurface }}
          >
            {product.name}
          </Text>
          <Text
            variant="titleSmall"
            style={{ color: theme.colors.primary, fontWeight: '700' }}
          >
            ₱{price.toLocaleString()}
          </Text>
        </View>
      </Pressable>
    );
  }
  
  // Default variant
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.custom.borderRadius.xl,
          ...theme.custom.shadows.md,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      {/* Image with overlays */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        
        {/* Featured badge */}
        {product.isFeatured && (
          <View style={[styles.featuredBadge, { backgroundColor: theme.colors.tertiary }]}>
            <Text variant="labelSmall" style={{ color: theme.colors.onTertiary }}>
              Featured
            </Text>
          </View>
        )}
        
        {/* Stock status */}
        {product.stock !== undefined && product.stock <= 5 && (
          <View
            style={[
              styles.stockBadge,
              { backgroundColor: stockStatus.color },
            ]}
          >
            <Text variant="labelSmall" style={{ color: 'white', fontWeight: '600' }}>
              {stockStatus.label}
            </Text>
          </View>
        )}
        
        {/* Gender indicator */}
        {product.gender && (
          <View style={[styles.genderDot, { backgroundColor: getGenderColor() }]} />
        )}
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {/* Category */}
        {product.category && (
          <FMChip size="sm" color="secondary" style={styles.categoryChip}>
            {product.category.name}
          </FMChip>
        )}
        
        {/* Title */}
        <Text
          variant="titleMedium"
          numberOfLines={2}
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          {product.name}
        </Text>
        
        {/* Strain info */}
        {product.strain && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={1}
          >
            {product.strain}
          </Text>
        )}
        
        {/* Location & Rating */}
        <View style={styles.metaRow}>
          {product.city && (
            <View style={styles.locationRow}>
              <LucideMapPin size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {product.city}
              </Text>
            </View>
          )}
          
          {showRating && product.rating !== undefined && (
            <View style={styles.ratingRow}>
              <LucideStar
                size={12}
                color={theme.custom.special.rating.filled}
                fill={theme.custom.special.rating.filled}
              />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {product.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        
        {/* Price */}
        <Text
          variant="headlineSmall"
          style={[styles.price, { color: theme.colors.primary }]}
        >
          ₱{price.toLocaleString()}
        </Text>
        
        {/* Seller info */}
        {showSeller && product.seller && (
          <View style={styles.sellerRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              by {product.seller.shopName || `${product.seller.firstName} ${product.seller.lastName}`}
            </Text>
            {product.seller.isVerified && (
              <FMBadge size="sm" variant="success">✓</FMBadge>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Default variant
  card: {
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genderDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  content: {
    padding: 12,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontWeight: '700',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  
  // Horizontal variant
  horizontalCard: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  horizontalImage: {
    width: 100,
    height: 100,
  },
  horizontalContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  horizontalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Compact variant
  compactCard: {
    overflow: 'hidden',
  },
  compactImage: {
    width: '100%',
    height: 100,
  },
  compactContent: {
    padding: 8,
  },
});
