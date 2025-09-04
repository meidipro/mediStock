import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { notificationService } from '../../lib/notification-service';
import { Card, CardContent, CardHeader } from './Card';
import { Button } from './Button';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  status: string;
  sent_at: string;
  handled_at?: string;
}

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
  pharmacyId: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  visible,
  onClose,
  pharmacyId,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible, filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('notification_logs')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (filter === 'unread') {
        query = query.is('handled_at', null);
      } else if (filter === 'alerts') {
        query = query.in('type', ['expiry_alert', 'low_stock']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading notifications:', error);
        Alert.alert('Error', 'Failed to load notifications');
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsHandled = async (notificationId: string) => {
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
        Alert.alert('Error', 'Failed to mark notification as handled');
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, status: 'handled', handled_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as handled:', error);
      Alert.alert('Error', 'Failed to mark notification as handled');
    }
  };

  const markAllAsHandled = async () => {
    try {
      const unhandledIds = notifications
        .filter(n => !n.handled_at)
        .map(n => n.id);

      if (unhandledIds.length === 0) {
        Alert.alert('Info', 'No unread notifications to mark');
        return;
      }

      const { error } = await supabase
        .from('notification_logs')
        .update({ 
          status: 'handled',
          handled_at: new Date().toISOString()
        })
        .in('id', unhandledIds);

      if (error) {
        console.error('Error marking all notifications as handled:', error);
        Alert.alert('Error', 'Failed to mark all notifications as handled');
        return;
      }

      Alert.alert('Success', `Marked ${unhandledIds.length} notifications as read`);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as handled:', error);
      Alert.alert('Error', 'Failed to mark all notifications as handled');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notification_logs')
                .delete()
                .eq('id', notificationId);

              if (error) {
                console.error('Error deleting notification:', error);
                Alert.alert('Error', 'Failed to delete notification');
                return;
              }

              setNotifications(prev => 
                prev.filter(notification => notification.id !== notificationId)
              );
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notification_logs')
                .delete()
                .eq('pharmacy_id', pharmacyId);

              if (error) {
                console.error('Error clearing notifications:', error);
                Alert.alert('Error', 'Failed to clear notifications');
                return;
              }

              setNotifications([]);
              Alert.alert('Success', 'All notifications cleared');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'expiry_alert':
        return '⚠️';
      case 'low_stock':
        return '📦';
      case 'customer_reminder':
        return '👤';
      case 'business_summary':
        return '📊';
      case 'system_update':
        return '🔔';
      default:
        return '📝';
    }
  };

  const getNotificationColor = (type: string, isHandled: boolean) => {
    if (isHandled) return Theme.colors.textTertiary;
    
    switch (type) {
      case 'expiry_alert':
        return Theme.colors.warning;
      case 'low_stock':
        return Theme.colors.error;
      case 'customer_reminder':
        return Theme.colors.info;
      case 'business_summary':
        return Theme.colors.success;
      default:
        return Theme.colors.primary;
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications;
  const unreadCount = notifications.filter(n => !n.handled_at).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>🔔 Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'unread', 'alerts'] as const).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterTab,
                filter === filterType && styles.activeFilterTab,
              ]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={[
                styles.filterTabText,
                filter === filterType && styles.activeFilterTabText,
              ]}>
                {filterType === 'all' ? 'All' : 
                 filterType === 'unread' ? 'Unread' : 'Alerts'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Mark All Read"
            variant="outline"
            size="sm"
            onPress={markAllAsHandled}
            disabled={unreadCount === 0}
          />
          <Button
            title="Clear All"
            variant="outline"
            size="sm"
            onPress={clearAllNotifications}
            disabled={notifications.length === 0}
          />
        </View>

        {/* Notifications List */}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading && notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Loading notifications...</Text>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>
                {filter === 'unread' 
                  ? 'All caught up! No unread notifications.'
                  : filter === 'alerts'
                  ? 'No critical alerts at the moment.'
                  : 'No notifications yet.'}
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                style={[
                  styles.notificationCard,
                  !notification.handled_at && styles.unreadCard,
                ]}
              >
                <CardContent>
                  <View style={styles.notificationHeader}>
                    <View style={styles.notificationTitle}>
                      <Text style={styles.notificationIcon}>
                        {getNotificationIcon(notification.type)}
                      </Text>
                      <Text style={[
                        styles.notificationTitleText,
                        { color: getNotificationColor(notification.type, !!notification.handled_at) }
                      ]}>
                        {notification.title}
                      </Text>
                    </View>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.sent_at)}
                    </Text>
                  </View>
                  
                  <Text style={styles.notificationBody}>
                    {notification.body}
                  </Text>
                  
                  {!notification.handled_at && (
                    <View style={styles.notificationActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => markAsHandled(notification.id)}
                      >
                        <Text style={styles.actionButtonText}>Mark as Read</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteNotification(notification.id)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {notification.handled_at && (
                    <View style={styles.handledIndicator}>
                      <Text style={styles.handledText}>
                        ✓ Read {formatTime(notification.handled_at)}
                      </Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            ))
          )}
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

  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },

  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: theme.spacing.sm,
    minWidth: 20,
    alignItems: 'center' as const,
  },

  badgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold as any,
  },

  closeButton: {
    padding: theme.spacing.sm,
  },

  closeButtonText: {
    fontSize: 24,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold as any,
  },

  filterTabs: {
    flexDirection: 'row' as const,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.md,
  },

  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center' as const,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeFilterTab: {
    borderBottomColor: theme.colors.primary,
  },

  filterTabText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium as any,
  },

  activeFilterTabText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold as any,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  notificationCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
  },

  unreadCard: {
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '05',
  },

  notificationHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.sm,
  },

  notificationTitle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },

  notificationIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },

  notificationTitleText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    flex: 1,
  },

  notificationTime: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },

  notificationBody: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },

  notificationActions: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },

  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },

  actionButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
  },

  deleteButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },

  deleteButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
  },

  handledIndicator: {
    marginTop: theme.spacing.sm,
  },

  handledText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.success,
    fontStyle: 'italic' as const,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.xl * 2,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
    opacity: 0.5,
  },

  emptyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    paddingHorizontal: theme.spacing.lg,
  },

  bottomSpacing: {
    height: theme.spacing.xl,
  },
}));