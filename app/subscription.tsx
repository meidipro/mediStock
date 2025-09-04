import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase.js';
import { Theme } from '../constants/Theme';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  duration_months: number;
  price_bdt: number;
  features: any;
  limitations: any;
}

interface PaymentGateway {
  id: string;
  name: string;
  display_name: string;
  config: any;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      // Load plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_bdt', { ascending: true });

      if (plansError) throw plansError;

      // Load payment gateways
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true);

      if (gatewaysError) throw gatewaysError;

      // Load current subscription
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // First get the pharmacy for this user
        const { data: pharmacyData } = await supabase
          .from('pharmacies')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (pharmacyData) {
          const { data: subscriptionData, error: subError } = await supabase
            .from('pharmacy_subscriptions')
            .select('*')
            .eq('pharmacy_id', pharmacyData.id)
            .maybeSingle();

          if (subError) {
            console.log('No subscription found (expected for new users):', subError);
          } else {
            setCurrentSubscription(subscriptionData);
          }
        }
      }

      setPlans(plansData || []);
      setGateways(gatewaysData || []);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPayment = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    // Navigate directly to payment screen with plan details
    // User will select payment gateway on payment page
    router.push({
      pathname: '/payment',
      params: {
        planId: plan.id,
        planName: plan.display_name,
        amount: plan.price_bdt.toString(),
      }
    });
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free_trial': return '#6B7280';
      case 'monthly': return '#3B82F6';
      case 'quarterly': return '#8B5CF6';
      case 'yearly': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPlanBadge = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'quarterly': return 'Best Value';
      case 'yearly': return 'Most Popular';
      default: return null;
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `৳${price.toLocaleString()}`;
  };

  const renderFeatureList = (features: any, limitations: any) => {
    const featureList = [];

    // Add positive features
    if (features.maxMedicines) {
      featureList.push({ text: `Up to ${features.maxMedicines} medicines`, included: true });
    }
    if (features.maxCustomers) {
      featureList.push({ text: `Up to ${features.maxCustomers} customers`, included: true });
    }
    if (features.maxTransactions) {
      featureList.push({ text: `${features.maxTransactions} transactions/month`, included: true });
    }
    if (features.advancedReports) {
      featureList.push({ text: 'Advanced reporting', included: true });
    }
    if (features.inventoryAlerts) {
      featureList.push({ text: 'Inventory alerts', included: true });
    }
    if (features.customerReminders) {
      featureList.push({ text: 'Customer reminders', included: true });
    }
    if (features.prioritySupport) {
      featureList.push({ text: 'Priority support', included: true });
    }
    if (features.phoneSupport) {
      featureList.push({ text: 'Phone support', included: true });
    }

    // Add limitations as excluded features
    if (limitations.noAdvancedReports) {
      featureList.push({ text: 'Advanced reporting', included: false });
    }
    if (limitations.noInventoryAlerts) {
      featureList.push({ text: 'Inventory alerts', included: false });
    }
    if (limitations.noCustomerReminders) {
      featureList.push({ text: 'Customer reminders', included: false });
    }

    return featureList;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading subscription plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Your Plan</Text>
        </View>

        {/* Current Subscription Status */}
        {currentSubscription && (
          <View style={styles.currentSubscriptionCard}>
            <Text style={styles.currentSubscriptionTitle}>Current Plan</Text>
            <Text style={styles.currentSubscriptionPlan}>
              {currentSubscription.subscription_plans?.display_name}
            </Text>
            <Text style={styles.currentSubscriptionExpiry}>
              Expires: {new Date(currentSubscription.expires_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Subscription Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => {
            const planColor = getPlanColor(plan.name);
            const badge = getPlanBadge(plan.name);
            const features = renderFeatureList(plan.features, plan.limitations);
            const isFree = plan.price_bdt === 0;

            return (
              <View
                key={plan.id}
                style={[styles.planCard, { borderColor: planColor, borderWidth: 1 }]}
              >
                {badge && (
                  <View style={[styles.badge, { backgroundColor: planColor }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{plan.display_name}</Text>
                  <Text style={[styles.planPrice, { color: planColor }]}>
                    {formatPrice(plan.price_bdt)}
                  </Text>
                  {plan.duration_months > 0 && (
                    <Text style={styles.planDuration}>
                      /{plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}
                    </Text>
                  )}
                </View>

                <View style={styles.featuresContainer}>
                  {features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons
                        name={feature.included ? "checkmark-circle" : "close-circle"}
                        size={20}
                        color={feature.included ? "#10B981" : "#EF4444"}
                      />
                      <Text style={[
                        styles.featureText,
                        !feature.included && styles.excludedFeature
                      ]}>
                        {feature.text}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Direct Action Button */}
                <TouchableOpacity
                  style={[styles.planActionButton, { backgroundColor: planColor }]}
                  onPress={() => {
                    if (isFree) {
                      Alert.alert('Free Trial', 'You are already on the free trial plan!');
                    } else {
                      handleDirectPayment(plan.id);
                    }
                  }}
                >
                  <Text style={styles.planActionText}>
                    {isFree ? 'Current Plan' : 'Get Started'}
                  </Text>
                  {!isFree && (
                    <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>


        {/* Free Trial Info */}
        <View style={styles.trialInfo}>
          <Text style={styles.trialTitle}>Free Trial Available</Text>
          <Text style={styles.trialDescription}>
            Start with our free trial to explore basic features. Upgrade anytime to unlock full functionality.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  currentSubscriptionCard: {
    margin: 20,
    padding: 15,
    backgroundColor: Theme.colors.card,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  currentSubscriptionTitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginBottom: 5,
  },
  currentSubscriptionPlan: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  currentSubscriptionExpiry: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginTop: 5,
  },
  plansContainer: {
    padding: 20,
  },
  planCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: 15,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  planDuration: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
  },
  featuresContainer: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    color: Theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  excludedFeature: {
    textDecorationLine: 'line-through',
    color: Theme.colors.textSecondary,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  planActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  planActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentSection: {
    padding: 20,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 15,
  },
  paymentMethods: {
    gap: 10,
  },
  paymentButton: {
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  paymentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trialInfo: {
    margin: 20,
    padding: 15,
    backgroundColor: Theme.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 8,
  },
  trialDescription: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
});