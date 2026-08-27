export const Colors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    card: '#FFFFFF',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    primary: '#6366F1',
    primaryLight: '#EEF2FF',
    primaryDark: '#4F46E5',
    secondary: '#A855F7',
    success: '#10B981',
    successLight: '#ECFDF5',
    danger: '#F43F5E',
    dangerLight: '#FFF1F2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
  },
  dark: {
    background: '#020617',
    surface: '#0F172A',
    surfaceElevated: '#1E293B',
    card: '#0F172A',
    border: '#1E293B',
    borderSubtle: '#0F172A',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    primary: '#6366F1',
    primaryLight: 'rgba(99, 102, 241, 0.15)',
    primaryDark: '#4F46E5',
    secondary: '#A855F7',
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.15)',
    danger: '#F43F5E',
    dangerLight: 'rgba(244, 63, 94, 0.15)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    info: '#3B82F6',
    tabBar: '#0B1120',
    tabBarBorder: '#1E293B',
  },
};

export const Gradients = {
  primary: ['#7C3AED', '#DB2777', '#F43F5E'],
  card: ['#1E1B4B', '#312E81'],
  emerald: ['#059669', '#10B981'],
  rose: ['#E11D48', '#F43F5E'],
  amber: ['#D97706', '#F59E0B'],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Typography = {
  titleLarge: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  titleSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
};
