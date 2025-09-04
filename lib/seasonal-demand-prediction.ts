import { supabase } from './supabase';

export interface SeasonalTrend {
  medicine_id: string;
  medicine_name: string;
  therapeutic_class: string;
  seasonal_factor: number; // Multiplier for demand (1.0 = normal, 1.5 = 50% increase)
  peak_seasons: string[];
  demand_pattern: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
  confidence_score: number; // 0-100
  predicted_demand: number;
  current_stock: number;
  recommendation: 'increase_stock' | 'maintain_stock' | 'reduce_stock';
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface WeatherImpact {
  temperature_impact: number;
  humidity_impact: number;
  rainfall_impact: number;
  seasonal_diseases: string[];
  affected_medicines: string[];
}

export interface SeasonalPrediction {
  period: string; // 'next_30_days' | 'next_90_days' | 'next_season'
  predictions: SeasonalTrend[];
  weather_impact: WeatherImpact;
  overall_confidence: number;
  recommendations: {
    high_priority: SeasonalTrend[];
    medium_priority: SeasonalTrend[];
    low_priority: SeasonalTrend[];
  };
  market_insights: string[];
}

export class SeasonalDemandPrediction {
  private static readonly SEASONAL_PATTERNS = {
    // Bangladesh seasonal patterns
    'winter': {
      months: [11, 12, 1, 2],
      diseases: ['cold', 'flu', 'pneumonia', 'asthma', 'arthritis'],
      medicine_multipliers: {
        'Antibiotics': 1.3,
        'Antihistamines': 1.4,
        'Analgesics': 1.2,
        'Respiratory': 1.5,
        'Vitamins': 1.1,
      }
    },
    'summer': {
      months: [3, 4, 5, 6],
      diseases: ['heat_stroke', 'dehydration', 'skin_infections', 'diarrhea'],
      medicine_multipliers: {
        'ORS': 1.8,
        'Antidiarrheals': 1.6,
        'Antibiotics': 1.2,
        'Sunscreen': 2.0,
        'Electrolytes': 1.7,
      }
    },
    'monsoon': {
      months: [7, 8, 9, 10],
      diseases: ['dengue', 'malaria', 'typhoid', 'waterborne_diseases'],
      medicine_multipliers: {
        'Antimalarials': 1.9,
        'Antibiotics': 1.4,
        'Antipyretics': 1.3,
        'ORS': 1.5,
        'Antihistamines': 1.2,
      }
    }
  };

  /**
   * Predict seasonal demand for medicines
   */
  static async predictSeasonalDemand(
    pharmacyId: string,
    period: 'next_30_days' | 'next_90_days' | 'next_season' = 'next_30_days'
  ): Promise<SeasonalPrediction> {
    try {
      console.log('🌡️ Predicting seasonal demand for period:', period);

      // Get current season and weather data
      const currentSeason = this.getCurrentSeason();
      const weatherImpact = await this.getWeatherImpact();
      
      // Get pharmacy's current stock
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

      // Get historical sales data for pattern analysis
      const salesData = await this.getHistoricalSalesData(pharmacyId, period);

      // Generate predictions for each medicine
      const predictions: SeasonalTrend[] = [];
      
      for (const stockItem of stockItems || []) {
        if (stockItem.medicine) {
          const prediction = await this.predictMedicineDemand(
            stockItem,
            currentSeason,
            weatherImpact,
            salesData,
            period
          );
          predictions.push(prediction);
        }
      }

      // Categorize predictions by priority
      const recommendations = this.categorizeRecommendations(predictions);
      
      // Generate market insights
      const marketInsights = this.generateMarketInsights(predictions, currentSeason, weatherImpact);

      return {
        period,
        predictions: predictions.sort((a, b) => b.urgency_level.localeCompare(a.urgency_level)),
        weather_impact: weatherImpact,
        overall_confidence: this.calculateOverallConfidence(predictions),
        recommendations,
        market_insights: marketInsights,
      };

    } catch (error) {
      console.error('❌ Error predicting seasonal demand:', error);
      throw error;
    }
  }

