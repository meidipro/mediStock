import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase.js';
import { Theme } from '../constants/Theme';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState({
    planId: params.planId as string,
    planName: params.planName as string,
    amount: parseFloat(params.amount as string),
  });
  
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [gateways, setGateways] = useState<any[]>([]);

  useEffect(() => {
    loadPaymentGateways();
  }, []);

  const loadPaymentGateways = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setGateways(data || []);
    } catch (error) {
      console.error('Error loading payment gateways:', error);
    }
  };

  const validatePhoneNumber = (phone: string) => {
    const bangladeshiPhoneRegex = /^(\+88)?01[3-9]\d{8}$/;
    return bangladeshiPhoneRegex.test(phone);
  };

  const initiateBkashPayment = async () => {
    try {
      setProcessing(true);

      // In a real app, you would call your backend API here
      // This is a placeholder for the actual bKash integration
      
      const paymentData = {
        amount: paymentData.amount,
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: `INV-${Date.now()}`,
        callbackURL: 'https://yourapp.com/bkash/callback',
      };

      // Simulate API call to create bKash payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, you would get a bkashURL from the response
      // and open it in a WebView or redirect to bKash app
      
      Alert.alert(
        'Payment Initiated',
        'Please complete the payment in the bKash app. You will be redirected back to confirm.',
        [
          {
            text: 'Simulate Success',
            onPress: () => handlePaymentSuccess('bkash_txn_' + Date.now())
          },
          {
            text: 'Simulate Failed',
            onPress: () => handlePaymentFailed('Payment cancelled by user')
          }
        ]
      );

    } catch (error) {
      console.error('bKash payment error:', error);
      Alert.alert('Error', 'Failed to initiate bKash payment');
    } finally {
      setProcessing(false);
    }
  };

  const initiateNagadPayment = async () => {
    try {
      setProcessing(true);

      // In a real app, you would call your backend API here
      // This is a placeholder for the actual Nagad integration
      
      const paymentData = {
        amount: paymentData.amount,
        orderId: `ORDER-${Date.now()}`,
        productDetails: `MediStock Subscription - ${paymentData.planName}`,
        clientMobile: phoneNumber,
      };

      // Simulate API call to create Nagad payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, you would get a callBackUrl from the response
      // and open it in a WebView
      
      Alert.alert(
        'Payment Initiated',
        'Please complete the payment in the Nagad interface.',
        [
          {
            text: 'Simulate Success',
            onPress: () => handlePaymentSuccess('nagad_txn_' + Date.now())
          },
          {
            text: 'Simulate Failed',
            onPress: () => handlePaymentFailed('Payment cancelled by user')
          }
        ]
      );

    } catch (error) {
      console.error('Nagad payment error:', error);
      Alert.alert('Error', 'Failed to initiate Nagad payment');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get pharmacy for this user
      const { data: pharmacyData } = await supabase
        .from('pharmacies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!pharmacyData) throw new Error('Pharmacy not found');

      // Create payment record
      const selectedGatewayData = gateways.find(g => g.id === selectedGateway);
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          pharmacy_id: pharmacyData.id,
          plan_id: paymentData.planId,
          gateway_id: selectedGateway,
          amount_bdt: paymentData.amount,
          transaction_id: transactionId,
          gateway_transaction_id: transactionId,
          status: 'completed',
          payment_method: selectedGatewayData?.name,
          customer_phone: phoneNumber,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create or update subscription
      const startDate = new Date();
      const endDate = new Date();
      
      // Get plan duration
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('duration_months')
        .eq('id', paymentData.planId)
        .single();

      if (planData) {
        endDate.setMonth(endDate.getMonth() + planData.duration_months);
      }

      const { error: subscriptionError } = await supabase
        .from('pharmacy_subscriptions')
        .upsert({
          pharmacy_id: pharmacyData.id,
          plan_id: paymentData.planId,
          status: 'active',
          starts_at: startDate.toISOString(),
          expires_at: endDate.toISOString(),
          auto_renew: true,
        });

      if (subscriptionError) throw subscriptionError;

      Alert.alert(
        'Payment Successful!',
        'Your subscription has been activated successfully.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );

    } catch (error) {
      console.error('Error processing successful payment:', error);
      Alert.alert('Error', 'Payment was successful but there was an error activating your subscription. Please contact support.');
    }
  };

  const handlePaymentFailed = (reason: string) => {
    Alert.alert(
      'Payment Failed',
      reason || 'The payment could not be completed. Please try again.',
      [
        {
          text: 'Try Again',
          onPress: () => setProcessing(false)
        },
        {
          text: 'Cancel',
          onPress: () => router.back()
        }
      ]
    );
  };

  const initiatePayment = () => {
    if (!selectedGateway) {
      Alert.alert('Payment Method Required', 'Please select a payment method first');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid Bangladeshi phone number');
      return;
    }

    const gateway = gateways.find(g => g.id === selectedGateway);
    if (!gateway) return;

    if (gateway.name === 'bkash') {
      initiateBkashPayment();
    } else if (gateway.name === 'nagad') {
      initiateNagadPayment();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Plan:</Text>
            <Text style={styles.summaryValue}>{paymentData.planName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.summaryValue}>৳{paymentData.amount.toLocaleString()}</Text>
          </View>
          {selectedGateway && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method:</Text>
              <Text style={styles.summaryValue}>
                {gateways.find(g => g.id === selectedGateway)?.display_name}
              </Text>
            </View>
          )}
        </View>

        {/* Phone Number Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Mobile Number</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="Enter your mobile number (01XXXXXXXXX)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={14}
          />
          <Text style={styles.inputHint}>
            This number will be used for payment verification
          </Text>
        </View>

        {/* Payment Gateway Selection */}
        <View style={styles.gatewaySection}>
          <Text style={styles.gatewayTitle}>Choose Payment Method</Text>
          <View style={styles.gatewayList}>
            {gateways.map((gateway) => (
              <TouchableOpacity
                key={gateway.id}
                style={[
                  styles.gatewayOption,
                  selectedGateway === gateway.id && styles.gatewaySelected,
                  { borderColor: gateway.config.color }
                ]}
                onPress={() => setSelectedGateway(gateway.id)}
              >
                <View style={styles.gatewayContent}>
                  <Text style={[
                    styles.gatewayText,
                    selectedGateway === gateway.id && { color: gateway.config.color }
                  ]}>
                    {gateway.display_name}
                  </Text>
                  {selectedGateway === gateway.id && (
                    <Ionicons name="checkmark-circle" size={24} color={gateway.config.color} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Payment Instructions</Text>
          <Text style={styles.instructionsText}>
            1. Enter your mobile number{'\n'}
            2. Select your preferred payment method{'\n'}
            3. Click "Pay Now" to initiate the payment{'\n'}
            4. Complete the payment securely{'\n'}
            5. You will be redirected back to confirm your subscription
          </Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={initiatePayment}
          disabled={processing}
        >
          {processing ? (
            <View style={styles.payButtonContent}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.payButtonText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>
              {selectedGateway 
                ? `Pay ৳${paymentData.amount.toLocaleString()} with ${gateways.find(g => g.id === selectedGateway)?.display_name}`
                : `Pay ৳${paymentData.amount.toLocaleString()}`
              }
            </Text>
          )}
        </TouchableOpacity>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="shield-checkmark" size={20} color={Theme.colors.success} />
          <Text style={styles.securityText}>
            Your payment is secured with 256-bit SSL encryption
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40, // Extra bottom padding for better scrolling
  },
  summaryCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 8,
  },
  phoneInput: {
    backgroundColor: Theme.colors.card,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: Theme.colors.text,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  inputHint: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginTop: 5,
  },
  gatewaySection: {
    marginBottom: 20,
  },
  gatewayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  gatewayList: {
    gap: 10,
  },
  gatewayOption: {
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Theme.colors.border,
  },
  gatewaySelected: {
    backgroundColor: Theme.colors.primary + '10',
  },
  gatewayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gatewayText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  instructionsCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  payButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  payButtonDisabled: {
    backgroundColor: Theme.colors.textSecondary,
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
});