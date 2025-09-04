import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { createThemedStyles } from '../../constants/Theme';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSubscription } from '../../hooks/useSubscription';
import { notificationScheduler } from '../../lib/notification-scheduler';
import { notificationService } from '../../lib/notification-service';
import { supabase } from '../../lib/supabase.js';
import { NotificationCenter } from './NotificationCenter';
import { NotificationSettings } from './NotificationSettings';
import { NotificationTestPanel } from './NotificationTestPanel';

interface SidebarProps {
  isVisible: boolean;
  onToggle: () => void;
  currentRoute: string;
}


const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(280, screenWidth * 0.75);

export const Sidebar: React.FC<SidebarProps> = ({ isVisible, onToggle, currentRoute }) => {
  const router = useRouter();
  const { user, pharmacy, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { subscriptionStatus } = useSubscription();
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showNotificationTestPanel, setShowNotificationTestPanel] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Initialize notification system
  useEffect(() => {
    if (pharmacy?.id) {
      initializeNotifications();
    }
  }, [pharmacy?.id]);

  // Animate sidebar
  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -SIDEBAR_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isVisible, slideAnim]);

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize(pharmacy!.id);
      await notificationScheduler.initialize(pharmacy!.id);
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('id', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacy!.id)
        .is('handled_at', null);

      if (!error) {
        setUnreadNotificationCount(data?.length || 0);
      }
    } catch (error) {
      console.error('Error loading unread notification count:', error);
    }
  };

  const navigationItems = [
    { 
      key: 'profile', 
      title: 'Profile Management', 
      icon: '👤', 
      route: '/Profile' 
    },
    { 
      key: 'invoices', 
      title: 'Invoice Management', 
      icon: '📄', 
      route: '/InvoiceManagement' 
    },
    { 
      key: 'due-invoices', 
      title: 'Due Invoices', 
      icon: '⏰', 
      route: '/DueInvoices' 
    },
    { 
      key: 'suppliers', 
      title: 'Suppliers', 
      icon: '🏢', 
      route: '/Suppliers' 
    },
    { 
      key: 'customers', 
      title: 'Customers', 
      icon: '👨‍👩‍👧‍👦', 
      route: '/Customers' 
    },
    { 
      key: 'backup', 
      title: 'Backup & Export', 
      icon: '💾', 
      route: '/Backup' 
    },
    { 
      key: 'subscription', 
      title: 'Subscription Plans', 
      icon: '💳', 
      route: '/subscription' 
    },
    { 
      key: 'settings', 
      title: 'Settings', 
      icon: '⚙️', 
      route: '/Settings' 
    },
    { 
      key: 'aidoctor', 
      title: 'AI Doctor', 
      icon: '👨‍⚕️', 
      route: '/aidoctor' 
    },
    { 
      key: 'reports', 
      title: 'Reports', 
      icon: '📊', 
      route: '/reports' 
    },
    { 
      key: 'delivery', 
      title: 'Delivery', 
      icon: '🚚', 
      route: '/delivery' 
    },
  ];

  const handleNavigation = (route: string) => {
    if (route.startsWith('/')) {
      router.push(route as any);
    } else {
      Alert.alert('Coming Soon', 'This feature is under development');
    }
    onToggle();
  };

  const handleSignOut = async () => {
    // Direct sign out without confirmation (since Alert.alert has issues)
    try {
      if (!signOut) {
        console.warn('SignOut function not available, using fallback');
        router.replace('/');
        onToggle();
        return;
      }
      
      await signOut();
      onToggle(); // Close sidebar after successful sign out
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback to router navigation
      router.replace('/');
      onToggle();
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onToggle}
      />

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.full_name || 'User'}
              </Text>
              <Text style={styles.pharmacyName} numberOfLines={1}>
                {pharmacy?.name || 'MediStock User'}
              </Text>
              <View style={styles.subscriptionBadge}>
                <Text style={styles.subscriptionBadgeText}>
                  {subscriptionStatus?.planName || 'Free Trial'}
                </Text>
                {subscriptionStatus?.isExpired && (
                  <Text style={styles.expiredText}>• Expired</Text>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onToggle}>
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Navigation Items */}
          <View style={styles.navigation}>
            <Text style={styles.sectionTitle}>NAVIGATION</Text>
            {navigationItems.map((item) => {
              const isSubscriptionItem = item.key === 'subscription';
              const needsUpgrade = subscriptionStatus?.isTrial || subscriptionStatus?.isExpired;
              const shouldHighlight = isSubscriptionItem && needsUpgrade;
              
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.navItem,
                    currentRoute.includes(item.key) && styles.navItemActive,
                    shouldHighlight && styles.navItemHighlight,
                  ]}
                  onPress={() => handleNavigation(item.route)}
                >
                  <Text style={styles.navIcon}>{item.icon}</Text>
                  <Text style={[
                    styles.navText,
                    currentRoute.includes(item.key) && styles.navTextActive,
                    shouldHighlight && styles.navTextHighlight,
                  ]}>
                    {item.title}
                    {shouldHighlight && subscriptionStatus?.isExpired && ' ⚠️'}
                    {shouldHighlight && subscriptionStatus?.isTrial && ' ✨'}
                  </Text>
                  {currentRoute.includes(item.key) && (
                    <View style={styles.activeIndicator} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Notifications Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
            
            {/* Notification Center */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                setShowNotificationCenter(true);
                onToggle();
              }}
            >
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingText}>Notification Center</Text>
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Notification Settings */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                setShowNotificationSettings(true);
                onToggle();
              }}
            >
              <Text style={styles.settingIcon}>⚙️</Text>
              <Text style={styles.settingText}>Notification Settings</Text>
            </TouchableOpacity>

            {/* Test Panel (Development) */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                setShowNotificationTestPanel(true);
                onToggle();
              }}
            >
              <Text style={styles.settingIcon}>🧪</Text>
              <Text style={styles.settingText}>Test Notifications</Text>
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            
            {/* Language Toggle */}
            <View style={styles.settingItem}>
              <Text style={styles.settingIcon}>🌍</Text>
              <Text style={styles.settingText}>Language</Text>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              >
                <Text style={styles.toggleText}>
                  {language === 'en' ? 'EN' : 'বাং'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutIcon}>🚪</Text>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Notification Modals */}
      {pharmacy && (
        <>
          <NotificationSettings
            visible={showNotificationSettings}
            onClose={() => setShowNotificationSettings(false)}
            pharmacyId={pharmacy.id}
          />
          
          <NotificationCenter
            visible={showNotificationCenter}
            onClose={() => {
              setShowNotificationCenter(false);
              loadUnreadCount(); // Refresh count when closing
            }}
            pharmacyId={pharmacy.id}
          />

          <NotificationTestPanel
            visible={showNotificationTestPanel}
            onClose={() => setShowNotificationTestPanel(false)}
            pharmacyId={pharmacy.id}
          />
        </>
      )}
    </>
  );
};

