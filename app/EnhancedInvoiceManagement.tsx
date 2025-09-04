import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useInvoices } from '../hooks/useDatabase';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sidebar } from '../components/ui/Sidebar';
import { EnhancedInvoiceForm } from '../components/forms/EnhancedInvoiceForm';
import { Theme, createThemedStyles } from '../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

interface InvoiceItem {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  batch_number?: string;
  expiry_date?: string;
  available_stock: number;
}

interface InvoiceData {
  customer_id?: string;
  customer_name?: string;
  items: InvoiceItem[];
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_banking' | 'due';
  notes?: string;
}

export default function EnhancedInvoiceManagementScreen() {
  const { pharmacy } = useAuth();
  const { invoices, loading, fetchInvoices, createInvoice } = useInvoices();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateInvoice = async (invoiceData: InvoiceData) => {
    try {
      setCreating(true);
      const result = await createInvoice(invoiceData);
      
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      Alert.alert(
        'Success',
        'Invoice created successfully!',
        [
          {
            text: 'OK',
            onPress: () => setShowCreateModal(false),
          },
        ]
      );
    } catch (error) {
      console.error('Invoice creation error:', error);
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderInvoiceItem = ({ item: invoice }: { item: any }) => {
    const statusColor = 
      invoice.status === 'paid' ? Theme.colors.success :
      invoice.status === 'partial' ? Theme.colors.warning :
      Theme.colors.error;

    return (
      <Card style={styles.invoiceCard}>
        <CardContent>
          <View style={styles.invoiceHeader}>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNumber}>#{invoice.invoice_number}</Text>
              <Text style={styles.invoiceDate}>
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </Text>
              {invoice.customers && (
                <Text style={styles.customerName}>
                  Customer: {invoice.customers.name}
                </Text>
              )}
            </View>
            
            <View style={styles.invoiceAmounts}>
              <Text style={styles.totalAmount}>৳{invoice.total_amount}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>
                  {invoice.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.invoiceDetails}>
            <Text style={styles.detailText}>
              Items: {invoice.invoice_items?.length || 0}
            </Text>
            <Text style={styles.detailText}>
              Payment: {invoice.payment_method}
            </Text>
            {invoice.due_amount > 0 && (
              <Text style={[styles.detailText, { color: Theme.colors.error }]}>
                Due: ৳{invoice.due_amount}
              </Text>
            )}
          </View>

          {invoice.notes && (
            <Text style={styles.invoiceNotes}>{invoice.notes}</Text>
          )}
        </CardContent>
      </Card>
    );
  };

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    header: {
      backgroundColor: theme.colors.primary,
      paddingTop: 35,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },

    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
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

    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },

    createButtonText: {
      color: theme.colors.background,
      marginLeft: theme.spacing.xs,
      fontWeight: theme.typography.weights.medium,
    },

    content: {
      flex: 1,
      padding: theme.spacing.md,
    },

    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
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
      marginBottom: theme.spacing.lg,
    },

    invoiceCard: {
      marginBottom: theme.spacing.md,
    },

    invoiceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },

    invoiceInfo: {
      flex: 1,
    },

    invoiceNumber: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
    },

    invoiceDate: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    customerName: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.primary,
      marginTop: 2,
    },

    invoiceAmounts: {
      alignItems: 'flex-end',
    },

    totalAmount: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },

    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
    },

    statusText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.background,
      fontWeight: theme.typography.weights.medium,
    },

    invoiceDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },

    detailText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },

    invoiceNotes: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
    },

    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 50,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.primary,
    },

    modalTitle: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.background,
    },

    closeButton: {
      padding: theme.spacing.sm,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: theme.borderRadius.md,
    },

    closeButtonText: {
      fontSize: 18,
      color: theme.colors.background,
    },

    modalContent: {
      flex: 1,
      padding: theme.spacing.md,
    },
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Sidebar */}
      <Sidebar 
        isVisible={sidebarVisible} 
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="invoices"
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              onPress={() => setSidebarVisible(true)} 
              style={styles.menuButton}
            >
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Invoice Management</Text>
              <Text style={styles.headerSubtitle}>
                {invoices.length} invoices • Real-time sync
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color={Theme.colors.background} />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {invoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="receipt-outline" 
              size={64} 
              color={Theme.colors.textSecondary} 
            />
            <Text style={styles.emptyText}>No invoices yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first invoice to get started
            </Text>
            <Button
              title="Create Invoice"
              variant="primary"
              onPress={() => setShowCreateModal(true)}
            />
          </View>
        ) : (
          <FlatList
            data={invoices}
            renderItem={renderInvoiceItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl 
                refreshing={loading} 
                onRefresh={fetchInvoices}
                colors={[Theme.colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Create Invoice Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Invoice</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <EnhancedInvoiceForm
              onSubmit={handleCreateInvoice}
              onCancel={() => setShowCreateModal(false)}
              loading={creating}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}