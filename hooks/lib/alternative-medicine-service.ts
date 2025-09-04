import { supabase } from './supabase';

export interface AlternativeMedicine {
  id: string;
  generic_name: string;
  brand_name: string;
  manufacturer: string;
  strength: string;
  dosage_form: string;
  therapeutic_class: string;
  price: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  similarity_score: number; // 0-100, how similar to original medicine
  substitution_reason: string;
  dosage_equivalent: string;
  notes: string;
}

export interface MedicineSubstitution {
  original_medicine: {
    id: string;
    generic_name: string;
    brand_name: string;
    therapeutic_class: string;
  };
  alternatives: AlternativeMedicine[];
  substitution_guidelines: string[];
  warnings: string[];
}

export class AlternativeMedicineService {
  /**
   * Find alternative medicines when primary medicine is out of stock
   */
  static async findAlternatives(
    medicineId: string,
    pharmacyId: string,
    maxAlternatives: number = 5
  ): Promise<MedicineSubstitution> {
    try {
      console.log('🔍 Finding alternatives for medicine:', medicineId);

      // Get the original medicine details
      const { data: originalMedicine, error: originalError } = await supabase
        .from('global_medicine_database')
        .select('*')
        .eq('id', medicineId)
        .single();

      if (originalError || !originalMedicine) {
        throw new Error('Original medicine not found');
      }

      // Find alternatives based on therapeutic class and generic name
      const { data: alternatives, error: alternativesError } = await supabase
        .from('global_medicine_database')
        .select(`
          *,
          stock:stock!left(quantity, unit_price, low_stock_threshold)
        `)
        .eq('therapeutic_class', originalMedicine.therapeutic_class)
        .neq('id', medicineId)
        .eq('is_active', true)
        .limit(maxAlternatives * 2); // Get more to filter by availability

      if (alternativesError) {
        throw alternativesError;
      }

      // Filter and score alternatives
      const scoredAlternatives = await this.scoreAlternatives(
        originalMedicine,
        alternatives || [],
        pharmacyId
      );

      // Get top alternatives
      const topAlternatives = scoredAlternatives
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, maxAlternatives);

      // Generate substitution guidelines
      const guidelines = this.generateSubstitutionGuidelines(originalMedicine, topAlternatives);
      const warnings = this.generateWarnings(originalMedicine, topAlternatives);

      return {
        original_medicine: {
          id: originalMedicine.id,
          generic_name: originalMedicine.generic_name,
          brand_name: originalMedicine.brand_name,
          therapeutic_class: originalMedicine.therapeutic_class,
        },
        alternatives: topAlternatives,
        substitution_guidelines: guidelines,
        warnings: warnings,
      };

    } catch (error) {
      console.error('❌ Error finding alternatives:', error);
      throw error;
    }
  }

  /**
   * Score alternatives based on similarity and availability
   */
  private static async scoreAlternatives(
    original: any,
    alternatives: any[],
    pharmacyId: string
  ): Promise<AlternativeMedicine[]> {
    const scoredAlternatives: AlternativeMedicine[] = [];

    for (const alt of alternatives) {
      let similarityScore = 0;

      // Same generic name = highest score
      if (alt.generic_name === original.generic_name) {
        similarityScore = 95;
      }
      // Same therapeutic class = high score
      else if (alt.therapeutic_class === original.therapeutic_class) {
        similarityScore = 80;
      }
      // Similar strength = medium-high score
      else if (alt.strength === original.strength) {
        similarityScore = 70;
      }
      // Same dosage form = medium score
      else if (alt.dosage_form === original.dosage_form) {
        similarityScore = 60;
      }
      // Same manufacturer = bonus points
      else if (alt.manufacturer === original.manufacturer) {
        similarityScore += 10;
      }

      // Check availability in pharmacy
      let availability: 'in_stock' | 'low_stock' | 'out_of_stock' = 'out_of_stock';
      if (alt.stock && alt.stock.length > 0) {
        const stock = alt.stock[0];
        if (stock.quantity > stock.low_stock_threshold) {
          availability = 'in_stock';
        } else if (stock.quantity > 0) {
          availability = 'low_stock';
        }
      }

      // Adjust score based on availability
      if (availability === 'in_stock') {
        similarityScore += 15;
      } else if (availability === 'low_stock') {
        similarityScore += 5;
      }

      // Generate substitution reason
      const substitutionReason = this.generateSubstitutionReason(original, alt, similarityScore);
      const dosageEquivalent = this.calculateDosageEquivalent(original, alt);
      const notes = this.generateNotes(original, alt);

      scoredAlternatives.push({
        id: alt.id,
        generic_name: alt.generic_name,
        brand_name: alt.brand_name,
        manufacturer: alt.manufacturer,
        strength: alt.strength,
        dosage_form: alt.dosage_form,
        therapeutic_class: alt.therapeutic_class,
        price: alt.price || 0,
        availability,
        similarity_score: Math.min(100, similarityScore),
        substitution_reason: substitutionReason,
        dosage_equivalent: dosageEquivalent,
        notes: notes,
      });
    }

    return scoredAlternatives;
  }

  /**
   * Generate substitution reason
   */
  private static generateSubstitutionReason(original: any, alternative: any, score: number): string {
    if (score >= 90) {
      return 'Same generic medicine, different brand';
    } else if (score >= 80) {
      return 'Same therapeutic class, similar effectiveness';
    } else if (score >= 70) {
      return 'Similar strength and dosage form';
    } else if (score >= 60) {
      return 'Same dosage form, different strength';
    } else {
      return 'Alternative in same therapeutic category';
    }
  }

  /**
   * Calculate dosage equivalent
   */
  private static calculateDosageEquivalent(original: any, alternative: any): string {
    if (original.strength === alternative.strength) {
      return 'Same dosage as original';
    } else {
      return `Adjust dosage based on strength difference (${original.strength} vs ${alternative.strength})`;
    }
  }

  /**
   * Generate notes for substitution
   */
  private static generateNotes(original: any, alternative: any): string {
    const notes = [];
    
    if (original.manufacturer !== alternative.manufacturer) {
      notes.push('Different manufacturer');
    }
    
    if (original.dosage_form !== alternative.dosage_form) {
      notes.push('Different dosage form');
    }
    
    if (original.strength !== alternative.strength) {
      notes.push('Different strength - consult pharmacist for dosage adjustment');
    }

    return notes.join(', ') || 'No special notes';
  }

  /**
   * Generate substitution guidelines
   */
  private static generateSubstitutionGuidelines(original: any, alternatives: AlternativeMedicine[]): string[] {
    const guidelines = [
      'Always consult with a pharmacist before substitution',
      'Verify patient allergies and contraindications',
      'Check for drug interactions with current medications',
      'Ensure proper dosage adjustment if strength differs',
      'Inform patient about the substitution',
    ];

    if (alternatives.some(alt => alt.dosage_form !== original.dosage_form)) {
      guidelines.push('Some alternatives have different dosage forms - ensure patient understands administration method');
    }

    if (alternatives.some(alt => alt.strength !== original.strength)) {
      guidelines.push('Dosage adjustment may be required for different strengths');
    }

    return guidelines;
  }

  /**
   * Generate warnings for substitution
   */
  private static generateWarnings(original: any, alternatives: AlternativeMedicine[]): string[] {
    const warnings = [];

    if (alternatives.some(alt => alt.availability === 'out_of_stock')) {
      warnings.push('Some alternatives are currently out of stock');
    }

    if (alternatives.some(alt => alt.availability === 'low_stock')) {
      warnings.push('Some alternatives have limited stock available');
    }

    if (alternatives.some(alt => alt.manufacturer !== original.manufacturer)) {
      warnings.push('Different manufacturers may have varying quality standards');
    }

    return warnings;
  }

  /**
   * Get quick alternatives for a medicine (for UI display)
   */
  static async getQuickAlternatives(medicineId: string, pharmacyId: string): Promise<AlternativeMedicine[]> {
    try {
      const substitution = await this.findAlternatives(medicineId, pharmacyId, 3);
      return substitution.alternatives;
    } catch (error) {
      console.error('❌ Error getting quick alternatives:', error);
      return [];
    }
  }

  /**
   * Check if medicine has alternatives available
   */
  static async hasAlternatives(medicineId: string, pharmacyId: string): Promise<boolean> {
    try {
      const alternatives = await this.getQuickAlternatives(medicineId, pharmacyId);
      return alternatives.length > 0 && alternatives.some(alt => alt.availability !== 'out_of_stock');
    } catch (error) {
      return false;
    }
  }
}
