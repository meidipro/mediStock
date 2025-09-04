import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { MedicineKnowledgeService, MedicineKnowledgeEntry } from '../../lib/medicine-knowledge-base';
import { Card, CardContent, CardHeader } from './Card';
import { Button } from './Button';
import { BarcodeScanButton } from '../barcode/BarcodeScanButton';
import { barcodeService, BarcodeLookupResult } from '../../lib/barcode-service';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface SmartMedicineInputProps {
  placeholder?: string;
  value?: string;
  onSelect: (medicine: MedicineKnowledgeEntry) => void;
  onTextChange?: (text: string) => void;
  showAlternatives?: boolean;
  showDetails?: boolean;
  disabled?: boolean;
  label?: string;
  showBarcodeScanner?: boolean;
  pharmacyId?: string;
}

export const SmartMedicineInput: React.FC<SmartMedicineInputProps> = ({
  placeholder = "Start typing medicine name...",
  value = "",
  onSelect,
  onTextChange,
  showAlternatives = true,
  showDetails = true,
  disabled = false,
  label,
  showBarcodeScanner = true,
  pharmacyId
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<MedicineKnowledgeEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineKnowledgeEntry | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [alternatives, setAlternatives] = useState<MedicineKnowledgeEntry[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (inputValue.length >= 1) {
      const smartSuggestions = MedicineKnowledgeService.getSmartSuggestions(inputValue, 8);
      setSuggestions(smartSuggestions);
      setShowSuggestions(smartSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    onTextChange?.(text);
  };

  const handleSelectSuggestion = (medicine: MedicineKnowledgeEntry) => {
    setInputValue(`${medicine.brand_name} (${medicine.generic_name})`);
    setSelectedMedicine(medicine);
    setShowSuggestions(false);
    onSelect(medicine);
    inputRef.current?.blur();
  };

  const showMedicineDetails = (medicine: MedicineKnowledgeEntry) => {
    setSelectedMedicine(medicine);
    setShowDetailsModal(true);
  };

  const showAlternativeBrands = (medicine: MedicineKnowledgeEntry) => {
    const alternativeBrands = MedicineKnowledgeService.getAlternativeBrands(medicine.generic_name);
    setAlternatives(alternativeBrands);
    setSelectedMedicine(medicine);
    setShowAlternativesModal(true);
  };

  const getPriceRangeColor = (priceRange: { min: number; max: number }) => {
    const avgPrice = (priceRange.min + priceRange.max) / 2;
    if (avgPrice < 5) return Theme.colors.success;
    if (avgPrice < 15) return Theme.colors.warning;
    return Theme.colors.error;
  };

  // Barcode scanning handlers
  const handleBarcodeScanned = (result: BarcodeLookupResult) => {
    console.log('📱 Barcode scanned in SmartMedicineInput:', result);
    
    if (result.found && result.medicine) {
      const medicine = result.medicine;
      // Try to find the medicine in the knowledge base
      const knowledgeEntry = MedicineKnowledgeService.findByName(
        medicine.generic_name || ''
      );
      
      if (knowledgeEntry) {
        // Found in knowledge base
        setInputValue(knowledgeEntry.brand_name);
        if (onTextChange) {
          onTextChange(knowledgeEntry.brand_name);
        }
        onSelect(knowledgeEntry);
        setShowSuggestions(false);
        
        Alert.alert(
          '✅ Medicine Found!',
          `${knowledgeEntry.brand_name} (${knowledgeEntry.generic_name}) has been selected.`,
          [{ text: 'OK' }]
        );
      } else {
        // Not found in knowledge base, but medicine exists in database
        const medicineName = medicine.generic_name || medicine.name || '';
        setInputValue(medicineName);
        if (onTextChange) {
          onTextChange(medicineName);
        }
        
        Alert.alert(
          '📋 Medicine Found',
          `Found: ${medicineName}. This medicine is not in the knowledge base but exists in your inventory.`,
          [{ text: 'OK' }]
        );
      }
    } else if (result.suggestions.length > 0) {
      // Show suggestions
      const suggestion = result.suggestions[0];
      const suggestionName = suggestion.generic_name || suggestion.name || '';
      
      Alert.alert(
        '🔍 Similar Medicine Found',
        `Found similar medicine: ${suggestionName}. Would you like to search for it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Search',
            onPress: () => {
              setInputValue(suggestionName);
              if (onTextChange) {
                onTextChange(suggestionName);
              }
              // Trigger search
              if (onTextChange) {
                onTextChange(suggestionName);
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        '❌ Medicine Not Found',
        result.error || 'No medicine found for this barcode. You can type the name manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBarcodeError = (error: string) => {
    Alert.alert('Barcode Scan Error', error);
  };

  const renderSuggestion = ({ item }: { item: MedicineKnowledgeEntry }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectSuggestion(item)}
    >
      <View style={styles.suggestionContent}>
        <View style={styles.suggestionMain}>
          <Text style={styles.brandName}>{item.brand_name}</Text>
          <Text style={styles.genericName}>({item.generic_name})</Text>
          <Text style={styles.manufacturerName}>{item.manufacturer}</Text>
          <Text style={styles.strengthForm}>{item.strength} {item.form}</Text>
        </View>

        <View style={styles.suggestionActions}>
          <View style={[
            styles.priceBadge,
            { backgroundColor: getPriceRangeColor(item.price_range) + '20' }
          ]}>
            <Text style={[
              styles.priceText,
              { color: getPriceRangeColor(item.price_range) }
            ]}>
              ৳{item.price_range.min}-{item.price_range.max}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {showDetails && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => showMedicineDetails(item)}
              >
                <Text style={styles.actionButtonText}>ℹ️</Text>
              </TouchableOpacity>
            )}

            {showAlternatives && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => showAlternativeBrands(item)}
              >
                <Text style={styles.actionButtonText}>🔄</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.therapeuticClass}>
        <Text style={styles.therapeuticClassText}>{item.therapeutic_class}</Text>
        {item.prescription_required && (
          <Text style={styles.prescriptionBadge}>Rx</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>💊 Medicine Details</Text>
          <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedMedicine && (
            <>
              <Card style={styles.detailCard}>
                <CardHeader>
                  <Text style={styles.detailCardTitle}>Basic Information</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Brand Name:</Text>
                    <Text style={styles.detailValue}>{selectedMedicine.brand_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Generic Name:</Text>
                    <Text style={styles.detailValue}>{selectedMedicine.generic_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Manufacturer:</Text>
                    <Text style={styles.detailValue}>{selectedMedicine.manufacturer}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Strength & Form:</Text>
                    <Text style={styles.detailValue}>{selectedMedicine.strength} {selectedMedicine.form}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Therapeutic Class:</Text>
                    <Text style={styles.detailValue}>{selectedMedicine.therapeutic_class}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price Range:</Text>
                    <Text style={[
                      styles.detailValue,
                      { color: getPriceRangeColor(selectedMedicine.price_range) }
                    ]}>
                      ৳{selectedMedicine.price_range.min} - ৳{selectedMedicine.price_range.max}
                    </Text>
                  </View>
                </CardContent>
              </Card>

              <Card style={styles.detailCard}>
                <CardHeader>
                  <Text style={styles.detailCardTitle}>Clinical Information</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Indications:</Text>
                    {selectedMedicine.indication.map((indication, index) => (
                      <Text key={index} style={styles.detailListItem}>• {indication}</Text>
                    ))}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Common Dosage:</Text>
                    <Text style={styles.detailText}>{selectedMedicine.common_dosage}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Side Effects:</Text>
                    {selectedMedicine.side_effects.map((effect, index) => (
                      <Text key={index} style={styles.detailListItem}>• {effect}</Text>
                    ))}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Contraindications:</Text>
                    {selectedMedicine.contraindications.map((contra, index) => (
                      <Text key={index} style={styles.detailListItem}>• {contra}</Text>
                    ))}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Drug Interactions:</Text>
                    {selectedMedicine.drug_interactions.map((interaction, index) => (
                      <Text key={index} style={styles.detailListItem}>• {interaction}</Text>
                    ))}
                  </View>
                </CardContent>
              </Card>
            </>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            title="Select This Medicine"
            variant="primary"
            onPress={() => {
              if (selectedMedicine) {
                handleSelectSuggestion(selectedMedicine);
                setShowDetailsModal(false);
              }
            }}
            style={styles.footerButton}
          />
          <Button
            title="Close"
            variant="outline"
            onPress={() => setShowDetailsModal(false)}
            style={styles.footerButton}
          />
        </View>
      </View>
    </Modal>
  );

  const renderAlternativesModal = () => (
    <Modal
      visible={showAlternativesModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🔄 Alternative Brands</Text>
          <TouchableOpacity onPress={() => setShowAlternativesModal(false)}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedMedicine && (
            <>
              <Card style={styles.detailCard}>
                <CardHeader>
                  <Text style={styles.detailCardTitle}>
                    Alternative brands for {selectedMedicine.generic_name}
                  </Text>
                </CardHeader>
                <CardContent>
                  <Text style={styles.alternativeDescription}>
                    These medicines contain the same active ingredient ({selectedMedicine.generic_name}) 
                    and can be used as alternatives:
                  </Text>
                </CardContent>
              </Card>

              {alternatives.map((alternative, index) => (
                <Card key={index} style={styles.alternativeCard}>
                  <CardContent>
                    <TouchableOpacity
                      style={styles.alternativeItem}
                      onPress={() => {
                        handleSelectSuggestion(alternative);
                        setShowAlternativesModal(false);
                      }}
                    >
                      <View style={styles.alternativeMain}>
                        <Text style={styles.alternativeBrandName}>{alternative.brand_name}</Text>
                        <Text style={styles.alternativeManufacturer}>{alternative.manufacturer}</Text>
                        <Text style={styles.alternativeStrength}>{alternative.strength} {alternative.form}</Text>
                      </View>

                      <View style={styles.alternativePrice}>
                        <Text style={[
                          styles.alternativePriceText,
                          { color: getPriceRangeColor(alternative.price_range) }
                        ]}>
                          ৳{alternative.price_range.min}-{alternative.price_range.max}
                        </Text>
                        <Text style={styles.selectText}>Tap to select</Text>
                      </View>
                    </TouchableOpacity>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            title="Close"
            variant="outline"
            onPress={() => setShowAlternativesModal(false)}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, disabled && styles.disabledInput]}
          placeholder={placeholder}
          placeholderTextColor={Theme.colors.textTertiary}
          value={inputValue}
          onChangeText={handleInputChange}
          onFocus={() => inputValue.length >= 1 && setShowSuggestions(suggestions.length > 0)}
          editable={!disabled}
          autoCapitalize="words"
          autoCorrect={false}
        />
        
        {inputValue.length > 0 && !disabled && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setInputValue('');
              setShowSuggestions(false);
              onTextChange?.('');
            }}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
        
        {showBarcodeScanner && !disabled && (
          <BarcodeScanButton
            onScanSuccess={handleBarcodeScanned}
            onScanError={handleBarcodeError}
            pharmacyId={pharmacyId}
            title="Scan Medicine Barcode"
            variant="icon"
            size="sm"
            style={styles.barcodeButton}
          />
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.suggestionsList}
            nestedScrollEnabled={true}
          />
        </View>
      )}

      {renderDetailsModal()}
      {renderAlternativesModal()}
    </View>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    marginBottom: theme.spacing.md,
  },

  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  inputContainer: {
    position: 'relative' as const,
  },

  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    paddingRight: 40,
  },

  disabledInput: {
    backgroundColor: theme.colors.backgroundTertiary,
    color: theme.colors.textTertiary,
  },

  clearButton: {
    position: 'absolute' as const,
    right: theme.spacing.sm,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.textTertiary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  clearButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold' as any,
  },

  suggestionsContainer: {
    position: 'relative' as const,
    marginTop: 4,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 300,
    zIndex: 1000,
  },

  suggestionsList: {
    maxHeight: 300,
  },

  suggestionItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  suggestionContent: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.sm,
  },

  suggestionMain: {
    flex: 1,
  },

  brandName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  genericName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  manufacturerName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  strengthForm: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    marginTop: 2,
  },

  suggestionActions: {
    alignItems: 'flex-end' as const,
  },

  priceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },

  priceText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.xs,
  },

  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  actionButtonText: {
    fontSize: 12,
  },

  therapeuticClass: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  therapeuticClassText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    fontStyle: 'italic' as const,
  },

  prescriptionBadge: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.error,
    fontWeight: theme.typography.weights.bold as any,
    backgroundColor: theme.colors.error + '20',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },

  // Modal styles
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

  detailCard: {
    marginBottom: theme.spacing.lg,
  },

  detailCardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  detailLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },

  detailValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    flex: 2,
    textAlign: 'right' as const,
  },

  detailSection: {
    marginBottom: theme.spacing.md,
  },

  detailSectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  detailText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  detailListItem: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },

  modalFooter: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  footerButton: {
    flex: 1,
  },

  // Alternative brands modal
  alternativeDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center' as const,
  },

  alternativeCard: {
    marginBottom: theme.spacing.md,
  },

  alternativeItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  alternativeMain: {
    flex: 1,
  },

  alternativeBrandName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  alternativeManufacturer: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  alternativeStrength: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    marginTop: 2,
  },

  alternativePrice: {
    alignItems: 'flex-end' as const,
  },

  alternativePriceText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
  },

  selectText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  // Barcode button style
  barcodeButton: {
    marginLeft: theme.spacing.sm,
    // Style handled by BarcodeScanButton component
  },
}));