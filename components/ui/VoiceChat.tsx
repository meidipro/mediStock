import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface VoiceChatProps {
  onVoiceInput: (text: string) => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  disabled?: boolean;
  language?: 'en' | 'bn';
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  onVoiceInput,
  onStartListening,
  onStopListening,
  disabled = false,
  language = 'en'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Speech Recognition (Voice Input)
  const startListening = async () => {
    if (disabled || isListening) return;

    try {
      setIsListening(true);
      onStartListening?.();

      // For web platform, we can use Web Speech API
      if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          onVoiceInput(transcript);
          setIsListening(false);
          onStopListening?.();
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          onStopListening?.();
          Alert.alert(
            language === 'bn' ? 'ভয়েস ইনপুট ত্রুটি' : 'Voice Input Error',
            language === 'bn' 
              ? 'দুঃখিত, আপনার কণ্ঠস্বর শুনতে পাচ্ছি না। আবার চেষ্টা করুন।'
              : 'Sorry, could not hear your voice. Please try again.'
          );
        };

        recognition.onend = () => {
          setIsListening(false);
          onStopListening?.();
        };

        recognition.start();
      } else {
        // For mobile platforms, show instruction
        Alert.alert(
          language === 'bn' ? 'ভয়েস ইনপুট' : 'Voice Input',
          language === 'bn' 
            ? 'ভয়েস ইনপুট বৈশিষ্ট্য শীঘ্রই আসছে। এখন টাইপ করে লিখুন।'
            : 'Voice input feature coming soon. Please type your message for now.'
        );
        setIsListening(false);
        onStopListening?.();
      }
    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
      onStopListening?.();
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Error',
        language === 'bn' 
          ? 'ভয়েস রিকগনিশন শুরু করতে পারছি না।'
          : 'Could not start voice recognition.'
      );
    }
  };

  const stopListening = () => {
    setIsListening(false);
    onStopListening?.();
  };

  // Text to Speech (Voice Output)
  const speakText = (text: string) => {
    if (isSpeaking) return;

    try {
      setIsSpeaking(true);

      // For web platform, we can use Web Speech API
      if (Platform.OS === 'web' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = () => {
          setIsSpeaking(false);
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        // For mobile platforms, show instruction
        Alert.alert(
          language === 'bn' ? 'ভয়েস আউটপুট' : 'Voice Output',
          language === 'bn' 
            ? 'ভয়েস আউটপুট বৈশিষ্ট্য শীঘ্রই আসছে।'
            : 'Voice output feature coming soon.'
        );
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsSpeaking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Voice Input Button */}
      <TouchableOpacity
        style={[
          styles.voiceButton,
          isListening && styles.listeningButton,
          disabled && styles.disabledButton,
        ]}
        onPress={isListening ? stopListening : startListening}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.voiceIcon, isListening && styles.listeningIcon]}>
          {isListening ? '🔴' : '🎤'}
        </Text>
        <Text style={[styles.voiceLabel, disabled && styles.disabledLabel]}>
          {isListening 
            ? (language === 'bn' ? 'শুনছি...' : 'Listening...') 
            : (language === 'bn' ? 'কথা বলুন' : 'Speak')
          }
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Export the speakText function for use in chat messages
export const speakMessage = (text: string, language: 'en' | 'bn' = 'en') => {
  if (Platform.OS === 'web' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }
};

const styles = createThemedStyles((theme) => ({
  container: {
    alignItems: 'center' as const,
    marginVertical: theme.spacing.sm,
  },

  voiceButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  listeningButton: {
    backgroundColor: theme.colors.error,
    transform: [{ scale: 1.05 }],
  },

  disabledButton: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },

  voiceIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },

  listeningIcon: {
    // Pulsing effect could be added with animation
  },

  voiceLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.medium as any,
  },

  disabledLabel: {
    color: theme.colors.textTertiary,
  },
}));

// Type declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}