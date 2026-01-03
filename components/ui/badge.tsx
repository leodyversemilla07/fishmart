/**
 * Fishmart Design System - Badge Component
 * 
 * Small status indicators and counters.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { FishmartTheme } from '@/constants/design-system';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface FMBadgeProps {
  children?: React.ReactNode;
  count?: number;
  maxCount?: number;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  visible?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function FMBadge({
  children,
  count,
  maxCount = 99,
  variant = 'primary',
  size = 'md',
  dot = false,
  visible = true,
  style,
  textStyle,
}: FMBadgeProps) {
  const theme = useTheme<FishmartTheme>();
  
  if (!visible) return null;
  
  const sizeConfig = theme.custom.componentSizes.badge[size];
  
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: theme.colors.primary, text: theme.colors.onPrimary };
      case 'secondary':
        return { bg: theme.colors.secondary, text: theme.colors.onSecondary };
      case 'success':
        return { bg: theme.custom.success.main, text: theme.custom.success.contrast };
      case 'warning':
        return { bg: theme.custom.warning.main, text: theme.custom.warning.contrast };
      case 'error':
        return { bg: theme.colors.error, text: theme.colors.onError };
      case 'info':
        return { bg: theme.custom.info.main, text: theme.custom.info.contrast };
      default:
        return { bg: theme.colors.surfaceVariant, text: theme.colors.onSurfaceVariant };
    }
  };
  
  const colors = getColors();
  const displayCount = count !== undefined 
    ? (count > maxCount ? `${maxCount}+` : count.toString())
    : undefined;
  
  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          {
            backgroundColor: colors.bg,
            width: size === 'sm' ? 6 : size === 'md' ? 8 : 10,
            height: size === 'sm' ? 6 : size === 'md' ? 8 : 10,
          },
          style,
        ]}
      />
    );
  }
  
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          minWidth: sizeConfig.minWidth,
          height: sizeConfig.height,
          borderRadius: sizeConfig.height / 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: sizeConfig.fontSize,
          },
          textStyle,
        ]}
      >
        {displayCount ?? children}
      </Text>
    </View>
  );
}

/**
 * Badge wrapper for positioning badges on other components
 */
interface FMBadgeWrapperProps {
  children: React.ReactNode;
  badge: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  offset?: { x?: number; y?: number };
}

export function FMBadgeWrapper({
  children,
  badge,
  position = 'top-right',
  offset = {},
}: FMBadgeWrapperProps) {
  const getPositionStyle = (): ViewStyle => {
    const baseOffset = { x: offset.x ?? -4, y: offset.y ?? -4 };
    
    switch (position) {
      case 'top-right':
        return { top: baseOffset.y, right: baseOffset.x };
      case 'top-left':
        return { top: baseOffset.y, left: baseOffset.x };
      case 'bottom-right':
        return { bottom: baseOffset.y, right: baseOffset.x };
      case 'bottom-left':
        return { bottom: baseOffset.y, left: baseOffset.x };
    }
  };
  
  return (
    <View style={styles.wrapper}>
      {children}
      <View style={[styles.badgePosition, getPositionStyle()]}>
        {badge}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  dot: {
    borderRadius: 100,
  },
  wrapper: {
    position: 'relative',
  },
  badgePosition: {
    position: 'absolute',
  },
});
