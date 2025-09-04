import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Sidebar } from '../../components/ui/Sidebar';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReports, useStock } from '../../hooks/useDatabase';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, pharmacy, signOut } = useAuth();
  const { t } = useLanguage();
  const { dailyReport, loading: reportLoading, generateDailyReport } = useReports();
  const { lowStockItems, loading: stockLoading, fetchLowStock } = useStock();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  // Remove separate state variables as they're now handled by useReports
  // const [todaysSales, setTodaysSales] = useState(0);
  // const [todaysTransactions, setTodaysTransactions] = useState(0);
  // const [totalDueAmount, setTotalDueAmount] = useState(0);

  useEffect(() => {
    generateDailyReport();
    fetchLowStock();
  }, [generateDailyReport, fetchLowStock, pharmacy?.id]);

  // Listen for invoice creation events to refresh dashboard
  useEffect(() => {
    const handleInvoiceCreated = () => {
      console.log('🔄 Invoice created, refreshing dashboard...');
      generateDailyReport();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('invoiceCreated', handleInvoiceCreated);
      return () => {
        window.removeEventListener('invoiceCreated', handleInvoiceCreated);
      };
    }
  }, [generateDailyReport]);

  // Reload dashboard data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      generateDailyReport();
      fetchLowStock();
    }, [generateDailyReport, fetchLowStock])
  );

  const handleRefresh = async () => {
    await Promise.all([
      generateDailyReport(),
      fetchLowStock()
    ]);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  // Quick Actions handlers
  const handleCreateInvoice = () => {
    router.push('/InvoiceManagement');
  };

  const handleDueManagement = () => {
    router.push('/DueInvoices');
  };

  const handleAddStock = () => {
    router.push('/(tabs)/inventory');
  };

  const handleViewReports = () => {
    router.push('/(tabs)/reports');
  };

  const handleSubscription = () => {
    router.push('/subscription');
  };

  const handleBarcodeScan = () => {
    router.push('/(tabs)/inventory?action=barcode');
  };



  const isLoading = reportLoading || stockLoading;

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
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard} shadow="sm">
            <CardContent>
              <Text style={styles.statLabel}>Today Sales</Text>
              <Text style={styles.statValue}>
                ৳{(dailyReport?.total_sales || 0).toLocaleString()}
              </Text>
              <Text style={styles.statSubtext}>
                {dailyReport?.total_transactions || 0} transactions today
              </Text>
            </CardContent>
          </Card>

          <Card style={styles.statCard} shadow="sm">
            <CardContent>
              <Text style={styles.statLabel}>Due Amount</Text>
              <Text style={[styles.statValue, { color: Theme.colors.error }]}>
                ৳{(dailyReport?.total_due || 0).toLocaleString()}
              </Text>
              <Text style={styles.statSubtext}>
                {(dailyReport as any)?.due_invoices_count || 0} outstanding invoices
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* No Data Message */}
        {dailyReport && (dailyReport.total_sales === 0 && dailyReport.total_due === 0 && (dailyReport as any)?.all_time_sales === 0) && (
          <Card style={styles.card}>
            <CardContent>
              <Text style={styles.noDataTitle}>📊 No Sales Data Found</Text>
              <Text style={styles.noDataText}>
                Your dashboard is ready! To see sales data, create your first invoice using the "Create Invoice" button below.
              </Text>
              <Button
                title="Create First Invoice"
                variant="primary"
                style={styles.createInvoiceButton}
                onPress={handleCreateInvoice}
              />
            </CardContent>
          </Card>
        )}



        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card style={styles.alertCard} variant="outlined">
            <CardHeader>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>⚠️ {t('lowStockItems')} Alert</Text>
                <Text style={styles.alertCount}>{lowStockItems.length} items</Text>
              </View>
            </CardHeader>
            <CardContent>
              <View style={styles.lowStockList}>
                {lowStockItems.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.lowStockItem}>
                    <View style={styles.lowStockInfo}>
                      <Text style={styles.medicineName} numberOfLines={1}>
                        {item.generic_name}
                      </Text>
                      <Text style={styles.medicineSubtitle} numberOfLines={1}>
                        {item.brand_name}
                      </Text>
                    </View>
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>
                        {item.current_quantity}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              {lowStockItems.length > 3 && (
                <Button
                  title={`View ${lowStockItems.length - 3} more`}
                  variant="ghost"
                  size="sm"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Top Medicines */}
        {dailyReport?.top_medicines && dailyReport.top_medicines.length > 0 && (
          <Card style={styles.card}>
            <CardHeader>
              <Text style={styles.cardTitle}>Today&apos;s Top Medicines</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.topMedicinesList}>
                {dailyReport.top_medicines.slice(0, 5).map((medicine, index) => (
                  <View key={index} style={styles.topMedicineItem}>
                    <View style={styles.medicineRank}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.medicineDetails}>
                      <Text style={styles.medicineName} numberOfLines={1}>
                        {medicine.medicine_name}
                      </Text>
                      <Text style={styles.medicineStats}>
                        Qty: {medicine.quantity} • ৳{parseFloat(medicine.total_amount).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card style={styles.card}>
          <CardHeader>
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.actionButtons}>
              <Button
                title="Create Invoice"
                variant="primary"
                style={styles.actionButton}
                onPress={handleCreateInvoice}
              />
              <Button
                title="📱 Scan Barcode"
                variant="secondary"
                style={[styles.actionButton, styles.barcodeButton]}
                onPress={handleBarcodeScan}
              />
              <Button
                title="Add Stock"
                variant="outline"
                style={styles.actionButton}
                onPress={handleAddStock}
              />
              <Button
                title="Due Management"
                variant="outline"
                style={styles.actionButton}
                onPress={handleDueManagement}
              />
              <Button
                title="View Reports"
                variant="outline"
                style={styles.actionButton}
                onPress={handleViewReports}
              />
              <Button
                title="Subscription"
                variant="primary"
                style={[styles.actionButton, styles.subscriptionButton]}
                onPress={handleSubscription}
              />
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

  signOutButton: {
    padding: theme.spacing.sm,
  },

  signOutText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    opacity: 0.9,
  },

  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  statsContainer: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },

  statCard: {
    flex: 1,
  },

  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  statValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  statSubtext: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },

  alertCard: {
    marginBottom: theme.spacing.lg,
    borderColor: theme.colors.warning,
  },

  alertHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  alertTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.warning,
  },

  alertCount: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  lowStockList: {
    gap: theme.spacing.sm,
  },

  lowStockItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  lowStockInfo: {
    flex: 1,
  },

  medicineName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  medicineSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  stockBadge: {
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },

  stockBadgeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.warning,
  },

  card: {
    marginBottom: theme.spacing.lg,
  },

  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  topMedicinesList: {
    gap: theme.spacing.sm,
  },

  topMedicineItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
  },

  medicineRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: theme.spacing.md,
  },

  rankText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },

  medicineDetails: {
    flex: 1,
  },

  medicineStats: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
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

  noDataTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  noDataText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },

  createInvoiceButton: {
    alignSelf: 'center' as const,
  },
}));