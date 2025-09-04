// =============================================
// OPTIMIZED DASHBOARD FOR 100+ USERS
// =============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  useOptimizedInvoices, 
  useCacheManager, 
  useRealTimeUpdates,
  usePerformanceMonitor 
} from '../../hooks/useOptimizedDatabase';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Sidebar } from '../ui/Sidebar';
import { Theme, createThemedStyles } from '../../constants/Theme';

export default function OptimizedDashboardScreen() {
  const router = useRouter();
  const { user, pharmacy, signOut } = useAuth();
  const { t } = useLanguage();
  const { getDashboardStats, loading: statsLoading } = useOptimizedInvoices();
  const { getCachedData, setCachedData } = useCacheManager();
  const { trackApiCall } = usePerformanceMonitor();
  
  // Real-time updates
  const lastInvoiceUpdate = useRealTimeUpdates('invoices', pharmacy?.id);
  const lastStockUpdate = useRealTimeUpdates('stock_items', pharmacy?.id);
  
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    todaySales: 0,
    todaysTransactions: 0,
    totalDueAmount: 0,
    lowStockCount: 0
  });

  // Memoized cache key
  const cacheKey = useMemo(() => 
    `dashboard_stats_${pharmacy?.id}_${new Date().toISOString().split('T')[0]}`, 
    [pharmacy?.id]
  );

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!pharmacy?.id) return;

    // Check cache first
    if (!forceRefresh) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setDashboardStats(cachedData);
        return;
      }
    }

    try {
      const startTime = Date.now();
      const stats = await getDashboardStats();
      const duration = Date.now() - startTime;
      
      trackApiCall(duration, true);

      if (stats) {
        const formattedStats = {
          todaySales: stats.today_sales || 0,
          todaysTransactions: stats.today_transactions || 0,
          totalDueAmount: stats.total_due || 0,
          lowStockCount: stats.low_stock_count || 0
        };
        
        setDashboardStats(formattedStats);
        setCachedData(cacheKey, formattedStats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      trackApiCall(0, false);
    }
  }, [pharmacy?.id, getDashboardStats, getCachedData, setCachedData, cacheKey, trackApiCall]);

  // Load data on mount and when real-time updates occur
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, lastInvoiceUpdate, lastStockUpdate]);

  // Reload dashboard data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const handleRefresh = useCallback(async () => {
    await loadDashboardData(true);
  }, [loadDashboardData]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  }, [signOut]);

  // Quick Actions handlers (memoized to prevent re-renders)
  const quickActions = useMemo(() => ({
    handleCreateInvoice: () => router.push('/InvoiceManagement'),
    handleDueManagement: () => router.push('/DueInvoices'),
    handleAddStock: () => router.push('/(tabs)/inventory'),
    handleViewReports: () => router.push('/(tabs)/reports'),
    handleSubscription: () => router.push('/subscription'),
    handleBarcodeScan: () => router.push('/(tabs)/inventory?action=barcode'),
  }), [router]);

  // Memoized quick stats to prevent unnecessary re-renders
  const quickStats = useMemo(() => [
    {
      id: 'sales',
      label: 'Today Sales',
      value: `৳${dashboardStats.todaySales.toLocaleString()}`,
      subtext: `${dashboardStats.todaysTransactions} invoices today`,
      color: Theme.colors.primary
    },
    {
      id: 'due',
      label: 'Due Amount',
      value: `৳${dashboardStats.totalDueAmount.toLocaleString()}`,
      subtext: 'Outstanding',
      color: Theme.colors.error
    },
    {
      id: 'stock',
      label: 'Low Stock Items',
      value: dashboardStats.lowStockCount.toString(),
      subtext: 'Need attention',
      color: Theme.colors.warning
    }
  ], [dashboardStats]);

  // Memoized quick action buttons
  const actionButtons = useMemo(() => [
    { title: 'Create Invoice', variant: 'primary', action: quickActions.handleCreateInvoice },
    { title: '📱 Scan Barcode', variant: 'secondary', action: quickActions.handleBarcodeScan },
    { title: 'Add Stock', variant: 'outline', action: quickActions.handleAddStock },
    { title: 'Due Management', variant: 'outline', action: quickActions.handleDueManagement },
    { title: 'View Reports', variant: 'outline', action: quickActions.handleViewReports },
    { title: 'Subscription', variant: 'primary', action: quickActions.handleSubscription },
  ], [quickActions]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Sidebar */}
      <Sidebar 
        isVisible={sidebarVisible} 
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="dashboard"
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
            <Text style={styles.welcomeText}>{t('welcome')} back,</Text>
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
            <Text style={styles.pharmacyName}>{pharmacy?.name}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={statsLoading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats - Optimized with memoization */}
        <View style={styles.statsContainer}>
          {quickStats.map((stat) => (
            <Card key={stat.id} style={styles.statCard} shadow="sm">
              <CardContent>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>
                  {stat.value}
                </Text>
                <Text style={styles.statSubtext}>{stat.subtext}</Text>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Performance Indicator */}
        {__DEV__ && (
          <Card style={styles.debugCard}>
            <CardContent>
              <Text style={styles.debugText}>
                🚀 Real-time Updates: {lastInvoiceUpdate.toLocaleTimeString()}
              </Text>
              <Text style={styles.debugText}>
                📦 Stock Updates: {lastStockUpdate.toLocaleTimeString()}
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Optimized with memoization */}
        <Card style={styles.card}>
          <CardHeader>
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.actionButtons}>
              {actionButtons.map((button, index) => (
                <Button
                  key={`${button.title}-${index}`}
                  title={button.title}
                  variant={button.variant as any}
                  style={[
                    styles.actionButton,
                    button.title === 'Subscription' && styles.subscriptionButton,
                    button.title === '📱 Scan Barcode' && styles.barcodeButton
                  ]}
                  onPress={button.action}
                />
              ))}
            </View>
          </CardContent>
        </Card>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    paddingTop: 35,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },

  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  menuButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  menuIcon: {
    fontSize: 16,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },

  headerInfo: {
    flex: 1,
  },

  welcomeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    opacity: 0.9,
  },

  userName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
    marginTop: 1,
  },

  pharmacyName: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.background,
    opacity: 0.8,
    marginTop: 1,
  },

  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  statsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },

  statCard: {
    flex: 1,
    minWidth: 120,
  },

  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.xs,
  },

  statSubtext: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },

  debugCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: '#F0F9FF',
  },

  debugText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },

  card: {
    marginBottom: theme.spacing.lg,
  },

  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  actionButton: {
    flex: 1,
    minWidth: 150,
  },

  subscriptionButton: {
    backgroundColor: theme.colors.warning,
  },

  barcodeButton: {
    backgroundColor: theme.colors.success,
  },

  bottomSpacing: {
    height: theme.spacing.xl,
  },
}));