import { supabase } from './supabase';

export interface DemandForecast {
  medicine_id: string;
  medicine_name: string;
  therapeutic_class: string;
  current_stock: number;
  forecast_period: '30_days' | '60_days' | '90_days';
  predictions: {
    week_1: number;
    week_2: number;
    week_3: number;
    week_4: number;
    week_5?: number;
    week_6?: number;
    week_7?: number;
    week_8?: number;
    week_9?: number;
    week_10?: number;
    week_11?: number;
    week_12?: number;
  };
  total_predicted_demand: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  risk_factors: string[];
  recommendations: {
    action: 'increase_stock' | 'maintain_stock' | 'reduce_stock' | 'urgent_restock';
    suggested_quantity: number;
    reorder_point: number;
    safety_stock: number;
    reasoning: string;
  };
  accuracy_score: number; // 0-100
}

export interface ForecastingModel {
  model_type: 'linear_regression' | 'exponential_smoothing' | 'arima' | 'ensemble';
  accuracy: number;
  parameters: any;
  last_trained: string;
}

export interface MarketTrend {
  category: string;
  trend_direction: 'up' | 'down' | 'stable';
  growth_rate: number; // percentage
  market_size: number;
  key_drivers: string[];
  forecast_confidence: number;
}

export class DemandForecasting {
  private static readonly FORECASTING_MODELS = {
    'linear_regression': {
      weight: 0.3,
      description: 'Linear trend analysis'
    },
    'exponential_smoothing': {
      weight: 0.4,
      description: 'Recent data emphasis'
    },
    'seasonal_adjustment': {
      weight: 0.3,
      description: 'Seasonal pattern recognition'
    }
  };

  /**
   * Generate demand forecast for all medicines
   */
  static async generateDemandForecast(
    pharmacyId: string,
    period: '30_days' | '60_days' | '90_days' = '30_days'
  ): Promise<DemandForecast[]> {
    try {
      console.log('📊 Generating demand forecast for period:', period);

      // Get pharmacy stock
      const { data: stockItems, error: stockError } = await supabase
        .from('stock')
        .select(`
          *,
          medicine:global_medicine_database(*)
        `)
        .eq('pharmacy_id', pharmacyId);

      if (stockError) {
        throw stockError;
      }

      // Get historical sales data
      const salesData = await this.getHistoricalSalesData(pharmacyId, 365); // 1 year of data
      
      // Get market trends
      const marketTrends = await this.getMarketTrends();
      
      // Generate forecasts for each medicine
      const forecasts: DemandForecast[] = [];
      
      for (const stockItem of stockItems || []) {
        if (stockItem.medicine) {
          const forecast = await this.forecastMedicineDemand(
            stockItem,
            salesData,
            marketTrends,
            period
          );
          forecasts.push(forecast);
        }
      }

      // Sort by urgency and confidence
      return forecasts.sort((a, b) => {
        const urgencyScore = this.getUrgencyScore(a) - this.getUrgencyScore(b);
        if (urgencyScore !== 0) return urgencyScore;
        return b.accuracy_score - a.accuracy_score;
      });

    } catch (error) {
      console.error('❌ Error generating demand forecast:', error);
      throw error;
    }
  }

  /**
   * Forecast demand for a specific medicine
   */
  private static async forecastMedicineDemand(
    stockItem: any,
    salesData: any[],
    marketTrends: MarketTrend[],
    period: '30_days' | '60_days' | '90_days'
  ): Promise<DemandForecast> {
    const medicine = stockItem.medicine;
    
    // Get sales history for this medicine
    const medicineSales = this.getMedicineSalesHistory(salesData, medicine.id);
    
    // Apply different forecasting models
    const linearForecast = this.linearRegressionForecast(medicineSales, period);
    const exponentialForecast = this.exponentialSmoothingForecast(medicineSales, period);
    const seasonalForecast = this.seasonalAdjustmentForecast(medicineSales, period);
    
    // Combine forecasts using ensemble method
    const ensembleForecast = this.combineForecasts([
      { forecast: linearForecast, weight: this.FORECASTING_MODELS.linear_regression.weight },
      { forecast: exponentialForecast, weight: this.FORECASTING_MODELS.exponential_smoothing.weight },
      { forecast: seasonalForecast, weight: this.FORECASTING_MODELS.seasonal_adjustment.weight },
    ]);
    
    // Apply market trend adjustments
    const marketAdjustedForecast = this.applyMarketTrends(ensembleForecast, marketTrends, medicine.therapeutic_class);
    
    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(ensembleForecast, medicineSales);
    
    // Determine trend
    const trend = this.determineTrend(medicineSales, marketAdjustedForecast);
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(stockItem, marketAdjustedForecast, marketTrends);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(stockItem, marketAdjustedForecast, riskFactors);
    
    // Calculate accuracy score
    const accuracyScore = this.calculateAccuracyScore(medicineSales, ensembleForecast);

    return {
      medicine_id: medicine.id,
      medicine_name: medicine.generic_name,
      therapeutic_class: medicine.therapeutic_class,
      current_stock: stockItem.quantity,
      forecast_period: period,
      predictions: marketAdjustedForecast,
      total_predicted_demand: this.calculateTotalDemand(marketAdjustedForecast, period),
      confidence_interval: confidenceInterval,
      trend,
      risk_factors: riskFactors,
      recommendations,
      accuracy_score: accuracyScore,
    };
  }

