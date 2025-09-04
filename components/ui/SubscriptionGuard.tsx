import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '../../hooks/useSubscription';
import { Theme } from '../../constants/Theme';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  feature?: string;
  requiredPlan?: string;
  fallbackComponent?: React.ReactNode;
  showUpgradePrompt?: boolean;
  featureCount?: number;
}

export default function SubscriptionGuard({
  children,
  feature,
  requiredPlan,
  fallbackComponent,
  showUpgradePrompt = true,
  featureCount = 1,
}: SubscriptionGuardProps) {
  const router = useRouter();
  const { 
    subscriptionStatus, 
    hasFeature, 
    requireFeature, 
    requireSubscription,
    loading 
  } = useSubscription();

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking subscription...</Text>
      </View>
    );
  }

  // Check general subscription requirement
  if (!subscriptionStatus?.isActive) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedContent}>
          <Ionicons name="lock-closed" size={48} color={Theme.colors.primary} />
          <Text style={styles.restrictedTitle}>Subscription Required</Text>
          <Text style={styles.restrictedDescription}>
            This feature requires an active subscription. Upgrade your plan to access this functionality.
          </Text>
          {showUpgradePrompt && (
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Check specific feature requirement
  if (feature && !hasFeature(feature)) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedContent}>
          <Ionicons name="star" size={48} color={Theme.colors.warning} />
          <Text style={styles.restrictedTitle}>Premium Feature</Text>
          <Text style={styles.restrictedDescription}>
            This feature is not available in your current plan. Upgrade to unlock advanced functionality.
          </Text>
          {showUpgradePrompt && (
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Check feature usage limits (async check will be handled by the component using this)
  return <>{children}</>;
}

// Higher-order component for protecting entire screens
export function withSubscriptionGuard<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    feature?: string;
    requiredPlan?: string;
    redirectToSubscription?: boolean;
  } = {}
) {
  return function ProtectedComponent(props: T) {
    const router = useRouter();
    const { subscriptionStatus, hasFeature, loading } = useSubscription();

    React.useEffect(() => {
      if (loading) return;

      if (!subscriptionStatus?.isActive) {
        if (options.redirectToSubscription) {
          Alert.alert(
            'Subscription Required',
            'This feature requires an active subscription.',
            [
              { text: 'Cancel', onPress: () => router.back() },
              { text: 'Upgrade', onPress: () => router.push('/subscription') }
            ]
          );
          return;
        }
      }

      if (options.feature && !hasFeature(options.feature)) {
        if (options.redirectToSubscription) {
          Alert.alert(
            'Premium Feature',
            'This feature is not available in your current plan.',
            [
              { text: 'Cancel', onPress: () => router.back() },
              { text: 'Upgrade', onPress: () => router.push('/subscription') }
            ]
          );
          return;
        }
      }
    }, [loading, subscriptionStatus, hasFeature]);

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Checking subscription...</Text>
        </View>
      );
    }

    return <Component {...props} />;
  };
}

// Subscription status banner component
export function SubscriptionBanner() {
  const router = useRouter();
  const { subscriptionStatus, getSubscriptionWarning } = useSubscription();

  const warning = getSubscriptionWarning();

  if (!warning) return null;

  const getBannerStyle = () => {
    if (subscriptionStatus?.isExpired) {
      return [styles.banner, styles.bannerError];
    }
    if (subscriptionStatus?.daysRemaining <= 3) {
      return [styles.banner, styles.bannerWarning];
    }
    return [styles.banner, styles.bannerInfo];
  };

  const getIconName = () => {
    if (subscriptionStatus?.isExpired) return 'alert-circle';
    if (subscriptionStatus?.daysRemaining <= 3) return 'warning';
    return 'information-circle';
  };

  return (
    <View style={getBannerStyle()}>
      <View style={styles.bannerContent}>
        <Ionicons name={getIconName()} size={20} color="white" />
        <Text style={styles.bannerText}>{warning}</Text>
      </View>
      <TouchableOpacity 
        style={styles.bannerButton} 
        onPress={() => router.push('/subscription')}
      >
        <Text style={styles.bannerButtonText}>
          {subscriptionStatus?.isExpired ? 'Renew' : 'Upgrade'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Feature usage indicator component
export function FeatureUsageIndicator({ 
  featureName, 
  displayName 
}: { 
  featureName: string; 
  displayName: string;
}) {
  const { checkFeatureLimit } = useSubscription();
  const [usage, setUsage] = React.useState<any>(null);

  React.useEffect(() => {
    checkFeatureLimit(featureName).then(setUsage);
  }, [featureName, checkFeatureLimit]);

  if (!usage || usage.limit === 0) return null;

  const percentage = (usage.current / usage.limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <View style={styles.usageContainer}>
      <View style={styles.usageHeader}>
        <Text style={styles.usageTitle}>{displayName}</Text>
        <Text style={[
          styles.usageText,
          isAtLimit && styles.usageTextDanger,
          isNearLimit && styles.usageTextWarning
        ]}>
          {usage.current}/{usage.limit}
        </Text>
      </View>
      <View style={styles.usageBar}>
        <View 
          style={[
            styles.usageProgress,
            { width: `${Math.min(percentage, 100)}%` },
            isAtLimit && styles.usageProgressDanger,
            isNearLimit && styles.usageProgressWarning
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restrictedContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  restrictedDescription: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  bannerInfo: {
    backgroundColor: Theme.colors.primary,
  },
  bannerWarning: {
    backgroundColor: Theme.colors.warning,
  },
  bannerError: {
    backgroundColor: Theme.colors.error,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bannerText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  bannerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  usageContainer: {
    backgroundColor: Theme.colors.card,
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageTitle: {
    fontSize: 14,
    color: Theme.colors.text,
  },
  usageText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  usageTextWarning: {
    color: Theme.colors.warning,
  },
  usageTextDanger: {
    color: Theme.colors.error,
  },
  usageBar: {
    height: 4,
    backgroundColor: Theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
    borderRadius: 2,
  },
  usageProgressWarning: {
    backgroundColor: Theme.colors.warning,
  },
  usageProgressDanger: {
    backgroundColor: Theme.colors.error,
  },
});