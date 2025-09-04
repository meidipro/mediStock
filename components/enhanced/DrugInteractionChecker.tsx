/**
 * DRUG INTERACTION CHECKER COMPONENT
 * Advanced drug interaction checking for prescription flow
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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

interface DrugInteraction {
  id: string;
  medicine1: string;
  medicine2: string;
  interaction_type: 'contraindicated' | 'major' | 'moderate' | 'minor';
  severity_level: number;
  description: string;
  description_bn?: string;
  clinical_effect: string;
  management_strategy: string;
  onset_time: string;
  duration: string;
  evidence_level: string;
  severity_color: string;
  action_required: string;
}

interface InteractionResult {
  has_interactions: boolean;
  total_interactions: number;
  severity_summary: {
    contraindicated: number;
    major: number;
    moderate: number;
    minor: number;
  };
  risk_level: 'CONTRAINDICATED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  interactions: DrugInteraction[];
  recommendations: string[];
}

interface DrugInteractionCheckerProps {
  medicines: string[];
  pharmacyId: string;
  patientReference?: string;
  onInteractionsFound?: (result: InteractionResult) => void;
  showMinorInteractions?: boolean;
}

export const DrugInteractionChecker: React.FC<DrugInteractionCheckerProps> = ({
  medicines,
  pharmacyId,
  patientReference,
  onInteractionsFound,
  showMinorInteractions = false,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);
  const [showBengali, setShowBengali] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (medicines.length >= 2) {
      checkInteractions();
    }
  }, [medicines, showMinorInteractions]);

  const checkInteractions = async () => {
    if (medicines.length < 2) {
      setInteractionResult(null);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('check_prescription_interactions', {
        medicine_names: medicines,
        pharmacy_id_param: pharmacyId,
        patient_reference_param: patientReference,
        include_minor: showMinorInteractions
      });

      if (error) {
        throw new Error(error.message);
      }

      setInteractionResult(data);
      
      if (onInteractionsFound) {
        onInteractionsFound(data);
      }

      // Log the interaction check
      if (data.has_interactions) {
        await supabase.rpc('log_prescription_interaction_check', {
          interaction_check_result: data,
          pharmacy_id_param: pharmacyId,
          patient_ref: patientReference
        });
      }

    } catch (err) {
      console.error('Drug interaction check failed:', err);
      setError(err.message || 'Failed to check drug interactions');
    } finally {
      setIsChecking(false);
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'contraindicated':
        return 'ban';
      case 'major':
        return 'alert-circle';
      case 'moderate':
        return 'warning';
      case 'minor':
        return 'information-circle';
      default:
        return 'help-circle';
    }
  };

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'contraindicated':
        return '#000000';
      case 'major':
        return Theme.colors.error;
      case 'moderate':
        return Theme.colors.warning;
      case 'minor':
        return Theme.colors.info;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CONTRAINDICATED':
        return '#000000';
      case 'HIGH':
        return Theme.colors.error;
      case 'MEDIUM':
        return Theme.colors.warning;
      case 'LOW':
        return Theme.colors.info;
      default:
        return Theme.colors.success;
    }
  };

  const handleAcknowledgeInteraction = async (interactionId: string) => {
    try {
      await supabase.rpc('update_interaction_status', {
        interaction_id_param: interactionId,
        new_status: 'reviewed',
        pharmacist_notes_param: 'Acknowledged by pharmacist'
      });
      
      Alert.alert('Success', 'Interaction acknowledged');
    } catch (error) {
      Alert.alert('Error', 'Failed to acknowledge interaction');
    }
  };

  const styles = createThemedStyles((theme) => ({
    container: {
      marginVertical: theme.spacing.md,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },

    headerTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    languageToggle: {
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
      padding: theme.spacing.md,
    },

    loadingText: {
      marginLeft: theme.spacing.sm,
      color: theme.colors.textSecondary,
    },

    errorContainer: {
      backgroundColor: theme.colors.errorLight,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },

    errorText: {
      color: theme.colors.error,
      fontSize: theme.typography.sizes.sm,
    },

    noInteractionsCard: {
      backgroundColor: theme.colors.successLight,
      borderColor: theme.colors.success,
      borderWidth: 1,
    },

    noInteractionsContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
    },

    noInteractionsText: {
      color: theme.colors.success,
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.medium,
      marginLeft: theme.spacing.sm,
    },

    summaryCard: {
      marginBottom: theme.spacing.md,
    },

    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },

    riskLevel: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      marginLeft: theme.spacing.sm,
    },

    severitySummary: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: theme.spacing.md,
    },

    severityItem: {
      alignItems: 'center',
    },

    severityCount: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
    },

    severityLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      textTransform: 'capitalize',
    },

    interactionCard: {
      marginBottom: theme.spacing.md,
      borderLeftWidth: 4,
    },

    interactionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    interactionTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    interactionMedicines: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
    },

    severityBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },

    severityText: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.background,
      textTransform: 'uppercase',
    },

    interactionDescription: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
      lineHeight: 20,
    },

    clinicalEffect: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },

    managementStrategy: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.sm,
    },

    managementTitle: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },

    managementText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      lineHeight: 18,
    },

    interactionDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },

    detailItem: {
      alignItems: 'center',
    },

    detailLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
    },

    detailValue: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
      marginTop: 2,
    },

    actionRequired: {
      backgroundColor: theme.colors.warningLight,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.sm,
    },

    actionText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.warning,
      fontWeight: theme.typography.weights.semiBold,
      textAlign: 'center',
    },

    interactionActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },

    acknowledgeButton: {
      flex: 1,
    },

    recommendationsCard: {
      marginTop: theme.spacing.md,
    },

    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },

    recommendationText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      flex: 1,
      marginLeft: theme.spacing.sm,
      lineHeight: 18,
    },

    medicinesList: {
      backgroundColor: theme.colors.backgroundSecondary,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.md,
    },

    medicinesTitle: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },

    medicineItem: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
  }));

  if (medicines.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Drug Interaction Check</Text>
        <Text style={styles.loadingText}>Add at least 2 medicines to check for interactions</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Drug Interaction Check</Text>
        <TouchableOpacity
          style={styles.languageToggle}
          onPress={() => setShowBengali(!showBengali)}
        >
          <Ionicons name="language" size={14} color={Theme.colors.text} />
          <Text style={styles.languageText}>{showBengali ? 'EN' : 'বাং'}</Text>
        </TouchableOpacity>
      </View>

      {/* Medicines being checked */}
      <View style={styles.medicinesList}>
        <Text style={styles.medicinesTitle}>Medicines being checked:</Text>
        {medicines.map((medicine, index) => (
          <Text key={index} style={styles.medicineItem}>• {medicine}</Text>
        ))}
      </View>

      {isChecking && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Checking for drug interactions...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {interactionResult && !isChecking && (
        <>
          {!interactionResult.has_interactions ? (
            <Card style={styles.noInteractionsCard}>
              <View style={styles.noInteractionsContent}>
                <Ionicons name="checkmark-circle" size={24} color={Theme.colors.success} />
                <Text style={styles.noInteractionsText}>No interactions detected</Text>
              </View>
            </Card>
          ) : (
            <>
              {/* Summary Card */}
              <Card style={styles.summaryCard}>
                <CardHeader>
                  <View style={styles.summaryHeader}>
                    <Ionicons 
                      name="alert-triangle" 
                      size={20} 
                      color={getRiskLevelColor(interactionResult.risk_level)} 
                    />
                    <Text style={styles.headerTitle}>Interaction Summary</Text>
                    <Text style={[
                      styles.riskLevel, 
                      { color: getRiskLevelColor(interactionResult.risk_level) }
                    ]}>
                      {interactionResult.risk_level} RISK
                    </Text>
                  </View>
                </CardHeader>
                <CardContent>
                  <View style={styles.severitySummary}>
                    {Object.entries(interactionResult.severity_summary).map(([key, count]) => (
                      <View key={key} style={styles.severityItem}>
                        <Text style={[
                          styles.severityCount, 
                          { color: getSeverityColor(key) }
                        ]}>
                          {count}
                        </Text>
                        <Text style={styles.severityLabel}>{key}</Text>
                      </View>
                    ))}
                  </View>
                </CardContent>
              </Card>

              {/* Individual Interactions */}
              <ScrollView showsVerticalScrollIndicator={false}>
                {interactionResult.interactions.map((interaction, index) => (
                  <Card 
                    key={index}
                    style={[
                      styles.interactionCard,
                      { borderLeftColor: interaction.severity_color }
                    ]}
                  >
                    <CardHeader>
                      <View style={styles.interactionHeader}>
                        <View style={styles.interactionTitle}>
                          <Ionicons 
                            name={getSeverityIcon(interaction.interaction_type)} 
                            size={18} 
                            color={interaction.severity_color} 
                          />
                          <Text style={styles.interactionMedicines}>
                            {interaction.medicine1} + {interaction.medicine2}
                          </Text>
                        </View>
                        <View style={[
                          styles.severityBadge,
                          { backgroundColor: interaction.severity_color }
                        ]}>
                          <Text style={styles.severityText}>
                            {interaction.interaction_type}
                          </Text>
                        </View>
                      </View>
                    </CardHeader>
                    <CardContent>
                      <Text style={styles.interactionDescription}>
                        {showBengali && interaction.description_bn 
                          ? interaction.description_bn 
                          : interaction.description}
                      </Text>
                      
                      {interaction.clinical_effect && (
                        <Text style={styles.clinicalEffect}>
                          Clinical Effect: {interaction.clinical_effect}
                        </Text>
                      )}

                      {interaction.management_strategy && (
                        <View style={styles.managementStrategy}>
                          <Text style={styles.managementTitle}>Management:</Text>
                          <Text style={styles.managementText}>
                            {interaction.management_strategy}
                          </Text>
                        </View>
                      )}

                      <View style={styles.interactionDetails}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Onset</Text>
                          <Text style={styles.detailValue}>{interaction.onset_time}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Duration</Text>
                          <Text style={styles.detailValue}>{interaction.duration}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Evidence</Text>
                          <Text style={styles.detailValue}>{interaction.evidence_level}</Text>
                        </View>
                      </View>

                      <View style={styles.actionRequired}>
                        <Text style={styles.actionText}>
                          {interaction.action_required}
                        </Text>
                      </View>

                      <View style={styles.interactionActions}>
                        <Button
                          title="Acknowledge"
                          variant="outline"
                          onPress={() => handleAcknowledgeInteraction(interaction.id)}
                          style={styles.acknowledgeButton}
                        />
                        <Button
                          title="Details"
                          variant="secondary"
                          onPress={() => {
                            // Navigate to detailed interaction view
                          }}
                          style={styles.acknowledgeButton}
                        />
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </ScrollView>

              {/* Recommendations */}
              <Card style={styles.recommendationsCard}>
                <CardHeader>
                  <Text style={styles.headerTitle}>Recommendations</Text>
                </CardHeader>
                <CardContent>
                  {interactionResult.recommendations.map((recommendation, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark" size={16} color={Theme.colors.primary} />
                      <Text style={styles.recommendationText}>{recommendation}</Text>
                    </View>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </View>
  );
};