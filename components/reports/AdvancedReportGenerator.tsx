import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../contexts/AuthContext';
import { useInvoices, useStock, useCustomers } from '../../hooks/useDatabase';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { Theme, createThemedStyles } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';

interface ReportConfig {
  type: 'sales' | 'inventory' | 'financial' | 'customer' | 'comprehensive';
  timeframe: '7d' | '30d' | '90d' | '1y' | 'custom';
  format: 'pdf' | 'csv' | 'excel';
  startDate?: string;
  endDate?: string;
  includeCharts: boolean;
  includeSummary: boolean;
  includeDetails: boolean;
  groupBy?: 'daily' | 'weekly' | 'monthly';
}

interface ReportData {
  summary: any;
  details: any[];
  charts?: any[];
  metadata: {
    generatedAt: string;
    generatedBy: string;
    pharmacy: string;
    period: string;
  };
}

interface AdvancedReportGeneratorProps {
  onClose?: () => void;
}

export const AdvancedReportGenerator: React.FC<AdvancedReportGeneratorProps> = ({
  onClose,
}) => {
  const { pharmacy, user } = useAuth();
  const { invoices } = useInvoices();
  const { stockItems } = useStock();
  const { customers } = useCustomers();

  const [config, setConfig] = useState<ReportConfig>({
    type: 'sales',
    timeframe: '30d',
    format: 'pdf',
    includeCharts: true,
    includeSummary: true,
    includeDetails: true,
    groupBy: 'daily',
  });

  const [generating, setGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<string[]>([]);

  const getDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();

    switch (config.timeframe) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'custom':
        if (config.startDate && config.endDate) {
          return {
            start: new Date(config.startDate),
            end: new Date(config.endDate),
          };
        }
        // Fallback to 30 days if custom dates not set
        start.setDate(end.getDate() - 30);
        break;
    }

    return { start, end };
  }, [config.timeframe, config.startDate, config.endDate]);

  const generateReportData = useCallback(async (): Promise<ReportData> => {
    const { start, end } = getDateRange();
    
    // Filter data based on date range
    const periodInvoices = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.invoice_date);
      return invoiceDate >= start && invoiceDate <= end;
    });

    const periodCustomers = customers.filter(customer => {
      const createdDate = new Date(customer.created_at);
      return createdDate >= start && createdDate <= end;
    });

    let reportData: ReportData;

    switch (config.type) {
      case 'sales':
        reportData = await generateSalesReport(periodInvoices, start, end);
        break;
      case 'inventory':
        reportData = await generateInventoryReport(start, end);
        break;
      case 'financial':
        reportData = await generateFinancialReport(periodInvoices, start, end);
        break;
      case 'customer':
        reportData = await generateCustomerReport(periodCustomers, periodInvoices, start, end);
        break;
      case 'comprehensive':
        reportData = await generateComprehensiveReport(periodInvoices, periodCustomers, start, end);
        break;
      default:
        throw new Error('Invalid report type');
    }

    return reportData;
  }, [config, invoices, customers, stockItems, getDateRange]);

  const generateSalesReport = async (invoices: any[], start: Date, end: Date): Promise<ReportData> => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalTransactions = invoices.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const totalDue = invoices.reduce((sum, inv) => sum + inv.due_amount, 0);

    // Group sales by period
    const groupedSales = groupSalesByPeriod(invoices, config.groupBy || 'daily');

    // Top selling medicines
    const medicineStats = new Map();
    invoices.forEach(invoice => {
      if (invoice.invoice_items) {
        invoice.invoice_items.forEach((item: any) => {
          const name = item.medicines?.generic_name || 'Unknown';
          if (!medicineStats.has(name)) {
            medicineStats.set(name, { quantity: 0, revenue: 0, count: 0 });
          }
          const stats = medicineStats.get(name);
          stats.quantity += item.quantity;
          stats.revenue += item.total_amount;
          stats.count += 1;
        });
      }
    });

    const topMedicines = Array.from(medicineStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      summary: {
        totalRevenue,
        totalTransactions,
        averageTransaction,
        totalDue,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        topMedicines,
      },
      details: groupedSales,
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user?.full_name || 'Unknown',
        pharmacy: pharmacy?.name || 'Unknown Pharmacy',
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      },
    };
  };

  const generateInventoryReport = async (start: Date, end: Date): Promise<ReportData> => {
    const totalItems = stockItems.length;
    const totalValue = stockItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const lowStockItems = stockItems.filter(item => item.quantity <= (item.minimum_stock || 10));
    const expiringSoon = stockItems.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return expiryDate <= thirtyDaysFromNow;
    });

    // Group by category
    const categoryStats = new Map();
    stockItems.forEach(item => {
      const category = item.medicine?.category || 'Other';
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { count: 0, value: 0, quantity: 0 });
      }
      const stats = categoryStats.get(category);
      stats.count += 1;
      stats.value += item.quantity * item.unit_price;
      stats.quantity += item.quantity;
    });

    const categoryBreakdown = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.value - a.value);

    return {
      summary: {
        totalItems,
        totalValue,
        lowStockCount: lowStockItems.length,
        expiringSoonCount: expiringSoon.length,
        averageValue: totalItems > 0 ? totalValue / totalItems : 0,
        categoryBreakdown,
      },
      details: stockItems.map(item => ({
        medicine: item.medicine?.generic_name || 'Unknown',
        category: item.medicine?.category || 'Other',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalValue: item.quantity * item.unit_price,
        minimumStock: item.minimum_stock,
        isLowStock: item.quantity <= (item.minimum_stock || 10),
        expiryDate: item.expiry_date,
        batchNumber: item.batch_number,
        supplier: item.supplier,
      })),
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user?.full_name || 'Unknown',
        pharmacy: pharmacy?.name || 'Unknown Pharmacy',
        period: `As of ${new Date().toLocaleDateString()}`,
      },
    };
  };

  const generateFinancialReport = async (invoices: any[], start: Date, end: Date): Promise<ReportData> => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
    const totalDue = invoices.reduce((sum, inv) => sum + inv.due_amount, 0);

    // Payment method breakdown
    const paymentMethods = new Map();
    invoices.forEach(invoice => {
      const method = invoice.payment_method || 'cash';
      if (!paymentMethods.has(method)) {
        paymentMethods.set(method, { count: 0, amount: 0 });
      }
      const stats = paymentMethods.get(method);
      stats.count += 1;
      stats.amount += invoice.paid_amount;
    });

    // Daily cash flow
    const dailyCashFlow = groupSalesByPeriod(invoices, 'daily');

    return {
      summary: {
        totalRevenue,
        totalPaid,
        totalDue,
        collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
        paymentMethodBreakdown: Array.from(paymentMethods.entries()).map(([method, stats]) => ({
          method,
          ...stats,
        })),
      },
      details: dailyCashFlow,
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user?.full_name || 'Unknown',
        pharmacy: pharmacy?.name || 'Unknown Pharmacy',
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      },
    };
  };

  const generateCustomerReport = async (customers: any[], invoices: any[], start: Date, end: Date): Promise<ReportData> => {
    const totalCustomers = customers.length;
    const activeCustomers = new Set(invoices.filter(inv => inv.customer_id).map(inv => inv.customer_id)).size;
    
    // Customer spending analysis
    const customerSpending = new Map();
    invoices.forEach(invoice => {
      if (invoice.customer_id) {
        if (!customerSpending.has(invoice.customer_id)) {
          customerSpending.set(invoice.customer_id, {
            name: invoice.customers?.name || 'Unknown',
            totalSpent: 0,
            totalTransactions: 0,
            totalDue: 0,
          });
        }
        const stats = customerSpending.get(invoice.customer_id);
        stats.totalSpent += invoice.total_amount;
        stats.totalTransactions += 1;
        stats.totalDue += invoice.due_amount;
      }
    });

    const topCustomers = Array.from(customerSpending.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      summary: {
        totalCustomers,
        newCustomers: customers.length,
        activeCustomers,
        averageSpending: activeCustomers > 0 ? invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / activeCustomers : 0,
        topCustomers,
      },
      details: Array.from(customerSpending.values()),
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user?.full_name || 'Unknown',
        pharmacy: pharmacy?.name || 'Unknown Pharmacy',
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      },
    };
  };

  const generateComprehensiveReport = async (invoices: any[], customers: any[], start: Date, end: Date): Promise<ReportData> => {
    const salesData = await generateSalesReport(invoices, start, end);
    const inventoryData = await generateInventoryReport(start, end);
    const financialData = await generateFinancialReport(invoices, start, end);
    const customerData = await generateCustomerReport(customers, invoices, start, end);

    return {
      summary: {
        sales: salesData.summary,
        inventory: inventoryData.summary,
        financial: financialData.summary,
        customer: customerData.summary,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      },
      details: {
        sales: salesData.details,
        inventory: inventoryData.details,
        financial: financialData.details,
        customer: customerData.details,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user?.full_name || 'Unknown',
        pharmacy: pharmacy?.name || 'Unknown Pharmacy',
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      },
    };
  };

  const groupSalesByPeriod = (invoices: any[], groupBy: string) => {
    const groups = new Map();

    invoices.forEach(invoice => {
      const date = new Date(invoice.invoice_date);
      let key: string;

      switch (groupBy) {
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // daily
          key = invoice.invoice_date;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          period: key,
          revenue: 0,
          transactions: 0,
          due: 0,
          paid: 0,
        });
      }

      const group = groups.get(key);
      group.revenue += invoice.total_amount;
      group.transactions += 1;
      group.due += invoice.due_amount;
      group.paid += invoice.paid_amount;
    });

    return Array.from(groups.values()).sort((a, b) => a.period.localeCompare(b.period));
  };

  const generatePDFReport = async (data: ReportData): Promise<string> => {
    const htmlContent = generateHTMLReport(data);
    
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    return uri;
  };

  const generateHTMLReport = (data: ReportData): string => {
    const { summary, metadata } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Report - ${metadata.pharmacy}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { border-bottom: 2px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #2c3e50; font-size: 24px; margin: 0; }
        .subtitle { color: #7f8c8d; font-size: 14px; margin: 5px 0; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 20px; font-weight: bold; color: #3498db; }
        .metric-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #3498db; color: white; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Report</h1>
        <div class="subtitle">${metadata.pharmacy}</div>
        <div class="subtitle">Period: ${metadata.period}</div>
        <div class="subtitle">Generated: ${new Date(metadata.generatedAt).toLocaleString()}</div>
      </div>

      <div class="summary">
        <h2>Summary</h2>
        ${generateSummaryHTML(summary)}
      </div>

      ${config.includeDetails ? generateDetailsHTML(data.details) : ''}

      <div class="footer">
        <p>Generated by ${metadata.generatedBy} on ${new Date(metadata.generatedAt).toLocaleString()}</p>
        <p>MediStock - Pharmacy Management System</p>
      </div>
    </body>
    </html>
    `;
  };

  const generateSummaryHTML = (summary: any): string => {
    if (config.type === 'sales') {
      return `
        <div class="metric">
          <div class="metric-value">৳${summary.totalRevenue?.toLocaleString() || '0'}</div>
          <div class="metric-label">Total Revenue</div>
        </div>
        <div class="metric">
          <div class="metric-value">${summary.totalTransactions || 0}</div>
          <div class="metric-label">Transactions</div>
        </div>
        <div class="metric">
          <div class="metric-value">৳${summary.averageTransaction?.toFixed(0) || '0'}</div>
          <div class="metric-label">Avg Transaction</div>
        </div>
        <div class="metric">
          <div class="metric-value">৳${summary.totalDue?.toLocaleString() || '0'}</div>
          <div class="metric-label">Total Due</div>
        </div>
      `;
    }
    
    // Add other report type summaries as needed
    return '<p>Summary data will be displayed here</p>';
  };

  const generateDetailsHTML = (details: any): string => {
    if (!details || (Array.isArray(details) && details.length === 0)) {
      return '<p>No detailed data available</p>';
    }

    if (config.type === 'sales' && Array.isArray(details)) {
      return `
        <h2>Daily Sales Breakdown</h2>
        <table class="table">
          <tr>
            <th>Date</th>
            <th>Revenue</th>
            <th>Transactions</th>
            <th>Paid</th>
            <th>Due</th>
          </tr>
          ${details.map(item => `
            <tr>
              <td>${item.period}</td>
              <td>৳${item.revenue?.toLocaleString() || '0'}</td>
              <td>${item.transactions || 0}</td>
              <td>৳${item.paid?.toLocaleString() || '0'}</td>
              <td>৳${item.due?.toLocaleString() || '0'}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    return '<p>Detailed data will be displayed here</p>';
  };

  const generateCSVReport = async (data: ReportData): Promise<string> => {
    let csvContent = '';
    
    // Add metadata
    csvContent += `Report Type,${config.type}\n`;
    csvContent += `Pharmacy,${data.metadata.pharmacy}\n`;
    csvContent += `Period,${data.metadata.period}\n`;
    csvContent += `Generated,${data.metadata.generatedAt}\n\n`;

    // Add summary section
    csvContent += 'SUMMARY\n';
    if (config.type === 'sales') {
      csvContent += `Total Revenue,${data.summary.totalRevenue}\n`;
      csvContent += `Total Transactions,${data.summary.totalTransactions}\n`;
      csvContent += `Average Transaction,${data.summary.averageTransaction}\n`;
      csvContent += `Total Due,${data.summary.totalDue}\n\n`;
    }

    // Add details section
    if (config.includeDetails && Array.isArray(data.details)) {
      csvContent += 'DETAILS\n';
      if (config.type === 'sales') {
        csvContent += 'Date,Revenue,Transactions,Paid,Due\n';
        data.details.forEach(item => {
          csvContent += `${item.period},${item.revenue},${item.transactions},${item.paid},${item.due}\n`;
        });
      }
    }

    // Save to file
    const fileName = `${config.type}_report_${Date.now()}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    return fileUri;
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      
      const reportData = await generateReportData();
      let fileUri: string;

      switch (config.format) {
        case 'pdf':
          fileUri = await generatePDFReport(reportData);
          break;
        case 'csv':
          fileUri = await generateCSVReport(reportData);
          break;
        case 'excel':
          // Excel export would be implemented here
          Alert.alert('Info', 'Excel export coming soon! Using CSV format instead.');
          fileUri = await generateCSVReport(reportData);
          break;
        default:
          throw new Error('Invalid format');
      }

      setGeneratedReports(prev => [...prev, fileUri]);

      // Share the report
      if (Platform.OS === 'ios') {
        await Share.share({ url: fileUri });
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Success', 'Report generated successfully!');
        }
      }

    } catch (error) {
      console.error('Report generation error:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },

    title: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },

    configSection: {
      marginBottom: theme.spacing.lg,
    },

    sectionTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semiBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },

    optionGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },

    optionButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    optionButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },

    optionText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },

    optionTextActive: {
      color: theme.colors.background,
    },

    dateInputs: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },

    dateInput: {
      flex: 1,
    },

    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },

    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 4,
      marginRight: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },

    checkboxActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },

    checkboxText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },

    previewCard: {
      marginBottom: theme.spacing.lg,
    },

    previewText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },

    actions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },

    actionButton: {
      flex: 1,
    },

    generatedReports: {
      marginTop: theme.spacing.lg,
    },

    reportItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },

    reportName: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },

    shareButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
    },

    shareButtonText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.background,
    },
  }));

  const formatLabels = {
    sales: 'Sales Report',
    inventory: 'Inventory Report',
    financial: 'Financial Report',
    customer: 'Customer Report',
    comprehensive: 'Comprehensive Report',
  };

  const timeframeLabels = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
    'custom': 'Custom Range',
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Advanced Reports</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Report Type */}
      <Card style={styles.configSection}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Report Type</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.optionGroup}>
            {Object.entries(formatLabels).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.optionButton,
                  config.type === key && styles.optionButtonActive,
                ]}
                onPress={() => setConfig(prev => ({ ...prev, type: key as any }))}
              >
                <Text style={[
                  styles.optionText,
                  config.type === key && styles.optionTextActive,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Time Period */}
      <Card style={styles.configSection}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Time Period</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.optionGroup}>
            {Object.entries(timeframeLabels).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.optionButton,
                  config.timeframe === key && styles.optionButtonActive,
                ]}
                onPress={() => setConfig(prev => ({ ...prev, timeframe: key as any }))}
              >
                <Text style={[
                  styles.optionText,
                  config.timeframe === key && styles.optionTextActive,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {config.timeframe === 'custom' && (
            <View style={styles.dateInputs}>
              <Input
                style={styles.dateInput}
                label="Start Date"
                value={config.startDate || ''}
                onChangeText={(text) => setConfig(prev => ({ ...prev, startDate: text }))}
                placeholder="YYYY-MM-DD"
              />
              <Input
                style={styles.dateInput}
                label="End Date"
                value={config.endDate || ''}
                onChangeText={(text) => setConfig(prev => ({ ...prev, endDate: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
          )}
        </CardContent>
      </Card>

      {/* Format Options */}
      <Card style={styles.configSection}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Export Format</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.optionGroup}>
            {[
              { key: 'pdf', label: 'PDF' },
              { key: 'csv', label: 'CSV' },
              { key: 'excel', label: 'Excel' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.optionButton,
                  config.format === key && styles.optionButtonActive,
                ]}
                onPress={() => setConfig(prev => ({ ...prev, format: key as any }))}
              >
                <Text style={[
                  styles.optionText,
                  config.format === key && styles.optionTextActive,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Report Options */}
      <Card style={styles.configSection}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Report Options</Text>
        </CardHeader>
        <CardContent>
          {[
            { key: 'includeSummary', label: 'Include Summary' },
            { key: 'includeDetails', label: 'Include Detailed Data' },
            { key: 'includeCharts', label: 'Include Charts (PDF only)' },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={styles.checkboxRow}
              onPress={() => setConfig(prev => ({ ...prev, [key]: !prev[key as keyof ReportConfig] }))}
            >
              <View style={[
                styles.checkbox,
                config[key as keyof ReportConfig] && styles.checkboxActive,
              ]}>
                {config[key as keyof ReportConfig] && (
                  <Ionicons name="checkmark" size={12} color={Theme.colors.background} />
                )}
              </View>
              <Text style={styles.checkboxText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card style={styles.configSection}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Report Preview</Text>
        </CardHeader>
        <CardContent>
          <Text style={styles.previewText}>
            Report Type: {formatLabels[config.type]}{'\n'}
            Time Period: {timeframeLabels[config.timeframe]}{'\n'}
            Format: {config.format.toUpperCase()}{'\n'}
            Options: {[
              config.includeSummary && 'Summary',
              config.includeDetails && 'Details',
              config.includeCharts && 'Charts'
            ].filter(Boolean).join(', ')}
          </Text>
        </CardContent>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Generate & Export"
          variant="primary"
          onPress={handleGenerateReport}
          disabled={generating}
          style={styles.actionButton}
        />
      </View>

      {/* Generated Reports */}
      {generatedReports.length > 0 && (
        <Card style={styles.generatedReports}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Generated Reports</Text>
          </CardHeader>
          <CardContent>
            {generatedReports.map((reportUri, index) => (
              <View key={index} style={styles.reportItem}>
                <Text style={styles.reportName}>
                  {config.type}_report_{new Date().toLocaleDateString()}.{config.format}
                </Text>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => Platform.OS === 'ios' ? Share.share({ url: reportUri }) : Sharing.shareAsync(reportUri)}
                >
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            ))}
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
};