import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Customer,
    DailyReport,
    LowStockItem,
    Medicine,
    MedicineSearchResult,
    Sale,
    SaleItem,
    StockItem
} from '../lib/types';

// Medicine hooks
export const useMedicines = () => {
  const { pharmacy } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌐 Fetching global medicines database...');
      
      // Try to fetch from global medicine database first
      const { data: globalData, error: globalError } = await supabase
        .from('global_medicine_database')
        .select('*')
        .eq('is_active', true)
        .order('generic_name')
        .limit(1000); // Limit for performance
      
      if (globalError) {
        console.warn('⚠️ Global medicine database not available, trying regular medicines:', globalError);
        
        // Fallback to regular medicines table
        const { data: regularData, error: regularError } = await supabase
          .from('medicines')
          .select('*')
          .eq('is_active', true)
          .order('generic_name')
          .limit(1000);
        
        if (regularError) throw regularError;
        
        console.log(`📋 Loaded ${regularData?.length || 0} medicines (regular table)`);
        // Transform regular medicines to match expected format
        const transformedData = regularData?.map(med => ({
          ...med,
          name: med.name || med.generic_name,
          therapeutic_class: med.therapeutic_class || med.category
        })) || [];
        setMedicines(transformedData);
      } else {
        console.log(`📋 Loaded ${globalData?.length || 0} medicines (global database)`);
        // Transform global medicines to match expected format
        const transformedData = globalData?.map(med => ({
          ...med,
          name: med.generic_name,
          therapeutic_group: med.therapeutic_class
        })) || [];
        setMedicines(transformedData);
      }
    } catch (err) {
      console.error('❌ Error fetching medicines:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch medicines');
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllMedicines = useCallback(async (): Promise<Medicine[]> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌐 Getting all global medicines...');
      
      // Try to fetch from global medicine database first
      const { data: globalData, error: globalError } = await supabase
        .from('global_medicine_database')
        .select('*')
        .eq('is_active', true)
        .order('generic_name')
        .limit(2000); // Higher limit for getAllMedicines
      
      if (globalError) {
        console.warn('⚠️ Global medicine database not available, trying regular medicines:', globalError);
        
        // Fallback to regular medicines table
        const { data: regularData, error: regularError } = await supabase
          .from('medicines')
          .select('*')
          .eq('is_active', true)
          .order('generic_name')
          .limit(2000);
        
        if (regularError) throw regularError;
        
        // Transform regular medicines to match expected format
        const transformedData = regularData?.map(med => ({
          ...med,
          name: med.name || med.generic_name,
          therapeutic_class: med.therapeutic_class || med.category
        })) || [];
        setMedicines(transformedData);
        return transformedData;
      } else {
        // Transform global medicines to match expected format
        const transformedData = globalData?.map(med => ({
          ...med,
          name: med.generic_name,
          therapeutic_group: med.therapeutic_class
        })) || [];
        setMedicines(transformedData);
        return transformedData;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch medicines');
      return [];
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  const getTherapeuticClasses = useCallback((): string[] => {
    const classes = new Set(medicines.map(medicine => medicine.category || medicine.therapeutic_group).filter(Boolean));
    return Array.from(classes).sort() as string[];
  }, [medicines]);

  const searchMedicines = useCallback(async (query: string, pharmacyId?: string): Promise<MedicineSearchResult[]> => {
    try {
      // First try the optimized search function
      const { data, error: searchError } = await supabase
        .rpc('search_medicines_optimized', {
          search_term: query,
          pharmacy_id_param: pharmacyId,
          page_size: 20,
          page_offset: 0,
        });

      if (searchError) {
        console.warn('Optimized search failed, falling back to barcode search:', searchError);
        // Fallback to barcode search if optimized function doesn't exist
        const { data: barcodeData, error: barcodeError } = await supabase
          .rpc('search_medicines_with_barcode', {
            search_term: query,
            pharmacy_id_param: pharmacyId,
          });
        
        if (barcodeError) {
          console.warn('Barcode search failed, falling back to basic search:', barcodeError);
          // Final fallback to basic search
          const { data: fallbackData, error: fallbackError } = await supabase
            .rpc('search_medicines', {
              search_term: query,
              pharmacy_id_param: pharmacyId,
            });
          
          if (fallbackError) throw fallbackError;
          return fallbackData || [];
        }
        
        return barcodeData || [];
      }

      // Transform optimized search results to match expected format
      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        generic_name: item.generic_name,
        brand_name: item.brand_name,
        manufacturer: item.manufacturer,
        strength: item.strength,
        form: item.form,
        category: item.category,
        current_stock: item.current_stock,
        unit_price: item.unit_price,
        barcode_number: null, // Would need to be added to optimized function
        match_type: item.is_low_stock ? 'low_stock' : 'normal',
        rank: 1, // Default rank
      }));
    } catch (err) {
      console.error('Search medicines error:', err);
      return [];
    }
  }, []);

  const searchMedicinesByBarcode = useCallback(async (barcode: string, pharmacyId?: string): Promise<MedicineSearchResult[]> => {
    try {
      console.log('🔍 Searching medicine by barcode:', barcode);
      
      const { data, error: searchError } = await supabase
        .from('medicines')
        .select(`
          id,
          name,
          generic_name,
          brand_name,
          manufacturer,
          strength,
          form,
          category,
          barcode_number
        `)
        .eq('barcode_number', barcode)
        .eq('is_active', true)
        .limit(1);

      if (searchError) throw searchError;
      
      // Transform to MedicineSearchResult format
      const results = (data || []).map(med => ({
        ...med,
        rank: 100, // High rank for exact barcode match
        current_stock: 0, // Will be filled by stock data if needed
        unit_price: 0
      }));

      console.log('📱 Barcode search results:', results.length);
      return results;
    } catch (err) {
      console.error('Barcode search error:', err);
      return [];
    }
  }, []);

  const addMedicine = useCallback(async (medicineData: Partial<Medicine>) => {
    try {
      // Ensure pharmacy_id is included if we have a pharmacy
      const dataToInsert = {
        ...medicineData,
        ...(pharmacy?.id && { pharmacy_id: pharmacy.id })
      };
      
      console.log('💊 Adding medicine with data:', dataToInsert);
      
      const { data, error: addError } = await supabase
        .from('medicines')
        .insert(dataToInsert)
        .select()
        .single();

      if (addError) {
        console.error('❌ Error adding medicine:', addError);
        throw addError;
      }
      
      console.log('✅ Medicine added successfully:', data);
      await fetchMedicines(); // Refresh list
      return { data, error: null };
    } catch (err) {
      console.error('💥 Exception in addMedicine:', err);
      const error = err instanceof Error ? err.message : 'Failed to add medicine';
      return { data: null, error };
    }
  }, [fetchMedicines, pharmacy?.id]);

  return {
    medicines,
    loading,
    error,
    fetchMedicines,
    searchMedicines,
    searchMedicinesByBarcode,
    addMedicine,
    getAllMedicines,
    getTherapeuticClasses,
  };
};

