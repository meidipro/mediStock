import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useReports, useStock, useInvoices } from '../../hooks/useDatabase';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

interface AIInsight {
  type: 'warning' | 'suggestion' | 'prediction' | 'optimization' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  category: 'stock' | 'sales' | 'financial' | 'operational' | 'customer';
  priority: 'high' | 'medium' | 'low';
  metrics?: {
    current_value?: number;
    target_value?: number;
    improvement_potential?: string;
  };
}

interface BusinessAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  topSellingMedicines: Array<{
    name: string;
    sales_count: number;
    revenue: number;
  }>;
  stockTurnover: number;
  lowStockItems: number;
  duePendingAmount: number;
  profitMargin: number;
}

interface EnhancedAIAnalyticsProps {
  onClose?: () => void;
  timeframe?: '7d' | '30d' | '90d';
}

export const EnhancedAIAnalytics: React.FC<EnhancedAIAnalyticsProps> = ({
  onClose,
  timeframe = '30d',
}) => {
  const { pharmacy } = useAuth();
  const { dailyReport } = useReports();
  const { stockItems, lowStockItems } = useStock();
  const { invoices } = useInvoices();

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const loadBusinessAnalytics = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);

      // Get sales analytics using our optimized function
      const { data: salesData, error: salesError } = await supabase
        .rpc('get_sales_analytics', {
          pharmacy_id_param: pharmacy.id,
          start_date: getStartDate(timeframe),
          end_date: new Date().toISOString().split('T')[0],
        });

      if (salesError) {
        console.warn('Sales analytics failed, using fallback calculations:', salesError);
        
        // Fallback calculations using invoice data
        const recentInvoices = invoices.filter(invoice => {
          const invoiceDate = new Date(invoice.invoice_date);
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90));
          return invoiceDate >= startDate;
        });

        const totalRevenue = recentInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
        const totalTransactions = recentInvoices.length;
        const totalDue = recentInvoices.reduce((sum, inv) => sum + inv.due_amount, 0);

        setAnalytics({
          totalRevenue,
          totalTransactions,
          averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
          topSellingMedicines: [],
          stockTurnover: 0,
          lowStockItems: lowStockItems.length,
          duePendingAmount: totalDue,
          profitMargin: 0,
        });
      } else {
        setAnalytics({
          totalRevenue: salesData?.total_sales || 0,
          totalTransactions: salesData?.total_transactions || 0,
          averageTransactionValue: salesData?.average_transaction || 0,
          topSellingMedicines: [],
          stockTurnover: 0,
          lowStockItems: lowStockItems.length,
          duePendingAmount: salesData?.total_due || 0,
          profitMargin: 0,
        });
      }

      // Generate AI insights based on the analytics
      await generateInsights();
    } catch (error) {
      console.error('Analytics loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id, timeframe, invoices, lowStockItems]);

  const generateInsights = useCallback(async () => {
    if (!analytics) return;

    const newInsights: AIInsight[] = [];

    // Low Stock Analysis
    if (analytics.lowStockItems > 0) {
      newInsights.push({
        type: 'warning',
        title: 'Low Stock Alert',
        description: `${analytics.lowStockItems} medicines are running low on stock. Immediate restocking required to avoid stockouts.`,
        confidence: 95,
        actionable: true,
        category: 'stock',
        priority: 'high',
        metrics: {
          current_value: analytics.lowStockItems,
          target_value: 0,
          improvement_potential: 'Prevent lost sales',
        },
      });
    }

    // Sales Performance Analysis
    if (analytics.totalTransactions > 0) {
      const avgTransactionBenchmark = 500; // BDT
      
      if (analytics.averageTransactionValue < avgTransactionBenchmark) {
        newInsights.push({
          type: 'suggestion',
          title: 'Increase Average Transaction Value',
          description: `Your average transaction value is ৳${analytics.averageTransactionValue.toFixed(2)}. Consider bundling products or suggesting complementary medicines.`,
          confidence: 80,
          actionable: true,
          category: 'sales',
          priority: 'medium',
          metrics: {
            current_value: analytics.averageTransactionValue,
            target_value: avgTransactionBenchmark,
            improvement_potential: `৳${(avgTransactionBenchmark - analytics.averageTransactionValue).toFixed(2)} per transaction`,
          },
        });
      } else {
        newInsights.push({
          type: 'optimization',
          title: 'Excellent Transaction Value',
          description: `Your average transaction value of ৳${analytics.averageTransactionValue.toFixed(2)} is above market average. Great upselling performance!`,
          confidence: 90,
          actionable: false,
          category: 'sales',
          priority: 'low',
        });
      }
    }

    // Due Amount Analysis
    if (analytics.duePendingAmount > 1000) {
      newInsights.push({
        type: 'warning',
        title: 'High Pending Due Amount',
        description: `৳${analytics.duePendingAmount.toFixed(2)} is pending collection. Implement follow-up reminders to improve cash flow.`,
        confidence: 85,
        actionable: true,
        category: 'financial',
        priority: 'high',
        metrics: {
          current_value: analytics.duePendingAmount,
          target_value: 500,
          improvement_potential: 'Improved cash flow',
        },
      });
    }

    // Revenue Growth Analysis
    if (analytics.totalRevenue > 0) {
      const revenueTarget = 50000; // Monthly target
      const dailyAverage = analytics.totalRevenue / (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90);
      const monthlyProjection = dailyAverage * 30;

      if (monthlyProjection < revenueTarget) {
        newInsights.push({
          type: 'opportunity',
          title: 'Revenue Growth Opportunity',
          description: `Current monthly projection: ৳${monthlyProjection.toFixed(2)}. Consider expanding product range or marketing efforts.`,
          confidence: 75,
          actionable: true,
          category: 'financial',
          priority: 'medium',
          metrics: {
            current_value: monthlyProjection,
            target_value: revenueTarget,
            improvement_potential: `৳${(revenueTarget - monthlyProjection).toFixed(2)} monthly`,
          },
        });
      }
    }

    // Stock Management Insights
    const totalStockValue = stockItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    if (totalStockValue > 100000) {
      newInsights.push({
        type: 'optimization',
        title: 'High Inventory Investment',
        description: `Current stock value: ৳${totalStockValue.toFixed(2)}. Consider optimizing slow-moving stock to improve cash flow.`,
        confidence: 70,
        actionable: true,
        category: 'operational',
        priority: 'medium',
        metrics: {
          current_value: totalStockValue,
          improvement_potential: '10-20% cash flow improvement',
        },
      });
    }

    // Operational Efficiency
    if (analytics.totalTransactions > 100) {
      newInsights.push({
        type: 'suggestion',
        title: 'High Transaction Volume',
        description: `${analytics.totalTransactions} transactions processed. Consider implementing loyalty programs to retain customers.`,
        confidence: 85,
        actionable: true,
        category: 'customer',
        priority: 'medium',
      });
    }

    setInsights(newInsights);
  }, [analytics, stockItems]);

  const getStartDate = (timeframe: string): string => {
    const date = new Date();
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return 'warning-outline';
      case 'suggestion': return 'bulb-outline';
      case 'prediction': return 'trending-up-outline';
      case 'optimization': return 'settings-outline';
      case 'opportunity': return 'rocket-outline';
      default: return 'information-circle-outline';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return Theme.colors.error;
      case 'suggestion': return Theme.colors.warning;
      case 'prediction': return Theme.colors.info;
      case 'optimization': return Theme.colors.success;
      case 'opportunity': return Theme.colors.primary;
      default: return Theme.colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Theme.colors.error;
      case 'medium': return Theme.colors.warning;
      case 'low': return Theme.colors.success;
      default: return Theme.colors.textSecondary;
    }
  };

  useEffect(() => {
    loadBusinessAnalytics();
  }, [loadBusinessAnalytics]);

  const filteredInsights = insights.filter(insight => {
    const categoryMatch = selectedCategory === 'all' || insight.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || insight.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

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

    analyticsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },

    analyticsCard: {
      flex: 1,
      minWidth: '45%',
    },

    analyticsValue: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.primary,
    },

    analyticsLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    filters: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },

    filterGroup: {
      flex: 1,
    },

    filterLabel: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },

    filterButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },

    filterButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    filterButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },

    filterButtonText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
    },

    filterButtonTextActive: {
      color: theme.colors.background,
    },

    insightCard: {
      marginBottom: theme.spacing.md,
    },

    insightHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },

    insightIcon: {
      marginRight: theme.spacing.sm,
      marginTop: 2,
    },

    insightContent: {
      flex: 1,
    },

    insightTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: 2,
    },

    insightDescription: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },

    insightMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },

    insightMetrics: {
      flex: 1,
    },

    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 2,
    },

    metricLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
    },

    metricValue: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.text,
    },

    insightBadges: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },

    priorityBadge: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.xs,
    },

    priorityText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.background,
      fontWeight: theme.typography.weights.medium,
    },

    confidenceBadge: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.xs,
      backgroundColor: theme.colors.info,
    },

    confidenceText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.background,
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

    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },

    emptyText: {
      fontSize: theme.typography.sizes.lg,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing your business data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>AI Business Analytics</Text>
          <Text style={styles.subtitle}>
            Last {timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days'} • {insights.length} insights
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Analytics Overview */}
      {analytics && (
        <View style={styles.analyticsGrid}>
          <Card style={styles.analyticsCard}>
            <CardContent>
              <Text style={styles.analyticsValue}>৳{analytics.totalRevenue.toFixed(0)}</Text>
              <Text style={styles.analyticsLabel}>Total Revenue</Text>
            </CardContent>
          </Card>
          
          <Card style={styles.analyticsCard}>
            <CardContent>
              <Text style={styles.analyticsValue}>{analytics.totalTransactions}</Text>
              <Text style={styles.analyticsLabel}>Transactions</Text>
            </CardContent>
          </Card>
          
          <Card style={styles.analyticsCard}>
            <CardContent>
              <Text style={styles.analyticsValue}>৳{analytics.averageTransactionValue.toFixed(0)}</Text>
              <Text style={styles.analyticsLabel}>Avg Transaction</Text>
            </CardContent>
          </Card>
          
          <Card style={styles.analyticsCard}>
            <CardContent>
              <Text style={styles.analyticsValue}>{analytics.lowStockItems}</Text>
              <Text style={styles.analyticsLabel}>Low Stock Items</Text>
            </CardContent>
          </Card>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterButtons}>
            {['all', 'stock', 'sales', 'financial', 'operational'].map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterButton,
                  selectedCategory === category && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedCategory === category && styles.filterButtonTextActive,
                ]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Priority</Text>
          <View style={styles.filterButtons}>
            {['all', 'high', 'medium', 'low'].map((priority) => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.filterButton,
                  selectedPriority === priority && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedPriority(priority)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedPriority === priority && styles.filterButtonTextActive,
                ]}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Insights */}
      {filteredInsights.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={64} color={Theme.colors.textSecondary} />
          <Text style={styles.emptyText}>
            {insights.length === 0 
              ? 'No insights available yet. More data needed for analysis.'
              : 'No insights match your filters.'
            }
          </Text>
        </View>
      ) : (
        filteredInsights.map((insight, index) => (
          <Card key={index} style={styles.insightCard}>
            <CardContent>
              <View style={styles.insightHeader}>
                <Ionicons
                  name={getInsightIcon(insight.type) as any}
                  size={20}
                  color={getInsightColor(insight.type)}
                  style={styles.insightIcon}
                />
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDescription}>{insight.description}</Text>
                </View>
              </View>

              <View style={styles.insightMeta}>
                {insight.metrics && (
                  <View style={styles.insightMetrics}>
                    {insight.metrics.current_value !== undefined && (
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Current:</Text>
                        <Text style={styles.metricValue}>
                          {typeof insight.metrics.current_value === 'number' 
                            ? insight.metrics.current_value.toFixed(0)
                            : insight.metrics.current_value
                          }
                        </Text>
                      </View>
                    )}
                    {insight.metrics.target_value !== undefined && (
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Target:</Text>
                        <Text style={styles.metricValue}>
                          {insight.metrics.target_value.toFixed(0)}
                        </Text>
                      </View>
                    )}
                    {insight.metrics.improvement_potential && (
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Potential:</Text>
                        <Text style={styles.metricValue}>
                          {insight.metrics.improvement_potential}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.insightBadges}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(insight.priority) }]}>
                    <Text style={styles.priorityText}>{insight.priority.toUpperCase()}</Text>
                  </View>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>{insight.confidence}%</Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        ))
      )}
    </ScrollView>
  );
};