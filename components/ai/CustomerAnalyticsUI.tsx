import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useCustomerAnalytics } from '../../hooks/useAI';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface CustomerAnalyticsUIProps {
  customers: any[];
  sales: any[];
  visible: boolean;
  onClose: () => void;
}

export const CustomerAnalyticsUI: React.FC<CustomerAnalyticsUIProps> = ({
  customers,
  sales,
  visible,
  onClose,
}) => {
  const { analyzeCustomer } = useCustomerAnalytics();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customersList, setCustomersList] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      prepareCustomersList();
    }
  }, [visible, customers, sales]);

  const prepareCustomersList = () => {
    // Filter customers who have made purchases
    const customersWithSales = customers.filter(customer => {
      const customerSales = sales.filter(sale => sale.customer_id === customer.id);
      return customerSales.length > 0;
    }).map(customer => {
      const customerSales = sales.filter(sale => sale.customer_id === customer.id);
      const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalTransactions = customerSales.length;
      const lastPurchase = customerSales.length > 0 ? 
        Math.max(...customerSales.map(sale => new Date(sale.created_at).getTime())) : 0;

      return {
        ...customer,
        totalSpent,
        totalTransactions,
        lastPurchase: lastPurchase > 0 ? new Date(lastPurchase) : null,
        averageOrderValue: totalTransactions > 0 ? totalSpent / totalTransactions : 0,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    setCustomersList(customersWithSales);
  };

  const handleAnalyzeCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    setLoading(true);
    setAnalytics(null);

    try {
      const customerSales = sales.filter(sale => sale.customer_id === customer.id);
      const result = await analyzeCustomer(customer, customerSales);
      setAnalytics(result);
    } catch (error) {
      console.error('Customer analysis failed:', error);
      setAnalytics({
        profile: {
          loyaltyScore: 50,
          preferredCategories: ['General'],
          averageOrderValue: customer.averageOrderValue || 0,
          visitFrequency: 'unknown',
        },
        insights: ['Analysis temporarily unavailable'],
        recommendations: {
          forPharmacy: ['Provide excellent customer service'],
          forCustomer: ['Regular health check-ups recommended'],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const getLoyaltyColor = (score: number) => {
    if (score >= 80) return Theme.colors.success;
    if (score >= 60) return Theme.colors.warning;
    return Theme.colors.error;
  };

  const getLoyaltyBadge = (score: number) => {
    if (score >= 80) return '🌟 VIP';
    if (score >= 60) return '💎 Loyal';
    if (score >= 40) return '👍 Regular';
    return '🆕 New';
  };

  const renderCustomerItem = ({ item }: { item: any }) => (
    <Card style={styles.customerCard}>
      <CardContent>
        <TouchableOpacity onPress={() => handleAnalyzeCustomer(item)}>
          <View style={styles.customerHeader}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{item.name}</Text>
              {item.phone && (
                <Text style={styles.customerPhone}>{item.phone}</Text>
              )}
            </View>
            <View style={styles.customerMetrics}>
              <Text style={styles.metricValue}>৳{item.totalSpent.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Total Spent</Text>
            </View>
          </View>
          
          <View style={styles.customerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.totalTransactions}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>৳{item.averageOrderValue.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Avg Order</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {item.lastPurchase ? 
                  Math.floor((Date.now() - item.lastPurchase.getTime()) / (1000 * 60 * 60 * 24)) : 'N/A'
                }
              </Text>
              <Text style={styles.statLabel}>Days Ago</Text>
            </View>
            {item.total_due > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Theme.colors.error }]}>
                  ৳{item.total_due}
                </Text>
                <Text style={styles.statLabel}>Due</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </CardContent>
    </Card>
  );

  const renderAnalyticsModal = () => (
    <Modal
      visible={!!selectedCustomer}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🤖 Customer Analytics</Text>
          <TouchableOpacity onPress={() => {
            setSelectedCustomer(null);
            setAnalytics(null);
          }}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedCustomer && (
            <Card style={styles.customerDetailsCard}>
              <CardHeader>
                <Text style={styles.customerDetailsTitle}>{selectedCustomer.name}</Text>
              </CardHeader>
              <CardContent>
                <View style={styles.customerDetailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>৳{selectedCustomer.totalSpent.toLocaleString()}</Text>
                    <Text style={styles.detailLabel}>Total Lifetime Value</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>{selectedCustomer.totalTransactions}</Text>
                    <Text style={styles.detailLabel}>Total Visits</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>৳{selectedCustomer.averageOrderValue.toFixed(2)}</Text>
                    <Text style={styles.detailLabel}>Average Order</Text>
                  </View>
                  {selectedCustomer.total_due > 0 && (
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailValue, { color: Theme.colors.error }]}>
                        ৳{selectedCustomer.total_due}
                      </Text>
                      <Text style={styles.detailLabel}>Outstanding Due</Text>
                    </View>
                  )}
                </View>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <Card style={styles.loadingCard}>
              <CardContent>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Theme.colors.primary} />
                  <Text style={styles.loadingText}>🤖 AI is analyzing customer behavior...</Text>
                </View>
              </CardContent>
            </Card>
          ) : analytics ? (
            <>
              {/* Customer Profile */}
              <Card style={styles.profileCard}>
                <CardHeader>
                  <Text style={styles.sectionTitle}>👤 Customer Profile</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.profileStats}>
                    <View style={styles.loyaltyScoreContainer}>
                      <Text style={[styles.loyaltyScore, { color: getLoyaltyColor(analytics.profile.loyaltyScore) }]}>
                        {analytics.profile.loyaltyScore}%
                      </Text>
                      <Text style={styles.loyaltyLabel}>Loyalty Score</Text>
                      <Text style={[styles.loyaltyBadge, { color: getLoyaltyColor(analytics.profile.loyaltyScore) }]}>
                        {getLoyaltyBadge(analytics.profile.loyaltyScore)}
                      </Text>
                    </View>
                    
                    <View style={styles.profileDetails}>
                      <View style={styles.profileDetail}>
                        <Text style={styles.profileDetailLabel}>Visit Frequency:</Text>
                        <Text style={styles.profileDetailValue}>{analytics.profile.visitFrequency}</Text>
                      </View>
                      <View style={styles.profileDetail}>
                        <Text style={styles.profileDetailLabel}>Preferred Categories:</Text>
                        <Text style={styles.profileDetailValue}>
                          {analytics.profile.preferredCategories.join(', ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card style={styles.insightsCard}>
                <CardHeader>
                  <Text style={styles.sectionTitle}>💡 AI Insights</Text>
                </CardHeader>
                <CardContent>
                  {analytics.insights.map((insight: string, index: number) => (
                    <Text key={index} style={styles.insightText}>• {insight}</Text>
                  ))}
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card style={styles.recommendationsCard}>
                <CardHeader>
                  <Text style={styles.sectionTitle}>✅ AI Recommendations</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationSectionTitle}>For Your Pharmacy:</Text>
                    {analytics.recommendations.forPharmacy.map((rec: string, index: number) => (
                      <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                    ))}
                  </View>
                  
                  <View style={styles.recommendationSection}>
                    <Text style={styles.recommendationSectionTitle}>For Customer Service:</Text>
                    {analytics.recommendations.forCustomer.map((rec: string, index: number) => (
                      <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                    ))}
                  </View>
                </CardContent>
              </Card>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👥 Customer Analytics</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeHeaderButton}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Select a customer to view AI-powered behavioral analysis and personalized recommendations.
          </Text>

          <FlatList
            data={customersList}
            renderItem={renderCustomerItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <Card style={styles.emptyCard}>
                <CardContent>
                  <Text style={styles.emptyText}>No customers with purchase history found</Text>
                  <Text style={styles.emptySubtext}>Customers will appear here once they make purchases</Text>
                </CardContent>
              </Card>
            )}
          />
        </View>

        {renderAnalyticsModal()}
      </View>
    </Modal>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },

  closeHeaderButton: {
    fontSize: 24,
    color: theme.colors.background,
    padding: theme.spacing.xs,
  },

  content: {
    flex: 1,
    padding: theme.spacing.md,
  },

  description: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center' as const,
  },

  customerCard: {
    marginBottom: theme.spacing.md,
  },

  customerHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.md,
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  customerPhone: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  customerMetrics: {
    alignItems: 'flex-end' as const,
  },

  metricValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.success,
  },

  metricLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  customerStats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },

  statItem: {
    alignItems: 'center' as const,
  },

  statValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  emptyCard: {
    marginTop: theme.spacing.xl,
  },

  emptyText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  emptySubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
  },

  modalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },

  closeButton: {
    fontSize: 24,
    color: theme.colors.background,
    padding: theme.spacing.xs,
  },

  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },

  customerDetailsCard: {
    marginBottom: theme.spacing.lg,
  },

  customerDetailsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  customerDetailsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.md,
  },

  detailItem: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  detailValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  detailLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },

  loadingCard: {
    marginBottom: theme.spacing.lg,
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

  profileCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  profileStats: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  loyaltyScoreContainer: {
    alignItems: 'center' as const,
    marginRight: theme.spacing.xl,
  },

  loyaltyScore: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold as any,
  },

  loyaltyLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  loyaltyBadge: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
    marginTop: theme.spacing.xs,
  },

  profileDetails: {
    flex: 1,
  },

  profileDetail: {
    marginBottom: theme.spacing.sm,
  },

  profileDetailLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: 2,
  },

  profileDetailValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  insightsCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },

  insightText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },

  recommendationsCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },

  recommendationSection: {
    marginBottom: theme.spacing.md,
  },

  recommendationSectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  recommendationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
}));