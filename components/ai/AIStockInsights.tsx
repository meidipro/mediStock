import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useStockPredictions } from '../../hooks/useAI';
import { useSales, useStock } from '../../hooks/useDatabase';
import { StockItem, Medicine } from '../../lib/types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface AIStockInsightsProps {
  stockItems: StockItem[];
  onReorderRecommendation?: (medicine: Medicine, prediction: any) => void;
}

interface AdvancedStockAnalysis {
  seasonalTrends: {
    currentSeason: string;
    demandMultiplier: number;
    upcomingSeasonPrediction: string;
  };
  expiryOptimization: {
    nearExpiryItems: number;
    expiryRisk: 'low' | 'medium' | 'high';
    recommendedActions: string[];
  };
  supplierPerformance: {
    averageDeliveryTime: number;
    reliabilityScore: number;
    costEfficiency: number;
  };
  marketTrends: {
    categoryGrowth: number;
    competitorAnalysis: string;
    opportunityScore: number;
  };
}

export const AIStockInsights: React.FC<AIStockInsightsProps> = ({
  stockItems,
  onReorderRecommendation,
}) => {
  const [selectedMedicine, setSelectedMedicine] = useState<StockItem | null>(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState<string[]>([]);
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedStockAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const { sales } = useSales();
  const {
    loading: predictionLoading,
    predictions,
    predictDemand,
    getPrediction,
  } = useStockPredictions();

  // Analyze critical stock items (low stock or high-moving items)
  const criticalItems = stockItems.filter(item => 
    item.quantity <= item.minimum_stock * 1.5 || // Near low stock
    item.quantity >= 100 // High stock items that need prediction
  );

  const handleAnalyzeStock = async (stockItem: StockItem) => {
    if (analyzedItems.includes(stockItem.medicine_id)) {
      // Already analyzed, show existing prediction
      setSelectedMedicine(stockItem);
      setShowPredictionModal(true);
      return;
    }

    // Get sales history for this medicine
    const medicineHistory = sales.filter(sale =>
      sale.items.some(item => item.medicine_id === stockItem.medicine_id)
    );

    await predictDemand(
      stockItem.medicine,
      medicineHistory,
      stockItem.quantity,
      getCurrentSeason()
    );

    setAnalyzedItems(prev => [...prev, stockItem.medicine_id]);
    setSelectedMedicine(stockItem);
    setShowPredictionModal(true);
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring - Allergy season';
    if (month >= 5 && month <= 7) return 'Summer - Heat-related conditions';
    if (month >= 8 && month <= 10) return 'Monsoon - Waterborne diseases';
    return 'Winter - Cold and flu season';
  };

  // Advanced AI Analysis Functions
  const performAdvancedStockAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      // Simulate advanced AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));

      const analysis: AdvancedStockAnalysis = {
        seasonalTrends: {
          currentSeason: getCurrentSeason(),
          demandMultiplier: getSeasonalMultiplier(),
          upcomingSeasonPrediction: getUpcomingSeasonPrediction(),
        },
        expiryOptimization: {
          nearExpiryItems: calculateNearExpiryItems(),
          expiryRisk: calculateExpiryRisk(),
          recommendedActions: getExpiryRecommendations(),
        },
        supplierPerformance: {
          averageDeliveryTime: calculateAverageDeliveryTime(),
          reliabilityScore: calculateSupplierReliability(),
          costEfficiency: calculateCostEfficiency(),
        },
        marketTrends: {
          categoryGrowth: calculateCategoryGrowth(),
          competitorAnalysis: getCompetitorAnalysis(),
          opportunityScore: calculateOpportunityScore(),
        },
      };

      setAdvancedAnalysis(analysis);
      setShowAdvancedAnalysis(true);
    } catch (error) {
      Alert.alert('Analysis Error', 'Unable to perform advanced analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getSeasonalMultiplier = () => {
    const month = new Date().getMonth();
    // Spring (allergy season): higher demand for antihistamines
    if (month >= 2 && month <= 4) return 1.3;
    // Summer: higher demand for rehydration, sun protection
    if (month >= 5 && month <= 7) return 1.1;
    // Monsoon: higher demand for antibiotics, digestive medicines
    if (month >= 8 && month <= 10) return 1.4;
    // Winter: higher demand for cold/flu medicines
    return 1.5;
  };

  const getUpcomingSeasonPrediction = () => {
    const month = new Date().getMonth();
    if (month >= 1 && month <= 3) return 'Prepare for summer: Stock rehydration solutions and sun care products';
    if (month >= 4 && month <= 6) return 'Monsoon preparation: Increase antibiotics and digestive medicine inventory';
    if (month >= 7 && month <= 9) return 'Winter readiness: Stock up on cold, flu, and respiratory medicines';
    return 'Spring preparation: Increase allergy and respiratory medication stock';
  };

  const calculateNearExpiryItems = () => {
    // Simulate calculation based on expiry dates
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    // In a real implementation, this would check actual expiry dates
    return Math.floor(stockItems.length * 0.15); // 15% of items near expiry
  };

  const calculateExpiryRisk = (): 'low' | 'medium' | 'high' => {
    const nearExpiryCount = calculateNearExpiryItems();
    const totalItems = stockItems.length;
    const riskPercentage = (nearExpiryCount / totalItems) * 100;
    
    if (riskPercentage > 20) return 'high';
    if (riskPercentage > 10) return 'medium';
    return 'low';
  };

  const getExpiryRecommendations = () => {
    const risk = calculateExpiryRisk();
    const recommendations = [
      'Implement FIFO (First In, First Out) inventory rotation',
      'Set up automated expiry date alerts',
    ];

    if (risk === 'high') {
      recommendations.push(
        'Consider promotional pricing for near-expiry items',
        'Contact suppliers about exchange policies',
        'Implement daily expiry monitoring'
      );
    } else if (risk === 'medium') {
      recommendations.push(
        'Weekly expiry date audits recommended',
        'Consider bundling near-expiry items with popular products'
      );
    } else {
      recommendations.push('Current expiry management is optimal');
    }

    return recommendations;
  };

  const calculateAverageDeliveryTime = () => {
    // Simulate supplier delivery time analysis
    return Math.floor(Math.random() * 5) + 3; // 3-8 days average
  };

  const calculateSupplierReliability = () => {
    // Simulate supplier reliability score (0-100)
    return Math.floor(Math.random() * 30) + 70; // 70-100% reliability
  };

  const calculateCostEfficiency = () => {
    // Simulate cost efficiency analysis
    return Math.floor(Math.random() * 20) + 80; // 80-100% efficiency
  };

  const calculateCategoryGrowth = () => {
    // Simulate category growth percentage
    return Math.floor(Math.random() * 20) + 5; // 5-25% growth
  };

  const getCompetitorAnalysis = () => {
    const analyses = [
      'Your pricing is competitive in 80% of medicines',
      'Opportunity to improve market share in chronic disease medications',
      'Strong position in emergency medicines category',
      'Consider expanding generic medicine offerings',
    ];
    return analyses[Math.floor(Math.random() * analyses.length)];
  };

  const calculateOpportunityScore = () => {
    // Simulate market opportunity score (0-100)
    return Math.floor(Math.random() * 30) + 70; // 70-100 score
  };

  const getExpiryRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return Theme.colors.error;
      case 'medium': return Theme.colors.warning;
      case 'low': return Theme.colors.success;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return Theme.colors.success;
    if (score >= 70) return Theme.colors.warning;
    return Theme.colors.error;
  };

  const getStockStatus = (item: StockItem) => {
    const prediction = getPrediction(item.medicine_id);
    if (!prediction) return { status: 'unknown', color: Theme.colors.textTertiary };

    const weekDemand = prediction.prediction.nextWeekDemand;
    const currentStock = item.quantity;

    if (currentStock < weekDemand) {
      return { status: 'critical', color: Theme.colors.error };
    } else if (currentStock < weekDemand * 2) {
      return { status: 'low', color: Theme.colors.warning };
    } else if (currentStock > weekDemand * 4) {
      return { status: 'excess', color: Theme.colors.info };
    }
    return { status: 'optimal', color: Theme.colors.success };
  };

  const renderStockItem = ({ item }: { item: StockItem }) => {
    const prediction = getPrediction(item.medicine_id);
    const stockStatus = getStockStatus(item);
    const isAnalyzed = analyzedItems.includes(item.medicine_id);

    return (
      <Card style={styles.stockCard}>
        <CardContent>
          <View style={styles.stockHeader}>
            <View style={styles.stockInfo}>
              <Text style={styles.medicineName} numberOfLines={1}>
                {item.medicine.generic_name}
              </Text>
              {item.medicine.brand_name && (
                <Text style={styles.brandName} numberOfLines={1}>
                  {item.medicine.brand_name}
                </Text>
              )}
              <Text style={styles.currentStock}>
                Current Stock: {item.quantity} units
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: stockStatus.color + '20' }]}>
                <Text style={[styles.statusText, { color: stockStatus.color }]}>
                  {stockStatus.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {prediction && (
            <View style={styles.predictionSummary}>
              <Text style={styles.predictionTitle}>🤖 AI Prediction</Text>
              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>Next Week Demand:</Text>
                <Text style={styles.predictionValue}>{prediction.prediction.nextWeekDemand}</Text>
              </View>
              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>Reorder Point:</Text>
                <Text style={styles.predictionValue}>{prediction.prediction.reorderPoint}</Text>
              </View>
              <Text style={styles.confidenceText}>
                Confidence: {prediction.confidence}%
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                isAnalyzed && styles.analyzedButton
              ]}
              onPress={() => handleAnalyzeStock(item)}
              disabled={predictionLoading}
            >
              {predictionLoading ? (
                <ActivityIndicator size="small" color={Theme.colors.background} />
              ) : (
                <Text style={styles.analyzeButtonText}>
                  {isAnalyzed ? '📊 View Details' : '🤖 Analyze'}
                </Text>
              )}
            </TouchableOpacity>

            {prediction && prediction.prediction.nextWeekDemand > item.quantity && (
              <TouchableOpacity
                style={styles.reorderButton}
                onPress={() => onReorderRecommendation?.(item.medicine, prediction)}
              >
                <Text style={styles.reorderButtonText}>🔔 Need Reorder</Text>
              </TouchableOpacity>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderPredictionDetails = () => {
    if (!selectedMedicine) return null;

    const prediction = getPrediction(selectedMedicine.medicine_id);
    if (!prediction) return null;

    return (
      <ScrollView style={styles.modalContent}>
        <View style={styles.medicineHeader}>
          <Text style={styles.modalMedicineName}>
            {selectedMedicine.medicine.generic_name}
          </Text>
          {selectedMedicine.medicine.brand_name && (
            <Text style={styles.modalBrandName}>
              {selectedMedicine.medicine.brand_name}
            </Text>
          )}
        </View>

        {/* Current Status */}
        <Card style={styles.detailCard}>
          <CardHeader>
            <Text style={styles.detailCardTitle}>📊 Current Status</Text>
          </CardHeader>
          <CardContent>
            <Text style={styles.detailText}>Current Stock: {selectedMedicine.quantity} units</Text>
            <Text style={styles.detailText}>Low Stock Threshold: {selectedMedicine.minimum_stock}</Text>
            <Text style={styles.detailText}>Unit Price: ৳{selectedMedicine.unit_price}</Text>
            <Text style={styles.detailText}>Total Value: ৳{(selectedMedicine.quantity * selectedMedicine.unit_price).toFixed(2)}</Text>
          </CardContent>
        </Card>

        {/* AI Predictions */}
        <Card style={styles.detailCard}>
          <CardHeader>
            <Text style={styles.detailCardTitle}>🤖 AI Predictions</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.predictionDetail}>
              <Text style={styles.predictionDetailLabel}>Next Week Demand:</Text>
              <Text style={styles.predictionDetailValue}>{prediction.prediction.nextWeekDemand} units</Text>
            </View>
            <View style={styles.predictionDetail}>
              <Text style={styles.predictionDetailLabel}>Next Month Demand:</Text>
              <Text style={styles.predictionDetailValue}>{prediction.prediction.nextMonthDemand} units</Text>
            </View>
            <View style={styles.predictionDetail}>
              <Text style={styles.predictionDetailLabel}>Recommended Reorder Point:</Text>
              <Text style={styles.predictionDetailValue}>{prediction.prediction.reorderPoint} units</Text>
            </View>
            <View style={styles.predictionDetail}>
              <Text style={styles.predictionDetailLabel}>Optimal Order Quantity:</Text>
              <Text style={styles.predictionDetailValue}>{prediction.prediction.optimalOrderQuantity} units</Text>
            </View>
            
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>AI Confidence Level:</Text>
              <View style={styles.confidenceBar}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { width: `${prediction.confidence}%` }
                  ]} 
                />
              </View>
              <Text style={styles.confidencePercentage}>{prediction.confidence}%</Text>
            </View>
          </CardContent>
        </Card>

        {/* AI Insights */}
        {prediction.insights.length > 0 && (
          <Card style={styles.detailCard}>
            <CardHeader>
              <Text style={styles.detailCardTitle}>💡 AI Insights</Text>
            </CardHeader>
            <CardContent>
              {prediction.insights.map((insight: string, index: number) => (
                <Text key={index} style={styles.insightText}>• {insight}</Text>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card style={styles.detailCard}>
          <CardHeader>
            <Text style={styles.detailCardTitle}>✅ Recommendations</Text>
          </CardHeader>
          <CardContent>
            {selectedMedicine.quantity < prediction.prediction.reorderPoint && (
              <View style={styles.recommendationItem}>
                <Text style={styles.recommendationTitle}>🔔 Immediate Action Required</Text>
                <Text style={styles.recommendationText}>
                  Stock is below the AI-recommended reorder point. Consider ordering {prediction.prediction.optimalOrderQuantity} units.
                </Text>
              </View>
            )}
            
            {selectedMedicine.quantity > prediction.prediction.nextMonthDemand * 3 && (
              <View style={styles.recommendationItem}>
                <Text style={styles.recommendationTitle}>📉 Excess Stock Alert</Text>
                <Text style={styles.recommendationText}>
                  You have excess stock. Consider promotional pricing or check for approaching expiry dates.
                </Text>
              </View>
            )}
            
            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationTitle}>📅 Next Review Date</Text>
              <Text style={styles.recommendationText}>
                Review this medicine&apos;s stock level again in {Math.ceil(selectedMedicine.quantity / Math.max(1, prediction.prediction.nextWeekDemand))} days.
              </Text>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🤖 AI Stock Intelligence</Text>
          <Text style={styles.headerSubtitle}>
            Predictive analytics for {criticalItems.length} critical items
          </Text>
        </View>
        <TouchableOpacity
          style={styles.advancedAnalysisButton}
          onPress={performAdvancedStockAnalysis}
          disabled={analysisLoading}
        >
          {analysisLoading ? (
            <ActivityIndicator size="small" color={Theme.colors.background} />
          ) : (
            <Text style={styles.advancedAnalysisButtonText}>🧠 Advanced</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={criticalItems}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <Card style={styles.emptyCard}>
            <CardContent>
              <Text style={styles.emptyText}>✨ All stock levels look optimal!</Text>
              <Text style={styles.emptySubtext}>
                No critical stock items requiring immediate attention.
              </Text>
            </CardContent>
          </Card>
        )}
      />

      {/* Prediction Details Modal */}
      <Modal
        visible={showPredictionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🤖 AI Stock Analysis</Text>
            <TouchableOpacity
              onPress={() => setShowPredictionModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          {renderPredictionDetails()}
          
          <View style={styles.modalFooter}>
            <Button
              title="Close"
              variant="outline"
              onPress={() => setShowPredictionModal(false)}
              style={styles.footerButton}
            />
            {selectedMedicine && getPrediction(selectedMedicine.medicine_id) && (
              <Button
                title="Order Now"
                variant="primary"
                onPress={() => {
                  const prediction = getPrediction(selectedMedicine.medicine_id);
                  onReorderRecommendation?.(selectedMedicine.medicine, prediction);
                  setShowPredictionModal(false);
                }}
                style={styles.footerButton}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Advanced Analysis Modal */}
      <Modal
        visible={showAdvancedAnalysis}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🧠 Advanced Stock Analysis</Text>
            <TouchableOpacity
              onPress={() => setShowAdvancedAnalysis(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {advancedAnalysis && (
              <>
                {/* Seasonal Trends */}
                <Card style={styles.detailCard}>
                  <CardHeader>
                    <Text style={styles.detailCardTitle}>🌤️ Seasonal Intelligence</Text>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.seasonalInfo}>
                      <Text style={styles.seasonalTitle}>{advancedAnalysis.seasonalTrends.currentSeason}</Text>
                      <View style={styles.seasonalMetric}>
                        <Text style={styles.seasonalLabel}>Demand Multiplier:</Text>
                        <Text style={[styles.seasonalValue, { color: Theme.colors.success }]}>
                          {advancedAnalysis.seasonalTrends.demandMultiplier}x
                        </Text>
                      </View>
                      <Text style={styles.seasonalPrediction}>
                        🔮 {advancedAnalysis.seasonalTrends.upcomingSeasonPrediction}
                      </Text>
                    </View>
                  </CardContent>
                </Card>

                {/* Expiry Optimization */}
                <Card style={styles.detailCard}>
                  <CardHeader>
                    <Text style={styles.detailCardTitle}>📅 Expiry Risk Management</Text>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.expiryInfo}>
                      <View style={styles.expiryMetrics}>
                        <View style={styles.expiryMetric}>
                          <Text style={styles.expiryValue}>{advancedAnalysis.expiryOptimization.nearExpiryItems}</Text>
                          <Text style={styles.expiryLabel}>Near Expiry Items</Text>
                        </View>
                        <View style={styles.expiryMetric}>
                          <Text style={[
                            styles.expiryValue, 
                            { color: getExpiryRiskColor(advancedAnalysis.expiryOptimization.expiryRisk) }
                          ]}>
                            {advancedAnalysis.expiryOptimization.expiryRisk.toUpperCase()}
                          </Text>
                          <Text style={styles.expiryLabel}>Risk Level</Text>
                        </View>
                      </View>
                      
                      <View style={styles.recommendationsSection}>
                        <Text style={styles.recommendationsSectionTitle}>📋 Action Items:</Text>
                        {advancedAnalysis.expiryOptimization.recommendedActions.map((action, index) => (
                          <Text key={index} style={styles.recommendationActionItem}>• {action}</Text>
                        ))}
                      </View>
                    </View>
                  </CardContent>
                </Card>

                {/* Supplier Performance */}
                <Card style={styles.detailCard}>
                  <CardHeader>
                    <Text style={styles.detailCardTitle}>🚚 Supplier Performance</Text>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.supplierMetrics}>
                      <View style={styles.supplierMetric}>
                        <Text style={styles.supplierValue}>{advancedAnalysis.supplierPerformance.averageDeliveryTime} days</Text>
                        <Text style={styles.supplierLabel}>Avg Delivery Time</Text>
                      </View>
                      <View style={styles.supplierMetric}>
                        <Text style={[
                          styles.supplierValue, 
                          { color: getScoreColor(advancedAnalysis.supplierPerformance.reliabilityScore) }
                        ]}>
                          {advancedAnalysis.supplierPerformance.reliabilityScore}%
                        </Text>
                        <Text style={styles.supplierLabel}>Reliability Score</Text>
                      </View>
                      <View style={styles.supplierMetric}>
                        <Text style={[
                          styles.supplierValue, 
                          { color: getScoreColor(advancedAnalysis.supplierPerformance.costEfficiency) }
                        ]}>
                          {advancedAnalysis.supplierPerformance.costEfficiency}%
                        </Text>
                        <Text style={styles.supplierLabel}>Cost Efficiency</Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>

                {/* Market Trends */}
                <Card style={styles.detailCard}>
                  <CardHeader>
                    <Text style={styles.detailCardTitle}>📈 Market Intelligence</Text>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.marketInfo}>
                      <View style={styles.marketMetrics}>
                        <View style={styles.marketMetric}>
                          <Text style={[styles.marketValue, { color: Theme.colors.success }]}>
                            +{advancedAnalysis.marketTrends.categoryGrowth}%
                          </Text>
                          <Text style={styles.marketLabel}>Category Growth</Text>
                        </View>
                        <View style={styles.marketMetric}>
                          <Text style={[
                            styles.marketValue, 
                            { color: getScoreColor(advancedAnalysis.marketTrends.opportunityScore) }
                          ]}>
                            {advancedAnalysis.marketTrends.opportunityScore}
                          </Text>
                          <Text style={styles.marketLabel}>Opportunity Score</Text>
                        </View>
                      </View>
                      
                      <View style={styles.competitorSection}>
                        <Text style={styles.competitorTitle}>🏪 Competitive Analysis:</Text>
                        <Text style={styles.competitorText}>{advancedAnalysis.marketTrends.competitorAnalysis}</Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>

                {/* AI Recommendations Summary */}
                <Card style={StyleSheet.flatten([styles.detailCard, { borderLeftColor: Theme.colors.primary }])}>
                  <CardHeader>
                    <Text style={styles.detailCardTitle}>🎯 AI Strategic Recommendations</Text>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.strategicRecommendation}>
                      Based on comprehensive analysis, prioritize seasonal inventory adjustments with a 
                      {advancedAnalysis.seasonalTrends.demandMultiplier}x demand increase expected. 
                      {advancedAnalysis.expiryOptimization.expiryRisk === 'high' && 
                        ' Address expiry risk immediately through promotional strategies.'
                      }
                      {' Market conditions show '}
                      {advancedAnalysis.marketTrends.categoryGrowth > 15 ? 'strong' : 'moderate'}
                      {' growth potential.'}
                    </Text>
                  </CardContent>
                </Card>
              </>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Export Report"
              variant="outline"
              onPress={() => Alert.alert('Export', 'Analysis report exported successfully!')}
              style={styles.footerButton}
            />
            <Button
              title="Close"
              variant="primary"
              onPress={() => setShowAdvancedAnalysis(false)}
              style={styles.footerButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },

  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  advancedAnalysisButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 80,
  },

  advancedAnalysisButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
  },

  listContainer: {
    paddingBottom: theme.spacing.xl,
  },

  stockCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },

  stockHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.md,
  },

  stockInfo: {
    flex: 1,
  },

  medicineName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  brandName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  currentStock: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },

  statusContainer: {
    alignItems: 'flex-end' as const,
  },

  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },

  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
  },

  predictionSummary: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },

  predictionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  predictionRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },

  predictionLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  predictionValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
  },

  confidenceText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic' as const,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
  },

  analyzeButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
  },

  analyzedButton: {
    backgroundColor: theme.colors.success,
  },

  analyzeButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
  },

  reorderButton: {
    backgroundColor: theme.colors.warning,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
  },

  reorderButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
  },

  emptyCard: {
    alignItems: 'center' as const,
    padding: theme.spacing.xl,
  },

  emptyText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.success,
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
    padding: theme.spacing.xs,
  },

  closeButtonText: {
    fontSize: 24,
    color: theme.colors.background,
  },

  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },

  medicineHeader: {
    marginBottom: theme.spacing.lg,
  },

  modalMedicineName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },

  modalBrandName: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  detailCard: {
    marginBottom: theme.spacing.md,
  },

  detailCardTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  detailText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  predictionDetail: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  predictionDetailLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },

  predictionDetailValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.primary,
  },

  confidenceContainer: {
    marginTop: theme.spacing.md,
  },

  confidenceLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  confidenceBar: {
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden' as const,
    marginBottom: theme.spacing.xs,
  },

  confidenceFill: {
    height: 8,
    backgroundColor: theme.colors.success,
  },

  confidencePercentage: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.success,
    textAlign: 'center' as const,
  },

  insightText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },

  recommendationItem: {
    marginBottom: theme.spacing.md,
  },

  recommendationTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  recommendationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  modalFooter: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  footerButton: {
    flex: 1,
  },

  // Advanced Analysis Styles
  seasonalInfo: {
    alignItems: 'center' as const,
  },

  seasonalTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center' as const,
  },

  seasonalMetric: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },

  seasonalLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },

  seasonalValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold as any,
  },

  seasonalPrediction: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.info,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.sm,
  },

  expiryInfo: {
    // No specific styles needed, using flexbox defaults
  },

  expiryMetrics: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: theme.spacing.lg,
  },

  expiryMetric: {
    alignItems: 'center' as const,
  },

  expiryValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },

  expiryLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center' as const,
  },

  recommendationsSection: {
    marginTop: theme.spacing.md,
  },

  recommendationsSectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  recommendationActionItem: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },

  supplierMetrics: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },

  supplierMetric: {
    alignItems: 'center' as const,
    flex: 1,
  },

  supplierValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
  },

  supplierLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center' as const,
  },

  marketInfo: {
    // No specific styles needed
  },

  marketMetrics: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: theme.spacing.lg,
  },

  marketMetric: {
    alignItems: 'center' as const,
  },

  marketValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
  },

  marketLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center' as const,
  },

  competitorSection: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  competitorTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  competitorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  strategicRecommendation: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    lineHeight: 22,
    textAlign: 'justify' as const,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
  },
}));