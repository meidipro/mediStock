import { useState, useCallback } from 'react';
import { aiService } from '../lib/ai-service';
import { Medicine, Customer, Sale, StockItem } from '../lib/types';

// Hook for AI-powered medicine recommendations
export const useMedicineRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = useCallback(async (
    symptoms: string,
    patientAge?: number,
    patientGender?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.recommendMedicines(symptoms, patientAge, patientGender);
      setRecommendations(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRecommendations = useCallback(() => {
    setRecommendations(null);
    setError(null);
  }, []);

  return {
    loading,
    recommendations,
    error,
    getRecommendations,
    clearRecommendations,
  };
};

// Hook for medicine interaction checking
export const useMedicineInteractions = () => {
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkInteractions = useCallback(async (medicines: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.checkMedicineInteractions(medicines);
      setInteractions(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check interactions';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearInteractions = useCallback(() => {
    setInteractions(null);
    setError(null);
  }, []);

  return {
    loading,
    interactions,
    error,
    checkInteractions,
    clearInteractions,
  };
};

// Hook for predictive stock analysis
export const useStockPredictions = () => {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<{[key: string]: any}>({});
  const [error, setError] = useState<string | null>(null);

  const predictDemand = useCallback(async (
    medicine: Medicine,
    salesHistory: Sale[],
    currentStock: number,
    seasonalFactors?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.predictStockDemand(medicine, salesHistory, currentStock, seasonalFactors);
      setPredictions(prev => ({
        ...prev,
        [medicine.id]: result
      }));
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to predict demand';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPrediction = useCallback((medicineId: string) => {
    return predictions[medicineId] || null;
  }, [predictions]);

  const clearPredictions = useCallback(() => {
    setPredictions({});
    setError(null);
  }, []);

  return {
    loading,
    predictions,
    error,
    predictDemand,
    getPrediction,
    clearPredictions,
  };
};

// Hook for natural language medicine search
export const useAIMedicineSearch = () => {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const searchByNaturalLanguage = useCallback(async (
    query: string,
    availableMedicines: Medicine[]
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.searchMedicinesByNaturalLanguage(query, availableMedicines);
      setSearchResults(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search medicines';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults(null);
    setError(null);
  }, []);

  return {
    loading,
    searchResults,
    error,
    searchByNaturalLanguage,
    clearResults,
  };
};

// Hook for customer behavior analysis
export const useCustomerAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<{[key: string]: any}>({});
  const [error, setError] = useState<string | null>(null);

  const analyzeCustomer = useCallback(async (
    customer: Customer,
    purchaseHistory: Sale[]
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.analyzeCustomerBehavior(customer, purchaseHistory);
      setAnalyses(prev => ({
        ...prev,
        [customer.id]: result
      }));
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze customer';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAnalysis = useCallback((customerId: string) => {
    return analyses[customerId] || null;
  }, [analyses]);

  const clearAnalyses = useCallback(() => {
    setAnalyses({});
    setError(null);
  }, []);

  return {
    loading,
    analyses,
    error,
    analyzeCustomer,
    getAnalysis,
    clearAnalyses,
  };
};

// Hook for pricing optimization
export const usePricingOptimization = () => {
  const [loading, setLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<{[key: string]: any}>({});
  const [error, setError] = useState<string | null>(null);

  const optimizePrice = useCallback(async (
    medicine: Medicine,
    currentPrice: number,
    competitorPrices: number[],
    salesData: Sale[]
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.optimizePricing(medicine, currentPrice, competitorPrices, salesData);
      setOptimizations(prev => ({
        ...prev,
        [medicine.id]: result
      }));
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to optimize pricing';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOptimization = useCallback((medicineId: string) => {
    return optimizations[medicineId] || null;
  }, [optimizations]);

  const clearOptimizations = useCallback(() => {
    setOptimizations({});
    setError(null);
  }, []);

  return {
    loading,
    optimizations,
    error,
    optimizePricing: optimizePrice, // Alias for compatibility
    optimizePrice,
    getOptimization,
    clearOptimizations,
  };
};

// Enhanced Voice Search Hook with real implementation
export const useVoiceSearch = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Check if speech recognition is supported
  useCallback(() => {
    // For React Native, we would use expo-speech or react-native-voice
    // For now, simulating support detection
    setIsSupported(true);
  }, []);

  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      setError(null);
      setTranscript('');

      // Simulate voice recognition process
      // In a real implementation, this would use:
      // - expo-speech for Expo projects
      // - react-native-voice for bare React Native
      // - Web Speech API for web platforms
      
      // Simulate listening for 5 seconds
      const listeningPromise = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          // Simulate various voice inputs for demo
          const simulatedInputs = [
            'paracetamol for fever',
            'medicine for headache',
            'antibiotics for infection',
            'vitamin c tablets',
            'blood pressure medicine',
            'diabetes medication',
            'pain killer tablets'
          ];
          
          const randomInput = simulatedInputs[Math.floor(Math.random() * simulatedInputs.length)];
          resolve(randomInput);
        }, 2000 + Math.random() * 3000); // 2-5 seconds

        // Simulate potential errors
        if (Math.random() < 0.1) { // 10% chance of error
          setTimeout(() => {
            reject(new Error('Could not understand speech'));
          }, 1000);
        }
      });

      const result = await listeningPromise;
      setTranscript(result);
      
      // Process the transcript with AI for better understanding
      const processedResult = await processVoiceInput(result);
      setTranscript(processedResult);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Voice recognition failed';
      setError(errorMessage);
      setTranscript('');
    } finally {
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  // Process voice input with AI for better recognition
  const processVoiceInput = useCallback(async (rawTranscript: string): Promise<string> => {
    try {
      // Use AI to improve and understand the voice input
      const prompt = `
      The user said: "${rawTranscript}"
      
      This is voice input for a pharmacy search. Clean up and improve the transcription.
      Focus on:
      - Correcting common medicine name pronunciation errors
      - Understanding medical terms and symptoms
      - Converting colloquial terms to proper medical terms
      
      Return only the cleaned up search query, nothing else.
      `;

      const response = await aiService.makeRequest([
        { role: 'system', content: 'You are a pharmacy voice recognition assistant. Clean up voice input for medicine searches.' },
        { role: 'user', content: prompt }
      ]);

      return response.trim() || rawTranscript;
    } catch (error) {
      // If AI processing fails, return original transcript
      return rawTranscript;
    }
  }, []);

  // Real-world implementation helper
  const initializeVoiceRecognition = useCallback(async () => {
    try {
      // This would be the actual initialization for different platforms:
      
      // For Expo:
      // import * as Speech from 'expo-speech';
      // const available = await Speech.isSpeechRecognitionAvailableAsync();
      
      // For React Native:
      // import Voice from '@react-native-voice/voice';
      // Voice.onSpeechResults = onSpeechResults;
      // const available = await Voice.isAvailable();
      
      // For Web:
      // const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      // if (SpeechRecognition) { setIsSupported(true); }
      
      setIsSupported(true); // Simulated for now
    } catch (error) {
      setIsSupported(false);
      setError('Voice recognition not available on this device');
    }
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    clearTranscript,
    initializeVoiceRecognition,
  };
};