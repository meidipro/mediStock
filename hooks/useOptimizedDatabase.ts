// =============================================
// OPTIMIZED DATABASE HOOKS FOR 100+ USERS
// =============================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Pagination interface
interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
}

// Optimized Invoice Management
export const useOptimizedInvoices = () => {
  const { pharmacy } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get invoices with pagination
  const getInvoices = useCallback(async (
    options: PaginationOptions = { page: 1, limit: 20 },
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      paymentStatus?: string;
      customerId?: string;
    }
  ): Promise<PaginatedResult<any>> => {
    if (!pharmacy?.id) throw new Error('No pharmacy selected');

    try {
      setLoading(true);
      setError(null);

      const offset = (options.page - 1) * options.limit;
      
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, phone),
          invoice_items(
            id,
            medicine_id,
            quantity,
            unit_price,
            total_amount,
            medicine:medicines(generic_name, brand_name)
          )
        `, { count: 'exact' })
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + options.limit - 1);

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('invoice_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('invoice_date', filters.dateTo);
      }
      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        totalCount: count || 0,
        hasMore: (offset + options.limit) < (count || 0),
        currentPage: options.page
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invoices';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  // Create invoice with optimized batch operation
  const createInvoice = useCallback(async (invoiceData: {
    customer_id?: string;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    payment_method: string;
    payment_status: string;
    notes?: string;
    items: Array<{
      medicine_id: string;
      quantity: number;
      unit_price: number;
      total_amount: number;
      batch_number?: string;
      expiry_date?: string;
    }>;
  }) => {
    if (!pharmacy?.id) throw new Error('No pharmacy selected');

    try {
      setLoading(true);
      setError(null);

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      const invoice = {
        invoice_number: invoiceNumber,
        customer_id: invoiceData.customer_id || '',
        total_amount: invoiceData.total_amount,
        paid_amount: invoiceData.paid_amount,
        due_amount: invoiceData.due_amount,
        payment_method: invoiceData.payment_method,
        payment_status: invoiceData.payment_status,
        invoice_date: new Date().toISOString().split('T')[0],
        notes: invoiceData.notes || ''
      };

      const { data, error } = await supabase.rpc('create_invoice_with_items', {
        invoice_data: invoice,
        items_data: invoiceData.items
      });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create invoice';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  // Get dashboard stats (optimized)
  const getDashboardStats = useCallback(async (date?: string) => {
    if (!pharmacy?.id) return null;

    try {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        pharmacy_id_param: pharmacy.id,
        date_param: date || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Dashboard stats error:', err);
      return null;
    }
  }, [pharmacy?.id]);

  return {
    loading,
    error,
    getInvoices,
    createInvoice,
    getDashboardStats
  };
};

// Optimized Medicine Search with Pagination
export const useOptimizedMedicineSearch = () => {
  const { pharmacy } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMedicines = useCallback(async (
    query: string,
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<any>> => {
    if (!pharmacy?.id) throw new Error('No pharmacy selected');

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('search_medicines_paginated', {
        search_term: query.trim(),
        pharmacy_id_param: pharmacy.id,
        page_size: options.limit,
        page_offset: (options.page - 1) * options.limit
      });

      if (error) throw error;

      const totalCount = data.length > 0 ? data[0].total_count : 0;

      return {
        data: data || [],
        totalCount,
        hasMore: (options.page * options.limit) < totalCount,
        currentPage: options.page
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  return {
    loading,
    error,
    searchMedicines
  };
};

// Cache Management Hook
export const useCacheManager = () => {
  const cacheTimeout = 5 * 60 * 1000; // 5 minutes
  const cache = new Map<string, { data: any; timestamp: number }>();

  const getCachedData = useCallback((key: string) => {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cacheTimeout) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }, [cacheTimeout]);

  const setCachedData = useCallback((key: string, data: any) => {
    cache.set(key, { data, timestamp: Date.now() });
    
    // Cleanup old cache entries
    if (cache.size > 100) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        cache.delete(entries[i][0]);
      }
    }
  }, []);

  const clearCache = useCallback(() => {
    cache.clear();
  }, []);

  return {
    getCachedData,
    setCachedData,
    clearCache
  };
};

// Real-time Updates Hook
export const useRealTimeUpdates = (tableName: string, pharmacyId?: string) => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!pharmacyId) return;

    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `pharmacy_id=eq.${pharmacyId}`
        },
        (payload) => {
          console.log(`Real-time update on ${tableName}:`, payload);
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, pharmacyId]);

  return lastUpdate;
};

// Connection Pool Management
export const useConnectionOptimization = () => {
  const [connectionCount, setConnectionCount] = useState(0);

  const executeWithConnection = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    setConnectionCount(prev => prev + 1);
    
    try {
      const result = await operation();
      return result;
    } finally {
      setConnectionCount(prev => prev - 1);
    }
  }, []);

  // Batch multiple operations
  const executeBatch = useCallback(async <T>(
    operations: Array<() => Promise<T>>
  ): Promise<T[]> => {
    setConnectionCount(prev => prev + 1);
    
    try {
      const results = await Promise.all(operations.map(op => op()));
      return results;
    } finally {
      setConnectionCount(prev => prev - 1);
    }
  }, []);

  return {
    connectionCount,
    executeWithConnection,
    executeBatch
  };
};

// Performance Monitoring Hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<{
    apiCalls: number;
    averageResponseTime: number;
    errorRate: number;
  }>({
    apiCalls: 0,
    averageResponseTime: 0,
    errorRate: 0
  });

  const trackApiCall = useCallback((duration: number, success: boolean) => {
    setMetrics(prev => ({
      apiCalls: prev.apiCalls + 1,
      averageResponseTime: (prev.averageResponseTime * (prev.apiCalls - 1) + duration) / prev.apiCalls,
      errorRate: success 
        ? (prev.errorRate * (prev.apiCalls - 1)) / prev.apiCalls
        : (prev.errorRate * (prev.apiCalls - 1) + 1) / prev.apiCalls
    }));
  }, []);

  const resetMetrics = useCallback(() => {
    setMetrics({
      apiCalls: 0,
      averageResponseTime: 0,
      errorRate: 0
    });
  }, []);

  return {
    metrics,
    trackApiCall,
    resetMetrics
  };
};