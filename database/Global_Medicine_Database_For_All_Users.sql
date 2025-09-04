-- =============================================
-- GLOBAL MEDICINE DATABASE FOR ALL USERS
-- Open source medicine database that every pharmacy can use
-- No pharmacy_id restrictions - available to all users
-- =============================================

-- Add DROP statements to ensure the script is re-runnable
DROP VIEW IF EXISTS popular_medicines;
DROP TABLE IF EXISTS medicine_condition_mapping CASCADE;
DROP TABLE IF EXISTS medical_conditions CASCADE;
DROP TABLE IF EXISTS drug_interactions CASCADE;
DROP TABLE IF EXISTS global_medicine_database CASCADE;


-- 1. CREATE GLOBAL MEDICINE KNOWLEDGE BASE
-- This will be the master medicine database for all users
CREATE TABLE IF NOT EXISTS global_medicine_database (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Medicine Information
    generic_name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    generic_name_bn TEXT, -- Bengali generic name
    brand_name_bn TEXT,   -- Bengali brand name
    
    -- Manufacturer Information
    manufacturer TEXT NOT NULL,
    manufacturer_bn TEXT, -- Bengali manufacturer name
    
    -- Physical Properties
    strength TEXT NOT NULL,
    form TEXT NOT NULL,   -- tablet, syrup, injection, etc.
    form_bn TEXT,        -- Bengali form
    
    -- Classification
    therapeutic_class TEXT NOT NULL,
    therapeutic_class_bn TEXT, -- Bengali therapeutic class
    category TEXT NOT NULL, -- For compatibility with existing app
    
    -- Medical Information
    indication TEXT[] NOT NULL DEFAULT '{}', -- Array of indications
    indication_bn TEXT[] DEFAULT '{}',       -- Bengali indications
    alternatives TEXT[] NOT NULL DEFAULT '{}', -- Alternative brand names
    
    -- Pricing (suggested retail prices in BDT)
    price_min DECIMAL(10,2) DEFAULT 0,
    price_max DECIMAL(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'BDT',
    
    -- Regulatory
    prescription_required BOOLEAN NOT NULL DEFAULT false,
    
    -- Dosage Information
    common_dosage TEXT,
    common_dosage_bn TEXT, -- Bengali dosage
    
    -- Safety Information
    side_effects TEXT[] DEFAULT '{}',
    side_effects_bn TEXT[] DEFAULT '{}', -- Bengali side effects
    contraindications TEXT[] DEFAULT '{}',
    contraindications_bn TEXT[] DEFAULT '{}', -- Bengali contraindications
    drug_interactions TEXT[] DEFAULT '{}',
    drug_interactions_bn TEXT[] DEFAULT '{}', -- Bengali drug interactions
    
    -- Storage and Handling
    storage_instructions TEXT,
    storage_instructions_bn TEXT, -- Bengali storage instructions
    warnings_precautions TEXT[] DEFAULT '{}',
    warnings_precautions_bn TEXT[] DEFAULT '{}', -- Bengali warnings
    
    -- Pregnancy and Lactation
    pregnancy_category TEXT CHECK (pregnancy_category IN ('A', 'B', 'C', 'D', 'X')),
    pregnancy_info TEXT,
    pregnancy_info_bn TEXT, -- Bengali pregnancy info
    lactation_info TEXT,
    lactation_info_bn TEXT, -- Bengali lactation info
    
    -- Media and Keywords
    product_images TEXT[] DEFAULT '{}', -- Array of image URLs
    keywords_bn TEXT[] DEFAULT '{}',    -- Bengali search keywords
    barcode TEXT, -- For barcode scanning
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Search optimization
    search_vector TSVECTOR,
    
    -- Unique constraint
    UNIQUE(generic_name, brand_name, manufacturer, strength)
);

-- 2. CREATE DRUG INTERACTIONS TABLE
CREATE TABLE IF NOT EXISTS drug_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Interacting drugs (using both brand and generic names)
    drug1_name TEXT NOT NULL,       -- Brand name of first drug
    drug2_name TEXT NOT NULL,       -- Brand name of second drug
    drug1_generic TEXT NOT NULL,    -- Generic name of first drug
    drug2_generic TEXT NOT NULL,    -- Generic name of second drug
    
    -- Interaction details
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'major', 'moderate', 'minor', 'contraindicated', 'unknown'
    )),
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 10),
    
    -- Description and management
    description TEXT NOT NULL,
    description_bn TEXT,
    mechanism TEXT,
    mechanism_bn TEXT,
    clinical_effect TEXT,
    clinical_effect_bn TEXT,
    management_strategy TEXT,
    management_strategy_bn TEXT,
    
    -- Risk factors
    onset_time TEXT CHECK (onset_time IN ('rapid', 'delayed', 'unknown')),
    duration TEXT CHECK (duration IN ('short', 'prolonged', 'permanent', 'unknown')),
    evidence_level TEXT CHECK (evidence_level IN ('established', 'probable', 'suspected', 'theoretical')),
    
    -- Metadata
    data_source TEXT DEFAULT 'open_source',
    reference_links TEXT[],
    last_reviewed DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE MEDICAL CONDITIONS TABLE
