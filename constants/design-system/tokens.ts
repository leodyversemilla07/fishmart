/**
 * Fishmart Design System - Design Tokens
 * 
 * Core design tokens for the Fishmart mobile app.
 * These tokens define the visual language of the application.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Brand Colors
 * Primary colors inspired by aquatic themes - ocean blues and aqua tones
 */
export const BrandColors = {
  // Primary - Ocean Blue (main brand color)
  primary: {
    50: '#E6F4FF',
    100: '#BAE3FF',
    200: '#7CC4FA',
    300: '#47A3F3',
    400: '#2186EB',
    500: '#0967D2', // Main primary
    600: '#0552B5',
    700: '#03449E',
    800: '#01337D',
    900: '#002159',
  },
  
  // Secondary - Aqua/Teal (complementary)
  secondary: {
    50: '#E6FFFA',
    100: '#B2F5EA',
    200: '#81E6D9',
    300: '#4FD1C5',
    400: '#38B2AC',
    500: '#319795', // Main secondary
    600: '#2C7A7B',
    700: '#285E61',
    800: '#234E52',
    900: '#1D4044',
  },
  
  // Accent - Coral/Orange (for CTAs and highlights)
  accent: {
    50: '#FFF5F0',
    100: '#FFE4D6',
    200: '#FFC9B8',
    300: '#FFAB91',
    400: '#FF8A65',
    500: '#FF6B35', // Main accent
    600: '#F4511E',
    700: '#E64A19',
    800: '#D84315',
    900: '#BF360C',
  },
} as const;

/**
 * Semantic Colors
 * Colors with specific meanings for UI feedback
 */
export const SemanticColors = {
  success: {
    light: '#D1FAE5',
    main: '#10B981',
    dark: '#059669',
    contrast: '#FFFFFF',
  },
  warning: {
    light: '#FEF3C7',
    main: '#F59E0B',
    dark: '#D97706',
    contrast: '#1A1A1A',
  },
  error: {
    light: '#FEE2E2',
    main: '#EF4444',
    dark: '#DC2626',
    contrast: '#FFFFFF',
  },
  info: {
    light: '#DBEAFE',
    main: '#3B82F6',
    dark: '#2563EB',
    contrast: '#FFFFFF',
  },
} as const;

/**
 * Neutral Colors
 * Grayscale palette for text, backgrounds, and borders
 */
export const NeutralColors = {
  white: '#FFFFFF',
  black: '#000000',
  
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
} as const;

/**
 * Special Colors
 * Colors for specific use cases in the fish marketplace
 */