  /**
   * Linear regression forecast
   */
  private static linearRegressionForecast(salesHistory: number[], period: '30_days' | '60_days' | '90_days'): any {
    if (salesHistory.length < 4) {
      return this.getDefaultForecast(period);
    }

    // Simple linear regression
    const n = salesHistory.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = salesHistory;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const weeks = this.getWeeksForPeriod(period);
    const forecast: any = {};
    
    weeks.forEach((week, index) => {
      const futureX = n + index;
      forecast[week] = Math.max(0, Math.round(intercept + slope * futureX));
    });

    return forecast;
  }

  /**
   * Exponential smoothing forecast
   */
  private static exponentialSmoothingForecast(salesHistory: number[], period: '30_days' | '60_days' | '90_days'): any {
    if (salesHistory.length < 3) {
      return this.getDefaultForecast(period);
    }

    const alpha = 0.3; // Smoothing parameter
    let forecast = salesHistory[0];
    
    // Apply exponential smoothing
    for (let i = 1; i < salesHistory.length; i++) {
      forecast = alpha * salesHistory[i] + (1 - alpha) * forecast;
    }

    // Generate future forecasts
    const weeks = this.getWeeksForPeriod(period);
    const result: any = {};
    
    weeks.forEach((week, index) => {
      result[week] = Math.max(0, Math.round(forecast * (1 + index * 0.05))); // Slight growth assumption
    });

    return result;
  }

  /**
   * Seasonal adjustment forecast
   */
  private static seasonalAdjustmentForecast(salesHistory: number[], period: '30_days' | '60_days' | '90_days'): any {
    if (salesHistory.length < 12) {
      return this.getDefaultForecast(period);
    }

    // Calculate seasonal indices (simplified)
    const seasonalIndices = this.calculateSeasonalIndices(salesHistory);
    const averageDemand = salesHistory.reduce((a, b) => a + b, 0) / salesHistory.length;
    
    const weeks = this.getWeeksForPeriod(period);
    const result: any = {};
    
    weeks.forEach((week, index) => {
      const seasonalIndex = seasonalIndices[index % 4] || 1.0; // 4-week cycle
      result[week] = Math.max(0, Math.round(averageDemand * seasonalIndex));
    });

    return result;
  }

  /**
   * Calculate seasonal indices
   */
  private static calculateSeasonalIndices(salesHistory: number[]): number[] {
    const indices = [0, 0, 0, 0]; // 4-week cycle
    const counts = [0, 0, 0, 0];
    
    salesHistory.forEach((value, index) => {
      const weekIndex = index % 4;
      indices[weekIndex] += value;
      counts[weekIndex]++;
    });
    
    const average = salesHistory.reduce((a, b) => a + b, 0) / salesHistory.length;
    
    return indices.map((sum, index) => {
      const count = counts[index] || 1;
      return (sum / count) / average;
    });
  }

  /**
   * Combine multiple forecasts using ensemble method
   */
  private static combineForecasts(forecasts: Array<{ forecast: any; weight: number }>): any {
    const weeks = Object.keys(forecasts[0].forecast);
    const combined: any = {};
    
    weeks.forEach(week => {
      let weightedSum = 0;
      let totalWeight = 0;
      
      forecasts.forEach(({ forecast, weight }) => {
        if (forecast[week] !== undefined) {
          weightedSum += forecast[week] * weight;
          totalWeight += weight;
        }
      });
      
      combined[week] = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    });
    
    return combined;
  }

