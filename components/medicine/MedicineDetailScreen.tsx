import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { MedicineKnowledgeEntry, MedicineKnowledgeService } from '../../lib/medicine-knowledge-base';
import { Theme, createThemedStyles } from '../../constants/Theme';

const { width } = Dimensions.get('window');

interface MedicineDetailScreenProps {
  medicineId?: string;
  onClose?: () => void;
  showAddToStock?: boolean;
  onAddToStock?: (medicine: MedicineKnowledgeEntry) => void;
}

export const MedicineDetailScreen: React.FC<MedicineDetailScreenProps> = ({
  medicineId,
  onClose,
  showAddToStock = true,
  onAddToStock,
}) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const finalMedicineId = medicineId || (params.medicineId as string);

  const [medicine, setMedicine] = useState<MedicineKnowledgeEntry | null>(null);
  const [alternatives, setAlternatives] = useState<MedicineKnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'safety' | 'alternatives'>('overview');
  const [showBengali, setShowBengali] = useState(false);

  const loadMedicineDetails = useCallback(async () => {
    if (!finalMedicineId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get medicine details
      const medicineData = MedicineKnowledgeService.getMedicineById(finalMedicineId);
      setMedicine(medicineData);

      // Get alternatives
      if (medicineData) {
        const alternativesList = MedicineKnowledgeService.getAlternativeBrands(medicineData.generic_name);
        setAlternatives(alternativesList.filter(alt => alt.id !== medicineData.id));
      }

    } catch (error) {
      console.error('Error loading medicine details:', error);
      Alert.alert('Error', 'Failed to load medicine details');
    } finally {
      setLoading(false);
    }
  }, [finalMedicineId]);

  useEffect(() => {
    loadMedicineDetails();
  }, [loadMedicineDetails]);

  const handleShare = async () => {
    if (!medicine) return;

    try {
      const shareContent = `${medicine.brand_name} (${medicine.generic_name})
      
Manufacturer: ${medicine.manufacturer}
Strength: ${medicine.strength}
Form: ${medicine.form}
Price Range: ৳${medicine.price_range.min} - ৳${medicine.price_range.max}

Uses: ${medicine.indication.join(', ')}

Shared via MediStock - Pharmacy Management System`;

      await Share.share({
        message: shareContent,
        title: `${medicine.brand_name} - Medicine Information`,
      });
    } catch (error) {
      console.error('Error sharing medicine:', error);
    }
  };

  const handleAddToStock = () => {
    if (medicine && onAddToStock) {
      onAddToStock(medicine);
    } else if (medicine) {
      // Navigate to add stock screen with medicine details
      router.push({
        pathname: '/add-stock',
        params: {
          medicineId: medicine.id,
          medicineName: medicine.brand_name,
          genericName: medicine.generic_name,
        },
      });
    }
  };

  const renderOverviewTab = () => (
    <View>
      {/* Basic Information */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Basic Information</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Brand Name:</Text>
            <Text style={styles.infoValue}>
              {showBengali && medicine?.brand_name_bn ? medicine.brand_name_bn : medicine?.brand_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Generic Name:</Text>
            <Text style={styles.infoValue}>
              {showBengali && medicine?.generic_name_bn ? medicine.generic_name_bn : medicine?.generic_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Manufacturer:</Text>
            <Text style={styles.infoValue}>
              {showBengali && medicine?.manufacturer_bn ? medicine.manufacturer_bn : medicine?.manufacturer}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Strength:</Text>
            <Text style={styles.infoValue}>{medicine?.strength}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Form:</Text>
            <Text style={styles.infoValue}>
              {showBengali && medicine?.form_bn ? medicine.form_bn : medicine?.form}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class:</Text>
            <Text style={styles.infoValue}>
              {showBengali && medicine?.therapeutic_class_bn ? medicine.therapeutic_class_bn : medicine?.therapeutic_class}
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Price Information */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Pricing</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.priceContainer}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Min Price</Text>
              <Text style={styles.priceValue}>৳{medicine?.price_range.min}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Max Price</Text>
              <Text style={styles.priceValue}>৳{medicine?.price_range.max}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Prescription</Text>
              <Text style={[styles.prescriptionText, {
                color: medicine?.prescription_required ? Theme.colors.error : Theme.colors.success
              }]}>
                {medicine?.prescription_required ? 'Required' : 'Not Required'}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Uses/Indications */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Uses & Indications</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.tagContainer}>
            {(showBengali && medicine?.indication_bn ? medicine.indication_bn : medicine?.indication || []).map((use, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{use}</Text>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Dosage */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Common Dosage</Text>
        </CardHeader>
        <CardContent>
          <Text style={styles.dosageText}>
            {showBengali && medicine?.common_dosage_bn ? medicine.common_dosage_bn : medicine?.common_dosage}
          </Text>
        </CardContent>
      </Card>
    </View>
  );

  const renderDetailsTab = () => (
    <View>
      {/* Side Effects */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="warning-outline" size={20} color={Theme.colors.warning} />
            <Text style={styles.sectionTitle}>Side Effects</Text>
          </View>
        </CardHeader>
        <CardContent>
          {(showBengali && medicine?.side_effects_bn ? medicine.side_effects_bn : medicine?.side_effects || []).map((effect, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.listText}>{effect}</Text>
            </View>
          ))}
        </CardContent>
      </Card>

      {/* Drug Interactions */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="alert-circle-outline" size={20} color={Theme.colors.error} />
            <Text style={styles.sectionTitle}>Drug Interactions</Text>
          </View>
        </CardHeader>
        <CardContent>
          {(showBengali && medicine?.drug_interactions_bn ? medicine.drug_interactions_bn : medicine?.drug_interactions || []).map((interaction, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.listText}>{interaction}</Text>
            </View>
          ))}
        </CardContent>
      </Card>

      {/* Storage Instructions */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="archive-outline" size={20} color={Theme.colors.info} />
            <Text style={styles.sectionTitle}>Storage Instructions</Text>
          </View>
        </CardHeader>
        <CardContent>
          <Text style={styles.storageText}>
            {showBengali && medicine?.storage_instructions_bn ? medicine.storage_instructions_bn : medicine?.storage_instructions}
          </Text>
        </CardContent>
      </Card>
    </View>
  );

  const renderSafetyTab = () => (
    <View>
      {/* Contraindications */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="ban-outline" size={20} color={Theme.colors.error} />
            <Text style={styles.sectionTitle}>Contraindications</Text>
          </View>
        </CardHeader>
        <CardContent>
          {(showBengali && medicine?.contraindications_bn ? medicine.contraindications_bn : medicine?.contraindications || []).map((contra, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.listText}>{contra}</Text>
            </View>
          ))}
        </CardContent>
      </Card>

      {/* Warnings & Precautions */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Theme.colors.warning} />
            <Text style={styles.sectionTitle}>Warnings & Precautions</Text>
          </View>
        </CardHeader>
        <CardContent>
          {(showBengali && medicine?.warnings_precautions_bn ? medicine.warnings_precautions_bn : medicine?.warnings_precautions || []).map((warning, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.listText}>{warning}</Text>
            </View>
          ))}
        </CardContent>
      </Card>

      {/* Pregnancy & Lactation */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <View style={styles.sectionHeaderWithIcon}>
            <Ionicons name="heart-outline" size={20} color={Theme.colors.primary} />
            <Text style={styles.sectionTitle}>Pregnancy & Lactation</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.pregnancyContainer}>
            <View style={styles.pregnancyItem}>
              <Text style={styles.pregnancyLabel}>Category:</Text>
              <View style={[styles.categoryBadge, {
                backgroundColor: getCategoryColor(medicine?.pregnancy_lactation.pregnancy_category || 'C')
              }]}>
                <Text style={styles.categoryText}>{medicine?.pregnancy_lactation.pregnancy_category}</Text>
              </View>
            </View>
            <Text style={styles.pregnancyInfo}>
              <Text style={styles.pregnancyInfoLabel}>Pregnancy: </Text>
              {showBengali && medicine?.pregnancy_lactation.pregnancy_info_bn ? 
                medicine.pregnancy_lactation.pregnancy_info_bn : 
                medicine?.pregnancy_lactation.pregnancy_info}
            </Text>
            <Text style={styles.pregnancyInfo}>
              <Text style={styles.pregnancyInfoLabel}>Lactation: </Text>
              {showBengali && medicine?.pregnancy_lactation.lactation_info_bn ? 
                medicine.pregnancy_lactation.lactation_info_bn : 
                medicine?.pregnancy_lactation.lactation_info}
            </Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );

  const renderAlternativesTab = () => (
    <View>
      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Alternative Brands</Text>
          <Text style={styles.sectionSubtitle}>
            Same generic medicine ({medicine?.generic_name}) from different manufacturers
          </Text>
        </CardHeader>
        <CardContent>
          {alternatives.length > 0 ? (
            alternatives.map((alt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.alternativeItem}
                onPress={() => {
                  // Navigate to this alternative's detail
                  router.push({
                    pathname: '/medicine-detail',
                    params: { medicineId: alt.id },
                  });
                }}
              >
                <View style={styles.alternativeInfo}>
                  <Text style={styles.alternativeBrand}>{alt.brand_name}</Text>
                  <Text style={styles.alternativeManufacturer}>{alt.manufacturer}</Text>
                  <Text style={styles.alternativeStrength}>{alt.strength} • {alt.form}</Text>
                </View>
                <View style={styles.alternativePrice}>
                  <Text style={styles.alternativePriceText}>৳{alt.price_range.min} - ৳{alt.price_range.max}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noAlternativesText}>No alternative brands available in database</Text>
          )}
        </CardContent>
      </Card>

      {/* Related Medicines */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Same Therapeutic Class</Text>
          <Text style={styles.sectionSubtitle}>
            Other medicines in {medicine?.therapeutic_class}
          </Text>
        </CardHeader>
        <CardContent>
          <Text style={styles.comingSoonText}>Coming soon...</Text>
        </CardContent>
      </Card>
    </View>
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'A': return Theme.colors.success;
      case 'B': return Theme.colors.info;
      case 'C': return Theme.colors.warning;
      case 'D': return Theme.colors.error;
      case 'X': return '#000000';
      default: return Theme.colors.textSecondary;
    }
  };

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },

    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    backButton: {
      marginRight: theme.spacing.md,
    },

    headerTitle: {
      flex: 1,
    },

    medicineName: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },

    genericName: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    headerActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },

    actionButton: {
      padding: theme.spacing.sm,
    },

    languageToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },

    languageText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      marginLeft: 4,
    },

    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },

    tab: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      marginRight: theme.spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },

    tabActive: {
      borderBottomColor: theme.colors.primary,
    },

    tabText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.medium,
    },

    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
    },

    content: {
      flex: 1,
      padding: theme.spacing.md,
    },

    sectionCard: {
      marginBottom: theme.spacing.md,
    },

    sectionTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    sectionSubtitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    sectionHeaderWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },

    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },

    infoLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.medium,
      flex: 1,
    },

    infoValue: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
      flex: 2,
      textAlign: 'right',
    },

    priceContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    priceItem: {
      alignItems: 'center',
      flex: 1,
    },

    priceLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },

    priceValue: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.primary,
    },

    prescriptionText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semiBold,
    },

    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },

    tag: {
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
    },

    tagText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.medium,
    },

    dosageText: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
      textAlign: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },

    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },

    bulletPoint: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      marginRight: theme.spacing.sm,
      lineHeight: 20,
    },

    listText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      flex: 1,
      lineHeight: 20,
    },

    storageText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      lineHeight: 20,
      textAlign: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },

    pregnancyContainer: {
      gap: theme.spacing.md,
    },

    pregnancyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },

    pregnancyLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.weights.medium,
    },

    categoryBadge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
    },

    categoryText: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.background,
      fontWeight: theme.typography.weights.bold,
    },

    pregnancyInfo: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },

    pregnancyInfoLabel: {
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.primary,
    },

    alternativeItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },

    alternativeInfo: {
      flex: 1,
    },

    alternativeBrand: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    alternativeManufacturer: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    alternativeStrength: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },

    alternativePrice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },

    alternativePriceText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.medium,
    },

    noAlternativesText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },

    comingSoonText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },

    bottomActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },

    actionButtonFull: {
      flex: 1,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },

    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },

    errorText: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Loading medicine details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!medicine) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="medical-outline" size={64} color={Theme.colors.textSecondary} />
          <Text style={styles.errorText}>Medicine not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onClose ? onClose() : router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <Text style={styles.medicineName}>
              {showBengali && medicine.brand_name_bn ? medicine.brand_name_bn : medicine.brand_name}
            </Text>
            <Text style={styles.genericName}>
              {showBengali && medicine.generic_name_bn ? medicine.generic_name_bn : medicine.generic_name}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.languageToggle}
            onPress={() => setShowBengali(!showBengali)}
          >
            <Ionicons name="language" size={16} color={Theme.colors.text} />
            <Text style={styles.languageText}>{showBengali ? 'EN' : 'বাং'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'details', label: 'Details' },
          { key: 'safety', label: 'Safety' },
          { key: 'alternatives', label: 'Alternatives' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'details' && renderDetailsTab()}
        {selectedTab === 'safety' && renderSafetyTab()}
        {selectedTab === 'alternatives' && renderAlternativesTab()}
      </ScrollView>

      {/* Bottom Actions */}
      {showAddToStock && (
        <View style={styles.bottomActions}>
          <Button
            title="Add to Stock"
            variant="primary"
            onPress={handleAddToStock}
            style={styles.actionButtonFull}
          />
          <Button
            title="View Alternatives"
            variant="outline"
            onPress={() => setSelectedTab('alternatives')}
            style={styles.actionButtonFull}
          />
        </View>
      )}
    </SafeAreaView>
  );
};