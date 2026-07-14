/**
 * Sistema de Diseño RouteKids (tema índigo)
 * Paleta, tipografía y estilos globales centralizados para React Native.
 */

export const Colors = {
  // Marca / Primario (índigo RouteKids)
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#a5b4fc',
  primaryContrast: '#ffffff',
  primarySurface: '#eef2ff',

  // Acentos por módulo (usados en el menú por rol)
  cyan: '#06b6d4',
  teal: '#14b8a6',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  orange: '#f97316',
  violet: '#8b5cf6',
  blue: '#3b82f6',

  // Fondos y superficies
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceAlt: '#f7fafc',

  // Texto
  text: '#1a202c',
  textMuted: '#718096',
  textInverse: '#ffffff',

  // Estados
  success: '#38a169',
  successLight: '#e6f6ec',
  error: '#e53e3e',
  errorLight: '#fed7d7',
  warning: '#ed8936',
  warningLight: '#feebc8',

  // Bordes / divisores
  border: '#cbd5e0',
  borderFocus: '#6366f1',

  // Overlay
  overlay: 'rgba(26, 32, 44, 0.45)',
};

export const Fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
};

import { StyleSheet } from 'react-native';

export const GlobalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: Colors.primaryContrast,
    fontSize: FontSizes.md,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  link: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
});