  /**
   * Apply market trends to forecast
   */
  private static applyMarketTrends(forecast: any, marketTrends: MarketTrend[], therapeuticClass: string): any {
    const relevantTrend = marketTrends.find(trend => trend.category === therapeuticClass);
    
    if (!relevantTrend) {
      return forecast;
    }
    
    const adjustmentFactor = 1 + (relevantTrend.growth_rate / 100);
    const adjustedForecast: any = {};
    
    Object.keys(forecast).forEach(week => {
      adjustedForecast[week] = Math.max(0, Math.round(forecast[week] * adjustmentFactor));
    });
    
    return adjustedForecast;
  }

  /**
   * Calculate confidence interval
   */
  private static calculateConfidenceInterval(forecast: any, salesHistory: number[]): { lower: number; upper: number } {
    if (salesHistory.length < 3) {
      return { lower: 0, upper: 0 };
    }
    
    // Calculate standard deviation of historical data
    const mean = salesHistory.reduce((a, b) => a + b, 0) / salesHistory.length;
    const variance = salesHistory.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / salesHistory.length;
    const stdDev = Math.sqrt(variance);
    
    // 95% confidence interval (±2 standard deviations)
    const margin = 2 * stdDev;
    
    return {
      lower: Math.max(0, Math.round(mean - margin)),
      upper: Math.round(mean + margin),
    };
  }

  /**
   * Determine trend direction
   */
  private static determineTrend(salesHistory: number[], forecast: any): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (salesHistory.length < 4) {
      return 'stable';
    }
    