const styles = createThemedStyles((theme) => ({
  overlay: {
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
    width: SIDEBAR_WIDTH,
    backgroundColor: theme.colors.background,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 35,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },

  profileSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },

  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: theme.spacing.sm,
  },

  avatarText: {
    fontSize: 16,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },

  profileInfo: {
    flex: 1,
  },

  userName: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.medium,
  },

  pharmacyName: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.background,
    opacity: 0.8,
    marginTop: 1,
  },

  subscriptionBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 4,
  },

  subscriptionBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.background,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: theme.typography.weights.medium,
  },

  expiredText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.error,
    marginLeft: 4,
    fontWeight: theme.typography.weights.medium,
  },

  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  closeIcon: {
    fontSize: 18,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },

  content: {
    flex: 1,
  },

  navigation: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },

  settingsSection: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: theme.spacing.lg,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.5,
  },

  navItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: 4,
    position: 'relative' as const,
  },

  navItemActive: {
    backgroundColor: theme.colors.primaryLight + '20',
  },

  navIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
    width: 20,
    textAlign: 'center' as const,
  },

  navText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
    flex: 1,
  },

  navTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },

  navItemHighlight: {
    backgroundColor: theme.colors.warning + '15',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },

  navTextHighlight: {
    color: theme.colors.warning,
    fontWeight: theme.typography.weights.semibold,
  },

  activeIndicator: {
    position: 'absolute' as const,
    right: theme.spacing.sm,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },

  settingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: 4,
  },

  settingIcon: {
    fontSize: 14,
    marginRight: theme.spacing.sm,
    width: 18,
    textAlign: 'center' as const,
  },

  settingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    flex: 1,
  },

  toggleButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.sm,
    minWidth: 40,
    alignItems: 'center' as const,
  },

  toggleText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },

  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },

  signOutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#ff000010',
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
    minHeight: 44, // Ensure touchable area
  },

  signOutIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },

  signOutText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.weights.medium,
  },

  notificationBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center' as const,
  },

  notificationBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold as any,
  },
}));