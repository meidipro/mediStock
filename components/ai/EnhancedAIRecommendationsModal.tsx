import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useMedicineRecommendations, useVoiceSearch } from '../../hooks/useAI';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface EnhancedAIRecommendationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMedicine: (medicine: any) => void;
  availableMedicines: any[];
}

export const EnhancedAIRecommendationsModal: React.FC<EnhancedAIRecommendationsModalProps> = ({
  visible,
  onClose,
  onSelectMedicine,
  availableMedicines,
}) => {
  const [symptoms, setSymptoms] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female' | ''>('');
  const [searchMode, setSearchMode] = useState<'symptoms' | 'voice' | 'category'>('symptoms');

  const {
    loading: recommendationLoading,
    recommendations,
    getRecommendations,
    clearRecommendations,
  } = useMedicineRecommendations();

  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported,
    startListening,
    stopListening,
    clearTranscript,
    initializeVoiceRecognition,
  } = useVoiceSearch();

  useEffect(() => {
    if (visible) {
      initializeVoiceRecognition();
    }
  }, [visible, initializeVoiceRecognition]);

  useEffect(() => {
    if (transcript) {
      setSymptoms(transcript);
    }
  }, [transcript]);

  const handleGetRecommendations = async () => {
    if (!symptoms.trim()) {
      Alert.alert('Input Required', 'Please enter symptoms or use voice search');
      return;
    }

    const age = patientAge ? parseInt(patientAge) : undefined;
    const result = await getRecommendations(symptoms.trim(), age, patientGender || undefined);
    
    if (result && result.recommendations.length === 0) {
      Alert.alert(
        'No Recommendations',
        'AI could not find specific recommendations for these symptoms. Please consult a healthcare professional.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSelectRecommendation = (recommendation: any) => {
    // Find matching medicine from available medicines
    const matchingMedicine = availableMedicines.find(medicine => 
      medicine.generic_name.toLowerCase().includes(recommendation.medicine.toLowerCase()) ||
      (medicine.brand_name && medicine.brand_name.toLowerCase().includes(recommendation.medicine.toLowerCase()))
    );

    if (matchingMedicine) {
      onSelectMedicine(matchingMedicine);
      handleClose();
    } else {
      Alert.alert(
        'Medicine Not Available',
        `${recommendation.medicine} is not currently in stock. Would you like to add it to your wishlist?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add to Wishlist', onPress: () => {
            Alert.alert('Added', 'Medicine added to wishlist for future ordering');
          }}
        ]
      );
    }
  };

  const handleClose = () => {
    clearRecommendations();
    clearTranscript();
    setSymptoms('');
    setPatientAge('');
    setPatientGender('');
    onClose();
  };

  const handleVoiceSearch = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return Theme.colors.success;
    if (confidence >= 60) return Theme.colors.warning;
    return Theme.colors.error;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return Theme.colors.error;
      case 'moderate':
        return Theme.colors.warning;
      case 'low':
        return Theme.colors.success;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[
          styles.modeButton,
          searchMode === 'symptoms' && styles.activeModeButton
        ]}
        onPress={() => setSearchMode('symptoms')}
      >
        <Text style={[
          styles.modeButtonText,
          searchMode === 'symptoms' && styles.activeModeButtonText
        ]}>
          💊 Symptoms
        </Text>
      </TouchableOpacity>
      
      {isSupported && (
        <TouchableOpacity
          style={[
            styles.modeButton,
            searchMode === 'voice' && styles.activeModeButton
          ]}
          onPress={() => setSearchMode('voice')}
        >
          <Text style={[
            styles.modeButtonText,
            searchMode === 'voice' && styles.activeModeButtonText
          ]}>
            🎤 Voice
          </Text>
        </TouchableOpacity>
      )}
      
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
    </View>
  );

  const renderSymptomsInput = () => (
    <Card style={styles.inputCard}>
      <CardHeader>
        <Text style={styles.inputTitle}>Describe Symptoms</Text>
      </CardHeader>
      <CardContent>
        <TextInput
          style={styles.symptomsInput}
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="e.g., fever, headache, stomach pain..."
          placeholderTextColor={Theme.colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        
        <View style={styles.patientInfoRow}>
          <View style={styles.ageInput}>
            <Text style={styles.inputLabel}>Age (optional)</Text>
            <TextInput
              style={styles.ageTextInput}
              value={patientAge}
              onChangeText={setPatientAge}
              placeholder="25"
              placeholderTextColor={Theme.colors.textTertiary}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
          
          <View style={styles.genderSelector}>
            <Text style={styles.inputLabel}>Gender (optional)</Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  patientGender === 'male' && styles.activeGenderButton
                ]}
                onPress={() => setPatientGender(patientGender === 'male' ? '' : 'male')}
              >
                <Text style={[
                  styles.genderButtonText,
                  patientGender === 'male' && styles.activeGenderButtonText
                ]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  patientGender === 'female' && styles.activeGenderButton
                ]}
                onPress={() => setPatientGender(patientGender === 'female' ? '' : 'female')}
              >
                <Text style={[
                  styles.genderButtonText,
                  patientGender === 'female' && styles.activeGenderButtonText
                ]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const renderVoiceInput = () => (
    <Card style={styles.inputCard}>
      <CardHeader>
        <Text style={styles.inputTitle}>🎤 Voice Search</Text>
      </CardHeader>
      <CardContent>
        <View style={styles.voiceContainer}>
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isListening && styles.listeningButton
            ]}
            onPress={handleVoiceSearch}
            disabled={!isSupported}
          >
            <Text style={styles.voiceButtonIcon}>
              {isListening ? '🔴' : '🎤'}
            </Text>
            <Text style={styles.voiceButtonText}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </Text>
          </TouchableOpacity>
          
          {transcript && (
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptLabel}>You said:</Text>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          )}
          
          {voiceError && (
            <Text style={styles.errorText}>{voiceError}</Text>
          )}
          
          {!isSupported && (
            <Text style={styles.notSupportedText}>
              Voice search is not supported on this device
            </Text>
          )}
        </View>
      </CardContent>
    </Card>
  );

  const renderCategoryInput = () => {
    const commonCategories = [
      'Pain Relief', 'Fever', 'Cold & Flu', 'Digestive', 'Allergy',
      'Blood Pressure', 'Diabetes', 'Heart', 'Vitamins', 'Antibiotics'
    ];

    return (
      <Card style={styles.inputCard}>
        <CardHeader>
          <Text style={styles.inputTitle}>📂 Browse by Category</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.categoriesGrid}>
            {commonCategories.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.categoryButton}
                onPress={() => {
                  setSymptoms(`medicines for ${category.toLowerCase()}`);
                }}
              >
                <Text style={styles.categoryButtonText}>{category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderRecommendations = () => {
    if (!recommendations || recommendations.recommendations.length === 0) {
      return null;
    }

    return (
      <ScrollView style={styles.recommendationsContainer}>
        {/* AI Recommendations */}
        <Card style={styles.recommendationsCard}>
          <CardHeader>
            <Text style={styles.recommendationsTitle}>🤖 AI Recommendations</Text>
          </CardHeader>
          <CardContent>
            {recommendations.recommendations.map((rec: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.recommendationItem}
                onPress={() => handleSelectRecommendation(rec)}
              >
                <View style={styles.recommendationHeader}>
                  <Text style={styles.medicineName}>{rec.medicine}</Text>
                  <View style={[
                    styles.confidenceBadge,
                    { backgroundColor: getConfidenceColor(rec.confidence) + '20' }
                  ]}>
                    <Text style={[
                      styles.confidenceText,
                      { color: getConfidenceColor(rec.confidence) }
                    ]}>
                      {rec.confidence}%
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.medicineCategory}>{rec.category}</Text>
                <Text style={styles.medicineReason}>{rec.reason}</Text>
                <Text style={styles.medicineDosage}>💊 {rec.dosage}</Text>
              </TouchableOpacity>
            ))}
          </CardContent>
        </Card>

        {/* Warnings */}
        {recommendations.warnings && recommendations.warnings.length > 0 && (
          <Card style={styles.warningsCard}>
            <CardHeader>
              <Text style={styles.warningsTitle}>⚠️ Important Warnings</Text>
            </CardHeader>
            <CardContent>
              {recommendations.warnings.map((warning: string, index: number) => (
                <Text key={index} style={styles.warningText}>• {warning}</Text>
              ))}
            </CardContent>
          </Card>
        )}

        {/* General Advice */}
        {recommendations.advice && (
          <Card style={styles.adviceCard}>
            <CardHeader>
              <Text style={styles.adviceTitle}>💡 Medical Advice</Text>
            </CardHeader>
            <CardContent>
              <Text style={styles.adviceText}>{recommendations.advice}</Text>
              <Text style={styles.disclaimerText}>
                ⚠️ This is AI-generated advice. Always consult with a qualified healthcare professional before taking any medication.
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🤖 AI Medicine Recommendations</Text>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderModeSelector()}
          
          {searchMode === 'symptoms' && renderSymptomsInput()}
          {searchMode === 'voice' && renderVoiceInput()}
          {searchMode === 'category' && renderCategoryInput()}

          <View style={styles.actionButtonsContainer}>
            <Button
              title="Get AI Recommendations"
              variant="primary"
              onPress={handleGetRecommendations}
              loading={recommendationLoading}
              disabled={!symptoms.trim() || recommendationLoading}
              fullWidth
            />
          </View>

          {renderRecommendations()}
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
    fontSize: theme.typography.sizes.lg,
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

  inputCard: {
    marginBottom: theme.spacing.lg,
  },

  inputTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  symptomsInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    minHeight: 100,
    marginBottom: theme.spacing.md,
  },

  patientInfoRow: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
  },

  ageInput: {
    flex: 1,
  },

  inputLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  ageTextInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  genderSelector: {
    flex: 1,
  },

  genderButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
  },

  genderButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  activeGenderButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  genderButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  activeGenderButtonText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
  },

  voiceContainer: {
    alignItems: 'center' as const,
  },

  voiceButton: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },

  listeningButton: {
    backgroundColor: theme.colors.error + '20',
    borderColor: theme.colors.error,
  },

  voiceButtonIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },

  voiceButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
  },

  transcriptContainer: {
    width: '100%' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },

  transcriptLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  transcriptText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
  },

  errorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
    textAlign: 'center' as const,
  },

  notSupportedText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },

  categoriesGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  categoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  categoryButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },

  actionButtonsContainer: {
    marginBottom: theme.spacing.lg,
  },

  recommendationsContainer: {
    flex: 1,
  },

  recommendationsCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },

  recommendationsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  recommendationItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },

  recommendationHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  medicineName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    flex: 1,
  },

  confidenceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },

  confidenceText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
  },

  medicineCategory: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },

  medicineReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },

  medicineDosage: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.info,
    fontWeight: theme.typography.weights.medium as any,
  },

  warningsCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },

  warningsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.warning,
  },

  warningText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  adviceCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },

  adviceTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.info,
  },

  adviceText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },

  disclaimerText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.error,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.sm,
  },
}));