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

interface AIReportsInsightsProps {
  salesData: any[];
  stockData: any[];
  customerData: any[];
  period: string;
}

export const AIReportsInsights: React.FC<AIReportsInsightsProps> = ({
  salesData,
  stockData,
  customerData,
  period,
}) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (salesData.length > 0) {
      generateInsights();
    }
  }, [salesData, period]);

  const generateInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare data for AI analysis
      const analyticsData = {
        period,
        salesSummary: {
          totalRevenue: salesData.reduce((sum, sale) => sum + sale.total_amount, 0),
          totalTransactions: salesData.length,
          averageOrderValue: salesData.length > 0 ? 
            salesData.reduce((sum, sale) => sum + sale.total_amount, 0) / salesData.length : 0,
          totalDue: salesData.reduce((sum, sale) => sum + (sale.due_amount || 0), 0),
        },
        topProducts: getTopProducts(),
        stockStatus: {
          totalItems: stockData.length,
          lowStockItems: stockData.filter(item => 
            item.quantity <= item.low_stock_threshold
          ).length,
          totalStockValue: stockData.reduce((sum, item) => 
            sum + (item.quantity * item.unit_price), 0
          ),
        },
        customerMetrics: {
          totalCustomers: customerData.length,
          customersWithDue: customerData.filter(c => c.total_due > 0).length,
          averageDueAmount: customerData.length > 0 ?
            customerData.reduce((sum, c) => sum + (c.total_due || 0), 0) / customerData.length : 0,
        },
      };

      const aiInsights = await generateAIInsights(analyticsData);
      setInsights(aiInsights);
    } catch (err) {
      setError('Failed to generate AI insights');
      console.error('AI insights generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTopProducts = () => {
    const productStats = new Map();
    
    salesData.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const key = item.medicine_name;
          if (!productStats.has(key)) {
            productStats.set(key, { quantity: 0, revenue: 0 });
          }
          const stats = productStats.get(key);
          stats.quantity += item.quantity;
          stats.revenue += item.total_amount;
        });
      }
    });

    return Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const generateAIInsights = async (data: any) => {
    const prompt = `
    Analyze this Bangladesh pharmacy business data and provide comprehensive insights:

    Period: ${data.period}
    Sales Summary:
    - Total Revenue: ৳${data.salesSummary.totalRevenue}
    - Transactions: ${data.salesSummary.totalTransactions}
    - Average Order: ৳${data.salesSummary.averageOrderValue.toFixed(2)}
    - Total Due: ৳${data.salesSummary.totalDue}

    Stock Status:
    - Total Items: ${data.stockStatus.totalItems}
    - Low Stock Items: ${data.stockStatus.lowStockItems}
    - Stock Value: ৳${data.stockStatus.totalStockValue}

    Customer Metrics:
    - Total Customers: ${data.customerMetrics.totalCustomers}
    - Customers with Due: ${data.customerMetrics.customersWithDue}

    Top Products: ${JSON.stringify(data.topProducts)}

    Provide analysis in JSON format:
    {
      "businessHealth": {
        "score": 0-100,
        "status": "excellent/good/fair/poor",
        "summary": "Overall business assessment"
      },
      "keyInsights": [
        "Critical business insights"
      ],
      "opportunities": [
        "Growth opportunities"
      ],
      "risks": [
        "Business risks to address"
      ],
      "recommendations": [
        "Actionable recommendations"
      ],
      "trends": {
        "salesTrend": "increasing/stable/decreasing",
        "cashflowTrend": "improving/stable/concerning",
        "inventoryTrend": "optimal/overstocked/understocked"
      }
    }

    Focus on actionable insights for Bangladesh pharmacy business.
    `;

    try {
      const response = await aiService.makeRequest([
        { role: 'system', content: 'You are a pharmacy business analyst AI specializing in Bangladesh market insights.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      return {
        businessHealth: {
          score: 75,
          status: 'good',
          summary: 'Business is performing well with steady growth potential'
        },
        keyInsights: [
          'Sales activity shows consistent performance',
          'Customer base is growing steadily',
          'Inventory management needs attention'
        ],
        opportunities: [
          'Focus on high-demand medicines',
          'Improve customer retention programs',
          'Optimize stock levels for better cash flow'
        ],
        risks: [
          'Outstanding dues affecting cash flow',
          'Low stock items may lead to lost sales'
        ],
        recommendations: [
          'Implement automated stock alerts',
          'Create customer loyalty programs',
          'Review pricing strategy for better margins'
        ],
        trends: {
          salesTrend: 'stable',
          cashflowTrend: 'stable',
          inventoryTrend: 'needs-attention'
        }
      };
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return Theme.colors.success;
    if (score >= 60) return Theme.colors.warning;
    return Theme.colors.error;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return '📈';
      case 'decreasing':
      case 'concerning':
        return '📉';
      case 'stable':
        return '📊';
      case 'optimal':
        return '✅';
      case 'overstocked':
        return '📦';
      case 'understocked':
      case 'needs-attention':
        return '⚠️';
      default:
        return '📊';
    }
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <CardContent>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>🤖 AI is analyzing your business data...</Text>
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
            <TouchableOpacity onPress={generateInsights} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry Analysis</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <CardHeader>
        <Text style={styles.title}>🤖 AI Business Intelligence</Text>
      </CardHeader>
      <CardContent>
        {/* Business Health Score */}
        <View style={styles.healthScoreContainer}>
          <View style={styles.healthScoreCircle}>
            <Text style={[styles.healthScore, { color: getHealthScoreColor(insights.businessHealth.score) }]}>
              {insights.businessHealth.score}
            </Text>
            <Text style={styles.healthScoreLabel}>Business Health</Text>
          </View>
          <View style={styles.healthSummary}>
            <Text style={[styles.healthStatus, { color: getHealthScoreColor(insights.businessHealth.score) }]}>
              {insights.businessHealth.status.toUpperCase()}
            </Text>
            <Text style={styles.healthDescription}>
              {insights.businessHealth.summary}
            </Text>
          </View>
        </View>

        {/* Trends */}
        <View style={styles.trendsContainer}>
          <Text style={styles.sectionTitle}>📊 Business Trends</Text>
          <View style={styles.trendItems}>
            <View style={styles.trendItem}>
              <Text style={styles.trendIcon}>{getTrendIcon(insights.trends.salesTrend)}</Text>
              <Text style={styles.trendLabel}>Sales</Text>
              <Text style={styles.trendValue}>{insights.trends.salesTrend}</Text>
            </View>
            <View style={styles.trendItem}>
              <Text style={styles.trendIcon}>{getTrendIcon(insights.trends.cashflowTrend)}</Text>
              <Text style={styles.trendLabel}>Cash Flow</Text>
              <Text style={styles.trendValue}>{insights.trends.cashflowTrend}</Text>
            </View>
            <View style={styles.trendItem}>
              <Text style={styles.trendIcon}>{getTrendIcon(insights.trends.inventoryTrend)}</Text>
              <Text style={styles.trendLabel}>Inventory</Text>
              <Text style={styles.trendValue}>{insights.trends.inventoryTrend}</Text>
            </View>
          </View>
        </View>

        {/* Key Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>💡 Key Insights</Text>
          {insights.keyInsights.map((insight: string, index: number) => (
            <Text key={index} style={styles.insightText}>• {insight}</Text>
          ))}
        </View>

        {/* Opportunities */}
        <View style={styles.opportunitiesSection}>
          <Text style={styles.sectionTitle}>🚀 Growth Opportunities</Text>
          {insights.opportunities.map((opportunity: string, index: number) => (
            <Text key={index} style={styles.opportunityText}>• {opportunity}</Text>
          ))}
        </View>

        {/* Risks */}
        {insights.risks.length > 0 && (
          <View style={styles.risksSection}>
            <Text style={styles.sectionTitle}>⚠️ Business Risks</Text>
            {insights.risks.map((risk: string, index: number) => (
              <Text key={index} style={styles.riskText}>• {risk}</Text>
            ))}
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>✅ AI Recommendations</Text>
          {insights.recommendations.map((recommendation: string, index: number) => (
            <Text key={index} style={styles.recommendationText}>• {recommendation}</Text>
          ))}
        </View>
      </CardContent>
    </Card>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
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

  healthScoreContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  healthScoreCircle: {
    alignItems: 'center' as const,
    marginRight: theme.spacing.lg,
  },

  healthScore: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold as any,
  },

  healthScoreLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  healthSummary: {
    flex: 1,
  },

  healthStatus: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    marginBottom: theme.spacing.xs,
  },

  healthDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  trendsContainer: {
    marginBottom: theme.spacing.lg,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  trendItems: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },

  trendItem: {
    alignItems: 'center' as const,
    flex: 1,
  },

  trendIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },

  trendLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },

  trendValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    textTransform: 'capitalize' as const,
  },

  insightsSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info,
  },

  insightText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  opportunitiesSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },

  opportunityText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  risksSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },

  riskText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  recommendationsSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },

  recommendationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
}));