/**
 * SYMPTOM-BASED MEDICINE SEARCH COMPONENT
 * Intelligent medicine recommendation based on symptoms
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

interface MedicalCondition {
  id: string;
  condition_name: string;
  condition_name_bn?: string;
  category: string;
  relevance_score: number;
  symptom_matches: number;
  description?: string;
  description_bn?: string;
  warning_signs?: string[];
  warning_signs_bn?: string[];
  emergency_symptoms?: string[];
  emergency_symptoms_bn?: string[];
}

interface MedicineRecommendation {
  medicine_id: string;
  generic_name: string;
  brand_name: string;
  generic_name_bn?: string;
  brand_name_bn?: string;
  manufacturer: string;
  strength: string;
  form: string;
  therapeutic_class: string;
  price_range: { min: number; max: number };
  prescription_required: boolean;
  common_dosage?: string;
  common_dosage_bn?: string;
  effectiveness_score: number;
  suitability_score: number;
  is_first_line: boolean;
  is_otc_appropriate: boolean;
  usage_notes?: string;
  usage_notes_bn?: string;
  condition_treated: string;
  condition_treated_bn?: string;
  safety_profile: {
    pregnancy_safe: boolean;
    lactation_safe: boolean;
    pregnancy_category: string;
  };
  recommendation_level: 'highly_recommended' | 'recommended' | 'consider' | 'caution';
}

interface SearchResult {
  search_query: string;
  patient_profile: {
    age_years?: number;
    is_pregnant: boolean;
    is_lactating: boolean;
    prefer_otc: boolean;
  };
  conditions_found: MedicalCondition[];
  medicines_suggested: MedicineRecommendation[];
  summary: {
    total_conditions: number;
    total_medicines: number;
    search_success: boolean;
  };
  disclaimers: string[];
  disclaimers_bn: string[];
}

interface SymptomMedicineSearchProps {
  onMedicineSelect?: (medicine: MedicineRecommendation) => void;
  onConditionSelect?: (condition: MedicalCondition) => void;
}

export const SymptomMedicineSearch: React.FC<SymptomMedicineSearchProps> = ({
  onMedicineSelect,
  onConditionSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);
  const [isLactating, setIsLactating] = useState(false);
  const [preferOTC, setPreferOTC] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [showBengali, setShowBengali] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conditions' | 'medicines'>('conditions');

  const searchBySymptoms = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter symptoms to search');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('search_medicines_by_symptoms', {
        symptoms_text: searchQuery.trim(),
        patient_age_years: patientAge ? parseInt(patientAge) : null,
        is_pregnant: isPregnant,
        is_lactating: isLactating,
        prefer_otc: preferOTC,
        limit_results: 20
      });

      if (error) {
        throw new Error(error.message);
      }

      setSearchResult(data);
      
      if (data.summary.total_conditions === 0) {
        Alert.alert(
          'No Results',
          'No medical conditions found matching your symptoms. Try different or more specific symptoms.',
          [{ text: 'OK' }]
        );
      }

    } catch (err) {
      console.error('Symptom search failed:', err);
      setError(err.message || 'Failed to search by symptoms');
    } finally {
      setIsSearching(false);
    }
  };

  const getRecommendationColor = (level: string) => {
    switch (level) {
      case 'highly_recommended':
        return Theme.colors.success;
      case 'recommended':
        return Theme.colors.primary;
      case 'consider':
        return Theme.colors.warning;
      case 'caution':
        return Theme.colors.error;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getRecommendationIcon = (level: string) => {
    switch (level) {
      case 'highly_recommended':
        return 'checkmark-circle';
      case 'recommended':
        return 'checkmark';
      case 'consider':
        return 'help-circle';
      case 'caution':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    searchSection: {
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },

    searchTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },

    inputGroup: {
      marginBottom: theme.spacing.md,
    },

    inputLabel: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },

    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: theme.typography.sizes.md,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      minHeight: 80,
      textAlignVertical: 'top',
    },

    smallTextInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      fontSize: theme.typography.sizes.md,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },

    patientProfileSection: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },

    profileTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },

    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },

    profileLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      flex: 1,
    },

    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.sm,
    },

    checkboxChecked: {
      backgroundColor: theme.colors.primary,
    },

    searchButton: {
      marginTop: theme.spacing.md,
    },

    languageToggle: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },

    languageText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      marginLeft: 4,
    },

    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },

    loadingText: {
      marginLeft: theme.spacing.sm,
      color: theme.colors.textSecondary,
    },

    errorContainer: {
      backgroundColor: theme.colors.errorLight,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      margin: theme.spacing.md,
    },

    errorText: {
      color: theme.colors.error,
      fontSize: theme.typography.sizes.sm,
      textAlign: 'center',
    },

    resultSection: {
      flex: 1,
    },

    resultSummary: {
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },

    summaryTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },

    summaryStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },

    statItem: {
      alignItems: 'center',
    },

    statNumber: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.primary,
    },

    statLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },

    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },

    tab: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundSecondary,
      alignItems: 'center',
    },

    tabActive: {
      backgroundColor: theme.colors.primary,
    },

    tabText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },

    tabTextActive: {
      color: theme.colors.background,
    },

    conditionCard: {
      marginBottom: theme.spacing.md,
    },

    conditionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    conditionName: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      flex: 1,
    },

    relevanceScore: {
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },

    relevanceText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semiBold,
    },

    conditionDescription: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      lineHeight: 18,
    },

    conditionCategory: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.primary,
      marginTop: theme.spacing.xs,
      textTransform: 'capitalize',
    },

    warningSection: {
      backgroundColor: theme.colors.warningLight,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.sm,
    },

    warningTitle: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.warning,
      marginBottom: theme.spacing.xs,
    },

    warningList: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.warning,
    },

    medicineCard: {
      marginBottom: theme.spacing.md,
      borderLeftWidth: 4,
    },

    medicineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },

    medicineInfo: {
      flex: 1,
    },

    medicineName: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    medicineGeneric: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },

    medicineDetails: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },

    recommendationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      marginLeft: theme.spacing.sm,
    },

    recommendationText: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.semiBold,
      marginLeft: theme.spacing.xs,
      textTransform: 'capitalize',
    },

    medicineCondition: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.primary,
      marginTop: theme.spacing.sm,
      fontWeight: theme.typography.weights.medium,
    },

    priceRange: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },

    priceText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.xs,
    },

    dosageInfo: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.sm,
    },

    dosageText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },

    usageNotes: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },

    medicineActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },

    actionButton: {
      flex: 1,
    },

    disclaimerCard: {
      backgroundColor: theme.colors.errorLight,
      marginTop: theme.spacing.md,
    },

    disclaimerTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },

    disclaimerItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.xs,
    },

    disclaimerText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.error,
      flex: 1,
      marginLeft: theme.spacing.xs,
    },
  }));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        style={styles.languageToggle}
        onPress={() => setShowBengali(!showBengali)}
      >
        <Ionicons name="language" size={14} color={Theme.colors.text} />
        <Text style={styles.languageText}>{showBengali ? 'EN' : 'বাং'}</Text>
      </TouchableOpacity>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.searchTitle}>
          {showBengali ? 'লক্ষণ অনুযায়ী ওষুধ খুঁজুন' : 'Find Medicines by Symptoms'}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {showBengali ? 'আপনার লক্ষণগুলি বর্ণনা করুন:' : 'Describe your symptoms:'}
          </Text>
          <TextInput
            style={styles.textInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={showBengali 
              ? "যেমন: মাথাব্যথা, জ্বর, কাশি, পেটব্যথা..." 
              : "e.g.: headache, fever, cough, stomach pain..."}
            placeholderTextColor={Theme.colors.textSecondary}
            multiline
          />
        </View>

        <View style={styles.patientProfileSection}>
          <Text style={styles.profileTitle}>
            {showBengali ? 'রোগীর তথ্য (ঐচ্ছিক):' : 'Patient Profile (Optional):'}
          </Text>
          
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>
              {showBengali ? 'বয়স (বছর):' : 'Age (years):'}
            </Text>
            <TextInput
              style={[styles.smallTextInput, { width: 80 }]}
              value={patientAge}
              onChangeText={setPatientAge}
              placeholder="25"
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>
              {showBengali ? 'গর্ভবতী' : 'Pregnant'}
            </Text>
            <TouchableOpacity
              style={[styles.checkbox, isPregnant && styles.checkboxChecked]}
              onPress={() => setIsPregnant(!isPregnant)}
            >
              {isPregnant && <Ionicons name="checkmark" size={14} color={Theme.colors.background} />}
            </TouchableOpacity>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>
              {showBengali ? 'বুকের দুধ খাওয়াচ্ছেন' : 'Breastfeeding'}
            </Text>
            <TouchableOpacity
              style={[styles.checkbox, isLactating && styles.checkboxChecked]}
              onPress={() => setIsLactating(!isLactating)}
            >
              {isLactating && <Ionicons name="checkmark" size={14} color={Theme.colors.background} />}
            </TouchableOpacity>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>
              {showBengali ? 'ওটিসি ওষুধ পছন্দ করুন' : 'Prefer OTC medicines'}
            </Text>
            <TouchableOpacity
              style={[styles.checkbox, preferOTC && styles.checkboxChecked]}
              onPress={() => setPreferOTC(!preferOTC)}
            >
              {preferOTC && <Ionicons name="checkmark" size={14} color={Theme.colors.background} />}
            </TouchableOpacity>
          </View>
        </View>

        <Button
          title={showBengali ? 'ওষুধ খুঁজুন' : 'Search Medicines'}
          onPress={searchBySymptoms}
          disabled={isSearching || !searchQuery.trim()}
          style={styles.searchButton}
        />
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>
            {showBengali ? 'ওষুধ খোঁজা হচ্ছে...' : 'Searching for medicines...'}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results Section */}
      {searchResult && !isSearching && (
        <View style={styles.resultSection}>
          {/* Summary */}
          <View style={styles.resultSummary}>
            <Text style={styles.summaryTitle}>
              {showBengali ? 'অনুসন্ধানের ফলাফল' : 'Search Results'}
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{searchResult.summary.total_conditions}</Text>
                <Text style={styles.statLabel}>
                  {showBengali ? 'রোগ পাওয়া গেছে' : 'Conditions'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{searchResult.summary.total_medicines}</Text>
                <Text style={styles.statLabel}>
                  {showBengali ? 'ওষুধ পাওয়া গেছে' : 'Medicines'}
                </Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'conditions' && styles.tabActive]}
              onPress={() => setActiveTab('conditions')}
            >
              <Text style={[styles.tabText, activeTab === 'conditions' && styles.tabTextActive]}>
                {showBengali ? 'সম্ভাব্য রোগ' : 'Possible Conditions'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'medicines' && styles.tabActive]}
              onPress={() => setActiveTab('medicines')}
            >
              <Text style={[styles.tabText, activeTab === 'medicines' && styles.tabTextActive]}>
                {showBengali ? 'প্রস্তাবিত ওষুধ' : 'Suggested Medicines'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conditions Tab */}
          {activeTab === 'conditions' && (
            <View>
              {searchResult.conditions_found.map((condition, index) => (
                <Card key={index} style={styles.conditionCard}>
                  <CardHeader>
                    <View style={styles.conditionHeader}>
                      <Text style={styles.conditionName}>
                        {showBengali && condition.condition_name_bn 
                          ? condition.condition_name_bn 
                          : condition.condition_name}
                      </Text>
                      <View style={styles.relevanceScore}>
                        <Text style={styles.relevanceText}>
                          {Math.round(condition.relevance_score * 100)}% match
                        </Text>
                      </View>
                    </View>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.conditionCategory}>
                      {condition.category} • {condition.symptom_matches} symptoms matched
                    </Text>
                    
                    {condition.description && (
                      <Text style={styles.conditionDescription}>
                        {showBengali && condition.description_bn 
                          ? condition.description_bn 
                          : condition.description}
                      </Text>
                    )}

                    {condition.warning_signs && condition.warning_signs.length > 0 && (
                      <View style={styles.warningSection}>
                        <Text style={styles.warningTitle}>
                          {showBengali ? 'সতর্কতা লক্ষণ:' : 'Warning Signs:'}
                        </Text>
                        {(showBengali && condition.warning_signs_bn 
                          ? condition.warning_signs_bn 
                          : condition.warning_signs).slice(0, 3).map((sign, idx) => (
                          <Text key={idx} style={styles.warningList}>• {sign}</Text>
                        ))}
                      </View>
                    )}

                    <Button
                      title={showBengali ? 'এই রোগের ওষুধ দেখুন' : 'View Medicines for This Condition'}
                      variant="outline"
                      onPress={() => {
                        setActiveTab('medicines');
                        onConditionSelect?.(condition);
                      }}
                      style={{ marginTop: Theme.spacing.md }}
                    />
                  </CardContent>
                </Card>
              ))}
            </View>
          )}

          {/* Medicines Tab */}
          {activeTab === 'medicines' && (
            <View>
              {searchResult.medicines_suggested.map((medicine, index) => (
                <Card 
                  key={index} 
                  style={[
                    styles.medicineCard,
                    { borderLeftColor: getRecommendationColor(medicine.recommendation_level) }
                  ]}
                >
                  <CardHeader>
                    <View style={styles.medicineHeader}>
                      <View style={styles.medicineInfo}>
                        <Text style={styles.medicineName}>
                          {showBengali && medicine.brand_name_bn 
                            ? medicine.brand_name_bn 
                            : medicine.brand_name}
                        </Text>
                        <Text style={styles.medicineGeneric}>
                          {showBengali && medicine.generic_name_bn 
                            ? medicine.generic_name_bn 
                            : medicine.generic_name}
                        </Text>
                        <Text style={styles.medicineDetails}>
                          {medicine.manufacturer} • {medicine.strength} • {medicine.form}
                        </Text>
                      </View>
                      <View style={[
                        styles.recommendationBadge,
                        { backgroundColor: getRecommendationColor(medicine.recommendation_level) }
                      ]}>
                        <Ionicons 
                          name={getRecommendationIcon(medicine.recommendation_level)} 
                          size={12} 
                          color={Theme.colors.background} 
                        />
                        <Text style={[
                          styles.recommendationText,
                          { color: Theme.colors.background }
                        ]}>
                          {medicine.recommendation_level.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.medicineCondition}>
                      For: {showBengali && medicine.condition_treated_bn 
                        ? medicine.condition_treated_bn 
                        : medicine.condition_treated}
                    </Text>

                    <View style={styles.priceRange}>
                      <Ionicons name="pricetag" size={14} color={Theme.colors.textSecondary} />
                      <Text style={styles.priceText}>
                        ৳{medicine.price_range.min} - ৳{medicine.price_range.max}
                        {medicine.prescription_required && ' (Prescription Required)'}
                      </Text>
                    </View>

                    {medicine.common_dosage && (
                      <View style={styles.dosageInfo}>
                        <Text style={styles.dosageText}>
                          Dosage: {showBengali && medicine.common_dosage_bn 
                            ? medicine.common_dosage_bn 
                            : medicine.common_dosage}
                        </Text>
                      </View>
                    )}

                    {medicine.usage_notes && (
                      <Text style={styles.usageNotes}>
                        {showBengali && medicine.usage_notes_bn 
                          ? medicine.usage_notes_bn 
                          : medicine.usage_notes}
                      </Text>
                    )}

                    <View style={styles.medicineActions}>
                      <Button
                        title={showBengali ? 'বিস্তারিত দেখুন' : 'View Details'}
                        variant="outline"
                        onPress={() => {
                          // Navigate to medicine detail screen
                        }}
                        style={styles.actionButton}
                      />
                      <Button
                        title={showBengali ? 'নির্বাচন করুন' : 'Select Medicine'}
                        variant="primary"
                        onPress={() => onMedicineSelect?.(medicine)}
                        style={styles.actionButton}
                      />
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}

          {/* Disclaimers */}
          <Card style={styles.disclaimerCard}>
            <CardHeader>
              <Text style={styles.disclaimerTitle}>
                {showBengali ? 'গুরুত্বপূর্ণ সতর্কতা' : 'Important Disclaimers'}
              </Text>
            </CardHeader>
            <CardContent>
              {(showBengali ? searchResult.disclaimers_bn : searchResult.disclaimers).map((disclaimer, index) => (
                <View key={index} style={styles.disclaimerItem}>
                  <Ionicons name="warning" size={12} color={Theme.colors.error} />
                  <Text style={styles.disclaimerText}>{disclaimer}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        </View>
      )}
    </ScrollView>
  );
};