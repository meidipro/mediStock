import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useSales, useStock, useCustomers } from '../hooks/useDatabase';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AIPharmacyInsights } from '../components/ai/AIPharmacyInsights';
import { AIBusinessRecommendations } from '../components/ai/AIBusinessRecommendations';
import { AIChatbot } from '../components/ai/AIChatbot';
import { CustomerAnalyticsUI } from '../components/ai/CustomerAnalyticsUI';
import { PricingOptimizationUI } from '../components/ai/PricingOptimizationUI';
import { Theme, createThemedStyles } from '../constants/Theme';

export default function AccountScreen() {
  const { user, pharmacy, signOut, refreshUser } = useAuth();
  const { sales } = useSales();
  const { stockItems } = useStock();
  const { customers } = useCustomers();

  const [showAIInsights, setShowAIInsights] = useState(true);
  const [aiSettings, setAISettings] = useState({
    autoInsights: true,
    dailyRecommendations: true,
    stockAlerts: true,
    customerAnalytics: true,
    priceOptimization: false,
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showCustomerAnalytics, setShowCustomerAnalytics] = useState(false);
  const [showPricingOptimization, setShowPricingOptimization] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    // Load AI settings from local storage or API
    loadAISettings();
  }, []);

  const loadAISettings = () => {
    // In a real app, load from AsyncStorage or API
    // For now, use default settings
  };

  const saveAISettings = () => {
    // In a real app, save to AsyncStorage or API
    Alert.alert('Settings Saved', 'AI preferences have been updated');
    setShowSettingsModal(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const updateProfile = async () => {
    Alert.alert('Success', 'Profile updated successfully');
  };


  const getBusinessMetrics = () => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalDue = sales.reduce((sum, sale) => sum + (sale.due_amount || 0), 0);
    const totalStock = stockItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const lowStockCount = stockItems.filter(item => item.quantity <= item.minimum_stock).length;

    return {
      totalRevenue,
      totalDue,
      totalStock,
      lowStockCount,
      totalCustomers: customers.length,
      totalTransactions: sales.length,
    };
  };

  const metrics = getBusinessMetrics();

  const renderProfileSection = () => (
    <Card style={styles.section}>
      <CardHeader>
        <Text style={styles.sectionTitle}>👤 Profile Information</Text>
      </CardHeader>
      <CardContent>
        <View style={styles.profileInfo}>
          <Text style={styles.pharmacyName}>{pharmacy?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userRole}>Role: {user?.role}</Text>
        </View>

        <Input
          label="Full Name"
          value={profileData.full_name}
          onChangeText={(text) => setProfileData(prev => ({ ...prev, full_name: text }))}
          placeholder="Enter your full name"
        />

        <Input
          label="Phone Number"
          value={profileData.phone}
          onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <Button
          title="Update Profile"
          variant="primary"
          onPress={updateProfile}
          style={styles.updateButton}
        />
      </CardContent>
    </Card>
  );

  const renderBusinessOverview = () => (
    <Card style={styles.section}>
      <CardHeader>
        <Text style={styles.sectionTitle}>📊 Business Overview</Text>
      </CardHeader>
      <CardContent>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>৳{metrics.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: Theme.colors.warning }]}>
              ৳{metrics.totalDue.toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Pending Due</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>৳{metrics.totalStock.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Stock Value</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: Theme.colors.error }]}>
              {metrics.lowStockCount}
            </Text>
            <Text style={styles.metricLabel}>Low Stock</Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const renderAISettings = () => (
    <Card style={styles.section}>
      <CardHeader>
        <View style={styles.aiSettingsHeader}>
          <Text style={styles.sectionTitle}>🤖 AI Features</Text>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
            <Text style={styles.settingsLink}>Configure</Text>
          </TouchableOpacity>
        </View>
      </CardHeader>
      <CardContent>
        <View style={styles.aiFeaturesList}>
          <View style={styles.aiFeature}>
            <Text style={styles.aiFeatureText}>Auto Business Insights</Text>
            <Switch
              value={aiSettings.autoInsights}
              onValueChange={(value) => setAISettings(prev => ({ ...prev, autoInsights: value }))}
              trackColor={{ false: Theme.colors.border, true: Theme.colors.primary + '40' }}
              thumbColor={aiSettings.autoInsights ? Theme.colors.primary : Theme.colors.textTertiary}
            />
          </View>
          <View style={styles.aiFeature}>
            <Text style={styles.aiFeatureText}>Daily Recommendations</Text>
            <Switch
              value={aiSettings.dailyRecommendations}
              onValueChange={(value) => setAISettings(prev => ({ ...prev, dailyRecommendations: value }))}
              trackColor={{ false: Theme.colors.border, true: Theme.colors.primary + '40' }}
              thumbColor={aiSettings.dailyRecommendations ? Theme.colors.primary : Theme.colors.textTertiary}
            />
          </View>
          <View style={styles.aiFeature}>
            <Text style={styles.aiFeatureText}>Smart Stock Alerts</Text>
            <Switch
              value={aiSettings.stockAlerts}
              onValueChange={(value) => setAISettings(prev => ({ ...prev, stockAlerts: value }))}
              trackColor={{ false: Theme.colors.border, true: Theme.colors.primary + '40' }}
              thumbColor={aiSettings.stockAlerts ? Theme.colors.primary : Theme.colors.textTertiary}
            />
          </View>
          <View style={styles.aiFeature}>
            <Text style={styles.aiFeatureText}>Customer Analytics</Text>
            <Switch
              value={aiSettings.customerAnalytics}
              onValueChange={(value) => setAISettings(prev => ({ ...prev, customerAnalytics: value }))}
              trackColor={{ false: Theme.colors.border, true: Theme.colors.primary + '40' }}
              thumbColor={aiSettings.customerAnalytics ? Theme.colors.primary : Theme.colors.textTertiary}
            />
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const renderQuickActions = () => (
    <Card style={styles.section}>
      <CardHeader>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
      </CardHeader>
      <CardContent>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowChatbot(true)}
          >
            <Text style={styles.quickActionIcon}>🤖</Text>
            <Text style={styles.quickActionText}>AI Assistant</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowCustomerAnalytics(true)}
          >
            <Text style={styles.quickActionIcon}>👥</Text>
            <Text style={styles.quickActionText}>Customer Analytics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowPricingOptimization(true)}
          >
            <Text style={styles.quickActionIcon}>💰</Text>
            <Text style={styles.quickActionText}>Pricing AI</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => Alert.alert('Support', 'Support will be available soon')}
          >
            <Text style={styles.quickActionIcon}>❓</Text>
            <Text style={styles.quickActionText}>Help</Text>
          </TouchableOpacity>
        </View>
      </CardContent>
    </Card>
  );

  const renderAIToggle = () => (
    <View style={styles.aiToggle}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          !showAIInsights && styles.activeToggleButton
        ]}
        onPress={() => setShowAIInsights(false)}
      >
        <Text style={[
          styles.toggleButtonText,
          !showAIInsights && styles.activeToggleText
        ]}>
          👤 Profile
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.toggleButton,
          showAIInsights && styles.activeToggleButton
        ]}
        onPress={() => setShowAIInsights(true)}
      >
        <Text style={[
          styles.toggleButtonText,
          showAIInsights && styles.activeToggleText
        ]}>
          🤖 AI Insights
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🤖 AI Settings</Text>
          <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Card style={styles.settingsCard}>
            <CardHeader>
              <Text style={styles.settingsTitle}>AI Feature Preferences</Text>
            </CardHeader>
            <CardContent>
              {Object.entries(aiSettings).map(([key, value]) => (
                <View key={key} style={styles.settingItem}>
                  <Text style={styles.settingLabel}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Text>
                  <Switch
                    value={value}
                    onValueChange={(newValue) => setAISettings(prev => ({ ...prev, [key]: newValue }))}
                    trackColor={{ false: Theme.colors.border, true: Theme.colors.primary + '40' }}
                    thumbColor={value ? Theme.colors.primary : Theme.colors.textTertiary}
                  />
                </View>
              ))}
            </CardContent>
          </Card>
          
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowSettingsModal(false)}
              style={styles.modalButton}
            />
            <Button
              title="Save Settings"
              variant="primary"
              onPress={saveAISettings}
              style={styles.modalButton}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // If user doesn't have a pharmacy, this shouldn't happen with new flow
  // but just in case, show a message
  if (!pharmacy) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.headerTitle}>⚠️ Setup Required</Text>
          <Text style={styles.headerSubtitle}>
            Please complete your registration with pharmacy details
          </Text>
          <Button
            title="Complete Registration"
            onPress={handleSignOut}
            variant="primary"
            style={{ marginTop: 20 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Account & Settings</Text>
        <Text style={styles.headerSubtitle}>
          Manage your profile and AI preferences
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderBusinessOverview()}
        {renderAIToggle()}

        {showAIInsights ? (
          <View style={styles.aiSection}>
            <AIPharmacyInsights
              salesData={sales}
              stockData={stockItems}
              customerData={customers}
              pharmacyData={pharmacy}
            />
            
            <AIBusinessRecommendations
              businessMetrics={metrics}
              aiSettings={aiSettings}
              pharmacy={pharmacy}
            />
          </View>
        ) : (
          <View style={styles.profileSection}>
            {renderProfileSection()}
            {renderAISettings()}
            {renderQuickActions()}
          </View>
        )}

        {/* Sign Out */}
        <Card style={styles.section}>
          <CardContent>
            <Button
              title="Sign Out"
              variant="outline"
              onPress={handleSignOut}
              fullWidth
              style={[styles.signOutButton, { borderColor: Theme.colors.error }]}
            />
          </CardContent>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {renderSettingsModal()}
      
      {/* AI Chatbot Modal */}
      {showChatbot && (
        <AIChatbot
          visible={showChatbot}
          onClose={() => setShowChatbot(false)}
          pharmacy={pharmacy}
          businessMetrics={metrics}
        />
      )}

      {/* Customer Analytics Modal */}
      <CustomerAnalyticsUI
        customers={customers}
        sales={sales}
        visible={showCustomerAnalytics}
        onClose={() => setShowCustomerAnalytics(false)}
      />

      {/* Pricing Optimization Modal */}
      <PricingOptimizationUI
        medicines={stockItems.map(item => item.medicine)}
        sales={sales}
        stockItems={stockItems}
        visible={showPricingOptimization}
        onClose={() => setShowPricingOptimization(false)}
      />
    </View>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
    marginBottom: theme.spacing.xs,
  },

  headerSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.background,
    opacity: 0.9,
  },

  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  aiToggle: {
    flexDirection: 'row' as const,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },

  toggleButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center' as const,
    borderRadius: theme.borderRadius.sm,
  },

  activeToggleButton: {
    backgroundColor: theme.colors.primary,
  },

  toggleButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.textSecondary,
  },

  activeToggleText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
  },

  aiSection: {
    gap: theme.spacing.lg,
  },

  profileSection: {
    gap: theme.spacing.lg,
  },

  profileInfo: {
    alignItems: 'center' as const,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  pharmacyName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  userEmail: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  userRole: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    textTransform: 'capitalize' as const,
  },

  updateButton: {
    marginTop: theme.spacing.md,
  },

  metricsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  metricItem: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  metricValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  metricLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },

  aiSettingsHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  settingsLink: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium as any,
  },

  aiFeaturesList: {
    gap: theme.spacing.md,
  },

  aiFeature: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
  },

  aiFeatureText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    flex: 1,
  },

  quickActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  quickAction: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  quickActionIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.sm,
  },

  quickActionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    textAlign: 'center' as const,
    fontWeight: theme.typography.weights.medium as any,
  },

  signOutButton: {
    marginTop: theme.spacing.md,
  },

  bottomSpacing: {
    height: theme.spacing.xl,
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
    fontSize: 24,
    color: theme.colors.background,
    padding: theme.spacing.xs,
  },

  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },

  settingsCard: {
    marginBottom: theme.spacing.lg,
  },

  settingsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  settingItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  settingLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    flex: 1,
  },

  modalActions: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },

  modalButton: {
    flex: 1,
  },
}));