  /**
   * Predict demand for a specific medicine
   */
  private static async predictMedicineDemand(
    stockItem: any,
    currentSeason: string,
    weatherImpact: WeatherImpact,
    salesData: any[],
    period: string
  ): Promise<SeasonalTrend> {
    const medicine = stockItem.medicine;
    const therapeuticClass = medicine.therapeutic_class;
    
    // Base seasonal factor
    const seasonalPattern = this.SEASONAL_PATTERNS[currentSeason as keyof typeof this.SEASONAL_PATTERNS];
    const baseMultiplier = seasonalPattern.medicine_multipliers[therapeuticClass as keyof typeof seasonalPattern.medicine_multipliers] || 1.0;
    
    // Weather impact adjustment
    let weatherMultiplier = 1.0;
    if (this.isWeatherSensitive(medicine)) {
      weatherMultiplier = this.calculateWeatherMultiplier(weatherImpact, medicine);
    }
    
    // Historical pattern analysis
    const historicalMultiplier = this.analyzeHistoricalPattern(salesData, medicine.id);
    
    // Calculate final seasonal factor
    const seasonalFactor = baseMultiplier * weatherMultiplier * historicalMultiplier;
    
    // Predict demand
    const currentStock = stockItem.quantity;
    const predictedDemand = Math.round(currentStock * seasonalFactor);
    
    // Determine recommendation
    const recommendation = this.getStockRecommendation(currentStock, predictedDemand, stockItem.low_stock_threshold);
    
    // Calculate urgency level
    const urgencyLevel = this.calculateUrgencyLevel(currentStock, predictedDemand, stockItem.low_stock_threshold);
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(seasonalFactor, historicalMultiplier, salesData.length);
    
    // Determine demand pattern
    const demandPattern = this.determineDemandPattern(seasonalFactor, historicalMultiplier);

    return {
      medicine_id: medicine.id,
      medicine_name: medicine.generic_name,
      therapeutic_class: therapeuticClass,
      seasonal_factor: seasonalFactor,
      peak_seasons: this.getPeakSeasons(medicine),
      demand_pattern: demandPattern,
      confidence_score: confidenceScore,
      predicted_demand: predictedDemand,
      current_stock: currentStock,
      recommendation,
      urgency_level: urgencyLevel,
    };
  }

  /**
   * Get current season based on month
   */
  private static getCurrentSeason(): string {
    const month = new Date().getMonth() + 1; // 1-12
    
    for (const [season, data] of Object.entries(this.SEASONAL_PATTERNS)) {
      if (data.months.includes(month)) {
        return season;
      }
    }
    
    return 'winter'; // Default fallback
  }

  /**
   * Get weather impact data (mock implementation - integrate with weather API)
   */
  private static async getWeatherImpact(): Promise<WeatherImpact> {
    // In real implementation, integrate with weather API
    // For now, return mock data based on current season
    const season = this.getCurrentSeason();
    
    const weatherData = {
      'winter': {
        temperature_impact: -0.2, // Cold weather increases certain medicine demand
        humidity_impact: 0.1,
        rainfall_impact: 0.0,
        seasonal_diseases: ['cold', 'flu', 'pneumonia'],
        affected_medicines: ['Antibiotics', 'Antihistamines', 'Respiratory'],
      },
      'summer': {
        temperature_impact: 0.3, // Hot weather increases heat-related medicine demand
        humidity_impact: 0.2,
        rainfall_impact: -0.1,
        seasonal_diseases: ['heat_stroke', 'dehydration', 'skin_infections'],
        affected_medicines: ['ORS', 'Electrolytes', 'Antidiarrheals'],
      },
      'monsoon': {
        temperature_impact: 0.1,
        humidity_impact: 0.4, // High humidity increases waterborne diseases
        rainfall_impact: 0.5, // Heavy rainfall increases vector-borne diseases
        seasonal_diseases: ['dengue', 'malaria', 'typhoid'],
        affected_medicines: ['Antimalarials', 'Antibiotics', 'Antipyretics'],
      }
    };

    return weatherData[season as keyof typeof weatherData] || weatherData.winter;
  }

