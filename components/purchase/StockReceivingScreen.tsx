import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BarcodeScanButton } from '../barcode/BarcodeScanButton';
import { BarcodeScanner } from '../barcode/BarcodeScanner';
import { purchaseInventoryIntegration } from '../../lib/purchase-inventory-integration';
import { barcodeService, BarcodeLookupResult } from '../../lib/barcode-service';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { Medicine } from '../../lib/types';

interface ReceivingItem {
  id: string;
  medicine?: Medicine;
  barcode?: string;
  quantity: string;
  unitCost: string;
  batchNumber: string;
  expiryDate: string;
  status: 'pending' | 'scanned' | 'completed';
}

interface StockReceivingScreenProps {
  purchaseOrderId?: string;
  onComplete?: () => void;
}

export const StockReceivingScreen: React.FC<StockReceivingScreenProps> = ({
  purchaseOrderId,
  onComplete
}) => {
  const { user, pharmacy } = useAuth();
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [currentScanningItemId, setCurrentScanningItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    scannedItems: 0,
    completedItems: 0
  });

  useEffect(() => {
    // Initialize with one empty item
    addNewReceivingItem();
    loadIntegrationStats();
  }, []);

  useEffect(() => {
    // Update stats when items change
    const totalItems = receivingItems.length;
    const scannedItems = receivingItems.filter(item => item.status === 'scanned' || item.status === 'completed').length;
    const completedItems = receivingItems.filter(item => item.status === 'completed').length;
    
    setStats({ totalItems, scannedItems, completedItems });
  }, [receivingItems]);

  const loadIntegrationStats = async () => {
    if (!pharmacy?.id) return;
    
    try {
      const integrationStats = await purchaseInventoryIntegration.getIntegrationStats(pharmacy.id);
      console.log('📊 Integration stats:', integrationStats);
    } catch (error) {
      console.error('Error loading integration stats:', error);
    }
  };

  const addNewReceivingItem = () => {
    const newItem: ReceivingItem = {
      id: Date.now().toString(),
      quantity: '',
      unitCost: '',
      batchNumber: '',
      expiryDate: '',
      status: 'pending'
    };
    setReceivingItems(prev => [...prev, newItem]);
  };

  const removeReceivingItem = (id: string) => {
    if (receivingItems.length > 1) {
      setReceivingItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateReceivingItem = (id: string, updates: Partial<ReceivingItem>) => {
    setReceivingItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const handleBarcodeScanned = async (result: BarcodeLookupResult, itemId?: string) => {
    console.log('📱 Barcode scanned in stock receiving:', result);
    
    if (!pharmacy?.id) {
      Alert.alert('Error', 'Pharmacy not found');
      return;
    }

    const targetItemId = itemId || currentScanningItemId || receivingItems[0]?.id;
    
    if (!targetItemId) {
      Alert.alert('Error', 'No receiving item selected');
      return;
    }

    try {
      // Use the integration service to handle the barcode scan
      const integrationResult = await purchaseInventoryIntegration.handlePurchaseReceivingBarcodeScan(
        result.medicine?.barcode_number || result.suggestions[0]?.barcode_number || '',
        pharmacy.id,
        purchaseOrderId
      );

      if (integrationResult.found && integrationResult.medicine) {
        // Update the receiving item with scanned medicine
        updateReceivingItem(targetItemId, {
          medicine: integrationResult.medicine,
          barcode: integrationResult.medicine.barcode_number,
          status: 'scanned'
        });

        Alert.alert(
          '✅ Medicine Scanned',
          `${integrationResult.message}\n\nPlease enter quantity and cost details.`,
          [{ text: 'OK' }]
        );
      } else if (integrationResult.action === 'new') {
        // Handle new medicine
        Alert.alert(
          '📦 New Medicine',
          integrationResult.message,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Details',
              onPress: () => {
                // Open medicine details form
                updateReceivingItem(targetItemId, {
                  barcode: result.medicine?.barcode_number || '',
                  status: 'pending'
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Medicine Not Found', integrationResult.message);
      }
    } catch (error) {
      console.error('Error handling barcode scan:', error);
      Alert.alert('Error', 'Failed to process barcode scan');
    }

    setShowScanner(false);
    setCurrentScanningItemId(null);
  };

  const handleBarcodeError = (error: string) => {
    Alert.alert('Barcode Scan Error', error);
    setShowScanner(false);
    setCurrentScanningItemId(null);
  };

  const openScannerForItem = (itemId: string) => {
    setCurrentScanningItemId(itemId);
    setShowScanner(true);
  };

  const validateReceivingItem = (item: ReceivingItem): string | null => {
    if (!item.medicine && !item.barcode) {
      return 'Medicine or barcode is required';
    }
    if (!item.quantity || parseInt(item.quantity) <= 0) {
      return 'Valid quantity is required';
    }
    if (!item.unitCost || parseFloat(item.unitCost) <= 0) {
      return 'Valid unit cost is required';
    }
    return null;
  };

  const processStockReceiving = async () => {
    if (!pharmacy?.id || !user?.id) {
      Alert.alert('Error', 'Missing user or pharmacy information');
      return;
    }

    // Validate all items
    const validItems = receivingItems.filter(item => {
      const validation = validateReceivingItem(item);
      return validation === null;
    });

    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one valid receiving item');
      return;
    }

    setLoading(true);

    try {
      // Prepare receiving data
      const receivingData = {
        purchase_order_id: purchaseOrderId || 'manual-receiving',
        received_items: validItems.map(item => ({
          medicine_id: item.medicine?.id || '',
          barcode_scanned: item.barcode,
          quantity_received: parseInt(item.quantity),
          unit_cost: parseFloat(item.unitCost),
          batch_number: item.batchNumber || undefined,
          expiry_date: item.expiryDate || undefined
        })),
        received_by: user.id,
        received_at: new Date().toISOString()
      };

      // Process the receiving using integration service
      const result = await purchaseInventoryIntegration.receiveStockFromPurchase(
        receivingData,
        pharmacy.id
      );

      if (result.success) {
        // Update item statuses to completed
        validItems.forEach(item => {
          updateReceivingItem(item.id, { status: 'completed' });
        });

        Alert.alert(
          '✅ Stock Received Successfully',
          `${result.updatedItems} items have been added to your inventory.`,
          [
            {
              text: 'Add More',
              onPress: () => {
                // Clear completed items and add new empty item
                setReceivingItems([]);
                addNewReceivingItem();
              }
            },
            {
              text: 'Complete',
              onPress: () => {
                if (onComplete) {
                  onComplete();
                } else {
                  // Navigate back or close
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Receiving Errors',
          `Some items failed to process:\n${result.errors.join('\n')}\n\n${result.updatedItems} items were processed successfully.`
        );
      }

    } catch (error) {
      console.error('Error processing stock receiving:', error);
      Alert.alert('Error', 'Failed to process stock receiving');
    } finally {
      setLoading(false);
    }
  };

  const renderReceivingItem = (item: ReceivingItem, index: number) => (
    <Card key={item.id} style={styles.itemCard}>
      <CardHeader>
        <View style={styles.itemHeader}>
          <Text style={styles.itemNumber}>Item #{index + 1}</Text>
          <View style={styles.itemActions}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(item.status) }
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            {receivingItems.length > 1 && (
              <TouchableOpacity
                onPress={() => removeReceivingItem(item.id)}
                style={styles.removeButton}
              >
                <Ionicons name="close" size={16} color={Theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CardHeader>

      <CardContent>
        {/* Medicine/Barcode Section */}
        <View style={styles.medicineSection}>
          <Text style={styles.fieldLabel}>Medicine</Text>
          {item.medicine ? (
            <View style={styles.medicineInfo}>
              <Text style={styles.medicineName}>
                {item.medicine.generic_name || item.medicine.name}
              </Text>
              {item.medicine.brand_name && (
                <Text style={styles.brandName}>
                  Brand: {item.medicine.brand_name}
                </Text>
              )}
              {item.barcode && (
                <Text style={styles.barcodeText}>
                  Barcode: {item.barcode}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.scanSection}>
              <BarcodeScanButton
                onScanSuccess={(result) => handleBarcodeScanned(result, item.id)}
                onScanError={handleBarcodeError}
                pharmacyId={pharmacy?.id}
                title={`Scan Medicine for Item ${index + 1}`}
                buttonText="📱 Scan Medicine"
                variant="outline"
                size="md"
                style={styles.scanButton}
              />
              <Text style={styles.scanHint}>
                Scan barcode to identify medicine
              </Text>
            </View>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.row}>
            <Input
              label="Quantity Received"
              value={item.quantity}
              onChangeText={(text) => updateReceivingItem(item.id, { quantity: text })}
              placeholder="0"
              keyboardType="numeric"
              style={styles.halfInput}
            />
            <Input
              label="Unit Cost (৳)"
              value={item.unitCost}
              onChangeText={(text) => updateReceivingItem(item.id, { unitCost: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
              style={styles.halfInput}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Batch Number"
              value={item.batchNumber}
              onChangeText={(text) => updateReceivingItem(item.id, { batchNumber: text })}
              placeholder="Optional"
              style={styles.halfInput}
            />
            <Input
              label="Expiry Date"
              value={item.expiryDate}
              onChangeText={(text) => updateReceivingItem(item.id, { expiryDate: text })}
              placeholder="YYYY-MM-DD"
              style={styles.halfInput}
            />
          </View>

          {item.quantity && item.unitCost && (
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>
                Total Cost: ৳{(parseInt(item.quantity || '0') * parseFloat(item.unitCost || '0')).toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Theme.colors.warning;
      case 'scanned': return Theme.colors.info;
      case 'completed': return Theme.colors.success;
      default: return Theme.colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stock Receiving</Text>
        <Text style={styles.headerSubtitle}>
          Scan barcodes to receive new stock
        </Text>
      </View>

      {/* Stats */}
      <Card style={styles.statsCard}>
        <CardContent>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalItems}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.scannedItems}</Text>
              <Text style={styles.statLabel}>Scanned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.completedItems}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Receiving Items */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadIntegrationStats} />
        }
      >
        {receivingItems.map((item, index) => renderReceivingItem(item, index))}

        {/* Add Item Button */}
        <TouchableOpacity
          style={styles.addItemButton}
          onPress={addNewReceivingItem}
        >
          <Ionicons name="add" size={24} color={Theme.colors.primary} />
          <Text style={styles.addItemText}>Add Another Item</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Quick Scan Mode"
          variant="outline"
          onPress={() => setShowScanner(true)}
          style={styles.actionButton}
        />
        <Button
          title={loading ? "Processing..." : "Receive Stock"}
          variant="primary"
          onPress={processStockReceiving}
          disabled={loading || receivingItems.every(item => !item.medicine && !item.barcode)}
          style={styles.actionButton}
        />
      </View>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isVisible={showScanner}
        onClose={() => {
          setShowScanner(false);
          setCurrentScanningItemId(null);
        }}
        onScanSuccess={handleBarcodeScanned}
        onScanError={handleBarcodeError}
        title="Scan Medicine for Receiving"
        pharmacyId={pharmacy?.id}
      />
    </View>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
    opacity: 0.9,
  },

  statsCard: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },

  statsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },

  statItem: {
    alignItems: 'center' as const,
  },

  statNumber: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },

  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },

  itemCard: {
    marginBottom: theme.spacing.md,
  },

  itemHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  itemNumber: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  itemActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },

  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },

  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },

  removeButton: {
    padding: theme.spacing.xs,
  },

  medicineSection: {
    marginBottom: theme.spacing.lg,
  },

  fieldLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  medicineInfo: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },

  medicineName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  brandName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    marginBottom: 4,
  },

  barcodeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },

  scanSection: {
    alignItems: 'center' as const,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed' as const,
  },

  scanButton: {
    marginBottom: theme.spacing.sm,
  },

  scanHint: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },

  detailsSection: {
    gap: theme.spacing.md,
  },

  row: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
  },

  halfInput: {
    flex: 1,
  },

  totalSection: {
    alignItems: 'flex-end' as const,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  totalLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
  },

  addItemButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed' as const,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },

  addItemText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },

  actions: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  actionButton: {
    flex: 1,
  },
}));