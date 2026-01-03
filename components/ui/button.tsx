/**
 * Fishmart Design System - Button Component
 * 
 * Custom button variants for the Fishmart app.
 */

import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import type { FishmartTheme } from '@/constants/design-system';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface FMButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  onPress?: () => void;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export function FMButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  onPress,
  style,
  labelStyle,
}: FMButtonProps) {
  const theme = useTheme<FishmartTheme>();
  const sizeConfig = theme.custom.componentSizes.button[size];
  
  const getMode = (): 'contained' | 'outlined' | 'text' => {
    if (variant === 'ghost') return 'text';
    return 'contained';
  };
  
  const getButtonColor = () => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'accent':
        return theme.colors.tertiary;
      case 'success':
        return theme.custom.success.main;
      case 'warning':
        return theme.custom.warning.main;
      case 'error':
        return theme.colors.error;
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.primary;
    }
  };
  
  const getTextColor = () => {
    if (variant === 'ghost') return theme.colors.primary;
    if (variant === 'warning') return theme.custom.warning.contrast;
    return theme.colors.onPrimary;
  };
  
  return (
    <PaperButton
      mode={getMode()}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      icon={icon}
      buttonColor={getButtonColor()}
      textColor={getTextColor()}
      style={[
        styles.base,
        { 
          borderRadius: theme.custom.borderRadius.lg,
          minHeight: sizeConfig.height,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      contentStyle={[
        { 
          paddingHorizontal: sizeConfig.paddingHorizontal,
          height: sizeConfig.height,
        },
      ]}
      labelStyle={[
        { fontSize: sizeConfig.fontSize },
        labelStyle,
      ]}
    >
      {children}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  base: {
    // Base styles
  },
  fullWidth: {
    width: '100%',
  },
});
