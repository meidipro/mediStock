import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useReports, useInvoices, useStock } from '../../hooks/useDatabase';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
  subtitle?: string;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color: string;
    strokeWidth?: number;
  }>;
}

interface AdvancedBusinessDashboardProps {
  timeframe?: '7d' | '30d' | '90d' | '1y';
  onClose?: () => void;
}

export const AdvancedBusinessDashboard: React.FC<AdvancedBusinessDashboardProps> = ({
  timeframe = '30d',
  onClose,
}) => {
  const { pharmacy } = useAuth();
  const { dailyReport } = useReports();
  const { invoices } = useInvoices();
  const { stockItems, lowStockItems } = useStock();

  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [salesChart, setSalesChart] = useState<ChartData | null>(null);
  const [inventoryChart, setInventoryChart] = useState<ChartData | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  const calculateAdvancedMetrics = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);

      const days = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : selectedTimeframe === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Filter invoices for the selected timeframe
      const periodInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.invoice_date);
        return invoiceDate >= startDate;
      });

      // Calculate current period metrics
      const currentRevenue = periodInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const currentTransactions = periodInvoices.length;
      const currentDue = periodInvoices.reduce((sum, inv) => sum + inv.due_amount, 0);
      const currentCustomers = new Set(periodInvoices.filter(inv => inv.customer_id).map(inv => inv.customer_id)).size;

      // Calculate previous period for comparison
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);
      const prevEndDate = new Date(startDate);

      const prevPeriodInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.invoice_date);
        return invoiceDate >= prevStartDate && invoiceDate < prevEndDate;
      });

      const prevRevenue = prevPeriodInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const prevTransactions = prevPeriodInvoices.length;
      const prevDue = prevPeriodInvoices.reduce((sum, inv) => sum + inv.due_amount, 0);
      const prevCustomers = new Set(prevPeriodInvoices.filter(inv => inv.customer_id).map(inv => inv.customer_id)).size;

      // Calculate inventory metrics
      const totalStockValue = stockItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const avgStockValue = stockItems.length > 0 ? totalStockValue / stockItems.length : 0;
      const stockTurnover = currentRevenue > 0 ? (totalStockValue / currentRevenue) * days : 0;

      // Calculate percentage changes
      const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const transactionChange = prevTransactions > 0 ? ((currentTransactions - prevTransactions) / prevTransactions) * 100 : 0;
      const dueChange = prevDue > 0 ? ((currentDue - prevDue) / prevDue) * 100 : 0;
      const customerChange = prevCustomers > 0 ? ((currentCustomers - prevCustomers) / prevCustomers) * 100 : 0;

      const newMetrics: MetricCard[] = [
        {
          title: 'Revenue',
          value: `৳${currentRevenue.toLocaleString()}`,
          change: revenueChange,
          changeType: revenueChange >= 0 ? 'increase' : 'decrease',
          icon: 'cash-outline',
          color: Theme.colors.success,
          subtitle: `${currentTransactions} transactions`,
        },
        {
          title: 'Average Transaction',
          value: `৳${currentTransactions > 0 ? (currentRevenue / currentTransactions).toFixed(0) : '0'}`,
          change: transactionChange,
          changeType: transactionChange >= 0 ? 'increase' : 'decrease',
          icon: 'receipt-outline',
          color: Theme.colors.primary,
          subtitle: 'per transaction',
        },
        {
          title: 'Due Amount',
          value: `৳${currentDue.toLocaleString()}`,
          change: dueChange,
          changeType: dueChange <= 0 ? 'increase' : 'decrease', // Lower due is better
          icon: 'time-outline',
          color: Theme.colors.warning,
          subtitle: 'pending collection',
        },
        {
          title: 'Active Customers',
          value: currentCustomers.toString(),
          change: customerChange,
          changeType: customerChange >= 0 ? 'increase' : 'decrease',
          icon: 'people-outline',
          color: Theme.colors.info,
          subtitle: 'unique customers',
        },
        {
          title: 'Inventory Value',
          value: `৳${totalStockValue.toLocaleString()}`,
          change: 0, // Would need historical data
          changeType: 'neutral',
          icon: 'cube-outline',
          color: Theme.colors.secondary,
          subtitle: `${stockItems.length} items`,
        },
        {
          title: 'Low Stock Alerts',
          value: lowStockItems.length.toString(),
          change: 0, // Would need historical data
          changeType: lowStockItems.length > 0 ? 'decrease' : 'increase',
          icon: 'warning-outline',
          color: Theme.colors.error,
          subtitle: 'items need restock',
        },
      ];

      setMetrics(newMetrics);

      // Generate sales chart data
      const salesChartData = generateSalesChartData(periodInvoices, days);
      setSalesChart(salesChartData);

      // Generate inventory chart data
      const inventoryChartData = generateInventoryChartData();
      setInventoryChart(inventoryChartData);

      // Calculate top products
      const topProductsData = calculateTopProducts(periodInvoices);
      setTopProducts(topProductsData);

    } catch (error) {
      console.error('Advanced metrics calculation error:', error);
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id, selectedTimeframe, invoices, stockItems, lowStockItems]);

  const generateSalesChartData = (invoices: any[], days: number): ChartData => {
    const dailySales = new Map<string, number>();
    
    // Initialize all days with 0
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailySales.set(date.toISOString().split('T')[0], 0);
    }

    // Fill with actual sales data
    invoices.forEach(invoice => {
      const date = invoice.invoice_date;
      if (dailySales.has(date)) {
        dailySales.set(date, (dailySales.get(date) || 0) + invoice.total_amount);
      }
    });

    const sortedEntries = Array.from(dailySales.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-Math.min(days, 30));

    return {
      labels: sortedEntries.map(([date]) => new Date(date).getDate().toString()),
      datasets: [{
        data: sortedEntries.map(([, amount]) => amount),
        color: Theme.colors.primary,
        strokeWidth: 2,
      }],
    };
  };

  const generateInventoryChartData = (): ChartData => {
    const categoryData = new Map<string, { value: number, count: number }>();

    stockItems.forEach(item => {
      const category = item.medicine?.category || 'Other';
      const value = item.quantity * item.unit_price;
      
      if (!categoryData.has(category)) {
        categoryData.set(category, { value: 0, count: 0 });
      }
      
      const current = categoryData.get(category)!;
      current.value += value;
      current.count += 1;
    });

    const sortedCategories = Array.from(categoryData.entries())
      .sort(([, a], [, b]) => b.value - a.value)
      .slice(0, 6);

    return {
      labels: sortedCategories.map(([category]) => category),
      datasets: [{
        data: sortedCategories.map(([, data]) => data.value),
        color: Theme.colors.secondary,
      }],
    };
  };

  const calculateTopProducts = (invoices: any[]) => {
    const productStats = new Map<string, { name: string, quantity: number, revenue: number, frequency: number }>();

    invoices.forEach(invoice => {
      if (invoice.invoice_items) {
        invoice.invoice_items.forEach((item: any) => {
          const id = item.medicine_id;
          const name = item.medicines?.generic_name || 'Unknown Medicine';
          
          if (!productStats.has(id)) {
            productStats.set(id, { name, quantity: 0, revenue: 0, frequency: 0 });
          }
          
          const stats = productStats.get(id)!;
          stats.quantity += item.quantity;
          stats.revenue += item.total_amount;
          stats.frequency += 1;
        });
      }
    });

    return Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const exportReport = async () => {
    try {
      Alert.alert(
        'Export Report',
        'Choose export format:',
        [
          { text: 'PDF', onPress: () => exportToPDF() },
          { text: 'CSV', onPress: () => exportToCSV() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export report');
    }
  };

  const exportToPDF = async () => {
    // PDF export implementation would go here
    Alert.alert('Info', 'PDF export feature coming soon!');
  };

  const exportToCSV = async () => {
    // CSV export implementation would go here
    Alert.alert('Info', 'CSV export feature coming soon!');
  };

  useEffect(() => {
    calculateAdvancedMetrics();
  }, [calculateAdvancedMetrics]);

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },

    title: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },

    subtitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    timeframeSelector: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    },

    timeframeButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    timeframeButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },

    timeframeButtonText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },

    timeframeButtonTextActive: {
      color: theme.colors.background,
    },

    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },

    metricCard: {
      flex: 1,
      minWidth: (width - theme.spacing.md * 3) / 2,
      maxWidth: (width - theme.spacing.md * 3) / 2,
    },

    metricContent: {
      alignItems: 'center',
    },

    metricIcon: {
      marginBottom: theme.spacing.sm,
    },

    metricValue: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      textAlign: 'center',
    },

    metricTitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },

    metricSubtitle: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: 2,
    },

    metricChange: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.xs,
    },

    changeText: {
      fontSize: theme.typography.sizes.xs,
      marginLeft: 2,
    },

    changeIncrease: {
      color: theme.colors.success,
    },

    changeDecrease: {
      color: theme.colors.error,
    },

    changeNeutral: {
      color: theme.colors.textSecondary,
    },

    chartCard: {
      marginBottom: theme.spacing.lg,
    },

    chartContainer: {
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
    },

    chartPlaceholder: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
    },

    topProductsList: {
      marginBottom: theme.spacing.lg,
    },

    productItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },

    productInfo: {
      flex: 1,
    },

    productName: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.text,
    },

    productStats: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    productRevenue: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.primary,
    },

    actions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },

    actionButton: {
      flex: 1,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },

    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
    },
  }));

  if (loading && metrics.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading advanced analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Business Analytics</Text>
          <Text style={styles.subtitle}>
            Advanced insights and performance metrics
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Timeframe Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeframeSelector}>
        {['7d', '30d', '90d', '1y'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.timeframeButton,
              selectedTimeframe === period && styles.timeframeButtonActive,
            ]}
            onPress={() => setSelectedTimeframe(period as any)}
          >
            <Text style={[
              styles.timeframeButtonText,
              selectedTimeframe === period && styles.timeframeButtonTextActive,
            ]}>
              {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '1 Year'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <Card key={index} style={styles.metricCard}>
            <CardContent style={styles.metricContent}>
              <Ionicons
                name={metric.icon as any}
                size={24}
                color={metric.color}
                style={styles.metricIcon}
              />
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricTitle}>{metric.title}</Text>
              {metric.subtitle && (
                <Text style={styles.metricSubtitle}>{metric.subtitle}</Text>
              )}
              {metric.change !== 0 && (
                <View style={styles.metricChange}>
                  <Ionicons
                    name={metric.changeType === 'increase' ? 'trending-up' : metric.changeType === 'decrease' ? 'trending-down' : 'remove'}
                    size={12}
                    color={
                      metric.changeType === 'increase' ? Theme.colors.success :
                      metric.changeType === 'decrease' ? Theme.colors.error :
                      Theme.colors.textSecondary
                    }
                  />
                  <Text style={[
                    styles.changeText,
                    metric.changeType === 'increase' ? styles.changeIncrease :
                    metric.changeType === 'decrease' ? styles.changeDecrease :
                    styles.changeNeutral
                  ]}>
                    {Math.abs(metric.change).toFixed(1)}%
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Sales Chart */}
      <Card style={styles.chartCard}>
        <CardHeader>
          <Text style={styles.title}>Sales Trend</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.chartContainer}>
            <Text style={styles.chartPlaceholder}>
              Sales chart visualization would go here
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Inventory Distribution Chart */}
      <Card style={styles.chartCard}>
        <CardHeader>
          <Text style={styles.title}>Inventory by Category</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.chartContainer}>
            <Text style={styles.chartPlaceholder}>
              Inventory distribution chart would go here
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card style={styles.topProductsList}>
        <CardHeader>
          <Text style={styles.title}>Top Performing Products</Text>
        </CardHeader>
        <CardContent>
          {topProducts.map((product, index) => (
            <View key={index} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productStats}>
                  {product.quantity} units • {product.frequency} sales
                </Text>
              </View>
              <Text style={styles.productRevenue}>
                ৳{product.revenue.toLocaleString()}
              </Text>
            </View>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Export Report"
          variant="outline"
          onPress={exportReport}
          style={styles.actionButton}
        />
        <Button
          title="Refresh Data"
          variant="primary"
          onPress={calculateAdvancedMetrics}
          style={styles.actionButton}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
};