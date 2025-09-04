import { notificationService, NotificationTemplates } from './notification-service';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScheduledCheck {
  id: string;
  type: 'expiry' | 'stock' | 'business_summary' | 'customer_reminder';
  pharmacyId: string;
  lastRun?: string;
  nextRun: string;
  isActive: boolean;
}

class NotificationScheduler {
  private static instance: NotificationScheduler;
  private scheduledChecks: ScheduledCheck[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  async initialize(pharmacyId: string): Promise<void> {
    console.log('📅 Initializing notification scheduler...');
    
    try {
      await this.loadScheduledChecks(pharmacyId);
      await this.setupDefaultChecks(pharmacyId);
      this.startScheduler();
      
      console.log('✅ Notification scheduler initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification scheduler:', error);
    }
  }

  private async loadScheduledChecks(pharmacyId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('notification_schedule')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true);

      if (error) {
        console.error('Error loading scheduled checks:', error);
        return;
      }

      this.scheduledChecks = data || [];
    } catch (error) {
      console.error('Error loading scheduled checks:', error);
    }
  }

  private async setupDefaultChecks(pharmacyId: string): Promise<void> {
    // Check which schedules already exist in database
    const { data: existingSchedules } = await supabase
      .from('notification_schedule')
      .select('type')
      .eq('pharmacy_id', pharmacyId);

    const existingTypes = new Set(existingSchedules?.map(s => s.type) || []);

    const defaultChecks = [
      {
        type: 'expiry',
        pharmacy_id: pharmacyId,
        next_run: this.getNextRunTime('09:00'),
        is_active: true,
      },
      {
        type: 'stock',
        pharmacy_id: pharmacyId,
        next_run: this.getNextRunTime('10:00'),
        is_active: true,
      },
      {
        type: 'business_summary',
        pharmacy_id: pharmacyId,
        next_run: this.getNextRunTime('18:00'),
        is_active: true,
      },
      {
        type: 'customer_reminder',
        pharmacy_id: pharmacyId,
        next_run: this.getNextRunTime('11:00'),
        is_active: true,
      },
    ];

    for (const check of defaultChecks) {
      // Skip if already exists in database
      if (existingTypes.has(check.type)) {
        console.log(`📅 ${check.type} schedule already exists`);
        continue;
      }

      // Skip if already loaded in memory
      const existsInMemory = this.scheduledChecks.some(
        sc => sc.type === check.type && sc.pharmacyId === pharmacyId
      );

      if (existsInMemory) {
        console.log(`📅 ${check.type} schedule already loaded`);
        continue;
      }

      try {
        const { data, error } = await supabase
          .from('notification_schedule')
          .insert(check)
          .select()
          .single();

        if (error) {
          console.error(`Error creating ${check.type} schedule:`, error);
        } else if (data) {
          this.scheduledChecks.push(data);
          console.log(`✅ Created ${check.type} schedule`);
        }
      } catch (error) {
        console.error(`Error creating default check for ${check.type}:`, error);
      }
    }
  }

  private getNextRunTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    const nextRun = new Date();
    
    nextRun.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun.toISOString();
  }

  private startScheduler(): void {
    if (this.isRunning) {
      console.log('⚠️ Scheduler already running');
      return;
    }

    this.isRunning = true;
    
    // Check every 5 minutes for due notifications
    this.intervalId = setInterval(() => {
      this.runScheduledChecks();
    }, 5 * 60 * 1000); // 5 minutes

    // Also run an immediate check
    this.runScheduledChecks();
    
    console.log('🚀 Notification scheduler started');
  }

  stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Notification scheduler stopped');
  }

  private async runScheduledChecks(): Promise<void> {
    const now = new Date();
    
    for (const check of this.scheduledChecks) {
      if (!check.isActive) continue;
      
      const nextRunTime = new Date(check.nextRun);
      
      if (now >= nextRunTime) {
        console.log(`🔄 Running scheduled check: ${check.type}`);
        
        try {
          await this.executeCheck(check);
          await this.updateNextRunTime(check);
        } catch (error) {
          console.error(`Error executing ${check.type} check:`, error);
        }
      }
    }
  }

  private async executeCheck(check: ScheduledCheck): Promise<void> {
    switch (check.type) {
      case 'expiry':
        await this.checkMedicineExpiry(check.pharmacyId);
        break;
      case 'stock':
        await this.checkLowStock(check.pharmacyId);
        break;
      case 'business_summary':
        await this.generateBusinessSummary(check.pharmacyId);
        break;
      case 'customer_reminder':
        await this.checkCustomerReminders(check.pharmacyId);
        break;
    }
  }

  private async checkMedicineExpiry(pharmacyId: string): Promise<void> {
    try {
      const settings = notificationService.getSettings();
      if (!settings?.enabledTypes.expiryAlerts) return;

      const expiryDays = settings.alertTimings.expiryDaysBefore;
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + expiryDays);

      const { data: medicines, error } = await supabase
        .from('medicines')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', alertDate.toISOString());

      if (error) {
        console.error('Error fetching expiring medicines:', error);
        return;
      }

      for (const medicine of medicines || []) {
        const expiryDate = new Date(medicine.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check if we've already sent a notification for this medicine recently
        const lastNotification = await this.getLastNotification('expiry_alert', medicine.id);
        if (lastNotification && this.wasRecentlySent(lastNotification, 24)) {
          continue; // Skip if notification was sent in last 24 hours
        }

        const notification = NotificationTemplates.expiryAlert(
          medicine.generic_name,
          expiryDate.toLocaleDateString(),
          daysUntilExpiry
        );

        await notificationService.sendImmediateNotification(notification);
        await this.logNotification('expiry_alert', medicine.id, notification);
      }
    } catch (error) {
      console.error('Error in checkMedicineExpiry:', error);
    }
  }

  private async checkLowStock(pharmacyId: string): Promise<void> {
    try {
      const settings = notificationService.getSettings();
      if (!settings?.enabledTypes.lowStockAlerts) return;

      const { data: stockItems, error } = await supabase
        .from('stock_items')
        .select(`
          *,
          medicine:medicines(*)
        `)
        .eq('pharmacy_id', pharmacyId)
        .or('quantity.lte.minimum_stock,quantity.eq.0');

      if (error) {
        console.error('Error fetching low stock items:', error);
        return;
      }

      for (const item of stockItems || []) {
        // Check if we've already sent a notification for this item recently
        const lastNotification = await this.getLastNotification('low_stock', item.id);
        if (lastNotification && this.wasRecentlySent(lastNotification, 12)) {
          continue; // Skip if notification was sent in last 12 hours
        }

        const notification = NotificationTemplates.lowStockAlert(
          item.medicine.generic_name,
          item.quantity,
          item.minimum_stock
        );

        await notificationService.sendImmediateNotification(notification);
        await this.logNotification('low_stock', item.id, notification);
      }
    } catch (error) {
      console.error('Error in checkLowStock:', error);
    }
  }

  private async generateBusinessSummary(pharmacyId: string): Promise<void> {
    try {
      const settings = notificationService.getSettings();
      if (!settings?.enabledTypes.businessSummaries) return;

      // Get today's sales data
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      if (error) {
        console.error('Error fetching sales data:', error);
        return;
      }

      const totalSales = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalTransactions = sales?.length || 0;

      if (totalTransactions > 0) {
        const notification = NotificationTemplates.businessSummary(
          totalSales,
          totalTransactions,
          'Today'
        );

        await notificationService.sendImmediateNotification(notification);
        await this.logNotification('business_summary', pharmacyId, notification);
      }
    } catch (error) {
      console.error('Error in generateBusinessSummary:', error);
    }
  }

  private async checkCustomerReminders(pharmacyId: string): Promise<void> {
    try {
      const settings = notificationService.getSettings();
      if (!settings?.enabledTypes.customerReminders) return;

      const reminderDays = settings.alertTimings.customerReminderDays;
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() - reminderDays);

      // Find customers who haven't purchased in the reminder period
      const { data: lastPurchases, error } = await supabase
        .from('sales')
        .select(`
          customer_id,
          customer:customers(*),
          created_at,
          items
        `)
        .eq('pharmacy_id', pharmacyId)
        .not('customer_id', 'is', null)
        .lte('created_at', reminderDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer purchase data:', error);
        return;
      }

      const customerMap = new Map();
      
      // Group by customer and get their last purchase
      for (const purchase of lastPurchases || []) {
        if (!customerMap.has(purchase.customer_id)) {
          customerMap.set(purchase.customer_id, purchase);
        }
      }

      for (const [customerId, lastPurchase] of customerMap) {
        // Check if we've already sent a reminder recently
        const lastNotification = await this.getLastNotification('customer_reminder', customerId);
        if (lastNotification && this.wasRecentlySent(lastNotification, 168)) { // 7 days
          continue;
        }

        // Get the most commonly purchased medicine for this customer
        const commonMedicine = this.getCommonMedicine(lastPurchase.items);
        
        const notification = NotificationTemplates.customerReminder(
          lastPurchase.customer.name,
          commonMedicine || 'regular medications'
        );

        await notificationService.sendImmediateNotification(notification);
        await this.logNotification('customer_reminder', customerId, notification);
      }
    } catch (error) {
      console.error('Error in checkCustomerReminders:', error);
    }
  }

  private getCommonMedicine(items: any[]): string | null {
    if (!items || items.length === 0) return null;
    
    // Return the first medicine name as the most common (simplified logic)
    return items[0]?.medicine_name || null;
  }

  private async updateNextRunTime(check: ScheduledCheck): Promise<void> {
    try {
      const now = new Date();
      let nextRun: Date;

      switch (check.type) {
        case 'expiry':
        case 'stock':
        case 'customer_reminder':
          // Daily checks - next run tomorrow at the same time
          nextRun = new Date(check.nextRun);
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'business_summary':
          // Daily summary - next run tomorrow at the same time
          nextRun = new Date(check.nextRun);
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        default:
          nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      }

      const { error } = await supabase
        .from('notification_schedule')
        .update({
          last_run: now.toISOString(),
          next_run: nextRun.toISOString(),
        })
        .eq('id', check.id);

      if (!error) {
        check.lastRun = now.toISOString();
        check.nextRun = nextRun.toISOString();
      }
    } catch (error) {
      console.error('Error updating next run time:', error);
    }
  }

  private async logNotification(type: string, entityId: string, notification: any): Promise<void> {
    try {
      await supabase
        .from('notification_logs')
        .insert({
          type,
          entity_id: entityId,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  private async getLastNotification(type: string, entityId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('type', type)
        .eq('entity_id', entityId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return error ? null : data;
    } catch (error) {
      console.error('Error getting last notification:', error);
      return null;
    }
  }

  private wasRecentlySent(lastNotification: any, hoursThreshold: number): boolean {
    if (!lastNotification?.sent_at) return false;
    
    const sentTime = new Date(lastNotification.sent_at);
    const now = new Date();
    const hoursSince = (now.getTime() - sentTime.getTime()) / (1000 * 60 * 60);
    
    return hoursSince < hoursThreshold;
  }

  // Manual trigger methods for testing
  async triggerExpiryCheck(pharmacyId: string): Promise<void> {
    await this.checkMedicineExpiry(pharmacyId);
  }

  async triggerStockCheck(pharmacyId: string): Promise<void> {
    await this.checkLowStock(pharmacyId);
  }

  async triggerBusinessSummary(pharmacyId: string): Promise<void> {
    await this.generateBusinessSummary(pharmacyId);
  }

  async triggerCustomerReminders(pharmacyId: string): Promise<void> {
    await this.checkCustomerReminders(pharmacyId);
  }

  getScheduledChecks(): ScheduledCheck[] {
    return this.scheduledChecks;
  }
}

export const notificationScheduler = NotificationScheduler.getInstance();