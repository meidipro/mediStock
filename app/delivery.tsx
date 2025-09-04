import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Sidebar } from '../components/ui/Sidebar';
import { createThemedStyles } from '../constants/Theme';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryRequest, MedicineDeliveryService } from '../lib/medicine-delivery-service';

export default function DeliveryManagementScreen() {
  const { pharmacy } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'delivered'>('all');

  const fetchDeliveries = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);
      const deliveryRequests = await MedicineDeliveryService.getDeliveryRequests(pharmacy.id);
      setDeliveries(deliveryRequests);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      Alert.alert('Error', 'Failed to fetch delivery requests');
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  }, [fetchDeliveries]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const updateDeliveryStatus = async (deliveryId: string, status: DeliveryRequest['status']) => {
    try {
      await MedicineDeliveryService.updateDeliveryStatus(deliveryId, status);
      await fetchDeliveries();
      Alert.alert('Success', 'Delivery status updated successfully');
    } catch (error) {
      console.error('Error updating delivery status:', error);
      Alert.alert('Error', 'Failed to update delivery status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA726';
      case 'confirmed': return '#42A5F5';
      case 'preparing': return '#AB47BC';
      case 'out_for_delivery': return '#26A69A';
      case 'delivered': return '#66BB6A';
      case 'cancelled': return '#EF5350';
      case 'failed': return '#EF5350';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'preparing': return '📦';
      case 'out_for_delivery': return '🚚';
      case 'delivered': return '🎉';
      case 'cancelled': return '❌';
      case 'failed': return '⚠️';
      default: return '❓';
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'confirmed'].includes(delivery.status);
    if (filter === 'in_progress') return ['preparing', 'out_for_delivery'].includes(delivery.status);
    if (filter === 'delivered') return ['delivered', 'cancelled', 'failed'].includes(delivery.status);
    return true;
  });

  const renderDeliveryCard = (delivery: DeliveryRequest) => (
    <TouchableOpacity
      key={delivery.id}
      style={styles.deliveryCard}
      onPress={() => {
        setSelectedDelivery(delivery);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.deliveryHeader}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.customerName}>{delivery.customer_name}</Text>
          <Text style={styles.customerPhone}>{delivery.customer_phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(delivery.status)}</Text>
          <Text style={styles.statusText}>{delivery.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.deliveryDetails}>
        <Text style={styles.deliveryAddress} numberOfLines={2}>
          📍 {delivery.customer_address}
        </Text>
        <View style={styles.deliveryMeta}>
          <Text style={styles.deliveryAmount}>৳{delivery.total_amount}</Text>
          <Text style={styles.deliveryFee}>+ ৳{delivery.delivery_fee} delivery</Text>
        </View>
      </View>

      {delivery.tracking_number && (
        <View style={styles.trackingInfo}>
          <Text style={styles.trackingLabel}>Tracking: {delivery.tracking_number}</Text>
        </View>
      )}

      <View style={styles.deliveryActions}>
        {delivery.status === 'pending' && (
          <Button
            title="Confirm"
            onPress={() => updateDeliveryStatus(delivery.id, 'confirmed')}
            style={styles.actionButton}
          />
        )}
        {delivery.status === 'confirmed' && (
          <Button
            title="Start Preparing"
            onPress={() => updateDeliveryStatus(delivery.id, 'preparing')}
            style={styles.actionButton}
          />
        )}
        {delivery.status === 'preparing' && (
          <Button
            title="Out for Delivery"
            onPress={() => updateDeliveryStatus(delivery.id, 'out_for_delivery')}
            style={styles.actionButton}
          />
        )}
        {delivery.status === 'out_for_delivery' && (
          <Button
            title="Mark Delivered"
            onPress={() => updateDeliveryStatus(delivery.id, 'delivered')}
            style={styles.actionButton}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDeliveryDetail = () => {
    if (!selectedDelivery) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delivery Details</Text>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Card style={styles.detailCard}>
              <CardHeader>
                <Text style={styles.detailSectionTitle}>Customer Information</Text>
              </CardHeader>
              <CardContent>
                <Text style={styles.detailLabel}>Name: {selectedDelivery.customer_name}</Text>
                <Text style={styles.detailLabel}>Phone: {selectedDelivery.customer_phone}</Text>
                <Text style={styles.detailLabel}>Address: {selectedDelivery.customer_address}</Text>
              </CardContent>
            </Card>

            <Card style={styles.detailCard}>
              <CardHeader>
                <Text style={styles.detailSectionTitle}>Order Details</Text>
              </CardHeader>
              <CardContent>
                <Text style={styles.detailLabel}>Total Amount: ৳{selectedDelivery.total_amount}</Text>
                <Text style={styles.detailLabel}>Delivery Fee: ৳{selectedDelivery.delivery_fee}</Text>
                <Text style={styles.detailLabel}>Payment Method: {selectedDelivery.payment_method}</Text>
                <Text style={styles.detailLabel}>Status: {selectedDelivery.status}</Text>
                {selectedDelivery.tracking_number && (
                  <Text style={styles.detailLabel}>Tracking: {selectedDelivery.tracking_number}</Text>
                )}
              </CardContent>
            </Card>

            <Card style={styles.detailCard}>
              <CardHeader>
                <Text style={styles.detailSectionTitle}>Medicines</Text>
              </CardHeader>
              <CardContent>
                {selectedDelivery.medicines.map((medicine, index) => (
                  <View key={index} style={styles.medicineItem}>
                    <Text style={styles.medicineName}>{medicine.medicine_name}</Text>
                    <Text style={styles.medicineQuantity}>Qty: {medicine.quantity}</Text>
                    <Text style={styles.medicinePrice}>৳{medicine.total_price}</Text>
                  </View>
                ))}
              </CardContent>
            </Card>

            {selectedDelivery.delivery_notes && (
              <Card style={styles.detailCard}>
                <CardHeader>
                  <Text style={styles.detailSectionTitle}>Delivery Notes</Text>
                </CardHeader>
                <CardContent>
                  <Text style={styles.detailLabel}>{selectedDelivery.delivery_notes}</Text>
                </CardContent>
              </Card>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Management</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'delivered', label: 'Completed' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key as any)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Deliveries List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && deliveries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading deliveries...</Text>
          </View>
        ) : filteredDeliveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No deliveries found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' 
                ? 'No delivery requests yet' 
                : `No ${filter} deliveries found`
              }
            </Text>
          </View>
        ) : (
          filteredDeliveries.map(renderDeliveryCard)
        )}
      </ScrollView>

      {renderDeliveryDetail()}
    </View>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: theme.spacing.sm,
  },
  menuIcon: {
    fontSize: 24,
    color: theme.colors.background,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
  headerRight: {
    width: 40,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: theme.spacing.xs,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  filterTabTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  deliveryCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  deliveryInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  customerPhone: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusIcon: {
    fontSize: theme.typography.sizes.sm,
    marginRight: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: 'white',
    fontWeight: theme.typography.weights.bold,
  },
  deliveryDetails: {
    marginBottom: theme.spacing.sm,
  },
  deliveryAddress: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  deliveryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deliveryAmount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  deliveryFee: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  trackingInfo: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  trackingLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  deliveryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: '#4ECDC4',
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.background,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.colors.background,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  detailCard: {
    marginBottom: theme.spacing.md,
  },
  detailSectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  medicineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  medicineName: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  medicineQuantity: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.sm,
  },
  medicinePrice: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
}));
