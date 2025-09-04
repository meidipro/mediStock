import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { aiService } from '../../lib/ai-service';
import { Card, CardContent } from './Card';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  usesDifyKnowledge?: boolean;
  sources?: string[];
}

interface AISidebarChatbotProps {
  isVisible: boolean;
  onToggle: () => void;
  pharmacy: any;
  businessMetrics: any;
}

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(400, screenWidth * 0.9);

export const AISidebarChatbot: React.FC<AISidebarChatbotProps> = ({
  isVisible,
  onToggle,
  pharmacy,
  businessMetrics,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Animate sidebar in/out
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isVisible]);

  // Initialize chatbot when opened
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      initializeChatbot();
    }
  }, [isVisible]);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const initializeChatbot = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: `👨‍⚕️ **Welcome! I'm your AI Doctor Assistant**\n\nI'm here to help you with professional pharmacy guidance powered by advanced AI technology.\n\n**🏥 Medical Expertise:**\n💊 Medicine information & drug interactions\n📋 Dosage recommendations & safety advice\n⚠️ Side effects & contraindications\n🩺 Symptom-based medicine suggestions\n\n**📊 Business Intelligence:**\n📈 Real-time pharmacy analytics\n📦 Smart inventory management\n💰 Sales optimization strategies\n👥 Customer service excellence\n🇧🇩 Bangladesh pharmacy compliance\n\n**✨ Quick Examples:**\n• "What medicines help with fever and headache?"\n• "Show me today's low stock items"\n• "Check interactions for Paracetamol + Aspirin"\n• "How can I improve my pharmacy sales?"\n\nHow can I assist ${pharmacy?.name || 'your pharmacy'} today? 🚀`,
      isUser: false,
      timestamp: new Date(),
      usesDifyKnowledge: false,
    };
    setMessages([welcomeMessage]);
    setConversationId(Date.now().toString());
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
    const currentInput = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      const pharmacyContext = {
        pharmacyName: pharmacy?.name || 'Your Pharmacy',
        userId: pharmacy?.id || 'user',
        dailyRevenue: businessMetrics?.dailyRevenue || 0,
        totalDue: businessMetrics?.totalDue || 0,
        lowStockCount: businessMetrics?.lowStockCount || 0,
        totalCustomers: businessMetrics?.totalCustomers || 0,
      };

      const response = await aiService.enhancedPharmacyChat(
        currentInput,
        conversationId,
        pharmacyContext
      );
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        usesDifyKnowledge: response.usesDifyKnowledge,
        sources: response.sources,
      };

      setMessages(prev => [...prev, botMessage]);
      setConversationId(response.conversationId);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '⚠️ **Connection Issue**\n\nI encountered a temporary problem. Here are some things you can try:\n\n• Check your internet connection\n• Verify your API keys are configured\n• Try a simpler question\n• Restart the conversation\n\nI apologize for the inconvenience! 🛠️',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId('');
    initializeChatbot();
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
        {!message.isUser && message.usesDifyKnowledge && (
          <View style={styles.knowledgeBaseBadge}>
            <Text style={styles.knowledgeBaseBadgeText}>🧠 Knowledge Base</Text>
          </View>
        )}
        
        <Text
          style={[
            styles.messageText,
            message.isUser ? styles.userMessageText : styles.botMessageText,
          ]}
        >
          {message.text}
        </Text>
        
        {message.sources && message.sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            <Text style={styles.sourcesTitle}>📚 Sources:</Text>
            {message.sources.map((source, index) => (
              <Text key={index} style={styles.sourceText}>• {source}</Text>
            ))}
          </View>
        )}
        
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

  const quickSuggestions = [
    '🩺 What medicines help with fever and headache?',
    '💊 Tell me about Paracetamol drug interactions',
    '📊 Show me today\'s business performance',
    '⚠️ Check safety of Napa with blood pressure meds',
    '📦 Which medicines are running low in stock?',
    '📈 How can I improve my pharmacy sales?',
  ];

  return (
    <>
      {/* Backdrop */}
      {isVisible && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onToggle}
          activeOpacity={1}
        />
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
            width: SIDEBAR_WIDTH,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>👨‍⚕️ AI Doctor</Text>
              <Text style={styles.headerSubtitle}>Your Smart Health Assistant</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={clearConversation} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>🔄</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onToggle} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
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
                <Text style={styles.loadingText}>
                  {messages.length <= 1 ? 'Initializing MediBot...' : 'AI is thinking...'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Suggestions */}
          {messages.length <= 1 && !loading && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>💡 Try asking:</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {quickSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionButton}
                    onPress={() => setInputText(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
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
              maxLength={1000}
              editable={!loading}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
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
                {loading ? '⏳' : '🚀'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
};

const styles = createThemedStyles((theme) => ({
  backdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },

  sidebar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    zIndex: 1000,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },

  container: {
    flex: 1,
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

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },

  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    opacity: 0.8,
  },

  headerActions: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
  },

  clearButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  clearButtonText: {
    fontSize: 16,
    color: theme.colors.background,
  },

  closeButton: {
    padding: theme.spacing.xs,
  },

  closeButtonText: {
    fontSize: 20,
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
    maxWidth: '90%' as const,
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
    // React Native shadow only (no web boxShadow)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  knowledgeBaseBadge: {
    backgroundColor: theme.colors.info + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    alignSelf: 'flex-start' as const,
  },

  knowledgeBaseBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    fontWeight: theme.typography.weights.semibold as any,
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

  sourcesContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },

  sourcesTitle: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  sourceText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    lineHeight: 14,
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
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start' as const,
  },

  loadingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    fontStyle: 'italic' as const,
  },

  suggestionsContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    maxHeight: 200,
  },

  suggestionsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  suggestionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  suggestionText: {
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
    textAlignVertical: 'top' as const,
  },

  sendButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center' as const,
    minHeight: 40,
    minWidth: 50,
  },

  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },

  sendButtonText: {
    fontSize: theme.typography.sizes.lg,
    textAlign: 'center' as const,
  },

  sendButtonTextDisabled: {
    opacity: 0.5,
  },
}));