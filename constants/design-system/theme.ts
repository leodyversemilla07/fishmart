/**
 * Fishmart Design System - Theme Configuration
 * 
 * Complete theme configuration with light and dark mode support.
 * Integrates with React Native Paper's MD3 theme system.
 */

import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import {
  BrandColors,
  SemanticColors,
  NeutralColors,
  SpecialColors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  ComponentSizes,
  IconSizes,
  LayoutSpacing,
} from './tokens';

// =============================================================================
// LIGHT THEME COLORS
// =============================================================================

const lightColors = {
  // Primary
  primary: BrandColors.primary[500],
  onPrimary: NeutralColors.white,
  primaryContainer: BrandColors.primary[100],
  onPrimaryContainer: BrandColors.primary[900],
  
  // Secondary
  secondary: BrandColors.secondary[500],
  onSecondary: NeutralColors.white,
  secondaryContainer: BrandColors.secondary[100],
  onSecondaryContainer: BrandColors.secondary[900],
  
  // Tertiary (Accent)
  tertiary: BrandColors.accent[500],
  onTertiary: NeutralColors.white,
  tertiaryContainer: BrandColors.accent[100],
  onTertiaryContainer: BrandColors.accent[900],
  
  // Error
  error: SemanticColors.error.main,
  onError: SemanticColors.error.contrast,
  errorContainer: SemanticColors.error.light,
  onErrorContainer: SemanticColors.error.dark,
  
  // Background & Surface
  background: NeutralColors.gray[50],
  onBackground: NeutralColors.gray[900],
  surface: NeutralColors.white,
  onSurface: NeutralColors.gray[900],
  surfaceVariant: NeutralColors.gray[100],
  onSurfaceVariant: NeutralColors.gray[600],
  
  // Outline
  outline: NeutralColors.gray[300],
  outlineVariant: NeutralColors.gray[200],
  
  // Inverse
  inverseSurface: NeutralColors.gray[800],
  inverseOnSurface: NeutralColors.gray[100],
  inversePrimary: BrandColors.primary[200],
  
  // Shadow & Scrim
  shadow: NeutralColors.black,
  scrim: NeutralColors.black,
  
  // Surface tints
  surfaceDisabled: `${NeutralColors.gray[900]}1F`, // 12% opacity
  onSurfaceDisabled: `${NeutralColors.gray[900]}61`, // 38% opacity
  
  // Elevation (for MD3 elevation system)
  elevation: {
    level0: 'transparent',
    level1: NeutralColors.white,
    level2: NeutralColors.gray[50],
    level3: NeutralColors.gray[100],
    level4: NeutralColors.gray[100],
    level5: NeutralColors.gray[200],
  },
  
  // Backdrop
  backdrop: `${NeutralColors.black}4D`, // 30% opacity
};

// =============================================================================
// DARK THEME COLORS
// =============================================================================

const darkColors = {
  // Primary
  primary: BrandColors.primary[300],
  onPrimary: BrandColors.primary[900],
  primaryContainer: BrandColors.primary[700],
  onPrimaryContainer: BrandColors.primary[100],
  
  // Secondary
  secondary: BrandColors.secondary[300],
  onSecondary: BrandColors.secondary[900],
  secondaryContainer: BrandColors.secondary[700],
  onSecondaryContainer: BrandColors.secondary[100],
  
  // Tertiary (Accent)
  tertiary: BrandColors.accent[300],
  onTertiary: BrandColors.accent[900],
  tertiaryContainer: BrandColors.accent[700],
  onTertiaryContainer: BrandColors.accent[100],
  
  // Error
  error: '#F87171', // Lighter red for dark mode
  onError: SemanticColors.error.dark,
  errorContainer: '#7F1D1D',
  onErrorContainer: SemanticColors.error.light,
  
  // Background & Surface
  background: NeutralColors.gray[900],
  onBackground: NeutralColors.gray[100],
  surface: NeutralColors.gray[800],
  onSurface: NeutralColors.gray[100],
  surfaceVariant: NeutralColors.gray[700],
  onSurfaceVariant: NeutralColors.gray[300],
  
  // Outline
  outline: NeutralColors.gray[500],
  outlineVariant: NeutralColors.gray[600],
  
  // Inverse
  inverseSurface: NeutralColors.gray[100],
  inverseOnSurface: NeutralColors.gray[800],
  inversePrimary: BrandColors.primary[600],
  
  // Shadow & Scrim
  shadow: NeutralColors.black,
  scrim: NeutralColors.black,
  
  // Surface tints
  surfaceDisabled: `${NeutralColors.gray[100]}1F`,
  onSurfaceDisabled: `${NeutralColors.gray[100]}61`,
  
  // Elevation
  elevation: {
    level0: 'transparent',
    level1: NeutralColors.gray[800],
    level2: NeutralColors.gray[700],
    level3: NeutralColors.gray[700],
    level4: NeutralColors.gray[600],
    level5: NeutralColors.gray[600],
  },
  
  // Backdrop
  backdrop: `${NeutralColors.black}80`, // 50% opacity
};

