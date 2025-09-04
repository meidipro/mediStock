import { supabase } from './supabase';

export interface DeliveryRequest {
  id: string;
  pharmacy_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  medicines: DeliveryMedicine[];
  total_amount: number;
  delivery_fee: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
  payment_method: 'cash_on_delivery' | 'prepaid' | 'due';
  payment_status: 'pending' | 'paid' | 'failed';
  delivery_partner?: string;
  tracking_number?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryMedicine {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  prescription_required: boolean;
  prescription_image?: string;
  special_instructions?: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  contact_phone: string;
  contact_email: string;
  service_areas: string[];
  delivery_fee_per_km: number;
  minimum_order_amount: number;
  average_delivery_time: number; // in minutes
  rating: number;
  is_active: boolean;
  specialties: string[]; // e.g., 'medicine_delivery', 'urgent_delivery'
}

export interface DeliveryZone {
  area_name: string;
  delivery_fee: number;
  estimated_time: number; // in minutes
  available_partners: string[];
  is_serviced: boolean;
}

export interface DeliveryAnalytics {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  average_delivery_time: number;
  total_delivery_revenue: number;
  top_delivery_areas: Array<{ area: string; count: number }>;
  delivery_partner_performance: Array<{ partner: string; success_rate: number; avg_time: number }>;
}

export class MedicineDeliveryService {
  private static readonly DELIVERY_PARTNERS: DeliveryPartner[] = [
    {
      id: 'pathao',
      name: 'Pathao',
      contact_phone: '+880-123456789',
      contact_email: 'medicine@pathao.com',
      service_areas: ['Dhaka', 'Chittagong', 'Sylhet'],
      delivery_fee_per_km: 15,
      minimum_order_amount: 200,
      average_delivery_time: 45,
      rating: 4.5,
      is_active: true,
      specialties: ['medicine_delivery', 'urgent_delivery'],
    },
    {
      id: 'foodpanda',
      name: 'Foodpanda',
      contact_phone: '+880-987654321',
      contact_email: 'pharmacy@foodpanda.com',
      service_areas: ['Dhaka', 'Chittagong'],
      delivery_fee_per_km: 12,
      minimum_order_amount: 150,
      average_delivery_time: 60,
      rating: 4.2,
      is_active: true,
      specialties: ['medicine_delivery'],
    },
    {
      id: 'uber_eats',
      name: 'Uber Eats',
      contact_phone: '+880-555555555',
      contact_email: 'pharmacy@ubereats.com',
      service_areas: ['Dhaka'],
      delivery_fee_per_km: 18,
      minimum_order_amount: 300,
      average_delivery_time: 40,
      rating: 4.3,
      is_active: true,
      specialties: ['urgent_delivery'],
    },
  ];

