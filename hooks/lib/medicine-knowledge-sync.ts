/**
 * MEDICINE KNOWLEDGE BASE SYNC SERVICE
 * Handles synchronization of 1000+ medicine database with Supabase
 * Supports batch operations, conflict resolution, and bilingual data
 */

import { supabase } from './supabase';
import { masterMedicineDatabase, MasterDatabaseService } from './medicine-database-master';
import { MedicineKnowledgeEntry } from './medicine-knowledge-base';

export interface SyncResult {
  success: boolean;
  total_processed: number;
  inserted: number;
  updated: number;
  errors: number;
  error_details?: any[];
  duration_ms: number;
}

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

export class MedicineKnowledgeSyncService {
  private static readonly BATCH_SIZE = 50; // Process in batches to avoid timeout
  private static readonly MAX_RETRIES = 3;

  /**
   * Sync all medicines from master database to Supabase
   */
  static async syncAllMedicines(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const startTime = Date.now();
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    try {
      const totalMedicines = masterMedicineDatabase.length;
      console.log(`🔄 Starting sync of ${totalMedicines} medicines to Supabase`);

      // Process in batches
      for (let i = 0; i < totalMedicines; i += this.BATCH_SIZE) {
        const batch = masterMedicineDatabase.slice(i, i + this.BATCH_SIZE);
        
        // Update progress
        if (onProgress) {
          onProgress({
            current: i + batch.length,
            total: totalMedicines,
            percentage: Math.round(((i + batch.length) / totalMedicines) * 100),
            status: `Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}...`
          });
        }

        // Process batch with retry logic
        const batchResult = await this.processBatchWithRetry(batch);
        inserted += batchResult.inserted;
        updated += batchResult.updated;
        errors += batchResult.errors;
        
        if (batchResult.errorDetails) {
          errorDetails.push(...batchResult.errorDetails);
        }

        // Small delay between batches to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const duration = Date.now() - startTime;
      
      const result: SyncResult = {
        success: errors === 0,
        total_processed: totalMedicines,
        inserted,
        updated,
        errors,
        error_details: errorDetails.length > 0 ? errorDetails : undefined,
        duration_ms: duration
      };

      console.log(`✅ Sync completed in ${duration}ms:`, result);
      return result;

    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      return {
        success: false,
        total_processed: 0,
        inserted,
        updated,
        errors: errors + 1,
        error_details: [{ error: error.message, context: 'Main sync process' }],
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Process a batch of medicines with retry logic
   */
  private static async processBatchWithRetry(
    medicines: MedicineKnowledgeEntry[]
  ): Promise<{ inserted: number; updated: number; errors: number; errorDetails?: any[] }> {
    let attempt = 0;
    let lastError: any;

    while (attempt < this.MAX_RETRIES) {
      try {
        return await this.processBatch(medicines);
      } catch (error) {
        attempt++;
        lastError = error;
        
        if (attempt < this.MAX_RETRIES) {
          console.warn(`⚠️  Batch failed (attempt ${attempt}), retrying...`, error.message);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    console.error(`❌ Batch failed after ${this.MAX_RETRIES} attempts:`, lastError);
    return {
      inserted: 0,
      updated: 0,
      errors: medicines.length,
      errorDetails: medicines.map(med => ({
        id: med.id,
        error: lastError.message,
        context: 'Batch processing failed'
      }))
    };
  }

  /**
   * Process a batch of medicines
   */
  private static async processBatch(
    medicines: MedicineKnowledgeEntry[]
  ): Promise<{ inserted: number; updated: number; errors: number }> {
    const medicineData = medicines.map(med => this.transformMedicineForSupabase(med));

    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('medicine_knowledge_base')
      .upsert(medicineData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select('id');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // For simplicity, we'll consider all operations as insertions
    // In a real implementation, you might want to track actual inserts vs updates
    return {
      inserted: data?.length || 0,
      updated: 0,
      errors: 0
    };
  }

  /**
   * Transform medicine entry for Supabase storage
   */
  private static transformMedicineForSupabase(medicine: MedicineKnowledgeEntry): any {
    return {
      id: medicine.id,
      generic_name: medicine.generic_name,
      brand_name: medicine.brand_name,
      generic_name_bn: medicine.generic_name_bn,
      brand_name_bn: medicine.brand_name_bn,
      manufacturer: medicine.manufacturer,
      manufacturer_bn: medicine.manufacturer_bn,
      strength: medicine.strength,
      form: medicine.form,
      form_bn: medicine.form_bn,
      therapeutic_class: medicine.therapeutic_class,
      therapeutic_class_bn: medicine.therapeutic_class_bn,
      indication: medicine.indication,
      indication_bn: medicine.indication_bn,
      alternatives: medicine.alternatives,
      price_min: medicine.price_range.min,
      price_max: medicine.price_range.max,
      currency: 'BDT',
      prescription_required: medicine.prescription_required,
      common_dosage: medicine.common_dosage,
      common_dosage_bn: medicine.common_dosage_bn,
      side_effects: medicine.side_effects,
      side_effects_bn: medicine.side_effects_bn,
      contraindications: medicine.contraindications,
      contraindications_bn: medicine.contraindications_bn,
      drug_interactions: medicine.drug_interactions,
      drug_interactions_bn: medicine.drug_interactions_bn,
      storage_instructions: medicine.storage_instructions,
      storage_instructions_bn: medicine.storage_instructions_bn,
      warnings_precautions: medicine.warnings_precautions,
      warnings_precautions_bn: medicine.warnings_precautions_bn,
      pregnancy_category: medicine.pregnancy_lactation.pregnancy_category,
      pregnancy_info: medicine.pregnancy_lactation.pregnancy_info,
      pregnancy_info_bn: medicine.pregnancy_lactation.pregnancy_info_bn,
      lactation_info: medicine.pregnancy_lactation.lactation_info,
      lactation_info_bn: medicine.pregnancy_lactation.lactation_info_bn,
      product_images: medicine.product_images,
      keywords_bn: medicine.keywords_bn,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Search medicines in Supabase database
   */
  static async searchMedicines(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      therapeutic_class?: string;
      prescription_filter?: boolean;
    } = {}
  ): Promise<{
    medicines: any[];
    total_count?: number;
    error?: string;
  }> {
    try {
      const {
        limit = 10,
        offset = 0,
        therapeutic_class,
        prescription_filter
      } = options;

      const { data, error } = await supabase.rpc('search_medicine_knowledge_base', {
        search_query: query || '',
        limit_count: limit,
        offset_count: offset,
        therapeutic_class_filter: therapeutic_class,
        prescription_filter
      });

      if (error) {
        console.error('Search error:', error);
        return { medicines: [], error: error.message };
      }

      return { medicines: data || [] };
    } catch (error) {
      console.error('Search failed:', error);
      return { medicines: [], error: error.message };
    }
  }

  /**
   * Get medicine details by ID from Supabase
   */
  static async getMedicineById(id: string): Promise<{
    medicine?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_medicine_knowledge_details', {
        medicine_id: id
      });

      if (error) {
        console.error('Get medicine error:', error);
        return { error: error.message };
      }

      if (!data || data.error) {
        return { error: data?.error || 'Medicine not found' };
      }

      return { medicine: data };
    } catch (error) {
      console.error('Get medicine failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Get alternative brands from Supabase
   */
  static async getAlternativeBrands(genericName: string): Promise<{
    medicines: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_alternative_brands', {
        generic_name_param: genericName
      });

      if (error) {
        console.error('Get alternatives error:', error);
        return { medicines: [], error: error.message };
      }

      return { medicines: data || [] };
    } catch (error) {
      console.error('Get alternatives failed:', error);
      return { medicines: [], error: error.message };
    }
  }

  /**
   * Check drug interactions
   */
  static async checkDrugInteractions(medicineIds: string[]): Promise<{
    result?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('check_drug_interactions', {
        medicine_ids: medicineIds
      });

      if (error) {
        console.error('Check interactions error:', error);
        return { error: error.message };
      }

      return { result: data };
    } catch (error) {
      console.error('Check interactions failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Get medicines by indication
   */
  static async getMedicinesByIndication(indication: string): Promise<{
    medicines: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_medicines_by_indication', {
        indication_param: indication
      });

      if (error) {
        console.error('Get by indication error:', error);
        return { medicines: [], error: error.message };
      }

      return { medicines: data || [] };
    } catch (error) {
      console.error('Get by indication failed:', error);
      return { medicines: [], error: error.message };
    }
  }

  /**
   * Get sync status and statistics
   */
  static async getSyncStatus(): Promise<{
    status: {
      total_medicines: number;
      last_updated: string;
      therapeutic_classes: number;
      manufacturers: number;
      is_synced: boolean;
    };
    error?: string;
  }> {
    try {
      const { data, error, count } = await supabase
        .from('medicine_knowledge_base')
        .select('id, updated_at, therapeutic_class, manufacturer', { count: 'exact' })
        .eq('is_active', true);

      if (error) {
        console.error('Get sync status error:', error);
        return {
          status: {
            total_medicines: 0,
            last_updated: 'Never',
            therapeutic_classes: 0,
            manufacturers: 0,
            is_synced: false
          },
          error: error.message
        };
      }

      const uniqueClasses = new Set(data?.map(m => m.therapeutic_class) || []).size;
      const uniqueManufacturers = new Set(data?.map(m => m.manufacturer) || []).size;
      const lastUpdated = data?.length > 0 
        ? Math.max(...data.map(m => new Date(m.updated_at).getTime()))
        : 0;

      return {
        status: {
          total_medicines: count || 0,
          last_updated: lastUpdated > 0 ? new Date(lastUpdated).toISOString() : 'Never',
          therapeutic_classes: uniqueClasses,
          manufacturers: uniqueManufacturers,
          is_synced: (count || 0) >= masterMedicineDatabase.length * 0.95 // 95% threshold
        }
      };
    } catch (error) {
      console.error('Get sync status failed:', error);
      return {
        status: {
          total_medicines: 0,
          last_updated: 'Never',
          therapeutic_classes: 0,
          manufacturers: 0,
          is_synced: false
        },
        error: error.message
      };
    }
  }

  /**
   * Clear all medicine knowledge base data (use with caution)
   */
  static async clearKnowledgeBase(): Promise<{
    success: boolean;
    deleted_count?: number;
    error?: string;
  }> {
    try {
      const { error, count } = await supabase
        .from('medicine_knowledge_base')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible ID

      if (error) {
        console.error('Clear knowledge base error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, deleted_count: count || 0 };
    } catch (error) {
      console.error('Clear knowledge base failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate database connection and schema
   */
  static async validateDatabaseSchema(): Promise<{
    valid: boolean;
    issues?: string[];
  }> {
    const issues: string[] = [];

    try {
      // Test basic table access
      const { error: tableError } = await supabase
        .from('medicine_knowledge_base')
        .select('id')
        .limit(1);

      if (tableError) {
        issues.push(`Table access error: ${tableError.message}`);
      }

      // Test search function
      const { error: searchError } = await supabase.rpc('search_medicine_knowledge_base', {
        search_query: 'test',
        limit_count: 1
      });

      if (searchError) {
        issues.push(`Search function error: ${searchError.message}`);
      }

      // Test other functions
      const functions = [
        'get_medicine_knowledge_details',
        'get_alternative_brands',
        'check_drug_interactions',
        'get_medicines_by_indication'
      ];

      for (const funcName of functions) {
        try {
          await supabase.rpc(funcName, {});
        } catch (error) {
          issues.push(`Function ${funcName} error: ${error.message}`);
        }
      }

      return {
        valid: issues.length === 0,
        issues: issues.length > 0 ? issues : undefined
      };

    } catch (error) {
      return {
        valid: false,
        issues: [`General validation error: ${error.message}`]
      };
    }
  }
}

export default MedicineKnowledgeSyncService;