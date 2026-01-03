/**
 * Fishmart Design System - Seller Card Component
 * 
 * Card component for displaying seller information.
 */

import React from 'react';
import { StyleSheet, View, Pressable, ViewStyle } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import { LucideStar, LucideMapPin, LucideMessageCircle, LucideShieldCheck, LucidePackage } from 'lucide-react-native';
import type { FishmartTheme } from '@/constants/design-system';
import { FMChip } from '../ui/chip';
import { FMButton } from '../ui/button';

export interface Seller {
  id: string;
  shopName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  productCount?: number;
  city?: string;
  province?: string;
  bio?: string;
  joinedAt?: string;
  responseTime?: string;
  responseRate?: number;
}

type SellerCardVariant = 'default' | 'compact' | 'inline';

interface SellerCardProps {
  seller: Seller;
  variant?: SellerCardVariant;
  onPress?: () => void;
  onMessagePress?: () => void;
  showStats?: boolean;
  showMessage?: boolean;
  style?: ViewStyle;
}

export function SellerCard({
  seller,
  variant = 'default',
  onPress,
  onMessagePress,
  showStats = true,
  showMessage = true,
  style,
}: SellerCardProps) {
  const theme = useTheme<FishmartTheme>();
  
  const displayName = seller.shopName || `${seller.firstName} ${seller.lastName}`.trim();
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  
  // Inline variant (for product detail pages)
  if (variant === 'inline') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.inlineCard,
          pressed && styles.pressed,
          style,
        ]}
      >
        <Avatar.Text
          size={48}
          label={initials}
          style={{ backgroundColor: theme.colors.primaryContainer }}
          labelStyle={{ color: theme.colors.primary }}
        />
        <View style={styles.inlineContent}>
          <View style={styles.nameRow}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: '600' }}
            >
              {displayName}
            </Text>
            {seller.isVerified && (
              <LucideShieldCheck
                size={16}
                color={theme.custom.special.verified}
                fill={theme.custom.special.verified}
              />
            )}
          </View>
          <View style={styles.inlineStats}>
            {seller.rating !== undefined && (
              <View style={styles.statRow}>
                <LucideStar
                  size={14}
                  color={theme.custom.special.rating.filled}
                  fill={theme.custom.special.rating.filled}
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {seller.rating.toFixed(1)} ({seller.reviewCount || 0})
                </Text>
              </View>
            )}
          </View>
        </View>
        {showMessage && onMessagePress && (
          <Pressable
            onPress={onMessagePress}
            style={[styles.messageButton, { backgroundColor: theme.colors.primaryContainer }]}
          >
            <LucideMessageCircle size={20} color={theme.colors.primary} />
          </Pressable>
        )}
      </Pressable>
    );
  }
  
  // Compact variant
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
        <Avatar.Text
          size={40}
          label={initials}
          style={{ backgroundColor: theme.colors.primaryContainer }}
          labelStyle={{ color: theme.colors.primary, fontSize: 14 }}
        />
        <View style={styles.compactContent}>
          <View style={styles.nameRow}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '600' }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {seller.isVerified && (
              <LucideShieldCheck size={14} color={theme.custom.special.verified} />
            )}
          </View>
          {seller.rating !== undefined && (
            <View style={styles.statRow}>
              <LucideStar
                size={12}
                color={theme.custom.special.rating.filled}
                fill={theme.custom.special.rating.filled}
              />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {seller.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }
  
  // Default variant (full card)
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
      {/* Header */}
      <View style={styles.header}>
        <Avatar.Text
          size={56}
          label={initials}
          style={{ backgroundColor: theme.colors.primaryContainer }}
          labelStyle={{ color: theme.colors.primary }}
        />
        <View style={styles.headerContent}>
          <View style={styles.nameRow}>
            <Text
              variant="titleLarge"
              style={{ color: theme.colors.onSurface, fontWeight: '600' }}
            >
              {displayName}
            </Text>
            {seller.isVerified && (
              <FMChip size="sm" color="success" icon={LucideShieldCheck}>
                Verified
              </FMChip>
            )}
          </View>
          
          {seller.city && (
            <View style={styles.locationRow}>
              <LucideMapPin size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {seller.city}{seller.province ? `, ${seller.province}` : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Bio */}
      {seller.bio && (
        <Text
          variant="bodyMedium"
          style={[styles.bio, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={2}
        >
          {seller.bio}
        </Text>
      )}
      
      {/* Stats */}
      {showStats && (
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.stat}>
            <LucideStar
              size={18}
              color={theme.custom.special.rating.filled}
              fill={theme.custom.special.rating.filled}
            />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {seller.rating?.toFixed(1) || 'New'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Rating
            </Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          
          <View style={styles.stat}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {seller.reviewCount || 0}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Reviews
            </Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          
          <View style={styles.stat}>
            <LucidePackage size={18} color={theme.colors.primary} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {seller.productCount || 0}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Products
            </Text>
          </View>
        </View>
      )}
      
      {/* Response info */}
      {(seller.responseTime || seller.responseRate !== undefined) && (
        <View style={styles.responseInfo}>
          {seller.responseTime && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Responds {seller.responseTime}
            </Text>
          )}
          {seller.responseRate !== undefined && (
            <Text variant="bodySmall" style={{ color: theme.custom.success.main }}>
              {seller.responseRate}% response rate
            </Text>
          )}
        </View>
      )}
      
      {/* Actions */}
      {showMessage && onMessagePress && (
        <View style={styles.actions}>
          <FMButton
            variant="primary"
            icon="message-text"
            onPress={onMessagePress}
            fullWidth
          >
            Message Seller
          </FMButton>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Default variant
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bio: {
    marginTop: 12,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  responseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actions: {
    marginTop: 16,
  },
  pressed: {
    opacity: 0.95,
  },
  
  // Inline variant
  inlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inlineContent: {
    flex: 1,
  },
  inlineStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Compact variant
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  compactContent: {
    flex: 1,
  },
});
