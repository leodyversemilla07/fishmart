/**
 * Fishmart Design System - Layout Components
 * 
 * Container, Section, and Grid components for consistent layouts.
 */

import React from 'react';
import { StyleSheet, View, ScrollView, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FishmartTheme } from '@/constants/design-system';

// =============================================================================
// SCREEN CONTAINER
// =============================================================================

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  safeArea?: boolean | 'top' | 'bottom' | 'horizontal';
  backgroundColor?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function ScreenContainer({
  children,
  scrollable = false,
  padded = true,
  safeArea = true,
  backgroundColor,
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const theme = useTheme<FishmartTheme>();
  const insets = useSafeAreaInsets();
  
  const getSafeAreaPadding = (): ViewStyle => {
    if (!safeArea) return {};
    
    if (safeArea === true) {
      return {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      };
    }
    
    switch (safeArea) {
      case 'top':
        return { paddingTop: insets.top };
      case 'bottom':
        return { paddingBottom: insets.bottom };
      case 'horizontal':
        return { paddingLeft: insets.left, paddingRight: insets.right };
      default:
        return {};
    }
  };
  
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: backgroundColor ?? theme.colors.background,
    ...getSafeAreaPadding(),
  };
  
  const paddedStyle: ViewStyle = padded ? {
    paddingHorizontal: theme.custom.layout.screenPadding,
  } : {};
  
  if (scrollable) {
    return (
      <ScrollView
        style={[containerStyle, style]}
        contentContainerStyle={[paddedStyle, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }
  
  return (
    <View style={[containerStyle, paddedStyle, style]}>
      {children}
    </View>
  );
}

// =============================================================================
// SECTION
// =============================================================================

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Section({
  children,
  title,
  subtitle,
  action,
  spacing = 'md',
  style,
}: SectionProps) {
  const theme = useTheme<FishmartTheme>();
  
  const getSpacing = () => {
    switch (spacing) {
      case 'none': return 0;
      case 'sm': return theme.custom.spacing[4];
      case 'md': return theme.custom.spacing[6];
      case 'lg': return theme.custom.spacing[8];
    }
  };
  
  return (
    <View style={[{ marginBottom: getSpacing() }, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            {title && (
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.onBackground, fontWeight: '700' }}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

// =============================================================================
// ROW
// =============================================================================

interface RowProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: number;
  wrap?: boolean;
  style?: ViewStyle;
}

export function Row({
  children,
  align = 'center',
  justify = 'start',
  gap = 8,
  wrap = false,
  style,
}: RowProps) {
  const alignMap = {
    start: 'flex-start' as const,
    center: 'center' as const,
    end: 'flex-end' as const,
    stretch: 'stretch' as const,
    baseline: 'baseline' as const,
  };
  
  const justifyMap = {
    start: 'flex-start' as const,
    center: 'center' as const,
    end: 'flex-end' as const,
    between: 'space-between' as const,
    around: 'space-around' as const,
    evenly: 'space-evenly' as const,
  };
  
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: alignMap[align],
          justifyContent: justifyMap[justify],
          gap,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// =============================================================================
// COLUMN
// =============================================================================

interface ColumnProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: number;
  style?: ViewStyle;
}

export function Column({
  children,
  align = 'stretch',
  justify = 'start',
  gap = 8,
  style,
}: ColumnProps) {
  const alignMap = {
    start: 'flex-start' as const,
    center: 'center' as const,
    end: 'flex-end' as const,
    stretch: 'stretch' as const,
  };
  
  const justifyMap = {
    start: 'flex-start' as const,
    center: 'center' as const,
    end: 'flex-end' as const,
    between: 'space-between' as const,
    around: 'space-around' as const,
    evenly: 'space-evenly' as const,
  };
  
  return (
    <View
      style={[
        {
          flexDirection: 'column',
          alignItems: alignMap[align],
          justifyContent: justifyMap[justify],
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// =============================================================================
// GRID
// =============================================================================

interface GridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: number;
  style?: ViewStyle;
}

export function Grid({
  children,
  columns = 2,
  gap = 12,
  style,
}: GridProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -gap / 2,
        },
        style,
      ]}
    >
      {React.Children.map(children, (child) => (
        <View
          style={{
            width: `${100 / columns}%`,
            paddingHorizontal: gap / 2,
            marginBottom: gap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// DIVIDER
// =============================================================================

interface DividerProps {
  vertical?: boolean;
  spacing?: number;
  color?: string;
  thickness?: number;
  style?: ViewStyle;
}

export function Divider({
  vertical = false,
  spacing = 16,
  color,
  thickness = 1,
  style,
}: DividerProps) {
  const theme = useTheme<FishmartTheme>();
  
  return (
    <View
      style={[
        {
          backgroundColor: color ?? theme.colors.outlineVariant,
          ...(vertical
            ? {
                width: thickness,
                marginHorizontal: spacing,
                alignSelf: 'stretch',
              }
            : {
                height: thickness,
                marginVertical: spacing,
              }),
        },
        style,
      ]}
    />
  );
}

// =============================================================================
// SPACER
// =============================================================================

interface SpacerProps {
  size?: number;
  flex?: number;
  horizontal?: boolean;
}

export function Spacer({ size, flex, horizontal = false }: SpacerProps) {
  if (flex) {
    return <View style={{ flex }} />;
  }
  
  return (
    <View
      style={horizontal ? { width: size ?? 16 } : { height: size ?? 16 }}
    />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flex: 1,
  },
});
