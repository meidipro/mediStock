import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useAIMedicineSearch, useMedicineRecommendations, useVoiceSearch } from '../../hooks/useAI';
import { useMedicines } from '../../hooks/useDatabase';
import { Medicine } from '../../lib/types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface AISearchInputProps {
  placeholder?: string;
  onSelect: (medicine: Medicine) => void;
  onRecommendation?: (recommendations: any) => void;
  showRecommendations?: boolean;
}

export const AISearchInput: React.FC<AISearchInputProps> = ({
  placeholder = "Search medicines or describe symptoms...",
  onSelect,
  onRecommendation,
  showRecommendations = true,
}) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  
  const { medicines, fetchMedicines } = useMedicines();
  const { 
    loading: searchLoading, 
    searchResults, 
    searchByNaturalLanguage,
    clearResults 
  } = useAIMedicineSearch();
  
  const {
    loading: recommendationLoading,
    recommendations,
    getRecommendations,
    clearRecommendations
  } = useMedicineRecommendations();

  const {
    isListening,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
    clearTranscript
  } = useVoiceSearch();

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
      handleSearch(transcript);
    }
  }, [transcript]);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setShowResults(false);
      clearResults();
      return;
    }

    setShowResults(true);
    await searchByNaturalLanguage(searchQuery, medicines);
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    
    // Debounce the search
    clearTimeout((handleQueryChange as any).timeout);
    (handleQueryChange as any).timeout = setTimeout(() => {
      handleSearch(text);
    }, 500);
  };

  const handleMedicineSelect = (searchResult: any) => {
    onSelect(searchResult.medicine);
    setQuery('');
    setShowResults(false);
    clearResults();
  };

  const handleGetRecommendations = async () => {
    if (!query.trim()) {
      Alert.alert('Enter Symptoms', 'Please describe the symptoms to get AI recommendations');
      return;
    }

    const result = await getRecommendations(query);
    if (result && onRecommendation) {
      onRecommendation(result);
      setShowRecommendationModal(true);
    }
  };

  const handleVoiceSearch = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      startListening();
    }
  };

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleMedicineSelect(item)}
    >
      <View style={styles.resultContent}>
        <Text style={styles.medicineName}>{item.medicine.generic_name}</Text>
        {item.medicine.brand_name && (
          <Text style={styles.brandName}>{item.medicine.brand_name}</Text>
        )}
        <Text style={styles.matchReason}>{item.matchReason}</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{item.relevanceScore}% match</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRecommendation = ({ item }: { item: any }) => (
    <Card style={styles.recommendationCard}>
      <CardContent>
        <View style={styles.recommendationHeader}>
          <Text style={styles.recommendationMedicine}>{item.medicine}</Text>
          <View style={[styles.confidenceBadge, { backgroundColor: Theme.colors.success + '20' }]}>
            <Text style={[styles.confidenceText, { color: Theme.colors.success }]}>
              {item.confidence}%
            </Text>
          </View>
        </View>
        <Text style={styles.recommendationReason}>{item.reason}</Text>
        <Text style={styles.recommendationDosage}>Suggested: {item.dosage}</Text>
        <Text style={styles.recommendationCategory}>Category: {item.category}</Text>
      </CardContent>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={query}
          onChangeText={handleQueryChange}
          multiline
          numberOfLines={2}
        />
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            onPress={handleVoiceSearch}
          >
            <Text style={styles.voiceButtonText}>
              {isListening ? '🛑' : '🎤'}
            </Text>
          </TouchableOpacity>
          
          {showRecommendations && (
            <TouchableOpacity
              style={styles.aiButton}
              onPress={handleGetRecommendations}
              disabled={recommendationLoading}
            >
              {recommendationLoading ? (
                <ActivityIndicator size="small" color={Theme.colors.background} />
              ) : (
                <Text style={styles.aiButtonText}>🤖 AI</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {voiceError && (
        <Text style={styles.errorText}>{voiceError}</Text>
      )}

      {searchResults && searchResults.interpretation && (
        <Card style={styles.interpretationCard}>
          <CardContent>
            <Text style={styles.interpretationText}>
              💡 {searchResults.interpretation}
            </Text>
          </CardContent>
        </Card>
      )}

      {showResults && (
        <View style={styles.resultsContainer}>
          {searchLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
              <Text style={styles.loadingText}>AI is analyzing your search...</Text>
            </View>
          ) : searchResults?.matches?.length > 0 ? (
            <FlatList
              data={searchResults.matches}
              renderItem={renderSearchResult}
              keyExtractor={(item, index) => `${item.medicine.id}-${index}`}
              style={styles.resultsList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No medicines found</Text>
              {searchResults?.suggestions && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Try these suggestions:</Text>
                  {searchResults.suggestions.map((suggestion: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => handleQueryChange(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* AI Recommendations Modal */}
      <Modal
        visible={showRecommendationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🤖 AI Medicine Recommendations</Text>
            <TouchableOpacity
              onPress={() => setShowRecommendationModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {recommendations && (
            <FlatList
              data={recommendations.recommendations}
              renderItem={renderRecommendation}
              keyExtractor={(item, index) => index.toString()}
              style={styles.recommendationsList}
              ListHeaderComponent={() => (
                <View style={styles.recommendationHeader}>
                  <Text style={styles.symptomsText}>For symptoms: &quot;{query}&quot;</Text>
                  {recommendations.advice && (
                    <Card style={styles.adviceCard}>
                      <CardContent>
                        <Text style={styles.adviceTitle}>💡 General Advice</Text>
                        <Text style={styles.adviceText}>{recommendations.advice}</Text>
                      </CardContent>
                    </Card>
                  )}
                  {recommendations.warnings?.length > 0 && (
                    <Card style={styles.warningsCard}>
                      <CardContent>
                        <Text style={styles.warningsTitle}>⚠️ Important Warnings</Text>
                        {recommendations.warnings.map((warning: string, index: number) => (
                          <Text key={index} style={styles.warningText}>• {warning}</Text>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </View>
              )}
              ListFooterComponent={() => (
                <View style={styles.modalFooter}>
                  <Button
                    title="Close"
                    variant="primary"
                    onPress={() => setShowRecommendationModal(false)}
                    fullWidth
                  />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
  },

  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: theme.spacing.sm,
  },

  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    textAlignVertical: 'top' as const,
    minHeight: 50,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
  },

  voiceButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  voiceButtonActive: {
    backgroundColor: theme.colors.error,
  },

  voiceButtonText: {
    fontSize: 20,
  },

  aiButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 60,
  },

  aiButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
  },

  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.xs,
  },

  interpretationCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },

  interpretationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontStyle: 'italic' as const,
  },

  resultsContainer: {
    marginTop: theme.spacing.md,
  },

  loadingContainer: {
    alignItems: 'center' as const,
    padding: theme.spacing.lg,
  },

  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },

  resultsList: {
    maxHeight: 300,
  },

  resultItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  resultContent: {
    flex: 1,
  },

  medicineName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  brandName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  matchReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic' as const,
  },

  confidenceBadge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },

  confidenceText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium as any,
  },

  noResultsContainer: {
    alignItems: 'center' as const,
    padding: theme.spacing.lg,
  },

  noResultsText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },

  suggestionsContainer: {
    width: '100%' as const,
  },

  suggestionsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  suggestionChip: {
    backgroundColor: theme.colors.backgroundTertiary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },

  suggestionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
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
    padding: theme.spacing.xs,
  },

  closeButtonText: {
    fontSize: 24,
    color: theme.colors.background,
  },

  recommendationsList: {
    flex: 1,
    padding: theme.spacing.md,
  },

  recommendationHeader: {
    marginBottom: theme.spacing.md,
  },

  symptomsText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  adviceCard: {
    backgroundColor: theme.colors.success + '10',
    borderColor: theme.colors.success,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },

  adviceTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },

  adviceText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  warningsCard: {
    backgroundColor: theme.colors.warning + '10',
    borderColor: theme.colors.warning,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },

  warningsTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },

  warningText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },

  recommendationCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },

  recommendationMedicine: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    flex: 1,
  },

  recommendationReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },

  recommendationDosage: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium as any,
  },

  recommendationCategory: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  modalFooter: {
    padding: theme.spacing.md,
  },
}));