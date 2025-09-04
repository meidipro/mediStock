import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Sidebar } from '../../components/ui/Sidebar';
import { createThemedStyles } from '../../constants/Theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import PrescriptionScanner, { AnalyzedPrescription, PrescribedMedication } from '../../components/ai/PrescriptionScanner';
import PrescriptionAnalysisView from '../../components/ai/PrescriptionAnalysisView';
import { useMedicines, useStock, useSales } from '../../hooks/useDatabase';
import { SaleItem } from '../../lib/types';

interface PrescriptionRecord {
  id: string;
  prescription: AnalyzedPrescription;
  status: 'analyzed' | 'dispensed' | 'partial';
  createdAt: string;
  totalAmount?: number;
  dispensedMedications?: string[];
}

export default function PrescriptionsScreen() {
  const { t } = useLanguage();
  const { user, pharmacy } = useAuth();
  const { searchMedicines, addMedicine } = useMedicines();
  const { addStock } = useStock();
  const { createSale } = useSales();

  const [showScanner, setShowScanner] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<AnalyzedPrescription | null>(null);
  const [prescriptionHistory, setPrescriptionHistory] = useState<PrescriptionRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleStartScan = useCallback(() => {
    setShowScanner(true);
  }, []);

  const handleCloseScan = useCallback(() => {
    setShowScanner(false);
    setCurrentPrescription(null);
    setShowAnalysis(false);
  }, []);

  const handlePrescriptionAnalyzed = useCallback((prescription: AnalyzedPrescription) => {
    console.log('📋 Prescription analyzed:', prescription);
    setCurrentPrescription(prescription);
    setShowScanner(false);
    setShowAnalysis(true);

    // Add to history
    const prescriptionRecord: PrescriptionRecord = {
      id: prescription.id,
      prescription,
      status: 'analyzed',
      createdAt: new Date().toISOString(),
    };
    
    setPrescriptionHistory(prev => [prescriptionRecord, ...prev]);
  }, []);

  const handleAddToCart = useCallback(async (medications: PrescribedMedication[]) => {
    if (!currentPrescription || !pharmacy) {
      Alert.alert('Error', 'Missing prescription or pharmacy information');
      return;
    }

    try {
      setIsProcessing(true);

      // Process each medication
      const saleItems: SaleItem[] = [];
      let totalAmount = 0;
      const dispensedMedications: string[] = [];

      for (const medication of medications) {
        try {
          // Search for the medicine in inventory
          const searchResults = await searchMedicines(medication.name, pharmacy.id);
          let foundMedicine = searchResults.find(result => 
            result.generic_name.toLowerCase().includes(medication.name.toLowerCase()) ||
            result.generic_name?.toLowerCase().includes(medication.genericName?.toLowerCase() || '')
          );

          if (!foundMedicine) {
            // Medicine not found in inventory, ask if user wants to add it
            const shouldAdd = await new Promise<boolean>((resolve) => {
              Alert.alert(
                'Medicine Not Found',
                `${medication.name} is not in your inventory. Would you like to add it?`,
                [
                  { text: 'Skip', onPress: () => resolve(false) },
                  { text: 'Add Medicine', onPress: () => resolve(true) }
                ]
              );
            });

            if (shouldAdd) {
              // Add new medicine to inventory
              const newMedicine = {
                generic_name: medication.genericName || medication.name,
                brand_name: medication.name,
                manufacturer: 'Unknown',
                strength: medication.dosage,
                form: 'tablet' as const,
                category: 'general',
                pharmacy_id: pharmacy.id,
                is_active: true,
              };

              const addResult = await addMedicine(newMedicine);
              if (addResult.data) {
                foundMedicine = {
                  id: addResult.data.id,
                  generic_name: newMedicine.generic_name,
                  brand_name: newMedicine.brand_name,
                  manufacturer: newMedicine.manufacturer,
                  strength: newMedicine.strength,
                  form: newMedicine.form,
                  category: newMedicine.category,
                  current_stock: 0,
                  unit_price: 0,
                };
              }
            } else {
              continue; // Skip this medication
            }
          }

          if (foundMedicine) {
            // Calculate quantity based on prescription
            const quantity = calculatePrescriptionQuantity(medication);
            const unitPrice = foundMedicine.unit_price || 0;
            const itemTotal = quantity * unitPrice;

            saleItems.push({
              medicine_id: foundMedicine.id,
              medicine_name: foundMedicine.generic_name,
              generic_name: foundMedicine.generic_name,
              brand_name: foundMedicine.brand_name,
              manufacturer: foundMedicine.manufacturer,
              quantity: quantity,
              unit_price: unitPrice,
              total_amount: itemTotal,
              batch_number: foundMedicine.batch_number,
              expiry_date: foundMedicine.expiry_date,
            });

            totalAmount += itemTotal;
            dispensedMedications.push(medication.name);
          }
        } catch (error) {
          console.error(`Error processing ${medication.name}:`, error);
        }
      }

      if (saleItems.length === 0) {
        Alert.alert('No Items', 'No medications were added to the cart');
        return;
      }

      // Create sale record
      const saleData = {
        items: saleItems,
        subtotal: totalAmount,
        total_amount: totalAmount,
        paid_amount: totalAmount, // Assume full payment
        payment_method: 'cash',
        notes: `Prescription from Dr. ${currentPrescription.doctorInfo.name || 'Unknown'} for ${currentPrescription.patientInfo.name || 'Patient'}`,
      };

      const saleResult = await createSale(saleData);
      
      if (saleResult.error) {
        throw new Error(saleResult.error);
      }

      // Update prescription record
      setPrescriptionHistory(prev => 
        prev.map(record => 
          record.id === currentPrescription.id
            ? {
                ...record,
                status: dispensedMedications.length === medications.length ? 'dispensed' : 'partial',
                totalAmount,
                dispensedMedications,
              }
            : record
        )
      );

      Alert.alert(
        'Success',
        `Successfully processed ${saleItems.length} medications. Total: ৳${totalAmount.toFixed(2)}`,
        [
          { text: 'Print Receipt', onPress: () => handlePrintReceipt(saleResult.data) },
          { text: 'Done', onPress: () => setShowAnalysis(false) }
        ]
      );

    } catch (error) {
      console.error('Error adding medications to cart:', error);
      Alert.alert('Error', `Failed to process prescription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [currentPrescription, pharmacy, searchMedicines, addMedicine, createSale]);

  const calculatePrescriptionQuantity = (medication: PrescribedMedication): number => {
    // Simple calculation based on frequency and duration
    // This would be more sophisticated in a real implementation
    const frequencyMap: Record<string, number> = {
      'once daily': 1,
      '1+0+0': 1,
      'twice daily': 2,
      '1+0+1': 2,
      'three times daily': 3,
      '1+1+1': 3,
      'four times daily': 4,
      '1+1+1+1': 4,
    };

    const frequency = frequencyMap[medication.frequency.toLowerCase()] || 2;
    
    // Extract days from duration
    const durationMatch = medication.duration.match(/(\d+)\s*days?/i);
    const days = durationMatch ? parseInt(durationMatch[1]) : 7;

    return Math.ceil(frequency * days);
  };

  const handlePrintReceipt = (saleData: any) => {
    // Implement receipt printing logic
    console.log('Printing receipt for sale:', saleData);
    Alert.alert('Receipt', 'Receipt printing feature will be implemented');
  };

  const handleRetakePrescription = useCallback(() => {
    setShowAnalysis(false);
    setCurrentPrescription(null);
    setShowScanner(true);
  }, []);

  const renderPrescriptionItem = ({ item }: { item: PrescriptionRecord }) => (
    <Card style={styles.prescriptionCard}>
      <CardContent>
        <View style={styles.prescriptionHeader}>
          <View style={styles.prescriptionInfo}>
            <Text style={styles.prescriptionDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.prescriptionPatient}>
              {item.prescription.patientInfo.name || 'Unknown Patient'}
            </Text>
            <Text style={styles.prescriptionDoctor}>
              Dr. {item.prescription.doctorInfo.name || 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.prescriptionStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
            {item.totalAmount && (
              <Text style={styles.prescriptionAmount}>৳{item.totalAmount.toFixed(2)}</Text>
            )}
          </View>
        </View>

        <Text style={styles.medicationCount}>
          {item.prescription.medications.length} medications prescribed
        </Text>

        {item.prescription.warnings.length > 0 && (
          <View style={styles.warningIndicator}>
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FF9500" />
            <Text style={styles.warningText}>{item.prescription.warnings.length} warnings</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => {
            setCurrentPrescription(item.prescription);
            setShowAnalysis(true);
          }}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed': return '#007AFF';
      case 'partial': return '#FF9500';
      case 'dispensed': return '#34C759';
      default: return '#8E8E93';
    }
  };

  if (showScanner) {
    return (
      <PrescriptionScanner
        onPrescriptionAnalyzed={handlePrescriptionAnalyzed}
        onClose={handleCloseScan}
      />
    );
  }

  if (showAnalysis && currentPrescription) {
    return (
      <PrescriptionAnalysisView
        prescription={currentPrescription}
        onAddToCart={handleAddToCart}
        onClose={() => setShowAnalysis(false)}
        onRetake={handleRetakePrescription}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Sidebar */}
      <Sidebar 
        isVisible={sidebarVisible} 
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="prescriptions"
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setSidebarVisible(true)} 
          style={styles.menuButton}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prescription Scanner</Text>
        <TouchableOpacity onPress={() => {}} style={styles.headerButton}>
          <IconSymbol name="gear.fill" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Start Section */}
      <Card style={styles.quickStartCard}>
        <CardContent>
          <View style={styles.quickStartContent}>
            <IconSymbol name="camera.fill" size={48} color="#007AFF" />
            <Text style={styles.quickStartTitle}>AI Prescription Scanner</Text>
            <Text style={styles.quickStartSubtitle}>
              Scan handwritten prescriptions with AI-powered analysis
            </Text>
            
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
                <Text style={styles.featureText}>Doctor handwriting recognition</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
                <Text style={styles.featureText}>Drug interaction alerts</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
                <Text style={styles.featureText}>Dosage verification</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
                <Text style={styles.featureText}>Automatic inventory lookup</Text>
              </View>
            </View>

            <Button
              title="Scan New Prescription"
              onPress={handleStartScan}
              style={styles.scanButton}
              size="lg"
            />
          </View>
        </CardContent>
      </Card>

      {/* Prescription History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Prescriptions</Text>
        
        {prescriptionHistory.length === 0 ? (
          <Card style={styles.emptyCard}>
            <CardContent>
              <Text style={styles.emptyText}>No prescriptions scanned yet</Text>
              <Text style={styles.emptySubtext}>
                Scan your first prescription to get started with AI-powered analysis
              </Text>
            </CardContent>
          </Card>
        ) : (
          <FlatList
            data={prescriptionHistory}
            renderItem={renderPrescriptionItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.historyList}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingTop: 35,
    paddingBottom: theme.spacing.md,
  },
  
  menuButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  menuIcon: {
    fontSize: 18,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },
  
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
    flex: 1,
    textAlign: 'center' as const,
  },
  
  headerButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  quickStartCard: {
    margin: theme.spacing.md,
    backgroundColor: '#F0F9FF',
  },
  
  quickStartContent: {
    alignItems: 'center' as const,
  },
  
  quickStartTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center' as const,
  },
  
  quickStartSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    marginVertical: theme.spacing.md,
  },
  
  featureList: {
    width: '100%' as const,
    marginVertical: theme.spacing.lg,
  },
  
  featureItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  
  featureText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  
  scanButton: {
    marginTop: theme.spacing.md,
    width: '100%' as const,
  },
  
  historySection: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  
  historyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  
  emptyCard: {
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.xl,
  },
  
  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  
  emptySubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
  
  historyList: {
    paddingBottom: theme.spacing.xl,
  },
  
  prescriptionCard: {
    marginBottom: theme.spacing.md,
  },
  
  prescriptionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.sm,
  },
  
  prescriptionInfo: {
    flex: 1,
  },
  
  prescriptionDate: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  
  prescriptionPatient: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  
  prescriptionDoctor: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  
  prescriptionStatus: {
    alignItems: 'flex-end' as const,
  },
  
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: 'white',
    fontWeight: theme.typography.weights.bold as any,
  },
  
  prescriptionAmount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primary,
  },
  
  medicationCount: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  
  warningIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  
  warningText: {
    fontSize: theme.typography.sizes.sm,
    color: '#FF9500',
    marginLeft: theme.spacing.xs,
  },
  
  viewButton: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  
  viewButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: 'white',
    fontWeight: theme.typography.weights.semibold as any,
  },
}));