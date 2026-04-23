/**
 * Fishmart Design System - EmptyState Component
 * 
 * Displays a placeholder when content is empty.
 */

import { NeutralColors, BorderRadius, Spacing, BrandColors } from '@/constants/design-system/tokens';
import { LucideIcon, Package, Search, ShoppingCart, MessageCircle, Bell, Fish, Heart, MapPin, FileText } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Button, Text } from 'react-native-paper';

type EmptyStatePreset = 
  | 'products' 
  | 'search' 
  | 'cart' 
  | 'orders' 
  | 'messages' 
  | 'notifications' 
  | 'wishlist' 
  | 'addresses'
  | 'reviews'
  | 'generic';

interface EmptyStateProps {
  preset?: EmptyStatePreset;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
}

const presetConfig: Record<EmptyStatePreset, { icon: LucideIcon; title: string; description: string }> = {
  products: {
    icon: Fish,
    title: 'No products yet',
    description: 'Start selling by adding your first product listing.',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  cart: {
    icon: ShoppingCart,
    title: 'Your cart is empty',
    description: 'Browse our marketplace and add items to your cart.',
  },
  orders: {
    icon: Package,
    title: 'No orders yet',
    description: 'Your order history will appear here once you make a purchase.',
  },
  messages: {
    icon: MessageCircle,
    title: 'No messages',
    description: 'Start a conversation with sellers to discuss products.',
  },
  notifications: {
    icon: Bell,
    title: 'No notifications',
    description: 'You\'re all caught up! Check back later for updates.',
  },
  wishlist: {
    icon: Heart,
    title: 'Your wishlist is empty',
    description: 'Save items you love by tapping the heart icon.',
  },
  addresses: {
    icon: MapPin,
    title: 'No addresses saved',
    description: 'Add a delivery address to speed up checkout.',
  },
  reviews: {
    icon: FileText,
    title: 'No reviews yet',
    description: 'Be the first to review this product!',
  },
  generic: {
    icon: Package,
    title: 'Nothing here',
    description: 'There\'s nothing to show at the moment.',
  },
};

export function EmptyState({
  preset = 'generic',
  title,
  description,
  icon,
  iconColor,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}: EmptyStateProps) {
  const config = presetConfig[preset];
  const IconComponent = icon ?? config.icon;
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;
  const displayIconColor = iconColor ?? NeutralColors.gray[400];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <IconComponent size={64} color={displayIconColor} strokeWidth={1.5} />
      </View>
      
      <Text variant="titleLarge" style={styles.title}>
        {displayTitle}
      </Text>
      
      <Text variant="bodyMedium" style={styles.description}>
        {displayDescription}
      </Text>

      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <Button 
              mode="contained" 
              onPress={onAction}
              style={styles.primaryButton}
              buttonColor={BrandColors.primary[500]}
            >
              {actionLabel}
            </Button>
          )}
          
          {secondaryActionLabel && onSecondaryAction && (
            <Button 
              mode="outlined" 
              onPress={onSecondaryAction}
              style={styles.secondaryButton}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Compact version for inline empty states (e.g., in lists)
 */
export function EmptyStateCompact({
  preset = 'generic',
  title,
  description,
  icon,
  style,
}: Omit<EmptyStateProps, 'actionLabel' | 'onAction' | 'secondaryActionLabel' | 'onSecondaryAction'>) {
  const config = presetConfig[preset];
  const IconComponent = icon ?? config.icon;
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;

  return (
    <View style={[styles.compactContainer, style]}>
      <IconComponent size={32} color={NeutralColors.gray[400]} strokeWidth={1.5} />
      <Text variant="titleSmall" style={styles.compactTitle}>
        {displayTitle}
      </Text>
      <Text variant="bodySmall" style={styles.compactDescription}>
        {displayDescription}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[8],
    minHeight: 300,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: NeutralColors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  title: {
    textAlign: 'center',
    color: NeutralColors.gray[800],
    fontWeight: '600',
    marginBottom: Spacing[2],
  },
  description: {
    textAlign: 'center',
    color: NeutralColors.gray[500],
    maxWidth: 280,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing[6],
    alignItems: 'center',
    gap: Spacing[3],
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    minWidth: 160,
  },
  secondaryButton: {
    borderRadius: BorderRadius.lg,
    minWidth: 160,
  },
  compactContainer: {
    alignItems: 'center',
    padding: Spacing[6],
  },
  compactTitle: {
    textAlign: 'center',
    color: NeutralColors.gray[700],
    fontWeight: '500',
    marginTop: Spacing[3],
  },
  compactDescription: {
    textAlign: 'center',
    color: NeutralColors.gray[500],
    marginTop: Spacing[1],
  },
});