export const SpecialColors = {
  // Fish gender indicators
  gender: {
    male: '#3B82F6',    // Blue
    female: '#EC4899',  // Pink
    pair: '#8B5CF6',    // Purple
    unknown: '#6B7280', // Gray
  },
  
  // Stock status
  stock: {
    inStock: '#10B981',
    lowStock: '#F59E0B',
    outOfStock: '#EF4444',
  },
  
  // Rating stars
  rating: {
    filled: '#FBBF24',
    empty: '#E2E8F0',
  },
  
  // Order status
  orderStatus: {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    processing: '#8B5CF6',
    shipped: '#06B6D4',
    delivered: '#10B981',
    cancelled: '#EF4444',
    refunded: '#6B7280',
  },
  
  // Verified badge
  verified: '#10B981',
  
  // Water/aquatic backgrounds
  aquatic: {
    shallow: '#E0F7FA',
    medium: '#B2EBF2',
    deep: '#00838F',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

/**
 * Font Families
 */
export const FontFamilies = {
  // System fonts for optimal performance
  sans: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
} as const;

/**
 * Font Sizes
 * Using a modular scale (1.25 ratio)
 */
export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

/**
 * Font Weights
 */
export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/**
 * Line Heights
 */
export const LineHeights = {
  tight: 1.2,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

/**
 * Letter Spacing
 */
export const LetterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

/**
 * Typography Presets
 * Ready-to-use text styles
 */
export const Typography = {
  // Display styles (for hero sections)
  displayLarge: {
    fontSize: FontSizes['5xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['5xl'] * LineHeights.tight,
    letterSpacing: LetterSpacing.tight,
  },
  displayMedium: {
    fontSize: FontSizes['4xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['4xl'] * LineHeights.tight,
    letterSpacing: LetterSpacing.tight,
  },
  displaySmall: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['3xl'] * LineHeights.tight,
    letterSpacing: LetterSpacing.normal,
  },
  
  // Headings
  headlineLarge: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['2xl'] * LineHeights.snug,
    letterSpacing: LetterSpacing.normal,
  },
  headlineMedium: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.xl * LineHeights.snug,
    letterSpacing: LetterSpacing.normal,
  },
  headlineSmall: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.lg * LineHeights.snug,
    letterSpacing: LetterSpacing.normal,
  },
  
  // Titles
  titleLarge: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.lg * LineHeights.normal,
    letterSpacing: LetterSpacing.normal,
  },
  titleMedium: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.base * LineHeights.normal,
    letterSpacing: LetterSpacing.wide,
  },
  titleSmall: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.md * LineHeights.normal,
    letterSpacing: LetterSpacing.wide,
  },
  
  // Body text
  bodyLarge: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.base * LineHeights.relaxed,
    letterSpacing: LetterSpacing.normal,
  },
  bodyMedium: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.md * LineHeights.relaxed,
    letterSpacing: LetterSpacing.normal,
  },
  bodySmall: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.sm * LineHeights.relaxed,
    letterSpacing: LetterSpacing.normal,
  },
  
  // Labels
  labelLarge: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    lineHeight: FontSizes.md * LineHeights.normal,
    letterSpacing: LetterSpacing.wide,
  },
  labelMedium: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    lineHeight: FontSizes.sm * LineHeights.normal,
    letterSpacing: LetterSpacing.wide,
  },
  labelSmall: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    lineHeight: FontSizes.xs * LineHeights.normal,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  
  // Special
  price: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes.xl * LineHeights.tight,
    letterSpacing: LetterSpacing.tight,
  },
  priceLarge: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes['2xl'] * LineHeights.tight,
    letterSpacing: LetterSpacing.tight,
  },
  caption: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.xs * LineHeights.normal,
    letterSpacing: LetterSpacing.wide,
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

/**
 * Spacing Scale
 * Based on 4px base unit
 */
export const Spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

/**
 * Layout Spacing
 * Common spacing values for layout
 */
export const LayoutSpacing = {
  screenPadding: Spacing[5], // 20px - screen edge padding
  sectionGap: Spacing[8],    // 32px - gap between sections
  cardPadding: Spacing[4],   // 16px - card internal padding
  listGap: Spacing[3],       // 12px - gap between list items
  inlineGap: Spacing[2],     // 8px - gap between inline elements
  iconGap: Spacing[2],       // 8px - gap between icon and text
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const ZIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
} as const;

// =============================================================================
// ANIMATION
// =============================================================================

export const Animation = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// =============================================================================
// ICONS
// =============================================================================

export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// =============================================================================
// COMPONENT SIZES
// =============================================================================

export const ComponentSizes = {
  button: {
    sm: { height: 32, paddingHorizontal: 12, fontSize: FontSizes.sm },
    md: { height: 40, paddingHorizontal: 16, fontSize: FontSizes.md },
    lg: { height: 48, paddingHorizontal: 20, fontSize: FontSizes.base },
    xl: { height: 56, paddingHorizontal: 24, fontSize: FontSizes.lg },
  },
  input: {
    sm: { height: 36, paddingHorizontal: 12, fontSize: FontSizes.sm },
    md: { height: 44, paddingHorizontal: 14, fontSize: FontSizes.md },
    lg: { height: 52, paddingHorizontal: 16, fontSize: FontSizes.base },
  },
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
    '3xl': 96,
  },
  badge: {
    sm: { height: 18, minWidth: 18, fontSize: FontSizes.xs },
    md: { height: 22, minWidth: 22, fontSize: FontSizes.sm },
    lg: { height: 26, minWidth: 26, fontSize: FontSizes.md },
  },
  chip: {
    sm: { height: 24, paddingHorizontal: 8, fontSize: FontSizes.xs },
    md: { height: 32, paddingHorizontal: 12, fontSize: FontSizes.sm },
    lg: { height: 40, paddingHorizontal: 16, fontSize: FontSizes.md },
  },
} as const;