    const recent = salesHistory.slice(-4);
    const older = salesHistory.slice(-8, -4);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    if (Math.abs(change) < 0.1) return 'stable';
    return 'volatile';
  }

  /**
   * Identify risk factors
   */
  private static identifyRiskFactors(stockItem: any, forecast: any, marketTrends: MarketTrend[]): string[] {
    const risks: string[] = [];
    
    const totalDemand = this.calculateTotalDemand(forecast, '30_days');
    const currentStock = stockItem.quantity;
    
    if (totalDemand > currentStock * 2) {
      risks.push('High demand predicted - stock may be insufficient');
    }
    
    if (currentStock <= stockItem.low_stock_threshold) {
      risks.push('Current stock below minimum threshold');
    }
    
    const relevantTrend = marketTrends.find(trend => trend.category === stockItem.medicine.therapeutic_class);
    if (relevantTrend && relevantTrend.growth_rate > 20) {
      risks.push('Market showing high growth - demand may exceed forecast');
    }
    
    if (stockItem.expiry_date) {
      const expiryDate = new Date(stockItem.expiry_date);
      const daysToExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToExpiry < 90) {
        risks.push('Stock expiring soon - may need to reduce price or return');
      }
    }
    
    return risks;
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(stockItem: any, forecast: any, riskFactors: string[]): any {
    const totalDemand = this.calculateTotalDemand(forecast, '30_days');
    const currentStock = stockItem.quantity;
    const lowStockThreshold = stockItem.low_stock_threshold;
    
    let action: 'increase_stock' | 'maintain_stock' | 'reduce_stock' | 'urgent_restock';
    let suggestedQuantity = 0;
    let reasoning = '';
    
    if (currentStock <= lowStockThreshold) {
      action = 'urgent_restock';
      suggestedQuantity = Math.max(totalDemand * 1.5, lowStockThreshold * 3);
      reasoning = 'Stock below minimum threshold - urgent restocking required';
    } else if (totalDemand > currentStock * 1.5) {
      action = 'increase_stock';
      suggestedQuantity = Math.round(totalDemand * 1.2);
      reasoning = 'High demand predicted - increase stock to meet demand';
    } else if (totalDemand < currentStock * 0.5) {
      action = 'reduce_stock';
      suggestedQuantity = Math.round(totalDemand * 0.8);
      reasoning = 'Low demand predicted - consider reducing stock levels';
    } else {
      action = 'maintain_stock';
      suggestedQuantity = Math.round(totalDemand);
      reasoning = 'Demand stable - maintain current stock levels';
    }
    
    const reorderPoint = Math.round(totalDemand * 0.3);
    const safetyStock = Math.round(totalDemand * 0.2);
    
    return {
      action,
      suggested_quantity: suggestedQuantity,
      reorder_point: reorderPoint,
      safety_stock: safetyStock,
      reasoning,
    };
  }

  /**
   * Calculate accuracy score
   */
  private static calculateAccuracyScore(salesHistory: number[], forecast: any): number {
    if (salesHistory.length < 4) {
      return 50; // Default score for insufficient data
    }
    
    // Use recent data to validate forecast accuracy
    const recentSales = salesHistory.slice(-4);
    const recentAvg = recentSales.reduce((a, b) => a + b, 0) / recentSales.length;
    
    // Calculate forecast accuracy based on historical patterns
    const historicalVariance = this.calculateVariance(salesHistory);
    const forecastVariance = this.calculateVariance(Object.values(forecast));
    
    const accuracy = Math.max(0, 100 - Math.abs(historicalVariance - forecastVariance) * 10);
    return Math.min(100, accuracy);
  }

  /**
   * Calculate variance
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    
    return variance;
  }

  /**
   * Get medicine sales history
   */
  private static getMedicineSalesHistory(salesData: any[], medicineId: string): number[] {
    const medicineSales = salesData
      .filter(sale => sale.items.some((item: any) => item.medicine_id === medicineId))
      .map(sale => {
        const item = sale.items.find((item: any) => item.medicine_id === medicineId);
        return item ? item.quantity : 0;
      });
    
    return medicineSales;
  }

  /**
   * Get historical sales data
   */
  private static async getHistoricalSalesData(pharmacyId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data: sales, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .gte('created_at', startDate.toISOString());
    
    if (error) {
      console.warn('Could not fetch historical sales:', error);
      return [];
    }
    
    return sales || [];
  }

  /**
   * Get market trends (mock implementation)
   */
  private static async getMarketTrends(): Promise<MarketTrend[]> {
    // In real implementation, integrate with market data APIs
    return [
      {
        category: 'Antibiotics',
        trend_direction: 'up',
        growth_rate: 15,
        market_size: 1000000,
        key_drivers: ['Seasonal infections', 'Antibiotic resistance'],
        forecast_confidence: 85,
      },
      {
        category: 'Analgesics',
        trend_direction: 'stable',
        growth_rate: 5,
        market_size: 800000,
        key_drivers: ['Chronic pain management', 'Post-surgical care'],
        forecast_confidence: 90,
      },
      {
        category: 'Cardiovascular',
        trend_direction: 'up',
        growth_rate: 12,
        market_size: 600000,
        key_drivers: ['Aging population', 'Lifestyle diseases'],
        forecast_confidence: 80,
      },
    ];
  }

  /**
   * Helper methods
   */
  private static getWeeksForPeriod(period: '30_days' | '60_days' | '90_days'): string[] {
    const weeks = ['week_1', 'week_2', 'week_3', 'week_4'];
    
    if (period === '60_days') {
      weeks.push('week_5', 'week_6', 'week_7', 'week_8');
    } else if (period === '90_days') {
      weeks.push('week_5', 'week_6', 'week_7', 'week_8', 'week_9', 'week_10', 'week_11', 'week_12');
    }
    
    return weeks;
  }

  private static getDefaultForecast(period: '30_days' | '60_days' | '90_days'): any {
    const weeks = this.getWeeksForPeriod(period);
    const forecast: any = {};
    
    weeks.forEach(week => {
      forecast[week] = 10; // Default low demand
    });
    
    return forecast;
  }

  private static calculateTotalDemand(forecast: any, period: '30_days' | '60_days' | '90_days'): number {
    return Object.values(forecast).reduce((sum: number, value: any) => sum + value, 0);
  }

  private static getUrgencyScore(forecast: DemandForecast): number {
    const urgencyScores = {
      'urgent_restock': 4,
      'increase_stock': 3,
      'maintain_stock': 2,
      'reduce_stock': 1,
    };
    
    return urgencyScores[forecast.recommendations.action] || 0;
  }

  /**
   * Get quick forecast summary for dashboard
   */
  static async getQuickForecastSummary(pharmacyId: string): Promise<{
    total_forecasted_demand: number;
    urgent_restocks: number;
    high_confidence_forecasts: number;
    top_forecasts: Array<{ medicine_name: string; predicted_demand: number; action: string }>;
  }> {
    try {
      const forecasts = await this.generateDemandForecast(pharmacyId, '30_days');
      
      return {
        total_forecasted_demand: forecasts.reduce((sum, f) => sum + f.total_predicted_demand, 0),
        urgent_restocks: forecasts.filter(f => f.recommendations.action === 'urgent_restock').length,
        high_confidence_forecasts: forecasts.filter(f => f.accuracy_score > 80).length,
        top_forecasts: forecasts.slice(0, 5).map(f => ({
          medicine_name: f.medicine_name,
          predicted_demand: f.total_predicted_demand,
          action: f.recommendations.action,
        })),
      };
    } catch (error) {
      console.error('❌ Error getting quick forecast summary:', error);
      return {
        total_forecasted_demand: 0,
        urgent_restocks: 0,
        high_confidence_forecasts: 0,
        top_forecasts: [],
      };
    }
  }
}