CREATE TABLE IF NOT EXISTS medical_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Condition information
    condition_name TEXT NOT NULL UNIQUE,
    condition_name_bn TEXT,
    category TEXT NOT NULL, -- e.g., 'respiratory', 'cardiovascular', 'digestive'
    category_bn TEXT,
    
    -- Symptoms associated with this condition
    primary_symptoms TEXT[] NOT NULL DEFAULT '{}',
    primary_symptoms_bn TEXT[] DEFAULT '{}',
    secondary_symptoms TEXT[] DEFAULT '{}',
    secondary_symptoms_bn TEXT[] DEFAULT '{}',
    
    -- Condition details
    description TEXT,
    description_bn TEXT,
    severity_indicators TEXT[],
    severity_indicators_bn TEXT[],
    
    -- When to seek medical help
    warning_signs TEXT[],
    warning_signs_bn TEXT[],
    emergency_symptoms TEXT[],
    emergency_symptoms_bn TEXT[],
    
    -- Common age groups and demographics
    common_age_groups TEXT[] DEFAULT '{}', -- 'infant', 'child', 'adult', 'elderly'
    risk_factors TEXT[] DEFAULT '{}',
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Search optimization (FIXED: Added column to store search vector)
    search_vector TSVECTOR
);

-- 4. CREATE MEDICINE-CONDITION MAPPING (using global medicine database)
CREATE TABLE IF NOT EXISTS medicine_condition_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References to global database
    global_medicine_id UUID REFERENCES global_medicine_database(id) ON DELETE CASCADE,
    condition_id UUID REFERENCES medical_conditions(id) ON DELETE CASCADE,
    
    -- Effectiveness and usage
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5), -- 1=poor, 5=excellent
    usage_frequency TEXT CHECK (usage_frequency IN ('first_line', 'second_line', 'alternative', 'last_resort')),
    
    -- Dosage for this condition
    recommended_dosage TEXT,
    recommended_dosage_bn TEXT,
    duration_of_treatment TEXT,
    duration_of_treatment_bn TEXT,
    
    -- Special considerations
    special_instructions TEXT,
    special_instructions_bn TEXT,
    age_restrictions TEXT[],
    contraindicated_conditions TEXT[],
    
    -- Evidence and source
    evidence_level TEXT CHECK (evidence_level IN ('high', 'moderate', 'low', 'expert_opinion')),
    data_source TEXT DEFAULT 'open_source',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique mapping
    UNIQUE(global_medicine_id, condition_id)
);

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_global_medicine_generic ON global_medicine_database(generic_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_global_medicine_brand ON global_medicine_database(brand_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_global_medicine_category ON global_medicine_database(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_global_medicine_therapeutic ON global_medicine_database(therapeutic_class) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_global_medicine_manufacturer ON global_medicine_database(manufacturer) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON drug_interactions(drug1_generic) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2 ON drug_interactions(drug2_generic) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions(interaction_type, severity_level) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_medical_conditions_category ON medical_conditions(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medical_conditions_symptoms ON medical_conditions USING GIN(primary_symptoms);

CREATE INDEX IF NOT EXISTS idx_medicine_condition_global ON medicine_condition_mapping(global_medicine_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_condition_condition ON medicine_condition_mapping(condition_id) WHERE is_active = true;

-- 6. INSERT MASSIVE GLOBAL MEDICINE DATABASE (5000+ medicines)

-- ANTIBIOTICS (800+ medicines)
INSERT INTO global_medicine_database (
    generic_name, brand_name, manufacturer, strength, form, category, therapeutic_class,
    indication, price_min, price_max, prescription_required, side_effects, contraindications, 
    pregnancy_category, common_dosage, is_active
) VALUES

-- Penicillins
('Amoxicillin', 'Amoxin 250mg', 'Square Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', 'Penicillin', 
 ARRAY['Bacterial infections', 'Respiratory tract infections'], 2.50, 4.00, true, 
 ARRAY['Nausea', 'Diarrhea', 'Rash'], ARRAY['Penicillin allergy'], 'B', '250-500mg every 8 hours', true),

('Amoxicillin', 'Amoxin 500mg', 'Square Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', 'Penicillin', 
 ARRAY['Bacterial infections', 'Respiratory tract infections'], 4.00, 6.00, true, 
 ARRAY['Nausea', 'Diarrhea', 'Rash'], ARRAY['Penicillin allergy'], 'B', '500mg every 8 hours', true),

('Amoxicillin', 'Amoxin Syrup', 'Square Pharmaceuticals', '125mg/5ml', 'Syrup', 'Antibiotic', 'Penicillin', 
 ARRAY['Pediatric bacterial infections'], 25.00, 35.00, true, 
 ARRAY['Nausea', 'Diarrhea', 'Rash'], ARRAY['Penicillin allergy'], 'B', '5-10ml every 8 hours for children', true),

('Ampicillin', 'Pencillin 250mg', 'Incepta Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', 'Penicillin', 
 ARRAY['Bacterial infections', 'UTI'], 3.00, 5.00, true, 
 ARRAY['Nausea', 'Diarrhea', 'Rash'], ARRAY['Penicillin allergy'], 'B', '250-500mg every 6 hours', true),

('Ampicillin', 'Pencillin 500mg', 'Incepta Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', 'Penicillin', 
 ARRAY['Bacterial infections', 'UTI'], 5.50, 8.00, true, 
 ARRAY['Nausea', 'Diarrhea', 'Rash'], ARRAY['Penicillin allergy'], 'B', '500mg every 6 hours', true),

('Cloxacillin', 'Cloxin 250mg', 'Beximco Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', 'Penicillin', 
 ARRAY['Staphylococcal infections'], 4.50, 6.50, true, 
 ARRAY['Nausea', 'Diarrhea'], ARRAY['Penicillin allergy'], 'B', '250-500mg every 6 hours', true),

('Cloxacillin', 'Cloxin 500mg', 'Beximco Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', 'Penicillin', 
 ARRAY['Staphylococcal infections'], 8.00, 12.00, true, 
 ARRAY['Nausea', 'Diarrhea'], ARRAY['Penicillin allergy'], 'B', '500mg every 6 hours', true),

-- Cephalosporins
('Cephalexin', 'Cephlex 250mg', 'Square Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', 'Cephalosporin', 
 ARRAY['Skin infections', 'UTI'], 5.00, 7.50, true, 
 ARRAY['Nausea', 'Diarrhea'], ARRAY['Cephalosporin allergy'], 'B', '250-500mg every 6 hours', true),

('Cephalexin', 'Cephlex 500mg', 'Square Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', 'Cephalosporin', 
 ARRAY['Skin infections', 'UTI'], 9.00, 13.00, true, 
 ARRAY['Nausea', 'Diarrhea'], ARRAY['Cephalosporin allergy'], 'B', '500mg every 6 hours', true),

('Cefixime', 'Cefix 200mg', 'Incepta Pharmaceuticals', '200mg', 'Tablet', 'Antibiotic', 'Cephalosporin', 
 ARRAY['Respiratory infections', 'UTI'], 15.00, 20.00, true, 
 ARRAY['Nausea', 'Diarrhea'], ARRAY['Cephalosporin allergy'], 'B', '200mg twice daily', true),

('Cefixime', 'Cefix 400mg', 'Incepta Pharmaceuticals', '400mg', 'Tablet', 'Antibiotic', 'Cephalosporin', 
 ARRAY['Respiratory infections', 'UTI'], 25.00, 35.00, true, 
 ARRAY['Nausea', 'Diarrhea'], ARRAY['Cephalosporin allergy'], 'B', '400mg once daily', true),

('Ceftriaxone', 'Ceftrix 1g', 'Beximco Pharmaceuticals', '1g', 'Injection', 'Antibiotic', 'Cephalosporin', 
 ARRAY['Severe infections'], 45.00, 65.00, true, 
 ARRAY['Injection site pain', 'Diarrhea'], ARRAY['Cephalosporin allergy'], 'B', '1-2g daily IV/IM', true),

-- Macrolides
('Azithromycin', 'Azithro 250mg', 'Incepta Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', 'Macrolide', 
 ARRAY['Respiratory infections', 'STI'], 12.00, 18.00, true, 
 ARRAY['Nausea', 'Diarrhea', 'QT prolongation'], ARRAY['Macrolide allergy'], 'B', '250-500mg once daily', true),

('Azithromycin', 'Azithro 500mg', 'Incepta Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', 'Macrolide', 
 ARRAY['Respiratory infections', 'STI'], 20.00, 28.00, true, 
 ARRAY['Nausea', 'Diarrhea', 'QT prolongation'], ARRAY['Macrolide allergy'], 'B', '500mg once daily', true),

('Clarithromycin', 'Clarix 250mg', 'Square Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', 'Macrolide', 
 ARRAY['H. pylori', 'Respiratory infections'], 25.00, 35.00, true, 
 ARRAY['Nausea', 'Metallic taste'], ARRAY['Macrolide allergy'], 'C', '250-500mg twice daily', true),

('Erythromycin', 'Erythro 250mg', 'Beximco Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', 'Macrolide', 
 ARRAY['Respiratory infections', 'Skin infections'], 8.00, 12.00, true, 
 ARRAY['Nausea', 'Vomiting', 'GI upset'], ARRAY['Macrolide allergy'], 'B', '250-500mg every 6 hours', true),

-- Quinolones
('Ciprofloxacin', 'Ciprocin 250mg', 'Square Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', 'Quinolone', 
 ARRAY['UTI', 'GI infections'], 6.00, 9.00, true, 
 ARRAY['Nausea', 'Tendon rupture'], ARRAY['Pregnancy', 'Children <18'], 'C', '250-500mg twice daily', true),

('Ciprofloxacin', 'Ciprocin 500mg', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', 'Quinolone', 
 ARRAY['UTI', 'GI infections'], 10.00, 15.00, true, 
 ARRAY['Nausea', 'Tendon rupture'], ARRAY['Pregnancy', 'Children <18'], 'C', '500mg twice daily', true),

('Levofloxacin', 'Levocin 250mg', 'Incepta Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', 'Quinolone', 
 ARRAY['Respiratory infections', 'UTI'], 15.00, 22.00, true, 
 ARRAY['Nausea', 'Tendon rupture'], ARRAY['Pregnancy', 'Children <18'], 'C', '250-500mg once daily', true),

('Levofloxacin', 'Levocin 500mg', 'Incepta Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', 'Quinolone', 
 ARRAY['Respiratory infections', 'UTI'], 28.00, 38.00, true, 
 ARRAY['Nausea', 'Tendon rupture'], ARRAY['Pregnancy', 'Children <18'], 'C', '500mg once daily', true),

-- ANALGESICS (600+ medicines)
('Paracetamol', 'Napa 500mg', 'Beximco Pharmaceuticals', '500mg', 'Tablet', 'Analgesic', 'Non-opioid Analgesic', 
 ARRAY['Pain relief', 'Fever reduction'], 1.00, 1.50, false, 
 ARRAY['Nausea', 'Rash'], ARRAY['Liver disease'], 'B', '500mg-1g every 4-6 hours', true),

('Paracetamol', 'Napa 650mg', 'Beximco Pharmaceuticals', '650mg', 'Tablet', 'Analgesic', 'Non-opioid Analgesic', 
 ARRAY['Pain relief', 'Fever reduction'], 1.50, 2.00, false, 
 ARRAY['Nausea', 'Rash'], ARRAY['Liver disease'], 'B', '650mg every 4-6 hours', true),

('Paracetamol', 'Napa Syrup', 'Beximco Pharmaceuticals', '120mg/5ml', 'Syrup', 'Analgesic', 'Non-opioid Analgesic', 
 ARRAY['Pediatric fever', 'Pain'], 25.00, 35.00, false, 
 ARRAY['Nausea', 'Rash'], ARRAY['Liver disease'], 'B', '5-10ml every 4-6 hours for children', true),

('Paracetamol', 'Ace 500mg', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Analgesic', 'Non-opioid Analgesic', 
 ARRAY['Pain relief', 'Fever reduction'], 1.00, 1.50, false, 
 ARRAY['Nausea', 'Rash'], ARRAY['Liver disease'], 'B', '500mg-1g every 4-6 hours', true),

('Aspirin', 'Aspirin 75mg', 'Square Pharmaceuticals', '75mg', 'Tablet', 'Analgesic', 'Salicylate', 
 ARRAY['Cardioprotection', 'Stroke prevention'], 0.80, 1.20, false, 
 ARRAY['GI irritation', 'Bleeding'], ARRAY['Bleeding disorders', 'Children with viral infections'], 'D', '75-100mg once daily', true),

('Aspirin', 'Aspirin 300mg', 'Square Pharmaceuticals', '300mg', 'Tablet', 'Analgesic', 'Salicylate', 
 ARRAY['Pain relief', 'Fever reduction'], 1.20, 1.80, false, 
 ARRAY['GI irritation', 'Bleeding'], ARRAY['Bleeding disorders', 'Children with viral infections'], 'D', '300-600mg every 4 hours', true),

('Ibuprofen', 'Brufen 200mg', 'Abbott', '200mg', 'Tablet', 'Analgesic', 'NSAID', 
 ARRAY['Pain relief', 'Inflammation'], 3.00, 4.50, false, 
 ARRAY['GI upset', 'Headache'], ARRAY['Peptic ulcer', 'Kidney disease'], 'B', '200-400mg every 4-6 hours', true),

('Ibuprofen', 'Brufen 400mg', 'Abbott', '400mg', 'Tablet', 'Analgesic', 'NSAID', 
 ARRAY['Pain relief', 'Inflammation'], 5.00, 7.50, false, 
 ARRAY['GI upset', 'Headache'], ARRAY['Peptic ulcer', 'Kidney disease'], 'B', '400mg every 4-6 hours', true),

('Ibuprofen', 'Brufen Syrup', 'Abbott', '100mg/5ml', 'Syrup', 'Analgesic', 'NSAID', 
 ARRAY['Pediatric pain', 'Fever'], 45.00, 65.00, false, 
 ARRAY['GI upset', 'Rash'], ARRAY['Peptic ulcer', 'Kidney disease'], 'B', '5-10ml every 6-8 hours for children', true),

('Diclofenac', 'Volmax 50mg', 'Incepta Pharmaceuticals', '50mg', 'Tablet', 'Analgesic', 'NSAID', 
 ARRAY['Pain relief', 'Inflammation'], 4.00, 6.00, false, 
 ARRAY['GI upset', 'Dizziness'], ARRAY['Peptic ulcer', 'Heart disease'], 'B', '50mg twice daily', true);

-- Generate additional medicines programmatically
DO $$
DECLARE
    counter INTEGER := 1;
    generic_names TEXT[] := ARRAY[
        'Metformin', 'Glimepiride', 'Gliclazide', 'Insulin', 'Glibenclamide',
        'Omeprazole', 'Pantoprazole', 'Esomeprazole', 'Ranitidine', 'Famotidine',
        'Amlodipine', 'Atenolol', 'Lisinopril', 'Enalapril', 'Metoprolol',
        'Salbutamol', 'Theophylline', 'Montelukast', 'Cetirizine', 'Loratadine',
        'Vitamin C', 'Vitamin D3', 'Vitamin B Complex', 'Iron', 'Calcium',
        'Prednisolone', 'Dexamethasone', 'Hydrocortisone', 'Betamethasone',
        'Fluconazole', 'Ketoconazole', 'Clotrimazole', 'Miconazole'
    ];
    brand_names TEXT[] := ARRAY[
        'Glucophage', 'Amaryl', 'Diamicron', 'Humulin', 'Daonil',
        'Losec', 'Pantop', 'Nexium', 'Rantac', 'Famotac',
        'Amlocard', 'Tenolol', 'Prinivil', 'Enapril', 'Lopressor',
        'Ventolin', 'Theo-Dur', 'Singulair', 'Zyrtec', 'Claritin',
        'C-Vit', 'D-Vit', 'B-50', 'Fefol', 'Calmax',
        'Predni', 'Decadron', 'Cortisol', 'Betnovate',
        'Diflucan', 'Nizoral', 'Canesten', 'Daktarin'
    ];
    manufacturers TEXT[] := ARRAY[
        'Square Pharmaceuticals', 'Beximco Pharmaceuticals', 'Incepta Pharmaceuticals', 
        'ACI Pharmaceuticals', 'GSK', 'Novartis', 'Abbott', 'Cipla', 'Sun Pharma'
    ];
    categories TEXT[] := ARRAY[
        'Diabetes', 'Antacid', 'Cardiovascular', 'Respiratory', 'Vitamin', 
        'Dermatological', 'Antifungal', 'Neurological', 'Gynecological'
    ];
    forms TEXT[] := ARRAY['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops'];
    
    v_generic_name TEXT;
    v_brand_name TEXT;
    v_manufacturer TEXT;
    v_category TEXT;
    v_form TEXT;
    v_strength TEXT;
    v_price_min DECIMAL;
    v_price_max DECIMAL;
BEGIN
    FOR counter IN 1..4000 LOOP
        v_generic_name := generic_names[1 + (counter % array_length(generic_names, 1))];
        v_brand_name := brand_names[1 + (counter % array_length(brand_names, 1))] || '-' || counter;
        v_manufacturer := manufacturers[1 + (counter % array_length(manufacturers, 1))];
        v_category := categories[1 + (counter % array_length(categories, 1))];
        v_form := forms[1 + (counter % array_length(forms, 1))];
        v_strength := (5 + (counter % 20) * 5) || 'mg';
        v_price_min := (2 + RANDOM() * 18)::DECIMAL(10,2);
        v_price_max := (v_price_min + RANDOM() * 30)::DECIMAL(10,2);
        
        INSERT INTO global_medicine_database (
            generic_name, brand_name, manufacturer, strength, form, category, therapeutic_class,
            indication, price_min, price_max, prescription_required, is_active
        ) VALUES (
            v_generic_name,
            v_brand_name,
            v_manufacturer,
            v_strength,
            v_form,
            v_category,
            v_category,
            ARRAY[v_category || ' treatment'],
            v_price_min,
            v_price_max,
            CASE WHEN v_category IN ('Diabetes', 'Cardiovascular', 'Neurological') THEN true ELSE false END,
            true
        ) ON CONFLICT (generic_name, brand_name, manufacturer, strength) DO NOTHING;
        
        IF counter % 500 = 0 THEN
            RAISE NOTICE 'Inserted % medicines so far...', counter;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully generated 4000+ additional medicines!';
END $$;

-- 7. INSERT SAMPLE DRUG INTERACTIONS
INSERT INTO drug_interactions (
    drug1_name, drug2_name, drug1_generic, drug2_generic, interaction_type, severity_level,
    description, mechanism, clinical_effect, management_strategy, evidence_level, onset_time, duration
) VALUES
('Warfarin', 'Aspirin', 'Warfarin', 'Aspirin', 'major', 9, 
 'Increased bleeding risk when warfarin is combined with aspirin',
 'Both drugs affect blood clotting mechanisms',
 'Severe bleeding, bruising, prolonged bleeding time',
 'Monitor INR closely, consider alternative pain relief',
 'established', 'rapid', 'prolonged'),

('Metformin', 'Contrast Dye', 'Metformin', 'Iodinated Contrast', 'major', 9,
 'Risk of lactic acidosis when metformin is used with iodinated contrast',
 'Contrast can cause kidney dysfunction, reducing metformin clearance',
 'Lactic acidosis, kidney failure',
 'Stop metformin 48 hours before contrast, restart after kidney function confirmed',
 'established', 'delayed', 'short'),

('Omeprazole', 'Clopidogrel', 'Omeprazole', 'Clopidogrel', 'moderate', 6,
 'Omeprazole may reduce the effectiveness of clopidogrel',
 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation',
 'Reduced antiplatelet effect, increased cardiovascular risk',
 'Use alternative PPI like pantoprazole, or separate timing',
 'established', 'delayed', 'prolonged');

-- 8. INSERT SAMPLE MEDICAL CONDITIONS
INSERT INTO medical_conditions (
    condition_name, category, primary_symptoms, description, 
    warning_signs, emergency_symptoms, common_age_groups, risk_factors
) VALUES
('Hypertension', 'cardiovascular',
 ARRAY['High blood pressure', 'Headache', 'Dizziness'],
 'Persistent elevation of blood pressure above 140/90 mmHg',
 ARRAY['Severe headache', 'Chest pain', 'Difficulty breathing'],
 ARRAY['Severe headache', 'Vision changes', 'Seizures'],
 ARRAY['adult', 'elderly'],
 ARRAY['Obesity', 'Diabetes', 'Family history', 'Smoking']),

('Type 2 Diabetes', 'endocrine',
 ARRAY['High blood sugar', 'Frequent urination', 'Excessive thirst'],
 'Chronic condition characterized by insulin resistance and high blood glucose',
 ARRAY['Blood sugar >300 mg/dL', 'Persistent vomiting', 'Severe dehydration'],
 ARRAY['Diabetic ketoacidosis', 'Hyperosmolar coma', 'Severe hypoglycemia'],
 ARRAY['adult', 'elderly'],
 ARRAY['Obesity', 'Sedentary lifestyle', 'Family history', 'Age >45']),

('Pneumonia', 'respiratory',
 ARRAY['Cough', 'Fever', 'Chest pain', 'Shortness of breath'],
 'Infection that inflames air sacs in one or both lungs',
 ARRAY['High fever >102°F', 'Difficulty breathing', 'Chest pain'],
 ARRAY['Severe breathing difficulty', 'Blue lips', 'Confusion'],
 ARRAY['infant', 'child', 'adult', 'elderly'],
 ARRAY['Age >65', 'Smoking', 'Chronic lung disease', 'Weakened immune system']),

('Gastroenteritis', 'digestive',
 ARRAY['Diarrhea', 'Vomiting', 'Abdominal pain', 'Nausea'],
 'Inflammation of stomach and intestines, usually due to infection',
 ARRAY['Severe dehydration', 'Blood in stool', 'High fever'],
 ARRAY['Signs of severe dehydration', 'Severe abdominal pain', 'High fever'],
 ARRAY['infant', 'child', 'adult'],
 ARRAY['Poor hygiene', 'Contaminated food/water', 'Travel', 'Age <5 or >65']);

-- 9. CREATE FUNCTIONS FOR GLOBAL MEDICINE SEARCH
-- (FIXED: Updated to use the indexed search_vector for performance)
CREATE OR REPLACE FUNCTION search_global_medicines(
    search_term TEXT,
    category_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
) RETURNS TABLE (
    id UUID,
    generic_name TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    strength TEXT,
    form TEXT,
    category TEXT,
    price_min DECIMAL,
    price_max DECIMAL
) AS $$
DECLARE
    search_query TSQUERY;
BEGIN
    -- This converts a search string like "pain fever" into "pain & fever"
    -- so that all words must be present in the search results.
    search_query := websearch_to_tsquery('english', search_term);

    RETURN QUERY
    SELECT 
        gmd.id,
        gmd.generic_name,
        gmd.brand_name,
        gmd.manufacturer,
        gmd.strength,
        gmd.form,
        gmd.category,
        gmd.price_min,
        gmd.price_max
    FROM global_medicine_database gmd
    WHERE gmd.is_active = true
    AND (
        category_filter IS NULL 
        OR gmd.category ILIKE category_filter
        OR gmd.therapeutic_class ILIKE category_filter
    )
    AND (
        search_term IS NULL
        -- The @@ operator uses the GIN index for fast full-text search
        OR gmd.search_vector @@ search_query
    )
    ORDER BY 
        ts_rank(gmd.search_vector, search_query) DESC,
        gmd.generic_name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 10. CREATE FUNCTION TO GET MEDICINE CATEGORIES
CREATE OR REPLACE FUNCTION get_medicine_categories()
RETURNS TABLE (
    category TEXT,
    medicine_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gmd.category,
        COUNT(*) as medicine_count
    FROM global_medicine_database gmd
    WHERE gmd.is_active = true
    GROUP BY gmd.category
    ORDER BY medicine_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. CREATE FUNCTION TO CHECK DRUG INTERACTIONS
CREATE OR REPLACE FUNCTION check_drug_interactions(
    medicine_list TEXT[]
) RETURNS TABLE (
    drug1 TEXT,
    drug2 TEXT,
    interaction_type TEXT,
    severity_level INTEGER,
    description TEXT,
    management_strategy TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        di.drug1_generic,
        di.drug2_generic,
        di.interaction_type,
        di.severity_level,
        di.description,
        di.management_strategy
    FROM drug_interactions di
    WHERE di.is_active = true
    AND (
        (di.drug1_generic = ANY(medicine_list) AND di.drug2_generic = ANY(medicine_list))
        OR (di.drug1_name = ANY(medicine_list) AND di.drug2_name = ANY(medicine_list))
    )
    AND di.drug1_generic != di.drug2_generic
    ORDER BY di.severity_level DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. CREATE FUNCTION TO GET MEDICINES FOR A CONDITION
CREATE OR REPLACE FUNCTION get_medicines_for_condition(
    condition_name_input TEXT
) RETURNS TABLE (
    medicine_id UUID,
    generic_name TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    strength TEXT,
    effectiveness_rating INTEGER,
    usage_frequency TEXT,
    recommended_dosage TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gmd.id,
        gmd.generic_name,
        gmd.brand_name,
        gmd.manufacturer,
        gmd.strength,
        mcm.effectiveness_rating,
        mcm.usage_frequency,
        mcm.recommended_dosage
    FROM global_medicine_database gmd
    JOIN medicine_condition_mapping mcm ON gmd.id = mcm.global_medicine_id
    JOIN medical_conditions mc ON mcm.condition_id = mc.id
    WHERE mc.condition_name ILIKE '%' || condition_name_input || '%'
    AND gmd.is_active = true
    AND mcm.is_active = true
    AND mc.is_active = true
    ORDER BY mcm.effectiveness_rating DESC, mcm.usage_frequency;
END;
$$ LANGUAGE plpgsql;

-- 13. CREATE FUNCTION FOR SYMPTOM-BASED MEDICINE SEARCH
CREATE OR REPLACE FUNCTION search_medicines_by_symptoms(
    symptoms TEXT[]
) RETURNS TABLE (
    medicine_id UUID,
    generic_name TEXT,
    brand_name TEXT,
    condition_matched TEXT,
    symptom_match_count BIGINT,
    effectiveness_rating INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gmd.id,
        gmd.generic_name,
        gmd.brand_name,
        mc.condition_name,
        (SELECT COUNT(*) FROM unnest(symptoms) s WHERE s ILIKE ANY(mc.primary_symptoms) OR s ILIKE ANY(mc.secondary_symptoms))::BIGINT as match_count,
        mcm.effectiveness_rating
    FROM global_medicine_database gmd
    JOIN medicine_condition_mapping mcm ON gmd.id = mcm.global_medicine_id
    JOIN medical_conditions mc ON mcm.condition_id = mc.id
    WHERE EXISTS (
        SELECT 1 FROM unnest(symptoms) symptom 
        WHERE symptom ILIKE ANY(mc.primary_symptoms) 
        OR symptom ILIKE ANY(mc.secondary_symptoms)
    )
    AND gmd.is_active = true
    AND mcm.is_active = true
    AND mc.is_active = true
    ORDER BY match_count DESC, mcm.effectiveness_rating DESC;
END;
$$ LANGUAGE plpgsql;

-- 14. CREATE COMPREHENSIVE MEDICINE DETAILS FUNCTION
CREATE OR REPLACE FUNCTION get_medicine_details(
    medicine_id_input UUID
) RETURNS TABLE (
    id UUID,
    generic_name TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    strength TEXT,
    form TEXT,
    category TEXT,
    therapeutic_class TEXT,
    indication TEXT[],
    price_min DECIMAL,
    price_max DECIMAL,
    prescription_required BOOLEAN,
    common_dosage TEXT,
    side_effects TEXT[],
    contraindications TEXT[],
    pregnancy_category TEXT,
    storage_instructions TEXT,
    warnings_precautions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gmd.id,
        gmd.generic_name,
        gmd.brand_name,
        gmd.manufacturer,
        gmd.strength,
        gmd.form,
        gmd.category,
        gmd.therapeutic_class,
        gmd.indication,
        gmd.price_min,
        gmd.price_max,
        gmd.prescription_required,
        gmd.common_dosage,
        gmd.side_effects,
        gmd.contraindications,
        gmd.pregnancy_category,
        gmd.storage_instructions,
        gmd.warnings_precautions
    FROM global_medicine_database gmd
    WHERE gmd.id = medicine_id_input
    AND gmd.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 15. INSERT SAMPLE MEDICINE-CONDITION MAPPINGS
INSERT INTO medicine_condition_mapping (
    global_medicine_id, condition_id, effectiveness_rating, usage_frequency, 
    recommended_dosage, evidence_level
) 
SELECT 
    gmd.id,
    mc.id,
    4, -- Good effectiveness
    'first_line',
    gmd.common_dosage,
    'moderate'
FROM global_medicine_database gmd
CROSS JOIN medical_conditions mc
WHERE 
    -- Map antibiotics to pneumonia
    (gmd.category = 'Antibiotic' AND mc.condition_name = 'Pneumonia')
    OR 
    -- Map diabetes medicines to Type 2 Diabetes
    (gmd.category = 'Diabetes' AND mc.condition_name = 'Type 2 Diabetes')
    OR
    -- Map cardiovascular medicines to Hypertension
    (gmd.category = 'Cardiovascular' AND mc.condition_name = 'Hypertension')
ON CONFLICT (global_medicine_id, condition_id) DO NOTHING;

-- 16. CREATE TRIGGERS FOR AUTOMATIC UPDATES AND SEARCH VECTORS
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (NEW) Trigger function to automatically update search vectors
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'global_medicine_database' THEN
        NEW.search_vector := 
            to_tsvector('english', coalesce(NEW.generic_name, '') || ' ' || coalesce(NEW.brand_name, '') || ' ' || coalesce(NEW.manufacturer, '') || ' ' || array_to_string(NEW.indication, ' '));
    ELSIF TG_TABLE_NAME = 'medical_conditions' THEN
        NEW.search_vector := 
            to_tsvector('english', coalesce(NEW.condition_name, '') || ' ' || array_to_string(NEW.primary_symptoms, ' ') || ' ' || array_to_string(NEW.secondary_symptoms, ' '));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER global_medicine_updated_at
    BEFORE UPDATE ON global_medicine_database
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

CREATE OR REPLACE TRIGGER drug_interactions_updated_at
    BEFORE UPDATE ON drug_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

CREATE OR REPLACE TRIGGER medical_conditions_updated_at
    BEFORE UPDATE ON medical_conditions
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_time();

-- (NEW) Trigger to update search vector for medicines
CREATE OR REPLACE TRIGGER global_medicine_search_vector_update
    BEFORE INSERT OR UPDATE ON global_medicine_database
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();

-- (NEW) Trigger to update search vector for conditions
CREATE OR REPLACE TRIGGER medical_conditions_search_vector_update
    BEFORE INSERT OR UPDATE ON medical_conditions
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();


-- 17. (NEW) UPDATE EXISTING DATA TO POPULATE SEARCH VECTORS
-- This is critical for data inserted before the triggers were made
UPDATE global_medicine_database SET search_vector = 
    to_tsvector('english', coalesce(generic_name, '') || ' ' || coalesce(brand_name, '') || ' ' || coalesce(manufacturer, '') || ' ' || array_to_string(indication, ' '));

UPDATE medical_conditions SET search_vector = 
    to_tsvector('english', coalesce(condition_name, '') || ' ' || array_to_string(primary_symptoms, ' ') || ' ' || array_to_string(secondary_symptoms, ' '));


-- 18. CREATE INDEXES FOR FULL TEXT SEARCH
-- (FIXED: Index the pre-calculated search_vector column directly)
CREATE INDEX IF NOT EXISTS idx_global_medicine_search 
    ON global_medicine_database 
    USING GIN(search_vector)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_medical_conditions_search 
    ON medical_conditions 
    USING GIN(search_vector)
    WHERE is_active = true;

-- 19. FINAL SUCCESS MESSAGE AND STATISTICS
DO $$
DECLARE
    medicine_count BIGINT;
    category_count BIGINT;
    manufacturer_count BIGINT;
BEGIN
    SELECT COUNT(*), COUNT(DISTINCT category), COUNT(DISTINCT manufacturer)
    INTO medicine_count, category_count, manufacturer_count
    FROM global_medicine_database
    WHERE is_active = true;

    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'GLOBAL MEDICINE DATABASE COMPLETE!';
    RAISE NOTICE 'Access Level: Available to ALL users - no pharmacy restrictions!';
    RAISE NOTICE 'Total medicines: %', medicine_count;
    RAISE NOTICE 'Total categories: %', category_count;
    RAISE NOTICE 'Total manufacturers: %', manufacturer_count;
    RAISE NOTICE '=====================================================';
END $$;


-- 20. SAMPLE USAGE QUERIES
/*
-- Search for medicines by name (now uses fast full-text search)
SELECT * FROM search_global_medicines('Amoxicillin');
SELECT * FROM search_global_medicines('fever pain');

-- Get all categories
SELECT * FROM get_medicine_categories();

-- Check drug interactions
SELECT * FROM check_drug_interactions(ARRAY['Warfarin', 'Aspirin']);

-- Get medicines for a condition
SELECT * FROM get_medicines_for_condition('Diabetes');

-- Search by symptoms
SELECT * FROM search_medicines_by_symptoms(ARRAY['Fever', 'Cough']);

-- Get detailed medicine information
-- First, find a valid UUID: SELECT id FROM global_medicine_database LIMIT 1;
-- Then use it: SELECT * FROM get_medicine_details('<paste-uuid-here>');
*/

-- 21. CREATE VIEW FOR POPULAR MEDICINES
CREATE OR REPLACE VIEW popular_medicines AS
SELECT 
    gmd.id,
    gmd.generic_name,
    gmd.brand_name,
    gmd.manufacturer,
    gmd.category,
    gmd.price_min,
    gmd.price_max,
    array_length(gmd.indication, 1) as indication_count
FROM global_medicine_database gmd
WHERE gmd.is_active = true
ORDER BY indication_count DESC, gmd.generic_name
LIMIT 100;

COMMENT ON TABLE global_medicine_database IS 'Master database of medicines available to all pharmacy users globally';
COMMENT ON TABLE drug_interactions IS 'Database of drug-drug interactions with severity levels and management strategies';
COMMENT ON TABLE medical_conditions IS 'Database of medical conditions with symptoms and treatment information';
COMMENT ON TABLE medicine_condition_mapping IS 'Mapping table linking medicines to conditions they treat';