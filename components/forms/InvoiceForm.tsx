import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
// Removed Modal and FlatList imports - using simple dropdown instead
import { Theme, createThemedStyles } from '../../constants/Theme';
import { BarcodeLookupResult } from '../../lib/barcode-service';
import { MedicineDeliveryService } from '../../lib/medicine-delivery-service';
import { BarcodeScanButton } from '../barcode/BarcodeScanButton';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';

// Types
interface Medicine {
  name: string;
  price: number;
}

interface MedicineRow {
  id: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CustomerData {
  name: string;
  location: string;
  contact: string;
}

interface PaymentData {
  subtotal: number;
  discount: number;
  total: number;
  paymentAmount: number;
  dueAmount: number;
}

interface DeliveryData {
  enabled: boolean;
  address: string;
  available: boolean;
  fee: number;
  estimatedTime: string;
}

interface InvoiceFormData {
  customer: CustomerData;
  medicines: MedicineRow[];
  payment: PaymentData;
  delivery?: DeliveryData;
}

interface InvoiceFormProps {
  onSubmit: (formData: InvoiceFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  medicineList?: Medicine[];
}

// Default medicine list
const defaultMedicineList: Medicine[] = [
  { name: 'Napa (Paracetamol)', price: 5 },
  { name: 'Seclo 20mg', price: 12 },
  { name: 'Histacin', price: 8 },
  { name: 'Omeprazole 20mg', price: 15 },
  { name: 'Metformin 500mg', price: 10 },
  { name: 'Amlodipine 5mg', price: 8 },
  { name: 'Atorvastatin 20mg', price: 25 },
  { name: 'Losartan 50mg', price: 18 },
  { name: 'Furosemide 40mg', price: 6 },
  { name: 'Aspirin 75mg', price: 3 },
];

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  medicineList = defaultMedicineList,
}) => {
  // State management
  const [customer, setCustomer] = useState<CustomerData>({
    name: '',
    location: '',
    contact: '',
  });

  const [medicines, setMedicines] = useState<MedicineRow[]>([
    {
      id: '1',
      medicineName: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    },
  ]);

  const [discount, setDiscount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [searchQueries, setSearchQueries] = useState<{[key: string]: string}>({});
  
  // Delivery state
  const [delivery, setDelivery] = useState<DeliveryData>({
    enabled: false,
    address: '',
    available: false,
    fee: 0,
    estimatedTime: '',
  });
  const [showSuggestions, setShowSuggestions] = useState<{[key: string]: boolean}>({});

  // Check delivery availability when address changes
  useEffect(() => {
    if (delivery.address.trim()) {
      checkDeliveryAvailability();
    }
  }, [delivery.address]);

  const checkDeliveryAvailability = async () => {
    try {
      const isAvailable = await MedicineDeliveryService.isDeliveryAvailable(delivery.address);
      const subtotal = medicines.reduce((sum, item) => sum + item.total, 0);
      
      if (isAvailable) {
        const feeEstimate = await MedicineDeliveryService.getDeliveryFeeEstimate(delivery.address, subtotal);
        setDelivery(prev => ({
          ...prev,
          available: true,
          fee: feeEstimate.delivery_fee,
          estimatedTime: `${feeEstimate.estimated_time} minutes`,
        }));
      } else {
        setDelivery(prev => ({
          ...prev,
          available: false,
          fee: 0,
          estimatedTime: '',
        }));
      }
    } catch (error) {
      console.error('Error checking delivery:', error);
      setDelivery(prev => ({
        ...prev,
        available: false,
        fee: 0,
        estimatedTime: '',
      }));
    }
  };

  // Calculated values using useMemo for performance
  const calculations = useMemo(() => {
    const subtotal = medicines.reduce((sum, item) => sum + item.total, 0);
    const deliveryFee = delivery.enabled && delivery.available ? delivery.fee : 0;
    const total = Math.max(0, subtotal - discount + deliveryFee);
    const dueAmount = Math.max(0, total - paymentAmount);

    return {
      subtotal,
      total,
      dueAmount,
      deliveryFee,
    };
  }, [medicines, discount, paymentAmount, delivery.enabled, delivery.available, delivery.fee]);

  // Medicine row handlers
  const addMedicineRow = useCallback(() => {
    const newRow: MedicineRow = {
      id: Date.now().toString(),
      medicineName: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setMedicines(prev => [...prev, newRow]);
  }, []);

  const removeMedicineRow = useCallback((id: string) => {
    if (medicines.length > 1) {
      setMedicines(prev => prev.filter(item => item.id !== id));
    }
  }, [medicines.length]);

  const updateMedicineRow = useCallback((id: string, field: keyof MedicineRow, value: string | number) => {
    setMedicines(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Auto-calculate based on field changes
        if (field === 'medicineName') {
          const selectedMedicine = medicineList.find(med => med.name === value);
          if (selectedMedicine) {
            updated.unitPrice = selectedMedicine.price;
            updated.total = updated.quantity * selectedMedicine.price;
            // Store stock info for validation
            (updated as any).availableStock = selectedMedicine.availableStock;
            (updated as any).stockId = selectedMedicine.stockId;
          }
        } else if (field === 'quantity') {
          // Validate quantity against available stock
          const selectedMedicine = medicineList.find(med => med.name === item.medicineName);
          if (selectedMedicine && value > selectedMedicine.availableStock) {
            Alert.alert(
              'Insufficient Stock',
              `Only ${selectedMedicine.availableStock} units available for ${item.medicineName}`,
              [{ text: 'OK' }]
            );
            updated.quantity = selectedMedicine.availableStock;
          }
          updated.total = updated.quantity * updated.unitPrice;
        } else if (field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }

        return updated;
      })
    );
  }, [medicineList]);

  // Barcode scanning handlers
  const handleBarcodeScanned = useCallback((result: BarcodeLookupResult, rowId?: string) => {
    console.log('📱 Barcode scanned in invoice form:', result);
    
    if (result.found && result.medicine) {
      const medicine = result.medicine;
      const medicineName = medicine.generic_name || medicine.name || '';
      
      // Find medicine price from the list or use a default
      const medicineFromList = medicineList.find(med => 
        med.name.toLowerCase().includes(medicineName.toLowerCase()) ||
        medicineName.toLowerCase().includes(med.name.toLowerCase())
      );
      
      const unitPrice = medicineFromList?.price || 0;
      
      if (rowId) {
        // Update specific row
        updateMedicineRow(rowId, 'medicineName', medicineName);
        if (unitPrice > 0) {
          updateMedicineRow(rowId, 'unitPrice', unitPrice);
        }
      } else {
        // Add new row or update first empty row
        const emptyRow = medicines.find(med => !med.medicineName);
        if (emptyRow) {
          updateMedicineRow(emptyRow.id, 'medicineName', medicineName);
          if (unitPrice > 0) {
            updateMedicineRow(emptyRow.id, 'unitPrice', unitPrice);
          }
        } else {
          // Add new row
          const newRow: MedicineRow = {
            id: Date.now().toString(),
            medicineName,
            quantity: 1,
            unitPrice,
            total: unitPrice,
          };
          setMedicines(prev => [...prev, newRow]);
        }
      }
      
      Alert.alert(
        '✅ Medicine Added',
        `${medicineName} has been added to the invoice${unitPrice > 0 ? ` with price ৳${unitPrice}` : ''}`,
        [{ text: 'OK' }]
      );
    } else if (result.suggestions.length > 0) {
      // Show suggestions to user
      const suggestion = result.suggestions[0];
      const suggestionName = suggestion.generic_name || suggestion.name || '';
      
      Alert.alert(
        '🔍 Similar Medicine Found',
        `Found similar medicine: ${suggestionName}. Would you like to add it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: () => {
              const medicineFromList = medicineList.find(med => 
                med.name.toLowerCase().includes(suggestionName.toLowerCase())
              );
              const unitPrice = medicineFromList?.price || 0;
              
              if (rowId) {
                updateMedicineRow(rowId, 'medicineName', suggestionName);
                if (unitPrice > 0) {
                  updateMedicineRow(rowId, 'unitPrice', unitPrice);
                }
              } else {
                const emptyRow = medicines.find(med => !med.medicineName);
                if (emptyRow) {
                  updateMedicineRow(emptyRow.id, 'medicineName', suggestionName);
                  if (unitPrice > 0) {
                    updateMedicineRow(emptyRow.id, 'unitPrice', unitPrice);
                  }
                } else {
                  const newRow: MedicineRow = {
                    id: Date.now().toString(),
                    medicineName: suggestionName,
                    quantity: 1,
                    unitPrice,
                    total: unitPrice,
                  };
                  setMedicines(prev => [...prev, newRow]);
                }
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        '❌ Medicine Not Found',
        result.error || 'No medicine found for this barcode. Please enter manually.',
        [{ text: 'OK' }]
      );
    }
  }, [medicineList, medicines, updateMedicineRow]);

  const handleBarcodeError = useCallback((error: string) => {
    Alert.alert('Barcode Scan Error', error);
  }, []);

  // Form validation
  const validateForm = useCallback((): string | null => {
    // Customer validation
    if (!customer.name.trim()) return 'Customer name is required';
    if (!customer.location.trim()) return 'Customer location is required';
    if (!customer.contact.trim()) return 'Customer contact is required';

    // Medicines validation
    const validMedicines = medicines.filter(med => med.medicineName && med.quantity > 0);
    if (validMedicines.length === 0) return 'At least one medicine is required';

    // Check for incomplete medicine rows
    const incompleteMedicines = medicines.some(med => med.medicineName && (med.quantity <= 0 || med.unitPrice <= 0));
    if (incompleteMedicines) return 'Please complete all medicine details';

    return null;
  }, [customer, medicines]);

  // Form submission
  const handleSubmit = useCallback(() => {
    console.log('🚀 Submit button clicked!');
    console.log('👤 Customer data:', customer);
    console.log('💊 Medicines data:', medicines);
    console.log('💰 Payment data:', { discount, paymentAmount, calculations });
    
    const validationError = validateForm();
    if (validationError) {
      console.log('❌ Validation failed:', validationError);
      Alert.alert('Validation Error', validationError);
      return;
    }

    const validMedicines = medicines.filter(med => med.medicineName && med.quantity > 0);
    console.log('✅ Valid medicines:', validMedicines);

    const formData: InvoiceFormData = {
      customer,
      medicines: validMedicines,
      payment: {
        subtotal: calculations.subtotal,
        discount,
        total: calculations.total,
        paymentAmount,
        dueAmount: calculations.dueAmount,
      },
      delivery: delivery.enabled ? delivery : undefined,
    };

    console.log('📋 Final form data:', formData);
    onSubmit(formData);
  }, [customer, medicines, discount, paymentAmount, calculations, validateForm, onSubmit]);

  // Reset form
  const handleReset = useCallback(() => {
    setCustomer({ name: '', location: '', contact: '' });
    setMedicines([{ id: '1', medicineName: '', quantity: 1, unitPrice: 0, total: 0 }]);
    setDiscount(0);
    setPaymentAmount(0);
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Customer Information Section */}
      <Card style={styles.section}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Customer Information</Text>
        </CardHeader>
        <CardContent>
          <Input
            label="Customer Name *"
            value={customer.name}
            onChangeText={(text) => setCustomer(prev => ({ ...prev, name: text }))}
            placeholder="Enter customer name"
            style={styles.input}
          />
          
          <Input
            label="Location/Address *"
            value={customer.location}
            onChangeText={(text) => setCustomer(prev => ({ ...prev, location: text }))}
            placeholder="Enter customer address"
            style={styles.input}
          />
          
          <Input
            label="Contact Number *"
            value={customer.contact}
            onChangeText={(text) => setCustomer(prev => ({ ...prev, contact: text }))}
            placeholder="Enter contact number"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </CardContent>
      </Card>

      {/* Add Medicines Section */}
      <Card style={styles.section}>
        <CardHeader>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add Medicines</Text>
            <View style={styles.headerActions}>
              <BarcodeScanButton
                onScanSuccess={(result) => handleBarcodeScanned(result)}
                onScanError={handleBarcodeError}
                title="Scan Medicine Barcode"
                buttonText="📱 Scan"
                variant="outline"
                size="sm"
                style={styles.headerBarcodeButton}
              />
              <TouchableOpacity onPress={addMedicineRow} style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Add Row</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CardHeader>
        <CardContent>
          {medicines.map((medicine, index) => (
            <View key={medicine.id} style={styles.medicineRow}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowNumber}>#{index + 1}</Text>
                {medicines.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeMedicineRow(medicine.id)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Medicine Name Search */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Medicine Name</Text>
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputRow}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Type medicine name..."
                      value={searchQueries[medicine.id] || medicine.medicineName || ''}
                      onChangeText={(text) => {
                        setSearchQueries(prev => ({ ...prev, [medicine.id]: text }));
                        // Show suggestions when user types at least 1 character
                        setShowSuggestions(prev => ({ ...prev, [medicine.id]: text.length >= 1 }));
                      }}
                      onFocus={() => {
                        console.log('🔍 Medicine input focused for:', medicine.id);
                        const query = searchQueries[medicine.id] || '';
                        if (query.length >= 1) {
                          setShowSuggestions(prev => ({ ...prev, [medicine.id]: true }));
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow selection
                        setTimeout(() => {
                          setShowSuggestions(prev => ({ ...prev, [medicine.id]: false }));
                        }, 200);
                      }}
                    />
                    
                    {/* Barcode Scan Button for this row */}
                    <BarcodeScanButton
                      onScanSuccess={(result) => handleBarcodeScanned(result, medicine.id)}
                      onScanError={handleBarcodeError}
                      title={`Scan Medicine for Row ${index + 1}`}
                      variant="icon"
                      size="sm"
                      style={styles.rowBarcodeButton}
                    />
                  </View>
                  
                  {/* Suggestions dropdown - positioned below input field */}
                  {showSuggestions[medicine.id] && (
                    <View style={styles.suggestionsDropdown}>
                      <View style={styles.suggestionHeader}>
                        <Text style={styles.suggestionHeaderText}>💊 Select from Inventory</Text>
                      </View>
                      <ScrollView 
                        nestedScrollEnabled={true} 
                        keyboardShouldPersistTaps="handled"
                        style={styles.suggestionsScrollView}
                        showsVerticalScrollIndicator={false}
                      >
                        {medicineList && medicineList.length > 0 ? medicineList
                          .filter(med => {
                            const query = (searchQueries[medicine.id] || '').toLowerCase().trim();
                            if (query.length === 0) return false;
                            // Use "starts with" logic for better filtering
                            return med.name.toLowerCase().startsWith(query);
                          })
                          .slice(0, 6) // Show fewer suggestions for better UX
                          .map((suggestion, suggestionIndex) => (
                            <TouchableOpacity
                              key={`${suggestion.stockId || suggestionIndex}`}
                              style={[
                                styles.suggestionItem,
                                suggestionIndex === 0 && styles.suggestionItemFirst,
                                suggestionIndex === Math.min(5, medicineList.length - 1) && styles.suggestionItemLast
                              ]}
                              onPress={() => {
                                console.log('🎯 Medicine selected:', suggestion.name);
                                updateMedicineRow(medicine.id, 'medicineName', suggestion.name);
                                setSearchQueries(prev => ({ ...prev, [medicine.id]: suggestion.name }));
                                setShowSuggestions(prev => ({ ...prev, [medicine.id]: false }));
                              }}
                            >
                              <View style={styles.suggestionContent}>
                                <Text style={styles.suggestionText} numberOfLines={1}>
                                  {suggestion.name}
                                </Text>
                                {suggestion.manufacturer && (
                                  <Text style={styles.suggestionManufacturer} numberOfLines={1}>
                                    {suggestion.manufacturer}
                                  </Text>
                                )}
                                {suggestion.strength && (
                                  <Text style={styles.suggestionStrength} numberOfLines={1}>
                                    {suggestion.strength} {suggestion.dosageForm}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.suggestionRight}>
                                <Text style={styles.suggestionPrice}>৳{suggestion.price}</Text>
                                <Text style={styles.suggestionStock}>
                                  Stock: {suggestion.availableStock}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          )) : (
                            <View style={styles.suggestionItem}>
                              <Text style={styles.suggestionText}>
                                No medicines found starting with "{searchQueries[medicine.id] || ''}"
                              </Text>
                            </View>
                          )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.rowFields}>
                {/* Quantity */}
                <View style={[styles.fieldContainer, styles.smallField]}>
                  <Text style={styles.fieldLabel}>Qty</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={medicine.quantity.toString()}
                    onChangeText={(text) => {
                      const qty = parseInt(text) || 0;
                      updateMedicineRow(medicine.id, 'quantity', Math.max(0, qty));
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>

                {/* Unit Price */}
                <View style={[styles.fieldContainer, styles.mediumField]}>
                  <Text style={styles.fieldLabel}>Unit Price</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={medicine.unitPrice.toString()}
                    onChangeText={(text) => {
                      const price = parseFloat(text) || 0;
                      updateMedicineRow(medicine.id, 'unitPrice', Math.max(0, price));
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>

                {/* Total */}
                <View style={[styles.fieldContainer, styles.mediumField]}>
                  <Text style={styles.fieldLabel}>Total</Text>
                  <Text style={styles.totalDisplay}>৳{medicine.total}</Text>
                </View>
              </View>

              {index < medicines.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </CardContent>
      </Card>

      {/* Delivery Service Section */}
      <Card style={styles.section}>
        <CardHeader>
          <View style={styles.deliveryHeader}>
            <Text style={styles.sectionTitle}>🚚 Delivery Service</Text>
            <TouchableOpacity
              style={[styles.toggleButton, delivery.enabled && styles.toggleButtonActive]}
              onPress={() => setDelivery(prev => ({ ...prev, enabled: !prev.enabled }))}
            >
              <Text style={[styles.toggleButtonText, delivery.enabled && styles.toggleButtonTextActive]}>
                {delivery.enabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </CardHeader>
        {delivery.enabled && (
          <CardContent>
            <Input
              placeholder="Delivery Address"
              value={delivery.address}
              onChangeText={(text) => setDelivery(prev => ({ ...prev, address: text }))}
              style={styles.input}
              multiline
            />
            {delivery.address.trim() && (
              <View style={styles.deliveryInfo}>
                {delivery.available ? (
                  <View style={styles.deliveryAvailable}>
                    <Text style={styles.deliveryStatusText}>✅ Delivery Available</Text>
                    <Text style={styles.deliveryDetails}>
                      Fee: ৳{delivery.fee} | Time: {delivery.estimatedTime}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.deliveryUnavailable}>❌ Delivery not available in this area</Text>
                )}
              </View>
            )}
          </CardContent>
        )}
      </Card>

      {/* Payment Details Section */}
      <Card style={styles.section}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Payment Details</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Subtotal:</Text>
            <Text style={styles.calculationValue}>৳{calculations.subtotal}</Text>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.calculationLabel}>Discount:</Text>
            <TextInput
              style={styles.calculationInput}
              value={discount.toString()}
              onChangeText={(text) => setDiscount(parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          {delivery.enabled && delivery.available && (
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Delivery Fee:</Text>
              <Text style={styles.calculationValue}>৳{calculations.deliveryFee}</Text>
            </View>
          )}

          <View style={styles.calculationRow}>
            <Text style={[styles.calculationLabel, styles.totalLabel]}>Total:</Text>
            <Text style={[styles.calculationValue, styles.totalValue]}>৳{calculations.total}</Text>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.calculationLabel}>Payment:</Text>
            <TextInput
              style={styles.calculationInput}
              value={paymentAmount.toString()}
              onChangeText={(text) => setPaymentAmount(parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Due Amount:</Text>
            <Text style={[
              styles.calculationValue,
              { color: calculations.dueAmount > 0 ? Theme.colors.error : Theme.colors.success }
            ]}>
              ৳{calculations.dueAmount}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Reset"
          variant="outline"
          onPress={handleReset}
          style={styles.actionButton}
        />
        <Button
          title="Cancel"
          variant="outline"
          onPress={onCancel}
          style={styles.actionButton}
        />
        <Button
          title={loading ? "Creating..." : "Create Invoice"}
          variant="primary"
          onPress={handleSubmit}
          disabled={loading}
          style={styles.actionButton}
        />
      </View>

      {/* Suggestions automatically close when new medicine is selected */}
    </ScrollView>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },

  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  input: {
    marginBottom: theme.spacing.sm,
  },

  addButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },

  addButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },

  medicineRow: {
    marginBottom: theme.spacing.md,
  },

  rowHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  rowNumber: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
  },

  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.error + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  removeButtonText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },

  fieldContainer: {
    marginBottom: theme.spacing.sm,
  },

  fieldLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 4,
  },

  searchContainer: {
    position: 'relative' as const,
    flexDirection: 'column' as const,
    gap: theme.spacing.xs,
  },

  searchInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },

  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    minHeight: 50,
  },

  suggestionsDropdown: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    maxHeight: 280,
    marginTop: theme.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
    position: 'relative' as const,
  },

  suggestionsScrollView: {
    maxHeight: 250,
  },

  suggestionItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.background,
    minHeight: 70,
  },

  suggestionItemFirst: {
    borderTopLeftRadius: theme.borderRadius.sm,
    borderTopRightRadius: theme.borderRadius.sm,
  },

  suggestionItemLast: {
    borderBottomLeftRadius: theme.borderRadius.sm,
    borderBottomRightRadius: theme.borderRadius.sm,
    borderBottomWidth: 0,
  },

  suggestionContent: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },

  suggestionText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
    marginBottom: theme.spacing.xs,
  },

  suggestionManufacturer: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  suggestionStrength: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },

  suggestionRight: {
    alignItems: 'flex-end' as const,
    minWidth: 80,
  },

  suggestionPrice: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.xs,
  },

  suggestionStock: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },

  rowFields: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-end' as const,
    gap: theme.spacing.sm,
  },

  smallField: {
    flex: 1,
  },

  mediumField: {
    flex: 1.5,
  },

  smallInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    textAlign: 'center' as const,
  },

  priceDisplay: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    paddingVertical: theme.spacing.sm,
  },

  totalDisplay: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    textAlign: 'center' as const,
    paddingVertical: theme.spacing.sm,
  },

  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginTop: theme.spacing.sm,
  },

  calculationRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
  },

  inputRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
  },

  calculationLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },

  calculationValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  calculationInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    minWidth: 100,
    textAlign: 'right' as const,
  },

  totalLabel: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },

  totalValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },

  // Delivery styles
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  toggleButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  deliveryInfo: {
    marginTop: theme.spacing.sm,
  },
  deliveryAvailable: {
    backgroundColor: '#E8F5E8',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  deliveryStatusText: {
    color: '#2E7D32',
    fontWeight: theme.typography.weights.medium,
  },
  deliveryDetails: {
    color: '#2E7D32',
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.xs,
  },
  deliveryUnavailable: {
    color: '#D32F2F',
    fontSize: theme.typography.sizes.sm,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },

  actionButton: {
    flex: 1,
  },

  suggestionHeader: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  suggestionHeaderText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center' as const,
  },

  // Barcode button styles
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },

  headerBarcodeButton: {
    // Style handled by BarcodeScanButton component
  },

  rowBarcodeButton: {
    marginLeft: theme.spacing.sm,
    // Style handled by BarcodeScanButton component
  },
}));