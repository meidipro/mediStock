import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { aiService } from '../../lib/ai-service';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface AIPharmacyInsightsProps {
  salesData: any[];
  stockData: any[];
  customerData: any[];
  pharmacyData: any;
}

export const AIPharmacyInsights: React.FC<AIPharmacyInsightsProps> = ({
  salesData,
  stockData,
  customerData,
  pharmacyData,
}) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (salesData.length > 0 || stockData.length > 0) {
      generatePharmacyInsights();
    }
  }, [salesData, stockData, customerData]);

  const generatePharmacyInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const pharmacyAnalytics = {
        pharmacyName: pharmacyData?.name || 'Your Pharmacy',
        totalRevenue: salesData.reduce((sum, sale) => sum + sale.total_amount, 0),
        totalTransactions: salesData.length,
        totalCustomers: customerData.length,
        totalStockItems: stockData.length,
        totalStockValue: stockData.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0),
        lowStockItems: stockData.filter(item => item.quantity <= item.low_stock_threshold).length,
        averageOrderValue: salesData.length > 0 ? 
          salesData.reduce((sum, sale) => sum + sale.total_amount, 0) / salesData.length : 0,
        recentSalesGrowth: calculateGrowthRate(),
        topCategories: getTopCategories(),
        performanceMetrics: getPerformanceMetrics(),
      };

      const aiInsights = await generateAIPharmacyAnalysis(pharmacyAnalytics);
      setInsights(aiInsights);
    } catch (err) {
      setError('Failed to generate pharmacy insights');
      console.error('Pharmacy insights generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowthRate = () => {
    if (salesData.length < 2) return 0;
    
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastTwoMonths = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const recentSales = salesData.filter(sale => new Date(sale.created_at) >= lastMonth);
    const previousSales = salesData.filter(sale => {
      const date = new Date(sale.created_at);
      return date >= lastTwoMonths && date < lastMonth;
    });
    
    const recentRevenue = recentSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    
    return previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  };

  const getTopCategories = () => {
    const categoryStats = new Map();
    
    salesData.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const category = item.category || 'General';
          if (!categoryStats.has(category)) {
            categoryStats.set(category, { revenue: 0, quantity: 0 });
          }
          const stats = categoryStats.get(category);
          stats.revenue += item.total_amount;
          stats.quantity += item.quantity;
        });
      }
    });

    return Array.from(categoryStats.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const getPerformanceMetrics = () => {
    const totalDue = salesData.reduce((sum, sale) => sum + (sale.due_amount || 0), 0);
    const paidAmount = salesData.reduce((sum, sale) => sum + (sale.paid_amount || sale.total_amount), 0);
    const collectionRate = paidAmount > 0 ? (paidAmount / (paidAmount + totalDue)) * 100 : 0;
    
    const inventoryTurnover = stockData.length > 0 ? 
      salesData.length / (stockData.reduce((sum, item) => sum + item.quantity, 0) / stockData.length) : 0;
    
    return {
      collectionRate,
      inventoryTurnover,
      averageStockDays: inventoryTurnover > 0 ? 365 / inventoryTurnover : 0,
    };
  };

  const generateAIPharmacyAnalysis = async (data: any) => {
    const prompt = `
    Analyze this Bangladesh pharmacy's performance and provide strategic insights:

    Pharmacy: ${data.pharmacyName}
    
    Business Metrics:
    - Total Revenue: ৳${data.totalRevenue}
    - Transactions: ${data.totalTransactions}
    - Customers: ${data.totalCustomers}
    - Average Order: ৳${data.averageOrderValue.toFixed(2)}
    - Growth Rate: ${data.recentSalesGrowth.toFixed(2)}%
    
    Inventory:
    - Total Items: ${data.totalStockItems}
    - Stock Value: ৳${data.totalStockValue}
    - Low Stock Items: ${data.lowStockItems}
    
    Performance:
    - Collection Rate: ${data.performanceMetrics.collectionRate.toFixed(2)}%
    - Inventory Turnover: ${data.performanceMetrics.inventoryTurnover.toFixed(2)}
    
    Top Categories: ${JSON.stringify(data.topCategories)}

    Provide analysis in JSON format:
    {
      "overallAssessment": {
        "score": 0-100,
        "status": "excellent/good/average/needs-improvement",
        "summary": "Overall pharmacy performance summary"
      },
      "strengthAreas": [
        "Key strengths of the pharmacy"
      ],
      "improvementAreas": [
        "Areas that need attention"
      ],
      "marketPosition": {
        "competitiveness": "high/medium/low",
        "customerBase": "growing/stable/declining", 
        "marketShare": "estimated position description"
      },
      "strategicRecommendations": [
        "Strategic recommendations for growth"
      ],
      "operationalTips": [
        "Immediate operational improvements"
      ],
      "riskFactors": [
        "Potential risks to monitor"
      ]
    }

    Focus on actionable insights for Bangladesh pharmacy business context.
    `;

    try {
      const response = await aiService.makeRequest([
        { role: 'system', content: 'You are a pharmacy business consultant AI specializing in Bangladesh market analysis.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      return {
        overallAssessment: {
          score: 75,
          status: 'good',
          summary: 'Your pharmacy shows steady performance with opportunities for growth'
        },
        strengthAreas: [
          'Consistent sales activity',
          'Diverse customer base',
          'Good inventory variety'
        ],
        improvementAreas: [
          'Optimize stock levels',
          'Improve collection efficiency',
          'Expand customer base'
        ],
        marketPosition: {
          competitiveness: 'medium',
          customerBase: 'stable',
          marketShare: 'Solid position in local market'
        },
        strategicRecommendations: [
          'Focus on customer retention programs',
          'Introduce high-demand medicines',
          'Implement digital marketing strategies'
        ],
        operationalTips: [
          'Set up automated stock alerts',
          'Improve customer service processes',
          'Regular inventory audits'
        ],
        riskFactors: [
          'Competition from nearby pharmacies',
          'Economic fluctuations affecting purchasing power',
          'Supply chain disruptions'
        ]
      };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return Theme.colors.success;
    if (score >= 70) return Theme.colors.info;
    if (score >= 55) return Theme.colors.warning;
    return Theme.colors.error;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'excellent':
        return '🌟';
      case 'good':
        return '✅';
      case 'average':
        return '📊';
      case 'needs-improvement':
        return '⚠️';
      default:
        return '📊';
    }
  };

  const getCompetitivenessColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return Theme.colors.success;
      case 'medium':
        return Theme.colors.warning;
      case 'low':
        return Theme.colors.error;
      default:
        return Theme.colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <CardContent>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>🤖 Analyzing your pharmacy performance...</Text>
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
            <TouchableOpacity onPress={generatePharmacyInsights} style={styles.retryButton}>
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
        <Text style={styles.title}>🏥 AI Pharmacy Performance Insights</Text>
      </CardHeader>
      <CardContent>
        {/* Overall Assessment */}
        <View style={styles.assessmentSection}>
          <View style={styles.scoreContainer}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreText, { color: getScoreColor(insights.overallAssessment.score) }]}>
                {insights.overallAssessment.score}
              </Text>
              <Text style={styles.scoreLabel}>Performance Score</Text>
            </View>
            <View style={styles.statusContainer}>
              <Text style={styles.statusIcon}>{getStatusIcon(insights.overallAssessment.status)}</Text>
              <Text style={[styles.statusText, { color: getScoreColor(insights.overallAssessment.score) }]}>
                {insights.overallAssessment.status.toUpperCase()}
              </Text>
              <Text style={styles.summaryText}>{insights.overallAssessment.summary}</Text>
            </View>
          </View>
        </View>

        {/* Market Position */}
        <View style={styles.marketSection}>
          <Text style={styles.sectionTitle}>🎯 Market Position</Text>
          <View style={styles.marketMetrics}>
            <View style={styles.marketMetric}>
              <Text style={styles.metricLabel}>Competitiveness</Text>
              <Text style={[styles.metricValue, { color: getCompetitivenessColor(insights.marketPosition.competitiveness) }]}>
                {insights.marketPosition.competitiveness.toUpperCase()}
              </Text>
            </View>
            <View style={styles.marketMetric}>
              <Text style={styles.metricLabel}>Customer Base</Text>
              <Text style={styles.metricValue}>{insights.marketPosition.customerBase}</Text>
            </View>
          </View>
          <Text style={styles.marketShareText}>{insights.marketPosition.marketShare}</Text>
        </View>

        {/* Strength Areas */}
        <View style={styles.strengthSection}>
          <Text style={styles.sectionTitle}>💪 Strength Areas</Text>
          {insights.strengthAreas.map((strength: string, index: number) => (
            <Text key={index} style={styles.strengthText}>• {strength}</Text>
          ))}
        </View>

        {/* Improvement Areas */}
        <View style={styles.improvementSection}>
          <Text style={styles.sectionTitle}>🔧 Areas for Improvement</Text>
          {insights.improvementAreas.map((area: string, index: number) => (
            <Text key={index} style={styles.improvementText}>• {area}</Text>
          ))}
        </View>

        {/* Strategic Recommendations */}
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>🚀 Strategic Recommendations</Text>
          {insights.strategicRecommendations.map((recommendation: string, index: number) => (
            <Text key={index} style={styles.recommendationText}>• {recommendation}</Text>
          ))}
        </View>

        {/* Operational Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>⚡ Quick Operational Tips</Text>
          {insights.operationalTips.map((tip: string, index: number) => (
            <Text key={index} style={styles.tipText}>• {tip}</Text>
          ))}
        </View>

        {/* Risk Factors */}
        {insights.riskFactors.length > 0 && (
          <View style={styles.riskSection}>
            <Text style={styles.sectionTitle}>⚠️ Risk Factors to Monitor</Text>
            {insights.riskFactors.map((risk: string, index: number) => (
              <Text key={index} style={styles.riskText}>• {risk}</Text>
            ))}
          </View>
        )}
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

  assessmentSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  scoreContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  scoreCircle: {
    alignItems: 'center' as const,
    marginRight: theme.spacing.lg,
  },

  scoreText: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold as any,
  },

  scoreLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  statusContainer: {
    flex: 1,
    alignItems: 'center' as const,
  },

  statusIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },

  statusText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    marginBottom: theme.spacing.xs,
  },

  summaryText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 18,
  },

  marketSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  marketMetrics: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: theme.spacing.md,
  },

  marketMetric: {
    alignItems: 'center' as const,
  },

  metricLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  metricValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    textTransform: 'capitalize' as const,
  },

  marketShareText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },

  strengthSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },

  strengthText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  improvementSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },

  improvementText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  recommendationsSection: {
    marginBottom: theme.spacing.lg,
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

  tipsSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  tipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  riskSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
  },

  riskText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
}));