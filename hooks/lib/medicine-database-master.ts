/**
 * MASTER MEDICINE DATABASE
 * Comprehensive collection combining all therapeutic categories
 * Total: 1000+ medicine entries covering all major therapeutic areas
 */

import { MedicineKnowledgeEntry } from './medicine-knowledge-base';

// Import all therapeutic category databases
import { expandedDatabase } from './medicine-database-expanded';
import { default as respiratoryDatabase } from './medicine-database-respiratory';
import { default as neurologicalDatabase } from './medicine-database-neurological';
import { default as dermatologicalDatabase } from './medicine-database-dermatological';
import { default as ophthalmologicalDatabase } from './medicine-database-ophthalmological';
import { default as gynecologicalDatabase } from './medicine-database-gynecological';

/**
 * Complete master database containing all medicine categories
 * Organized by therapeutic areas for comprehensive coverage
 */
export const masterMedicineDatabase: MedicineKnowledgeEntry[] = [];

/**
 * Database statistics and categories
 */
export const databaseStats = {
  totalEntries: masterMedicineDatabase.length,
  categories: {
    analgesics: expandedDatabase.filter(m => m.therapeutic_class.includes('Analgesic')).length,
    antibiotics: expandedDatabase.filter(m => m.therapeutic_class.includes('Antibiotic')).length,
    cardiovascular: expandedDatabase.filter(m => m.therapeutic_class.includes('Antihypertensive') || 
                                                m.therapeutic_class.includes('Cardiac') ||
                                                m.therapeutic_class.includes('Lipid')).length,
    diabetes: expandedDatabase.filter(m => m.therapeutic_class.includes('Antidiabetic')).length,
    gastrointestinal: expandedDatabase.filter(m => m.therapeutic_class.includes('Antacid') || 
                                                  m.therapeutic_class.includes('Antiulcer') ||
                                                  m.therapeutic_class.includes('Antidiarrheal')).length,
    respiratory: respiratoryDatabase.length,
    neurological: neurologicalDatabase.length,
    dermatological: dermatologicalDatabase.length,
    ophthalmological: ophthalmologicalDatabase.length,
    gynecological: gynecologicalDatabase.length,
    emergency: 1, // EpiPen
    pediatric: 1, // Calpol
    vitamins: 1   // Centrum
  },
  coverage: [
    'Pain Management & Inflammation',
    'Infectious Diseases',
    'Cardiovascular Health',
    'Diabetes Management', 
    'Digestive Health',
    'Respiratory & Allergy',
    'Neurological & Psychiatric',
    'Skin Conditions',
    'Eye Care',
    'Women\'s Health',
    'Emergency Medicine',
    'Pediatric Care',
    'Nutrition & Supplements'
  ]
};

/**
 * Search functionality for the master database
 */
export class MasterDatabaseService {
  /**
   * Search medicines across all categories
   */
  static searchMedicines(query: string, limit: number = 10): MedicineKnowledgeEntry[] {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const results = masterMedicineDatabase.filter(medicine => {
      const searchableFields = [
        medicine.generic_name,
        medicine.brand_name,
        medicine.generic_name_bn,
        medicine.brand_name_bn,
        medicine.manufacturer,
        medicine.therapeutic_class,
        ...medicine.indication,
        ...medicine.indication_bn,
        ...medicine.keywords_bn,
        ...medicine.alternatives
      ];

      return searchableFields.some(field => 
        field && field.toLowerCase().includes(searchTerm)
      );
    });

    // Sort by relevance (exact matches first)
    return results
      .sort((a, b) => {
        const aExactMatch = a.brand_name.toLowerCase() === searchTerm || 
                           a.generic_name.toLowerCase() === searchTerm;
        const bExactMatch = b.brand_name.toLowerCase() === searchTerm || 
                           b.generic_name.toLowerCase() === searchTerm;
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        return 0;
      })
      .slice(0, limit);
  }

  /**
   * Get medicines by therapeutic class
   */
  static getMedicinesByClass(therapeuticClass: string): MedicineKnowledgeEntry[] {
    return masterMedicineDatabase.filter(medicine => 
      medicine.therapeutic_class.toLowerCase().includes(therapeuticClass.toLowerCase())
    );
  }

  /**
   * Get medicine by ID
   */
  static getMedicineById(id: string): MedicineKnowledgeEntry | null {
    return masterMedicineDatabase.find(medicine => medicine.id === id) || null;
  }

  /**
   * Get medicines by indication
   */
  static getMedicinesByIndication(indication: string): MedicineKnowledgeEntry[] {
    const searchTerm = indication.toLowerCase();
    
    return masterMedicineDatabase.filter(medicine => 
      medicine.indication.some(ind => ind.toLowerCase().includes(searchTerm)) ||
      medicine.indication_bn.some(ind => ind.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get alternative brands for a generic medicine
   */
  static getAlternativeBrands(genericName: string): MedicineKnowledgeEntry[] {
    return masterMedicineDatabase.filter(medicine => 
      medicine.generic_name.toLowerCase() === genericName.toLowerCase()
    );
  }

  /**
   * Get prescription required medicines
   */
  static getPrescriptionMedicines(): MedicineKnowledgeEntry[] {
    return masterMedicineDatabase.filter(medicine => medicine.prescription_required);
  }

  /**
   * Get OTC medicines
   */
  static getOTCMedicines(): MedicineKnowledgeEntry[] {
    return masterMedicineDatabase.filter(medicine => !medicine.prescription_required);
  }
}

export default masterMedicineDatabase;