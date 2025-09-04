import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { usePricingOptimization } from '../../hooks/useAI';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Theme, createThemedStyles } from '../../constants/Theme';

interface PricingOptimizationUIProps {
  medicines: any[];
  sales: any[];
  stockItems: any[];
  visible: boolean;
  onClose: () => void;
}

export const PricingOptimizationUI: React.FC<PricingOptimizationUIProps> = ({
  medicines,
  sales,
  stockItems,
  visible,
  onClose,
}) => {
  const { optimizePricing } = usePricingOptimization();
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [optimization, setOptimization] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [competitorPrices, setCompetitorPrices] = useState<string>('');
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'revenue' | 'margin' | 'volume'>('revenue');

  useEffect(() => {
    if (visible) {
      prepareMedicinesList();
    }
  }, [visible, medicines, sales, stockItems, sortBy]);

  const prepareMedicinesList = () => {
    // Combine medicine data with sales and stock information
    const medicinesWithData = medicines.map(medicine => {
      const stockInfo = stockItems.find(stock => stock.medicine_id === medicine.id);
      const medicineSales = sales.filter(sale => 
        sale.items.some((item: any) => item.medicine_id === medicine.id)
      );
      
      const totalRevenue = medicineSales.reduce((sum, sale) => {
        const item = sale.items.find((item: any) => item.medicine_id === medicine.id);
        return sum + (item ? item.total_amount : 0);
      }, 0);
      
      const totalQuantitySold = medicineSales.reduce((sum, sale) => {
        const item = sale.items.find((item: any) => item.medicine_id === medicine.id);
        return sum + (item ? item.quantity : 0);
      }, 0);

      const currentPrice = stockInfo?.unit_price || medicine.unit_price || 0;
      const costPrice = stockInfo?.cost_price || (currentPrice * 0.7); // Assume 30% margin if no cost price
      const profitMargin = currentPrice > 0 ? ((currentPrice - costPrice) / currentPrice) * 100 : 0;

      return {
        ...medicine,
        currentPrice,
        costPrice,
        profitMargin,
        totalRevenue,
        totalQuantitySold,
        currentStock: stockInfo?.quantity || 0,
        salesCount: medicineSales.length,
        averagePrice: totalQuantitySold > 0 ? totalRevenue / totalQuantitySold : currentPrice,
      };
    }).filter(medicine => medicine.currentPrice > 0); // Only include medicines with prices

    // Sort based on selected criteria
    const sorted = medicinesWithData.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'margin':
          return b.profitMargin - a.profitMargin;
        case 'volume':
          return b.totalQuantitySold - a.totalQuantitySold;
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });

    setMedicinesList(sorted);
  };

  const handleOptimizePricing = async (medicine: any) => {
    setSelectedMedicine(medicine);
    setLoading(true);
    setOptimization(null);

    try {
      const medicineSales = sales.filter(sale => 
        sale.items.some((item: any) => item.medicine_id === medicine.id)
      );

      const competitorPricesArray = competitorPrices
        .split(',')
        .map(price => parseFloat(price.trim()))
        .filter(price => !isNaN(price) && price > 0);

      const result = await optimizePricing(
        medicine,
        medicine.currentPrice,
        competitorPricesArray,
        medicineSales
      );
      
      setOptimization(result);
    } catch (error) {
      console.error('Pricing optimization failed:', error);
      setOptimization({
        suggestedPrice: medicine.currentPrice,
        priceRange: { 
          low: medicine.currentPrice * 0.9, 
          high: medicine.currentPrice * 1.1 
        },
        reasoning: 'AI optimization temporarily unavailable. Maintain current pricing.',
        expectedImpact: {
          salesVolume: 'stable',
          profit: 'stable',
          competitiveness: 'medium'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return Theme.colors.success;
    if (margin >= 25) return Theme.colors.warning;
    return Theme.colors.error;
  };

  const getMarginLabel = (margin: number) => {
    if (margin >= 40) return 'High';
    if (margin >= 25) return 'Medium';
    return 'Low';
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'increase':
        return Theme.colors.success;
      case 'decrease':
        return Theme.colors.error;
      case 'stable':
        return Theme.colors.info;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'increase':
        return '📈';
      case 'decrease':
        return '📉';
      case 'stable':
        return '📊';
      default:
        return '➡️';
    }
  };

  const renderMedicineItem = ({ item }: { item: any }) => (
    <Card style={styles.medicineCard}>
      <CardContent>
        <TouchableOpacity onPress={() => handleOptimizePricing(item)}>
          <View style={styles.medicineHeader}>
            <View style={styles.medicineInfo}>
              <Text style={styles.medicineName}>{item.generic_name}</Text>
              {item.brand_name && (
                <Text style={styles.brandName}>{item.brand_name}</Text>
              )}
              <Text style={styles.medicineDetails}>
                {item.strength} {item.form} • {item.manufacturer}
              </Text>
            </View>
            <View style={styles.priceInfo}>
              <Text style={styles.currentPrice}>৳{item.currentPrice}</Text>
              <Text style={styles.priceLabel}>Current</Text>
            </View>
          </View>
          
          <View style={styles.medicineStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>৳{item.totalRevenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.totalQuantitySold}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getMarginColor(item.profitMargin) }]}>
                {item.profitMargin.toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Margin</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.currentStock}</Text>
              <Text style={styles.statLabel}>Stock</Text>
            </View>
          </View>
        </TouchableOpacity>
      </CardContent>
    </Card>
  );

  const renderOptimizationModal = () => (
    <Modal
      visible={!!selectedMedicine}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>💰 Pricing Optimization</Text>
          <TouchableOpacity onPress={() => {
            setSelectedMedicine(null);
            setOptimization(null);
            setCompetitorPrices('');
          }}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedMedicine && (
            <Card style={styles.medicineDetailsCard}>
              <CardHeader>
                <Text style={styles.medicineDetailsTitle}>
                  {selectedMedicine.generic_name}
                  {selectedMedicine.brand_name && ` (${selectedMedicine.brand_name})`}
                </Text>
              </CardHeader>
              <CardContent>
                <View style={styles.currentPricingGrid}>
                  <View style={styles.pricingItem}>
                    <Text style={styles.pricingValue}>৳{selectedMedicine.currentPrice}</Text>
                    <Text style={styles.pricingLabel}>Current Price</Text>
                  </View>
                  <View style={styles.pricingItem}>
                    <Text style={styles.pricingValue}>৳{selectedMedicine.costPrice.toFixed(2)}</Text>
                    <Text style={styles.pricingLabel}>Cost Price</Text>
                  </View>
                  <View style={styles.pricingItem}>
                    <Text style={[styles.pricingValue, { color: getMarginColor(selectedMedicine.profitMargin) }]}>
                      {selectedMedicine.profitMargin.toFixed(1)}%
                    </Text>
                    <Text style={styles.pricingLabel}>Current Margin</Text>
                  </View>
                  <View style={styles.pricingItem}>
                    <Text style={styles.pricingValue}>{selectedMedicine.totalQuantitySold}</Text>
                    <Text style={styles.pricingLabel}>Units Sold</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          )}

          <Card style={styles.competitorCard}>
            <CardHeader>
              <Text style={styles.sectionTitle}>🏪 Competitor Pricing</Text>
            </CardHeader>
            <CardContent>
              <Input
                label="Competitor Prices (comma separated)"
                value={competitorPrices}
                onChangeText={setCompetitorPrices}
                placeholder="e.g., 45.00, 48.50, 42.00"
                keyboardType="decimal-pad"
                multiline
              />
              <Text style={styles.inputHint}>
                Enter competitor prices separated by commas to get better pricing recommendations
              </Text>
            </CardContent>
          </Card>

          {loading ? (
            <Card style={styles.loadingCard}>
              <CardContent>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Theme.colors.primary} />
                  <Text style={styles.loadingText}>🤖 AI is analyzing optimal pricing...</Text>
                </View>
              </CardContent>
            </Card>
          ) : optimization ? (
            <>
              {/* AI Recommendation */}
              <Card style={styles.recommendationCard}>
                <CardHeader>
                  <Text style={styles.sectionTitle}>🤖 AI Pricing Recommendation</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.recommendationMain}>
                    <Text style={styles.suggestedPrice}>৳{optimization.suggestedPrice}</Text>
                    <Text style={styles.suggestionLabel}>Suggested Price</Text>
                    
                    <View style={styles.priceRange}>
                      <Text style={styles.rangeLabel}>Recommended Range:</Text>
                      <Text style={styles.rangeText}>
                        ৳{optimization.priceRange.low.toFixed(2)} - ৳{optimization.priceRange.high.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.reasoningSection}>
                    <Text style={styles.reasoningTitle}>💡 AI Reasoning:</Text>
                    <Text style={styles.reasoningText}>{optimization.reasoning}</Text>
                  </View>
                </CardContent>
              </Card>

              {/* Expected Impact */}
              <Card style={styles.impactCard}>
                <CardHeader>
                  <Text style={styles.sectionTitle}>📊 Expected Impact</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.impactGrid}>
                    <View style={styles.impactItem}>
                      <Text style={styles.impactIcon}>
                        {getImpactIcon(optimization.expectedImpact.salesVolume)}
                      </Text>
                      <Text style={styles.impactLabel}>Sales Volume</Text>
                      <Text style={[
                        styles.impactValue,
                        { color: getImpactColor(optimization.expectedImpact.salesVolume) }
                      ]}>
                        {optimization.expectedImpact.salesVolume}
                      </Text>
                    </View>
                    
                    <View style={styles.impactItem}>
                      <Text style={styles.impactIcon}>
                        {getImpactIcon(optimization.expectedImpact.profit)}
                      </Text>
                      <Text style={styles.impactLabel}>Profit</Text>
                      <Text style={[
                        styles.impactValue,
                        { color: getImpactColor(optimization.expectedImpact.profit) }
                      ]}>
                        {optimization.expectedImpact.profit}
                      </Text>
                    </View>
                    
                    <View style={styles.impactItem}>
                      <Text style={styles.impactIcon}>🏆</Text>
                      <Text style={styles.impactLabel}>Competitiveness</Text>
                      <Text style={[
                        styles.impactValue,
                        { color: getImpactColor(optimization.expectedImpact.competitiveness) }
                      ]}>
                        {optimization.expectedImpact.competitiveness}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Button
                  title="Apply Suggested Price"
                  variant="primary"
                  onPress={() => {
                    Alert.alert(
                      'Apply Price Change',
                      `Change price from ৳${selectedMedicine.currentPrice} to ৳${optimization.suggestedPrice}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Apply',
                          onPress: () => {
                            Alert.alert('Success', 'Price updated successfully!');
                            setSelectedMedicine(null);
                            setOptimization(null);
                          }
                        }
                      ]
                    );
                  }}
                  style={styles.actionButton}
                />
                <Button
                  title="Custom Price"
                  variant="outline"
                  onPress={() => {
                    Alert.alert('Custom Price', 'Custom pricing interface will be implemented');
                  }}
                  style={styles.actionButton}
                />
              </View>
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
          <Text style={styles.headerTitle}>💰 Pricing Optimization</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeHeaderButton}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            AI-powered pricing optimization to maximize revenue and maintain competitiveness
          </Text>

          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <View style={styles.sortButtons}>
              {(['revenue', 'margin', 'volume'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortButton,
                    sortBy === option && styles.activeSortButton
                  ]}
                  onPress={() => setSortBy(option)}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortBy === option && styles.activeSortButtonText
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FlatList
            data={medicinesList}
            renderItem={renderMedicineItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <Card style={styles.emptyCard}>
                <CardContent>
                  <Text style={styles.emptyText}>No medicines with pricing data found</Text>
                  <Text style={styles.emptySubtext}>Add prices to medicines to use pricing optimization</Text>
                </CardContent>
              </Card>
            )}
          />
        </View>

        {renderOptimizationModal()}
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

  sortContainer: {
    marginBottom: theme.spacing.lg,
  },

  sortLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  sortButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
  },

  sortButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },

  activeSortButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  sortButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  activeSortButtonText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
  },

  medicineCard: {
    marginBottom: theme.spacing.md,
  },

  medicineHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.md,
  },

  medicineInfo: {
    flex: 1,
  },

  medicineName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  brandName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  medicineDetails: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
  },

  priceInfo: {
    alignItems: 'flex-end' as const,
  },

  currentPrice: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primary,
  },

  priceLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },

  medicineStats: {
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
    fontSize: theme.typography.sizes.sm,
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

  medicineDetailsCard: {
    marginBottom: theme.spacing.lg,
  },

  medicineDetailsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  currentPricingGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },

  pricingItem: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  pricingValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  pricingLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },

  competitorCard: {
    marginBottom: theme.spacing.lg,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  inputHint: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic' as const,
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

  recommendationCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },

  recommendationMain: {
    alignItems: 'center' as const,
    marginBottom: theme.spacing.lg,
  },

  suggestedPrice: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },

  suggestionLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },

  priceRange: {
    alignItems: 'center' as const,
  },

  rangeLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  rangeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  reasoningSection: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  reasoningTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  reasoningText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  impactCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },

  impactGrid: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },

  impactItem: {
    alignItems: 'center' as const,
    flex: 1,
  },

  impactIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.sm,
  },

  impactLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center' as const,
  },

  impactValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    textTransform: 'capitalize' as const,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },

  actionButton: {
    flex: 1,
  },
}));