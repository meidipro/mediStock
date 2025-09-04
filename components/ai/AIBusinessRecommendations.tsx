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

interface AIBusinessRecommendationsProps {
  businessMetrics: any;
  aiSettings: any;
  pharmacy: any;
}

export const AIBusinessRecommendations: React.FC<AIBusinessRecommendationsProps> = ({
  businessMetrics,
  aiSettings,
  pharmacy,
}) => {
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (businessMetrics && aiSettings.dailyRecommendations) {
      generateBusinessRecommendations();
    }
  }, [businessMetrics, aiSettings]);

  const generateBusinessRecommendations = async () => {
    if (!aiSettings.dailyRecommendations) return;

    try {
      setLoading(true);
      setError(null);

      const currentDate = new Date();
      const analysisData = {
        pharmacyName: pharmacy?.name || 'Your Pharmacy',
        date: currentDate.toDateString(),
        metrics: businessMetrics,
        aiSettings,
        seasonalContext: getSeasonalContext(currentDate),
        marketConditions: getCurrentMarketConditions(),
      };

      const aiRecommendations = await generateAIRecommendations(analysisData);
      setRecommendations(aiRecommendations);
    } catch (err) {
      setError('Failed to generate business recommendations');
      console.error('Business recommendations generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeasonalContext = (date: Date) => {
    const month = date.getMonth() + 1; // 1-12
    
    if (month >= 3 && month <= 5) {
      return 'Spring season - allergy and respiratory issues common';
    } else if (month >= 6 && month <= 8) {
      return 'Summer season - heat-related conditions, digestive issues';
    } else if (month >= 9 && month <= 11) {
      return 'Autumn season - seasonal flu, cold preparations needed';
    } else {
      return 'Winter season - cold, flu, respiratory medications in demand';
    }
  };

  const getCurrentMarketConditions = () => {
    // In a real app, this could be fetched from market data APIs
    return {
      economicClimate: 'stable',
      healthTrends: ['increased health awareness', 'preventive care focus'],
      competitionLevel: 'moderate',
      supplyChainStatus: 'normal',
    };
  };

  const generateAIRecommendations = async (data: any) => {
    const prompt = `
    Generate comprehensive business recommendations for this Bangladesh pharmacy:

    Pharmacy: ${data.pharmacyName}
    Date: ${data.date}
    Seasonal Context: ${data.seasonalContext}

    Current Metrics:
    - Total Revenue: ৳${data.metrics.totalRevenue}
    - Total Due: ৳${data.metrics.totalDue}
    - Stock Value: ৳${data.metrics.totalStock}
    - Low Stock Items: ${data.metrics.lowStockCount}
    - Total Customers: ${data.metrics.totalCustomers}
    - Total Transactions: ${data.metrics.totalTransactions}

    AI Settings Enabled:
    - Auto Insights: ${data.aiSettings.autoInsights}
    - Stock Alerts: ${data.aiSettings.stockAlerts}
    - Customer Analytics: ${data.aiSettings.customerAnalytics}
    - Price Optimization: ${data.aiSettings.priceOptimization}

    Market Conditions: ${JSON.stringify(data.marketConditions)}

    Provide personalized recommendations in JSON format:
    {
      "dailyPriorities": [
        {
          "priority": "high/medium/low",
          "task": "specific task description",
          "reason": "why this is important today",
          "estimatedTime": "time needed",
          "impact": "expected business impact"
        }
      ],
      "weeklyGoals": [
        {
          "goal": "weekly objective",
          "actions": ["specific actions to take"],
          "successMetrics": "how to measure success"
        }
      ],
      "seasonalOpportunities": [
        "seasonal business opportunities based on current time"
      ],
      "riskMitigation": [
        {
          "risk": "potential risk",
          "mitigation": "how to address it",
          "urgency": "high/medium/low"
        }
      ],
      "customerEngagement": [
        "strategies to improve customer relationships"
      ],
      "operationalEfficiency": [
        "ways to improve daily operations"
      ],
      "growthStrategies": [
        "longer-term growth recommendations"
      ]
    }

    Focus on actionable, specific recommendations for Bangladesh pharmacy context.
    Consider local market conditions, seasonal health patterns, and cultural factors.
    `;

    try {
      const response = await aiService.makeRequest([
        { role: 'system', content: 'You are a business strategy AI consultant specializing in Bangladesh pharmacy operations and growth.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      return {
        dailyPriorities: [
          {
            priority: 'high',
            task: 'Review and restock low inventory items',
            reason: 'Avoid stockouts that could impact sales',
            estimatedTime: '30 minutes',
            impact: 'Prevent lost sales opportunities'
          },
          {
            priority: 'medium',
            task: 'Follow up with customers having outstanding dues',
            reason: 'Improve cash flow and customer relationships',
            estimatedTime: '45 minutes',
            impact: 'Better cash flow management'
          },
          {
            priority: 'medium',
            task: 'Check expiry dates of medicines',
            reason: 'Ensure product quality and regulatory compliance',
            estimatedTime: '20 minutes',
            impact: 'Maintain customer trust and avoid losses'
          }
        ],
        weeklyGoals: [
          {
            goal: 'Improve inventory turnover',
            actions: ['Analyze slow-moving items', 'Adjust pricing for old stock', 'Promote fast-moving medicines'],
            successMetrics: 'Increase in weekly sales volume'
          },
          {
            goal: 'Enhance customer satisfaction',
            actions: ['Gather customer feedback', 'Improve service speed', 'Offer health consultations'],
            successMetrics: 'Positive customer feedback and repeat visits'
          }
        ],
        seasonalOpportunities: [
          'Stock up on seasonal medicines for current weather conditions',
          'Promote preventive healthcare products',
          'Offer health awareness programs'
        ],
        riskMitigation: [
          {
            risk: 'Outstanding customer dues affecting cash flow',
            mitigation: 'Implement structured follow-up system',
            urgency: 'medium'
          },
          {
            risk: 'Low stock items may lead to lost sales',
            mitigation: 'Set up automated reorder points',
            urgency: 'high'
          }
        ],
        customerEngagement: [
          'Send health tips via SMS to regular customers',
          'Create loyalty program for frequent buyers',
          'Offer medicine delivery services'
        ],
        operationalEfficiency: [
          'Implement digital inventory tracking',
          'Train staff on product knowledge',
          'Optimize store layout for better customer flow'
        ],
        growthStrategies: [
          'Partner with local healthcare providers',
          'Expand product range based on demand analysis',
          'Consider opening additional locations'
        ]
      };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return Theme.colors.error;
      case 'medium':
        return Theme.colors.warning;
      case 'low':
        return Theme.colors.info;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return '🔥';
      case 'medium':
        return '⚡';
      case 'low':
        return '📌';
      default:
        return '📋';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return Theme.colors.error;
      case 'medium':
        return Theme.colors.warning;
      case 'low':
        return Theme.colors.success;
      default:
        return Theme.colors.textSecondary;
    }
  };

  if (!aiSettings.dailyRecommendations) {
    return (
      <Card style={styles.container}>
        <CardContent>
          <View style={styles.disabledContainer}>
            <Text style={styles.disabledText}>🤖 Daily Recommendations are disabled</Text>
            <Text style={styles.disabledSubtext}>Enable in AI settings to get personalized business recommendations</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card style={styles.container}>
        <CardContent>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>🤖 Generating personalized recommendations...</Text>
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
            <TouchableOpacity onPress={generateBusinessRecommendations} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) {
    return null;
  }

  return (
    <Card style={styles.container}>
      <CardHeader>
        <Text style={styles.title}>🤖 AI Business Recommendations</Text>
      </CardHeader>
      <CardContent>
        {/* Daily Priorities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Today's Priorities</Text>
          {recommendations.dailyPriorities.map((item: any, index: number) => (
            <View key={index} style={styles.priorityItem}>
              <View style={styles.priorityHeader}>
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityIcon}>{getPriorityIcon(item.priority)}</Text>
                  <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                    {item.priority.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.estimatedTime}>{item.estimatedTime}</Text>
              </View>
              <Text style={styles.taskTitle}>{item.task}</Text>
              <Text style={styles.taskReason}>{item.reason}</Text>
              <Text style={styles.taskImpact}>Impact: {item.impact}</Text>
            </View>
          ))}
        </View>

        {/* Weekly Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Weekly Goals</Text>
          {recommendations.weeklyGoals.map((goal: any, index: number) => (
            <View key={index} style={styles.goalItem}>
              <Text style={styles.goalTitle}>{goal.goal}</Text>
              <View style={styles.actionsContainer}>
                <Text style={styles.actionsLabel}>Actions:</Text>
                {goal.actions.map((action: string, actionIndex: number) => (
                  <Text key={actionIndex} style={styles.actionText}>• {action}</Text>
                ))}
              </View>
              <Text style={styles.successMetric}>Success: {goal.successMetrics}</Text>
            </View>
          ))}
        </View>

        {/* Seasonal Opportunities */}
        <View style={styles.seasonalSection}>
          <Text style={styles.sectionTitle}>🌿 Seasonal Opportunities</Text>
          {recommendations.seasonalOpportunities.map((opportunity: string, index: number) => (
            <Text key={index} style={styles.opportunityText}>• {opportunity}</Text>
          ))}
        </View>

        {/* Risk Mitigation */}
        {recommendations.riskMitigation.length > 0 && (
          <View style={styles.riskSection}>
            <Text style={styles.sectionTitle}>⚠️ Risk Mitigation</Text>
            {recommendations.riskMitigation.map((risk: any, index: number) => (
              <View key={index} style={styles.riskItem}>
                <View style={styles.riskHeader}>
                  <Text style={styles.riskTitle}>{risk.risk}</Text>
                  <Text style={[styles.urgencyBadge, { color: getUrgencyColor(risk.urgency) }]}>
                    {risk.urgency.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.mitigationText}>{risk.mitigation}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Customer Engagement */}
        <View style={styles.engagementSection}>
          <Text style={styles.sectionTitle}>👥 Customer Engagement</Text>
          {recommendations.customerEngagement.map((strategy: string, index: number) => (
            <Text key={index} style={styles.engagementText}>• {strategy}</Text>
          ))}
        </View>

        {/* Operational Efficiency */}
        <View style={styles.efficiencySection}>
          <Text style={styles.sectionTitle}>⚙️ Operational Efficiency</Text>
          {recommendations.operationalEfficiency.map((tip: string, index: number) => (
            <Text key={index} style={styles.efficiencyText}>• {tip}</Text>
          ))}
        </View>

        {/* Growth Strategies */}
        <View style={styles.growthSection}>
          <Text style={styles.sectionTitle}>🚀 Growth Strategies</Text>
          {recommendations.growthStrategies.map((strategy: string, index: number) => (
            <Text key={index} style={styles.growthText}>• {strategy}</Text>
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

  disabledContainer: {
    alignItems: 'center' as const,
    padding: theme.spacing.lg,
  },

  disabledText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },

  disabledSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
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
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  priorityItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },

  priorityHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  priorityBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  priorityIcon: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },

  priorityText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
  },

  estimatedTime: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    fontStyle: 'italic' as const,
  },

  taskTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  taskReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },

  taskImpact: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontStyle: 'italic' as const,
  },

  goalItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info,
    marginBottom: theme.spacing.sm,
  },

  goalTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  actionsContainer: {
    marginBottom: theme.spacing.sm,
  },

  actionsLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  actionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },

  successMetric: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.success,
    fontStyle: 'italic' as const,
  },

  seasonalSection: {
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

  riskSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },

  riskItem: {
    marginBottom: theme.spacing.sm,
  },

  riskHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.xs,
  },

  riskTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },

  urgencyBadge: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
  },

  mitigationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  engagementSection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },

  engagementText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  efficiencySection: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  efficiencyText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  growthSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },

  growthText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
}));