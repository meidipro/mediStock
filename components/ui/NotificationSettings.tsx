import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { notificationService, PharmacyNotificationSettings } from '../../lib/notification-service';
import { notificationScheduler } from '../../lib/notification-scheduler';
import { Card, CardContent, CardHeader } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface NotificationSettingsProps {
  visible: boolean;
  onClose: () => void;
  pharmacyId: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  visible,
  onClose,
  pharmacyId,
}) => {
  const [settings, setSettings] = useState<PharmacyNotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingNotifications, setTestingNotifications] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      await notificationService.initialize(pharmacyId);
      const currentSettings = notificationService.getSettings();
      if (currentSettings) {
        setSettings(currentSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      notificationService.updateSettings(settings);
      const success = await notificationService.saveNotificationSettings();
      
      if (success) {
        Alert.alert('Success', 'Notification settings saved successfully');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const updateEnabledType = (type: keyof typeof settings.enabledTypes, value: boolean) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      enabledTypes: {
        ...settings.enabledTypes,
        [type]: value,
      },
    });
  };

  const updateAlertTiming = (key: keyof typeof settings.alertTimings, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      alertTimings: {
        ...settings.alertTimings,
        [key]: value,
      },
    });
  };

  const updateDeliveryMethod = (method: keyof typeof settings.deliveryMethods, value: boolean) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      deliveryMethods: {
        ...settings.deliveryMethods,
        [method]: value,
      },
    });
  };

  const testNotifications = async () => {
    setTestingNotifications(true);
    try {
      // Test different types of notifications
      await notificationScheduler.triggerExpiryCheck(pharmacyId);
      await notificationScheduler.triggerStockCheck(pharmacyId);
      await notificationScheduler.triggerBusinessSummary(pharmacyId);
      
      Alert.alert(
        'Test Notifications Sent', 
        'Check your notification panel for test alerts. Note: Actual notifications depend on your data.'
      );
    } catch (error) {
      console.error('Error testing notifications:', error);
      Alert.alert('Error', 'Failed to send test notifications');
    } finally {
      setTestingNotifications(false);
    }
  };

  const renderNotificationToggle = (
    title: string,
    description: string,
    type: keyof typeof settings.enabledTypes,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={settings?.enabledTypes[type] || false}
        onValueChange={(value) => updateEnabledType(type, value)}
        trackColor={{ false: Theme.colors.border, true: Theme.colors.primary + '40' }}
        thumbColor={settings?.enabledTypes[type] ? Theme.colors.primary : Theme.colors.textTertiary}
      />
    </View>
  );

  const renderDeliveryMethodToggle = (
    title: string,
    method: keyof typeof settings.deliveryMethods,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch
        value={settings?.deliveryMethods[method] || false}
        onValueChange={(value) => updateDeliveryMethod(method, value)}
        trackColor={{ false: Theme.colors.border, true: Theme.colors.primary + '40' }}
        thumbColor={settings?.deliveryMethods[method] ? Theme.colors.primary : Theme.colors.textTertiary}
      />
    </View>
  );

  if (!settings) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notification Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔔 Notification Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Notification Types */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Notification Types</Text>
            </CardHeader>
            <CardContent>
              {renderNotificationToggle(
                'Medicine Expiry Alerts',
                'Get notified when medicines are approaching expiry',
                'expiryAlerts',
                '⚠️'
              )}
              
              {renderNotificationToggle(
                'Low Stock Alerts',
                'Get notified when medicine stock is running low',
                'lowStockAlerts',
                '📦'
              )}
              
              {renderNotificationToggle(
                'Customer Reminders',
                'Reminders to contact customers for refills',
                'customerReminders',
                '👤'
              )}
              
              {renderNotificationToggle(
                'Business Summaries',
                'Daily sales and business performance summaries',
                'businessSummaries',
                '📊'
              )}
              
              {renderNotificationToggle(
                'System Updates',
                'App updates and important system notifications',
                'systemUpdates',
                '🔔'
              )}
            </CardContent>
          </Card>

          {/* Alert Timings */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Alert Timings</Text>
            </CardHeader>
            <CardContent>
              <Input
                label="Expiry Alert Days Before"
                value={settings.alertTimings.expiryDaysBefore.toString()}
                onChangeText={(text) => updateAlertTiming('expiryDaysBefore', parseInt(text) || 30)}
                keyboardType="numeric"
                placeholder="30"
              />
              
              <Input
                label="Low Stock Threshold"
                value={settings.alertTimings.lowStockThreshold.toString()}
                onChangeText={(text) => updateAlertTiming('lowStockThreshold', parseInt(text) || 10)}
                keyboardType="numeric"
                placeholder="10"
              />
              
              <Input
                label="Business Summary Time (HH:MM)"
                value={settings.alertTimings.businessSummaryTime}
                onChangeText={(text) => updateAlertTiming('businessSummaryTime', text)}
                placeholder="09:00"
              />
              
              <Input
                label="Customer Reminder Days"
                value={settings.alertTimings.customerReminderDays.toString()}
                onChangeText={(text) => updateAlertTiming('customerReminderDays', parseInt(text) || 7)}
                keyboardType="numeric"
                placeholder="7"
              />
            </CardContent>
          </Card>

          {/* Delivery Methods */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Delivery Methods</Text>
            </CardHeader>
            <CardContent>
              {renderDeliveryMethodToggle(
                'Push Notifications',
                'pushNotifications',
                '📱'
              )}
              
              {renderDeliveryMethodToggle(
                'SMS Notifications',
                'smsNotifications',
                '💬'
              )}
              
              {renderDeliveryMethodToggle(
                'Email Notifications',
                'emailNotifications',
                '📧'
              )}
            </CardContent>
          </Card>

          {/* Test Notifications */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Test Notifications</Text>
            </CardHeader>
            <CardContent>
              <Text style={styles.testDescription}>
                Send test notifications to verify your settings are working correctly.
              </Text>
              <Button
                title="Send Test Notifications"
                variant="outline"
                onPress={testNotifications}
                loading={testingNotifications}
                style={styles.testButton}
              />
            </CardContent>
          </Card>

          {/* Push Token Info */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Device Information</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceLabel}>Push Token Status:</Text>
                <Text style={[
                  styles.deviceValue,
                  { color: notificationService.getExpoPushToken() ? Theme.colors.success : Theme.colors.error }
                ]}>
                  {notificationService.getExpoPushToken() ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
              {notificationService.getExpoPushToken() && (
                <Text style={styles.tokenText}>
                  Device is registered for push notifications
                </Text>
              )}
            </CardContent>
          </Card>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            style={styles.actionButton}
          />
          <Button
            title="Save Settings"
            variant="primary"
            onPress={saveSettings}
            loading={saving}
            style={styles.actionButton}
          />
        </View>
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
    padding: theme.spacing.sm,
  },

  closeButtonText: {
    fontSize: 24,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold as any,
  },

  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  section: {
    marginBottom: theme.spacing.lg,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.md,
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

  settingInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },

  settingIcon: {
    fontSize: 20,
    marginRight: theme.spacing.md,
  },

  settingText: {
    flex: 1,
  },

  settingTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: 2,
  },

  settingDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  testDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },

  testButton: {
    marginTop: theme.spacing.sm,
  },

  deviceInfo: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  deviceLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  deviceValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
  },

  tokenText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    fontStyle: 'italic' as const,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },

  actions: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  actionButton: {
    flex: 1,
  },

  bottomSpacing: {
    height: theme.spacing.xl,
  },
}));