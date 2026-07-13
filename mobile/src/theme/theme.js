/**
 * Sistema de Diseño RouteKids
 * Paleta de colores, tipografía y estilos globales para React Native.
 */

export const Colors = {
  // Marca / Primario
  primary: '#1E88E5',
  primaryDark: '#1565C0',
  primaryLight: '#64B5F6',
  primaryContrast: '#FFFFFF',

  // Acento / Secundario
  secondary: '#26A69A',
  secondaryDark: '#00897B',
  accent: '#FFB300',

  // Fondos y superficies
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EAF2FB',

  // Texto
  text: '#1A2433',
  textMuted: '#6B7787',
  textInverse: '#FFFFFF',

  // Estados
  success: '#2E9E5B',
  successLight: '#E6F6EC',
  error: '#E53935',
  errorLight: '#FDECEC',
  warning: '#F5A623',
  warningLight: '#FDF3E3',

  // Bordes / divisores
  border: '#DCE3EC',
  borderFocus: '#1E88E5',

  // Overlay
  overlay: 'rgba(26, 36, 51, 0.45)',
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
    shadowColor: '#1A2433',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
};

/**
 * Estilos globales reutilizables construidos con StyleSheet.
 */
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
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  inputFocused: {
    borderColor: Colors.borderFocus,
  },
  buttonPrimary: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: Colors.primaryContrast,
    fontSize: FontSizes.md,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  buttonSecondary: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonSecondaryText: {
    color: Colors.primary,
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
