/**
 * Fishmart Design System - Chip Component
 * 
 * Compact elements for selection, filtering, and display.
 */

import React from 'react';
import { StyleSheet, View, Pressable, ViewStyle, TextStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { LucideIcon } from 'lucide-react-native';
import type { FishmartTheme } from '@/constants/design-system';

type ChipVariant = 'filled' | 'outlined' | 'soft';
type ChipSize = 'sm' | 'md' | 'lg';
type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

interface FMChipProps {
  children: React.ReactNode;
  variant?: ChipVariant;
  size?: ChipSize;
  color?: ChipColor;
  selected?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  onPress?: () => void;
  onClose?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function FMChip({
  children,
  variant = 'soft',
  size = 'md',
  color = 'default',
  selected = false,
  disabled = false,
  icon: Icon,
  onPress,
  onClose,
  style,
  textStyle,
}: FMChipProps) {
  const theme = useTheme<FishmartTheme>();
  const sizeConfig = theme.custom.componentSizes.chip[size];
  
  const getColors = () => {
    const colorMap = {
      default: { main: theme.colors.onSurfaceVariant, bg: theme.colors.surfaceVariant },
      primary: { main: theme.colors.primary, bg: theme.colors.primaryContainer },
      secondary: { main: theme.colors.secondary, bg: theme.colors.secondaryContainer },
      success: { main: theme.custom.success.main, bg: theme.custom.success.light },
      warning: { main: theme.custom.warning.main, bg: theme.custom.warning.light },
      error: { main: theme.colors.error, bg: theme.colors.errorContainer },
      info: { main: theme.custom.info.main, bg: theme.custom.info.light },
    };
    return colorMap[color];
  };
  
  const colors = getColors();
  
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'filled':
        return {
          container: { backgroundColor: selected ? colors.main : colors.bg },
          text: { color: selected ? theme.colors.surface : colors.main },
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: selected ? colors.bg : 'transparent',
            borderWidth: 1,
            borderColor: colors.main,
          },
          text: { color: colors.main },
        };
      case 'soft':
      default:
        return {
          container: { backgroundColor: colors.bg },
          text: { color: colors.main },
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;
  
  const content = (
    <View
      style={[
        styles.container,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.height / 2,
          opacity: disabled ? 0.5 : 1,
        },
        variantStyles.container,
        style,
      ]}
    >
      {Icon && (
        <Icon
          size={iconSize}
          color={variantStyles.text.color as string}
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        style={[
          styles.text,
          { fontSize: sizeConfig.fontSize },
          variantStyles.text,
          textStyle,
        ]}
      >
        {children}
      </Text>
      {onClose && (
        <Pressable
          onPress={onClose}
          disabled={disabled}
          hitSlop={8}
          style={styles.closeButton}
        >
          <Text style={[styles.closeIcon, variantStyles.text]}>×</Text>
        </Pressable>
      )}
    </View>
  );
  
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }
  
  return content;
}

/**
 * Chip Group for managing multiple chips
 */
interface FMChipGroupProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gap?: number;
}

export function FMChipGroup({ children, style, gap = 8 }: FMChipGroupProps) {
  return (
    <View style={[styles.group, { gap }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 4,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
