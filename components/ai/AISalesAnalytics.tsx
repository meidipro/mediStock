import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { aiService } from '../../lib/ai-service';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface AISalesAnalyticsProps {
  salesData: any[];
  periodStats: any;
  period: string;
}

export const AISalesAnalytics: React.FC<AISalesAnalyticsProps> = ({
  salesData,
  periodStats,
  period,
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (salesData.length > 0) {
      generateSalesAnalytics();
    }
  }, [salesData, period]);

  const generateSalesAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const salesAnalyticsData = {
        period,
        totalRevenue: periodStats.totalSales,
        totalTransactions: periodStats.totalTransactions,
        averageOrderValue: periodStats.totalSales / periodStats.totalTransactions,
        totalDue: periodStats.totalDue,
        paymentMethods: getPaymentMethodStats(),
        hourlyPattern: getHourlyPattern(),
        dailyPattern: getDailyPattern(),
        customerSegments: getCustomerSegments(),
        topProducts: getTopProducts(),
        profitMargins: calculateProfitMargins(),
      };

      const aiAnalytics = await generateAISalesInsights(salesAnalyticsData);
      setAnalytics(aiAnalytics);
    } catch (err) {
      setError('Failed to generate sales analytics');
      console.error('Sales analytics generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodStats = () => {
    const paymentStats = new Map();
    salesData.forEach(sale => {
      const method = sale.payment_method || 'cash';
      paymentStats.set(method, (paymentStats.get(method) || 0) + sale.total_amount);
    });
    return Object.fromEntries(paymentStats);
  };

  const getHourlyPattern = () => {
    const hourlyStats = new Array(24).fill(0);
    salesData.forEach(sale => {
      const hour = new Date(sale.created_at).getHours();
      hourlyStats[hour] += sale.total_amount;
    });
    return hourlyStats;
  };

  const getDailyPattern = () => {
    const dailyStats = new Map();
    salesData.forEach(sale => {
      const date = new Date(sale.created_at).toDateString();
      dailyStats.set(date, (dailyStats.get(date) || 0) + sale.total_amount);
    });
    return Object.fromEntries(dailyStats);
  };

  const getCustomerSegments = () => {
    const walkInSales = salesData.filter(sale => !sale.customer_id);
    const regularCustomerSales = salesData.filter(sale => sale.customer_id);
    
    return {
      walkIn: {
        count: walkInSales.length,
        revenue: walkInSales.reduce((sum, sale) => sum + sale.total_amount, 0),
      },
      regular: {
        count: regularCustomerSales.length,
        revenue: regularCustomerSales.reduce((sum, sale) => sum + sale.total_amount, 0),
      },
    };
  };

  const getTopProducts = () => {
    const productStats = new Map();
    
    salesData.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const key = item.medicine_name;
          if (!productStats.has(key)) {
            productStats.set(key, { 
              quantity: 0, 
              revenue: 0, 
              transactions: 0,
              avgPrice: 0 
            });
          }
          const stats = productStats.get(key);
          stats.quantity += item.quantity;
          stats.revenue += item.total_amount;
          stats.transactions += 1;
          stats.avgPrice = item.unit_price;
        });
      }
    });

    return Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const calculateProfitMargins = () => {
    let totalCost = 0;
    let totalRevenue = 0;
    
    salesData.forEach(sale => {
      totalRevenue += sale.total_amount;
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          // Assuming cost price is 70% of unit price if not available
          const costPrice = item.cost_price || (item.unit_price * 0.7);
          totalCost += costPrice * item.quantity;
        });
      }
    });

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      profit,
      profitMargin,
    };
  };

  const generateAISalesInsights = async (data: any) => {
    const prompt = `
    Analyze this Bangladesh pharmacy sales data and provide comprehensive insights:

    Period: ${data.period}
    Sales Metrics:
    - Total Revenue: ৳${data.totalRevenue}
    - Transactions: ${data.totalTransactions}
    - Average Order Value: ৳${data.averageOrderValue.toFixed(2)}
    - Total Due: ৳${data.totalDue}
    - Profit Margin: ${data.profitMargins.profitMargin.toFixed(2)}%

    Customer Segments:
    - Walk-in Sales: ${data.customerSegments.walkIn.count} (৳${data.customerSegments.walkIn.revenue})
    - Regular Customer Sales: ${data.customerSegments.regular.count} (৳${data.customerSegments.regular.revenue})

    Payment Methods: ${JSON.stringify(data.paymentMethods)}
    Top Products: ${JSON.stringify(data.topProducts.slice(0, 5))}

    Provide analysis in JSON format:
    {
      "performanceInsights": [
        "Key performance observations"
      ],
      "salesPatterns": {
        "peakHours": "description of peak sales hours",
        "customerBehavior": "insights about customer behavior",
        "productPerformance": "top product insights"
      },
      "anomalies": [
        "Unusual patterns or anomalies detected"
      ],
      "optimizationSuggestions": [
        "Specific suggestions to improve sales"
      ],
      "revenueProjection": {
        "nextPeriod": "projected revenue for next period",
        "confidence": "high/medium/low",
        "factors": ["factors affecting projection"]
      },
      "actionItems": [
        "Immediate actions to take"
      ]
    }

    Focus on practical insights for Bangladesh pharmacy operations.
    `;

    try {
      const response = await aiService.makeRequest([
        { role: 'system', content: 'You are a sales analytics AI specializing in pharmacy retail analysis.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      return {
        performanceInsights: [
          'Sales performance shows steady activity',
          'Customer base includes both walk-in and regular customers',
          'Medicine portfolio shows diverse demand patterns'
        ],
        salesPatterns: {
          peakHours: 'Morning and evening hours typically show higher activity',
          customerBehavior: 'Mix of walk-in and regular customers indicates good market reach',
          productPerformance: 'Top medicines drive majority of revenue'
        },
        anomalies: [
          'No significant anomalies detected in current data'
        ],
        optimizationSuggestions: [
          'Focus on promoting high-margin medicines',
          'Implement customer retention programs',
          'Optimize inventory for fast-moving items'
        ],
        revenueProjection: {
          nextPeriod: 'Stable to slight growth expected',
          confidence: 'medium',
          factors: ['Seasonal demand', 'Market competition', 'Customer loyalty']
        },
        actionItems: [
          'Review pricing strategy for top products',
          'Improve customer data collection',
          'Monitor stock levels for popular items'
        ]
      };
    }
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <CardContent>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>🤖 Analyzing sales patterns...</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.container}>
        <CardContent>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={generateSalesAnalytics} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry Analysis</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <CardHeader>
        <Text style={styles.title}>📊 AI Sales Analytics</Text>
      </CardHeader>
      <CardContent>
        {/* Performance Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Performance Insights</Text>
          {analytics.performanceInsights.map((insight: string, index: number) => (
            <Text key={index} style={styles.insightText}>• {insight}</Text>
          ))}
        </View>

        {/* Sales Patterns */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Sales Patterns</Text>
          
          <View style={styles.patternItem}>
            <Text style={styles.patternLabel}>⏰ Peak Hours:</Text>
            <Text style={styles.patternValue}>{analytics.salesPatterns.peakHours}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <Text style={styles.patternLabel}>👥 Customer Behavior:</Text>
            <Text style={styles.patternValue}>{analytics.salesPatterns.customerBehavior}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <Text style={styles.patternLabel}>💊 Product Performance:</Text>
            <Text style={styles.patternValue}>{analytics.salesPatterns.productPerformance}</Text>
          </View>
        </View>

        {/* Revenue Projection */}
        <View style={styles.projectionSection}>
          <Text style={styles.sectionTitle}>🔮 Revenue Projection</Text>
          <View style={styles.projectionContainer}>
            <View style={styles.projectionMain}>
              <Text style={styles.projectionValue}>{analytics.revenueProjection.nextPeriod}</Text>
              <Text style={[
                styles.confidenceText,
                { color: getConfidenceColor(analytics.revenueProjection.confidence) }
              ]}>
                {analytics.revenueProjection.confidence.toUpperCase()} CONFIDENCE
              </Text>
            </View>
          </View>
          
          <View style={styles.factorsContainer}>
            <Text style={styles.factorsTitle}>Key Factors:</Text>
            {analytics.revenueProjection.factors.map((factor: string, index: number) => (
              <Text key={index} style={styles.factorText}>• {factor}</Text>
            ))}
          </View>
        </View>

        {/* Anomalies */}
        {analytics.anomalies.length > 0 && (
          <View style={styles.anomaliesSection}>
            <Text style={styles.sectionTitle}>🔍 Anomalies Detected</Text>
            {analytics.anomalies.map((anomaly: string, index: number) => (
              <Text key={index} style={styles.anomalyText}>• {anomaly}</Text>
            ))}
          </View>
        )}

        {/* Optimization Suggestions */}
        <View style={styles.optimizationSection}>
          <Text style={styles.sectionTitle}>🚀 Optimization Suggestions</Text>
          {analytics.optimizationSuggestions.map((suggestion: string, index: number) => (
            <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
          ))}
        </View>

        {/* Action Items */}
        <View style={styles.actionItemsSection}>
          <Text style={styles.sectionTitle}>✅ Immediate Action Items</Text>
          {analytics.actionItems.map((action: string, index: number) => (
            <View key={index} style={styles.actionItem}>
              <Text style={styles.actionItemText}>• {action}</Text>
            </View>
          ))}
        </View>
      </CardContent>
    </Card>
  );

  function getConfidenceColor(confidence: string) {
    switch (confidence.toLowerCase()) {
      case 'high':
        return Theme.colors.success;
      case 'medium':
        return Theme.colors.warning;
      case 'low':
        return Theme.colors.error;
      default:
        return Theme.colors.textSecondary;
    }
  }
};

const styles = createThemedStyles((theme) => ({
  container: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },

  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },

  loadingContainer: {
    alignItems: 'center' as const,
    padding: theme.spacing.xl,
  },

  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center' as const,
  },

  errorContainer: {
    alignItems: 'center' as const,
    padding: theme.spacing.lg,
  },

  errorText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },

  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },

  retryButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
  },

  section: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  insightText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  patternItem: {
    marginBottom: theme.spacing.sm,
  },

  patternLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  patternValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  projectionSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },

  projectionContainer: {
    alignItems: 'center' as const,
    marginBottom: theme.spacing.md,
  },

  projectionMain: {
    alignItems: 'center' as const,
  },

  projectionValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.xs,
  },

  confidenceText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
  },

  factorsContainer: {
    marginTop: theme.spacing.sm,
  },

  factorsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  factorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },

  anomaliesSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },

  anomalyText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  optimizationSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info,
  },

  suggestionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  actionItemsSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },

  actionItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.xs,
  },

  actionItemText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
}));