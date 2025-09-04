import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { InvoiceForm } from '../components/forms/InvoiceForm';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { CustomTabBar } from '../components/ui/CustomTabBar';
import { Sidebar } from '../components/ui/Sidebar';
import { Theme, createThemedStyles } from '../constants/Theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCustomers, useSales, useStock } from '../hooks/useDatabase';

import { Customer } from '../lib/types';


interface InvoiceItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  stockId?: string;
  availableStock?: number;
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

export default function InvoiceManagementScreen() {
  const { user, pharmacy } = useAuth();
  const { language } = useLanguage();
  const { stockItems, loading: stockLoading, updateStock } = useStock();
  const { customers, searchCustomers, addCustomer } = useCustomers();
  const { createSale, loading: saleLoading } = useSales();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Load invoices from storage on component mount
  useEffect(() => {
    loadInvoicesFromStorage();
  }, []);

  // Storage functions
  const saveInvoicesToStorage = async (invoiceList: Invoice[]) => {
    try {
      const storageKey = `invoices_${pharmacy?.id || 'default'}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(invoiceList));
      }
    } catch (error) {
      console.error('Error saving invoices:', error);
    }
  };

  const loadInvoicesFromStorage = async () => {
    try {
      const storageKey = `invoices_${pharmacy?.id || 'default'}`;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedInvoices = JSON.parse(stored);
          setInvoices(parsedInvoices);
          console.log('📋 Loaded', parsedInvoices.length, 'invoices from storage');
        }
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  // Old functions removed - replaced with InvoiceForm component

  // Get medicine list from actual stock inventory
  const getMedicineListFromStock = () => {
    console.log('🏥 Stock Items:', stockItems, 'Length:', stockItems?.length);
    
    if (!stockItems || stockItems.length === 0) {
      console.log('⚠️ No stock items found, returning empty list');
      return [];
    }
    
    // Convert stock items to medicine list format
    const medicineList = stockItems
      .filter(item => item.medicine && item.quantity > 0) // Only show medicines with stock
      .map(item => ({
        name: item.medicine?.generic_name || item.medicine?.name || 'Unknown Medicine',
        price: item.unit_price || 0,
        stockId: item.id,
        availableStock: item.quantity,
        manufacturer: item.medicine?.manufacturer || '',
        strength: item.medicine?.strength || '',
        dosageForm: item.medicine?.dosage_form || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    
    console.log('💊 Medicine list from inventory:', medicineList.length, 'medicines');
    return medicineList;
  };

  // Handle form submission from InvoiceForm
  const handleInvoiceFormSubmit = async (formData: any) => {
    console.log('📝 Invoice form submitted:', formData);
    
    try {
      // For now, create invoice without database operations to test the flow
      const newInvoice: Invoice = {
        id: `INV-${Date.now()}`,
        customer: {
          id: Date.now().toString(),
          name: formData.customer.name,
          phone: formData.customer.contact,
          address: formData.customer.location,
          location: formData.customer.location, // For display compatibility
          contact: formData.customer.contact, // For display compatibility
        } as Customer,
        items: formData.medicines.map((item: any) => ({
          medicineId: Date.now().toString(),
          medicineName: item.medicineName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        subtotal: formData.payment.subtotal,
        discount: formData.payment.discount,
        total: formData.payment.total,
        paid: formData.payment.paymentAmount,
        due: formData.payment.dueAmount,
        date: new Date().toISOString(),
        status: formData.payment.dueAmount > 0 ? (formData.payment.paymentAmount > 0 ? 'partial' : 'due') : 'paid',
      };

      console.log('✅ Created invoice:', newInvoice);
      setInvoices(prev => {
        const updatedList = [newInvoice, ...prev];
        console.log('📋 Updated invoice list:', updatedList.length, 'invoices');
        saveInvoicesToStorage(updatedList); // Save to storage
        return updatedList;
      });

      // Update stock quantities for sold medicines
      try {
        console.log('📦 Updating stock quantities...');
        for (const item of formData.medicines) {
          // Find the stock item by medicine name
          const stockItem = stockItems.find(stock => 
            stock.medicine?.generic_name === item.medicineName ||
            stock.medicine?.name === item.medicineName
          );
          
          if (stockItem) {
            const newQuantity = Math.max(0, stockItem.quantity - item.quantity);
            console.log(`📉 Updating ${item.medicineName}: ${stockItem.quantity} → ${newQuantity}`);
            
            await updateStock(stockItem.id, {
              quantity: newQuantity,
              // Keep other fields unchanged
              unit_price: stockItem.unit_price,
              cost_price: stockItem.cost_price,
              batch_number: stockItem.batch_number,
              expiry_date: stockItem.expiry_date,
              supplier: stockItem.supplier,
              low_stock_threshold: stockItem.low_stock_threshold,
            });
          } else {
            console.warn(`⚠️ Stock item not found for medicine: ${item.medicineName}`);
          }
        }
        console.log('✅ Stock quantities updated successfully');
      } catch (stockError) {
        console.error('❌ Error updating stock:', stockError);
        // Don't fail the invoice creation if stock update fails
      }
      
      // Handle delivery if requested
      if (formData.delivery && formData.delivery.enabled && formData.delivery.available) {
        try {
          const { MedicineDeliveryService } = await import('../lib/medicine-delivery-service');
          
          await MedicineDeliveryService.createDeliveryRequest(
            pharmacy!.id,
            {
              name: formData.customer.name,
              phone: formData.customer.contact,
              address: formData.delivery.address,
            },
            formData.medicines.map((item: any) => ({
              medicine_id: item.medicineId,
              medicine_name: item.medicineName,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.total,
              prescription_required: false,
            })),
            'cash_on_delivery'
          );

          console.log('🚚 Delivery request created successfully');
        } catch (deliveryError) {
          console.error('❌ Delivery creation error:', deliveryError);
          // Don't fail the invoice creation if delivery fails
        }
      }
      
      // Close the modal and reset form immediately
      resetForm();
      
      // Show success alert
      setTimeout(() => {
        const deliveryMessage = formData.delivery && formData.delivery.enabled && formData.delivery.available
          ? `\n\n🚚 Delivery scheduled for ${formData.delivery.address}\nEstimated time: ${formData.delivery.estimatedTime}\nDelivery fee: ৳${formData.delivery.fee}`
          : '';
        
        Alert.alert(
          'Invoice Created Successfully! 🎉',
          `Invoice ${newInvoice.id} created!\n\nTotal: ৳${formData.payment.total}\nPaid: ৳${formData.payment.paymentAmount}\nDue: ৳${formData.payment.dueAmount}${deliveryMessage}`,
          [{ text: 'OK' }]
        );
      }, 100);

      // Trigger dashboard refresh by dispatching a custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('invoiceCreated'));
      }
    } catch (error) {
      console.error('❌ Invoice creation error:', error);
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    }
  };

  // Sharing and printing functions
  const formatInvoiceText = (invoice: Invoice) => {
    const items = invoice.items.map(item => 
      `${item.medicineName} - Qty: ${item.quantity} × ৳${item.unitPrice} = ৳${item.total}`
    ).join('\n');

    return `🏥 ${pharmacy?.name || 'MediStock Pharmacy'}
📄 INVOICE: ${invoice.id}
📅 Date: ${new Date(invoice.date).toLocaleDateString()}

👤 Customer: ${invoice.customer.name}
📍 ${invoice.customer.location}
📱 ${invoice.customer.contact}

💊 MEDICINES:
${items}

💰 PAYMENT SUMMARY:
Subtotal: ৳${invoice.subtotal}
Discount: ৳${invoice.discount}
Total: ৳${invoice.total}
Paid: ৳${invoice.paid}
Due: ৳${invoice.due}

Status: ${invoice.status.toUpperCase()}

Thank you for your business! 🙏`;
  };

  const shareViaWhatsApp = async (invoice: Invoice) => {
    const message = formatInvoiceText(invoice);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    
    try {
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp');
    }
  };

  const shareViaEmail = async (invoice: Invoice) => {
    const message = formatInvoiceText(invoice);
    const subject = `Invoice ${invoice.id} - ${pharmacy?.name || 'MediStock Pharmacy'}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    
    try {
      await Linking.openURL(emailUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open email client');
    }
  };

  const printInvoice = (invoice: Invoice) => {
    // Create print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoice.id}</title>
            <meta charset="UTF-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #fff;
                padding: 20px;
                font-size: 14px;
              }
              
              .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
              }
              
              .invoice-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                position: relative;
              }
              
              .invoice-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" patternUnits="userSpaceOnUse" width="100" height="100"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
                opacity: 0.3;
              }
              
              .pharmacy-name {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 8px;
                position: relative;
                z-index: 1;
              }
              
              .invoice-title {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 5px;
                position: relative;
                z-index: 1;
              }
              
              .invoice-date {
                font-size: 16px;
                opacity: 0.9;
                position: relative;
                z-index: 1;
              }
              
              .invoice-body {
                padding: 30px;
              }
              
              .invoice-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
              }
              
              .section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #667eea;
              }
              
              .section-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
              }
              
              .section-title::before {
                content: '📋';
                margin-right: 8px;
              }
              
              .customer-section .section-title::before { content: '👤'; }
              
              .detail-item {
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
              }
              
              .detail-label {
                font-weight: 500;
                color: #666;
                min-width: 80px;
              }
              
              .detail-value {
                color: #333;
                font-weight: 500;
              }
              
              .medicines-section {
                margin-bottom: 30px;
              }
              
              .medicines-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 20px;
                text-align: center;
                background: #667eea;
                color: white;
                padding: 15px;
                border-radius: 8px;
              }
              
              .medicines-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border-radius: 8px;
                overflow: hidden;
              }
              
              .medicines-table th {
                background: #f8f9fa;
                padding: 15px 12px;
                text-align: left;
                font-weight: 600;
                color: #333;
                border-bottom: 2px solid #e0e0e0;
              }
              
              .medicines-table td {
                padding: 12px;
                border-bottom: 1px solid #e0e0e0;
              }
              
              .medicines-table tr:nth-child(even) {
                background: #f8f9fa;
              }
              
              .medicines-table tr:hover {
                background: #e3f2fd;
              }
              
              .medicine-name {
                font-weight: 500;
                color: #333;
              }
              
              .quantity {
                text-align: center;
                font-weight: 600;
                color: #667eea;
              }
              
              .price {
                text-align: right;
                font-weight: 500;
              }
              
              .total-cell {
                text-align: right;
                font-weight: 600;
                color: #2e7d32;
              }
              
              .payment-summary {
                background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);
                padding: 25px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 2px solid #667eea;
              }
              
              .payment-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 20px;
                text-align: center;
              }
              
              .payment-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e0e0e0;
              }
              
              .payment-row:last-child {
                border-bottom: none;
                padding-top: 15px;
                margin-top: 15px;
                border-top: 2px solid #667eea;
              }
              
              .payment-label {
                font-weight: 500;
                color: #666;
              }
              
              .payment-value {
                font-weight: 600;
                color: #333;
              }
              
              .total-row {
                font-size: 18px;
                color: #667eea !important;
              }
              
              .total-row .payment-value {
                color: #667eea !important;
              }
              
              .due-amount {
                color: #d32f2f !important;
              }
              
              .status-badge {
                display: inline-block;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .status-paid { background: #c8e6c9; color: #2e7d32; }
              .status-partial { background: #fff3cd; color: #f57f17; }
              .status-due { background: #ffcdd2; color: #d32f2f; }
              
              .footer {
                text-align: center;
                padding: 20px;
                background: #f8f9fa;
                border-top: 2px solid #e0e0e0;
                color: #666;
                font-style: italic;
              }
              
              .print-button {
                background: #667eea;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 16px;
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                display: block;
                margin: 20px auto;
                box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
                transition: all 0.3s ease;
              }
              
              .print-button:hover {
                background: #5a67d8;
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
              }
              
              @media print {
                body { padding: 0; }
                .print-button { display: none; }
                .invoice-container { border: none; }
                @page { margin: 0.5in; }
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="invoice-header">
                <div class="pharmacy-name">${pharmacy?.name || 'MediStock Pharmacy'}</div>
                <div class="invoice-title">INVOICE: ${invoice.id}</div>
                <div class="invoice-date">${new Date(invoice.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
              
              <div class="invoice-body">
                <div class="invoice-details">
                  <div class="section invoice-section">
                    <div class="section-title">Invoice Information</div>
                    <div class="detail-item">
                      <span class="detail-label">Invoice ID:</span>
                      <span class="detail-value">${invoice.id}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Date:</span>
                      <span class="detail-value">${new Date(invoice.date).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Status:</span>
                      <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <div class="section customer-section">
                    <div class="section-title">Customer Details</div>
                    <div class="detail-item">
                      <span class="detail-label">Name:</span>
                      <span class="detail-value">${invoice.customer.name}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Address:</span>
                      <span class="detail-value">${invoice.customer.location}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Contact:</span>
                      <span class="detail-value">${invoice.customer.contact}</span>
                    </div>
                  </div>
                </div>
                
                <div class="medicines-section">
                  <div class="medicines-title">💊 Prescribed Medicines</div>
                  <table class="medicines-table">
                    <thead>
                      <tr>
                        <th style="width: 50%">Medicine Name</th>
                        <th style="width: 15%; text-align: center">Quantity</th>
                        <th style="width: 20%; text-align: right">Unit Price</th>
                        <th style="width: 15%; text-align: right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${invoice.items.map(item => `
                        <tr>
                          <td class="medicine-name">${item.medicineName}</td>
                          <td class="quantity">${item.quantity}</td>
                          <td class="price">৳${item.unitPrice}</td>
                          <td class="total-cell">৳${item.total}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                
                <div class="payment-summary">
                  <div class="payment-title">💰 Payment Summary</div>
                  <div class="payment-row">
                    <span class="payment-label">Subtotal:</span>
                    <span class="payment-value">৳${invoice.subtotal}</span>
                  </div>
                  <div class="payment-row">
                    <span class="payment-label">Discount:</span>
                    <span class="payment-value">৳${invoice.discount}</span>
                  </div>
                  <div class="payment-row total-row">
                    <span class="payment-label">Total Amount:</span>
                    <span class="payment-value">৳${invoice.total}</span>
                  </div>
                  <div class="payment-row">
                    <span class="payment-label">Amount Paid:</span>
                    <span class="payment-value">৳${invoice.paid}</span>
                  </div>
                  ${invoice.due > 0 ? `
                    <div class="payment-row">
                      <span class="payment-label">Due Amount:</span>
                      <span class="payment-value due-amount">৳${invoice.due}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
              
              <div class="footer">
                <p>Thank you for choosing ${pharmacy?.name || 'MediStock Pharmacy'}!</p>
                <p>💊 Your health is our priority • 📞 Contact us for any queries</p>
              </div>
            </div>
            
            <button class="print-button" onclick="window.print();">
              🖨️ Print Invoice
            </button>
            
            <script>
              // Auto-open print dialog after page loads
              window.addEventListener('load', function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              });
              
              // Close window after printing (optional)
              window.addEventListener('afterprint', function() {
                // Uncomment the next line if you want to auto-close after printing
                // window.close();
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const resetForm = () => {
    console.log('🔄 Resetting form and closing modal...');
    setShowNewInvoiceModal(false);
    console.log('✅ Modal closed');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Theme.colors.success;
      case 'partial': return Theme.colors.warning;
      case 'due': return Theme.colors.error;
      default: return Theme.colors.textSecondary;
    }
  };

  // Removed calculateTotals - now handled in InvoiceForm

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
          <TouchableOpacity 
            onPress={() => setSidebarVisible(true)} 
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Invoice Management</Text>
            <Text style={styles.headerSubtitle}>Create and manage customer invoices</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowNewInvoiceModal(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Recent Invoices */}
        <Card style={styles.card}>
          <CardHeader>
            <Text style={styles.cardTitle}>Recent Invoices</Text>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <Text style={styles.emptyText}>No invoices created yet</Text>
            ) : (
              invoices.map((invoice) => (
                <View key={invoice.id} style={styles.invoiceItem}>
                  <View style={styles.invoiceHeader}>
                    <Text style={styles.invoiceId}>{invoice.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                        {invoice.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.customerName}>{invoice.customer.name}</Text>
                  <Text style={styles.customerDetails}>{invoice.customer.location} • {invoice.customer.contact}</Text>
                  <View style={styles.invoiceFooter}>
                    <Text style={styles.invoiceAmount}>Total: ৳{invoice.total}</Text>
                    <Text style={styles.invoiceDate}>{new Date(invoice.date).toLocaleDateString()}</Text>
                  </View>
                  {invoice.due > 0 && (
                    <Text style={styles.dueAmount}>Due: ৳{invoice.due}</Text>
                  )}
                  
                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setSelectedInvoice(invoice);
                        setShowInvoiceModal(true);
                      }}
                    >
                      <Text style={styles.actionButtonText}>👁️ View</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#25D366' + '20' }]}
                      onPress={() => shareViaWhatsApp(invoice)}
                    >
                      <Text style={[styles.actionButtonText, { color: '#25D366' }]}>📱 WhatsApp</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: Theme.colors.info + '20' }]}
                      onPress={() => shareViaEmail(invoice)}
                    >
                      <Text style={[styles.actionButtonText, { color: Theme.colors.info }]}>📧 Email</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: Theme.colors.warning + '20' }]}
                      onPress={() => printInvoice(invoice)}
                    >
                      <Text style={[styles.actionButtonText, { color: Theme.colors.warning }]}>🖨️ Print</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </CardContent>
        </Card>
      </ScrollView>

      {/* New Invoice Modal */}
      <Modal visible={showNewInvoiceModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Invoice</Text>
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>

          <InvoiceForm
            onSubmit={handleInvoiceFormSubmit}
            onCancel={resetForm}
            loading={saleLoading}
            medicineList={getMedicineListFromStock()}
          />
        </View>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal visible={showInvoiceModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invoice Details</Text>
            <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>
          </View>

          {selectedInvoice && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Invoice Header */}
              <Card style={styles.card}>
                <CardHeader>
                  <Text style={styles.cardTitle}>Invoice Information</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice ID:</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{new Date(selectedInvoice.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedInvoice.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedInvoice.status) }]}>
                        {selectedInvoice.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>

              {/* Customer Details */}
              <Card style={styles.card}>
                <CardHeader>
                  <Text style={styles.cardTitle}>Customer Details</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.customer.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.customer.location}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contact:</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.customer.contact}</Text>
                  </View>
                </CardContent>
              </Card>

              {/* Medicine Items */}
              <Card style={styles.card}>
                <CardHeader>
                  <Text style={styles.cardTitle}>Medicine Items</Text>
                </CardHeader>
                <CardContent>
                  {selectedInvoice.items.map((item, index) => (
                    <View key={index} style={styles.medicineDetailItem}>
                      <Text style={styles.medicineName}>{item.medicineName}</Text>
                      <View style={styles.medicineDetails}>
                        <Text style={styles.medicineDetailText}>Qty: {item.quantity}</Text>
                        <Text style={styles.medicineDetailText}>Price: ৳{item.unitPrice}</Text>
                        <Text style={styles.medicineDetailText}>Total: ৳{item.total}</Text>
                      </View>
                    </View>
                  ))}
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card style={styles.card}>
                <CardHeader>
                  <Text style={styles.cardTitle}>Payment Summary</Text>
                </CardHeader>
                <CardContent>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Subtotal:</Text>
                    <Text style={styles.paymentValue}>৳{selectedInvoice.subtotal}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Discount:</Text>
                    <Text style={styles.paymentValue}>৳{selectedInvoice.discount}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, styles.totalLabel]}>Total:</Text>
                    <Text style={[styles.paymentValue, styles.totalValue]}>৳{selectedInvoice.total}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Paid:</Text>
                    <Text style={styles.paymentValue}>৳{selectedInvoice.paid}</Text>
                  </View>
                  {selectedInvoice.due > 0 && (
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Due:</Text>
                      <Text style={[styles.paymentValue, { color: Theme.colors.error }]}>৳{selectedInvoice.due}</Text>
                    </View>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons in Modal */}
              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: '#25D366' + '20' }]}
                  onPress={() => {
                    shareViaWhatsApp(selectedInvoice);
                    setShowInvoiceModal(false);
                  }}
                >
                  <Text style={[styles.modalActionButtonText, { color: '#25D366' }]}>📱 Share WhatsApp</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: Theme.colors.info + '20' }]}
                  onPress={() => {
                    shareViaEmail(selectedInvoice);
                    setShowInvoiceModal(false);
                  }}
                >
                  <Text style={[styles.modalActionButtonText, { color: Theme.colors.info }]}>📧 Share Email</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: Theme.colors.warning + '20' }]}
                  onPress={() => {
                    printInvoice(selectedInvoice);
                    setShowInvoiceModal(false);
                  }}
                >
                  <Text style={[styles.modalActionButtonText, { color: Theme.colors.warning }]}>🖨️ Print</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
    justifyContent: 'space-between' as const,
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

  addButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  addButtonText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100, // Extra padding to account for CustomTabBar height
  },

  card: {
    marginBottom: theme.spacing.lg,
  },

  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  emptyText: {
    textAlign: 'center' as const,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
    paddingVertical: theme.spacing.xl,
  },

  invoiceItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  invoiceHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.xs,
  },

  invoiceId: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },

  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },

  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },

  customerName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },

  customerDetails: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },

  invoiceFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  invoiceAmount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },

  invoiceDate: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  dueAmount: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.weights.medium,
    marginTop: theme.spacing.xs,
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

  // Action buttons for invoice items
  actionButtons: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },

  actionButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.backgroundTertiary,
    minWidth: 70,
    alignItems: 'center' as const,
  },

  actionButtonText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  // Invoice details modal styles
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.xs,
  },

  detailLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },

  detailValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
    flex: 2,
    textAlign: 'right' as const,
  },

  medicineDetailItem: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  medicineName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  medicineDetails: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },

  medicineDetailText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  paymentRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
  },

  paymentLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },

  paymentValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },

  totalLabel: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },

  totalValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },

  modalActionButtons: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },

  modalActionButton: {
    flex: 1,
    minWidth: 120,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  modalActionButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },

  // Removed unused styles - now using InvoiceForm component
}));