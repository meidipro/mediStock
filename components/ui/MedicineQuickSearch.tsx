import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { MedicineKnowledgeService, MedicineKnowledgeEntry } from '../../lib/medicine-knowledge-base';
import { SmartMedicineInput } from './SmartMedicineInput';
import { Card, CardContent, CardHeader } from './Card';
import { Button } from './Button';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface MedicineQuickSearchProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (medicine: MedicineKnowledgeEntry) => void;
  title?: string;
  showCategories?: boolean;
}

export const MedicineQuickSearch: React.FC<MedicineQuickSearchProps> = ({
  visible,
  onClose,
  onSelect,
  title = "Quick Medicine Search",
  showCategories = true,
}) => {
  const [searchMode, setSearchMode] = useState<'search' | 'category' | 'indication'>('search');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryMedicines, setCategoryMedicines] = useState<MedicineKnowledgeEntry[]>([]);

  const therapeuticClasses = MedicineKnowledgeService.getTherapeuticClasses();
  
  const commonIndications = [
    'Pain relief', 'Fever', 'Headache', 'Cold & Flu', 'Cough',
    'Diabetes', 'Hypertension', 'Heart disease', 'Infection',
    'Allergy', 'Digestive problems', 'Vitamin deficiency'
  ];

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    const medicines = MedicineKnowledgeService.getMedicinesByClass(category);
    setCategoryMedicines(medicines);
  };

  const handleIndicationSearch = (indication: string) => {
    const medicines = MedicineKnowledgeService.searchByIndication(indication);
    setCategoryMedicines(medicines);
    setSelectedCategory(`Indication: ${indication}`);
  };

  const handleMedicineSelect = (medicine: MedicineKnowledgeEntry) => {
    onSelect(medicine);
    onClose();
  };

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[
          styles.modeButton,
          searchMode === 'search' && styles.activeModeButton
        ]}
        onPress={() => setSearchMode('search')}
      >
        <Text style={[
          styles.modeButtonText,
          searchMode === 'search' && styles.activeModeButtonText
        ]}>
          🔍 Search
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.modeButton,
          searchMode === 'category' && styles.activeModeButton
        ]}
        onPress={() => setSearchMode('category')}
      >
        <Text style={[
          styles.modeButtonText,
          searchMode === 'category' && styles.activeModeButtonText
        ]}>
          📂 Category
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.modeButton,
          searchMode === 'indication' && styles.activeModeButton
        ]}
        onPress={() => setSearchMode('indication')}
      >
        <Text style={[
          styles.modeButtonText,
          searchMode === 'indication' && styles.activeModeButtonText
        ]}>
          🎯 Indication
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchMode = () => (
    <Card style={styles.searchCard}>
      <CardHeader>
        <Text style={styles.cardTitle}>🔍 Smart Medicine Search</Text>
      </CardHeader>
      <CardContent>
        <SmartMedicineInput
          placeholder="Type medicine name, brand, or generic..."
          onSelect={handleMedicineSelect}
          showAlternatives={true}
          showDetails={true}
        />
        <Text style={styles.helpText}>
          💡 Start typing any medicine name. Smart suggestions will appear with alternative brands and detailed information.
        </Text>
      </CardContent>
    </Card>
  );

  const renderCategoryMode = () => (
    <View>
      <Card style={styles.categoryCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>📂 Browse by Therapeutic Class</Text>
        </CardHeader>
        <CardContent>
          <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
            {therapeuticClasses.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryItem,
                  selectedCategory === category && styles.selectedCategoryItem
                ]}
                onPress={() => handleCategorySelect(category)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </CardContent>
      </Card>

      {categoryMedicines.length > 0 && (
        <Card style={styles.resultsCard}>
          <CardHeader>
            <Text style={styles.cardTitle}>
              Medicines in {selectedCategory} ({categoryMedicines.length})
            </Text>
          </CardHeader>
          <CardContent>
            <FlatList
              data={categoryMedicines}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.medicineResultItem}
                  onPress={() => handleMedicineSelect(item)}
                >
                  <View style={styles.medicineResultContent}>
                    <Text style={styles.medicineResultBrand}>{item.brand_name}</Text>
                    <Text style={styles.medicineResultGeneric}>({item.generic_name})</Text>
                    <Text style={styles.medicineResultManufacturer}>{item.manufacturer}</Text>
                    <Text style={styles.medicineResultStrength}>{item.strength} {item.form}</Text>
                  </View>
                  <View style={styles.medicineResultPrice}>
                    <Text style={styles.medicineResultPriceText}>
                      ৳{item.price_range.min}-{item.price_range.max}
                    </Text>
                    {item.prescription_required && (
                      <Text style={styles.prescriptionRequired}>Rx</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              style={styles.medicineResultsList}
              showsVerticalScrollIndicator={false}
            />
          </CardContent>
        </Card>
      )}
    </View>
  );

  const renderIndicationMode = () => (
    <View>
      <Card style={styles.indicationCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>🎯 Search by Medical Condition</Text>
        </CardHeader>
        <CardContent>
          <Text style={styles.indicationSubtitle}>
            Select a common condition to find suitable medicines:
          </Text>
          <View style={styles.indicationGrid}>
            {commonIndications.map((indication, index) => (
              <TouchableOpacity
                key={index}
                style={styles.indicationChip}
                onPress={() => handleIndicationSearch(indication)}
              >
                <Text style={styles.indicationChipText}>{indication}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </CardContent>
      </Card>

      {categoryMedicines.length > 0 && (
        <Card style={styles.resultsCard}>
          <CardHeader>
            <Text style={styles.cardTitle}>
              Medicines for {selectedCategory} ({categoryMedicines.length})
            </Text>
          </CardHeader>
          <CardContent>
            <FlatList
              data={categoryMedicines}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.medicineResultItem}
                  onPress={() => handleMedicineSelect(item)}
                >
                  <View style={styles.medicineResultContent}>
                    <Text style={styles.medicineResultBrand}>{item.brand_name}</Text>
                    <Text style={styles.medicineResultGeneric}>({item.generic_name})</Text>
                    <Text style={styles.medicineResultManufacturer}>{item.manufacturer}</Text>
                    <View style={styles.indicationsContainer}>
                      {item.indication.slice(0, 3).map((ind, idx) => (
                        <Text key={idx} style={styles.indicationTag}>
                          {ind}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <View style={styles.medicineResultPrice}>
                    <Text style={styles.medicineResultPriceText}>
                      ৳{item.price_range.min}-{item.price_range.max}
                    </Text>
                    {item.prescription_required && (
                      <Text style={styles.prescriptionRequired}>Rx</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              style={styles.medicineResultsList}
              showsVerticalScrollIndicator={false}
            />
          </CardContent>
        </Card>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderModeSelector()}
          
          {searchMode === 'search' && renderSearchMode()}
          {searchMode === 'category' && renderCategoryMode()}
          {searchMode === 'indication' && renderIndicationMode()}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },

  closeButton: {
    fontSize: 24,
    color: theme.colors.background,
    padding: theme.spacing.xs,
  },

  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  modeSelector: {
    flexDirection: 'row' as const,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },

  modeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center' as const,
    borderRadius: theme.borderRadius.sm,
  },

  activeModeButton: {
    backgroundColor: theme.colors.primary,
  },

  modeButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.textSecondary,
  },

  activeModeButtonText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
  },

  searchCard: {
    marginBottom: theme.spacing.lg,
  },

  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  helpText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
    marginTop: theme.spacing.md,
    textAlign: 'center' as const,
  },

  categoryCard: {
    marginBottom: theme.spacing.lg,
  },

  categoryList: {
    maxHeight: 200,
  },

  categoryItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  selectedCategoryItem: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },

  categoryText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },

  selectedCategoryText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold as any,
  },

  indicationCard: {
    marginBottom: theme.spacing.lg,
  },

  indicationSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center' as const,
  },

  indicationGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  indicationChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  indicationChipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },

  resultsCard: {
    marginBottom: theme.spacing.lg,
  },

  medicineResultsList: {
    maxHeight: 400,
  },

  medicineResultItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  medicineResultContent: {
    flex: 1,
  },

  medicineResultBrand: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  medicineResultGeneric: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  medicineResultManufacturer: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  medicineResultStrength: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    marginTop: 2,
  },

  medicineResultPrice: {
    alignItems: 'flex-end' as const,
  },

  medicineResultPriceText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.success,
  },

  prescriptionRequired: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.error,
    fontWeight: theme.typography.weights.bold as any,
    backgroundColor: theme.colors.error + '20',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },

  indicationsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },

  indicationTag: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    backgroundColor: theme.colors.info + '20',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
}));