  /**
   * Check if medicine is weather sensitive
   */
  private static isWeatherSensitive(medicine: any): boolean {
    const weatherSensitiveClasses = [
      'Respiratory', 'Antihistamines', 'ORS', 'Electrolytes',
      'Antimalarials', 'Antipyretics', 'Antidiarrheals'
    ];
    
    return weatherSensitiveClasses.includes(medicine.therapeutic_class);
  }

  /**
   * Calculate weather multiplier for medicine
   */
  private static calculateWeatherMultiplier(weatherImpact: WeatherImpact, medicine: any): number {
    let multiplier = 1.0;
    
    if (medicine.therapeutic_class === 'Respiratory' || medicine.therapeutic_class === 'Antihistamines') {
      multiplier += weatherImpact.temperature_impact * 0.5;
      multiplier += weatherImpact.humidity_impact * 0.3;
    } else if (medicine.therapeutic_class === 'ORS' || medicine.therapeutic_class === 'Electrolytes') {
      multiplier += weatherImpact.temperature_impact * 0.8;
    } else if (medicine.therapeutic_class === 'Antimalarials') {
      multiplier += weatherImpact.rainfall_impact * 0.6;
      multiplier += weatherImpact.humidity_impact * 0.4;
    }
    
    return Math.max(0.5, Math.min(2.0, multiplier)); // Clamp between 0.5 and 2.0
  }

  /**
   * Analyze historical sales pattern
   */
  private static analyzeHistoricalPattern(salesData: any[], medicineId: string): number {
    // Find sales for this medicine
    const medicineSales = salesData.filter(sale => 
      sale.items.some((item: any) => item.medicine_id === medicineId)
    );
    
    if (medicineSales.length === 0) {
      return 1.0; // No historical data, use base prediction
    }
    
    // Calculate average monthly sales
    const monthlySales = this.groupSalesByMonth(medicineSales);
    const currentMonth = new Date().getMonth();
    const currentMonthSales = monthlySales[currentMonth] || 0;
    const averageSales = Object.values(monthlySales).reduce((sum: number, sales: any) => sum + sales, 0) / 12;
    
    if (averageSales === 0) return 1.0;
    
    return currentMonthSales / averageSales;
  }

  /**
   * Group sales by month
   */
  private static groupSalesByMonth(sales: any[]): { [month: number]: number } {
    const monthlySales: { [month: number]: number } = {};
    
    sales.forEach(sale => {
      const month = new Date(sale.created_at).getMonth();
      monthlySales[month] = (monthlySales[month] || 0) + sale.total_amount;
    });
    
    return monthlySales;
  }

