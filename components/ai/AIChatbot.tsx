import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { aiService } from '../../lib/ai-service';
import { Card, CardContent } from '../ui/Card';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatbotProps {
  visible: boolean;
  onClose: () => void;
  pharmacy: any;
  businessMetrics: any;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({
  visible,
  onClose,
  pharmacy,
  businessMetrics,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && messages.length === 0) {
      initializeChatbot();
    }
  }, [visible]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const initializeChatbot = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: `🤖 Hello! I'm your AI pharmacy assistant for ${pharmacy?.name || 'your pharmacy'}. I can help you with:\n\n• Business insights and analytics\n• Stock management advice\n• Customer service tips\n• Sales optimization\n• Operational efficiency\n• Medicine information\n\nWhat would you like to know about?`,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await generateAIResponse(inputText.trim());
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '⚠️ Sorry, I encountered an error. Please try again or ask a different question.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const generateAIResponse = async (userInput: string) => {
    const pharmacyContext = {
      pharmacyName: pharmacy?.name || 'Your Pharmacy',
      userId: pharmacy?.id || 'user',
      dailyRevenue: businessMetrics?.dailyRevenue || 0,
      totalRevenue: businessMetrics?.totalRevenue || 0,
      totalDue: businessMetrics?.totalDue || 0,
      totalStock: businessMetrics?.totalStock || 0,
      lowStockCount: businessMetrics?.lowStockCount || 0,
      totalCustomers: businessMetrics?.totalCustomers || 0,
      totalTransactions: businessMetrics?.totalTransactions || 0,
    };

    try {
      const response = await aiService.enhancedPharmacyChat(
        userInput,
        '', // No conversation ID for modal version
        pharmacyContext
      );

      return response.response || "I'm here to help! Could you please rephrase your question?";
    } catch (error) {
      console.error('Enhanced AI response generation failed:', error);
      return getDefaultResponse(userInput);
    }
  };

  const getDefaultResponse = (userInput: string) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('stock') || input.includes('inventory')) {
      return `📦 For stock management:\n\n• Keep track of low stock items (currently ${businessMetrics?.lowStockCount || 0})\n• Set up reorder points for fast-moving medicines\n• Regular stock audits help prevent losses\n• Consider seasonal demand patterns\n\nWould you like specific advice on any particular aspect?`;
    }
    
    if (input.includes('sales') || input.includes('revenue')) {
      return `💰 To improve sales:\n\n• Focus on customer service quality\n• Promote high-margin products\n• Offer health consultations\n• Implement loyalty programs\n• Follow up on due payments (৳${businessMetrics?.totalDue || 0} pending)\n\nWhat specific sales challenge can I help you with?`;
    }
    
    if (input.includes('customer') || input.includes('service')) {
      return `👥 For better customer service:\n\n• Greet customers warmly\n• Listen to their health concerns\n• Provide medicine usage guidance\n• Maintain patient privacy\n• Follow up on their well-being\n\nYour pharmacy serves ${businessMetrics?.totalCustomers || 0} customers. How can we improve their experience?`;
    }
    
    if (input.includes('medicine') || input.includes('drug')) {
      return `💊 For medicine-related queries:\n\n• Always verify prescriptions carefully\n• Check for drug interactions\n• Provide proper usage instructions\n• Monitor expiry dates regularly\n• Maintain proper storage conditions\n\n⚠️ For specific medical advice, always consult qualified healthcare professionals.`;
    }
    
    return `🤖 I'm here to help with your pharmacy business! I can assist with:\n\n• Stock and inventory management\n• Sales and revenue optimization\n• Customer service improvement\n• Business growth strategies\n• Operational efficiency\n\nWhat would you like to discuss?`;
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessageContainer : styles.botMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          message.isUser ? styles.userMessageBubble : styles.botMessageBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.isUser ? styles.userMessageText : styles.botMessageText,
          ]}
        >
          {message.text}
        </Text>
        <Text
          style={[
            styles.timestamp,
            message.isUser ? styles.userTimestamp : styles.botTimestamp,
          ]}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  const quickActions = [
    'How can I improve my sales?',
    'What should I do about low stock?',
    'How to handle customer complaints?',
    'Tips for better inventory management',
    'How to increase customer loyalty?',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🤖 AI Pharmacy Assistant</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Theme.colors.primary} />
              <Text style={styles.loadingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>💡 Quick Questions:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.quickActions}>
                {quickActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickActionButton}
                    onPress={() => {
                      setInputText(action);
                    }}
                  >
                    <Text style={styles.quickActionText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about your pharmacy..."
            placeholderTextColor={Theme.colors.textTertiary}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Text style={[
              styles.sendButtonText,
              (!inputText.trim() || loading) && styles.sendButtonTextDisabled,
            ]}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },

  closeButton: {
    padding: theme.spacing.xs,
  },

  closeButtonText: {
    fontSize: 24,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold as any,
  },

  messagesContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  messagesContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },

  messageContainer: {
    marginBottom: theme.spacing.md,
  },

  userMessageContainer: {
    alignItems: 'flex-end' as const,
  },

  botMessageContainer: {
    alignItems: 'flex-start' as const,
  },

  messageBubble: {
    maxWidth: '85%' as const,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },

  userMessageBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.borderRadius.sm,
  },

  botMessageBubble: {
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    // React Native shadow only
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  messageText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },

  userMessageText: {
    color: theme.colors.background,
  },

  botMessageText: {
    color: theme.colors.text,
  },

  timestamp: {
    fontSize: theme.typography.sizes.xs,
    opacity: 0.7,
  },

  userTimestamp: {
    color: theme.colors.background,
    textAlign: 'right' as const,
  },

  botTimestamp: {
    color: theme.colors.textTertiary,
  },

  loadingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
  },

  loadingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    fontStyle: 'italic' as const,
  },

  quickActionsContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  quickActionsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  quickActions: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
  },

  quickActionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  quickActionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },

  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  sendButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center' as const,
    minHeight: 40,
  },

  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },

  sendButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.background,
  },

  sendButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
}));