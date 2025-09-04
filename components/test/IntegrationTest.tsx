import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { purchaseInventoryIntegration } from '../../lib/purchase-inventory-integration';
import { barcodeService } from '../../lib/barcode-service';
import { useAuth } from '../../contexts/AuthContext';
import { Theme, createThemedStyles } from '../../constants/Theme';

export const IntegrationTest: React.FC = () => {
  const { user, pharmacy } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testBarcode, setTestBarcode] = useState('8944000080081'); // Default test barcode
  const [loading, setLoading] = useState(false);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Barcode Service Integration
  const testBarcodeService = async () => {
    setLoading(true);
    addTestResult('🧪 Testing Barcode Service...');
    
    try {
      if (!pharmacy?.id) {
        addTestResult('❌ No pharmacy found');
        return;
      }

      // Test barcode lookup
      const result = await barcodeService.lookupMedicineByBarcode(testBarcode, pharmacy.id);
      addTestResult(`🔍 Barcode lookup: ${result.found ? 'FOUND' : 'NOT FOUND'}`);
      
      if (result.found && result.medicine) {
        addTestResult(`✅ Medicine: ${result.medicine.generic_name || result.medicine.name}`);
      } else if (result.suggestions.length > 0) {
        addTestResult(`💡 Suggestions: ${result.suggestions.length} found`);
      } else {
        addTestResult(`ℹ️ Error: ${result.error || 'No suggestions'}`);
      }

      // Test barcode stats
      const stats = await barcodeService.getBarcodeStats(pharmacy.id);
      addTestResult(`📊 Barcode Stats: ${stats.totalWithBarcodes}/${stats.totalWithBarcodes + stats.totalWithoutBarcodes} medicines have barcodes`);

    } catch (error) {
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Purchase Integration Service
  const testPurchaseIntegration = async () => {
    setLoading(true);
    addTestResult('🧪 Testing Purchase Integration...');
    
    try {
      if (!pharmacy?.id) {
        addTestResult('❌ No pharmacy found');
        return;
      }

      // Test barcode scan handling
      const scanResult = await purchaseInventoryIntegration.handlePurchaseReceivingBarcodeScan(
        testBarcode,
        pharmacy.id
      );
      
      addTestResult(`📱 Barcode scan result: ${scanResult.action.toUpperCase()}`);
      addTestResult(`💬 Message: ${scanResult.message}`);

      // Test purchase recommendations
      const recommendations = await purchaseInventoryIntegration.getPurchaseRecommendations(pharmacy.id);
      addTestResult(`🛒 Purchase recommendations: ${recommendations.lowStock.length} low stock items`);

      // Test integration stats
      const integrationStats = await purchaseInventoryIntegration.getIntegrationStats(pharmacy.id);
      addTestResult(`📈 Integration stats: ${integrationStats.totalMedicinesWithBarcodes} medicines with barcodes, ${integrationStats.lowStockItems} low stock`);

    } catch (error) {
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Quick Stock Addition
  const testQuickStockAdd = async () => {
    setLoading(true);
    addTestResult('🧪 Testing Quick Stock Addition...');
    
    try {
      if (!pharmacy?.id || !user?.id) {
        addTestResult('❌ No pharmacy or user found');
        return;
      }

      const result = await purchaseInventoryIntegration.quickAddStockFromBarcode(
        testBarcode,
        5, // quantity
        15.50, // unit cost
        pharmacy.id,
        user.id,
        'Test Supplier'
      );

      if (result.success) {
        addTestResult(`✅ Quick add successful: ${result.medicine?.generic_name || 'Unknown medicine'}`);
      } else {
        addTestResult(`❌ Quick add failed: ${result.error}`);
      }

    } catch (error) {
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 4: Stock Receiving Simulation
  const testStockReceiving = async () => {
    setLoading(true);
    addTestResult('🧪 Testing Stock Receiving...');
    
    try {
      if (!pharmacy?.id || !user?.id) {
        addTestResult('❌ No pharmacy or user found');
        return;
      }

      // First, try to find a medicine to receive
      const barcodeResult = await barcodeService.lookupMedicineByBarcode(testBarcode, pharmacy.id);
      
      if (!barcodeResult.found || !barcodeResult.medicine) {
        addTestResult('⚠️ No medicine found for barcode - cannot test receiving');
        return;
      }

      const receivingData = {
        purchase_order_id: 'test-order',
        received_items: [{
          medicine_id: barcodeResult.medicine.id,
          barcode_scanned: testBarcode,
          quantity_received: 10,
          unit_cost: 20.00,
          batch_number: `TEST-${Date.now()}`,
          expiry_date: '2025-12-31'
        }],
        received_by: user.id,
        received_at: new Date().toISOString()
      };

      const result = await purchaseInventoryIntegration.receiveStockFromPurchase(
        receivingData,
        pharmacy.id
      );

      if (result.success) {
        addTestResult(`✅ Stock receiving successful: ${result.updatedItems} items processed`);
      } else {
        addTestResult(`❌ Stock receiving failed: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    clearResults();
    addTestResult('🚀 Starting Integration Tests...');
    
    await testBarcodeService();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    await testPurchaseIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testQuickStockAdd();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testStockReceiving();
    
    addTestResult('🏁 All tests completed!');
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <CardHeader>
          <Text style={styles.title}>🧪 Integration Testing</Text>
          <Text style={styles.subtitle}>Test purchase-inventory-barcode integration</Text>
        </CardHeader>
        <CardContent>
          <Input
            label="Test Barcode"
            value={testBarcode}
            onChangeText={setTestBarcode}
            placeholder="Enter barcode to test"
            style={styles.input}
          />
        </CardContent>
      </Card>

      <Card style={styles.testCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Individual Tests</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.buttonGrid}>
            <Button
              title="Test Barcode Service"
              variant="outline"
              onPress={testBarcodeService}
              disabled={loading}
              style={styles.testButton}
            />
            <Button
              title="Test Purchase Integration"
              variant="outline"
              onPress={testPurchaseIntegration}
              disabled={loading}
              style={styles.testButton}
            />
            <Button
              title="Test Quick Stock Add"
              variant="outline"
              onPress={testQuickStockAdd}
              disabled={loading}
              style={styles.testButton}
            />
            <Button
              title="Test Stock Receiving"
              variant="outline"
              onPress={testStockReceiving}
              disabled={loading}
              style={styles.testButton}
            />
          </View>
          
          <View style={styles.mainActions}>
            <Button
              title={loading ? "Running Tests..." : "🚀 Run All Tests"}
              variant="primary"
              onPress={runAllTests}
              disabled={loading}
              style={styles.runAllButton}
            />
            <Button
              title="Clear Results"
              variant="secondary"
              onPress={clearResults}
              style={styles.clearButton}
            />
          </View>
        </CardContent>
      </Card>

      <Card style={styles.resultsCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <Text style={styles.resultCount}>{testResults.length} results</Text>
        </CardHeader>
        <CardContent>
          <ScrollView style={styles.resultsContainer}>
            {testResults.length === 0 ? (
              <Text style={styles.noResults}>No test results yet. Run some tests!</Text>
            ) : (
              testResults.map((result, index) => (
                <View key={index} style={styles.resultItem}>
                  <Text style={styles.resultText}>{result}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </CardContent>
      </Card>
    </ScrollView>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  headerCard: {
    marginBottom: theme.spacing.md,
  },

  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },

  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },

  input: {
    marginTop: theme.spacing.sm,
  },

  testCard: {
    marginBottom: theme.spacing.md,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  buttonGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },

  testButton: {
    flex: 1,
    minWidth: '45%',
  },

  mainActions: {
    gap: theme.spacing.sm,
  },

  runAllButton: {
    // Full width handled by Button component
  },

  clearButton: {
    // Full width handled by Button component
  },

  resultsCard: {
    marginBottom: theme.spacing.xl,
  },

  resultCount: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  resultsContainer: {
    maxHeight: 400,
  },

  noResults: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
    padding: theme.spacing.lg,
  },

  resultItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },

  resultText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
}));