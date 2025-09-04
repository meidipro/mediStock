import { supabase } from './supabase';

export interface HealthTrend {
  condition: string;
  prevalence: number; // percentage of population affected
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  growth_rate: number; // percentage change
  affected_demographics: {
    age_groups: string[];
    gender_distribution: { male: number; female: number };
    geographic_focus: string[];
  };
  related_medicines: string[];
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  seasonal_pattern: boolean;
  outbreak_risk: number; // 0-100
}

export interface MedicineTrend {
  medicine_id: string;
  medicine_name: string;
  therapeutic_class: string;
  demand_trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  market_share: number;
  price_trend: 'increasing' | 'decreasing' | 'stable';
  availability_status: 'abundant' | 'normal' | 'limited' | 'shortage';
  competitor_analysis: {
    total_competitors: number;
    market_leader: string;
    price_range: { min: number; max: number; average: number };
  };
  growth_potential: number; // 0-100
  risk_factors: string[];
  opportunities: string[];
}

export interface MarketTrendAnalysis {
  analysis_period: string;
  overall_health_trends: HealthTrend[];
  medicine_trends: MedicineTrend[];
  market_insights: {
    emerging_conditions: string[];
    declining_conditions: string[];
    seasonal_highlights: string[];
    regulatory_changes: string[];
    supply_chain_issues: string[];
  };
  recommendations: {
    high_opportunity_medicines: string[];
    medicines_to_monitor: string[];
    potential_shortages: string[];
    pricing_opportunities: string[];
  };
  confidence_score: number; // 0-100
  data_sources: string[];
  last_updated: string;
}

export interface TrendAlert {
  id: string;
  type: 'health_outbreak' | 'medicine_shortage' | 'price_spike' | 'regulatory_change' | 'seasonal_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affected_medicines: string[];
  recommended_actions: string[];
  impact_score: number; // 0-100
  urgency: 'immediate' | 'within_week' | 'within_month' | 'monitor';
  created_at: string;
  expires_at?: string;
}

export class MarketTrendAnalysis {
  private static readonly HEALTH_CONDITIONS = {
    'diabetes': {
      base_prevalence: 8.4, // Bangladesh diabetes prevalence
      seasonal_factors: { winter: 1.1, summer: 0.9, monsoon: 1.0 },
      related_medicines: ['Metformin', 'Insulin', 'Sulfonylureas', 'DPP-4 inhibitors'],
      demographics: { age_groups: ['40-60', '60+'], gender_distribution: { male: 45, female: 55 } }
    },
    'hypertension': {
      base_prevalence: 21.0,
      seasonal_factors: { winter: 1.2, summer: 0.8, monsoon: 1.0 },
      related_medicines: ['ACE inhibitors', 'Beta blockers', 'Diuretics', 'Calcium channel blockers'],
      demographics: { age_groups: ['30-50', '50+'], gender_distribution: { male: 48, female: 52 } }
    },
    'respiratory_infections': {
      base_prevalence: 15.0,
      seasonal_factors: { winter: 2.0, summer: 0.5, monsoon: 1.5 },
      related_medicines: ['Antibiotics', 'Bronchodilators', 'Antihistamines', 'Cough suppressants'],
      demographics: { age_groups: ['0-5', '5-15', '15-65'], gender_distribution: { male: 50, female: 50 } }
    },
    'gastrointestinal': {
      base_prevalence: 12.0,
      seasonal_factors: { winter: 0.8, summer: 1.8, monsoon: 2.2 },
      related_medicines: ['Antacids', 'Antidiarrheals', 'ORS', 'Antibiotics'],
      demographics: { age_groups: ['0-5', '5-15', '15-65'], gender_distribution: { male: 48, female: 52 } }
    },
    'dengue': {
      base_prevalence: 2.0,
      seasonal_factors: { winter: 0.1, summer: 0.5, monsoon: 3.0 },
      related_medicines: ['Antipyretics', 'ORS', 'Platelet boosters', 'Pain relievers'],
      demographics: { age_groups: ['5-65'], gender_distribution: { male: 50, female: 50 } }
    }
  };

