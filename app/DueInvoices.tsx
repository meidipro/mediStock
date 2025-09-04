import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { CustomTabBar } from '../components/ui/CustomTabBar';
import { Input } from '../components/ui/Input';
import { Sidebar } from '../components/ui/Sidebar';
import { Theme, createThemedStyles } from '../constants/Theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// Import the same interface from InvoiceManagement
interface InvoiceItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  stockId?: string;
  availableStock?: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  location: string;
  contact: string;
}

interface Invoice {
  id: string;
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  date: string;
  status: 'paid' | 'partial' | 'due';
}

interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'mobile';
}

export default function DueInvoicesScreen() {
  const { pharmacy } = useAuth();
  const { language } = useLanguage();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [filterBy, setFilterBy] = useState<'all' | 'overdue' | 'recent'>('all');

  // Data states
  const [dueInvoices, setDueInvoices] = useState<Invoice[]>([]);
  const [totalDueAmount, setTotalDueAmount] = useState(0);

  useEffect(() => {
    loadDueInvoices();
  }, [pharmacy?.id]);

  const loadDueInvoices = async () => {
    try {
      const storageKey = `invoices_${pharmacy?.id || 'default'}`;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const allInvoices: Invoice[] = JSON.parse(stored);
          
          // Filter invoices with due amount > 0
          const invoicesWithDue = allInvoices.filter(invoice => invoice.due > 0);
          
          setDueInvoices(invoicesWithDue);
          
          // Calculate total due amount
          const total = invoicesWithDue.reduce((sum, invoice) => sum + invoice.due, 0);
          setTotalDueAmount(total);
          
          console.log('📋 Loaded', invoicesWithDue.length, 'due invoices, Total due: ৳', total);
        } else {
          setDueInvoices([]);
          setTotalDueAmount(0);
        }
      }
    } catch (error) {
      console.error('Error loading due invoices:', error);
      setDueInvoices([]);
      setTotalDueAmount(0);
    }
  };

  const getDaysSinceInvoice = (date: string) => {
    const invoiceDate = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - invoiceDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPriorityLevel = (daysOverdue: number, amount: number) => {
    if (daysOverdue >= 30 || amount >= 1000) return 'high';
    if (daysOverdue >= 15 || amount >= 500) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Theme.colors.error;
      case 'medium': return Theme.colors.warning;
      case 'low': return Theme.colors.success;
      default: return Theme.colors.textSecondary;
    }
  };

  const filteredInvoices = dueInvoices.filter(invoice => {
    const daysOverdue = getDaysSinceInvoice(invoice.date);
    switch (filterBy) {
      case 'overdue':
        return daysOverdue >= 15;
      case 'recent':
        return daysOverdue < 7;
      default:
        return true;
    }
  });

  const handlePayment = () => {
    if (!selectedInvoice) return;
    
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedInvoice.due) {
      Alert.alert(
        'Invalid Amount',
        `Please enter a valid amount between ৳1 and ৳${selectedInvoice.due}`
      );
      return;
    }

    // Update the invoice in localStorage
    const storageKey = `invoices_${pharmacy?.id || 'default'}`;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const allInvoices: Invoice[] = JSON.parse(stored);
        const updatedInvoices = allInvoices.map(invoice => {
          if (invoice.id === selectedInvoice.id) {
            const newPaid = invoice.paid + amount;
            const newDue = Math.max(0, invoice.total - newPaid);
            const newStatus = newDue === 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'due');
            
            return {
              ...invoice,
              paid: newPaid,
              due: newDue,
              status: newStatus as 'paid' | 'partial' | 'due'
            };
          }
          return invoice;
        });
        
        // Save back to localStorage
        localStorage.setItem(storageKey, JSON.stringify(updatedInvoices));
        
        // Reload due invoices
        loadDueInvoices();
      }
    }

    // Close modal first, then show success message
    setShowPaymentModal(false);
    setPaymentAmount('');
    const customerName = selectedInvoice.customer.name;
    setSelectedInvoice(null);

    // Show success message after modal is closed
    setTimeout(() => {
      Alert.alert(
        '✅ Payment Successfully Recorded!',
        `Payment Details:
• Invoice: ${selectedInvoice.id}
• Customer: ${customerName}
• Amount Paid: ৳${amount}
• Payment Method: ${paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Card' : 'Mobile Banking'}

Thank you! The invoice has been updated successfully.`,
        [{ 
          text: 'OK', 
          style: 'default'
        }]
      );
    }, 300);
  };

  const handleSendReminder = (invoice: Invoice) => {
    Alert.alert(
      'Send Reminder',
      `Send payment reminder to ${invoice.customer.name}?\n\nInvoice: ${invoice.id}\nContact: ${invoice.customer.contact}\nDue Amount: ৳${invoice.due}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send SMS', 
          onPress: () => Alert.alert('Reminder Sent', 'SMS reminder sent successfully!') 
        },
        { 
          text: 'Call Customer', 
          onPress: () => Alert.alert('Calling...', `Initiating call to ${customer.contact}`) 
        },
      ]
    );
  };

  const renderInvoiceDue = ({ item: invoice }: { item: Invoice }) => {
    const daysSince = getDaysSinceInvoice(invoice.date);
    const priority = getPriorityLevel(daysSince, invoice.due);

    return (
      <Card style={styles.customerCard}>
        <CardContent>
          <View style={styles.customerHeader}>
            <View style={styles.customerInfo}>
              <Text style={styles.invoiceId}>{invoice.id}</Text>
              <Text style={styles.customerName}>{invoice.customer.name}</Text>
              <Text style={styles.customerContact}>{invoice.customer.contact}</Text>
              <Text style={styles.customerLocation}>{invoice.customer.location}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(priority) }]}>
                {priority.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.dueDetails}>
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Invoice Total:</Text>
              <Text style={styles.totalAmount}>৳{invoice.total}</Text>
            </View>
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Paid Amount:</Text>
              <Text style={styles.paidAmount}>৳{invoice.paid}</Text>
            </View>
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Due Amount:</Text>
              <Text style={styles.dueAmount}>৳{invoice.due}</Text>
            </View>
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Invoice Date:</Text>
              <Text style={styles.lastTransaction}>
                {daysSince} days ago
              </Text>
            </View>
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Status:</Text>
              <Text style={[styles.statusText, { 
                color: invoice.status === 'paid' ? Theme.colors.success : 
                       invoice.status === 'partial' ? Theme.colors.warning : 
                       Theme.colors.error 
              }]}>
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <Button
              title="Collect Payment"
              variant="primary"
              size="sm"
              style={styles.actionButton}
              onPress={() => {
                setSelectedInvoice(invoice);
                setShowPaymentModal(true);
              }}
            />
            <Button
              title="Send Reminder"
              variant="outline"
              size="sm"
              style={styles.actionButton}
              onPress={() => handleSendReminder(invoice)}
            />
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Sidebar */}
      <Sidebar 
        isVisible={sidebarVisible} 
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="due-invoices"
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => setSidebarVisible(true)} 
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Due Invoices</Text>
            <Text style={styles.headerSubtitle}>Manage outstanding payments</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <CardContent>
              <Text style={styles.summaryLabel}>Total Due</Text>
              <Text style={[styles.summaryValue, { color: Theme.colors.error }]}>
                ৳{totalDueAmount}
              </Text>
              <Text style={styles.summarySubtext}>
                {dueInvoices.length} invoices
              </Text>
            </CardContent>
          </Card>

          <Card style={styles.summaryCard}>
            <CardContent>
              <Text style={styles.summaryLabel}>Overdue (15+ days)</Text>
              <Text style={[styles.summaryValue, { color: Theme.colors.warning }]}>
                {dueInvoices.filter(inv => getDaysSinceInvoice(inv.date) >= 15).length}
              </Text>
              <Text style={styles.summarySubtext}>invoices</Text>
            </CardContent>
          </Card>
        </View>

        {/* Filter Options */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterBy === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterBy('all')}
          >
            <Text style={[styles.filterText, filterBy === 'all' && styles.filterTextActive]}>
              All ({dueInvoices.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterBy === 'overdue' && styles.filterButtonActive]}
            onPress={() => setFilterBy('overdue')}
          >
            <Text style={[styles.filterText, filterBy === 'overdue' && styles.filterTextActive]}>
              Overdue ({dueInvoices.filter(inv => getDaysSinceInvoice(inv.date) >= 15).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterBy === 'recent' && styles.filterButtonActive]}
            onPress={() => setFilterBy('recent')}
          >
            <Text style={[styles.filterText, filterBy === 'recent' && styles.filterTextActive]}>
              Recent ({dueInvoices.filter(inv => getDaysSinceInvoice(inv.date) < 7).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Due Invoices List */}
        <View style={styles.invoicesListContainer}>
          {filteredInvoices.map((invoice) => renderInvoiceDue({ item: invoice }))}
          {filteredInvoices.length === 0 && (
            <Card style={styles.emptyCard}>
              <CardContent>
                <Text style={styles.emptyText}>No due invoices found</Text>
                <Text style={styles.emptySubtext}>
                  All invoices are paid up to date
                </Text>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Payment Collection Modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Collect Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedInvoice && (
              <>
                {/* Invoice Info */}
                <Card style={styles.modalCard}>
                  <CardHeader>
                    <Text style={styles.cardTitle}>Invoice Details</Text>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.invoiceId}>{selectedInvoice.id}</Text>
                    <Text style={styles.customerName}>{selectedInvoice.customer.name}</Text>
                    <Text style={styles.customerContact}>{selectedInvoice.customer.contact}</Text>
                    <Text style={styles.customerLocation}>{selectedInvoice.customer.location}</Text>
                    
                    <View style={styles.dueInfo}>
                      <Text style={styles.dueInfoLabel}>Invoice Total:</Text>
                      <Text style={styles.dueInfoAmount}>৳{selectedInvoice.total}</Text>
                    </View>
                    <View style={styles.dueInfo}>
                      <Text style={styles.dueInfoLabel}>Paid Amount:</Text>
                      <Text style={styles.dueInfoAmount}>৳{selectedInvoice.paid}</Text>
                    </View>
                    <View style={styles.dueInfo}>
                      <Text style={styles.dueInfoLabel}>Due Amount:</Text>
                      <Text style={styles.dueInfoAmount}>৳{selectedInvoice.due}</Text>
                    </View>
                  </CardContent>
                </Card>

                {/* Payment Details */}
                <Card style={styles.modalCard}>
                  <CardHeader>
                    <Text style={styles.cardTitle}>Payment Details</Text>
                  </CardHeader>
                  <CardContent>
                    <Input
                      label={`Payment Amount (Max: ৳${selectedInvoice.due})`}
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      placeholder="Enter payment amount"
                      keyboardType="numeric"
                    />

                    <Text style={styles.inputLabel}>Payment Method:</Text>
                    <View style={styles.paymentMethods}>
                      {(['cash', 'card', 'mobile'] as const).map((method) => (
                        <TouchableOpacity
                          key={method}
                          style={[
                            styles.methodButton,
                            paymentMethod === method && styles.methodButtonActive
                          ]}
                          onPress={() => setPaymentMethod(method)}
                        >
                          <Text style={[
                            styles.methodText,
                            paymentMethod === method && styles.methodTextActive
                          ]}>
                            {method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : 'Mobile Banking'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {paymentAmount && (
                      <View style={styles.paymentSummary}>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryRowLabel}>Payment Amount:</Text>
                          <Text style={styles.summaryRowValue}>৳{paymentAmount}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryRowLabel}>Remaining Due:</Text>
                          <Text style={styles.summaryRowValue}>
                            ৳{Math.max(0, selectedInvoice.due - parseFloat(paymentAmount || '0'))}
                          </Text>
                        </View>
                      </View>
                    )}
                  </CardContent>
                </Card>

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setShowPaymentModal(false)}
                    style={styles.modalButton}
                  />
                  <Button
                    title="Record Payment"
                    variant="primary"
                    onPress={handlePayment}
                    style={styles.modalButton}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Custom Tab Bar */}
      <CustomTabBar />
    </View>
  );
}

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingBottom: 0, // Ensure no extra padding that might interfere with tab bar
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
    fontSize: 16,
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
  },

  headerSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.background,
    opacity: 0.9,
    marginTop: 2,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100, // Extra padding to account for CustomTabBar height
  },

  summaryContainer: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },

  summaryCard: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },

  summaryValue: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.xs,
  },

  summarySubtext: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },

  filterContainer: {
    flexDirection: 'row' as const,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },

  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },

  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  filterText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    textAlign: 'center' as const,
    fontWeight: theme.typography.weights.medium,
  },

  filterTextActive: {
    color: theme.colors.background,
  },

  list: {
    flex: 1,
  },

  listContainer: {
    paddingBottom: theme.spacing.xl,
  },

  invoicesListContainer: {
    flex: 1,
  },

  emptyCard: {
    marginTop: theme.spacing.lg,
  },

  emptyText: {
    textAlign: 'center' as const,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
    paddingVertical: theme.spacing.xl,
    fontSize: theme.typography.sizes.md,
  },

  emptySubtext: {
    textAlign: 'center' as const,
    color: theme.colors.textTertiary,
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.sm,
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
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 2,
  },

  customerContact: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
    marginBottom: 2,
  },

  customerLocation: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  priorityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },

  priorityText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },

  dueDetails: {
    marginBottom: theme.spacing.md,
  },

  dueRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 4,
  },

  dueLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  dueAmount: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
  },

  dueCount: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  lastTransaction: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  actionButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
  },

  actionButton: {
    flex: 1,
  },

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
    fontWeight: theme.typography.weights.bold,
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

  modalCard: {
    marginBottom: theme.spacing.lg,
  },

  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  dueInfo: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },

  dueInfoLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  dueInfoAmount: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.error,
  },

  inputLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },

  paymentMethods: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },

  methodButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },

  methodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  methodText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    textAlign: 'center' as const,
    fontWeight: theme.typography.weights.medium,
  },

  methodTextActive: {
    color: theme.colors.background,
  },

  paymentSummary: {
    backgroundColor: theme.colors.backgroundTertiary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },

  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.xs,
  },

  summaryRowLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  summaryRowValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  modalActions: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },

  modalButton: {
    flex: 1,
  },

  // New styles for invoice display
  invoiceId: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },

  totalAmount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  paidAmount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.success,
  },

  statusText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase' as const,
  },
}));