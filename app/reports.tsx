import * as Print from 'expo-print';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AIReportsInsights } from '../components/ai/AIReportsInsights';
import { AIRevenueForecast } from '../components/ai/AIRevenueForecast';
import { AISalesAnalytics } from '../components/ai/AISalesAnalytics';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Sidebar } from '../components/ui/Sidebar';
import { Theme, createThemedStyles } from '../constants/Theme';
import { useAuth } from '../contexts/AuthContext';
import { useCustomerAnalytics } from '../hooks/useAI';
import { useCustomers, useReports, useSales, useStock } from '../hooks/useDatabase';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const { pharmacy } = useAuth();
  const { dailyReport, loading: reportLoading, generateDailyReport } = useReports();
  const { sales, fetchSales } = useSales();
  const { lowStockItems, stockItems, fetchStock, fetchLowStock } = useStock();
  const { customers, fetchCustomers } = useCustomers();
  const { analyzeCustomer } = useCustomerAnalytics();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(true);
  const [customerAnalytics, setCustomerAnalytics] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    loadReports();
  }, [selectedDate]);

  const loadReports = async () => {
    await Promise.all([
      generateDailyReport(selectedDate),
      fetchSales(),
      fetchStock(),
      fetchLowStock(),
      fetchCustomers(),
    ]);
    
    // Generate customer analytics for top customers
    if (customers.length > 0) {
      generateCustomerAnalytics();
    }
  };

  const generateCustomerAnalytics = async () => {
    try {
      const topCustomers = customers
        .filter(customer => customer.total_due > 0 || customer.name)
        .slice(0, 3); // Analyze top 3 customers
      
      const analytics = await Promise.all(
        topCustomers.map(async (customer) => {
          const customerSales = sales.filter(sale => sale.customer_id === customer.id);
          if (customerSales.length > 0) {
            return await analyzeCustomer(customer, customerSales);
          }
          return null;
        })
      );
      
      setCustomerAnalytics(analytics.filter(Boolean));
    } catch (error) {
      console.error('Customer analytics generation failed:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const calculatePeriodStats = () => {
    try {
      const storageKey = `invoices_${pharmacy?.id || 'default'}`;
      let invoices = [];
      
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          invoices = JSON.parse(stored);
        }
      }

      const today = new Date();
      let startDate: Date;
      let endDate: Date = new Date(today.toDateString());
      endDate.setHours(23, 59, 59, 999);
      
      switch (reportPeriod) {
        case 'weekly':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          // For daily, use the selected date
          startDate = new Date(selectedDate);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
      }

      const periodInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.date);
        return invoiceDate >= startDate && invoiceDate <= endDate;
      });

      const totalSales = periodInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const totalDue = periodInvoices.reduce((sum, invoice) => sum + invoice.due, 0);
      const totalTransactions = periodInvoices.length;

      return {
        totalSales,
        totalDue,
        totalTransactions,
        periodSales: periodInvoices, // Renamed for consistency with existing code
      };
    } catch (error) {
      console.error('Error calculating period stats:', error);
      return {
        totalSales: 0,
        totalDue: 0,
        totalTransactions: 0,
        periodSales: [],
      };
    }
  };

  const getTopMedicines = () => {
    try {
      const storageKey = `invoices_${pharmacy?.id || 'default'}`;
      let invoices = [];
      
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          invoices = JSON.parse(stored);
        }
      }

      const medicineStats: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
      
      invoices.forEach(invoice => {
        if (Array.isArray(invoice.items)) {
          invoice.items.forEach(item => {
            const key = item.medicineId || item.medicineName;
            if (!medicineStats[key]) {
              medicineStats[key] = {
                name: item.medicineName,
                quantity: 0,
                revenue: 0,
              };
            }
            medicineStats[key].quantity += item.quantity;
            medicineStats[key].revenue += item.total;
          });
        }
      });

      return Object.values(medicineStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting top medicines:', error);
      return [];
    }
  };


  const getStockSummary = () => {
    const totalItems = stockItems.length;
    const totalValue = stockItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const lowStockCount = lowStockItems.length;
    const expiringSoon = stockItems.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return expiryDate <= thirtyDaysFromNow;
    }).length;

    return {
      totalItems,
      totalValue,
      lowStockCount,
      expiringSoon,
    };
  };

  const generatePDFReport = async () => {
    try {
      const periodStats = calculatePeriodStats();
      const topMedicines = getTopMedicines();
      const stockSummary = getStockSummary();
      
      const reportDate = new Date().toLocaleDateString();
      const periodText = reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Sales Report - ${pharmacy?.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333; 
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #007bff; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .pharmacy-name { 
              font-size: 24px; 
              font-weight: bold; 
              color: #007bff; 
              margin: 0;
            }
            .report-title { 
              font-size: 18px; 
              margin: 10px 0; 
            }
            .report-date { 
              color: #666; 
              font-size: 14px; 
            }
            .stats-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 20px; 
              margin: 30px 0; 
            }
            .stat-card { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px; 
              text-align: center; 
            }
            .stat-value { 
              font-size: 32px; 
              font-weight: bold; 
              color: #007bff; 
              margin: 0; 
            }
            .stat-label { 
              font-size: 14px; 
              color: #666; 
              margin-top: 5px; 
            }
            .section { 
              margin: 30px 0; 
            }
            .section-title { 
              font-size: 18px; 
              font-weight: bold; 
              color: #333; 
              border-bottom: 1px solid #ddd; 
              padding-bottom: 10px; 
              margin-bottom: 20px; 
            }
            .medicine-item { 
              display: flex; 
              justify-content: space-between; 
              padding: 10px 0; 
              border-bottom: 1px solid #eee; 
            }
            .medicine-rank { 
              font-weight: bold; 
              color: #007bff; 
            }
            .stock-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 15px; 
              margin: 20px 0; 
            }
            .stock-item { 
              background: #f8f9fa; 
              padding: 15px; 
              border-radius: 6px; 
              text-align: center; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="pharmacy-name">${pharmacy?.name || 'MediStock Pharmacy'}</h1>
            <h2 class="report-title">${periodText} Sales Report</h2>
            <p class="report-date">Generated on ${reportDate}</p>
            ${reportPeriod === 'daily' ? `<p class="report-date">Report Date: ${selectedDate}</p>` : ''}
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">৳${periodStats.totalSales.toLocaleString()}</div>
              <div class="stat-label">Total Sales</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${periodStats.totalTransactions}</div>
              <div class="stat-label">Transactions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">৳${periodStats.totalDue.toLocaleString()}</div>
              <div class="stat-label">Due Amount</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">৳${periodStats.totalTransactions > 0 ? (periodStats.totalSales / periodStats.totalTransactions).toFixed(2) : '0'}</div>
              <div class="stat-label">Average Sale</div>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">Top Selling Medicines</h3>
            ${topMedicines.length > 0 ? 
              topMedicines.map((medicine, index) => `
                <div class="medicine-item">
                  <div>
                    <span class="medicine-rank">${index + 1}.</span>
                    <strong>${medicine.name}</strong>
                  </div>
                  <div>
                    Qty: ${medicine.quantity} • Revenue: ৳${medicine.revenue.toFixed(2)}
                  </div>
                </div>
              `).join('') : 
              '<p>No sales data available</p>'
            }
          </div>

          <div class="section">
            <h3 class="section-title">Inventory Summary</h3>
            <div class="stock-grid">
              <div class="stock-item">
                <div class="stat-value" style="font-size: 24px;">${stockSummary.totalItems}</div>
                <div class="stat-label">Total Items</div>
              </div>
              <div class="stock-item">
                <div class="stat-value" style="font-size: 24px;">৳${stockSummary.totalValue.toLocaleString()}</div>
                <div class="stat-label">Stock Value</div>
              </div>
              <div class="stock-item">
                <div class="stat-value" style="font-size: 24px; color: #ffc107;">${stockSummary.lowStockCount}</div>
                <div class="stat-label">Low Stock</div>
              </div>
              <div class="stock-item">
                <div class="stat-value" style="font-size: 24px; color: #dc3545;">${stockSummary.expiringSoon}</div>
                <div class="stat-label">Expiring Soon</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
            <p>This report was generated by MediStock - Pharmacy Management System</p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (Platform.OS === 'web') {
        // For web, download the file
        const link = document.createElement('a');
        link.href = uri;
        link.download = `${pharmacy?.name || 'MediStock'}_${periodText}_Report_${reportDate.replace(/\//g, '-')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert('Success', 'Report downloaded successfully!');
      } else {
        // For mobile, share the file
        await Share.share({
          url: uri,
          title: `${periodText} Sales Report - ${pharmacy?.name}`,
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    }
  };

  const exportToExcel = () => {
    try {
      const periodStats = calculatePeriodStats();
      const topMedicines = getTopMedicines();
      
      // Create CSV content for Excel compatibility
      let csvContent = `${pharmacy?.name || 'MediStock'} - ${reportPeriod.toUpperCase()} SALES REPORT\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      // Sales summary
      csvContent += `SALES SUMMARY\n`;
      csvContent += `Total Sales,৳${periodStats.totalSales}\n`;
      csvContent += `Total Transactions,${periodStats.totalTransactions}\n`;
      csvContent += `Due Amount,৳${periodStats.totalDue}\n`;
      csvContent += `Average Sale,৳${periodStats.totalTransactions > 0 ? (periodStats.totalSales / periodStats.totalTransactions).toFixed(2) : '0'}\n\n`;
      
      // Top medicines
      csvContent += `TOP SELLING MEDICINES\n`;
      csvContent += `Rank,Medicine Name,Quantity Sold,Revenue\n`;
      topMedicines.forEach((medicine, index) => {
        csvContent += `${index + 1},${medicine.name},${medicine.quantity},৳${medicine.revenue.toFixed(2)}\n`;
      });
      
      csvContent += `\n\nREPORT DETAILS\n`;
      csvContent += `Report Period,${reportPeriod}\n`;
      if (reportPeriod === 'daily') {
        csvContent += `Report Date,${selectedDate}\n`;
      }
      csvContent += `Pharmacy,${pharmacy?.name || 'N/A'}\n`;

      if (Platform.OS === 'web') {
        // For web, download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${pharmacy?.name || 'MediStock'}_${reportPeriod}_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert('Success', 'Excel report downloaded successfully!');
      } else {
        // For mobile, share as text (can be opened in Excel)
        Share.share({
          message: csvContent,
          title: `${reportPeriod.toUpperCase()} Sales Report - ${pharmacy?.name}`,
        });
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      Alert.alert('Error', 'Failed to export Excel report. Please try again.');
    }
  };

  const periodStats = calculatePeriodStats();
  const topMedicines = getTopMedicines();
  const stockSummary = getStockSummary();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Sidebar */}
      <Sidebar 
        isVisible={sidebarVisible} 
        onToggle={() => setSidebarVisible(!sidebarVisible)}
        currentRoute="reports"
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
            <Text style={styles.headerTitle}>📈 Reports & Analytics</Text>
            <Text style={styles.headerSubtitle}>
              AI-powered business insights for {pharmacy?.name}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Date Selection */}
        <Card style={styles.section}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Report Date</Text>
          </CardHeader>
          <CardContent>
            <Input
              label="Select Date"
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
            />
            
            <View style={styles.periodButtons}>
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    reportPeriod === period && styles.activePeriodButton,
                  ]}
                  onPress={() => setReportPeriod(period)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    reportPeriod === period && styles.activePeriodButtonText,
                  ]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Generate Report"
              variant="primary"
              onPress={() => loadReports()}
              style={styles.generateButton}
            />
          </CardContent>
        </Card>

        {/* AI Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              !showAIInsights && styles.activeToggleButton
            ]}
            onPress={() => setShowAIInsights(false)}
          >
            <Text style={[
              styles.toggleButtonText,
              !showAIInsights && styles.activeToggleText
            ]}>
              📊 Standard Reports
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              showAIInsights && styles.activeToggleButton
            ]}
            onPress={() => setShowAIInsights(true)}
          >
            <Text style={[
              styles.toggleButtonText,
              showAIInsights && styles.activeToggleText
            ]}>
              🤖 AI Insights
            </Text>
          </TouchableOpacity>
        </View>

        {showAIInsights ? (
          <View style={styles.aiSection}>
            <AIReportsInsights
              salesData={periodStats.periodSales}
              stockData={stockItems}
              customerData={customers}
              period={reportPeriod}
            />
            
            <AISalesAnalytics
              salesData={periodStats.periodSales}
              periodStats={periodStats}
              period={reportPeriod}
            />
            
            <AIRevenueForecast
              historicalSales={sales}
              currentPeriodSales={periodStats.periodSales}
              period={reportPeriod}
            />

            {/* AI Customer Analytics */}
            {customerAnalytics && customerAnalytics.length > 0 && (
              <Card style={styles.section}>
                <CardHeader>
                  <Text style={styles.sectionTitle}>🤖 AI Customer Insights</Text>
                </CardHeader>
                <CardContent>
                  {customerAnalytics.map((analytics: any, index: number) => (
                    <View key={index} style={styles.customerAnalyticsItem}>
                      <Text style={styles.analyticsTitle}>
                        Customer Behavior Analysis
                      </Text>
                      <View style={styles.analyticsStats}>
                        <View style={styles.analyticsStat}>
                          <Text style={styles.analyticsLabel}>Loyalty Score:</Text>
                          <Text style={[styles.analyticsValue, { color: Theme.colors.success }]}>
                            {analytics.profile.loyaltyScore}%
                          </Text>
                        </View>
                        <View style={styles.analyticsStat}>
                          <Text style={styles.analyticsLabel}>Avg Order:</Text>
                          <Text style={styles.analyticsValue}>
                            ৳{analytics.profile.averageOrderValue.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.analyticsStat}>
                          <Text style={styles.analyticsLabel}>Visit Frequency:</Text>
                          <Text style={styles.analyticsValue}>
                            {analytics.profile.visitFrequency}
                          </Text>
                        </View>
                      </View>
                      {analytics.insights.length > 0 && (
                        <View style={styles.insightsContainer}>
                          <Text style={styles.insightsTitle}>💡 AI Insights:</Text>
                          {analytics.insights.slice(0, 2).map((insight: string, idx: number) => (
                            <Text key={idx} style={styles.insightText}>• {insight}</Text>
                          ))}
                        </View>
                      )}
                      {analytics.recommendations.forPharmacy.length > 0 && (
                        <View style={styles.recommendationsContainer}>
                          <Text style={styles.recommendationsTitle}>✅ Recommendations:</Text>
                          {analytics.recommendations.forPharmacy.slice(0, 2).map((rec: string, idx: number) => (
                            <Text key={idx} style={styles.recommendationText}>• {rec}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </CardContent>
              </Card>
            )}
          </View>
        ) : (
          <View style={styles.standardReports}>
            {/* Sales Overview */}
        <Card style={styles.section}>
          <CardHeader>
            <Text style={styles.sectionTitle}>
              {reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Sales Overview
            </Text>
          </CardHeader>
          <CardContent>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>৳{periodStats.totalSales.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Sales</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{periodStats.totalTransactions}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Theme.colors.error }]}>
                  ৳{periodStats.totalDue.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Due Amount</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  ৳{periodStats.totalTransactions > 0 ? (periodStats.totalSales / periodStats.totalTransactions).toFixed(2) : '0'}
                </Text>
                <Text style={styles.statLabel}>Avg. Sale</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Stock Summary */}
        <Card style={styles.section}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Inventory Summary</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stockSummary.totalItems}</Text>
                <Text style={styles.statLabel}>Total Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>৳{stockSummary.totalValue.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Stock Value</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Theme.colors.warning }]}>
                  {stockSummary.lowStockCount}
                </Text>
                <Text style={styles.statLabel}>Low Stock</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Theme.colors.error }]}>
                  {stockSummary.expiringSoon}
                </Text>
                <Text style={styles.statLabel}>Expiring Soon</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Top Medicines */}
        <Card style={styles.section}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Top Selling Medicines</Text>
          </CardHeader>
          <CardContent>
            {topMedicines.length > 0 ? (
              topMedicines.map((medicine, index) => (
                <View key={index} style={styles.topMedicineItem}>
                  <View style={styles.medicineRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName} numberOfLines={1}>
                      {medicine.name}
                    </Text>
                    <Text style={styles.medicineStats}>
                      Sold: {medicine.quantity} • Revenue: ৳{medicine.revenue.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No sales data available</Text>
            )}
          </CardContent>
        </Card>


        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            </CardHeader>
            <CardContent>
              {lowStockItems.map((item, index) => (
                <View key={index} style={styles.lowStockItem}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{item.generic_name}</Text>
                    <Text style={styles.medicineSubtitle}>{item.brand_name}</Text>
                  </View>
                  <View style={styles.stockAlert}>
                    <Text style={[styles.stockQuantity, { color: Theme.colors.warning }]}>
                      {item.current_quantity} left
                    </Text>
                    <Text style={styles.stockThreshold}>
                      Min: {item.threshold}
                    </Text>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Export Actions */}
        <Card style={styles.section}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Export Reports</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.exportButtons}>
              <Button
                title="Export PDF"
                variant="primary"
                onPress={generatePDFReport}
                style={styles.exportButton}
              />
              <Button
                title="Export Excel"
                variant="secondary"
                onPress={exportToExcel}
                style={styles.exportButton}
              />
            </View>
          </CardContent>
        </Card>

          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    fontWeight: theme.typography.weights.bold as any,
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

  section: {
    marginBottom: theme.spacing.lg,
  },

  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  periodButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },

  periodButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center' as const,
  },

  activePeriodButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  periodButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  activePeriodButtonText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
  },

  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.md,
  },

  statItem: {
    flex: 1,
    minWidth: 160,
    alignItems: 'center' as const,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
  },

  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },

  topMedicineItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  medicineRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: theme.spacing.md,
  },

  rankText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.background,
  },

  medicineInfo: {
    flex: 1,
  },

  medicineName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },

  medicineStats: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  medicineSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  customerDueItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: 2,
  },

  customerPhone: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },

  dueAmount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold as any,
  },

  lowStockItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },

  stockAlert: {
    alignItems: 'flex-end' as const,
  },

  stockQuantity: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold as any,
  },

  stockThreshold: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },

  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    padding: theme.spacing.lg,
  },

  exportButtons: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
  },

  exportButton: {
    flex: 1,
  },

  bottomSpacing: {
    height: theme.spacing.xl,
  },

  generateButton: {
    marginTop: theme.spacing.md,
  },

  // AI-specific styles
  viewToggle: {
    flexDirection: 'row' as const,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },

  toggleButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center' as const,
    borderRadius: theme.borderRadius.sm,
  },

  activeToggleButton: {
    backgroundColor: theme.colors.primary,
  },

  toggleButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium as any,
    color: theme.colors.textSecondary,
  },

  activeToggleText: {
    color: theme.colors.background,
    fontWeight: theme.typography.weights.semibold as any,
  },

  aiSection: {
    gap: theme.spacing.lg,
  },

  standardReports: {
    gap: theme.spacing.lg,
  },

  customerAnalyticsItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  analyticsTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  analyticsStats: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },

  analyticsStat: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center' as const,
  },

  analyticsLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },

  analyticsValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.text,
  },

  insightsContainer: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info,
  },

  insightsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.info,
    marginBottom: theme.spacing.xs,
  },

  insightText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },

  recommendationsContainer: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },

  recommendationsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold as any,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },

  recommendationText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },
}));
