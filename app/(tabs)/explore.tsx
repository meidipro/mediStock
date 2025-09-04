import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Sidebar } from '../../components/ui/Sidebar';
import { createThemedStyles } from '../../constants/Theme';
import { useAuth } from '../../contexts/AuthContext';
import { AlternativeMedicine, AlternativeMedicineService } from '../../lib/alternative-medicine-service';
import { ApiCategory, ApiMedicine, PharmacyApiService } from '../../lib/pharmacy-api-service';

export default function MedicineKnowledgeScreen() {
  const { pharmacy } = useAuth();
  const [medicines, setMedicines] = useState<ApiMedicine[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<ApiMedicine | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alternatives, setAlternatives] = useState<AlternativeMedicine[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  const fetchMedicines = async (query = '') => {
    console.log('🔍 Calling fetchMedicines with query:', query);
    setLoading(true);
    setError(null);
    try {
      console.log('🌐 About to call PharmacyApiService.getMedicines');
      const fetchedMedicines = await PharmacyApiService.getMedicines(query);
      console.log('📦 Fetched medicines:', fetchedMedicines);
      
      if (Array.isArray(fetchedMedicines)) {
        setMedicines(fetchedMedicines);
        console.log(`✅ Successfully loaded ${fetchedMedicines.length} medicines`);
      } else {
        console.warn('⚠️ Received non-array response:', fetchedMedicines);
        setMedicines([]);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch medicines';
      console.error('❌ Error fetching medicines:', e);
      setError(`Failed to fetch medicines: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log('🌐 Fetching categories...');
      const fetchedCategories = await PharmacyApiService.getCategories();
      console.log('📦 Fetched categories:', fetchedCategories);
      setCategories(fetchedCategories);
    } catch (e) {
      console.error('❌ Failed to fetch categories:', e);
      // Don't set error for categories as it's not critical
    }
  };

  useEffect(() => {
    fetchMedicines();
    fetchCategories();
  }, []);

  const handleSearch = () => {
    fetchMedicines(searchQuery);
  };

  // Filter and sort medicines
  const getFilteredMedicines = () => {
    let filtered = [...medicines];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(medicine => 
        medicine.therapeuticClass === selectedCategory
      );
    }

    // Filter by price range
    filtered = filtered.filter(medicine => 
      medicine.price >= priceRange.min && medicine.price <= priceRange.max
    );

    // Sort medicines
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.brandName.localeCompare(b.brandName);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'category':
          comparison = a.therapeuticClass.localeCompare(b.therapeuticClass);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredMedicines = getFilteredMedicines();

  const handleTestApi = async () => {
    try {
      console.log('🔍 Testing API health...');
      const healthData = await PharmacyApiService.healthCheck();
      console.log('📦 Health check response:', healthData);
      
      if (healthData.success && healthData.status === 'healthy') {
        Alert.alert('✅ API Status', 'API is healthy and connected!');
      } else {
        Alert.alert('⚠️ API Status', `API is not healthy: ${healthData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      Alert.alert('❌ API Status', 'Failed to connect to the API. Please make sure the server is running on http://localhost:3000');
    }
  };

  const loadAlternatives = async (medicineId: string) => {
    if (!pharmacy?.id) return;
    
    try {
      console.log('🔍 Loading alternatives for medicine:', medicineId);
      const alts = await AlternativeMedicineService.getQuickAlternatives(medicineId, pharmacy.id);
      setAlternatives(alts);
      setShowAlternatives(true);
    } catch (error) {
      console.error('❌ Error loading alternatives:', error);
      Alert.alert('Error', 'Failed to load alternative medicines');
    }
  };

  const renderMedicineCard = ({ item }: { item: ApiMedicine }) => (
    <TouchableOpacity
      style={styles.medicineCard}
      onPress={() => {
        setSelectedMedicine(item);
        setShowDetailModal(true);
      }}
    >
      {/* Medicine Image */}
      <View style={styles.medicineImageContainer}>
        <View style={styles.medicineImagePlaceholder}>
          <Text style={styles.medicineImageText}>
            {item.brandName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.medicineContent}>
        <View style={styles.medicineHeader}>
          <Text style={styles.medicineBrandName} numberOfLines={1}>
            {item.brandName}
          </Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              ৳{item.price}
            </Text>
          </View>
        </View>
        <Text style={styles.medicineGenericName} numberOfLines={1}>
          {item.genericName}
        </Text>
        <Text style={styles.medicineManufacturer} numberOfLines={1}>
          {item.company}
        </Text>
        <View style={styles.medicineFooter}>
          <Text style={styles.medicineStrength}>
            {item.strength} {item.dosageForm}
          </Text>
        </View>
        <Text style={styles.therapeuticClass} numberOfLines={1}>
          {item.therapeuticClass}
        </Text>
        
        {/* Alternative Medicine Button */}
        <TouchableOpacity 
          style={styles.alternativeButton}
          onPress={(e) => {
            e.stopPropagation();
            loadAlternatives(item.id);
          }}
        >
          <Text style={styles.alternativeButtonText}>🔄 Find Alternatives</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Sidebar
        isVisible={sidebarVisible}
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="explore"
      />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Medicine Knowledge</Text>
            <Text style={styles.headerSubtitle}>
              Explore comprehensive medicine database
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines by name, manufacturer, or category..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <View style={styles.searchButtons}>
            <Button 
              title="🔍 Search" 
              onPress={handleSearch}
              style={styles.searchButton}
            />
            <Button 
              title="🔧 Filters" 
              onPress={() => setShowFilters(!showFilters)}
              style={styles.filterButton}
            />
            <Button title="Test API" onPress={handleTestApi} />
          </View>
        </View>

        {/* Advanced Filters */}
        {showFilters && (
          <Card style={styles.filtersCard}>
            <CardHeader>
              <Text style={styles.filtersTitle}>🔧 Advanced Filters</Text>
            </CardHeader>
            <CardContent>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Category:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryChip, selectedCategory === category.name && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(category.name)}
                    >
                      <Text style={[styles.categoryChipText, selectedCategory === category.name && styles.categoryChipTextActive]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Price Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Price Range: ৳{priceRange.min} - ৳{priceRange.max}</Text>
                <View style={styles.priceRangeContainer}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min"
                    value={priceRange.min.toString()}
                    onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: parseInt(text) || 0 }))}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceRangeText}>to</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max"
                    value={priceRange.max.toString()}
                    onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: parseInt(text) || 1000 }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Sort by:</Text>
                <View style={styles.sortContainer}>
                  <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
                    onPress={() => setSortBy('name')}
                  >
                    <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>
                      Name
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
                    onPress={() => setSortBy('price')}
                  >
                    <Text style={[styles.sortButtonText, sortBy === 'price' && styles.sortButtonTextActive]}>
                      Price
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'category' && styles.sortButtonActive]}
                    onPress={() => setSortBy('category')}
                  >
                    <Text style={[styles.sortButtonText, sortBy === 'category' && styles.sortButtonTextActive]}>
                      Category
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sortOrderButton}
                    onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    <Text style={styles.sortOrderText}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🔄 Loading medicines...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <Button 
              title="Retry" 
              onPress={() => fetchMedicines(searchQuery)}
              style={styles.retryButton}
            />
          </View>
        )}

        {!loading && !error && medicines.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📦 No medicines found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Make sure your admin portal is running and has medicines'}
            </Text>
          </View>
        )}

        {!loading && !error && filteredMedicines.length > 0 && (
          <FlatList
            data={filteredMedicines}
            renderItem={renderMedicineCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.medicineRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.medicineList}
          />
        )}
      </ScrollView>

      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailModalContainer}>
          <View style={styles.detailModalHeader}>
            <View style={styles.detailModalHeaderContent}>
              <View>
                <Text style={styles.detailModalTitle}>
                  {selectedMedicine?.brandName}
                </Text>
                <Text style={styles.detailModalSubtitle}>
                  {selectedMedicine?.genericName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.detailModalClose}
              >
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.detailModalContent}>
            {selectedMedicine && (
              <>
                <Card style={styles.detailSection}>
                  <CardHeader>
                    <Text style={styles.detailSectionTitle}>📋 Basic Information</Text>
                  </CardHeader>
                  <CardContent>
                    <DetailRow label="Brand Name" value={selectedMedicine.brandName} />
                    <DetailRow label="Generic Name" value={selectedMedicine.genericName} />
                    <DetailRow label="Company" value={selectedMedicine.company} />
                    <DetailRow label="Strength" value={selectedMedicine.strength} />
                    <DetailRow label="Dosage Form" value={selectedMedicine.dosageForm} />
                    <DetailRow label="Therapeutic Class" value={selectedMedicine.therapeuticClass} />
                    <DetailRow label="Price" value={`৳${selectedMedicine.price}`} />
                    <DetailRow label="Stock" value={selectedMedicine.stock.toString()} />
                    <DetailRow label="Status" value={selectedMedicine.status} />
                  </CardContent>
                </Card>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Alternatives Modal */}
      <Modal
        visible={showAlternatives}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAlternatives(false)}
      >
        <View style={styles.alternativesModalContainer}>
          <View style={styles.alternativesModalHeader}>
            <Text style={styles.alternativesModalTitle}>🔄 Alternative Medicines</Text>
            <TouchableOpacity
              onPress={() => setShowAlternatives(false)}
              style={styles.alternativesModalClose}
            >
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.alternativesModalContent}>
            {alternatives.length > 0 ? (
              alternatives.map((alt) => (
                <Card key={alt.id} style={styles.alternativeCard}>
                  <CardContent>
                    <View style={styles.alternativeHeader}>
                      <Text style={styles.alternativeName}>{alt.brand_name}</Text>
                      <Text style={styles.alternativePrice}>৳{alt.price}</Text>
                    </View>
                    <Text style={styles.alternativeGeneric}>{alt.generic_name}</Text>
                    <Text style={styles.alternativeCompany}>{alt.manufacturer}</Text>
                    <View style={styles.alternativeDetails}>
                      <Text style={styles.alternativeStrength}>{alt.strength} {alt.dosage_form}</Text>
                      <View style={styles.similarityBadge}>
                        <Text style={styles.similarityText}>{alt.similarity_score}% Match</Text>
                      </View>
                    </View>
                    <Text style={styles.substitutionReason}>{alt.substitution_reason}</Text>
                    <Text style={styles.dosageEquivalent}>{alt.dosage_equivalent}</Text>
                    {alt.notes && (
                      <Text style={styles.alternativeNotes}>Note: {alt.notes}</Text>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <View style={styles.noAlternativesContainer}>
                <Text style={styles.noAlternativesText}>No alternatives found for this medicine.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 35,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  menuButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuIcon: {
    fontSize: 18,
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  searchSection: {
    marginBottom: theme.spacing.lg,
  },
  searchInput: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.sizes.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  searchButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  searchButton: {
    flex: 1,
  },
  filterButton: {
    flex: 1,
    backgroundColor: theme.colors.primary + '20',
  },
  filtersCard: {
    marginBottom: theme.spacing.lg,
  },
  filtersTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  filterSection: {
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  categoryChipTextActive: {
    color: 'white',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  priceInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.sizes.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlign: 'center',
  },
  priceRangeText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sortButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  sortButtonTextActive: {
    color: 'white',
  },
  sortOrderButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortOrderText: {
    fontSize: theme.typography.sizes.lg,
    color: 'white',
    fontWeight: theme.typography.weights.bold,
  },
  medicineRow: {
    justifyContent: 'space-between' as const,
    marginBottom: theme.spacing.md,
  },
  medicineCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    width: '48%' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row' as const,
  },
  medicineImageContainer: {
    marginRight: theme.spacing.sm,
  },
  medicineImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: theme.colors.primary + '40',
  },
  medicineImageText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primary,
  },
  medicineContent: {
    flex: 1,
  },
  medicineHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.sm,
  },
  medicineBrandName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  priceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary + '20',
  },
  priceText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primary,
  },
  medicineGenericName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  medicineManufacturer: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  medicineFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.xs,
  },
  medicineStrength: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium as any,
  },
  therapeuticClass: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    fontStyle: 'italic' as const,
  },
  detailModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  detailModalHeader: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  detailModalHeaderContent: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  detailModalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },
  detailModalSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.background,
    opacity: 0.9,
    marginTop: 2,
  },
  detailModalClose: {
    padding: theme.spacing.sm,
  },
  closeButton: {
    fontSize: 24,
    color: theme.colors.background,
    padding: theme.spacing.xs,
  },
  detailModalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  detailSection: {
    marginBottom: theme.spacing.lg,
  },
  detailSectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  detailValue: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  errorContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
    margin: theme.spacing.md,
    alignItems: 'center' as const,
  },
  errorText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.error,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.error,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
  medicineList: {
    paddingBottom: theme.spacing.xl,
  },
  alternativeButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
    alignItems: 'center' as const,
  },
  alternativeButtonText: {
    color: 'white',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  alternativesModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  alternativesModalHeader: {
    backgroundColor: '#4ECDC4',
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  alternativesModalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: 'white',
  },
  alternativesModalClose: {
    padding: theme.spacing.sm,
  },
  alternativesModalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  alternativeCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  alternativeHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.xs,
  },
  alternativeName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    flex: 1,
  },
  alternativePrice: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  alternativeGeneric: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  alternativeCompany: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  alternativeDetails: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  alternativeStrength: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  similarityBadge: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  similarityText: {
    color: 'white',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  substitutionReason: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    fontStyle: 'italic' as const,
    marginBottom: theme.spacing.xs,
  },
  dosageEquivalent: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  alternativeNotes: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  noAlternativesContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: theme.spacing.xl,
  },
  noAlternativesText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
}));