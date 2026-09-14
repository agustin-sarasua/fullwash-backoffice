/**
 * Design tokens.
 *
 * Seeded from the colours the Flutter app already uses in its bottom navigation
 * (indigo-700 #4338CA, violet-700 #6D28D9, red-500 #EF4444), so the two products look
 * related. Those are Tailwind palette values, hence the rest of the scale matching
 * Tailwind's -- it is a known-good ramp, not an arbitrary one.
 */

export const colors = {
  primary: '#4338CA',
  primaryHover: '#3730A3',
  primarySubtle: '#EEF2FF',
  accent: '#6D28D9',

  danger: '#EF4444',
  dangerSubtle: '#FEF2F2',
  success: '#059669',
  successSubtle: '#ECFDF5',
  warning: '#D97706',
  warningSubtle: '#FFFBEB',

  text: '#111827',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  textInverse: '#FFFFFF',

  bg: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = { sm: 4, md: 8, lg: 12, pill: 999 } as const;

export const font = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Wide enough for a data table; below this the layout stacks. */
export const BREAKPOINT_WIDE = 900;
