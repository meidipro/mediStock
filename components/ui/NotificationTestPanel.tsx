import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { notificationService, NotificationTemplates } from '../../lib/notification-service';
import { notificationScheduler } from '../../lib/notification-scheduler';
import { Card, CardContent, CardHeader } from './Card';
import { Button } from './Button';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface NotificationTestPanelProps {
  visible: boolean;
  onClose: () => void;
  pharmacyId: string;
}

export const NotificationTestPanel: React.FC<NotificationTestPanelProps> = ({
  visible,
  onClose,
  pharmacyId,
}) => {
  const [testing, setTesting] = useState(false);

  const testNotification = async (type: string) => {
    setTesting(true);
    try {
      let notification;
      
      switch (type) {
        case 'expiry':
          notification = NotificationTemplates.expiryAlert(
            'Test Medicine (Paracetamol)',
            '2025-01-01',
            5
          );
          break;
        case 'stock':
          notification = NotificationTemplates.lowStockAlert(
            'Test Medicine (Paracetamol)',
            3,
            10
          );
          break;
        case 'customer':
          notification = NotificationTemplates.customerReminder(
            'John Doe',
            'Insulin'
          );
          break;
        case 'business':
          notification = NotificationTemplates.businessSummary(
            15000,
            25,
            'Today'
          );
          break;
        default:
          notification = {
            title: '🔔 Test Notification',
            body: 'This is a test notification from MediStock',
            priority: 'normal' as const,
            data: { type: 'test' },
          };
      }

      await notificationService.sendImmediateNotification(notification);
      Alert.alert('Success', `${type} notification sent!`);
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  const runScheduledChecks = async () => {
    setTesting(true);
    try {
      // Run all scheduled checks
      await notificationScheduler.triggerExpiryCheck(pharmacyId);
      await notificationScheduler.triggerStockCheck(pharmacyId);
      await notificationScheduler.triggerBusinessSummary(pharmacyId);
      await notificationScheduler.triggerCustomerReminders(pharmacyId);
      
      Alert.alert(
        'Scheduled Checks Complete',
        'All notification checks have been run. Check your notification center for results.'
      );
    } catch (error) {
      console.error('Error running scheduled checks:', error);
      Alert.alert('Error', 'Failed to run scheduled checks');
    } finally {
      setTesting(false);
    }
  };

  const clearBadgeCount = async () => {
    try {
      await notificationService.setBadgeCount(0);
      Alert.alert('Success', 'Badge count cleared');
    } catch (error) {
      console.error('Error clearing badge count:', error);
      Alert.alert('Error', 'Failed to clear badge count');
    }
  };

  const getDeviceInfo = () => {
    const token = notificationService.getExpoPushToken();
    const settings = notificationService.getSettings();
    
    Alert.alert(
      'Device Information',
      `Push Token: ${token ? 'Connected' : 'Not Connected'}\n` +
      `Settings Loaded: ${settings ? 'Yes' : 'No'}\n` +
      `Enabled Alerts: ${settings ? Object.values(settings.enabledTypes).filter(Boolean).length : 0}`
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Notification Test Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Test Individual Notifications */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Test Individual Notifications</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.buttonGrid}>
                <Button
                  title="⚠️ Expiry Alert"
                  variant="outline"
                  onPress={() => testNotification('expiry')}
                  disabled={testing}
                  style={styles.testButton}
                />
                
                <Button
                  title="📦 Stock Alert"
                  variant="outline"
                  onPress={() => testNotification('stock')}
                  disabled={testing}
                  style={styles.testButton}
                />
                
                <Button
                  title="👤 Customer Reminder"
                  variant="outline"
                  onPress={() => testNotification('customer')}
                  disabled={testing}
                  style={styles.testButton}
                />
                
                <Button
                  title="📊 Business Summary"
                  variant="outline"
                  onPress={() => testNotification('business')}
                  disabled={testing}
                  style={styles.testButton}
                />
              </View>
            </CardContent>
          </Card>

          {/* Scheduled Checks */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Scheduled Checks</Text>
            </CardHeader>
            <CardContent>
              <Text style={styles.description}>
                Run all automated notification checks manually to test with your real data.
              </Text>
              <Button
                title="🔄 Run All Scheduled Checks"
                variant="primary"
                onPress={runScheduledChecks}
                loading={testing}
                style={styles.actionButton}
              />
            </CardContent>
          </Card>

          {/* Device Management */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Device Management</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.buttonRow}>
                <Button
                  title="📱 Device Info"
                  variant="outline"
                  onPress={getDeviceInfo}
                  style={styles.deviceButton}
                />
                
                <Button
                  title="🔢 Clear Badge"
                  variant="outline"
                  onPress={clearBadgeCount}
                  style={styles.deviceButton}
                />
              </View>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>📋 Testing Instructions</Text>
            </CardHeader>
            <CardContent>
              <Text style={styles.instructionText}>
                1. <Text style={styles.bold}>Individual Tests:</Text> Send sample notifications to test the display and functionality.
              </Text>
              <Text style={styles.instructionText}>
                2. <Text style={styles.bold}>Scheduled Checks:</Text> Run real checks against your pharmacy data (medicines, stock, customers).
              </Text>
              <Text style={styles.instructionText}>
                3. <Text style={styles.bold}>Check Results:</Text> Open Notification Center to see all sent notifications.
              </Text>
              <Text style={styles.instructionText}>
                4. <Text style={styles.bold}>Settings:</Text> Configure notification preferences in Notification Settings.
              </Text>
            </CardContent>
          </Card>

          <View style={styles.bottomSpacing} />
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

  description: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },

  buttonGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  testButton: {
    flex: 1,
    minWidth: 140,
  },

  buttonRow: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
  },

  deviceButton: {
    flex: 1,
  },

  actionButton: {
    marginTop: theme.spacing.sm,
  },

  instructionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },

  bold: {
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  bottomSpacing: {
    height: theme.spacing.xl,
  },
}));