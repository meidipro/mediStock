/**
 * MEDICINE KNOWLEDGE SYNC HOOK
 * React hook for managing medicine knowledge base synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import MedicineKnowledgeSyncService, { SyncResult, SyncProgress } from '../lib/medicine-knowledge-sync';

export interface MedicineKnowledgeHookState {
  // Sync status
  isLoading: boolean;
  isSyncing: boolean;
  syncProgress?: SyncProgress;
  lastSyncResult?: SyncResult;
  
  // Database status
  syncStatus?: {
    total_medicines: number;
    last_updated: string;
    therapeutic_classes: number;
    manufacturers: number;
    is_synced: boolean;
  };
  
  // Errors
  error?: string;
  
  // Validation
  schemaValid?: boolean;
  schemaIssues?: string[];
}

export interface MedicineKnowledgeHookActions {
  syncAllMedicines: () => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  clearKnowledgeBase: () => Promise<void>;
  validateSchema: () => Promise<void>;
  searchMedicines: (query: string, options?: any) => Promise<any[]>;
  getMedicineById: (id: string) => Promise<any>;
  getAlternativeBrands: (genericName: string) => Promise<any[]>;
  checkDrugInteractions: (medicineIds: string[]) => Promise<any>;
  getMedicinesByIndication: (indication: string) => Promise<any[]>;
  clearError: () => void;
}

export function useMedicineKnowledgeSync(): [MedicineKnowledgeHookState, MedicineKnowledgeHookActions] {
  const [state, setState] = useState<MedicineKnowledgeHookState>({
    isLoading: true,
    isSyncing: false,
  });

  /**
   * Update state safely
   */
  const updateState = useCallback((updates: Partial<MedicineKnowledgeHookState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle errors consistently
   */
  const handleError = useCallback((error: any, context: string) => {
    const errorMessage = error?.message || error || 'Unknown error occurred';
    console.error(`Medicine Knowledge Sync Error (${context}):`, error);
    updateState({ error: errorMessage, isLoading: false, isSyncing: false });
  }, [updateState]);

  /**
   * Sync all medicines to Supabase
   */
  const syncAllMedicines = useCallback(async () => {
    try {
      updateState({ 
        isSyncing: true, 
        error: undefined, 
        syncProgress: { current: 0, total: 0, percentage: 0, status: 'Starting sync...' }
      });

      const result = await MedicineKnowledgeSyncService.syncAllMedicines((progress) => {
        updateState({ syncProgress: progress });
      });

      updateState({ 
        isSyncing: false, 
        lastSyncResult: result,
        syncProgress: undefined,
        error: result.success ? undefined : 'Sync completed with errors'
      });

      // Refresh status after sync
      await refreshSyncStatus();

    } catch (error) {
      handleError(error, 'syncAllMedicines');
    }
  }, [updateState, handleError]);

  /**
   * Refresh sync status from database
   */
  const refreshSyncStatus = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: undefined });

      const { status, error } = await MedicineKnowledgeSyncService.getSyncStatus();
      
      if (error) {
        throw new Error(error);
      }

      updateState({ 
        syncStatus: status,
        isLoading: false
      });

    } catch (error) {
      handleError(error, 'refreshSyncStatus');
    }
  }, [updateState, handleError]);

  /**
   * Clear all knowledge base data
   */
  const clearKnowledgeBase = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: undefined });

      const { success, error } = await MedicineKnowledgeSyncService.clearKnowledgeBase();
      
      if (!success) {
        throw new Error(error);
      }

      // Refresh status after clearing
      await refreshSyncStatus();

    } catch (error) {
      handleError(error, 'clearKnowledgeBase');
    }
  }, [updateState, handleError, refreshSyncStatus]);

  /**
   * Validate database schema
   */
  const validateSchema = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: undefined });

      const { valid, issues } = await MedicineKnowledgeSyncService.validateDatabaseSchema();
      
      updateState({ 
        schemaValid: valid,
        schemaIssues: issues,
        isLoading: false,
        error: valid ? undefined : 'Schema validation failed'
      });

    } catch (error) {
      handleError(error, 'validateSchema');
    }
  }, [updateState, handleError]);

  /**
   * Search medicines in database
   */
  const searchMedicines = useCallback(async (query: string, options: any = {}): Promise<any[]> => {
    try {
      const { medicines, error } = await MedicineKnowledgeSyncService.searchMedicines(query, options);
      
      if (error) {
        throw new Error(error);
      }

      return medicines;
    } catch (error) {
      handleError(error, 'searchMedicines');
      return [];
    }
  }, [handleError]);

  /**
   * Get medicine by ID
   */
  const getMedicineById = useCallback(async (id: string): Promise<any> => {
    try {
      const { medicine, error } = await MedicineKnowledgeSyncService.getMedicineById(id);
      
      if (error) {
        throw new Error(error);
      }

      return medicine;
    } catch (error) {
      handleError(error, 'getMedicineById');
      return null;
    }
  }, [handleError]);

  /**
   * Get alternative brands
   */
  const getAlternativeBrands = useCallback(async (genericName: string): Promise<any[]> => {
    try {
      const { medicines, error } = await MedicineKnowledgeSyncService.getAlternativeBrands(genericName);
      
      if (error) {
        throw new Error(error);
      }

      return medicines;
    } catch (error) {
      handleError(error, 'getAlternativeBrands');
      return [];
    }
  }, [handleError]);

  /**
   * Check drug interactions
   */
  const checkDrugInteractions = useCallback(async (medicineIds: string[]): Promise<any> => {
    try {
      const { result, error } = await MedicineKnowledgeSyncService.checkDrugInteractions(medicineIds);
      
      if (error) {
        throw new Error(error);
      }

      return result;
    } catch (error) {
      handleError(error, 'checkDrugInteractions');
      return { has_interactions: false, interactions: [] };
    }
  }, [handleError]);

  /**
   * Get medicines by indication
   */
  const getMedicinesByIndication = useCallback(async (indication: string): Promise<any[]> => {
    try {
      const { medicines, error } = await MedicineKnowledgeSyncService.getMedicinesByIndication(indication);
      
      if (error) {
        throw new Error(error);
      }

      return medicines;
    } catch (error) {
      handleError(error, 'getMedicinesByIndication');
      return [];
    }
  }, [handleError]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    updateState({ error: undefined });
  }, [updateState]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Validate schema first
        const { valid, issues } = await MedicineKnowledgeSyncService.validateDatabaseSchema();
        
        if (mounted) {
          updateState({ 
            schemaValid: valid,
            schemaIssues: issues
          });
        }

        // Get sync status
        if (valid) {
          const { status, error } = await MedicineKnowledgeSyncService.getSyncStatus();
          
          if (mounted) {
            updateState({ 
              syncStatus: status,
              isLoading: false,
              error: error
            });
          }
        } else {
          if (mounted) {
            updateState({ 
              isLoading: false,
              error: 'Database schema is not valid'
            });
          }
        }

      } catch (error) {
        if (mounted) {
          handleError(error, 'initialization');
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [updateState, handleError]);

  const actions: MedicineKnowledgeHookActions = {
    syncAllMedicines,
    refreshSyncStatus,
    clearKnowledgeBase,
    validateSchema,
    searchMedicines,
    getMedicineById,
    getAlternativeBrands,
    checkDrugInteractions,
    getMedicinesByIndication,
    clearError
  };

  return [state, actions];
}

export default useMedicineKnowledgeSync;