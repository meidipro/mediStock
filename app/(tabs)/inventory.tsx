import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AIStockInsights } from '../../components/ai/AIStockInsights';
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton';
import { BarcodeScanner } from '../../components/barcode/BarcodeScanner';
import { StockReceivingScreen } from '../../components/purchase/StockReceivingScreen';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { MedicineQuickSearch } from '../../components/ui/MedicineQuickSearch';
import { SearchInput } from '../../components/ui/SearchInput';
import { Sidebar } from '../../components/ui/Sidebar';
import { SmartMedicineInput } from '../../components/ui/SmartMedicineInput';
import { Theme, createThemedStyles, getStockStatusColor } from '../../constants/Theme';
import { useAuth } from '../../contexts/AuthContext';
import { useMedicines, useStock } from '../../hooks/useDatabase';
import { BarcodeLookupResult } from '../../lib/barcode-service';
import { MedicineKnowledgeEntry } from '../../lib/medicine-knowledge-base';
import { supabase } from '../../lib/supabase';
import { Medicine, StockItem } from '../../lib/types';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  data?: Medicine | StockItem;
}

export default function InventoryScreen() {
  const { pharmacy } = useAuth();
  const { stockItems, lowStockItems, loading, lastUpdated, fetchStock, fetchLowStock, addStock, updateStock } = useStock();
  const { searchMedicines } = useMedicines();
  const params = useLocalSearchParams();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStock, setFilteredStock] = useState<StockItem[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showBarcodeSearch, setShowBarcodeSearch] = useState(false);
  const [showStockReceiving, setShowStockReceiving] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  
  const [newStock, setNewStock] = useState({
    medicine_id: '',
    medicine_name: '',
    quantity: '',
    unit_price: '',
    cost_price: '',
    batch_number: '',
    expiry_date: '',
    supplier: '',
    low_stock_threshold: '10',
  });

  useEffect(() => {
    fetchStock();
  }, []);

  // Handle barcode action from dashboard
  useEffect(() => {
    if (params.action === 'barcode') {
      // Small delay to ensure the component is fully mounted
      setTimeout(() => {
        setShowBarcodeSearch(true);
      }, 500);
    }
  }, [params.action]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = stockItems.filter(item => {
        const searchText = searchQuery.toLowerCase();
        const words = searchText.split(' ').filter(word => word.length > 0);
        
        // Check if all words match in any field (enhanced search)
        return words.every(word => 
          item.medicine.generic_name?.toLowerCase().includes(word) ||
          item.medicine.brand_name?.toLowerCase().includes(word) ||
          item.medicine.manufacturer?.toLowerCase().includes(word) ||
          item.medicine.name?.toLowerCase().includes(word) ||
          item.batch_number?.toLowerCase().includes(word) ||
          item.supplier?.toLowerCase().includes(word)
        );
      });
      setFilteredStock(filtered);
    } else {
      setFilteredStock(stockItems);
    }
  }, [searchQuery, stockItems]);

  // Enhanced inventory search with auto-suggestions
  const handleInventorySearch = async (query: string): Promise<SearchResult[]> => {
    try {
      if (!query.trim()) return [];
      
      // Search within existing stock items for real-time suggestions
      const filteredItems = stockItems.filter(item => {
        const searchText = query.toLowerCase();
        const words = searchText.split(' ').filter(word => word.length > 0);
        
        // Check if all words match in any field
        return words.every(word => 
          item.medicine.generic_name?.toLowerCase().includes(word) ||
          item.medicine.brand_name?.toLowerCase().includes(word) ||
          item.medicine.manufacturer?.toLowerCase().includes(word) ||
          item.medicine.name?.toLowerCase().includes(word) ||
          item.batch_number?.toLowerCase().includes(word) ||
          item.supplier?.toLowerCase().includes(word)
        );
      });

      return filteredItems.map(item => ({
        id: item.id,
        title: item.medicine.generic_name || item.medicine.name || 'Unknown Medicine',
        subtitle: item.medicine.brand_name ? 
          `${item.medicine.brand_name} - ${item.medicine.manufacturer || ''}` : 
          item.medicine.manufacturer || '',
        description: `${item.medicine.strength || ''} ${item.medicine.form || ''} • Qty: ${item.quantity} • ৳${item.unit_price}`,
        badge: item.quantity <= item.minimum_stock ? 'Low Stock' : `${item.quantity} units`,
        data: item,
      }));
    } catch (error) {
      console.error('Inventory search error:', error);
      return [];
    }
  };

  const handleSelectFromSearch = (searchResult: SearchResult) => {
    if (searchResult.data) {
      // Check if it's a StockItem (has medicine property) or Medicine
      if ('medicine' in searchResult.data) {
        // It's a StockItem
        const stockItem = searchResult.data as StockItem;
        openUpdateModal(stockItem);
      } else {
        // It's a Medicine from search, show in filtered results
        const medicine = searchResult.data as Medicine;
        setSearchQuery(medicine.generic_name || medicine.name || '');
      }
    }
  };

  const handleMedicineSearch = async (query: string): Promise<SearchResult[]> => {
    try {
      const results = await searchMedicines(query, pharmacy?.id);
      return results.map(medicine => ({
        id: medicine.id,
        title: medicine.generic_name,
        subtitle: medicine.brand_name ? `${medicine.brand_name} - ${medicine.manufacturer || ''}` : medicine.manufacturer || undefined,
        description: `${medicine.strength} ${medicine.form}`,
        badge: medicine.current_stock ? `Stock: ${medicine.current_stock}` : 'No Stock',
        data: medicine,
      }));
    } catch (error) {
      console.error('Medicine search error:', error);
      return [];
    }
  };

  const handleSelectMedicine = (item: SearchResult) => {
    if (item.data && 'generic_name' in item.data) {
      const medicine = item.data as Medicine;
      setNewStock(prev => ({
        ...prev,
        medicine_id: medicine.id,
        medicine_name: `${medicine.generic_name} ${medicine.brand_name ? `(${medicine.brand_name})` : ''}`,
      }));
    }
  };

  const handleSelectSmartMedicine = async (medicine: MedicineKnowledgeEntry) => {
    try {
      console.log('🔍 Searching for existing medicine:', medicine.brand_name);
      
      // First, try to find if this medicine already exists in the database
      const searchResults = await searchMedicines(medicine.brand_name, pharmacy?.id);
      
      let medicineId = '';
      if (searchResults.length > 0) {
        // Medicine found in database, use its ID
        const existingMedicine = searchResults.find(result => 
          result.brand_name?.toLowerCase() === medicine.brand_name.toLowerCase() ||
          result.generic_name?.toLowerCase() === medicine.generic_name.toLowerCase()
        );
        
        if (existingMedicine) {
          console.log('✅ Found existing medicine:', existingMedicine.id);
          medicineId = existingMedicine.id;
        }
      }
      
      // Update the form with the selected medicine data
      setNewStock(prev => ({
        ...prev,
        medicine_id: medicineId, // Will be empty string if not found, triggering creation
        medicine_name: `${medicine.brand_name} (${medicine.generic_name})`,
        unit_price: medicine.price_range.min.toString(),
        cost_price: (medicine.price_range.min * 0.7).toString(), // Assume 30% margin
      }));
      
      console.log('🎯 Medicine selection completed. ID:', medicineId || 'Will create new');
      
    } catch (error) {
      console.error('❌ Error selecting smart medicine:', error);
      // Fallback: clear medicine_id to trigger creation
      setNewStock(prev => ({
        ...prev,
        medicine_id: '',
        medicine_name: `${medicine.brand_name} (${medicine.generic_name})`,
        unit_price: medicine.price_range.min.toString(),
        cost_price: (medicine.price_range.min * 0.7).toString(),
      }));
    }
  };

  const handleCreateNewMedicine = async () => {
    if (!pharmacy?.id || !newStock.medicine_name) return;
    
    try {
      console.log('🆕 Creating new medicine:', newStock.medicine_name);
      
      // First, check if medicine already exists to prevent duplicates
      console.log('🔍 Checking for existing medicine before creating...');
      const searchResults = await searchMedicines(newStock.medicine_name, pharmacy?.id);
      
      if (searchResults.length > 0) {
        const existingMedicine = searchResults.find(result => 
          result.name?.toLowerCase() === newStock.medicine_name.toLowerCase() ||
          result.brand_name?.toLowerCase() === newStock.medicine_name.toLowerCase() ||
          result.generic_name?.toLowerCase() === newStock.medicine_name.toLowerCase()
        );
        
        if (existingMedicine) {
          console.log('✅ Found existing medicine, using it:', existingMedicine.id);
          await handleAddStockWithMedicineId(existingMedicine.id);
          return;
        }
      }
      
      // Parse medicine name to extract brand and generic names
      const medicineNameParts = newStock.medicine_name.match(/^([^(]+)(?:\s*\(([^)]+)\))?/);
      let brandName = newStock.medicine_name;
      let genericName = newStock.medicine_name;
      
      if (medicineNameParts) {
        brandName = medicineNameParts[1].trim();
        if (medicineNameParts[2]) {
          genericName = medicineNameParts[2].trim();
        }
      }
      
      // Create a new medicine record
      const { data: medicineData, error: medicineError } = await supabase
        .from('medicines')
        .insert({
          name: brandName,
          generic_name: genericName,
          brand_name: brandName,
          pharmacy_id: pharmacy.id,
          form: 'Tablet', // Default form
          strength: '1mg', // Default strength
        })
        .select()
        .single();

      if (medicineError) {
        console.error('❌ Medicine creation error:', medicineError);
        Alert.alert('Error', 'Failed to create new medicine: ' + medicineError.message);
        return;
      }

      console.log('✅ New medicine created:', medicineData);
      
      // Update the form with the new medicine ID
      setNewStock(prev => ({
        ...prev,
        medicine_id: medicineData.id,
      }));
      
      // Now proceed with adding stock using the new medicine ID directly
      await handleAddStockWithMedicineId(medicineData.id);
      
    } catch (error) {
      console.error('💥 Exception creating medicine:', error);
      Alert.alert('Error', 'Failed to create new medicine');
    }
  };

  const handleAddStockWithMedicineId = async (medicineId: string) => {
    console.log('📦 Adding stock with medicine ID:', medicineId);
    
    const stockData = {
      medicine_id: medicineId,
      quantity: parseInt(newStock.quantity),
      unit_price: parseFloat(newStock.unit_price),
      cost_price: parseFloat(newStock.cost_price),
      batch_number: newStock.batch_number || undefined,
      expiry_date: newStock.expiry_date || undefined,
      supplier: newStock.supplier || undefined,
      minimum_stock: parseInt(newStock.low_stock_threshold) || 10,
    };

    console.log('📦 Adding stock with data:', stockData);

    try {
      const { error } = await addStock(stockData);
      console.log('📤 AddStock result - error:', error);
      
      if (error) {
        console.error('❌ AddStock error:', error);
        Alert.alert('Error', error);
      } else {
        console.log('✅ Stock added successfully');
        Alert.alert('Success', 'Stock added successfully');
        setShowAddModal(false);
        resetNewStock();
        fetchStock();
      }
    } catch (exception) {
      console.error('💥 Exception in handleAddStockWithMedicineId:', exception);
      Alert.alert('Error', 'An unexpected error occurred while adding stock');
    }
  };

  const handleAddStock = async () => {
    console.log('🔍 handleAddStock called with newStock:', newStock);
    
    // Enhanced validation with specific error messages
    if (!newStock.medicine_id && !newStock.medicine_name) {
      Alert.alert('Error', 'Please select or enter a medicine name');
      return;
    }
    
    // If no medicine_id but we have a name, create a new medicine first
    if (!newStock.medicine_id && newStock.medicine_name) {
      await handleCreateNewMedicine();
      return;
    }
    if (!newStock.quantity) {
      Alert.alert('Error', 'Please enter quantity');
      return;
    }
    if (!newStock.unit_price) {
      Alert.alert('Error', 'Please enter unit price');
      return;
    }
    if (!newStock.cost_price) {
      Alert.alert('Error', 'Please enter cost price');
      return;
    }

    // If we have a medicine_id, proceed with adding stock
    if (newStock.medicine_id) {
      await handleAddStockWithMedicineId(newStock.medicine_id);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedStock || !newStock.quantity || !newStock.unit_price) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    const updates = {
      quantity: parseInt(newStock.quantity),
      unit_price: parseFloat(newStock.unit_price),
      cost_price: parseFloat(newStock.cost_price),
      batch_number: newStock.batch_number || selectedStock.batch_number,
      expiry_date: newStock.expiry_date || selectedStock.expiry_date,
      supplier: newStock.supplier || selectedStock.supplier,
      minimum_stock: parseInt(newStock.low_stock_threshold) || selectedStock.minimum_stock,
    };

    const { error } = await updateStock(selectedStock.id, updates);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Success', 'Stock updated successfully');
      setShowUpdateModal(false);
      setSelectedStock(null);
      resetNewStock();
      fetchStock();
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!pharmacy?.id) return;

    Alert.alert(
      'Clean Up Duplicate Medicines',
      'This will remove medicines that have no stock entries (created due to app bugs). This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Up',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCleaningUp(true);
              console.log('🧹 Starting cleanup of duplicate medicines...');

              // Delete medicines that have no stock entries
              const { data, error } = await supabase.rpc('cleanup_duplicate_medicines', {
                pharmacy_id_param: pharmacy.id
              });

              if (error) {
                console.error('❌ Cleanup error:', error);
                Alert.alert('Error', 'Failed to cleanup duplicates: ' + error.message);
              } else {
                console.log('✅ Cleanup successful:', data);
                Alert.alert(
                  'Success',
                  `Cleaned up duplicate medicines. Removed ${data || 0} medicines without stock.`
                );
                // Refresh data
                fetchStock();
                fetchLowStock();
              }
            } catch (error) {
              console.error('💥 Cleanup exception:', error);
              Alert.alert('Error', 'An error occurred during cleanup');
            } finally {
              setIsCleaningUp(false);
            }
          }
        }
      ]
    );
  };

  const resetNewStock = () => {
    setNewStock({
      medicine_id: '',
      medicine_name: '',
      quantity: '',
      unit_price: '',
      cost_price: '',
      batch_number: '',
      expiry_date: '',
      supplier: '',
      low_stock_threshold: '10',
    });
  };

  const openUpdateModal = (stock: StockItem) => {
    setSelectedStock(stock);
    setNewStock({
      medicine_id: stock.medicine_id,
      medicine_name: `${stock.medicine.generic_name} ${stock.medicine.brand_name ? `(${stock.medicine.brand_name})` : ''}`,
      quantity: stock.quantity.toString(),
      unit_price: stock.unit_price.toString(),
      cost_price: stock.cost_price.toString(),
      batch_number: stock.batch_number || '',
      expiry_date: stock.expiry_date || '',
      supplier: stock.supplier || '',
      low_stock_threshold: stock.minimum_stock.toString(),
    });
    setShowUpdateModal(true);
  };

  const renderStockItem = ({ item }: { item: StockItem }) => {
    const stockColor = getStockStatusColor(item.quantity, item.minimum_stock);
    const isExpiringSoon = item.expiry_date && 
      new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return (
      <Card style={styles.stockItem} onPress={() => openUpdateModal(item)}>
        <CardContent>
          <View style={styles.stockHeader}>
            {/* Medicine Image */}
            <View style={styles.medicineImageContainer}>
              <View style={styles.medicineImagePlaceholder}>
                <Text style={styles.medicineImageText}>
                  {item.medicine.generic_name?.charAt(0).toUpperCase() || 'M'}
                </Text>
              </View>
            </View>

            <View style={styles.stockInfo}>
              <Text style={styles.medicineName} numberOfLines={1}>
                {item.medicine.generic_name}
              </Text>
              {item.medicine.brand_name && (
                <Text style={styles.brandName} numberOfLines={1}>
                  {item.medicine.brand_name} - {item.medicine.manufacturer}
                </Text>
              )}
              <Text style={styles.medicineDetails}>
                {item.medicine.strength} {item.medicine.form}
              </Text>
            </View>
            <View style={styles.stockActions}>
              <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
                <Text style={[styles.stockBadgeText, { color: stockColor }]}>
                  {item.quantity}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.stockDetails}>
            <View style={styles.stockDetailRow}>
              <Text style={styles.detailLabel}>Unit Price:</Text>
              <Text style={styles.detailValue}>৳{item.unit_price}</Text>
            </View>
            <View style={styles.stockDetailRow}>
              <Text style={styles.detailLabel}>Total Value:</Text>
              <Text style={styles.detailValue}>৳{(item.quantity * item.unit_price).toFixed(2)}</Text>
            </View>
            {item.batch_number && (
              <View style={styles.stockDetailRow}>
                <Text style={styles.detailLabel}>Batch:</Text>
                <Text style={styles.detailValue}>{item.batch_number}</Text>
              </View>
            )}
            {item.expiry_date && (
              <View style={styles.stockDetailRow}>
                <Text style={styles.detailLabel}>Expiry:</Text>
                <Text style={[
                  styles.detailValue,
                  isExpiringSoon && { color: Theme.colors.error }
                ]}>
                  {new Date(item.expiry_date).toLocaleDateString()}
                  {isExpiringSoon && ' ⚠️'}
                </Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderAddStockModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add New Stock</Text>
          <TouchableOpacity onPress={() => { setShowAddModal(false); resetNewStock(); }}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.sectionTitle}>Select Medicine</Text>
          <SmartMedicineInput
            placeholder="Start typing medicine name (brand, generic, or manufacturer)..."
            value={newStock.medicine_name}
            onSelect={handleSelectSmartMedicine}
            onTextChange={(text) => setNewStock(prev => ({ ...prev, medicine_name: text }))}
            showAlternatives={true}
            showDetails={true}
            label="Medicine"
          />
          
          <TouchableOpacity
            style={styles.quickSearchButton}
            onPress={() => setShowQuickSearch(true)}
          >
            <Text style={styles.quickSearchButtonText}>🔍 Quick Search & Browse</Text>
          </TouchableOpacity>
          
          <Text style={styles.sectionTitle}>Stock Details</Text>
          <Input
            label="Quantity"
            value={newStock.quantity}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, quantity: text }))}
            placeholder="Enter quantity"
            keyboardType="numeric"
            required
          />
          
          <Input
            label="Unit Price (৳)"
            value={newStock.unit_price}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, unit_price: text }))}
            placeholder="Enter unit price"
            keyboardType="decimal-pad"
            required
          />
          
          <Input
            label="Cost Price (৳)"
            value={newStock.cost_price}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, cost_price: text }))}
            placeholder="Enter cost price"
            keyboardType="decimal-pad"
            required
          />
          
          <Input
            label="Batch Number"
            value={newStock.batch_number}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, batch_number: text }))}
            placeholder="Enter batch number"
          />
          
          <Input
            label="Expiry Date"
            value={newStock.expiry_date}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, expiry_date: text }))}
            placeholder="YYYY-MM-DD"
          />
          
          <Input
            label="Supplier"
            value={newStock.supplier}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, supplier: text }))}
            placeholder="Enter supplier name"
          />
          
          <Input
            label="Low Stock Threshold"
            value={newStock.low_stock_threshold}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, low_stock_threshold: text }))}
            placeholder="10"
            keyboardType="numeric"
          />
          
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => { setShowAddModal(false); resetNewStock(); }}
              style={styles.modalButton}
            />
            <Button
              title="Add Stock"
              variant="primary"
              onPress={handleAddStock}
              style={styles.modalButton}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderUpdateStockModal = () => (
    <Modal
      visible={showUpdateModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Update Stock</Text>
          <TouchableOpacity onPress={() => { setShowUpdateModal(false); setSelectedStock(null); resetNewStock(); }}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.sectionTitle}>Medicine</Text>
          <Text style={styles.selectedMedicine}>{newStock.medicine_name}</Text>
          
          <Text style={styles.sectionTitle}>Update Stock Details</Text>
          <Input
            label="Quantity"
            value={newStock.quantity}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, quantity: text }))}
            placeholder="Enter quantity"
            keyboardType="numeric"
            required
          />
          
          <Input
            label="Unit Price (৳)"
            value={newStock.unit_price}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, unit_price: text }))}
            placeholder="Enter unit price"
            keyboardType="decimal-pad"
            required
          />
          
          <Input
            label="Cost Price (৳)"
            value={newStock.cost_price}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, cost_price: text }))}
            placeholder="Enter cost price"
            keyboardType="decimal-pad"
            required
          />
          
          <Input
            label="Batch Number"
            value={newStock.batch_number}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, batch_number: text }))}
            placeholder="Enter batch number"
          />
          
          <Input
            label="Expiry Date"
            value={newStock.expiry_date}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, expiry_date: text }))}
            placeholder="YYYY-MM-DD"
          />
          
          <Input
            label="Supplier"
            value={newStock.supplier}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, supplier: text }))}
            placeholder="Enter supplier name"
          />
          
          <Input
            label="Low Stock Threshold"
            value={newStock.low_stock_threshold}
            onChangeText={(text) => setNewStock(prev => ({ ...prev, low_stock_threshold: text }))}
            placeholder="10"
            keyboardType="numeric"
          />
          
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => { setShowUpdateModal(false); setSelectedStock(null); resetNewStock(); }}
              style={styles.modalButton}
            />
            <Button
              title="Update Stock"
              variant="primary"
              onPress={handleUpdateStock}
              style={styles.modalButton}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // Barcode scanning handlers
  const handleBarcodeScanned = async (result: BarcodeLookupResult) => {
    console.log('📱 Barcode scanned in inventory:', result);
    
    if (result.found && result.medicine) {
      // Exact medicine found
      const medicine = result.medicine;
      Alert.alert(
        '🎯 Medicine Found!',
        `Found: ${medicine.generic_name || medicine.name}\nBrand: ${medicine.brand_name || 'N/A'}`,
        [
          {
            text: 'Add to Stock',
            onPress: () => {
              setNewStock(prev => ({
                ...prev,
                medicine_id: medicine.id,
                medicine_name: medicine.generic_name || medicine.name || '',
              }));
              setShowAddModal(true);
            }
          },
          {
            text: 'View Current Stock',
            onPress: () => {
              // Find and highlight the medicine in current stock
              const stockItem = stockItems.find(item => 
                item.medicine_id === medicine.id
              );
              if (stockItem) {
                setSelectedStock(stockItem);
                setShowUpdateModal(true);
              } else {
                Alert.alert('Info', 'This medicine is not currently in stock. Would you like to add it?', [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Add Stock', 
                    onPress: () => {
                      setNewStock(prev => ({
                        ...prev,
                        medicine_id: medicine.id,
                        medicine_name: medicine.generic_name || medicine.name || '',
                      }));
                      setShowAddModal(true);
                    }
                  }
                ]);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else if (result.suggestions.length > 0) {
      // Show suggestions
      Alert.alert(
        '🔍 Similar Medicines Found',
        `Found ${result.suggestions.length} similar medicines. Select one from the search results.`,
        [{ text: 'OK' }]
      );
      // Update search query to show suggestions
      setSearchQuery(result.suggestions[0].generic_name || result.suggestions[0].name || '');
    } else {
      // No results found
      Alert.alert(
        '❌ Medicine Not Found',
        result.error || 'No medicine found for this barcode. You can add it as a new medicine.',
        [
          {
            text: 'Add New Medicine',
            onPress: () => {
              setNewStock(prev => ({
                ...prev,
                medicine_name: '', // Let user enter name manually
              }));
              setShowAddModal(true);
            }
          },
          { text: 'OK' }
        ]
      );
    }
  };

  const handleBarcodeError = (error: string) => {
    Alert.alert('Barcode Scan Error', error);
  };

  const handleQuickBarcodeStock = () => {
    setShowBarcodeSearch(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Sidebar */}
      <Sidebar 
        isVisible={sidebarVisible} 
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="inventory"
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => setSidebarVisible(true)} 
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Inventory Management</Text>
            <Text style={styles.headerSubtitle}>
              {filteredStock.length} items • {lowStockItems.length} low stock alerts
            </Text>
            {lastUpdated && (
              <Text style={styles.lastUpdatedText}>
                🔄 Last updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchStock} />
        }
      >
        {/* Search and Actions Section */}
        <View style={styles.searchSection}>
          <SearchInput
            placeholder="Search inventory (medicine name, brand, manufacturer)..."
            onSearch={handleInventorySearch}
            onSelect={handleSelectFromSearch}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearOnSelect={false}
            debounceMs={300}
            minQueryLength={1}
            maxResults={10}
          />
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                !showAIInsights && styles.activeToggleButton
              ]}
              onPress={() => setShowAIInsights(false)}
            >
              <Text style={[
                styles.toggleButtonText,
                !showAIInsights && styles.activeToggleText
              ]}>
                📦 Inventory
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                showAIInsights && styles.activeToggleButton
              ]}
              onPress={() => setShowAIInsights(true)}
            >
              <Text style={[
                styles.toggleButtonText,
                showAIInsights && styles.activeToggleText
              ]}>
                🤖 AI Insights
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionButtonsContainer}>
            <Button
              title="Add New Stock"
              variant="primary"
              onPress={() => setShowAddModal(true)}
              style={styles.addButton}
            />
            
            <BarcodeScanButton
              onScanSuccess={handleBarcodeScanned}
              onScanError={handleBarcodeError}
              pharmacyId={pharmacy?.id}
              title="Scan Medicine Barcode"
              buttonText="📱 Scan Barcode"
              variant="outline"
              size="md"
              style={styles.barcodeButton}
            />
            
            <Button
              title="📦 Receive Stock"
              variant="secondary"
              onPress={() => setShowStockReceiving(true)}
              style={styles.receiveButton}
            />
            
            {lowStockItems.length > 50 && (
              <Button
                title={isCleaningUp ? "Cleaning..." : "Clean Up Duplicates"}
                variant="outline"
                onPress={handleCleanupDuplicates}
                style={styles.cleanupButton}
                disabled={isCleaningUp}
              />
            )}
          </View>
        </View>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Card style={styles.alertCard} variant="outlined">
            <CardHeader>
              <Text style={styles.alertTitle}>⚠️ Low Stock Alerts ({lowStockItems.length})</Text>
            </CardHeader>
            <CardContent>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {lowStockItems.map((item, index) => (
                  <View key={index} style={styles.lowStockChip}>
                    <Text style={styles.lowStockText} numberOfLines={1}>
                      {item.generic_name}
                    </Text>
                    <Text style={styles.lowStockQuantity}>
                      {item.current_quantity} left
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </CardContent>
          </Card>
        )}

        {/* Content Area */}
        {showAIInsights ? (
          <AIStockInsights
            stockItems={filteredStock}
            onReorderRecommendation={(medicine, prediction) => {
              Alert.alert(
                '🤖 AI Reorder Recommendation',
                `AI suggests ordering ${prediction.prediction.optimalOrderQuantity} units of ${medicine.generic_name}.\nPredicted demand: ${prediction.prediction.nextWeekDemand} units next week.`,
                [
                  { text: 'Later', style: 'cancel' },
                  { text: 'Create Order', onPress: () => {
                    // Here you could integrate with a supplier ordering system
                    Alert.alert('Order Created', 'Reorder request has been noted.');
                  }}
                ]
              );
            }}
          />
        ) : (
          <View style={styles.medicineListContainer}>
            {filteredStock.map((item) => renderStockItem({ item }))}
            {filteredStock.length === 0 && (
              <Card style={styles.emptyCard}>
                <CardContent>
                  <Text style={styles.emptyText}>No stock items found</Text>
                  <Text style={styles.emptySubtext}>
                    Add some medicines to your inventory to get started
                  </Text>
                </CardContent>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {renderAddStockModal()}
      {renderUpdateStockModal()}
      
      {/* Smart Medicine Quick Search */}
      <MedicineQuickSearch
        visible={showQuickSearch}
        onClose={() => setShowQuickSearch(false)}
        onSelect={(medicine) => {
          handleSelectSmartMedicine(medicine);
          setShowQuickSearch(false);
        }}
        title="Smart Medicine Search"
        showCategories={true}
      />

      {/* Stock Receiving Screen */}
      {showStockReceiving && (
        <Modal
          visible={showStockReceiving}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <StockReceivingScreen
            onComplete={() => {
              setShowStockReceiving(false);
              fetchStock(); // Refresh stock after receiving
            }}
          />
          <View style={styles.closeReceivingContainer}>
            <TouchableOpacity
              style={styles.closeReceivingButton}
              onPress={() => setShowStockReceiving(false)}
            >
              <Text style={styles.closeReceivingText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Direct Barcode Scanner - Triggered from Dashboard */}
      <BarcodeScanner
        isVisible={showBarcodeSearch}
        onClose={() => setShowBarcodeSearch(false)}
        onScanSuccess={handleBarcodeScanned}
        onScanError={handleBarcodeError}
        title="Scan Medicine Barcode"
        pharmacyId={pharmacy?.id}
      />
    </View>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 35,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },

  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  menuButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  menuIcon: {
    fontSize: 18,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    opacity: 0.9,
  },

  lastUpdatedText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.background,
    opacity: 0.7,
    marginTop: 2,
  },

  content: {
    flex: 1,
  },

  scrollContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },

  searchSection: {
    marginBottom: theme.spacing.lg,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },

  viewToggleButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.background,
  },

  activeToggleButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  toggleButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.textSecondary,
  },

  activeToggleText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
  },

  actionButtonsContainer: {
    flexDirection: 'column' as const,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },

  addButton: {
    width: '100%' as const,
  },

  barcodeButton: {
    width: '100%' as const,
  },

  receiveButton: {
    width: '100%' as const,
  },

  closeReceivingContainer: {
    position: 'absolute' as const,
    top: 50,
    right: 20,
    zIndex: 1000,
  },

  closeReceivingButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  closeReceivingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  },

  cleanupButton: {
    width: '100%' as const,
  },

  alertCard: {
    marginBottom: theme.spacing.lg,
    borderColor: theme.colors.warning,
  },

  alertTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.warning,
  },

  lowStockChip: {
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    minWidth: 120,
  },

  lowStockText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.warning,
  },

  lowStockQuantity: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.warning,
    marginTop: 2,
  },

  listContainer: {
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },

  medicineListContainer: {
    flex: 1,
  },

  stockItem: {
    marginBottom: theme.spacing.md,
  },

  stockHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.md,
  },
  medicineImageContainer: {
    marginRight: theme.spacing.sm,
  },
  medicineImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: theme.colors.primary + '40',
  },
  medicineImageText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primary,
  },

  stockInfo: {
    flex: 1,
  },

  medicineName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },

  brandName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },

  medicineDetails: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
  },

  stockActions: {
    marginLeft: theme.spacing.md,
  },

  stockBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
    minWidth: 60,
  },

  stockBadgeText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
  },

  stockDetails: {
    gap: theme.spacing.xs,
  },

  stockDetailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  detailLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  detailValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
  },

  emptyCard: {
    marginTop: theme.spacing.xl,
  },

  emptyText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  emptySubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },

  modalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },

  closeButton: {
    fontSize: 24,
    color: theme.colors.background,
    padding: theme.spacing.xs,
  },

  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },

  selectedMedicine: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.backgroundTertiary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },

  modalActions: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },

  modalButton: {
    flex: 1,
  },

  quickSearchButton: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.lg,
  },

  quickSearchButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium as any,
  },
}));