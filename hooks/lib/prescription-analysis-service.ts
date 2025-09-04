import { aiService } from './ai-service';
import { useMedicines } from '../hooks/useDatabase';
import { AnalyzedPrescription, PrescribedMedication, PrescriptionWarning } from '../components/ai/PrescriptionScanner';

interface AnalysisResult {
  success: boolean;
  prescription?: AnalyzedPrescription;
  error?: string;
}

interface DrugInteractionResult {
  success: boolean;
  warnings: PrescriptionWarning[];
  interactions?: DrugInteraction[];
  error?: string;
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mechanism: string;
  management: string;
}

interface DosageValidation {
  medicine: string;
  prescribed_dosage: string;
  recommended_dosage: string;
  is_safe: boolean;
  warnings: string[];
  age_appropriate: boolean;
  weight_appropriate: boolean;
}

class PrescriptionAnalysisService {
  constructor() {
    console.log('🧠 Prescription Analysis Service initialized');
  }

  async analyzePrescription(extractedText: string, imageUri: string): Promise<AnalysisResult> {
    try {
      console.log('🔍 Starting AI prescription analysis...');

      // Enhanced AI prompt for prescription analysis
      const analysisPrompt = `
You are an expert medical AI assistant specializing in prescription analysis for pharmacies in Bangladesh. 
Analyze the following prescription text and extract all relevant information with high accuracy.

PRESCRIPTION TEXT:
${extractedText}

Please extract and structure the following information in JSON format:

{
  "id": "unique_prescription_id",
  "patientInfo": {
    "name": "patient name if found",
    "age": "age in years as number",
    "gender": "male/female/other if mentioned",
    "weight": "weight in kg as number if mentioned"
  },
  "doctorInfo": {
    "name": "doctor name",
    "license": "medical license if found",
    "clinic": "clinic/hospital name"
  },
  "medications": [
    {
      "name": "medicine name (prefer generic name)",
      "genericName": "generic/salt name",
      "dosage": "strength (e.g., 500mg, 20ml)",
      "frequency": "how often (e.g., 3 times daily, twice daily)",
      "duration": "how long (e.g., 5 days, 1 week)",
      "instructions": "specific instructions (e.g., after meal, before sleep)",
      "confidence": "confidence score 0-1 for this extraction"
    }
  ],
  "instructions": ["general instructions", "special notes"],
  "date": "prescription date in YYYY-MM-DD format",
  "confidence": "overall confidence score 0-1"
}

IMPORTANT GUIDELINES:
1. For Bangladeshi medicines, recognize common brands:
   - Napa = Paracetamol
   - Ace = Paracetamol 
   - Seclo = Omeprazole
   - Losectil = Omeprazole
   - Flexi = Aceclofenac
   - etc.

2. Standard Bengali/English medical abbreviations:
   - 1+0+1 = morning + noon + night
   - 1+1+1 = three times daily
   - A/C = Before meal (Ante Cibum)
   - P/C = After meal (Post Cibum)
   - H/S = At bedtime (Hora Somni)

3. Common dosage forms:
   - Tab = Tablet
   - Cap = Capsule  
   - Syr = Syrup
   - Inj = Injection
   - Susp = Suspension

4. Age/weight considerations for dosing
5. Look for any handwritten corrections or modifications
6. Identify any unclear or illegible portions

Extract as much information as possible, even if some fields are missing.
`;

      const aiResponse = await aiService.makeRequest([
        {
          role: 'system',
          content: 'You are a medical prescription analysis expert. Provide accurate, structured JSON responses for prescription analysis.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ]);

      // Parse AI response
      let prescriptionData;
      try {
        // Extract JSON from AI response (in case it has additional text)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
        prescriptionData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error('Failed to parse prescription analysis');
      }

      // Validate and enhance the extracted data
      const enhancedMedications = await this.enhanceMedicationData(prescriptionData.medications);
      
      // Check stock availability for each medicine
      const medicationsWithStock = await this.checkStockAvailability(enhancedMedications);

      const analyzedPrescription: AnalyzedPrescription = {
        id: prescriptionData.id || `presc_${Date.now()}`,
        patientInfo: prescriptionData.patientInfo || {},
        doctorInfo: prescriptionData.doctorInfo || {},
        medications: medicationsWithStock,
        instructions: prescriptionData.instructions || [],
        date: prescriptionData.date || new Date().toISOString().split('T')[0],
        confidence: prescriptionData.confidence || 0.8,
        warnings: [], // Will be populated by interaction and dosage checks
        rawText: extractedText,
        imageUri,
      };

      console.log('✅ Prescription analysis completed');
      return {
        success: true,
        prescription: analyzedPrescription,
      };
    } catch (error) {
      console.error('❌ Prescription analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }

  async checkDrugInteractions(medicationNames: string[]): Promise<DrugInteractionResult> {
    try {
      console.log('⚠️ Checking drug interactions for:', medicationNames);

      if (medicationNames.length < 2) {
        return {
          success: true,
          warnings: [],
          interactions: [],
        };
      }

      const interactionPrompt = `
Analyze potential drug interactions between these medications: ${medicationNames.join(', ')}

Check for:
1. Major drug-drug interactions
2. Severity levels (low/medium/high/critical)
3. Clinical significance
4. Management recommendations
5. Common interactions in Bangladeshi pharmacy practice

Provide response in JSON format:
{
  "interactions": [
    {
      "drug1": "medicine name",
      "drug2": "medicine name", 
      "severity": "low/medium/high/critical",
      "description": "interaction description",
      "mechanism": "how interaction occurs",
      "management": "how to manage this interaction"
    }
  ]
}

Focus on clinically significant interactions that require pharmacist attention.
Consider both generic and brand names common in Bangladesh.
`;

      const aiResponse = await aiService.makeRequest([
        {
          role: 'system',
          content: 'You are a clinical pharmacist expert in drug interactions. Provide accurate interaction analysis.',
        },
        {
          role: 'user',
          content: interactionPrompt,
        },
      ]);

      let interactionData;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
        interactionData = JSON.parse(jsonString);
      } catch (parseError) {
        console.warn('Failed to parse interaction response, using fallback');
        interactionData = { interactions: [] };
      }

      // Convert interactions to warnings
      const warnings: PrescriptionWarning[] = (interactionData.interactions || []).map((interaction: DrugInteraction) => ({
        type: 'interaction' as const,
        severity: interaction.severity,
        message: `${interaction.drug1} + ${interaction.drug2}: ${interaction.description}`,
        medications: [interaction.drug1, interaction.drug2],
      }));

      // Add known critical interactions from static database
      const staticWarnings = this.checkStaticInteractions(medicationNames);
      warnings.push(...staticWarnings);

      console.log(`✅ Found ${warnings.length} interaction warnings`);
      return {
        success: true,
        warnings,
        interactions: interactionData.interactions || [],
      };
    } catch (error) {
      console.error('❌ Drug interaction check failed:', error);
      return {
        success: false,
        warnings: [],
        error: error instanceof Error ? error.message : 'Interaction check failed',
      };
    }
  }

  async verifyDosages(
    medications: PrescribedMedication[],
    patientInfo: { age?: number; weight?: number; gender?: string }
  ): Promise<PrescriptionWarning[]> {
    try {
      console.log('📊 Verifying dosages for patient:', patientInfo);

      const warnings: PrescriptionWarning[] = [];

      for (const medication of medications) {
        const dosagePrompt = `
Verify if this dosage is appropriate:

Medicine: ${medication.name} ${medication.dosage}
Frequency: ${medication.frequency}
Duration: ${medication.duration}
Patient Age: ${patientInfo.age || 'unknown'}
Patient Weight: ${patientInfo.weight || 'unknown'}
Patient Gender: ${patientInfo.gender || 'unknown'}

Check against standard dosing guidelines and provide:
{
  "is_safe": true/false,
  "recommended_dosage": "standard recommended dosage",
  "warnings": ["warning 1", "warning 2"],
  "age_appropriate": true/false,
  "weight_appropriate": true/false,
  "notes": "additional notes"
}

Consider:
1. Standard adult/pediatric dosing
2. Maximum daily dose limits
3. Frequency appropriateness
4. Duration concerns
5. Special populations (elderly, pediatric)
`;

        try {
          const aiResponse = await aiService.makeRequest([
            {
              role: 'system',
              content: 'You are a clinical pharmacist expert in medication dosing and safety.',
            },
            {
              role: 'user',
              content: dosagePrompt,
            },
          ]);

          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          const dosageData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

          if (dosageData && !dosageData.is_safe) {
            warnings.push({
              type: 'dosage',
              severity: dosageData.warnings?.length > 0 ? 'medium' : 'low',
              message: `${medication.name}: ${dosageData.warnings?.join(', ') || 'Dosage verification needed'}`,
              medications: [medication.name],
            });
          }

          // Age-specific warnings
          if (patientInfo.age) {
            if (patientInfo.age < 18 && !dosageData?.age_appropriate) {
              warnings.push({
                type: 'age_restriction',
                severity: 'high',
                message: `${medication.name}: May require pediatric dosing adjustment for age ${patientInfo.age}`,
                medications: [medication.name],
              });
            }

            if (patientInfo.age > 65) {
              warnings.push({
                type: 'age_restriction',
                severity: 'medium',
                message: `${medication.name}: Consider dose reduction in elderly patients`,
                medications: [medication.name],
              });
            }
          }
        } catch (error) {
          console.warn(`Dosage verification failed for ${medication.name}:`, error);
        }

        // Static dosage checks for common medications
        const staticWarnings = this.checkStaticDosages(medication, patientInfo);
        warnings.push(...staticWarnings);
      }

      console.log(`✅ Generated ${warnings.length} dosage warnings`);
      return warnings;
    } catch (error) {
      console.error('❌ Dosage verification failed:', error);
      return [];
    }
  }

  private async enhanceMedicationData(medications: any[]): Promise<PrescribedMedication[]> {
    return medications.map((med) => ({
      name: med.name || '',
      genericName: med.genericName || med.name,
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      duration: med.duration || '',
      instructions: med.instructions || '',
      confidence: med.confidence || 0.8,
      found_in_stock: false, // Will be updated by stock check
      stock_quantity: 0,
      alternative_medicines: [],
    }));
  }

  private async checkStockAvailability(medications: PrescribedMedication[]): Promise<PrescribedMedication[]> {
    try {
      // This would integrate with your existing stock system
      // For now, we'll simulate stock checking
      return medications.map((med) => ({
        ...med,
        found_in_stock: Math.random() > 0.3, // 70% chance in stock
        stock_quantity: Math.floor(Math.random() * 100),
        alternative_medicines: this.findAlternatives(med.name),
      }));
    } catch (error) {
      console.error('Stock availability check failed:', error);
      return medications;
    }
  }

  private findAlternatives(medicineName: string): string[] {
    // Common medicine alternatives in Bangladesh
    const alternatives: Record<string, string[]> = {
      paracetamol: ['Napa', 'Ace', 'Para', 'Renova'],
      omeprazole: ['Seclo', 'Losectil', 'Omep', 'Gastrocure'],
      metformin: ['Diabex', 'Glycomet', 'Formet', 'Metformin'],
      amoxicillin: ['Moxacil', 'Amoxil', 'Novamox', 'Polymox'],
    };

    const key = medicineName.toLowerCase();
    return alternatives[key] || [];
  }

  private checkStaticInteractions(medicationNames: string[]): PrescriptionWarning[] {
    const warnings: PrescriptionWarning[] = [];
    
    // Known critical interactions
    const criticalInteractions = [
      {
        drugs: ['warfarin', 'aspirin'],
        message: 'Increased bleeding risk',
        severity: 'critical' as const,
      },
      {
        drugs: ['metformin', 'contrast'],
        message: 'Risk of lactic acidosis',
        severity: 'high' as const,
      },
    ];

    criticalInteractions.forEach((interaction) => {
      const foundDrugs = interaction.drugs.filter((drug) =>
        medicationNames.some((med) => med.toLowerCase().includes(drug))
      );
      
      if (foundDrugs.length === interaction.drugs.length) {
        warnings.push({
          type: 'interaction',
          severity: interaction.severity,
          message: interaction.message,
          medications: foundDrugs,
        });
      }
    });

    return warnings;
  }

  private checkStaticDosages(
    medication: PrescribedMedication,
    patientInfo: { age?: number; weight?: number }
  ): PrescriptionWarning[] {
    const warnings: PrescriptionWarning[] = [];
    const medName = medication.name.toLowerCase();

    // Paracetamol dosing
    if (medName.includes('paracetamol') || medName.includes('napa') || medName.includes('ace')) {
      const dosageMatch = medication.dosage.match(/(\d+)\s*mg/);
      const dose = dosageMatch ? parseInt(dosageMatch[1]) : 0;
      
      if (dose > 1000) {
        warnings.push({
          type: 'dosage',
          severity: 'high',
          message: `${medication.name}: Single dose exceeds 1000mg maximum`,
          medications: [medication.name],
        });
      }
      
      if (patientInfo.age && patientInfo.age < 12 && dose > 500) {
        warnings.push({
          type: 'age_restriction',
          severity: 'critical',
          message: `${medication.name}: Adult dose prescribed for pediatric patient`,
          medications: [medication.name],
        });
      }
    }

    return warnings;
  }
}

export const prescriptionAnalysisService = new PrescriptionAnalysisService();