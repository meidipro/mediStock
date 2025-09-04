import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Sidebar } from '../components/ui/Sidebar';
import { speakMessage } from '../components/ui/VoiceChat';
import { Theme, createThemedStyles } from '../constants/Theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCustomers, useSales, useStock } from '../hooks/useDatabase';
import { aiService } from '../lib/ai-service';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  usesDifyKnowledge?: boolean;
  sources?: string[];
  language?: 'en' | 'bn';
}

export default function AIDoctorScreen() {
  const { pharmacy } = useAuth();
  const { sales } = useSales();
  const { lowStockItems } = useStock();
  const { customers } = useCustomers();
  const { language, setLanguage, t } = useLanguage();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [rateLimitMessage, setRateLimitMessage] = useState<string>('');

  // Calculate business metrics for AI context
  const businessMetrics = {
    dailyRevenue: sales
      .filter(sale => 
        new Date(sale.created_at).toDateString() === new Date().toDateString()
      )
      .reduce((sum, sale) => sum + sale.total_amount, 0),
    totalDue: sales.reduce((sum, sale) => sum + sale.due_amount, 0),
    lowStockCount: lowStockItems.length,
    totalCustomers: customers.length,
    totalTransactions: sales.length,
  };

  // Initialize AI Doctor when screen loads
  useEffect(() => {
    initializeAIDoctor();
  }, []);

  // Auto-scroll to bottom only when new messages are added (not on initial load)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const initializeAIDoctor = () => {
    // No initial message - clean start
    setMessages([]);
    // Generate proper UUID for conversation ID
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    setConversationId(generateUUID());
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    // Simple rate limiting - prevent sending messages too quickly
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;
    const MIN_DELAY = 3000; // 3 seconds between messages
    
    if (timeSinceLastMessage < MIN_DELAY) {
      const waitTime = Math.ceil((MIN_DELAY - timeSinceLastMessage) / 1000);
      setRateLimitMessage(`Please wait ${waitTime} seconds before sending another message...`);
      setTimeout(() => setRateLimitMessage(''), 2000);
      return;
    }
    
    setLastMessageTime(now);
    setRateLimitMessage('');

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
        dailyRevenue: businessMetrics.dailyRevenue,
        totalDue: businessMetrics.totalDue,
        lowStockCount: businessMetrics.lowStockCount,
        totalCustomers: businessMetrics.totalCustomers,
        totalTransactions: businessMetrics.totalTransactions,
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
        language: response.language,
      };

      setMessages(prev => [...prev, botMessage]);
      setConversationId(response.conversationId);
      
      // Speak the response if it's not too long
      if (response.response.length < 500) {
        speakMessage(response.response, response.language);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '⚠️ **Connection Issue**\n\nI encountered a temporary problem. Please try again or ask a different question.\n\n• Check your internet connection\n• Verify your API keys are configured\n• Try a simpler question\n\nI apologize for the inconvenience! 🛠️',
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
    initializeAIDoctor();
  };

  const handleVoiceInput = (text: string) => {
    setInputText(text);
    // Auto-send voice input
    if (text.trim()) {
      setTimeout(() => sendMessage(), 500);
    }
  };

  const handleStartListening = () => {
    setIsListening(true);
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessageContainer : styles.botMessageContainer,
      ]}
    >
      {/* Avatar and Message Row */}
      <View style={[styles.messageRow, message.isUser && styles.userMessageRow]}>
        {/* Bot Avatar (left side) */}
        {!message.isUser && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>👨‍⚕️</Text>
          </View>
        )}
        
        {/* User Avatar (right side) - render first for flex-end alignment */}
        {message.isUser && (
          <View style={[styles.avatarContainer, styles.userAvatarContainer]}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
        )}
        
        {/* Message Content */}
        <View
          style={[
            styles.messageBubble,
            message.isUser ? styles.userMessageBubble : styles.botMessageBubble,
          ]}
        >
          {/* Knowledge Base Badge */}
          {!message.isUser && message.usesDifyKnowledge && (
            <View style={styles.knowledgeBaseBadge}>
              <Text style={styles.knowledgeBaseBadgeText}>🧠 Medical Knowledge</Text>
            </View>
          )}
          
          {/* Message Text */}
          <Text
            style={[
              styles.messageText,
              message.isUser ? styles.userMessageText : styles.botMessageText,
            ]}
          >
            {message.text}
          </Text>
          
          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.sourcesTitle}>📚 Sources:</Text>
              {message.sources.map((source, index) => (
                <Text key={index} style={styles.sourceText}>• {source}</Text>
              ))}
            </View>
          )}
          
          {/* Timestamp */}
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
    </View>
  );

  const medicalCategories = [
    {
      title: t('commonMedicines'),
      queries: [
        t('paracetamolUsage'),
        t('aspirinSideEffects'),
        t('napaInfo'),
        t('amoxicillinPrescribe')
      ]
    },
    {
      title: t('symptomTreatment'),
      queries: [
        t('feverTreatment'),
        t('stomachPainMedicines'),
        t('coldCoughTreatment'),
        t('bloodPressureTreatment')
      ]
    },
    {
      title: t('drugSafety'),
      queries: [
        t('drugInteractionCheck'),
        t('diabeticSafeMedicines'),
        t('pregnancyMedicines'),
        t('dangerousCombinations')
      ]
    },
    {
      title: t('professionalGuidance'),
      queries: [
        t('referToSpecialist'),
        t('emergencyProtocols'),
        t('dosageCalculation'),
        t('patientCounseling')
      ]
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primary} />
      
      {/* Sidebar */}
      <Sidebar 
        isVisible={sidebarVisible} 
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="aidoctor"
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => setSidebarVisible(true)} 
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>👨‍⚕️ {t('aiDoctorTitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('aiDoctorSubtitle')}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {/* Language Toggle */}
          <TouchableOpacity 
            onPress={() => setLanguage(language === 'en' ? 'bn' : 'en')} 
            style={styles.languageButton}
          >
            <Text style={styles.languageButtonText}>
              {language === 'en' ? 'বাং' : 'EN'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearConversation} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Messages or Welcome Screen */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            // Welcome Screen
            <View style={styles.welcomeContainer}>
              {/* Welcome Greeting */}
              <View style={styles.welcomeHeader}>
                <Text style={styles.welcomeTitle}>
                  {t('welcome')}, {pharmacy?.name || 'Doctor'} 👨‍⚕️
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  {t('welcomeMessage')}
                </Text>
              </View>

              {/* Medical Categories */}
              <View style={styles.categoriesContainer}>
                {medicalCategories.map((category, categoryIndex) => (
                  <Card key={categoryIndex} style={styles.categoryCard}>
                    <CardHeader>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                    </CardHeader>
                    <CardContent>
                      {category.queries.map((query, queryIndex) => (
                        <TouchableOpacity
                          key={queryIndex}
                          style={styles.queryButton}
                          onPress={() => setInputText(query)}
                        >
                          <Text style={styles.queryText}>{query}</Text>
                        </TouchableOpacity>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </View>

            </View>
          ) : (
            // Chat Messages
            <>
              {messages.map(renderMessage)}
              
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Theme.colors.primary} />
                  <Text style={styles.loadingText}>
                    {t('aiAnalyzing')}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Rate Limit Message */}
        {rateLimitMessage && (
          <View style={styles.rateLimitContainer}>
            <Text style={styles.rateLimitText}>{rateLimitMessage}</Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('inputPlaceholder')}
            placeholderTextColor={Theme.colors.textTertiary}
            multiline
            maxLength={1000}
            editable={!loading && !isListening}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          {/* Voice Button - aligned with send button */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isListening && styles.voiceButtonListening,
              (loading) && styles.voiceButtonDisabled,
            ]}
            onPress={isListening ? handleStopListening : () => {
              handleStartListening();
              // For web platform voice input
              if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
                const recognition = new (window as any).webkitSpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';
                
                recognition.onresult = (event: any) => {
                  const transcript = event.results[0][0].transcript;
                  handleVoiceInput(transcript);
                };
                
                recognition.onerror = () => handleStopListening();
                recognition.onend = () => handleStopListening();
                recognition.start();
              }
            }}
            disabled={loading}
          >
            <Text style={styles.voiceButtonText}>
              {isListening ? '🔴' : '🎤'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading || isListening) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading || isListening}
          >
            <Text style={styles.sendButtonText}>
              {loading ? '⏳' : '🚀'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 35,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },

  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },

  menuButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  menuIcon: {
    fontSize: 18,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },

  headerInfo: {
    flex: 1,
  },

  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },

  languageButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  languageButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    opacity: 0.9,
  },

  clearButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  clearButtonText: {
    fontSize: 18,
    color: theme.colors.background,
  },

  contentContainer: {
    flex: 1,
  },

  messagesContainer: {
    flex: 1,
  },

  messagesContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },

  // Welcome Screen Styles
  welcomeContainer: {
    paddingBottom: theme.spacing.xl,
  },

  welcomeHeader: {
    alignItems: 'center' as const,
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },

  welcomeTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  welcomeSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },

  categoriesContainer: {
    marginBottom: theme.spacing.xl,
  },

  categoryCard: {
    marginBottom: theme.spacing.lg,
  },

  categoryTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  queryButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  queryText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    lineHeight: 20,
  },

  statsCard: {
    backgroundColor: theme.colors.backgroundSecondary,
  },

  statsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.md,
  },

  statItem: {
    flex: 1,
    minWidth: 150,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },

  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },

  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },

  messageContainer: {
    marginBottom: theme.spacing.lg,
  },

  userMessageContainer: {
    alignItems: 'flex-end' as const,
  },

  botMessageContainer: {
    alignItems: 'flex-start' as const,
  },

  messageRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    maxWidth: '100%' as const,
  },

  userMessageRow: {
    flexDirection: 'row-reverse' as const,
    justifyContent: 'flex-start' as const,
  },

  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  userAvatarContainer: {
    backgroundColor: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
    marginLeft: 0,
  },

  avatarEmoji: {
    fontSize: 16,
    color: theme.colors.background,
  },

  messageBubble: {
    maxWidth: '75%' as const,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flex: 1,
  },

  userMessageBubble: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  botMessageBubble: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  knowledgeBaseBadge: {
    backgroundColor: theme.colors.info + '15',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    alignSelf: 'flex-start' as const,
    borderWidth: 1,
    borderColor: theme.colors.info + '30',
  },

  knowledgeBaseBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    fontWeight: theme.typography.weights.semibold as any,
  },

  messageText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: 24,
    marginBottom: theme.spacing.xs,
    fontFamily: 'System',
  },

  userMessageText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.medium as any,
  },

  botMessageText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.normal as any,
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
    lineHeight: 16,
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
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    alignSelf: 'flex-start' as const,
    marginTop: theme.spacing.sm,
    marginLeft: 40, // Align with bot messages
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },

  loadingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    fontStyle: 'italic' as const,
  },

  suggestionsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  suggestionsTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  suggestionsScroll: {
    paddingRight: theme.spacing.md,
  },

  suggestionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 200,
    maxWidth: 250,
  },

  suggestionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    textAlign: 'center' as const,
  },

  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },

  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlignVertical: 'top' as const,
  },

  voiceButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  voiceButtonListening: {
    backgroundColor: theme.colors.error,
    transform: [{ scale: 1.1 }],
  },

  voiceButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },

  voiceButtonText: {
    fontSize: 20,
  },

  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },

  sendButtonText: {
    fontSize: 20,
  },

  rateLimitContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.warningLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },

  rateLimitText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warning,
    textAlign: 'center' as const,
    fontWeight: theme.typography.weights.medium as any,
  },
}));