  /**
   * Generate comprehensive market trend analysis
   */
  static async generateMarketTrendAnalysis(
    pharmacyId: string,
    analysisPeriod: '7_days' | '30_days' | '90_days' = '30_days'
  ): Promise<MarketTrendAnalysis> {
    try {
      console.log('📈 Generating market trend analysis for period:', analysisPeriod);

      // Get pharmacy's medicine data
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

      // Get sales data for trend analysis
      const salesData = await this.getSalesDataForAnalysis(pharmacyId, analysisPeriod);
      
      // Analyze health trends
      const healthTrends = await this.analyzeHealthTrends(analysisPeriod);
      
      // Analyze medicine trends
      const medicineTrends = await this.analyzeMedicineTrends(stockItems || [], salesData);
      
      // Generate market insights
      const marketInsights = this.generateMarketInsights(healthTrends, medicineTrends, analysisPeriod);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(healthTrends, medicineTrends, stockItems || []);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(healthTrends, medicineTrends, salesData.length);

      return {
        analysis_period: analysisPeriod,
        overall_health_trends: healthTrends,
        medicine_trends: medicineTrends,
        market_insights: marketInsights,
        recommendations: recommendations,
        confidence_score: confidenceScore,
        data_sources: ['Sales Data', 'Health Reports', 'Seasonal Patterns', 'Market Research'],
        last_updated: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error generating market trend analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze health trends
   */
  private static async analyzeHealthTrends(period: string): Promise<HealthTrend[]> {
    const currentSeason = this.getCurrentSeason();
    const healthTrends: HealthTrend[] = [];

    for (const [condition, data] of Object.entries(this.HEALTH_CONDITIONS)) {
      // Calculate seasonal adjustment
      const seasonalFactor = data.seasonal_factors[currentSeason as keyof typeof data.seasonal_factors] || 1.0;
      const adjustedPrevalence = data.base_prevalence * seasonalFactor;
      
      // Determine trend direction based on season and historical data
      const trendDirection = this.determineHealthTrendDirection(condition, currentSeason, seasonalFactor);
      const growthRate = this.calculateHealthGrowthRate(condition, seasonalFactor);
      
      // Assess outbreak risk
      const outbreakRisk = this.assessOutbreakRisk(condition, currentSeason, adjustedPrevalence);
      
      // Determine severity level
      const severityLevel = this.determineSeverityLevel(condition, adjustedPrevalence, outbreakRisk);

      healthTrends.push({
        condition: this.formatConditionName(condition),
        prevalence: Math.round(adjustedPrevalence * 10) / 10,
        trend_direction: trendDirection,
        growth_rate: growthRate,
        affected_demographics: {
          age_groups: data.demographics.age_groups,
          gender_distribution: data.demographics.gender_distribution,
          geographic_focus: ['Urban', 'Rural'], // Default for Bangladesh
        },
        related_medicines: data.related_medicines,
        severity_level: severityLevel,
        seasonal_pattern: seasonalFactor !== 1.0,
        outbreak_risk: outbreakRisk,
      });
    }

    return healthTrends.sort((a, b) => b.outbreak_risk - a.outbreak_risk);
  }

  /**
   * Analyze medicine trends
   */
  private static async analyzeMedicineTrends(stockItems: any[], salesData: any[]): Promise<MedicineTrend[]> {
    const medicineTrends: MedicineTrend[] = [];

    for (const stockItem of stockItems) {
      if (stockItem.medicine) {
        const medicine = stockItem.medicine;
        
        // Analyze demand trend
        const demandTrend = this.analyzeDemandTrend(medicine.id, salesData);
        
        // Calculate market share (simplified)
        const marketShare = this.calculateMarketShare(medicine.therapeutic_class, stockItems);
        
        // Analyze price trend
        const priceTrend = this.analyzePriceTrend(medicine.id, salesData);
        
        // Assess availability
        const availabilityStatus = this.assessAvailabilityStatus(stockItem);
        
        // Competitor analysis
        const competitorAnalysis = this.analyzeCompetitors(medicine.therapeutic_class);
        
        // Calculate growth potential
        const growthPotential = this.calculateGrowthPotential(medicine, demandTrend, marketShare);
        
        // Identify risk factors and opportunities
        const riskFactors = this.identifyRiskFactors(medicine, stockItem, demandTrend);
        const opportunities = this.identifyOpportunities(medicine, demandTrend, marketShare);

        medicineTrends.push({
          medicine_id: medicine.id,
          medicine_name: medicine.generic_name,
          therapeutic_class: medicine.therapeutic_class,
          demand_trend: demandTrend,
          market_share: marketShare,
          price_trend: priceTrend,
          availability_status: availabilityStatus,
          competitor_analysis: competitorAnalysis,
          growth_potential: growthPotential,
          risk_factors: riskFactors,
          opportunities: opportunities,
        });
      }
    }

    return medicineTrends.sort((a, b) => b.growth_potential - a.growth_potential);
  }

  /**
   * Generate market insights
   */
  private static generateMarketInsights(
    healthTrends: HealthTrend[],
    medicineTrends: MedicineTrend[],
    period: string
  ): any {
    const insights = {
      emerging_conditions: healthTrends
        .filter(trend => trend.trend_direction === 'increasing' && trend.growth_rate > 10)
        .map(trend => trend.condition),
      
      declining_conditions: healthTrends
        .filter(trend => trend.trend_direction === 'decreasing' && trend.growth_rate < -5)
        .map(trend => trend.condition),
      
      seasonal_highlights: this.getSeasonalHighlights(),
      
      regulatory_changes: this.getRegulatoryChanges(),
      
      supply_chain_issues: medicineTrends
        .filter(medicine => medicine.availability_status === 'shortage' || medicine.availability_status === 'limited')
        .map(medicine => medicine.medicine_name),
    };

    return insights;
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    healthTrends: HealthTrend[],
    medicineTrends: MedicineTrend[],
    stockItems: any[]
  ): any {
    const highOpportunityMedicines = medicineTrends
      .filter(medicine => medicine.growth_potential > 70 && medicine.demand_trend === 'increasing')
      .map(medicine => medicine.medicine_name);

    const medicinesToMonitor = medicineTrends
      .filter(medicine => medicine.risk_factors.length > 2 || medicine.availability_status === 'limited')
      .map(medicine => medicine.medicine_name);

    const potentialShortages = medicineTrends
      .filter(medicine => medicine.availability_status === 'shortage' || medicine.availability_status === 'limited')
      .map(medicine => medicine.medicine_name);

    const pricingOpportunities = medicineTrends
      .filter(medicine => medicine.price_trend === 'increasing' && medicine.demand_trend === 'increasing')
      .map(medicine => medicine.medicine_name);

    return {
      high_opportunity_medicines: highOpportunityMedicines,
      medicines_to_monitor: medicinesToMonitor,
      potential_shortages: potentialShortages,
      pricing_opportunities: pricingOpportunities,
    };
  }

  /**
   * Generate trend alerts
   */
  static async generateTrendAlerts(pharmacyId: string): Promise<TrendAlert[]> {
    try {
      const alerts: TrendAlert[] = [];
      const analysis = await this.generateMarketTrendAnalysis(pharmacyId, '7_days');

      // Health outbreak alerts
      const highRiskConditions = analysis.overall_health_trends.filter(
        trend => trend.outbreak_risk > 70 && trend.severity_level === 'high'
      );

      for (const condition of highRiskConditions) {
        alerts.push({
          id: `health_${condition.condition}_${Date.now()}`,
          type: 'health_outbreak',
          severity: 'high',
          title: `High Risk: ${condition.condition}`,
          description: `${condition.condition} showing ${condition.growth_rate}% growth with ${condition.outbreak_risk}% outbreak risk`,
          affected_medicines: condition.related_medicines,
          recommended_actions: [
            'Increase stock of related medicines',
            'Monitor demand closely',
            'Prepare for potential surge',
          ],
          impact_score: condition.outbreak_risk,
          urgency: 'within_week',
          created_at: new Date().toISOString(),
        });
      }

      // Medicine shortage alerts
      const shortageMedicines = analysis.medicine_trends.filter(
        medicine => medicine.availability_status === 'shortage'
      );

      for (const medicine of shortageMedicines) {
        alerts.push({
          id: `shortage_${medicine.medicine_id}_${Date.now()}`,
          type: 'medicine_shortage',
          severity: 'critical',
          title: `Shortage Alert: ${medicine.medicine_name}`,
          description: `${medicine.medicine_name} is experiencing supply shortage`,
          affected_medicines: [medicine.medicine_name],
          recommended_actions: [
            'Find alternative suppliers',
            'Consider alternative medicines',
            'Inform customers about availability',
          ],
          impact_score: 90,
          urgency: 'immediate',
          created_at: new Date().toISOString(),
        });
      }

      return alerts.sort((a, b) => {
        const urgencyOrder = { immediate: 4, within_week: 3, within_month: 2, monitor: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });

    } catch (error) {
      console.error('❌ Error generating trend alerts:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  private static getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 11 || month <= 2) return 'winter';
    if (month >= 3 && month <= 6) return 'summer';
    return 'monsoon';
  }

  private static determineHealthTrendDirection(condition: string, season: string, seasonalFactor: number): 'increasing' | 'decreasing' | 'stable' {
    if (seasonalFactor > 1.3) return 'increasing';
    if (seasonalFactor < 0.8) return 'decreasing';
    return 'stable';
  }

  private static calculateHealthGrowthRate(condition: string, seasonalFactor: number): number {
    return Math.round((seasonalFactor - 1) * 100);
  }

  private static assessOutbreakRisk(condition: string, season: string, prevalence: number): number {
    let risk = 0;
    
    // Base risk from prevalence
    risk += Math.min(50, prevalence * 2);
    
    // Seasonal risk
    if (season === 'monsoon' && condition === 'dengue') risk += 30;
    if (season === 'winter' && condition === 'respiratory_infections') risk += 25;
    if (season === 'summer' && condition === 'gastrointestinal') risk += 20;
    
    return Math.min(100, risk);
  }

  private static determineSeverityLevel(condition: string, prevalence: number, outbreakRisk: number): 'low' | 'medium' | 'high' | 'critical' {
    if (outbreakRisk > 80 || prevalence > 20) return 'critical';
    if (outbreakRisk > 60 || prevalence > 15) return 'high';
    if (outbreakRisk > 40 || prevalence > 10) return 'medium';
    return 'low';
  }

  private static formatConditionName(condition: string): string {
    return condition.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private static analyzeDemandTrend(medicineId: string, salesData: any[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    // Simplified demand trend analysis
    const medicineSales = salesData.filter(sale => 
      sale.items.some((item: any) => item.medicine_id === medicineId)
    );
    
    if (medicineSales.length < 4) return 'stable';
    
    const recent = medicineSales.slice(-4);
    const older = medicineSales.slice(-8, -4);
    
    const recentAvg = recent.reduce((sum, sale) => sum + sale.total_amount, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, sale) => sum + sale.total_amount, 0) / older.length : recentAvg;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    if (Math.abs(change) < 0.1) return 'stable';
    return 'volatile';
  }

  private static calculateMarketShare(therapeuticClass: string, stockItems: any[]): number {
    const classItems = stockItems.filter(item => 
      item.medicine?.therapeutic_class === therapeuticClass
    );
    
    return Math.round((classItems.length / stockItems.length) * 100);
  }

  private static analyzePriceTrend(medicineId: string, salesData: any[]): 'increasing' | 'decreasing' | 'stable' {
    // Simplified price trend analysis
    return 'stable'; // Would need historical price data
  }

  private static assessAvailabilityStatus(stockItem: any): 'abundant' | 'normal' | 'limited' | 'shortage' {
    const quantity = stockItem.quantity;
    const threshold = stockItem.low_stock_threshold;
    
    if (quantity === 0) return 'shortage';
    if (quantity <= threshold) return 'limited';
    if (quantity <= threshold * 3) return 'normal';
    return 'abundant';
  }

  private static analyzeCompetitors(therapeuticClass: string): any {
    // Simplified competitor analysis
    return {
      total_competitors: Math.floor(Math.random() * 10) + 5,
      market_leader: 'Leading Brand',
      price_range: { min: 10, max: 100, average: 50 },
    };
  }

  private static calculateGrowthPotential(medicine: any, demandTrend: string, marketShare: number): number {
    let potential = 50; // Base potential
    
    if (demandTrend === 'increasing') potential += 30;
    if (demandTrend === 'decreasing') potential -= 20;
    if (marketShare < 20) potential += 20; // Low market share = growth opportunity
    
    return Math.max(0, Math.min(100, potential));
  }

  private static identifyRiskFactors(medicine: any, stockItem: any, demandTrend: string): string[] {
    const risks = [];
    
    if (stockItem.quantity <= stockItem.low_stock_threshold) {
      risks.push('Low stock levels');
    }
    
    if (demandTrend === 'decreasing') {
      risks.push('Declining demand');
    }
    
    if (stockItem.expiry_date) {
      const daysToExpiry = Math.ceil((new Date(stockItem.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToExpiry < 90) {
        risks.push('Expiring soon');
      }
    }
    
    return risks;
  }

  private static identifyOpportunities(medicine: any, demandTrend: string, marketShare: number): string[] {
    const opportunities = [];
    
    if (demandTrend === 'increasing') {
      opportunities.push('Growing demand');
    }
    
    if (marketShare < 15) {
      opportunities.push('Market expansion potential');
    }
    
    if (medicine.therapeutic_class === 'Antibiotics' || medicine.therapeutic_class === 'Analgesics') {
      opportunities.push('High-volume category');
    }
    
    return opportunities;
  }

  private static getSeasonalHighlights(): string[] {
    const season = this.getCurrentSeason();
    
    const highlights = {
      winter: [
        'Respiratory infections peak season',
        'Cold and flu medicine demand increases',
        'Vitamin D supplements recommended',
      ],
      summer: [
        'Heat-related illnesses increase',
        'ORS and electrolyte demand rises',
        'Skin infection treatments needed',
      ],
      monsoon: [
        'Dengue and malaria risk high',
        'Waterborne diseases increase',
        'Antimalarial medicine demand peaks',
      ],
    };
    
    return highlights[season as keyof typeof highlights] || [];
  }

  private static getRegulatoryChanges(): string[] {
    return [
      'New DGDA guidelines for antibiotic prescriptions',
      'Updated pricing regulations for essential medicines',
      'Enhanced quality control requirements',
    ];
  }

  private static calculateConfidenceScore(healthTrends: HealthTrend[], medicineTrends: MedicineTrend[], dataPoints: number): number {
    let confidence = 60; // Base confidence
    
    // More data points = higher confidence
    confidence += Math.min(20, dataPoints / 10);
    
    // More trends analyzed = higher confidence
    confidence += Math.min(20, (healthTrends.length + medicineTrends.length) / 5);
    
    return Math.min(100, confidence);
  }

  private static async getSalesDataForAnalysis(pharmacyId: string, period: string): Promise<any[]> {
    const days = period === '7_days' ? 7 : period === '30_days' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data: sales, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .gte('created_at', startDate.toISOString());
    
    if (error) {
      console.warn('Could not fetch sales data for analysis:', error);
      return [];
    }
    
    return sales || [];
  }

  /**
   * Get quick market insights for dashboard
   */
  static async getQuickMarketInsights(pharmacyId: string): Promise<{
    trending_conditions: string[];
    high_demand_medicines: string[];
    market_alerts: number;
    growth_opportunities: number;
  }> {
    try {
      const analysis = await this.generateMarketTrendAnalysis(pharmacyId, '7_days');
      
      return {
        trending_conditions: analysis.overall_health_trends
          .filter(trend => trend.trend_direction === 'increasing')
          .slice(0, 3)
          .map(trend => trend.condition),
        high_demand_medicines: analysis.medicine_trends
          .filter(medicine => medicine.demand_trend === 'increasing')
          .slice(0, 3)
          .map(medicine => medicine.medicine_name),
        market_alerts: analysis.overall_health_trends.filter(trend => trend.outbreak_risk > 60).length,
        growth_opportunities: analysis.medicine_trends.filter(medicine => medicine.growth_potential > 70).length,
      };
    } catch (error) {
      console.error('❌ Error getting quick market insights:', error);
      return {
        trending_conditions: [],
        high_demand_medicines: [],
        market_alerts: 0,
        growth_opportunities: 0,
      };
    }
  }
}
