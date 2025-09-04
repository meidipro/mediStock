import { supabase } from './supabase';
import { barcodeService } from './barcode-service';
import { Medicine, StockItem } from './types';

export interface PurchaseItem {
  medicine_id: string;
  medicine_name: string;
  barcode_number?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  batch_number?: string;
  expiry_date?: string;
  supplier_name: string;
}

export interface PurchaseOrder {
  id: string;
  pharmacy_id: string;
  supplier_id?: string;
  order_number: string;
  status: 'draft' | 'sent' | 'received' | 'completed';
  total_amount: number;
  items: PurchaseItem[];
  created_at: string;
  received_at?: string;
}

export interface StockReceiving {
  purchase_order_id: string;
  received_items: {
    medicine_id: string;
    barcode_scanned?: string;
    quantity_received: number;
    batch_number?: string;
    expiry_date?: string;
    unit_cost: number;
  }[];
  received_by: string;
  received_at: string;
}

class PurchaseInventoryIntegration {
  private static instance: PurchaseInventoryIntegration;

  static getInstance(): PurchaseInventoryIntegration {
    if (!PurchaseInventoryIntegration.instance) {
      PurchaseInventoryIntegration.instance = new PurchaseInventoryIntegration();
    }
    return PurchaseInventoryIntegration.instance;
  }

  // Connect barcode scan to existing medicine or create new one
  async handlePurchaseReceivingBarcodeScan(
    barcode: string, 
    pharmacyId: string,
    purchaseOrderId?: string
  ): Promise<{
    medicine: Medicine | null;
    found: boolean;
    action: 'existing' | 'new' | 'error';
    message: string;
  }> {
    try {
      console.log('🔍 Purchase receiving barcode scan:', barcode);

      // First, try to find medicine by barcode in existing inventory
      const barcodeResult = await barcodeService.lookupMedicineByBarcode(barcode, pharmacyId);
      
      if (barcodeResult.found && barcodeResult.medicine) {
        console.log('✅ Found existing medicine for receiving:', barcodeResult.medicine.generic_name);
        return {
          medicine: barcodeResult.medicine,
          found: true,
          action: 'existing',
          message: `Found existing medicine: ${barcodeResult.medicine.generic_name || barcodeResult.medicine.name}`
        };
      }

      // If not found but we have a purchase order, check if this barcode matches any ordered items
      if (purchaseOrderId) {
        const expectedMedicine = await this.findExpectedMedicineInPurchaseOrder(purchaseOrderId, barcode);
        if (expectedMedicine) {
          return {
            medicine: expectedMedicine,
            found: true,
            action: 'existing',
            message: `Matched with purchase order item: ${expectedMedicine.generic_name || expectedMedicine.name}`
          };
        }
      }

      // If still not found, this might be a new medicine
      return {
        medicine: null,
        found: false,
        action: 'new',
        message: `New medicine with barcode ${barcode}. Please add medicine details.`
      };

    } catch (error) {
      console.error('Error in purchase receiving barcode scan:', error);
      return {
        medicine: null,
        found: false,
        action: 'error',
        message: 'Error processing barcode scan'
      };
    }
  }

  // Find medicine in purchase order that might match scanned barcode
  private async findExpectedMedicineInPurchaseOrder(
    purchaseOrderId: string, 
    barcode: string
  ): Promise<Medicine | null> {
    try {
      // This would query purchase order items and try to match by medicine name/generic name
      // For now, return null as we'll implement purchase orders later
      return null;
    } catch (error) {
      console.error('Error finding expected medicine in purchase order:', error);
      return null;
    }
  }

