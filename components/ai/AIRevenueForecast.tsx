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

interface AIRevenueForecastProps {
  historicalSales: any[];
  currentPeriodSales: any[];
  period: string;
}

export const AIRevenueForecast: React.FC<AIRevenueForecastProps> = ({
  historicalSales,
  currentPeriodSales,
  period,
}) => {
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (historicalSales.length > 0) {
      generateRevenueForecast();
    }
  }, [historicalSales, period]);

  const generateRevenueForecast = async () => {
    try {
      setLoading(true);
      setError(null);

      const forecastData = prepareForecastData();
      const aiForecast = await generateAIForecast(forecastData);
      setForecast(aiForecast);
    } catch (err) {
      setError('Failed to generate revenue forecast');
      console.error('Revenue forecast generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const prepareForecastData = () => {
    // Prepare historical data by month for better analysis
    const monthlyData = new Map();
    
    historicalSales.forEach(sale => {
      const date = new Date(sale.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          revenue: 0,
          transactions: 0,
          averageOrder: 0,
          uniqueCustomers: new Set(),
        });
      }
      
      const monthStats = monthlyData.get(monthKey);
      monthStats.revenue += sale.total_amount;
      monthStats.transactions += 1;
      if (sale.customer_id) {
        monthStats.uniqueCustomers.add(sale.customer_id);
      }
    });

    // Convert to array and calculate averages
    const monthlyStats = Array.from(monthlyData.entries()).map(([month, stats]) => ({
      month,
      revenue: stats.revenue,
      transactions: stats.transactions,
      averageOrder: stats.revenue / stats.transactions,
      uniqueCustomers: stats.uniqueCustomers.size,
    }));

    // Current period analysis
    const currentRevenue = currentPeriodSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const currentTransactions = currentPeriodSales.length;
    
    // Growth rates
    const recentMonths = monthlyStats.slice(-3); // Last 3 months
    const growthRate = calculateGrowthRate(recentMonths);
    
    // Seasonal patterns
    const seasonalPatterns = calculateSeasonalPatterns(monthlyStats);
    
    return {
      period,
      currentPeriod: {
        revenue: currentRevenue,
        transactions: currentTransactions,
        averageOrder: currentTransactions > 0 ? currentRevenue / currentTransactions : 0,
      },
      historical: {
        monthlyStats: monthlyStats.slice(-6), // Last 6 months
        totalMonths: monthlyStats.length,
        averageMonthlyRevenue: monthlyStats.length > 0 ? 
          monthlyStats.reduce((sum, month) => sum + month.revenue, 0) / monthlyStats.length : 0,
      },
      trends: {
        growthRate,
        seasonalPatterns,
        peakMonths: getPeakMonths(monthlyStats),
      },
    };
  };

  const calculateGrowthRate = (recentMonths: any[]) => {
    if (recentMonths.length < 2) return 0;
    
    const oldRevenue = recentMonths[0].revenue;
    const newRevenue = recentMonths[recentMonths.length - 1].revenue;
    
    return oldRevenue > 0 ? ((newRevenue - oldRevenue) / oldRevenue) * 100 : 0;
  };

  const calculateSeasonalPatterns = (monthlyStats: any[]) => {
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);
    
    monthlyStats.forEach(stats => {
      const month = parseInt(stats.month.split('-')[1]) - 1; // 0-indexed
      monthlyAverages[month] += stats.revenue;
      monthlyCounts[month] += 1;
    });
    
    return monthlyAverages.map((total, index) => ({
      month: index + 1,
      averageRevenue: monthlyCounts[index] > 0 ? total / monthlyCounts[index] : 0,
    }));
  };

  const getPeakMonths = (monthlyStats: any[]) => {
    return monthlyStats
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map(stats => ({
        month: stats.month,
        revenue: stats.revenue,
      }));
  };

  const generateAIForecast = async (data: any) => {
    const prompt = `
    Generate revenue forecast for this Bangladesh pharmacy based on historical data:

    Current Period (${data.period}):
    - Revenue: ৳${data.currentPeriod.revenue}
    - Transactions: ${data.currentPeriod.transactions}
    - Average Order: ৳${data.currentPeriod.averageOrder.toFixed(2)}

    Historical Performance:
    - Average Monthly Revenue: ৳${data.historical.averageMonthlyRevenue.toFixed(2)}
    - Growth Rate: ${data.trends.growthRate.toFixed(2)}%
    - Data Points: ${data.historical.totalMonths} months

    Recent Monthly Data: ${JSON.stringify(data.historical.monthlyStats)}
    Peak Months: ${JSON.stringify(data.trends.peakMonths)}

    Provide forecast in JSON format:
    {
      "nextPeriodForecast": {
        "revenue": "projected revenue amount",
        "transactions": "projected transaction count",
        "confidence": "high/medium/low",
        "range": {
          "low": "conservative estimate",
          "high": "optimistic estimate"
        }
      },
      "quarterlyForecast": {
        "q1": "Q1 revenue projection",
        "q2": "Q2 revenue projection", 
        "q3": "Q3 revenue projection",
        "q4": "Q4 revenue projection"
      },
      "keyFactors": [
        "factors influencing the forecast"
      ],
      "risks": [
        "potential risks to forecast"
      ],
      "opportunities": [
        "growth opportunities identified"
      ],
      "recommendations": [
        "actionable recommendations to achieve forecast"
      ],
      "marketInsights": {
        "trend": "growing/stable/declining",
        "seasonality": "high/medium/low",
        "competitiveness": "description of market position"
      }
    }

    Consider Bangladesh pharmacy market patterns, seasonal health trends, and economic factors.
    `;

    try {
      const response = await aiService.makeRequest([
        { role: 'system', content: 'You are a revenue forecasting AI specializing in Bangladesh pharmacy market analysis.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      // Fallback forecast based on historical data
      const fallbackRevenue = data.currentPeriod.revenue * (1 + data.trends.growthRate / 100);
      
      return {
        nextPeriodForecast: {
          revenue: `৳${fallbackRevenue.toFixed(2)}`,
          transactions: Math.round(data.currentPeriod.transactions * 1.1),
          confidence: 'medium',
          range: {
            low: `৳${(fallbackRevenue * 0.8).toFixed(2)}`,
            high: `৳${(fallbackRevenue * 1.2).toFixed(2)}`,
          }
        },
        quarterlyForecast: {
          q1: `৳${(fallbackRevenue * 3 * 1.0).toFixed(2)}`,
          q2: `৳${(fallbackRevenue * 3 * 1.05).toFixed(2)}`,
          q3: `৳${(fallbackRevenue * 3 * 1.1).toFixed(2)}`,
          q4: `৳${(fallbackRevenue * 3 * 1.15).toFixed(2)}`,
        },
        keyFactors: [
          'Historical growth trend',
          'Seasonal health patterns',
          'Market demand stability'
        ],
        risks: [
          'Economic volatility',
          'Increased competition',
          'Supply chain disruptions'
        ],
        opportunities: [
          'Expand customer base',
          'Introduce high-demand medicines',
          'Improve customer retention'
        ],
        recommendations: [
          'Focus on customer acquisition',
          'Optimize inventory management',
          'Enhance customer service quality'
        ],
        marketInsights: {
          trend: 'stable',
          seasonality: 'medium',
          competitiveness: 'Well-positioned in local market'
        }
      };
    }
  };

  const getConfidenceColor = (confidence: string) => {
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
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'growing':
        return '📈';
      case 'stable':
        return '📊';
      case 'declining':
        return '📉';
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
            <Text style={styles.loadingText}>🤖 Generating revenue forecasts...</Text>
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
            <TouchableOpacity onPress={generateRevenueForecast} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry Forecast</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!forecast) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <CardHeader>
        <Text style={styles.title}>🔮 AI Revenue Forecast</Text>
      </CardHeader>
      <CardContent>
        {/* Next Period Forecast */}
        <View style={styles.forecastSection}>
          <Text style={styles.sectionTitle}>📊 Next {period} Forecast</Text>
          
          <View style={styles.forecastMainContainer}>
            <View style={styles.forecastMain}>
              <Text style={styles.forecastRevenue}>{forecast.nextPeriodForecast.revenue}</Text>
              <Text style={[
                styles.confidenceText,
                { color: getConfidenceColor(forecast.nextPeriodForecast.confidence) }
              ]}>
                {forecast.nextPeriodForecast.confidence.toUpperCase()} CONFIDENCE
              </Text>
            </View>
            
            <View style={styles.forecastRange}>
              <Text style={styles.rangeTitle}>Expected Range:</Text>
              <View style={styles.rangeValues}>
                <Text style={styles.rangeValue}>
                  Low: {forecast.nextPeriodForecast.range.low}
                </Text>
                <Text style={styles.rangeValue}>
                  High: {forecast.nextPeriodForecast.range.high}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.transactionForecast}>
            <Text style={styles.transactionText}>
              Expected Transactions: {forecast.nextPeriodForecast.transactions}
            </Text>
          </View>
        </View>

        {/* Quarterly Forecast */}
        <View style={styles.quarterlySection}>
          <Text style={styles.sectionTitle}>📅 Quarterly Forecast</Text>
          <View style={styles.quarterlyGrid}>
            <View style={styles.quarterItem}>
              <Text style={styles.quarterLabel}>Q1</Text>
              <Text style={styles.quarterValue}>{forecast.quarterlyForecast.q1}</Text>
            </View>
            <View style={styles.quarterItem}>
              <Text style={styles.quarterLabel}>Q2</Text>
              <Text style={styles.quarterValue}>{forecast.quarterlyForecast.q2}</Text>
            </View>
            <View style={styles.quarterItem}>
              <Text style={styles.quarterLabel}>Q3</Text>
              <Text style={styles.quarterValue}>{forecast.quarterlyForecast.q3}</Text>
            </View>
            <View style={styles.quarterItem}>
              <Text style={styles.quarterLabel}>Q4</Text>
              <Text style={styles.quarterValue}>{forecast.quarterlyForecast.q4}</Text>
            </View>
          </View>
        </View>

        {/* Market Insights */}
        <View style={styles.marketSection}>
          <Text style={styles.sectionTitle}>🎯 Market Insights</Text>
          <View style={styles.marketInsights}>
            <View style={styles.marketInsight}>
              <Text style={styles.insightIcon}>{getTrendIcon(forecast.marketInsights.trend)}</Text>
              <Text style={styles.insightLabel}>Trend:</Text>
              <Text style={styles.insightValue}>{forecast.marketInsights.trend}</Text>
            </View>
            <View style={styles.marketInsight}>
              <Text style={styles.insightIcon}>🌊</Text>
              <Text style={styles.insightLabel}>Seasonality:</Text>
              <Text style={styles.insightValue}>{forecast.marketInsights.seasonality}</Text>
            </View>
          </View>
          <Text style={styles.competitivenessText}>
            {forecast.marketInsights.competitiveness}
          </Text>
        </View>

        {/* Key Factors */}
        <View style={styles.factorsSection}>
          <Text style={styles.sectionTitle}>🔑 Key Factors</Text>
          {forecast.keyFactors.map((factor: string, index: number) => (
            <Text key={index} style={styles.factorText}>• {factor}</Text>
          ))}
        </View>

        {/* Risks & Opportunities */}
        <View style={styles.risksOpportunitiesContainer}>
          <View style={styles.risksSection}>
            <Text style={styles.sectionTitle}>⚠️ Risks</Text>
            {forecast.risks.map((risk: string, index: number) => (
              <Text key={index} style={styles.riskText}>• {risk}</Text>
            ))}
          </View>

          <View style={styles.opportunitiesSection}>
            <Text style={styles.sectionTitle}>🚀 Opportunities</Text>
            {forecast.opportunities.map((opportunity: string, index: number) => (
              <Text key={index} style={styles.opportunityText}>• {opportunity}</Text>
            ))}
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>✅ Recommendations</Text>
          {forecast.recommendations.map((recommendation: string, index: number) => (
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
    borderLeftColor: theme.colors.success,
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

  forecastSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  forecastMainContainer: {
    alignItems: 'center' as const,
    marginBottom: theme.spacing.md,
  },

  forecastMain: {
    alignItems: 'center' as const,
    marginBottom: theme.spacing.md,
  },

  forecastRevenue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },

  confidenceText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
  },

  forecastRange: {
    alignItems: 'center' as const,
  },

  rangeTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  rangeValues: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
  },

  rangeValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  transactionForecast: {
    alignItems: 'center' as const,
    marginTop: theme.spacing.sm,
  },

  transactionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
  },

  quarterlySection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  quarterlyGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  quarterItem: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center' as const,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
  },

  quarterLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  quarterValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
  },

  marketSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info,
  },

  marketInsights: {
    marginBottom: theme.spacing.md,
  },

  marketInsight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  insightIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },

  insightLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },

  insightValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize' as const,
  },

  competitivenessText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
  },

  factorsSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  factorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  risksOpportunitiesContainer: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },

  risksSection: {
    flex: 1,
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

  opportunitiesSection: {
    flex: 1,
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