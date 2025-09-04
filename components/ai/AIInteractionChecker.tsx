import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMedicineInteractions } from '../../hooks/useAI';
import { SaleItem } from '../../lib/types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface AIInteractionCheckerProps {
  medicines: SaleItem[];
  autoCheck?: boolean;
  onInteractionFound?: (interactions: any) => void;
}

export const AIInteractionChecker: React.FC<AIInteractionCheckerProps> = ({
  medicines,
  autoCheck = true,
  onInteractionFound,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [lastCheckedMedicines, setLastCheckedMedicines] = useState<string[]>([]);

  const {
    loading,
    interactions,
    error,
    checkInteractions,
    clearInteractions,
  } = useMedicineInteractions();

  const medicineNames = medicines.map(item => item.medicine_name);

  useEffect(() => {
    if (autoCheck && medicines.length > 1) {
      const currentMedicines = medicineNames.sort().join('|');
      const lastChecked = lastCheckedMedicines.sort().join('|');
      
      if (currentMedicines !== lastChecked) {
        handleCheckInteractions();
        setLastCheckedMedicines(medicineNames);
      }
    }
  }, [medicines, autoCheck]);

  useEffect(() => {
    if (interactions) {
      const hasSignificantInteractions = interactions.interactions.some(
        (interaction: any) => interaction.severity === 'high' || interaction.severity === 'moderate'
      );
      
      if (hasSignificantInteractions) {
        setIsVisible(true);
        onInteractionFound?.(interactions);
      }
    }
  }, [interactions, onInteractionFound]);

  const handleCheckInteractions = async () => {
    if (medicines.length < 2) {
      Alert.alert('Insufficient Medicines', 'Add at least 2 medicines to check for interactions');
      return;
    }

    await checkInteractions(medicineNames);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return Theme.colors.error;
      case 'moderate':
        return Theme.colors.warning;
      case 'low':
        return Theme.colors.info;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return '🚫';
      case 'moderate':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return Theme.colors.success;
    if (score >= 60) return Theme.colors.warning;
    return Theme.colors.error;
  };

  const getSafetyScoreText = (score: number) => {
    if (score >= 80) return 'Safe';
    if (score >= 60) return 'Caution';
    return 'Unsafe';
  };

  const renderInteraction = ({ item }: { item: any }) => (
    <Card style={[styles.interactionCard, { borderLeftColor: getSeverityColor(item.severity) }] as any}>
      <CardContent>
        <View style={styles.interactionHeader}>
          <Text style={styles.severityIcon}>{getSeverityIcon(item.severity)}</Text>
          <View style={styles.interactionInfo}>
            <Text style={styles.medicineNames}>
              {item.medicines.join(' + ')}
            </Text>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) + '20' }]}>
              <Text style={[styles.severityText, { color: getSeverityColor(item.severity) }]}>
                {item.severity.toUpperCase()} RISK
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.interactionDescription}>{item.description}</Text>
        
        <View style={styles.recommendationContainer}>
          <Text style={styles.recommendationTitle}>Recommendation:</Text>
          <Text style={styles.recommendationText}>{item.recommendation}</Text>
        </View>
      </CardContent>
    </Card>
  );

  if (medicines.length < 2 && !isVisible) {
    return (
      <Card style={styles.infoCard}>
        <CardContent>
          <Text style={styles.infoText}>
            🤖 Add multiple medicines to check for AI-powered drug interactions
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Check Button */}
      <Card style={styles.checkCard}>
        <CardContent>
          <View style={styles.checkHeader}>
            <View style={styles.checkInfo}>
              <Text style={styles.checkTitle}>🤖 AI Drug Interaction Checker</Text>
              <Text style={styles.checkSubtitle}>
                {medicines.length} medicines selected
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.checkButton}
              onPress={handleCheckInteractions}
              disabled={loading || medicines.length < 2}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Theme.colors.background} />
              ) : (
                <Text style={styles.checkButtonText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card style={styles.errorCard}>
          <CardContent>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {interactions && isVisible && (
        <View style={styles.resultsContainer}>
          {/* Safety Score */}
          <Card style={styles.safetyCard}>
            <CardContent>
              <View style={styles.safetyHeader}>
                <Text style={styles.safetyTitle}>Overall Safety Score</Text>
                <View style={styles.safetyScoreContainer}>
                  <Text style={[styles.safetyScore, { color: getSafetyScoreColor(interactions.safetyScore) }]}>
                    {interactions.safetyScore}/100
                  </Text>
                  <Text style={[styles.safetyStatus, { color: getSafetyScoreColor(interactions.safetyScore) }]}>
                    {getSafetyScoreText(interactions.safetyScore)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.safetyBarContainer}>
                <View style={styles.safetyBar}>
                  <View 
                    style={[
                      styles.safetyBarFill, 
                      { 
                        width: `${interactions.safetyScore}%`,
                        backgroundColor: getSafetyScoreColor(interactions.safetyScore)
                      }
                    ]} 
                  />
                </View>
              </View>
              
              {interactions.overallAdvice && (
                <Text style={styles.overallAdvice}>{interactions.overallAdvice}</Text>
              )}
            </CardContent>
          </Card>

          {/* Medicine List */}
          <Card style={styles.medicineListCard}>
            <CardHeader>
              <Text style={styles.medicineListTitle}>Medicines Being Checked</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.medicineChips}>
                {medicines.map((medicine, index) => (
                  <View key={index} style={styles.medicineChip}>
                    <Text style={styles.medicineChipText} numberOfLines={1}>
                      {medicine.medicine_name}
                    </Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>

          {/* Interactions List */}
          {interactions.interactions.length > 0 ? (
            <View style={styles.interactionsSection}>
              <Text style={styles.interactionsSectionTitle}>
                ⚠️ Found {interactions.interactions.length} Interaction(s)
              </Text>
              
              <FlatList
                data={interactions.interactions}
                renderItem={renderInteraction}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            </View>
          ) : (
            <Card style={styles.noInteractionsCard}>
              <CardContent>
                <Text style={styles.noInteractionsText}>
                  ✅ No significant drug interactions detected
                </Text>
                <Text style={styles.noInteractionsSubtext}>
                  These medicines appear safe to take together, but always consult a healthcare professional.
                </Text>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Hide Results"
              variant="outline"
              onPress={() => setIsVisible(false)}
              style={styles.actionButton}
            />
            <Button
              title="Clear & Recheck"
              variant="primary"
              onPress={() => {
                clearInteractions();
                setIsVisible(false);
                setTimeout(() => handleCheckInteractions(), 100);
              }}
              style={styles.actionButton}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
  },

  infoCard: {
    backgroundColor: theme.colors.info + '10',
    borderColor: theme.colors.info,
    borderWidth: 1,
  },

  infoText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.info,
    textAlign: 'center' as const,
  },

  checkCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },

  checkHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  checkInfo: {
    flex: 1,
  },

  checkTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  checkSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  checkButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center' as const,
  },

  checkButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
  },

  errorCard: {
    backgroundColor: theme.colors.error + '10',
    borderColor: theme.colors.error,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },

  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.sm,
  },

  resultsContainer: {
    flex: 1,
  },

  safetyCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
  },

  safetyHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.md,
  },

  safetyTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  safetyScoreContainer: {
    alignItems: 'flex-end' as const,
  },

  safetyScore: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
  },

  safetyStatus: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
  },

  safetyBarContainer: {
    marginBottom: theme.spacing.md,
  },

  safetyBar: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },

  safetyBarFill: {
    height: 8,
  },

  overallAdvice: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
  },

  medicineListCard: {
    marginBottom: theme.spacing.md,
  },

  medicineListTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  medicineChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  medicineChip: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    maxWidth: 150,
  },

  medicineChipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium as any,
  },

  interactionsSection: {
    marginBottom: theme.spacing.md,
  },

  interactionsSectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  interactionCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
  },

  interactionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.md,
  },

  severityIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },

  interactionInfo: {
    flex: 1,
  },

  medicineNames: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  severityBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },

  severityText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
  },

  interactionDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },

  recommendationContainer: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },

  recommendationTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  recommendationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  noInteractionsCard: {
    backgroundColor: theme.colors.success + '10',
    borderColor: theme.colors.success,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },

  noInteractionsText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },

  noInteractionsSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },

  actionButton: {
    flex: 1,
  },
}));