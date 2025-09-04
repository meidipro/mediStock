import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useStock, useCustomers } from '../../hooks/useDatabase';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EnhancedMedicineSearch } from '../ui/EnhancedMedicineSearch';
import { BarcodeScanButton } from '../barcode/BarcodeScanButton';
import { supabase } from '../../lib/supabase';
import { Medicine, MedicineSearchResult, Customer, StockItem } from '../../lib/types';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface InvoiceItem {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  batch_number?: string;
  expiry_date?: string;
  available_stock: number;
}

interface InvoiceData {
  customer_id?: string;
  customer_name?: string;
  items: InvoiceItem[];
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_banking' | 'due';
  notes?: string;
}

interface EnhancedInvoiceFormProps {
  onSubmit: (invoiceData: InvoiceData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const EnhancedInvoiceForm: React.FC<EnhancedInvoiceFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { pharmacy } = useAuth();
  const { stockItems } = useStock();
  const { customers, searchCustomers } = useCustomers();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_banking' | 'due'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
  const totalAmount = subtotal;
  const paidAmountNum = parseFloat(paidAmount) || 0;
  const dueAmount = totalAmount - paidAmountNum;

  const handleMedicineSelect = useCallback((medicine: Medicine | MedicineSearchResult) => {
    // Find the medicine in stock to get current stock info
    const stockItem = stockItems.find(stock => stock.medicine_id === medicine.id);
    
    if (!stockItem || stockItem.quantity <= 0) {
      Alert.alert(
        'Out of Stock',
        `${medicine.generic_name || medicine.name} is currently out of stock.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if medicine is already in the invoice
    const existingItemIndex = items.findIndex(item => item.medicine_id === medicine.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const existingItem = items[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      
      if (newQuantity > stockItem.quantity) {
        Alert.alert(
          'Insufficient Stock',
          `Only ${stockItem.quantity} units available for ${medicine.generic_name || medicine.name}`,
          [{ text: 'OK' }]
        );
        return;
      }

      const updatedItems = [...items];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        total_amount: newQuantity * existingItem.unit_price,
      };
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem: InvoiceItem = {
        medicine_id: medicine.id,
        medicine_name: medicine.generic_name || medicine.name || 'Unknown',
        quantity: 1,
        unit_price: stockItem.unit_price || 0,
        total_amount: stockItem.unit_price || 0,
        batch_number: stockItem.batch_number,
        expiry_date: stockItem.expiry_date,
        available_stock: stockItem.quantity,
      };
      setItems([...items, newItem]);
    }
  }, [stockItems, items]);

  const handleQuantityChange = useCallback((itemIndex: number, newQuantity: string) => {
    const quantity = parseInt(newQuantity) || 0;
    const item = items[itemIndex];
    
    if (quantity > item.available_stock) {
      Alert.alert(
        'Insufficient Stock',
        `Only ${item.available_stock} units available`,
        [{ text: 'OK' }]
      );
      return;
    }

    const updatedItems = [...items];
    updatedItems[itemIndex] = {
      ...item,
      quantity,
      total_amount: quantity * item.unit_price,
    };
    setItems(updatedItems);
  }, [items]);

  const handleRemoveItem = useCallback((itemIndex: number) => {
    const updatedItems = items.filter((_, index) => index !== itemIndex);
    setItems(updatedItems);
  }, [items]);

  const handleCustomerSearch = useCallback(async (query: string) => {
    if (query.length < 2) return;
    
    try {
      const results = await searchCustomers(query);
      // Could show suggestions here in a dropdown
    } catch (error) {
      console.error('Customer search error:', error);
    }
  }, [searchCustomers]);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one medicine to the invoice');
      return;
    }

    if (paidAmountNum < 0) {
      Alert.alert('Error', 'Paid amount cannot be negative');
      return;
    }

    if (paymentMethod !== 'due' && paidAmountNum > totalAmount) {
      Alert.alert('Error', 'Paid amount cannot exceed total amount');
      return;
    }

    const invoiceData: InvoiceData = {
      customer_id: selectedCustomer?.id,
      customer_name: customerName || selectedCustomer?.name,
      items,
      total_amount: totalAmount,
      paid_amount: paidAmountNum,
      due_amount: dueAmount,
      payment_method: paymentMethod,
      notes,
    };

    try {
      setSubmitting(true);
      await onSubmit(invoiceData);
    } catch (error) {
      console.error('Invoice submission error:', error);
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [items, paidAmountNum, totalAmount, dueAmount, paymentMethod, notes, selectedCustomer, customerName, onSubmit]);

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    section: {
      marginBottom: theme.spacing.lg,
    },

    sectionTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },

    customerSection: {
      marginBottom: theme.spacing.lg,
    },

    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },

    itemInfo: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },

    itemName: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.text,
    },

    itemDetails: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    quantityInput: {
      width: 60,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.xs,
      marginHorizontal: theme.spacing.sm,
    },

    removeButton: {
      padding: theme.spacing.xs,
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.sm,
    },

    removeButtonText: {
      color: theme.colors.background,
      fontSize: theme.typography.sizes.sm,
    },

    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
    },

    summaryLabel: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.text,
    },

    summaryValue: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.text,
    },

    totalRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
    },

    totalValue: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.primary,
    },

    paymentMethods: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },

    paymentMethod: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    paymentMethodActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },

    paymentMethodText: {
      color: theme.colors.text,
    },

    paymentMethodTextActive: {
      color: theme.colors.background,
    },

    actions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },

    actionButton: {
      flex: 1,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Customer Section */}
      <Card style={styles.section}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Customer Information</Text>
        </CardHeader>
        <CardContent>
          <Input
            label="Customer Name (Optional)"
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Enter customer name or leave blank for walk-in"
          />
        </CardContent>
      </Card>

      {/* Medicine Selection */}
      <Card style={styles.section}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Add Medicines</Text>
        </CardHeader>
        <CardContent>
          <EnhancedMedicineSearch
            onMedicineSelect={handleMedicineSelect}
            placeholder="Search medicines or scan barcode..."
            showBarcodeScanner={true}
            showCreateNew={false}
          />
        </CardContent>
      </Card>

      {/* Invoice Items */}
      {items.length > 0 && (
        <Card style={styles.section}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Invoice Items ({items.length})</Text>
          </CardHeader>
          <CardContent>
            {items.map((item, index) => (
              <View key={`${item.medicine_id}-${index}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.medicine_name}</Text>
                  <Text style={styles.itemDetails}>
                    ৳{item.unit_price} × {item.quantity} = ৳{item.total_amount}
                  </Text>
                  <Text style={styles.itemDetails}>
                    Available: {item.available_stock} units
                  </Text>
                </View>
                
                <Input
                  style={styles.quantityInput}
                  value={item.quantity.toString()}
                  onChangeText={(text) => handleQuantityChange(index, text)}
                  keyboardType="numeric"
                  textAlign="center"
                />
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(index)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invoice Summary */}
      {items.length > 0 && (
        <Card style={styles.section}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Invoice Summary</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>৳{subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={styles.totalValue}>৳{totalAmount.toFixed(2)}</Text>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Payment Information */}
      {items.length > 0 && (
        <Card style={styles.section}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Payment Information</Text>
          </CardHeader>
          <CardContent>
            <Text style={styles.summaryLabel}>Payment Method:</Text>
            <View style={styles.paymentMethods}>
              {(['cash', 'card', 'mobile_banking', 'due'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethod,
                    paymentMethod === method && styles.paymentMethodActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === method && styles.paymentMethodTextActive,
                  ]}>
                    {method === 'mobile_banking' ? 'Mobile' : method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Paid Amount"
              value={paidAmount}
              onChangeText={setPaidAmount}
              placeholder="0.00"
              keyboardType="numeric"
            />

            {dueAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Due Amount:</Text>
                <Text style={[styles.summaryValue, { color: Theme.colors.error }]}>
                  ৳{dueAmount.toFixed(2)}
                </Text>
              </View>
            )}

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this invoice..."
              multiline={true}
              numberOfLines={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onCancel}
          style={styles.actionButton}
          disabled={submitting}
        />
        <Button
          title={submitting ? "Creating..." : "Create Invoice"}
          variant="primary"
          onPress={handleSubmit}
          style={styles.actionButton}
          disabled={items.length === 0 || submitting}
        />
      </View>

      {submitting && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      )}
    </ScrollView>
  );
};