  /**
   * Create a new delivery request
   */
  static async createDeliveryRequest(
    pharmacyId: string,
    customerData: {
      name: string;
      phone: string;
      address: string;
    },
    medicines: DeliveryMedicine[],
    paymentMethod: 'cash_on_delivery' | 'prepaid' | 'due' = 'cash_on_delivery'
  ): Promise<DeliveryRequest> {
    try {
      console.log('🚚 Creating delivery request for pharmacy:', pharmacyId);

      // Calculate total amount
      const totalAmount = medicines.reduce((sum, med) => sum + med.total_price, 0);
      
      // Determine delivery fee
      const deliveryFee = await this.calculateDeliveryFee(customerData.address, totalAmount);
      
      // Check if delivery is available in the area
      const deliveryZone = await this.getDeliveryZone(customerData.address);
      if (!deliveryZone.is_serviced) {
        throw new Error('Delivery not available in this area');
      }

      // Create delivery request
      const deliveryRequest: Omit<DeliveryRequest, 'id' | 'created_at' | 'updated_at'> = {
        pharmacy_id: pharmacyId,
        customer_id: `customer_${Date.now()}`, // In real app, this would be a proper customer ID
        customer_name: customerData.name,
        customer_phone: customerData.phone,
        customer_address: customerData.address,
        medicines,
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'prepaid' ? 'paid' : 'pending',
        estimated_delivery_time: this.calculateEstimatedDeliveryTime(deliveryZone),
      };

      // Save to database
      const { data, error } = await supabase
        .from('delivery_requests')
        .insert([{
          ...deliveryRequest,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Auto-assign delivery partner if possible
      await this.autoAssignDeliveryPartner(data.id, deliveryZone);

      return data;

    } catch (error) {
      console.error('❌ Error creating delivery request:', error);
      throw error;
    }
  }

  /**
   * Calculate delivery fee based on location and order amount
   */
  private static async calculateDeliveryFee(address: string, orderAmount: number): Promise<number> {
    const deliveryZone = await this.getDeliveryZone(address);
    
    // Base delivery fee
    let deliveryFee = deliveryZone.delivery_fee;
    
    // Free delivery for orders above certain amount
    if (orderAmount >= 1000) {
      deliveryFee = 0;
    } else if (orderAmount >= 500) {
      deliveryFee = deliveryFee * 0.5; // 50% discount
    }
    
    return Math.round(deliveryFee);
  }

  /**
   * Get delivery zone information
   */
  private static async getDeliveryZone(address: string): Promise<DeliveryZone> {
    // Simplified zone detection - in real app, use geocoding
    const area = this.extractAreaFromAddress(address);
    
    const zones: { [key: string]: DeliveryZone } = {
      'dhaka': {
        area_name: 'Dhaka',
        delivery_fee: 50,
        estimated_time: 45,
        available_partners: ['pathao', 'foodpanda', 'uber_eats'],
        is_serviced: true,
      },
      'chittagong': {
        area_name: 'Chittagong',
        delivery_fee: 80,
        estimated_time: 60,
        available_partners: ['pathao', 'foodpanda'],
        is_serviced: true,
      },
      'sylhet': {
        area_name: 'Sylhet',
        delivery_fee: 100,
        estimated_time: 90,
        available_partners: ['pathao'],
        is_serviced: true,
      },
    };
    
    return zones[area.toLowerCase()] || {
      area_name: 'Unknown',
      delivery_fee: 150,
      estimated_time: 120,
      available_partners: [],
      is_serviced: false,
    };
  }

  /**
   * Extract area from address (simplified)
   */
  private static extractAreaFromAddress(address: string): string {
    const addressLower = address.toLowerCase();
    
    if (addressLower.includes('dhaka')) return 'dhaka';
    if (addressLower.includes('chittagong') || addressLower.includes('chittagong')) return 'chittagong';
    if (addressLower.includes('sylhet')) return 'sylhet';
    
    return 'dhaka'; // Default to Dhaka
  }

  /**
   * Calculate estimated delivery time
   */
  private static calculateEstimatedDeliveryTime(deliveryZone: DeliveryZone): string {
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + deliveryZone.estimated_time * 60000);
    
    return deliveryTime.toISOString();
  }

  /**
   * Auto-assign delivery partner
   */
  private static async autoAssignDeliveryPartner(deliveryId: string, deliveryZone: DeliveryZone): Promise<void> {
    try {
      // Find best available partner
      const availablePartners = this.DELIVERY_PARTNERS.filter(partner => 
        partner.is_active && 
        deliveryZone.available_partners.includes(partner.id)
      );
      
      if (availablePartners.length === 0) {
        console.warn('No delivery partners available for this area');
        return;
      }
      
      // Select partner with best rating and fastest delivery
      const bestPartner = availablePartners.reduce((best, current) => {
        const bestScore = best.rating * (1 / best.average_delivery_time);
        const currentScore = current.rating * (1 / current.average_delivery_time);
        return currentScore > bestScore ? current : best;
      });
      
      // Update delivery request with partner assignment
      await supabase
        .from('delivery_requests')
        .update({
          delivery_partner: bestPartner.id,
          tracking_number: this.generateTrackingNumber(),
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);
      
      console.log(`✅ Assigned delivery partner: ${bestPartner.name}`);
      
    } catch (error) {
      console.error('❌ Error assigning delivery partner:', error);
    }
  }

  /**
   * Generate tracking number
   */
  private static generateTrackingNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `MD${timestamp}${random}`.toUpperCase();
  }

  /**
   * Update delivery status
   */
  static async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryRequest['status'],
    notes?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      
      if (notes) {
        updateData.delivery_notes = notes;
      }
      
      if (status === 'delivered') {
        updateData.actual_delivery_time = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('delivery_requests')
        .update(updateData)
        .eq('id', deliveryId);
      
      if (error) {
        throw error;
      }
      
      console.log(`✅ Delivery status updated to: ${status}`);
      
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Get delivery requests for pharmacy
   */
  static async getDeliveryRequests(
    pharmacyId: string,
    status?: DeliveryRequest['status']
  ): Promise<DeliveryRequest[]> {
    try {
      let query = supabase
        .from('delivery_requests')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data || [];
      
    } catch (error) {
      console.error('❌ Error fetching delivery requests:', error);
      throw error;
    }
  }

  /**
   * Track delivery
   */
  static async trackDelivery(trackingNumber: string): Promise<DeliveryRequest | null> {
    try {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ Error tracking delivery:', error);
      throw error;
    }
  }

  /**
   * Get delivery analytics
   */
  static async getDeliveryAnalytics(pharmacyId: string, period: '7_days' | '30_days' | '90_days' = '30_days'): Promise<DeliveryAnalytics> {
    try {
      const days = period === '7_days' ? 7 : period === '30_days' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data: deliveries, error } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .gte('created_at', startDate.toISOString());
      
      if (error) {
        throw error;
      }
      
      const totalDeliveries = deliveries?.length || 0;
      const successfulDeliveries = deliveries?.filter((d: any) => d.status === 'delivered').length || 0;
      const failedDeliveries = deliveries?.filter((d: any) => d.status === 'failed' || d.status === 'cancelled').length || 0;
      
      // Calculate average delivery time
      const deliveredOrders = deliveries?.filter((d: any) => d.status === 'delivered' && d.actual_delivery_time) || [];
      const averageDeliveryTime = deliveredOrders.length > 0 
        ? deliveredOrders.reduce((sum: number, delivery: any) => {
            const created = new Date(delivery.created_at);
            const delivered = new Date(delivery.actual_delivery_time);
            return sum + (delivered.getTime() - created.getTime()) / (1000 * 60); // minutes
          }, 0) / deliveredOrders.length
        : 0;
      
      // Calculate total delivery revenue
      const totalDeliveryRevenue = deliveries?.reduce((sum: number, delivery: any) => sum + delivery.delivery_fee, 0) || 0;
      
      // Top delivery areas
      const areaCounts: { [key: string]: number } = {};
      deliveries?.forEach((delivery: any) => {
        const area = this.extractAreaFromAddress(delivery.customer_address);
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
      
      const topDeliveryAreas = Object.entries(areaCounts)
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Delivery partner performance
      const partnerPerformance: { [key: string]: { success: number; total: number; times: number[] } } = {};
      deliveries?.forEach((delivery: any) => {
        if (delivery.delivery_partner) {
          if (!partnerPerformance[delivery.delivery_partner]) {
            partnerPerformance[delivery.delivery_partner] = { success: 0, total: 0, times: [] };
          }
          partnerPerformance[delivery.delivery_partner].total++;
          if (delivery.status === 'delivered') {
            partnerPerformance[delivery.delivery_partner].success++;
            if (delivery.actual_delivery_time) {
              const created = new Date(delivery.created_at);
              const delivered = new Date(delivery.actual_delivery_time);
              const time = (delivered.getTime() - created.getTime()) / (1000 * 60);
              partnerPerformance[delivery.delivery_partner].times.push(time);
            }
          }
        }
      });
      
      const deliveryPartnerPerformance = Object.entries(partnerPerformance).map(([partner, stats]) => ({
        partner,
        success_rate: Math.round((stats.success / stats.total) * 100),
        avg_time: stats.times.length > 0 ? Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length) : 0,
      }));
      
      return {
        total_deliveries: totalDeliveries,
        successful_deliveries: successfulDeliveries,
        failed_deliveries: failedDeliveries,
        average_delivery_time: Math.round(averageDeliveryTime),
        total_delivery_revenue: totalDeliveryRevenue,
        top_delivery_areas: topDeliveryAreas,
        delivery_partner_performance: deliveryPartnerPerformance,
      };
      
    } catch (error) {
      console.error('❌ Error getting delivery analytics:', error);
      throw error;
    }
  }

  /**
   * Get available delivery partners for area
   */
  static async getAvailableDeliveryPartners(address: string): Promise<DeliveryPartner[]> {
    const deliveryZone = await this.getDeliveryZone(address);
    
    return this.DELIVERY_PARTNERS.filter(partner => 
      partner.is_active && 
      deliveryZone.available_partners.includes(partner.id)
    );
  }

  /**
   * Check if delivery is available in area
   */
  static async isDeliveryAvailable(address: string): Promise<boolean> {
    const deliveryZone = await this.getDeliveryZone(address);
    return deliveryZone.is_serviced;
  }

  /**
   * Get delivery fee estimate
   */
  static async getDeliveryFeeEstimate(address: string, orderAmount: number): Promise<{
    delivery_fee: number;
    free_delivery_threshold: number;
    estimated_time: number;
  }> {
    const deliveryZone = await this.getDeliveryZone(address);
    const deliveryFee = await this.calculateDeliveryFee(address, orderAmount);
    
    return {
      delivery_fee: deliveryFee,
      free_delivery_threshold: 1000,
      estimated_time: deliveryZone.estimated_time,
    };
  }

  /**
   * Get quick delivery stats for dashboard
   */
  static async getQuickDeliveryStats(pharmacyId: string): Promise<{
    pending_deliveries: number;
    today_deliveries: number;
    delivery_success_rate: number;
    avg_delivery_time: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayDeliveries, error: todayError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .gte('created_at', today.toISOString());
      
      const { data: allDeliveries, error: allError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('pharmacy_id', pharmacyId);
      
      if (todayError || allError) {
        throw todayError || allError;
      }
      
      const pendingDeliveries = allDeliveries?.filter((d: any) => 
        ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(d.status)
      ).length || 0;
      
      const todayDeliveriesCount = todayDeliveries?.length || 0;
      
      const successfulDeliveries = allDeliveries?.filter((d: any) => d.status === 'delivered').length || 0;
      const totalDeliveries = allDeliveries?.length || 0;
      const deliverySuccessRate = totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0;
      
      const deliveredOrders = allDeliveries?.filter((d: any) => d.status === 'delivered' && d.actual_delivery_time) || [];
      const avgDeliveryTime = deliveredOrders.length > 0 
        ? Math.round(deliveredOrders.reduce((sum: number, delivery: any) => {
            const created = new Date(delivery.created_at);
            const delivered = new Date(delivery.actual_delivery_time);
            return sum + (delivered.getTime() - created.getTime()) / (1000 * 60);
          }, 0) / deliveredOrders.length)
        : 0;
      
      return {
        pending_deliveries: pendingDeliveries,
        today_deliveries: todayDeliveriesCount,
        delivery_success_rate: deliverySuccessRate,
        avg_delivery_time: avgDeliveryTime,
      };
      
    } catch (error) {
      console.error('❌ Error getting quick delivery stats:', error);
      return {
        pending_deliveries: 0,
        today_deliveries: 0,
        delivery_success_rate: 0,
        avg_delivery_time: 0,
      };
    }
  }
}
