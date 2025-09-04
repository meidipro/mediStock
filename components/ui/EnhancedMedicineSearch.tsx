import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMedicines } from '../../hooks/useDatabase';
import { useAuth } from '../../contexts/AuthContext';
import { barcodeService, BarcodeLookupResult } from '../../lib/barcode-service';
import { BarcodeScanButton } from '../barcode/BarcodeScanButton';
import { Medicine, MedicineSearchResult } from '../../lib/types';
import { MedicineKnowledgeService } from '../../lib/medicine-knowledge-base';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface EnhancedMedicineSearchProps {
  onMedicineSelect: (medicine: Medicine | MedicineSearchResult) => void;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  style?: any;
  showBarcodeScanner?: boolean;
  showCreateNew?: boolean;
  autoFocus?: boolean;
  showKnowledgeBase?: boolean;
}

export const EnhancedMedicineSearch: React.FC<EnhancedMedicineSearchProps> = ({
  onMedicineSelect,
  placeholder = 'Search medicines or scan barcode...',
  value,
  onValueChange,
  style,
  showBarcodeScanner = true,
  showCreateNew = true,
  autoFocus = false,
  showKnowledgeBase = true,
}) => {
  const router = useRouter();
  const { pharmacy } = useAuth();
  const { searchMedicines, searchMedicinesByBarcode } = useMedicines();
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<MedicineSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Handle controlled vs uncontrolled input
  const currentValue = value !== undefined ? value : searchQuery;
  const handleValueChange = useCallback((text: string) => {
    if (onValueChange) {
      onValueChange(text);
    } else {
      setSearchQuery(text);
    }
  }, [onValueChange]);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Searching for:', query);
      
      // Search in local database first
      const localResults = await searchMedicines(query, pharmacy?.id);
      console.log('📋 Local search results:', localResults.length);
      
      // If knowledge base is enabled, also search there
      let combinedResults = [...localResults];
      if (showKnowledgeBase) {
        const knowledgeResults = MedicineKnowledgeService.getSmartSuggestions(query, 5);
        console.log('📚 Knowledge base results:', knowledgeResults.length);
        
        // Convert knowledge base entries to search results format
        const transformedKnowledgeResults = knowledgeResults.map(entry => ({
          id: entry.id,
          name: entry.brand_name,
          generic_name: entry.generic_name,
          brand_name: entry.brand_name,
          manufacturer: entry.manufacturer,
          strength: entry.strength,
          form: entry.form,
          current_stock: 0, // Knowledge base doesn't have stock info
          unit_price: entry.price_range.min || 0,
          match_type: 'knowledge_base' as const,
          rank: 2, // Lower priority than local stock
          knowledge_entry: entry, // Store full entry for detail navigation
        }));
        
        combinedResults = [...localResults, ...transformedKnowledgeResults];
      }
      
      setSuggestions(combinedResults.slice(0, 8)); // Limit to 8 results
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [searchMedicines, pharmacy?.id, showKnowledgeBase]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (currentValue && showSuggestions) {
        performSearch(currentValue);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [currentValue, performSearch, showSuggestions]);

  const handleInputChange = (text: string) => {
    handleValueChange(text);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
    if (currentValue) {
      performSearch(currentValue);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow selection
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleMedicineSelection = useCallback((medicine: Medicine | MedicineSearchResult) => {
    console.log('🎯 Medicine selected:', medicine.generic_name || medicine.name);
    handleValueChange(medicine.generic_name || medicine.name || '');
    setShowSuggestions(false);
    onMedicineSelect(medicine);
    inputRef.current?.blur();
  }, [handleValueChange, onMedicineSelect]);

  const handleBarcodeScanned = useCallback(async (result: BarcodeLookupResult) => {
    console.log('📱 Barcode scan result received:', result);
    
    if (result.found && result.medicine) {
      // Exact match found
      handleMedicineSelection(result.medicine);
      
      // Show success feedback with more details
      const stockInfo = result.medicine.current_stock 
        ? `Stock: ${result.medicine.current_stock}` 
        : 'Stock info unavailable';
      
      Alert.alert(
        '✅ Medicine Found!',
        `${result.medicine.generic_name || result.medicine.name}\n${stockInfo}`,
        [{ text: 'OK' }]
      );
    } else if (result.suggestions.length > 0) {
      // Show suggestions with enhanced display
      const transformedSuggestions = result.suggestions.map(medicine => ({
        ...medicine,
        current_stock: medicine.current_stock || 0,
        unit_price: medicine.unit_price || 0,
        match_type: 'suggestion',
        rank: 1
      }));
      
      setSuggestions(transformedSuggestions);
      setShowSuggestions(true);
      Alert.alert(
        '🔍 Similar Medicines Found',
        `Found ${result.suggestions.length} similar medicines. Select from the list below.`,
        [{ text: 'OK' }]
      );
    } else {
      // No results - offer to create new medicine
      Alert.alert(
        '❌ No Medicine Found',
        result.error || 'No medicine found for this barcode. Would you like to add it as a new medicine?',
        [
          {
            text: 'Add New Medicine',
            onPress: () => {
              if (showCreateNew) {
                // Navigate to add medicine screen with barcode pre-filled
                console.log('Navigate to add medicine screen with barcode');
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  }, [handleMedicineSelection, showCreateNew]);

  const handleBarcodeError = useCallback((error: string) => {
    Alert.alert('Barcode Scan Error', error);
  }, []);

  const handleCreateNew = () => {
    // Implement navigation to create new medicine
    console.log('Create new medicine with query:', currentValue);
    Alert.alert(
      'Add New Medicine',
      `Would you like to add "${currentValue}" as a new medicine?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add', 
          onPress: () => {
            // Navigate to add medicine screen with pre-filled name
            console.log('Navigate to add medicine screen with:', currentValue);
          }
        }
      ]
    );
  };

  const clearSearch = () => {
    handleValueChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.container, style]}>
      {/* Search Input with Barcode Button */}
      <View style={styles.inputContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons 
            name="search" 
            size={20} 
            color={Theme.colors.textSecondary} 
            style={styles.searchIcon}
          />
          
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={currentValue}
            onChangeText={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            placeholderTextColor={Theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={autoFocus}
          />

          {currentValue.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {showBarcodeScanner && (
          <BarcodeScanButton
            onScanSuccess={handleBarcodeScanned}
            onScanError={handleBarcodeError}
            pharmacyId={pharmacy?.id}
            variant="icon"
            size="md"
            style={styles.barcodeButton}
          />
        )}
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || currentValue.length > 0) && (
        <View style={styles.suggestionsContainer}>
          <ScrollView 
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {suggestions.map((medicine, index) => (
              <TouchableOpacity
                key={medicine.id || index}
                style={styles.suggestionItem}
                onPress={() => handleMedicineSelection(medicine)}
              >
                <View style={styles.suggestionContent}>
                  <View style={styles.suggestionHeader}>
                    <View style={styles.suggestionMainInfo}>
                      <Text style={styles.suggestionName}>
                        {medicine.generic_name || medicine.name}
                      </Text>
                      {medicine.brand_name && (
                        <Text style={styles.suggestionBrand}>
                          Brand: {medicine.brand_name}
                        </Text>
                      )}
                    </View>
                    {/* Knowledge base indicator and detail button */}
                    {(medicine as any).knowledge_entry && (
                      <TouchableOpacity
                        style={styles.detailButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push({
                            pathname: '/medicine-detail',
                            params: { medicineId: (medicine as any).knowledge_entry.id },
                          });
                        }}
                      >
                        <Ionicons name="information-circle-outline" size={16} color={Theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.suggestionDetails}>
                    {medicine.manufacturer && (
                      <Text style={styles.suggestionDetail}>
                        {medicine.manufacturer}
                      </Text>
                    )}
                    {medicine.strength && (
                      <Text style={styles.suggestionDetail}>
                        • {medicine.strength}
                      </Text>
                    )}
                    {medicine.form && (
                      <Text style={styles.suggestionDetail}>
                        • {medicine.form}
                      </Text>
                    )}
                  </View>
                  
                  {/* Stock and Price Information */}
                  <View style={styles.stockPriceInfo}>
                    {medicine.current_stock !== undefined && (
                      <View style={styles.stockBadge}>
                        <Text style={[
                          styles.stockText,
                          { color: medicine.current_stock > 0 ? Theme.colors.success : Theme.colors.error }
                        ]}>
                          Stock: {medicine.current_stock}
                        </Text>
                      </View>
                    )}
                    {medicine.unit_price !== undefined && medicine.unit_price > 0 && (
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>
                          ৳{medicine.unit_price}
                        </Text>
                      </View>
                    )}
                    {/* Knowledge base badge */}
                    {(medicine as any).match_type === 'knowledge_base' && (
                      <View style={styles.knowledgeBadge}>
                        <Ionicons name="library-outline" size={10} color={Theme.colors.info} />
                        <Text style={styles.knowledgeText}>Knowledge Base</Text>
                      </View>
                    )}
                  </View>
                  
                  {medicine.barcode_number && (
                    <View style={styles.barcodeInfo}>
                      <Ionicons name="barcode-outline" size={12} color={Theme.colors.textSecondary} />
                      <Text style={styles.barcodeText}>{medicine.barcode_number}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}

            {/* Create New Option */}
            {showCreateNew && currentValue.length >= 3 && suggestions.length === 0 && !loading && (
              <TouchableOpacity style={styles.createNewItem} onPress={handleCreateNew}>
                <View style={styles.createNewContent}>
                  <Ionicons name="add-circle-outline" size={20} color={Theme.colors.primary} />
                  <Text style={styles.createNewText}>
                    Add "{currentValue}" as new medicine
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* No Results */}
            {!loading && currentValue.length >= 2 && suggestions.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  No medicines found for "{currentValue}"
                </Text>
                {showBarcodeScanner && (
                  <Text style={styles.noResultsHint}>
                    Try scanning the barcode or check spelling
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    position: 'relative' as const,
  },

  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },

  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
  },

  searchIcon: {
    marginRight: theme.spacing.sm,
  },

  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
  },

  clearButton: {
    padding: theme.spacing.xs,
  },

  barcodeButton: {
    // Styling handled by BarcodeScanButton component
  },

  loadingContainer: {
    padding: theme.spacing.sm,
    alignItems: 'center' as const,
  },

  loadingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  suggestionsContainer: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    maxHeight: 300,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  suggestionsList: {
    flex: 1,
  },

  suggestionItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  suggestionContent: {
    flex: 1,
  },

  suggestionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 4,
  },

  suggestionMainInfo: {
    flex: 1,
  },

  detailButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },

  suggestionName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  suggestionBrand: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    marginBottom: 2,
  },

  suggestionDetails: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginTop: 2,
  },

  suggestionDetail: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },

  stockPriceInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },

  stockBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: theme.borderRadius.sm,
  },

  stockText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },

  priceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: theme.borderRadius.sm,
  },

  priceText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },

  barcodeInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.xs,
    marginTop: 2,
  },

  barcodeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  knowledgeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderRadius: theme.borderRadius.sm,
  },

  knowledgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    fontWeight: theme.typography.weights.medium,
  },

  createNewItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  createNewContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },

  createNewText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },

  noResultsContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center' as const,
  },

  noResultsText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  noResultsHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
}));