  // Receive stock and automatically update inventory
  async receiveStockFromPurchase(
    receivingData: StockReceiving,
    pharmacyId: string
  ): Promise<{ success: boolean; errors: string[]; updatedItems: number }> {
    const errors: string[] = [];
    let updatedItems = 0;

    try {
      console.log('📦 Processing stock receiving:', receivingData);

      for (const item of receivingData.received_items) {
        try {
          // Check if medicine exists in inventory
          const { data: existingStock } = await supabase
            .from('stock')
            .select('*')
            .eq('pharmacy_id', pharmacyId)
            .eq('medicine_id', item.medicine_id)
            .eq('batch_number', item.batch_number || '')
            .maybeSingle();

          if (existingStock) {
            // Update existing stock
            const newQuantity = existingStock.quantity + item.quantity_received;
            
            const { error: updateError } = await supabase
              .from('stock')
              .update({
                quantity: newQuantity,
                unit_price: item.unit_cost, // Update with latest cost
                expiry_date: item.expiry_date || existingStock.expiry_date,
                last_updated: new Date().toISOString(),
              })
              .eq('id', existingStock.id);

            if (updateError) {
              errors.push(`Failed to update stock for ${item.medicine_id}: ${updateError.message}`);
            } else {
              updatedItems++;
              console.log('✅ Updated existing stock:', item.medicine_id, 'New quantity:', newQuantity);
            }
          } else {
            // Create new stock entry
            const { error: insertError } = await supabase
              .from('stock')
              .insert({
                pharmacy_id: pharmacyId,
                medicine_id: item.medicine_id,
                quantity: item.quantity_received,
                unit_price: item.unit_cost,
                cost_price: item.unit_cost,
                batch_number: item.batch_number,
                expiry_date: item.expiry_date,
                minimum_stock: 10, // Default minimum stock
              });

            if (insertError) {
              errors.push(`Failed to create stock for ${item.medicine_id}: ${insertError.message}`);
            } else {
              updatedItems++;
              console.log('✅ Created new stock entry:', item.medicine_id);
            }
          }

          // Log the receiving transaction
          await this.logStockReceiving(item, pharmacyId, receivingData.received_by);

        } catch (itemError) {
          console.error('Error processing item:', item.medicine_id, itemError);
          errors.push(`Error processing ${item.medicine_id}: ${itemError}`);
        }
      }

      return {
        success: errors.length === 0,
        errors,
        updatedItems
      };

    } catch (error) {
      console.error('Error in receiveStockFromPurchase:', error);
      return {
        success: false,
        errors: [`Failed to process stock receiving: ${error}`],
        updatedItems
      };
    }
  }

  // Log stock receiving transaction for audit trail
  private async logStockReceiving(
    item: StockReceiving['received_items'][0],
    pharmacyId: string,
    receivedBy: string
  ): Promise<void> {
    try {
      // Create a receiving log entry
      await supabase.from('stock_movements').insert({
        pharmacy_id: pharmacyId,
        medicine_id: item.medicine_id,
        movement_type: 'purchase_received',
        quantity: item.quantity_received,
        unit_cost: item.unit_cost,
        batch_number: item.batch_number,
        barcode_scanned: item.barcode_scanned,
        created_by: receivedBy,
        created_at: new Date().toISOString(),
        metadata: {
          source: 'purchase_receiving',
          expiry_date: item.expiry_date
        }
      });

      console.log('📝 Logged stock receiving for:', item.medicine_id);
    } catch (error) {
      console.error('Error logging stock receiving:', error);
      // Don't throw error as this is just logging
    }
  }

  // Quick stock addition from barcode scan (for emergency purchases)
  async quickAddStockFromBarcode(
    barcode: string,
    quantity: number,
    unitCost: number,
    pharmacyId: string,
    userId: string,
    supplierName?: string
  ): Promise<{ success: boolean; medicine?: Medicine; error?: string }> {
    try {
      console.log('⚡ Quick add stock from barcode:', barcode);

      // Try to find existing medicine
      const barcodeResult = await barcodeService.lookupMedicineByBarcode(barcode, pharmacyId);
      
      if (barcodeResult.found && barcodeResult.medicine) {
        // Add to existing medicine stock
        const result = await this.receiveStockFromPurchase({
          purchase_order_id: 'quick-add',
          received_items: [{
            medicine_id: barcodeResult.medicine.id,
            barcode_scanned: barcode,
            quantity_received: quantity,
            unit_cost: unitCost,
            batch_number: `QA-${Date.now()}`, // Quick add batch
            expiry_date: undefined
          }],
          received_by: userId,
          received_at: new Date().toISOString()
        }, pharmacyId);

        if (result.success) {
          return {
            success: true,
            medicine: barcodeResult.medicine
          };
        } else {
          return {
            success: false,
            error: result.errors.join(', ')
          };
        }
      } else {
        return {
          success: false,
          error: 'Medicine not found. Please add medicine details first.'
        };
      }

    } catch (error) {
      console.error('Error in quickAddStockFromBarcode:', error);
      return {
        success: false,
        error: 'Failed to add stock from barcode'
      };
    }
  }