// Stock hooks with real-time updates
export const useStock = () => {
  const { pharmacy } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStock = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('stock')
        .select(`
          *,
          medicines (
            id,
            generic_name,
            brand_name,
            manufacturer,
            strength,
            form,
            category
          )
        `)
        .eq('pharmacy_id', pharmacy.id)
        .gt('quantity', 0)
        .order('last_updated', { ascending: false });

      if (fetchError) throw fetchError;
      
      const formattedStock = (data || []).map(item => ({
        ...item,
        medicine: item.medicines,
      })) as StockItem[];

      setStockItems(formattedStock);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock');
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  const fetchLowStock = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      // Try the optimized function first
      const { data, error: fetchError } = await supabase
        .rpc('get_low_stock_medicines', {
          pharmacy_id_param: pharmacy.id,
          limit_param: 50,
        });

      if (fetchError) {
        console.warn('Optimized low stock function failed, falling back to old function:', fetchError);
        // Fallback to old function if optimized one doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_low_stock_items', {
            pharmacy_id_param: pharmacy.id,
            threshold_param: 10,
          });
        
        if (fallbackError) throw fallbackError;
        setLowStockItems(fallbackData || []);
        return;
      }

      // Transform optimized function results to match expected format
      const transformedData = (data || []).map(item => ({
        medicine_id: item.id,
        generic_name: item.generic_name,
        brand_name: item.name, // Using name as brand_name fallback
        current_quantity: item.current_stock,
        threshold: item.minimum_stock,
        batch_number: '', // Not available in optimized function
        expiry_date: '', // Not available in optimized function
      }));

      setLowStockItems(transformedData);
    } catch (err) {
      console.error('Fetch low stock error:', err);
    }
  }, [pharmacy?.id]);

  const addStock = useCallback(async (stockData: {
    medicine_id: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
    batch_number?: string;
    expiry_date?: string;
    supplier?: string;
    minimum_stock?: number;
  }) => {
    console.log('🏪 addStock called with:', stockData);
    console.log('🔍 Pharmacy ID:', pharmacy?.id);
    
    if (!pharmacy?.id) {
      console.error('❌ No pharmacy selected');
      return { data: null, error: 'No pharmacy selected' };
    }

    try {
      const insertData = {
        ...stockData,
        pharmacy_id: pharmacy.id,
      };
      
      console.log('📤 Inserting stock data:', insertData);
      
      const { data, error: addError } = await supabase
        .from('stock')
        .insert(insertData)
        .select()
        .single();

      console.log('📥 Supabase response:', { data, error: addError });

      if (addError) {
        console.error('❌ Supabase error:', addError);
        throw addError;
      }
      
      console.log('✅ Stock inserted successfully, refreshing...');
      await fetchStock(); // Refresh stock
      return { data, error: null };
    } catch (err) {
      console.error('💥 Exception in addStock:', err);
      const error = err instanceof Error ? err.message : 'Failed to add stock';
      return { data: null, error };
    }
  }, [pharmacy?.id, fetchStock]);

  const updateStock = useCallback(async (stockId: string, updates: Partial<StockItem>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('stock')
        .update(updates)
        .eq('id', stockId)
        .select()
        .single();

      if (updateError) throw updateError;
      await fetchStock(); // Refresh stock
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update stock';
      return { data: null, error };
    }
  }, [fetchStock]);

  // Real-time subscription for stock updates
  useEffect(() => {
    if (!pharmacy?.id) return;

    console.log('🔄 Setting up real-time stock subscription for pharmacy:', pharmacy.id);

    const stockSubscription = supabase
      .channel(`stock_changes_${pharmacy.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock',
          filter: `pharmacy_id=eq.${pharmacy.id}`,
        },
        (payload) => {
          console.log('📦 Stock update received:', payload.eventType, payload.new);
          setLastUpdated(new Date());
          
          // Optimistically update stock items for better UX
          if (payload.eventType === 'UPDATE' && payload.new) {
            setStockItems(prev => prev.map(item => 
              item.id === payload.new.id 
                ? { ...item, ...payload.new, medicine: item.medicine }
                : item
            ));
          } else if (payload.eventType === 'INSERT' && payload.new) {
            // For new items, we'll need to fetch to get medicine details
            fetchStock();
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setStockItems(prev => prev.filter(item => item.id !== payload.old.id));
          }
          
          // Refresh low stock alerts when stock changes
          fetchLowStock();
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up stock subscription');
      supabase.removeChannel(stockSubscription);
    };
  }, [pharmacy?.id, fetchStock, fetchLowStock]);

  useEffect(() => {
    fetchStock();
    fetchLowStock();
  }, [fetchStock, fetchLowStock]);

  return {
    stockItems,
    lowStockItems,
    loading,
    error,
    lastUpdated,
    fetchStock,
    fetchLowStock,
    addStock,
    updateStock,
  };
};

// Sales hooks
export const useSales = () => {
  const { pharmacy, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async (limit: number = 50) => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (
            id,
            name,
            phone
          )
        `)
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      
      const formattedSales = (data || []).map(sale => ({
        ...sale,
        customer_name: sale.customers?.name,
        items: Array.isArray(sale.items) ? sale.items : [],
      })) as Sale[];

      setSales(formattedSales);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  const createSale = useCallback(async (saleData: {
    customer_id?: string;
    items: SaleItem[];
    subtotal: number;
    discount_percentage?: number;
    discount_amount?: number;
    tax_percentage?: number;
    tax_amount?: number;
    total_amount: number;
    paid_amount: number;
    payment_method: string;
    notes?: string;
  }) => {
    if (!pharmacy?.id || !user?.id) {
      return { data: null, error: 'Authentication required' };
    }

    try {
      // Generate bill number
      const billNumber = `INV-${Date.now()}`;

      const { data, error: createError } = await supabase
        .from('sales')
        .insert({
          ...saleData,
          pharmacy_id: pharmacy.id,
          created_by: user.id,
          bill_number: billNumber,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      await fetchSales(); // Refresh sales
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create sale';
      return { data: null, error };
    }
  }, [pharmacy?.id, user?.id, fetchSales]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return {
    sales,
    loading,
    error,
    fetchSales,
    createSale,
  };
};

// Customer hooks
export const useCustomers = () => {
  const { pharmacy } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;
      setCustomers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  const addCustomer = useCallback(async (customerData: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    date_of_birth?: string;
    gender?: string;
  }) => {
    if (!pharmacy?.id) return { data: null, error: 'No pharmacy selected' };

    try {
      const { data, error: addError } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          pharmacy_id: pharmacy.id,
        })
        .select()
        .single();

      if (addError) throw addError;
      await fetchCustomers(); // Refresh customers
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add customer';
      return { data: null, error };
    }
  }, [pharmacy?.id, fetchCustomers]);

  const searchCustomers = useCallback(async (query: string): Promise<Customer[]> => {
    if (!pharmacy?.id || !query.trim()) return [];

    try {
      const { data, error: searchError } = await supabase
        .from('customers')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('name')
        .limit(10);

      if (searchError) throw searchError;
      return data || [];
    } catch (err) {
      console.error('Search customers error:', err);
      return [];
    }
  }, [pharmacy?.id]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    addCustomer,
    searchCustomers,
  };
};

// Reports hooks
export const useReports = () => {
  const { pharmacy } = useAuth();
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDailyReport = useCallback(async (date?: string) => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);
      setError(null);

      const reportDate = date || new Date().toISOString().split('T')[0];
      const startOfDay = `${reportDate}T00:00:00.000Z`;
      const endOfDay = `${reportDate}T23:59:59.999Z`;
      
      console.log('📊 Generating daily report for:', reportDate);
      
      // Calculate today's sales from sales table
      let todaySales: any[] = [];
      let salesError: any = null;
      
      try {
        const salesResult = await supabase
          .from('sales')
          .select('total_amount, paid_amount, due_amount, created_at')
          .eq('pharmacy_id', pharmacy.id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .eq('status', 'completed');
        
        todaySales = salesResult.data || [];
        salesError = salesResult.error;
      } catch (err) {
        console.warn('Sales table might not exist or have different structure:', err);
        salesError = err;
      }

      if (salesError) {
        console.warn('Error fetching sales data:', salesError);
      }

      // Calculate today's invoices from invoices table
      let todayInvoices: any[] = [];
      let invoicesError: any = null;
      
      try {
        const invoicesResult = await supabase
          .from('invoices')
          .select('total_amount, paid_amount, due_amount, created_at')
          .eq('pharmacy_id', pharmacy.id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .in('status', ['paid', 'partial', 'due']);
        
        todayInvoices = invoicesResult.data || [];
        invoicesError = invoicesResult.error;
      } catch (err) {
        console.warn('Invoices table might not exist or have different structure:', err);
        invoicesError = err;
      }

      if (invoicesError) {
        console.warn('Error fetching invoices data:', invoicesError);
      }

      // Also check local storage for invoices (fallback)
      let localStorageInvoices: any[] = [];
      try {
        if (typeof window !== 'undefined') {
          const storageKey = `invoices_${pharmacy?.id || 'default'}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsedInvoices = JSON.parse(stored);
            // Filter for today's invoices
            const today = new Date().toISOString().split('T')[0];
            localStorageInvoices = parsedInvoices.filter((invoice: any) => {
              const invoiceDate = new Date(invoice.date).toISOString().split('T')[0];
              return invoiceDate === today;
            });
            console.log('📋 Found', localStorageInvoices.length, 'invoices in local storage for today');
          }
        }
      } catch (err) {
        console.warn('Error reading invoices from local storage:', err);
      }

      // Combine database and local storage invoices
      const allTodayInvoices = [...todayInvoices, ...localStorageInvoices];

      // Calculate total due amount from all outstanding invoices (not just today)
      let allDueInvoices: any[] = [];
      let dueError: any = null;
      
      try {
        const dueResult = await supabase
          .from('invoices')
          .select('due_amount, total_amount, paid_amount, created_at, status')
          .eq('pharmacy_id', pharmacy.id)
          .in('status', ['partial', 'due', 'overdue'])
          .gt('due_amount', 0);
        
        allDueInvoices = dueResult.data || [];
        dueError = dueResult.error;
      } catch (err) {
        console.warn('Error fetching due invoices:', err);
        dueError = err;
      }

      if (dueError) {
        console.warn('Error fetching due invoices:', dueError);
      }

      // Also check local storage for due invoices
      let localStorageDueInvoices: any[] = [];
      try {
        if (typeof window !== 'undefined') {
          const storageKey = `invoices_${pharmacy?.id || 'default'}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsedInvoices = JSON.parse(stored);
            // Filter for due invoices
            localStorageDueInvoices = parsedInvoices.filter((invoice: any) => {
              return invoice.due > 0 && ['partial', 'due', 'overdue'].includes(invoice.status);
            });
            console.log('📋 Found', localStorageDueInvoices.length, 'due invoices in local storage');
          }
        }
      } catch (err) {
        console.warn('Error reading due invoices from local storage:', err);
      }

      // Combine database and local storage due invoices
      const allDueInvoicesCombined = [...allDueInvoices, ...localStorageDueInvoices];

      // Calculate top medicines from today's sales
      let topMedicines: any[] = [];
      
      try {
        const topMedicinesResult = await supabase
          .from('sales')
          .select('items')
          .eq('pharmacy_id', pharmacy.id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .eq('status', 'completed');
        
        topMedicines = topMedicinesResult.data || [];
        if (topMedicinesResult.error) {
          console.warn('Error fetching top medicines:', topMedicinesResult.error);
        }
      } catch (err) {
        console.warn('Error fetching top medicines:', err);
      }

      // Process sales data
      const salesTotal = todaySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const salesTransactions = todaySales?.length || 0;

      // Process invoices data (using combined database + local storage)
      const invoicesTotal = allTodayInvoices?.reduce((sum, invoice) => {
        // Handle both database format (total_amount) and local storage format (total)
        return sum + (invoice.total_amount || invoice.total || 0);
      }, 0) || 0;
      const invoicesTransactions = allTodayInvoices?.length || 0;

      // Combine sales and invoices for today's total
      const totalSales = salesTotal + invoicesTotal;
      const totalTransactions = salesTransactions + invoicesTransactions;

      // Calculate total due amount (using combined database + local storage)
      const totalDue = allDueInvoicesCombined?.reduce((sum, invoice) => {
        // Handle both database format (due_amount) and local storage format (due)
        return sum + (invoice.due_amount || invoice.due || 0);
      }, 0) || 0;

      // Calculate total sales from all time (for additional context)
      let allTimeSales: any[] = [];
      let allTimeInvoices: any[] = [];
      
      try {
        const allTimeSalesResult = await supabase
          .from('sales')
          .select('total_amount, created_at')
          .eq('pharmacy_id', pharmacy.id)
          .eq('status', 'completed');
        
        allTimeSales = allTimeSalesResult.data || [];
        if (allTimeSalesResult.error) {
          console.warn('Error fetching all-time sales:', allTimeSalesResult.error);
        }
      } catch (err) {
        console.warn('Error fetching all-time sales:', err);
      }

      try {
        const allTimeInvoicesResult = await supabase
          .from('invoices')
          .select('total_amount, created_at')
          .eq('pharmacy_id', pharmacy.id)
          .in('status', ['paid', 'partial', 'due']);
        
        allTimeInvoices = allTimeInvoicesResult.data || [];
        if (allTimeInvoicesResult.error) {
          console.warn('Error fetching all-time invoices:', allTimeInvoicesResult.error);
        }
      } catch (err) {
        console.warn('Error fetching all-time invoices:', err);
      }

      // Also get all-time invoices from local storage
      let localStorageAllTimeInvoices: any[] = [];
      try {
        if (typeof window !== 'undefined') {
          const storageKey = `invoices_${pharmacy?.id || 'default'}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsedInvoices = JSON.parse(stored);
            localStorageAllTimeInvoices = parsedInvoices.filter((invoice: any) => {
              return ['paid', 'partial', 'due'].includes(invoice.status);
            });
            console.log('📋 Found', localStorageAllTimeInvoices.length, 'all-time invoices in local storage');
          }
        }
      } catch (err) {
        console.warn('Error reading all-time invoices from local storage:', err);
      }

      // Combine database and local storage all-time invoices
      const allTimeInvoicesCombined = [...allTimeInvoices, ...localStorageAllTimeInvoices];

      const allTimeSalesTotal = allTimeSales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const allTimeInvoicesTotal = allTimeInvoicesCombined?.reduce((sum, invoice) => {
        // Handle both database format (total_amount) and local storage format (total)
        return sum + (invoice.total_amount || invoice.total || 0);
      }, 0) || 0;
      const totalAllTimeSales = allTimeSalesTotal + allTimeInvoicesTotal;

      // Process top medicines
      let topMedicinesList: any[] = [];
      if (topMedicines) {
        const medicineStats: { [key: string]: { quantity: number; total_amount: number; medicine_name: string } } = {};
        
        topMedicines.forEach(sale => {
          if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach((item: any) => {
              const medicineName = item.medicine_name || item.medicineName || 'Unknown Medicine';
              if (medicineStats[medicineName]) {
                medicineStats[medicineName].quantity += item.quantity || 0;
                medicineStats[medicineName].total_amount += item.total_price || item.total || 0;
              } else {
                medicineStats[medicineName] = {
                  quantity: item.quantity || 0,
                  total_amount: item.total_price || item.total || 0,
                  medicine_name: medicineName,
                };
              }
            });
          }
        });

        topMedicinesList = Object.values(medicineStats)
          .sort((a, b) => b.total_amount - a.total_amount)
          .slice(0, 5);
      }

      const reportData = {
        total_sales: totalSales,
        total_transactions: totalTransactions,
        total_due: totalDue,
        top_medicines: topMedicinesList,
        low_stock_count: 0, // This will be calculated by useStock hook
        // Additional data for better insights
        all_time_sales: totalAllTimeSales,
        all_time_transactions: (allTimeSales?.length || 0) + (allTimeInvoicesCombined?.length || 0),
        due_invoices_count: allDueInvoicesCombined?.length || 0,
        today_sales_breakdown: {
          sales_amount: salesTotal,
          invoices_amount: invoicesTotal,
          sales_count: salesTransactions,
          invoices_count: invoicesTransactions,
        },
      };

      // If no data found, show a message in console
      if (totalSales === 0 && totalDue === 0 && totalAllTimeSales === 0) {
        console.log('📊 No sales or invoices found in database. Dashboard will show zeros.');
        console.log('💡 To see data, create some invoices using the "Create Invoice" button.');
      }

      console.log('📊 Daily report generated:', reportData);
      console.log('📊 Data breakdown:', {
        todaySales: todaySales?.length || 0,
        todayInvoices: allTodayInvoices?.length || 0,
        todayInvoicesDB: todayInvoices?.length || 0,
        todayInvoicesLocal: localStorageInvoices?.length || 0,
        allTimeSales: allTimeSales?.length || 0,
        allTimeInvoices: allTimeInvoicesCombined?.length || 0,
        allTimeInvoicesDB: allTimeInvoices?.length || 0,
        allTimeInvoicesLocal: localStorageAllTimeInvoices?.length || 0,
        dueInvoices: allDueInvoicesCombined?.length || 0,
        dueInvoicesDB: allDueInvoices?.length || 0,
        dueInvoicesLocal: localStorageDueInvoices?.length || 0,
        salesTotal,
        invoicesTotal,
        totalSales,
        totalDue,
        totalAllTimeSales,
      });
      setDailyReport(reportData);

    } catch (err) {
      console.error('Error generating daily report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      
      // Set default values on error
      setDailyReport({
        total_sales: 0,
        total_transactions: 0,
        total_due: 0,
        top_medicines: [],
        low_stock_count: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  return {
    dailyReport,
    loading,
    error,
    generateDailyReport,
  };
};

// Enhanced Invoice hooks using optimized database functions
export const useInvoices = () => {
  const { pharmacy, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (limit: number = 50) => {
    if (!pharmacy?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (
            id,
            name,
            phone
          ),
          invoice_items (
            *,
            medicines (
              id,
              generic_name,
              brand_name
            )
          )
        `)
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setInvoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  const createInvoice = useCallback(async (invoiceData: {
    customer_id?: string;
    customer_name?: string;
    items: any[];
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    payment_method: string;
    notes?: string;
  }) => {
    if (!pharmacy?.id || !user?.id) {
      return { data: null, error: 'No pharmacy or user found' };
    }

    try {
      setLoading(true);

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Try to use the optimized invoice creation function
      const { data, error: createError } = await supabase
        .rpc('create_invoice_with_items', {
          invoice_data: JSON.stringify({
            invoice_number: invoiceNumber,
            customer_id: invoiceData.customer_id,
            total_amount: invoiceData.total_amount,
            paid_amount: invoiceData.paid_amount,
            due_amount: invoiceData.due_amount,
            payment_method: invoiceData.payment_method,
            status: invoiceData.due_amount > 0 ? 'partial' : 'paid',
            invoice_date: new Date().toISOString().split('T')[0],
            notes: invoiceData.notes,
          }),
          items_data: JSON.stringify(invoiceData.items),
        });

      if (createError) {
        console.warn('Optimized invoice creation failed, using manual process:', createError);

        // Fallback to manual invoice creation
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            pharmacy_id: pharmacy.id,
            customer_id: invoiceData.customer_id,
            total_amount: invoiceData.total_amount,
            paid_amount: invoiceData.paid_amount,
            due_amount: invoiceData.due_amount,
            payment_method: invoiceData.payment_method,
            status: invoiceData.due_amount > 0 ? 'partial' : 'paid',
            invoice_date: new Date().toISOString().split('T')[0],
            notes: invoiceData.notes,
            created_by: user.id,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Insert invoice items
        const itemsToInsert = invoiceData.items.map(item => ({
          invoice_id: invoice.id,
          medicine_id: item.medicine_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // Update stock quantities
        for (const item of invoiceData.items) {
          const { error: stockError } = await supabase
            .from('stock')
            .update({
              quantity: supabase.sql`quantity - ${item.quantity}`,
              updated_at: new Date().toISOString(),
            })
            .eq('medicine_id', item.medicine_id);

          if (stockError) {
            console.error('Failed to update stock for medicine:', item.medicine_id, stockError);
          }
        }
      }

      await fetchInvoices(); // Refresh invoices
      return { data: data || true, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create invoice';
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id, user?.id, fetchInvoices]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
  };
};

// Real-time subscriptions hook
export const useRealtimeSubscription = (
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  const { pharmacy } = useAuth();

  useEffect(() => {
    if (!pharmacy?.id) return;

    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter || `pharmacy_id=eq.${pharmacy.id}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback, filter, pharmacy?.id]);
};