  /**
   * Get historical sales data
   */
  private static async getHistoricalSalesData(pharmacyId: string, period: string): Promise<any[]> {
    const daysBack = period === 'next_30_days' ? 90 : period === 'next_90_days' ? 180 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
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
   * Get stock recommendation
   */
  private static getStockRecommendation(currentStock: number, predictedDemand: number, lowStockThreshold: number): 'increase_stock' | 'maintain_stock' | 'reduce_stock' {
    if (predictedDemand > currentStock * 1.5) {
      return 'increase_stock';
    } else if (predictedDemand < currentStock * 0.7) {
      return 'reduce_stock';
    } else {
      return 'maintain_stock';
    }
  }

  /**
   * Calculate urgency level
   */
  private static calculateUrgencyLevel(currentStock: number, predictedDemand: number, lowStockThreshold: number): 'low' | 'medium' | 'high' | 'critical' {
    if (currentStock <= lowStockThreshold && predictedDemand > currentStock) {
      return 'critical';
    } else if (currentStock <= lowStockThreshold * 2 && predictedDemand > currentStock * 1.2) {
      return 'high';
    } else if (predictedDemand > currentStock * 1.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidenceScore(seasonalFactor: number, historicalMultiplier: number, dataPoints: number): number {
    let confidence = 50; // Base confidence
    
    // More historical data = higher confidence
    confidence += Math.min(30, dataPoints * 2);
    
    // Moderate seasonal factors = higher confidence
    if (seasonalFactor >= 0.8 && seasonalFactor <= 1.5) {
      confidence += 20;
    }
    
    return Math.min(100, confidence);
  }

  /**
   * Determine demand pattern
   */
  private static determineDemandPattern(seasonalFactor: number, historicalMultiplier: number): 'increasing' | 'decreasing' | 'stable' | 'cyclical' {
    if (seasonalFactor > 1.3) {
      return 'increasing';
    } else if (seasonalFactor < 0.8) {
      return 'decreasing';
    } else if (Math.abs(historicalMultiplier - 1.0) > 0.3) {
      return 'cyclical';
    } else {
      return 'stable';
    }
  }

  /**
   * Get peak seasons for medicine
   */
  private static getPeakSeasons(medicine: any): string[] {
    const peakSeasons = [];
    
    for (const [season, data] of Object.entries(this.SEASONAL_PATTERNS)) {
      if (data.medicine_multipliers[medicine.therapeutic_class as keyof typeof data.medicine_multipliers] > 1.2) {
        peakSeasons.push(season);
      }
    }
    
    return peakSeasons;
  }

  /**
   * Categorize recommendations by priority
   */
  private static categorizeRecommendations(predictions: SeasonalTrend[]) {
    return {
      high_priority: predictions.filter(p => p.urgency_level === 'critical' || p.urgency_level === 'high'),
      medium_priority: predictions.filter(p => p.urgency_level === 'medium'),
      low_priority: predictions.filter(p => p.urgency_level === 'low'),
    };
  }

  /**
   * Calculate overall confidence
   */
  private static calculateOverallConfidence(predictions: SeasonalTrend[]): number {
    if (predictions.length === 0) return 0;
    
    const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence_score, 0);
    return Math.round(totalConfidence / predictions.length);
  }

  /**
   * Generate market insights
   */
  private static generateMarketInsights(predictions: SeasonalTrend[], season: string, weatherImpact: WeatherImpact): string[] {
    const insights = [];
    
    const highDemandMedicines = predictions.filter(p => p.seasonal_factor > 1.3);
    const lowStockMedicines = predictions.filter(p => p.urgency_level === 'critical' || p.urgency_level === 'high');
    
    if (highDemandMedicines.length > 0) {
      insights.push(`Expected high demand for ${highDemandMedicines.length} medicines in ${season} season`);
    }
    
    if (lowStockMedicines.length > 0) {
      insights.push(`Critical: ${lowStockMedicines.length} medicines need immediate restocking`);
    }
    
    if (weatherImpact.seasonal_diseases.length > 0) {
      insights.push(`Weather conditions favor: ${weatherImpact.seasonal_diseases.join(', ')}`);
    }
    
    const avgConfidence = this.calculateOverallConfidence(predictions);
    insights.push(`Prediction confidence: ${avgConfidence}% based on historical data and seasonal patterns`);
    
    return insights;
  }

  /**
   * Get quick seasonal insights for dashboard
   */
  static async getQuickSeasonalInsights(pharmacyId: string): Promise<{
    critical_alerts: number;
    high_demand_medicines: number;
    seasonal_factor: number;
    top_recommendations: string[];
  }> {
    try {
      const prediction = await this.predictSeasonalDemand(pharmacyId, 'next_30_days');
      
      return {
        critical_alerts: prediction.recommendations.high_priority.length,
        high_demand_medicines: prediction.predictions.filter(p => p.seasonal_factor > 1.3).length,
        seasonal_factor: prediction.predictions.reduce((sum, p) => sum + p.seasonal_factor, 0) / prediction.predictions.length,
        top_recommendations: prediction.recommendations.high_priority.slice(0, 3).map(p => p.medicine_name),
      };
    } catch (error) {
      console.error('❌ Error getting quick seasonal insights:', error);
      return {
        critical_alerts: 0,
        high_demand_medicines: 0,
        seasonal_factor: 1.0,
        top_recommendations: [],
      };
    }
  }
}
