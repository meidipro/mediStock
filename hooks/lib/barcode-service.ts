import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { Camera } from 'expo-camera';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';
import { Medicine } from './types';

export interface BarcodeResult {
  data: string;
  type: string;
  bounds?: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
}

export interface BarcodeLookupResult {
  medicine: Medicine | null;
  found: boolean;
  suggestions: Medicine[];
  error?: string;
}

class BarcodeService {
  private static instance: BarcodeService;
  private hasPermission: boolean | null = null;

  static getInstance(): BarcodeService {
    if (!BarcodeService.instance) {
      BarcodeService.instance = new BarcodeService();
    }
    return BarcodeService.instance;
  }

  // Request camera permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      this.hasPermission = status === 'granted';
      
      if (!this.hasPermission) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to scan barcodes. You can enable this in your device settings.',
          [{ text: 'OK' }]
        );
      }
      
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      this.hasPermission = false;
      return false;
    }
  }

  // Check if permissions are granted
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  // Validate barcode format
  validateBarcode(barcode: string): { isValid: boolean; type: string; format: string } {
    // Remove any whitespace
    barcode = barcode.trim();
    
    // Check different barcode formats
    if (/^\d{12}$/.test(barcode)) {
      return { isValid: true, type: 'UPC-A', format: 'UPC' };
    }
    
    if (/^\d{13}$/.test(barcode)) {
      return { isValid: true, type: 'EAN-13', format: 'EAN' };
    }
    
    if (/^\d{8}$/.test(barcode)) {
      return { isValid: true, type: 'EAN-8', format: 'EAN' };
    }
    
    if (/^[0-9A-Z\-\.\/\+\s]+$/.test(barcode) && barcode.length >= 4 && barcode.length <= 20) {
      return { isValid: true, type: 'Code128', format: 'CODE128' };
    }
    
    // Allow custom/internal barcodes (alphanumeric, 6-20 characters)
    if (/^[A-Z0-9]{6,20}$/.test(barcode.toUpperCase())) {
      return { isValid: true, type: 'Custom', format: 'CUSTOM' };
    }
    
    return { isValid: false, type: 'Unknown', format: 'INVALID' };
  }

  // Look up medicine by barcode
  async lookupMedicineByBarcode(barcode: string, pharmacyId?: string): Promise<BarcodeLookupResult> {
    try {
      const validation = this.validateBarcode(barcode);
      
      if (!validation.isValid) {
        return {
          medicine: null,
          found: false,
          suggestions: [],
          error: 'Invalid barcode format'
        };
      }

      console.log('🔍 Looking up barcode:', barcode, 'Format:', validation.format);

      // First, try the optimized barcode search function
      const { data: barcodeSearchResults, error: barcodeError } = await supabase
        .rpc('search_medicines_with_barcode', {
          search_term: barcode,
          pharmacy_id_param: pharmacyId,
        });

      if (barcodeError) {
        console.warn('Optimized barcode search failed, falling back to direct query:', barcodeError);
        
        // Fallback to direct database query
        let query = supabase
          .from('medicines')
          .select('*')
          .eq('barcode_number', barcode)
          .eq('is_active', true);

        // If pharmacy ID provided, filter by pharmacy
        if (pharmacyId) {
          query = query.eq('pharmacy_id', pharmacyId);
        }

        const { data: exactMatch, error: exactError } = await query.maybeSingle();
        
        if (exactError) {
          console.error('Fallback barcode lookup error:', exactError);
          return {
            medicine: null,
            found: false,
            suggestions: [],
            error: exactError.message
          };
        }

        if (exactMatch) {
          console.log('✅ Exact barcode match found (fallback):', exactMatch.generic_name);
          // Log successful scan
          await this.logBarcodeScan(barcode, pharmacyId, exactMatch.id, 'found');
          return {
            medicine: exactMatch,
            found: true,
            suggestions: []
          };
        }
      } else if (barcodeSearchResults && barcodeSearchResults.length > 0) {
        // Check if we have an exact barcode match from the optimized function
        const exactMatch = barcodeSearchResults.find((result: any) => 
          result.match_type === 'barcode_exact'
        );

        if (exactMatch) {
          console.log('✅ Exact barcode match found (optimized):', exactMatch.generic_name);
          // Log successful scan
          await this.logBarcodeScan(barcode, pharmacyId, exactMatch.id, 'found');
          return {
            medicine: exactMatch,
            found: true,
            suggestions: []
          };
        }
      }

      if (exactError) {
        console.error('Barcode lookup error:', exactError);
        return {
          medicine: null,
          found: false,
          suggestions: [],
          error: exactError.message
        };
      }

      if (exactMatch) {
        console.log('✅ Exact barcode match found:', exactMatch.generic_name);
        return {
          medicine: exactMatch,
          found: true,
          suggestions: []
        };
      }

      // If no exact match, try partial matches and suggestions
      const suggestions = await this.getSuggestionsForBarcode(barcode, pharmacyId);

      // Log unsuccessful scan
      await this.logBarcodeScan(barcode, pharmacyId, undefined, 'not_found');

      return {
        medicine: null,
        found: false,
        suggestions,
        error: suggestions.length === 0 ? 'No medicines found for this barcode' : undefined
      };

    } catch (error) {
      console.error('Barcode lookup exception:', error);
      return {
        medicine: null,
        found: false,
        suggestions: [],
        error: 'Failed to lookup barcode'
      };
    }
  }

  // Get suggestions for similar barcodes or medicines
  private async getSuggestionsForBarcode(barcode: string, pharmacyId?: string): Promise<Medicine[]> {
    try {
      // Try partial barcode matches
      let query = supabase
        .from('medicines')
        .select('*')
        .ilike('barcode_number', `%${barcode.substring(0, 8)}%`)
        .eq('is_active', true)
        .limit(5);

      if (pharmacyId) {
        query = query.eq('pharmacy_id', pharmacyId);
      }

      const { data: partialMatches } = await query;

      if (partialMatches && partialMatches.length > 0) {
        return partialMatches;
      }

      // If no partial matches, return recent medicines as suggestions
      let recentQuery = supabase
        .from('medicines')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (pharmacyId) {
        recentQuery = recentQuery.eq('pharmacy_id', pharmacyId);
      }

      const { data: recentMedicines } = await recentQuery;
      return recentMedicines || [];

    } catch (error) {
      console.error('Error getting barcode suggestions:', error);
      return [];
    }
  }

  // Add barcode to existing medicine
  async addBarcodeToMedicine(medicineId: string, barcode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const validation = this.validateBarcode(barcode);
      
      if (!validation.isValid) {
        return { success: false, error: 'Invalid barcode format' };
      }

      // Check if barcode already exists
      const { data: existingMedicine } = await supabase
        .from('medicines')
        .select('id, generic_name')
        .eq('barcode_number', barcode)
        .maybeSingle();

      if (existingMedicine) {
        return { 
          success: false, 
          error: `Barcode already assigned to ${existingMedicine.generic_name}` 
        };
      }

      // Update medicine with barcode
      const { error } = await supabase
        .from('medicines')
        .update({ barcode_number: barcode })
        .eq('id', medicineId);

      if (error) {
        return { success: false, error: error.message };
      }

      console.log('✅ Barcode added to medicine:', medicineId, barcode);
      return { success: true };

    } catch (error) {
      console.error('Error adding barcode to medicine:', error);
      return { success: false, error: 'Failed to add barcode' };
    }
  }

  // Generate internal barcode for medicine
  generateInternalBarcode(medicine: Medicine): string {
    // Create a simple internal barcode format: MED + first 3 chars + timestamp
    const prefix = 'MED';
    const nameCode = medicine.generic_name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 3)
      .padEnd(3, '0');
    const timestamp = Date.now().toString().slice(-6);
    
    return `${prefix}${nameCode}${timestamp}`;
  }

  // Handle barcode scan result
  async processScanResult(result: BarCodeScannerResult, pharmacyId?: string): Promise<BarcodeLookupResult> {
    console.log('📱 Barcode scan result:', result.type, result.data);
    
    if (!result.data) {
      return {
        medicine: null,
        found: false,
        suggestions: [],
        error: 'No barcode data found'
      };
    }

    return await this.lookupMedicineByBarcode(result.data, pharmacyId);
  }

  // Get supported barcode types
  getSupportedBarcodeTypes(): string[] {
    if (Platform.OS === 'web') {
      // Limited support on web
      return ['qr', 'code128', 'ean13', 'ean8'];
    }
    
    return [
      'aztec',
      'ean13',
      'ean8', 
      'qr',
      'pdf417',
      'upc_e',
      'datamatrix',
      'code39',
      'code93',
      'code128',
      'code39mod43',
      'codabar',
      'itf14',
      'upc_a'
    ];
  }

  // Get barcode statistics for pharmacy
  async getBarcodeStats(pharmacyId: string): Promise<{
    totalWithBarcodes: number;
    totalWithoutBarcodes: number;
    recentlyScanned: Medicine[];
  }> {
    try {
      // Count medicines with barcodes
      const { count: withBarcodes } = await supabase
        .from('medicines')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)
        .not('barcode_number', 'is', null);

      // Count medicines without barcodes
      const { count: withoutBarcodes } = await supabase
        .from('medicines')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)
        .is('barcode_number', null);

      // Get recently updated medicines with barcodes
      const { data: recentlyScanned } = await supabase
        .from('medicines')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('is_active', true)
        .not('barcode_number', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(5);

      return {
        totalWithBarcodes: withBarcodes || 0,
        totalWithoutBarcodes: withoutBarcodes || 0,
        recentlyScanned: recentlyScanned || []
      };

    } catch (error) {
      console.error('Error getting barcode stats:', error);
      return {
        totalWithBarcodes: 0,
        totalWithoutBarcodes: 0,
        recentlyScanned: []
      };
    }
  }

  // Batch barcode operations
  async batchUpdateBarcodes(updates: { medicineId: string; barcode: string }[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const update of updates) {
      const result = await this.addBarcodeToMedicine(update.medicineId, update.barcode);
      if (result.success) {
        successful++;
      } else {
        failed++;
        if (result.error) {
          errors.push(`${update.barcode}: ${result.error}`);
        }
      }
    }

    return { successful, failed, errors };
  }

  // Log barcode scan activity using the optimized function
  async logBarcodeScan(
    barcode: string,
    pharmacyId?: string,
    medicineId?: string,
    scanResult: 'found' | 'not_found' | 'error' = 'not_found',
    scannedBy?: string,
    context: string = 'search'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use the optimized barcode logging function
      const { data, error } = await supabase
        .rpc('log_barcode_scan', {
          pharmacy_id_param: pharmacyId,
          medicine_id_param: medicineId,
          barcode_param: barcode,
          scan_result_param: scanResult,
          scanned_by_param: scannedBy,
          scan_context_param: context
        });

      if (error) {
        console.warn('Optimized barcode logging failed, using fallback:', error);
        
        // Fallback to direct table insert
        const { error: insertError } = await supabase
          .from('barcode_scan_log')
          .insert({
            pharmacy_id: pharmacyId,
            medicine_id: medicineId,
            barcode_scanned: barcode,
            scan_result: scanResult,
            scanned_by: scannedBy,
            scan_context: context,
            device_info: JSON.stringify({
              platform: Platform.OS,
              timestamp: new Date().toISOString()
            })
          });

        if (insertError) {
          console.error('Fallback barcode logging failed:', insertError);
          return { success: false, error: insertError.message };
        }
      }

      console.log('📊 Barcode scan logged:', {
        barcode,
        pharmacyId,
        medicineId,
        scanResult,
        context
      });

      return { success: true };
    } catch (error) {
      console.error('Error logging barcode scan:', error);
      return { success: false, error: 'Failed to log scan' };
    }
  }
}

export const barcodeService = BarcodeService.getInstance();

// Utility functions for barcode formatting
export const formatBarcode = (barcode: string): string => {
  if (!barcode) return '';
  
  // Format common barcode types for display
  if (barcode.length === 13) {
    // EAN-13: 123-4567-890123
    return barcode.replace(/(\d{3})(\d{4})(\d{6})/, '$1-$2-$3');
  }
  
  if (barcode.length === 12) {
    // UPC-A: 123456-789012
    return barcode.replace(/(\d{6})(\d{6})/, '$1-$2');
  }
  
  return barcode;
};

export const isValidBarcodeFormat = (barcode: string): boolean => {
  return barcodeService.validateBarcode(barcode).isValid;
};