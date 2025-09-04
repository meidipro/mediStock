import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
} from 'react-native';
import { Theme } from '../../constants/Theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    (disabled || loading) && styles.disabledText,
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.contentContainer}>
          <ActivityIndicator
            size="small"
            color={variant === 'outline' || variant === 'ghost' ? Theme.colors.primary : Theme.colors.background}
          />
          <Text style={[textStyle, styles.loadingText]}>Loading...</Text>
        </View>
      );
    }

    if (icon) {
      return (
        <View style={styles.contentContainer}>
          {iconPosition === 'left' && icon}
          <Text style={textStyle}>{title}</Text>
          {iconPosition === 'right' && icon}
        </View>
      );
    }

    return <Text style={textStyle}>{title}</Text>;
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled || loading}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    ...Theme.shadows.sm,
  },
  
  // Variants
  primary: {
    backgroundColor: Theme.colors.primary,
  },
  secondary: {
    backgroundColor: Theme.colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Theme.colors.error,
  },
  
  // Sizes
  sm: {
    height: Theme.components.button.height.sm,
    paddingHorizontal: Theme.components.button.padding.horizontal.sm,
  },
  md: {
    height: Theme.components.button.height.md,
    paddingHorizontal: Theme.components.button.padding.horizontal.md,
  },
  lg: {
    height: Theme.components.button.height.lg,
    paddingHorizontal: Theme.components.button.padding.horizontal.lg,
  },
  xl: {
    height: Theme.components.button.height.xl,
    paddingHorizontal: Theme.components.button.padding.horizontal.xl,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Text styles
  text: {
    fontWeight: Theme.typography.weights.semibold as any,
    textAlign: 'center' as const,
  },
  primaryText: {
    color: Theme.colors.background,
  },
  secondaryText: {
    color: Theme.colors.background,
  },
  outlineText: {
    color: Theme.colors.primary,
  },
  ghostText: {
    color: Theme.colors.primary,
  },
  dangerText: {
    color: Theme.colors.background,
  },
  disabledText: {
    opacity: 0.7,
  },
  
  // Text sizes
  smText: {
    fontSize: Theme.typography.sizes.sm,
  },
  mdText: {
    fontSize: Theme.typography.sizes.md,
  },
  lgText: {
    fontSize: Theme.typography.sizes.lg,
  },
  xlText: {
    fontSize: Theme.typography.sizes.xl,
  },
  
  // Content container
  contentContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Theme.spacing.sm,
  },
  loadingText: {
    marginLeft: Theme.spacing.sm,
  },
});

export default Button;