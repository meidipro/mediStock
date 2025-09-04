import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '../../constants/Theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'underlined';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  required,
  leftIcon,
  rightIcon,
  onRightIconPress,
  size = 'md',
  variant = 'default',
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const containerStyle = [
    styles.container,
    styles[variant],
    styles[size],
    isFocused && styles.focused,
    error && styles.error,
    props.editable === false && styles.disabled,
  ];

  const inputStyle = [
    styles.input,
    leftIcon ? styles.inputWithLeftIcon : null,
    rightIcon ? styles.inputWithRightIcon : null,
    style,
  ].filter(Boolean);

  return (
    <View style={styles.wrapper}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={containerStyle}>
        {leftIcon && (
          <View style={styles.iconContainer}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={inputStyle}
          placeholderTextColor={Theme.colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {(error || hint) && (
        <View style={styles.messageContainer}>
          <Text style={[styles.message, error ? styles.errorMessage : styles.hintMessage]}>
            {error || hint}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Theme.spacing.md,
  },
  
  labelContainer: {
    marginBottom: Theme.spacing.xs,
  },
  
  label: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: Theme.typography.weights.medium,
    color: Theme.colors.text,
  },
  
  required: {
    color: Theme.colors.error,
  },
  
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
  },
  
  // Variants
  default: {
    borderColor: Theme.colors.border,
  },
  filled: {
    backgroundColor: Theme.colors.backgroundSecondary,
    borderColor: 'transparent',
  },
  underlined: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderBottomColor: Theme.colors.border,
  },
  
  // Sizes
  sm: {
    height: Theme.components.input.height.sm,
  },
  md: {
    height: Theme.components.input.height.md,
  },
  lg: {
    height: Theme.components.input.height.lg,
  },
  
  // States
  focused: {
    borderColor: Theme.colors.primary,
    ...Theme.shadows.sm,
  },
  
  error: {
    borderColor: Theme.colors.error,
  },
  
  disabled: {
    backgroundColor: Theme.colors.backgroundTertiary,
    opacity: 0.6,
  },
  
  input: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text,
    paddingHorizontal: Theme.components.input.padding.horizontal,
  },
  
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  
  inputWithRightIcon: {
    paddingRight: 0,
  },
  
  iconContainer: {
    paddingHorizontal: Theme.spacing.sm,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  
  messageContainer: {
    marginTop: Theme.spacing.xs,
  },
  
  message: {
    fontSize: Theme.typography.sizes.xs,
  },
  
  errorMessage: {
    color: Theme.colors.error,
  },
  
  hintMessage: {
    color: Theme.colors.textTertiary,
  },
});

export default Input;