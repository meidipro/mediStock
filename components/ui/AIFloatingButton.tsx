import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface AIFloatingButtonProps {
  onPress: () => void;
  isActive: boolean;
  hasNotification?: boolean;
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({
  onPress,
  isActive,
  hasNotification = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for notifications
  useEffect(() => {
    if (hasNotification) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [hasNotification]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [
              { scale: scaleAnim },
              { scale: hasNotification ? pulseAnim : 1 },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, isActive && styles.buttonActive]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          {/* AI Doctor Icon */}
          <View style={styles.iconContainer}>
            <Text style={[styles.doctorIcon, isActive && styles.doctorIconActive]}>
              👨‍⚕️
            </Text>
            {hasNotification && (
              <View style={styles.notificationDot}>
                <Text style={styles.notificationText}>!</Text>
              </View>
            )}
          </View>

          {/* Label */}
          <Text style={[styles.label, isActive && styles.labelActive]}>
            AI Doc
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Tooltip when not active */}
      {!isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            AI Doctor
          </Text>
          <Text style={styles.tooltipSubtext}>
            Smart Health Assistant
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    position: 'absolute' as const,
    left: '50%',
    bottom: theme.spacing.sm, // Right on the tab bar
    transform: [{ translateX: -28 }], // Center the 56px button
    zIndex: 1001, // Above tab bar
    alignItems: 'center' as const,
  } as ViewStyle,

  buttonContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 3,
    borderColor: theme.colors.background,
    marginBottom: 4, // Lift it slightly above tab bar
  },

  buttonActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.successLight,
  },

  iconContainer: {
    position: 'relative' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  doctorIcon: {
    fontSize: 24,
  },

  doctorIconActive: {
    fontSize: 26,
  },

  notificationDot: {
    position: 'absolute' as const,
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.error,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },

  notificationText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
  },

  label: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold as any,
    marginTop: 3,
    textAlign: 'center' as const,
    letterSpacing: 0.5,
  },

  labelActive: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold as any,
  },

  tooltip: {
    position: 'absolute' as const,
    bottom: 70, // Above the button
    left: -40, // Center it relative to button
    backgroundColor: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 120,
  },

  tooltipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
    textAlign: 'center' as const,
  },

  tooltipSubtext: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.background,
    opacity: 0.8,
    textAlign: 'center' as const,
    marginTop: 2,
  },
}));