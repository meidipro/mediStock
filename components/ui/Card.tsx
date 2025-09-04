import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '../../constants/Theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'sm' | 'md' | 'lg' | 'xl' | 'none';
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  onPress?: () => void;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'md',
  shadow = 'md',
  variant = 'default',
  onPress,
  disabled = false,
}) => {
  const paddingStyle = padding === 'sm' ? styles.paddingSm :
                     padding === 'md' ? styles.paddingMd :
                     padding === 'lg' ? styles.paddingLg :
                     styles.paddingXl;

  const cardStyle = [
    styles.base,
    styles[variant],
    shadow !== 'none' && Theme.shadows[shadow],
    paddingStyle,
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return <View style={[styles.content, style]}>{children}</View>;
};

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.surface,
  },
  
  // Variants
  default: {
    backgroundColor: Theme.colors.surface,
  },
  elevated: {
    backgroundColor: Theme.colors.surface,
  },
  outlined: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filled: {
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  
  // Padding sizes
  paddingSm: {
    padding: Theme.components.card.padding.sm,
  },
  paddingMd: {
    padding: Theme.components.card.padding.md,
  },
  paddingLg: {
    padding: Theme.components.card.padding.lg,
  },
  paddingXl: {
    padding: Theme.components.card.padding.xl,
  },
  
  // States
  disabled: {
    opacity: 0.6,
  },
  
  // Sub-components
  header: {
    marginBottom: Theme.spacing.md,
  },
  
  content: {
    flex: 1,
  },
  
  footer: {
    marginTop: Theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  
});

export default Card;