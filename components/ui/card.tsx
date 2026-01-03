/**
 * Fishmart Design System - Card Component
 * 
 * Flexible card component with multiple variants.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { FishmartTheme } from '@/constants/design-system';

type CardVariant = 'elevated' | 'outlined' | 'filled';

interface FMCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function FMCard({
  children,
  variant = 'elevated',
  padding = 'md',
  borderRadius = 'lg',
  onPress,
  disabled = false,
  style,
}: FMCardProps) {
  const theme = useTheme<FishmartTheme>();
  
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return theme.custom.spacing[2];
      case 'md': return theme.custom.spacing[4];
      case 'lg': return theme.custom.spacing[6];
      default: return theme.custom.spacing[4];
    }
  };
  
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.surface,
          ...theme.custom.shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        };
      case 'filled':
        return {
          backgroundColor: theme.colors.surfaceVariant,
        };
      default:
        return {};
    }
  };
  
  const cardStyle: ViewStyle = {
    padding: getPadding(),
    borderRadius: theme.custom.borderRadius[borderRadius],
    ...getVariantStyles(),
    opacity: disabled ? 0.6 : 1,
  };
  
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  
  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}

/**
 * Card Header Component
 */
interface FMCardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function FMCardHeader({ children, style }: FMCardHeaderProps) {
  const theme = useTheme<FishmartTheme>();
  
  return (
    <View style={[
      styles.header,
      { marginBottom: theme.custom.spacing[3] },
      style,
    ]}>
      {children}
    </View>
  );
}

/**
 * Card Content Component
 */
interface FMCardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function FMCardContent({ children, style }: FMCardContentProps) {
  return (
    <View style={[styles.content, style]}>
      {children}
    </View>
  );
}

/**
 * Card Footer Component
 */
interface FMCardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function FMCardFooter({ children, style }: FMCardFooterProps) {
  const theme = useTheme<FishmartTheme>();
  
  return (
    <View style={[
      styles.footer,
      { 
        marginTop: theme.custom.spacing[3],
        paddingTop: theme.custom.spacing[3],
        borderTopWidth: 1,
        borderTopColor: theme.colors.outlineVariant,
      },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    // Default content styles
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