  // Get purchase recommendations based on low stock and sales patterns
  async getPurchaseRecommendations(pharmacyId: string): Promise<{
    lowStock: Array<{
      medicine: Medicine;
      currentStock: number;
      minimumStock: number;
      recommendedOrder: number;
    }>;
    trending: Array<{
      medicine: Medicine;
      salesVelocity: number;
      recommendedOrder: number;
    }>;
  }> {
    try {
      // Get low stock items
      const { data: lowStockData } = await supabase
        .rpc('get_low_stock_items', { 
          pharmacy_id: pharmacyId,
          threshold: 10 
        });

      // Get trending medicines (basic implementation)
      const { data: salesData } = await supabase
        .from('sale_items')
        .select(`
          medicine_id,
          quantity,
          medicines (*)
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false });

      // Process recommendations
      const lowStock = (lowStockData || []).map((item: any) => ({
        medicine: item,
        currentStock: item.current_quantity || 0,
        minimumStock: item.minimum_stock || 10,
        recommendedOrder: Math.max(item.minimum_stock * 2 - item.current_quantity, 0)
      }));

      const trending: any[] = []; // Simplified for now

      return { lowStock, trending };

    } catch (error) {
      console.error('Error getting purchase recommendations:', error);
      return { lowStock: [], trending: [] };
    }
  }

  // Sync barcode data when receiving new stock
  async syncBarcodeWithNewStock(
    medicineId: string,
    barcode: string,
    pharmacyId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Add barcode to medicine if not already present
      const result = await barcodeService.addBarcodeToMedicine(medicineId, barcode);
      
      if (result.success) {
        // Log the barcode assignment
        await barcodeService.log_barcode_scan(
          pharmacyId,
          medicineId,
          barcode,
          'assigned',
          'system', // System-assigned during receiving
          'purchase_receiving'
        );

        console.log('✅ Synced barcode with medicine:', medicineId, barcode);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('Error syncing barcode with new stock:', error);
      return { success: false, error: 'Failed to sync barcode' };
    }
  }

  // Get integration statistics
  async getIntegrationStats(pharmacyId: string): Promise<{
    totalMedicinesWithBarcodes: number;
    recentReceivings: number;
    pendingPurchaseOrders: number;
    lowStockItems: number;
  }> {
    try {
      const [barcodeStats, recentReceivings, lowStockCount] = await Promise.all([
        barcodeService.getBarcodeStats(pharmacyId),
        this.getRecentReceivingsCount(pharmacyId),
        this.getLowStockCount(pharmacyId)
      ]);

      return {
        totalMedicinesWithBarcodes: barcodeStats.totalWithBarcodes,
        recentReceivings,
        pendingPurchaseOrders: 0, // Will implement with purchase orders
        lowStockItems: lowStockCount
      };

    } catch (error) {
      console.error('Error getting integration stats:', error);
      return {
        totalMedicinesWithBarcodes: 0,
        recentReceivings: 0,
        pendingPurchaseOrders: 0,
        lowStockItems: 0
      };
    }
  }

  private async getRecentReceivingsCount(pharmacyId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacyId)
        .eq('movement_type', 'purchase_received')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      return count || 0;
    } catch (error) {
      console.error('Error getting recent receivings count:', error);
      return 0;
    }
  }

  private async getLowStockCount(pharmacyId: string): Promise<number> {
    try {
      const { data } = await supabase
        .rpc('get_low_stock_items', { 
          pharmacy_id: pharmacyId,
          threshold: 10 
        });

      return data?.length || 0;
    } catch (error) {
      console.error('Error getting low stock count:', error);
      return 0;
    }
  }
}

export const purchaseInventoryIntegration = PurchaseInventoryIntegration.getInstance();