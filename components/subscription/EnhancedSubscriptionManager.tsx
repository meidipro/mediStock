import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  duration_months: number;
  price_bdt: number;
  features: {
    max_medicines: number;
    max_transactions: number;
    max_users: number;
    barcode_scanning: boolean;
    ai_insights: boolean;
    advanced_reports: boolean;
    priority_support: boolean;
    data_backup: boolean;
  };
  limitations: {
    storage_gb: number;
    api_calls_per_month: number;
  };
  is_active: boolean;
  popular?: boolean;
}

interface PaymentGateway {
  id: string;
  name: string;
  display_name: string;
  type: 'mobile_banking' | 'card' | 'bank_transfer';
  config: {
    provider: string;
    merchant_id?: string;
    instructions?: string;
    logo_url?: string;
  };
  is_active: boolean;
}

interface PaymentMethod {
  gateway_id: string;
  phone_number?: string;
  account_details?: string;
}

interface EnhancedSubscriptionManagerProps {
  onClose?: () => void;
}

export const EnhancedSubscriptionManager: React.FC<EnhancedSubscriptionManagerProps> = ({
  onClose,
}) => {
  const { pharmacy, user } = useAuth();
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({
    gateway_id: '',
    phone_number: '',
    account_details: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchSubscriptionData = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);

      // Fetch subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_bdt');

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch payment gateways
      const { data: gatewaysData, error: gatewaysError } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (gatewaysError) throw gatewaysError;
      setGateways(gatewaysData || []);

      // Fetch current subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('pharmacy_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('pharmacy_id', pharmacy.id)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.warn('Subscription fetch error:', subscriptionError);
      } else {
        setCurrentSubscription(subscriptionData);
      }

    } catch (error) {
      console.error('Subscription data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  const handlePlanSelection = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handlePaymentMethodSelection = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
    setPaymentMethod(prev => ({ ...prev, gateway_id: gateway.id }));
    setShowPaymentModal(true);
  };

  const generatePaymentInstructions = (gateway: PaymentGateway, amount: number): string => {
    switch (gateway.name.toLowerCase()) {
      case 'bkash':
        return `1. Dial *247# or use bKash app\n2. Send Money\n3. Enter Merchant: 01234567890\n4. Amount: ৳${amount}\n5. Reference: ${pharmacy?.name}-${Date.now()}\n6. Enter PIN to confirm`;
      
      case 'nagad':
        return `1. Dial *167# or use Nagad app\n2. Send Money\n3. Enter Merchant: 01234567890\n4. Amount: ৳${amount}\n5. Reference: ${pharmacy?.name}-${Date.now()}\n6. Enter PIN to confirm`;
      
      case 'rocket':
        return `1. Dial *322# or use Rocket app\n2. Payment\n3. Enter Merchant: 01234567890-1\n4. Amount: ৳${amount}\n5. Reference: ${pharmacy?.name}-${Date.now()}\n6. Enter PIN to confirm`;
      
      default:
        return `Please follow the payment instructions for ${gateway.display_name}`;
    }
  };

  const processPayment = async () => {
    if (!selectedPlan || !selectedGateway || !pharmacy?.id) return;

    try {
      setPaymentLoading(true);

      // Create payment record
      const paymentData = {
        pharmacy_id: pharmacy.id,
        plan_id: selectedPlan.id,
        gateway_id: selectedGateway.id,
        amount_bdt: selectedPlan.price_bdt,
        transaction_id: `TXN-${Date.now()}`,
        status: 'pending',
        payment_method: selectedGateway.name,
        customer_phone: paymentMethod.phone_number,
        gateway_response: JSON.stringify({
          instructions: generatePaymentInstructions(selectedGateway, selectedPlan.price_bdt),
          payment_method: paymentMethod,
        }),
      };

      const { data: payment, error: paymentError } = await supabase
        .from('subscription_payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // For demo purposes, simulate payment processing
      Alert.alert(
        'Payment Instructions',
        generatePaymentInstructions(selectedGateway, selectedPlan.price_bdt),
        [
          {
            text: 'I have made the payment',
            onPress: () => simulatePaymentConfirmation(payment.id),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );

    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('Error', 'Payment processing failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const simulatePaymentConfirmation = async (paymentId: string) => {
    try {
      // Update payment status
      await supabase
        .from('subscription_payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Create or update subscription
      const subscriptionData = {
        pharmacy_id: pharmacy?.id,
        plan_id: selectedPlan?.id,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (selectedPlan?.duration_months || 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
        auto_renew: true,
      };

      if (currentSubscription) {
        await supabase
          .from('pharmacy_subscriptions')
          .update(subscriptionData)
          .eq('pharmacy_id', pharmacy?.id);
      } else {
        await supabase
          .from('pharmacy_subscriptions')
          .insert(subscriptionData);
      }

      Alert.alert(
        'Payment Successful!',
        `Your ${selectedPlan?.display_name} subscription is now active.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowPaymentModal(false);
              setShowUpgradeModal(false);
              fetchSubscriptionData();
            },
          },
        ]
      );

    } catch (error) {
      console.error('Subscription activation error:', error);
      Alert.alert('Error', 'Failed to activate subscription. Please contact support.');
    }
  };

  const getSubscriptionStatus = () => {
    if (!currentSubscription) return { status: 'No active subscription', color: Theme.colors.textSecondary };
    
    const now = new Date();
    const expiresAt = new Date(currentSubscription.expires_at);
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (currentSubscription.status === 'expired') {
      return { status: 'Expired', color: Theme.colors.error };
    } else if (daysRemaining <= 7) {
      return { status: `Expires in ${daysRemaining} days`, color: Theme.colors.warning };
    } else {
      return { status: `Active until ${expiresAt.toLocaleDateString()}`, color: Theme.colors.success };
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const subscriptionStatus = getSubscriptionStatus();

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },

    title: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },

    subtitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    statusCard: {
      marginBottom: theme.spacing.lg,
    },

    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    currentPlan: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    statusText: {
      fontSize: theme.typography.sizes.sm,
      marginTop: 2,
    },

    planCard: {
      marginBottom: theme.spacing.md,
      borderWidth: 2,
      borderColor: 'transparent',
    },

    planCardSelected: {
      borderColor: theme.colors.primary,
    },

    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },

    planInfo: {
      flex: 1,
    },

    planName: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    planPrice: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.primary,
      marginTop: 2,
    },

    planDuration: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },

    popularBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
    },

    popularText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.background,
      fontWeight: theme.typography.weights.medium,
    },

    featureList: {
      marginBottom: theme.spacing.md,
    },

    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },

    featureIcon: {
      marginRight: theme.spacing.sm,
    },

    featureText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      flex: 1,
    },

    limitationsList: {
      marginTop: theme.spacing.sm,
    },

    limitationItem: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },

    gatewayGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },

    gatewayCard: {
      flex: 1,
      minWidth: '45%',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
    },

    gatewayCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: 'rgba(52, 152, 219, 0.1)',
    },

    gatewayIcon: {
      width: 40,
      height: 40,
      backgroundColor: theme.colors.primary,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },

    gatewayName: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.text,
      textAlign: 'center',
    },

    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 50,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.primary,
    },

    modalTitle: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.background,
    },

    closeButton: {
      padding: theme.spacing.sm,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: theme.borderRadius.md,
    },

    modalContent: {
      flex: 1,
      padding: theme.spacing.md,
    },

    paymentSummary: {
      backgroundColor: 'rgba(52, 152, 219, 0.1)',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.lg,
    },

    summaryText: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.text,
      marginBottom: 2,
    },

    totalAmount: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.primary,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
    },
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading subscription plans...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subscription Management</Text>
          <Text style={styles.subtitle}>Choose the plan that fits your needs</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Current Subscription Status */}
      <Card style={styles.statusCard}>
        <CardHeader>
          <View style={styles.statusHeader}>
            <Text style={styles.currentPlan}>
              {currentSubscription?.subscription_plans?.display_name || 'Free Plan'}
            </Text>
            <Text style={[styles.statusText, { color: subscriptionStatus.color }]}>
              {subscriptionStatus.status}
            </Text>
          </View>
        </CardHeader>
      </Card>

      {/* Subscription Plans */}
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          style={[
            styles.planCard,
            selectedPlan?.id === plan.id && styles.planCardSelected,
          ]}
        >
          <CardContent>
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.display_name}</Text>
                <Text style={styles.planPrice}>৳{plan.price_bdt}</Text>
                <Text style={styles.planDuration}>
                  per {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}
                </Text>
              </View>
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
            </View>

            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} style={styles.featureIcon} />
                <Text style={styles.featureText}>Up to {plan.features.max_medicines} medicines</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} style={styles.featureIcon} />
                <Text style={styles.featureText}>Up to {plan.features.max_transactions} transactions</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} style={styles.featureIcon} />
                <Text style={styles.featureText}>Up to {plan.features.max_users} users</Text>
              </View>
              {plan.features.barcode_scanning && (
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} style={styles.featureIcon} />
                  <Text style={styles.featureText}>Barcode scanning</Text>
                </View>
              )}
              {plan.features.ai_insights && (
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} style={styles.featureIcon} />
                  <Text style={styles.featureText}>AI business insights</Text>
                </View>
              )}
              {plan.features.advanced_reports && (
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} style={styles.featureIcon} />
                  <Text style={styles.featureText}>Advanced reports</Text>
                </View>
              )}
              {plan.features.priority_support && (
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Theme.colors.success} style={styles.featureIcon} />
                  <Text style={styles.featureText}>Priority support</Text>
                </View>
              )}
            </View>

            <View style={styles.limitationsList}>
              <Text style={styles.limitationItem}>
                Storage: {plan.limitations.storage_gb}GB
              </Text>
              <Text style={styles.limitationItem}>
                API calls: {plan.limitations.api_calls_per_month.toLocaleString()}/month
              </Text>
            </View>

            <Button
              title={currentSubscription?.plan_id === plan.id ? "Current Plan" : "Select Plan"}
              variant={currentSubscription?.plan_id === plan.id ? "outline" : "primary"}
              onPress={() => handlePlanSelection(plan)}
              disabled={currentSubscription?.plan_id === plan.id}
            />
          </CardContent>
        </Card>
      ))}

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Payment Method</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowUpgradeModal(false)}
            >
              <Text style={{ color: Theme.colors.background }}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedPlan && (
              <View style={styles.paymentSummary}>
                <Text style={styles.summaryText}>Plan: {selectedPlan.display_name}</Text>
                <Text style={styles.summaryText}>Duration: {selectedPlan.duration_months} months</Text>
                <Text style={styles.totalAmount}>Total: ৳{selectedPlan.price_bdt}</Text>
              </View>
            )}

            <Text style={styles.title}>Select Payment Gateway</Text>
            <View style={styles.gatewayGrid}>
              {gateways.map((gateway) => (
                <TouchableOpacity
                  key={gateway.id}
                  style={[
                    styles.gatewayCard,
                    selectedGateway?.id === gateway.id && styles.gatewayCardSelected,
                  ]}
                  onPress={() => handlePaymentMethodSelection(gateway)}
                >
                  <View style={styles.gatewayIcon}>
                    <Ionicons 
                      name={gateway.type === 'mobile_banking' ? 'phone-portrait' : 'card'} 
                      size={20} 
                      color={Theme.colors.background} 
                    />
                  </View>
                  <Text style={styles.gatewayName}>{gateway.display_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={{ color: Theme.colors.background }}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedGateway && (
              <>
                <Text style={styles.title}>Payment via {selectedGateway.display_name}</Text>
                
                <Input
                  label="Phone Number"
                  value={paymentMethod.phone_number}
                  onChangeText={(text) => setPaymentMethod(prev => ({ ...prev, phone_number: text }))}
                  placeholder="01XXXXXXXXX"
                  keyboardType="phone-pad"
                />

                <Button
                  title={paymentLoading ? "Processing..." : "Proceed to Payment"}
                  variant="primary"
                  onPress={processPayment}
                  disabled={paymentLoading || !paymentMethod.phone_number}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};