// =============================================================================
// FONT CONFIGURATION
// =============================================================================

const fontConfig = {
  displayLarge: Typography.displayLarge,
  displayMedium: Typography.displayMedium,
  displaySmall: Typography.displaySmall,
  headlineLarge: Typography.headlineLarge,
  headlineMedium: Typography.headlineMedium,
  headlineSmall: Typography.headlineSmall,
  titleLarge: Typography.titleLarge,
  titleMedium: Typography.titleMedium,
  titleSmall: Typography.titleSmall,
  bodyLarge: Typography.bodyLarge,
  bodyMedium: Typography.bodyMedium,
  bodySmall: Typography.bodySmall,
  labelLarge: Typography.labelLarge,
  labelMedium: Typography.labelMedium,
  labelSmall: Typography.labelSmall,
};

// =============================================================================
// CUSTOM THEME EXTENSIONS
// =============================================================================

/**
 * Extended theme properties specific to Fishmart
 */
export interface FishmartThemeExtension {
  custom: {
    // Semantic colors
    success: typeof SemanticColors.success;
    warning: typeof SemanticColors.warning;
    info: typeof SemanticColors.info;
    
    // Special colors
    special: typeof SpecialColors;
    
    // Spacing
    spacing: typeof Spacing;
    layout: typeof LayoutSpacing;
    
    // Border radius
    borderRadius: typeof BorderRadius;
    
    // Shadows
    shadows: typeof Shadows;
    
    // Component sizes
    componentSizes: typeof ComponentSizes;
    
    // Icon sizes
    iconSizes: typeof IconSizes;
  };
}

export type FishmartTheme = MD3Theme & FishmartThemeExtension;

// =============================================================================
// THEME OBJECTS
// =============================================================================

const customThemeExtension: FishmartThemeExtension = {
  custom: {
    success: SemanticColors.success,
    warning: SemanticColors.warning,
    info: SemanticColors.info,
    special: SpecialColors,
    spacing: Spacing,
    layout: LayoutSpacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
    componentSizes: ComponentSizes,
    iconSizes: IconSizes,
  },
};

/**
 * Fishmart Light Theme
 */
export const FishmartLightTheme: FishmartTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  fonts: configureFonts({ config: fontConfig }),
  ...customThemeExtension,
};

/**
 * Fishmart Dark Theme
 */
export const FishmartDarkTheme: FishmartTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  fonts: configureFonts({ config: fontConfig }),
  ...customThemeExtension,
};

// =============================================================================
// NAVIGATION THEMES
// =============================================================================

import { DefaultTheme, DarkTheme } from '@react-navigation/native';

/**
 * React Navigation theme for light mode
 */
export const NavigationLightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: BrandColors.primary[500],
    background: NeutralColors.gray[50],
    card: NeutralColors.white,
    text: NeutralColors.gray[900],
    border: NeutralColors.gray[200],
    notification: BrandColors.accent[500],
  },
};

/**
 * React Navigation theme for dark mode
 */
export const NavigationDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: BrandColors.primary[300],
    background: NeutralColors.gray[900],
    card: NeutralColors.gray[800],
    text: NeutralColors.gray[100],
    border: NeutralColors.gray[700],
    notification: BrandColors.accent[400],
  },
};

// =============================================================================
// THEME HOOK HELPER
// =============================================================================

import { useTheme as usePaperTheme } from 'react-native-paper';

/**
 * Custom hook to access the Fishmart theme with full type support
 */
export const useTheme = () => usePaperTheme<FishmartTheme>();

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Re-export tokens for direct access
  BrandColors,
  SemanticColors,
  NeutralColors,
  SpecialColors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  ComponentSizes,
  IconSizes,
  LayoutSpacing,
};
