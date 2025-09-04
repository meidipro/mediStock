// Modern UI Theme for MediStock BD
export const Theme = {
  colors: {
    // Primary colors - Medical/Healthcare theme
    primary: '#2563EB',      // Blue 600
    primaryLight: '#3B82F6', // Blue 500
    primaryDark: '#1E40AF',  // Blue 700
    
    // Secondary colors
    secondary: '#059669',     // Emerald 600
    secondaryLight: '#10B981', // Emerald 500
    secondaryDark: '#047857', // Emerald 700
    
    // Accent colors
    accent: '#DC2626',       // Red 600 (for alerts, low stock)
    accentLight: '#EF4444',  // Red 500
    warning: '#D97706',      // Amber 600
    warningLight: '#F59E0B', // Amber 500
    
    // Neutral colors
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC', // Slate 50
    backgroundTertiary: '#F1F5F9',  // Slate 100
    
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    
    // Text colors
    text: '#0F172A',         // Slate 900
    textSecondary: '#475569', // Slate 600
    textTertiary: '#64748B',  // Slate 500
    textLight: '#CBD5E1',     // Slate 300
    
    // Border colors
    border: '#E2E8F0',       // Slate 200
    borderLight: '#F1F5F9',  // Slate 100
    borderDark: '#CBD5E1',   // Slate 300
    
    // Status colors
    success: '#059669',      // Emerald 600
    successLight: '#D1FAE5', // Emerald 100
    error: '#DC2626',        // Red 600
    errorLight: '#FEE2E2',   // Red 100
    info: '#2563EB',         // Blue 600
    infoLight: '#DBEAFE',    // Blue 100
    
    // Special colors
    due: '#DC2626',          // Red 600 for due amounts
    paid: '#059669',         // Emerald 600 for paid amounts
    stock: '#D97706',        // Amber 600 for stock levels
    
    // Dark mode colors (for future use)
    dark: {
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      border: '#334155',
    }
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  typography: {
    // Font sizes
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      display: 48,
    },
    
    // Font weights
    weights: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    
    // Line heights
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
    },
  },
  
  shadows: {
    sm: {
      // React Native shadow only
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      // React Native shadow only
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      // React Native shadow only
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      // React Native shadow only
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
  },
  
  animations: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 400,
    },
    
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
  
  // Component specific styles
  components: {
    button: {
      height: {
        sm: 32,
        md: 40,
        lg: 48,
        xl: 56,
      },
      
      padding: {
        horizontal: {
          sm: 12,
          md: 16,
          lg: 20,
          xl: 24,
        },
      },
    },
    
    input: {
      height: {
        sm: 36,
        md: 44,
        lg: 52,
      },
      
      padding: {
        horizontal: 12,
      },
    },
    
    card: {
      padding: {
        sm: 12,
        md: 16,
        lg: 20,
        xl: 24,
      },
    },
  },
  
  // Layout constants
  layout: {
    headerHeight: 60,
    tabBarHeight: 80,
    drawerWidth: 280,
    maxContentWidth: 1200,
    
    // Screen margins
    screenMargin: {
      horizontal: 16,
      vertical: 16,
    },
    
    // List item heights
    listItem: {
      sm: 48,
      md: 56,
      lg: 64,
    },
  },
  
  // Status bar styles
  statusBar: {
    light: 'dark-content',
    dark: 'light-content',
  },
} as const;

export type ThemeType = typeof Theme;

// Helper functions for theme usage - backward compatible version
export const createThemedStyles = <T extends Record<string, any>>(
  styleFunction: (theme: ThemeType) => T
): T => {
  // For now, return light theme styles to prevent errors
  // This should be gradually replaced with useThemedStyles hook
  return styleFunction(Theme);
};

// Get theme colors based on color scheme
export const getThemeColors = (colorScheme: 'light' | 'dark') => {
  return colorScheme === 'dark' 
    ? { 
        ...Theme, 
        colors: {
          ...Theme.colors,
          background: Theme.colors.dark.background,
          surface: Theme.colors.dark.surface,
          text: Theme.colors.dark.text,
          textSecondary: Theme.colors.dark.textSecondary,
          border: Theme.colors.dark.border,
        }
      }
    : Theme;
};

// Color helper functions
export const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'paid':
    case 'active':
    case 'available':
      return Theme.colors.success;
    case 'pending':
    case 'draft':
    case 'processing':
      return Theme.colors.warning;
    case 'cancelled':
    case 'expired':
    case 'inactive':
    case 'out_of_stock':
      return Theme.colors.error;
    case 'due':
    case 'overdue':
      return Theme.colors.due;
    default:
      return Theme.colors.textSecondary;
  }
};

export const getStockStatusColor = (quantity: number, threshold: number = 10) => {
  if (quantity === 0) return Theme.colors.error;
  if (quantity <= threshold) return Theme.colors.warning;
  return Theme.colors.success;
};

export default Theme;