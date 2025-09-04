import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { Alert } from 'react-native';

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  isTrial: boolean;
  planName: string;
  daysRemaining: number;
  features: any;
  limitations: any;
  expiresAt: string | null;
}

export interface FeatureLimit {
  canUse: boolean;
  limit: number;
  current: number;
  remaining: number;
}

export const useSubscription = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubscriptionStatus(null);
        return;
      }

      // Get pharmacy for this user
      const { data: pharmacyData } = await supabase
        .from('pharmacies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!pharmacyData) {
        setSubscriptionStatus(null);
        return;
      }

      setPharmacyId(pharmacyData.id);

      // Try to get subscription status (without foreign key join to avoid 406 errors)
      const { data: subscriptionData, error } = await supabase
        .from('pharmacy_subscriptions')
        .select('*')
        .eq('pharmacy_id', pharmacyData.id)
        .maybeSingle();

      if (error || !subscriptionData) {
        console.log('No subscription found - user on free trial');
        // If no subscription found, user is on free trial
        setSubscriptionStatus({
          isActive: true,
          isExpired: false,
          isTrial: true,
          planName: 'Free Trial',
          daysRemaining: 7, // Default trial period
          features: {
            maxMedicines: 50,
            maxCustomers: 25,
            maxTransactions: 100,
          },
          limitations: {
            noAdvancedReports: true,
            noInventoryAlerts: true,
            noCustomerReminders: true,
          },
          expiresAt: null,
        });
        return;
      }

      // Get the plan details separately
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', subscriptionData.plan_id)
        .single();

      if (subscriptionData && planData) {
        const expiresAt = new Date(subscriptionData.expires_at);
        const now = new Date();
        const isExpired = expiresAt <= now;
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isTrial = subscriptionData.status === 'trial';

        setSubscriptionStatus({
          isActive: !isExpired && subscriptionData.status === 'active',
          isExpired,
          isTrial,
          planName: planData.display_name,
          daysRemaining: Math.max(0, daysRemaining),
          features: planData.features || {},
          limitations: planData.limitations || {},
          expiresAt: subscriptionData.expires_at,
        });
      } else {
        // No subscription found, default to trial
        setSubscriptionStatus({
          isActive: true,
          isExpired: false,
          isTrial: true,
          planName: 'Free Trial',
          daysRemaining: 7,
          features: {
            maxMedicines: 50,
            maxCustomers: 25,
            maxTransactions: 100,
          },
          limitations: {
            noAdvancedReports: true,
            noInventoryAlerts: true,
            noCustomerReminders: true,
          },
          expiresAt: null,
        });
      }

    } catch (error) {
      console.error('Error loading subscription status:', error);
      setSubscriptionStatus(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const checkFeatureLimit = useCallback(async (
    featureName: string,
    requestedCount: number = 1
  ): Promise<FeatureLimit> => {
    try {
      if (!pharmacyId || !subscriptionStatus) {
        return {
          canUse: false,
          limit: 0,
          current: 0,
          remaining: 0,
        };
      }

      // Check if feature is available in current plan
      const featureKey = `max${featureName.charAt(0).toUpperCase() + featureName.slice(1)}`;
      const limit = subscriptionStatus.features[featureKey] || 0;

      if (limit === 0) {
        return {
          canUse: false,
          limit: 0,
          current: 0,
          remaining: 0,
        };
      }

      // Get current usage for this month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data: usageData } = await supabase
        .from('feature_usage')
        .select('usage_count')
        .eq('pharmacy_id', pharmacyId)
        .eq('feature_name', featureName)
        .eq('month_year', currentMonth)
        .single();

      const currentUsage = usageData?.usage_count || 0;
      const remaining = Math.max(0, limit - currentUsage);
      const canUse = currentUsage + requestedCount <= limit;

      return {
        canUse,
        limit,
        current: currentUsage,
        remaining,
      };

    } catch (error) {
      console.error('Error checking feature limit:', error);
      return {
        canUse: false,
        limit: 0,
        current: 0,
        remaining: 0,
      };
    }
  }, [pharmacyId, subscriptionStatus, supabase]);

  const trackFeatureUsage = useCallback(async (
    featureName: string,
    count: number = 1
  ): Promise<boolean> => {
    try {
      if (!pharmacyId) return false;

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Update or insert usage record
      const { error } = await supabase
        .from('feature_usage')
        .upsert({
          pharmacy_id: pharmacyId,
          feature_name: featureName,
          month_year: currentMonth,
          usage_count: count,
          last_used: new Date().toISOString(),
        }, {
          onConflict: 'pharmacy_id,feature_name,month_year',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error tracking feature usage:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error tracking feature usage:', error);
      return false;
    }
  }, [pharmacyId, supabase]);

  const requireFeature = useCallback(async (
    featureName: string,
    requestedCount: number = 1,
    showAlert: boolean = true
  ): Promise<boolean> => {
    const featureLimit = await checkFeatureLimit(featureName, requestedCount);

    if (!featureLimit.canUse) {
      if (showAlert) {
        const featureDisplayName = featureName.charAt(0).toUpperCase() + featureName.slice(1);
        Alert.alert(
          'Feature Limit Reached',
          `You have reached the ${featureDisplayName.toLowerCase()} limit for your current plan (${featureLimit.current}/${featureLimit.limit}). Please upgrade your subscription to continue using this feature.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {
              // Navigate to subscription page
              // This should be handled by the calling component
            }}
          ]
        );
      }
      return false;
    }

    // Track the usage
    await trackFeatureUsage(featureName, requestedCount);
    return true;
  }, [checkFeatureLimit, trackFeatureUsage]);

  const requireSubscription = useCallback((showAlert: boolean = true): boolean => {
    if (!subscriptionStatus || subscriptionStatus.isExpired) {
      if (showAlert) {
        Alert.alert(
          'Subscription Required',
          'This feature requires an active subscription. Please upgrade your plan to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {
              // Navigate to subscription page
              // This should be handled by the calling component
            }}
          ]
        );
      }
      return false;
    }
    return true;
  }, [subscriptionStatus]);

  const hasFeature = useCallback((featureName: string): boolean => {
    if (!subscriptionStatus) return false;
    
    // Check if feature is explicitly enabled
    if (subscriptionStatus.features[featureName] === true) return true;
    
    // Check if feature is not in limitations (not disabled)
    const limitationKey = `no${featureName.charAt(0).toUpperCase() + featureName.slice(1)}`;
    return !subscriptionStatus.limitations[limitationKey];
  }, [subscriptionStatus]);

  const getSubscriptionWarning = useCallback((): string | null => {
    if (!subscriptionStatus) return null;

    if (subscriptionStatus.isExpired) {
      return 'Your subscription has expired. Please renew to continue using all features.';
    }

    if (subscriptionStatus.daysRemaining <= 3 && subscriptionStatus.daysRemaining > 0) {
      return `Your subscription expires in ${subscriptionStatus.daysRemaining} day(s). Please renew to avoid service interruption.`;
    }

    if (subscriptionStatus.isTrial && subscriptionStatus.daysRemaining <= 7) {
      return `Your free trial expires in ${subscriptionStatus.daysRemaining} day(s). Upgrade to continue using all features.`;
    }

    return null;
  }, [subscriptionStatus]);

  return {
    subscriptionStatus,
    loading,
    pharmacyId,
    checkFeatureLimit,
    trackFeatureUsage,
    requireFeature,
    requireSubscription,
    hasFeature,
    getSubscriptionWarning,
    refreshSubscription: loadSubscriptionStatus,
  };
};