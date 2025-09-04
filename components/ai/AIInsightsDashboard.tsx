import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../ui/Card';

// Import our new services
import { DemandForecasting } from '../../lib/demand-forecasting';
import { MarketTrendAnalysis } from '../../lib/market-trend-analysis';
import { MedicineDeliveryService } from '../../lib/medicine-delivery-service';
import { SeasonalDemandPrediction } from '../../lib/seasonal-demand-prediction';

interface AIInsightsDashboardProps {
  onClose?: () => void;
}

export const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({
  onClose,
}) => {
  const { pharmacy } = useAuth();
  
  // State for different insights
  const [seasonalInsights, setSeasonalInsights] = useState<any>(null);
  const [forecastInsights, setForecastInsights] = useState<any>(null);
  const [marketInsights, setMarketInsights] = useState<any>(null);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'seasonal' | 'forecast' | 'market' | 'delivery'>('overview');

  const loadAllInsights = useCallback(async () => {
    if (!pharmacy?.id) {
      // Set default data when no pharmacy
      setSeasonalInsights({
        critical_alerts: 2,
        high_demand_medicines: 5,
        seasonal_factor: 1.3,
        top_recommendations: [
          'Increase stock of respiratory medicines for winter season',
          'Monitor cold and flu medicine demand',
          'Prepare for seasonal allergy medication surge'
        ]
      });
      setForecastInsights({
        total_forecasted_demand: 150,
        urgent_restocks: 3,
        high_confidence_forecasts: 8,
        top_forecasts: [
          { medicine_name: 'Paracetamol 500mg', predicted_demand: 45, action: 'increase_stock' },
          { medicine_name: 'Amoxicillin 250mg', predicted_demand: 30, action: 'maintain_stock' },
          { medicine_name: 'Cetirizine 10mg', predicted_demand: 25, action: 'increase_stock' }
        ]
      });
      setMarketInsights({
        trending_conditions: ['Respiratory Infections', 'Seasonal Allergies', 'Cold & Flu'],
        high_demand_medicines: ['Paracetamol', 'Amoxicillin', 'Cetirizine'],
        market_alerts: 1,
        growth_opportunities: 4
      });
      setDeliveryStats({
        pending_deliveries: 2,
        today_deliveries: 5,
        delivery_success_rate: 95,
        avg_delivery_time: 45
      });
      return;
    }

    try {
      setLoading(true);
      
      // Load all insights in parallel with error handling
      const [
        seasonalData,
        forecastData,
        marketData,
        deliveryData,
      ] = await Promise.allSettled([
        SeasonalDemandPrediction.getQuickSeasonalInsights(pharmacy.id),
        DemandForecasting.getQuickForecastSummary(pharmacy.id),
        MarketTrendAnalysis.getQuickMarketInsights(pharmacy.id),
        MedicineDeliveryService.getQuickDeliveryStats(pharmacy.id),
      ]);

      // Handle each result with fallback data
      setSeasonalInsights(
        seasonalData.status === 'fulfilled' 
          ? seasonalData.value 
          : {
              critical_alerts: 0,
              high_demand_medicines: 0,
              seasonal_factor: 1.0,
              top_recommendations: ['Seasonal analysis unavailable']
            }
      );

      setForecastInsights(
        forecastData.status === 'fulfilled' 
          ? forecastData.value 
          : {
              total_forecasted_demand: 0,
              urgent_restocks: 0,
              high_confidence_forecasts: 0,
              top_forecasts: []
            }
      );

      setMarketInsights(
        marketData.status === 'fulfilled' 
          ? marketData.value 
          : {
              trending_conditions: [],
              high_demand_medicines: [],
              market_alerts: 0,
              growth_opportunities: 0
            }
      );

      setDeliveryStats(
        deliveryData.status === 'fulfilled' 
          ? deliveryData.value 
          : {
              pending_deliveries: 0,
              today_deliveries: 0,
              delivery_success_rate: 0,
              avg_delivery_time: 0
            }
      );

    } catch (error) {
      console.error('❌ Error loading AI insights:', error);
      // Don't show alert, just use fallback data
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllInsights();
    setRefreshing(false);
  }, [loadAllInsights]);

  useEffect(() => {
    loadAllInsights();
  }, [loadAllInsights]);

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Critical Alerts */}
      <Card style={styles.alertCard}>
        <CardHeader>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="warning" size={24} color="#FF6B6B" />
            <Text style={styles.cardTitle}>Critical Alerts</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.alertRow}>
            <View style={styles.alertItem}>
              <Text style={styles.alertNumber}>{seasonalInsights?.critical_alerts || 0}</Text>
              <Text style={styles.alertLabel}>Seasonal Alerts</Text>
            </View>
            <View style={styles.alertItem}>
              <Text style={styles.alertNumber}>{forecastInsights?.urgent_restocks || 0}</Text>
              <Text style={styles.alertLabel}>Urgent Restocks</Text>
            </View>
            <View style={styles.alertItem}>
              <Text style={styles.alertNumber}>{marketInsights?.market_alerts || 0}</Text>
              <Text style={styles.alertLabel}>Market Alerts</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card style={styles.metricsCard}>
        <CardHeader>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="analytics" size={24} color="#4ECDC4" />
            <Text style={styles.cardTitle}>Key Metrics</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{seasonalInsights?.high_demand_medicines || 0}</Text>
              <Text style={styles.metricLabel}>High Demand Medicines</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{forecastInsights?.high_confidence_forecasts || 0}</Text>
              <Text style={styles.metricLabel}>High Confidence Forecasts</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{marketInsights?.growth_opportunities || 0}</Text>
              <Text style={styles.metricLabel}>Growth Opportunities</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{deliveryStats?.delivery_success_rate || 0}%</Text>
              <Text style={styles.metricLabel}>Delivery Success Rate</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Top Recommendations */}
      <Card style={styles.recommendationsCard}>
        <CardHeader>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="bulb" size={24} color="#FFD93D" />
            <Text style={styles.cardTitle}>AI Recommendations</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.recommendationsList}>
            {seasonalInsights?.top_recommendations?.slice(0, 3).map((rec: string, index: number) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4ECDC4" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
            {forecastInsights?.top_forecasts?.slice(0, 2).map((forecast: any, index: number) => (
              <View key={`forecast-${index}`} style={styles.recommendationItem}>
                <Ionicons name="trending-up" size={16} color="#4ECDC4" />
                <Text style={styles.recommendationText}>
                  {forecast.medicine_name}: {forecast.predicted_demand} units needed
                </Text>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <CardHeader>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="flash" size={24} color="#FF6B6B" />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
        </CardHeader>
        <CardContent>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('seasonal')}>
              <Ionicons name="thermometer" size={24} color="#4ECDC4" />
              <Text style={styles.actionText}>Seasonal Analysis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('forecast')}>
              <Ionicons name="trending-up" size={24} color="#4ECDC4" />
              <Text style={styles.actionText}>Demand Forecast</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('market')}>
              <Ionicons name="bar-chart" size={24} color="#4ECDC4" />
              <Text style={styles.actionText}>Market Trends</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('delivery')}>
              <Ionicons name="car" size={24} color="#4ECDC4" />
              <Text style={styles.actionText}>Delivery Stats</Text>
            </TouchableOpacity>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );

  const renderSeasonalTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.detailCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>🌡️ Seasonal Demand Analysis</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.seasonalMetrics}>
            <View style={styles.seasonalMetric}>
              <Text style={styles.seasonalValue}>{seasonalInsights?.critical_alerts || 0}</Text>
              <Text style={styles.seasonalLabel}>Critical Alerts</Text>
            </View>
            <View style={styles.seasonalMetric}>
              <Text style={styles.seasonalValue}>{seasonalInsights?.high_demand_medicines || 0}</Text>
              <Text style={styles.seasonalLabel}>High Demand Medicines</Text>
            </View>
            <View style={styles.seasonalMetric}>
              <Text style={styles.seasonalValue}>{Math.round((seasonalInsights?.seasonal_factor || 1) * 100)}%</Text>
              <Text style={styles.seasonalLabel}>Seasonal Factor</Text>
            </View>
          </View>
          
          {seasonalInsights?.top_recommendations?.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionTitle}>Top Recommendations:</Text>
              {seasonalInsights.top_recommendations.map((rec: string, index: number) => (
                <View key={index} style={styles.recommendationRow}>
                  <Ionicons name="arrow-forward" size={16} color="#4ECDC4" />
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );

  const renderForecastTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.detailCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>📊 Demand Forecasting</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.forecastMetrics}>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastValue}>{forecastInsights?.total_forecasted_demand || 0}</Text>
              <Text style={styles.forecastLabel}>Total Predicted Demand</Text>
            </View>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastValue}>{forecastInsights?.urgent_restocks || 0}</Text>
              <Text style={styles.forecastLabel}>Urgent Restocks</Text>
            </View>
            <View style={styles.forecastMetric}>
              <Text style={styles.forecastValue}>{forecastInsights?.high_confidence_forecasts || 0}</Text>
              <Text style={styles.forecastLabel}>High Confidence</Text>
            </View>
          </View>
          
          {forecastInsights?.top_forecasts?.length > 0 && (
            <View style={styles.forecastList}>
              <Text style={styles.sectionTitle}>Top Forecasts:</Text>
              {forecastInsights.top_forecasts.map((forecast: any, index: number) => (
                <View key={index} style={styles.forecastItem}>
                  <View style={styles.forecastItemHeader}>
                    <Text style={styles.forecastMedicineName}>{forecast.medicine_name}</Text>
                    <Text style={styles.forecastDemand}>{forecast.predicted_demand} units</Text>
                  </View>
                  <Text style={styles.forecastAction}>Action: {forecast.action.replace('_', ' ')}</Text>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );

  const renderMarketTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.detailCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>📈 Market Trend Analysis</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.marketMetrics}>
            <View style={styles.marketMetric}>
              <Text style={styles.marketValue}>{marketInsights?.market_alerts || 0}</Text>
              <Text style={styles.marketLabel}>Market Alerts</Text>
            </View>
            <View style={styles.marketMetric}>
              <Text style={styles.marketValue}>{marketInsights?.growth_opportunities || 0}</Text>
              <Text style={styles.marketLabel}>Growth Opportunities</Text>
            </View>
          </View>
          
          {marketInsights?.trending_conditions?.length > 0 && (
            <View style={styles.trendingSection}>
              <Text style={styles.sectionTitle}>Trending Health Conditions:</Text>
              {marketInsights.trending_conditions.map((condition: string, index: number) => (
                <View key={index} style={styles.trendingItem}>
                  <Ionicons name="trending-up" size={16} color="#FF6B6B" />
                  <Text style={styles.trendingText}>{condition}</Text>
                </View>
              ))}
            </View>
          )}
          
          {marketInsights?.high_demand_medicines?.length > 0 && (
            <View style={styles.medicinesSection}>
              <Text style={styles.sectionTitle}>High Demand Medicines:</Text>
              {marketInsights.high_demand_medicines.map((medicine: string, index: number) => (
                <View key={index} style={styles.medicineItem}>
                  <Ionicons name="medical" size={16} color="#4ECDC4" />
                  <Text style={styles.medicineText}>{medicine}</Text>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );

  const renderDeliveryTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.detailCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>🚚 Delivery Analytics</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.deliveryMetrics}>
            <View style={styles.deliveryMetric}>
              <Text style={styles.deliveryValue}>{deliveryStats?.pending_deliveries || 0}</Text>
              <Text style={styles.deliveryLabel}>Pending Deliveries</Text>
            </View>
            <View style={styles.deliveryMetric}>
              <Text style={styles.deliveryValue}>{deliveryStats?.today_deliveries || 0}</Text>
              <Text style={styles.deliveryLabel}>Today's Deliveries</Text>
            </View>
            <View style={styles.deliveryMetric}>
              <Text style={styles.deliveryValue}>{deliveryStats?.delivery_success_rate || 0}%</Text>
              <Text style={styles.deliveryLabel}>Success Rate</Text>
            </View>
            <View style={styles.deliveryMetric}>
              <Text style={styles.deliveryValue}>{deliveryStats?.avg_delivery_time || 0}m</Text>
              <Text style={styles.deliveryLabel}>Avg Delivery Time</Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'seasonal':
        return renderSeasonalTab();
      case 'forecast':
        return renderForecastTab();
      case 'market':
        return renderMarketTab();
      case 'delivery':
        return renderDeliveryTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading AI Insights...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="analytics" size={24} color={Theme.colors.primary} />
          <Text style={styles.headerTitle}>AI Insights Dashboard</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview', icon: 'home' },
          { key: 'seasonal', label: 'Seasonal', icon: 'thermometer' },
          { key: 'forecast', label: 'Forecast', icon: 'trending-up' },
          { key: 'market', label: 'Market', icon: 'bar-chart' },
          { key: 'delivery', label: 'Delivery', icon: 'car' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeTab === tab.key ? Theme.colors.primary : Theme.colors.textSecondary} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  alertCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  metricsCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  recommendationsCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD93D',
  },
  actionsCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  detailCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  alertItem: {
    alignItems: 'center',
  },
  alertNumber: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#FF6B6B',
  },
  alertLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  metricValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  metricLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  recommendationsList: {
    gap: theme.spacing.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  seasonalMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  seasonalMetric: {
    alignItems: 'center',
  },
  seasonalValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#4ECDC4',
  },
  seasonalLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  forecastMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  forecastMetric: {
    alignItems: 'center',
  },
  forecastValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#4ECDC4',
  },
  forecastLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  marketMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  marketMetric: {
    alignItems: 'center',
  },
  marketValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#4ECDC4',
  },
  marketLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  deliveryMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  deliveryMetric: {
    width: '48%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  deliveryValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#4ECDC4',
  },
  deliveryLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  recommendationsSection: {
    marginTop: theme.spacing.md,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  forecastList: {
    marginTop: theme.spacing.md,
  },
  forecastItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  forecastItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forecastMedicineName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  forecastDemand: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  forecastAction: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  trendingSection: {
    marginTop: theme.spacing.md,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  trendingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  medicinesSection: {
    marginTop: theme.spacing.md,
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  medicineText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
}));
