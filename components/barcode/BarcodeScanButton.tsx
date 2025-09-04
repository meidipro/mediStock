import React, { useState } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanner } from './BarcodeScanner';
import { BarcodeLookupResult } from '../../lib/barcode-service';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface BarcodeScanButtonProps {
  onScanSuccess: (result: BarcodeLookupResult) => void;
  onScanError?: (error: string) => void;
  pharmacyId?: string;
  title?: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: any;
}

export const BarcodeScanButton: React.FC<BarcodeScanButtonProps> = ({
  onScanSuccess,
  onScanError,
  pharmacyId,
  title = 'Scan Medicine Barcode',
  buttonText = 'Scan Barcode',
  variant = 'outline',
  size = 'md',
  disabled = false,
  style,
}) => {
  const [scannerVisible, setScannerVisible] = useState(false);

  const handleOpenScanner = () => {
    if (!disabled) {
      setScannerVisible(true);
    }
  };

  const handleCloseScanner = () => {
    setScannerVisible(false);
  };

  const handleScanSuccess = (result: BarcodeLookupResult) => {
    setScannerVisible(false);
    onScanSuccess(result);
  };

  const handleScanError = (error: string) => {
    setScannerVisible(false);
    if (onScanError) {
      onScanError(error);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[`${variant}Button`], styles[`${size}Button`]];
    if (disabled) {
      baseStyle.push(styles.disabledButton);
    }
    if (style) {
      baseStyle.push(style);
    }
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText, styles[`${variant}Text`], styles[`${size}Text`]];
    if (disabled) {
      baseStyle.push(styles.disabledText);
    }
    return baseStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 16;
      case 'lg': return 24;
      default: return 20;
    }
  };

  if (variant === 'icon') {
    return (
      <>
        <TouchableOpacity
          style={[styles.iconButton, styles[`${size}IconButton`], disabled && styles.disabledButton, style]}
          onPress={handleOpenScanner}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="barcode-outline" 
            size={getIconSize()} 
            color={disabled ? Theme.colors.textTertiary : Theme.colors.primary} 
          />
        </TouchableOpacity>

        <BarcodeScanner
          isVisible={scannerVisible}
          onClose={handleCloseScanner}
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          title={title}
          pharmacyId={pharmacyId}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={handleOpenScanner}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          <Ionicons 
            name="barcode-outline" 
            size={getIconSize()} 
            color={disabled ? Theme.colors.textTertiary : (variant === 'primary' ? '#FFFFFF' : Theme.colors.primary)} 
          />
          <Text style={getTextStyle()}>{buttonText}</Text>
        </View>
      </TouchableOpacity>

      <BarcodeScanner
        isVisible={scannerVisible}
        onClose={handleCloseScanner}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        title={title}
        pharmacyId={pharmacyId}
      />
    </>
  );
};

const styles = createThemedStyles((theme) => ({
  button: {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  buttonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },

  buttonText: {
    fontWeight: theme.typography.weights.medium,
  },

  // Variants
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },

  secondaryButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },

  // Sizes
  smButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },

  mdButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },

  lgButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },

  // Text colors
  primaryText: {
    color: '#FFFFFF',
  },

  secondaryText: {
    color: theme.colors.text,
  },

  outlineText: {
    color: theme.colors.primary,
  },

  // Text sizes
  smText: {
    fontSize: theme.typography.sizes.sm,
  },

  mdText: {
    fontSize: theme.typography.sizes.md,
  },

  lgText: {
    fontSize: theme.typography.sizes.lg,
  },

  // Icon button
  iconButton: {
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  smIconButton: {
    width: 32,
    height: 32,
  },

  mdIconButton: {
    width: 40,
    height: 40,
  },

  lgIconButton: {
    width: 48,
    height: 48,
  },

  // Disabled state
  disabledButton: {
    opacity: 0.5,
  },

  disabledText: {
    color: theme.colors.textTertiary,
  },
}));