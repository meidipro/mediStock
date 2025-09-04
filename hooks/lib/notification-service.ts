import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  id?: string;
  title: string;
  body: string;
  data?: any;
  trigger?: Notifications.NotificationTriggerInput;
  categoryId?: string;
  priority?: 'low' | 'normal' | 'high' | 'max';
}

export interface PharmacyNotificationSettings {
  pharmacyId: string;
  enabledTypes: {
    expiryAlerts: boolean;
    lowStockAlerts: boolean;
    customerReminders: boolean;
    businessSummaries: boolean;
    systemUpdates: boolean;
  };
  alertTimings: {
    expiryDaysBefore: number;
    lowStockThreshold: number;
    businessSummaryTime: string; // HH:MM format
    customerReminderDays: number;
  };
  deliveryMethods: {
    pushNotifications: boolean;
    smsNotifications: boolean;
    emailNotifications: boolean;
  };
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationSettings: PharmacyNotificationSettings | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(pharmacyId: string): Promise<boolean> {
    try {
      console.log('🔔 Initializing notification service...');
      
      // Skip push notifications on web for now
      if (Platform.OS !== 'web') {
        // Register for push notifications
        const token = await this.registerForPushNotifications();
        if (token) {
          this.expoPushToken = token;
          console.log('✅ Push token registered:', token);
        }

        // Setup notification categories (mobile only)
        await this.setupNotificationCategories();

        // Set up background notification handling
        this.setupNotificationListeners();
      } else {
        console.log('📱 Web platform - skipping native notification features');
      }

      // Load notification settings (works on all platforms)
      await this.loadNotificationSettings(pharmacyId);

      console.log('✅ Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      return false;
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MediStock Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('expiry', {
          name: 'Medicine Expiry Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });

        await Notifications.setNotificationChannelAsync('stock', {
          name: 'Stock Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4ECDC4',
        });

        await Notifications.setNotificationChannelAsync('business', {
          name: 'Business Summaries',
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: '#45B7D1',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('EXPIRY_ALERT', [
        {
          identifier: 'VIEW_STOCK',
          buttonTitle: 'View Stock',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'MARK_HANDLED',
          buttonTitle: 'Mark Handled',
          options: { opensAppToForeground: false },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('LOW_STOCK', [
        {
          identifier: 'REORDER_NOW',
          buttonTitle: 'Reorder',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'VIEW_STOCK',
          buttonTitle: 'View Stock',
          options: { opensAppToForeground: true },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('BUSINESS_SUMMARY', [
        {
          identifier: 'VIEW_REPORT',
          buttonTitle: 'View Report',
          options: { opensAppToForeground: true },
        },
      ]);
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }

  private setupNotificationListeners(): void {
    // Handle notification tap when app is running
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Notification received:', notification);
    });

    // Handle notification tap when app is in background/closed
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📱 Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const { notification, actionIdentifier } = response;
    const notificationData = notification.request.content.data;

    console.log('🔔 Handling notification action:', actionIdentifier, notificationData);

    switch (actionIdentifier) {
      case 'VIEW_STOCK':
        // Navigate to inventory screen
        // This would integrate with your navigation system
        break;
      case 'REORDER_NOW':
        // Navigate to purchase order screen
        break;
      case 'VIEW_REPORT':
        // Navigate to reports screen
        break;
      case 'MARK_HANDLED':
        // Mark notification as handled in database
        await this.markNotificationHandled(notificationData.notificationId);
        break;
    }
  }

  async loadNotificationSettings(pharmacyId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading notification settings:', error);
        return;
      }

      if (data) {
        this.notificationSettings = {
          pharmacyId,
          enabledTypes: data.enabled_types || {
            expiryAlerts: true,
            lowStockAlerts: true,
            customerReminders: true,
            businessSummaries: true,
            systemUpdates: true,
          },
          alertTimings: data.alert_timings || {
            expiryDaysBefore: 30,
            lowStockThreshold: 10,
            businessSummaryTime: '09:00',
            customerReminderDays: 7,
          },
          deliveryMethods: data.delivery_methods || {
            pushNotifications: true,
            smsNotifications: false,
            emailNotifications: false,
          },
        };
      } else {
        // Create default settings
        this.notificationSettings = {
          pharmacyId,
          enabledTypes: {
            expiryAlerts: true,
            lowStockAlerts: true,
            customerReminders: true,
            businessSummaries: true,
            systemUpdates: true,
          },
          alertTimings: {
            expiryDaysBefore: 30,
            lowStockThreshold: 10,
            businessSummaryTime: '09:00',
            customerReminderDays: 7,
          },
          deliveryMethods: {
            pushNotifications: true,
            smsNotifications: false,
            emailNotifications: false,
          },
        };

        await this.saveNotificationSettings();
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  async saveNotificationSettings(): Promise<boolean> {
    if (!this.notificationSettings) return false;

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          pharmacy_id: this.notificationSettings.pharmacyId,
          enabled_types: this.notificationSettings.enabledTypes,
          alert_timings: this.notificationSettings.alertTimings,
          delivery_methods: this.notificationSettings.deliveryMethods,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving notification settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  }

  async scheduleLocalNotification(notificationData: NotificationData): Promise<string | null> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          categoryIdentifier: notificationData.categoryId,
          priority: this.mapPriorityToExpo(notificationData.priority),
        },
        trigger: notificationData.trigger || null,
      });

      console.log('📅 Scheduled notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async sendImmediateNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      await Notifications.presentNotificationAsync({
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {},
        categoryIdentifier: notificationData.categoryId,
        priority: this.mapPriorityToExpo(notificationData.priority),
      });

      console.log('🔔 Sent immediate notification:', notificationData.title);
      return true;
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      return false;
    }
  }

  private mapPriorityToExpo(priority?: string): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case 'low':
        return Notifications.AndroidNotificationPriority.LOW;
      case 'normal':
        return Notifications.AndroidNotificationPriority.DEFAULT;
      case 'high':
        return Notifications.AndroidNotificationPriority.HIGH;
      case 'max':
        return Notifications.AndroidNotificationPriority.MAX;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  async cancelNotification(identifier: string): Promise<boolean> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('❌ Cancelled notification:', identifier);
      return true;
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }

  async cancelAllNotifications(): Promise<boolean> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('❌ Cancelled all notifications');
      return true;
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      return false;
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<boolean> {
    try {
      await Notifications.setBadgeCountAsync(count);
      return true;
    } catch (error) {
      console.error('Error setting badge count:', error);
      return false;
    }
  }

  async markNotificationHandled(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_logs')
        .update({ 
          status: 'handled',
          handled_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as handled:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as handled:', error);
      return false;
    }
  }

  getSettings(): PharmacyNotificationSettings | null {
    return this.notificationSettings;
  }

  updateSettings(settings: Partial<PharmacyNotificationSettings>): void {
    if (this.notificationSettings) {
      this.notificationSettings = { ...this.notificationSettings, ...settings };
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationService = NotificationService.getInstance();

// Utility functions for common notification scenarios
export const NotificationTemplates = {
  expiryAlert: (medicineName: string, expiryDate: string, daysUntilExpiry: number): NotificationData => ({
    title: '⚠️ Medicine Expiry Alert',
    body: `${medicineName} expires ${daysUntilExpiry > 0 ? `in ${daysUntilExpiry} days` : 'today'} (${expiryDate})`,
    categoryId: 'EXPIRY_ALERT',
    priority: daysUntilExpiry <= 7 ? 'high' : 'normal',
    data: {
      type: 'expiry_alert',
      medicineName,
      expiryDate,
      daysUntilExpiry,
    },
  }),

  lowStockAlert: (medicineName: string, currentStock: number, minimumStock: number): NotificationData => ({
    title: '📦 Low Stock Alert',
    body: `${medicineName} is running low (${currentStock}/${minimumStock} remaining)`,
    categoryId: 'LOW_STOCK',
    priority: currentStock === 0 ? 'max' : 'high',
    data: {
      type: 'low_stock',
      medicineName,
      currentStock,
      minimumStock,
    },
  }),

  customerReminder: (customerName: string, medicineName: string): NotificationData => ({
    title: '👤 Customer Reminder',
    body: `Time to contact ${customerName} about ${medicineName} refill`,
    priority: 'normal',
    data: {
      type: 'customer_reminder',
      customerName,
      medicineName,
    },
  }),

  businessSummary: (totalSales: number, totalTransactions: number, period: string): NotificationData => ({
    title: '📊 Daily Business Summary',
    body: `${period}: ৳${totalSales.toLocaleString()} revenue, ${totalTransactions} transactions`,
    categoryId: 'BUSINESS_SUMMARY',
    priority: 'normal',
    data: {
      type: 'business_summary',
      totalSales,
      totalTransactions,
      period,
    },
  }),
};