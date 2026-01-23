/**
 * Fishmart Design System - Skeleton Component
 * 
 * Loading placeholder component with shimmer animation.
 */

import { NeutralColors, BorderRadius, Spacing } from '@/constants/design-system/tokens';
import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';

type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: ViewStyle;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  style,
  animation = 'pulse',
}: SkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animation === 'none') return;

    const animate = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [animation, animatedValue]);

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'circular':
        return {
          width: width ?? 40,
          height: height ?? 40,
          borderRadius: BorderRadius.full,
        };
      case 'rectangular':
        return {
          width: width ?? '100%',
          height: height ?? 100,
          borderRadius: BorderRadius.none,
        };
      case 'rounded':
        return {
          width: width ?? '100%',
          height: height ?? 100,
          borderRadius: BorderRadius.lg,
        };
      case 'text':
      default:
        return {
          width: width ?? '100%',
          height: height ?? 16,
          borderRadius: BorderRadius.sm,
        };
    }
  };

  const opacity = animation === 'pulse'
    ? animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
      })
    : 0.5;

  return (
    <Animated.View
      style={[
        styles.base,
        getVariantStyles(),
        { opacity },
        style,
      ]}
    />
  );
}

/**
 * Pre-built skeleton patterns for common use cases
 */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton variant="rounded" height={160} />
      <View style={styles.cardContent}>
        <Skeleton variant="text" width="70%" height={14} />
        <Skeleton variant="text" width="40%" height={12} style={{ marginTop: Spacing[2] }} />
        <Skeleton variant="text" width="30%" height={18} style={{ marginTop: Spacing[3] }} />
      </View>
    </View>
  );
}

export function SkeletonListItem({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.listItem, style]}>
      <Skeleton variant="circular" width={48} height={48} />
      <View style={styles.listItemContent}>
        <Skeleton variant="text" width="60%" height={14} />
        <Skeleton variant="text" width="80%" height={12} style={{ marginTop: Spacing[2] }} />
      </View>
    </View>
  );
}

export function SkeletonProductDetail() {
  return (
    <View style={styles.productDetail}>
      <Skeleton variant="rectangular" height={300} />
      <View style={styles.productDetailContent}>
        <Skeleton variant="text" width="80%" height={24} />
        <Skeleton variant="text" width="40%" height={28} style={{ marginTop: Spacing[3] }} />
        <Skeleton variant="text" width="100%" height={14} style={{ marginTop: Spacing[4] }} />
        <Skeleton variant="text" width="100%" height={14} style={{ marginTop: Spacing[2] }} />
        <Skeleton variant="text" width="70%" height={14} style={{ marginTop: Spacing[2] }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: NeutralColors.gray[200],
  },
  card: {
    backgroundColor: NeutralColors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  cardContent: {
    padding: Spacing[4],
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: NeutralColors.white,
    borderRadius: BorderRadius.lg,
  },
  listItemContent: {
    flex: 1,
    marginLeft: Spacing[3],
  },
  productDetail: {
    backgroundColor: NeutralColors.white,
  },
  productDetailContent: {
    padding: Spacing[5],
  },
});
