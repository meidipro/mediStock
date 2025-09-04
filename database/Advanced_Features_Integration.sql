-- =============================================
-- ADVANCED FEATURES INTEGRATION
-- Drug Interactions, Bilingual Support, Symptom Mapping
-- Run this after all medicine phases to add advanced functionality
-- =============================================

-- 1. CREATE MEDICINE KNOWLEDGE BASE (from Bilingual Medicine Knowledge Base Schema.sql)
CREATE TABLE IF NOT EXISTS medicine_knowledge_base (
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
    
    -- Medical Information
    indication TEXT[] NOT NULL DEFAULT '{}', -- Array of indications
    indication_bn TEXT[] DEFAULT '{}',       -- Bengali indications
    alternatives TEXT[] NOT NULL DEFAULT '{}', -- Alternative brand names
    
    -- Pricing
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
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Search optimization
    search_vector TSVECTOR
);

-- 2. CREATE DRUG INTERACTIONS TABLE (from Drug Interaction Warning System.sql)
CREATE TABLE IF NOT EXISTS drug_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Interacting drugs (can be generic names or specific medicine IDs)
    drug1_name TEXT NOT NULL,
    drug2_name TEXT NOT NULL,
    drug1_knowledge_id UUID REFERENCES medicine_knowledge_base(id),
    drug2_knowledge_id UUID REFERENCES medicine_knowledge_base(id),
    
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
    data_source TEXT DEFAULT 'manual_entry',
    reference_links TEXT[],
    last_reviewed DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE MEDICAL CONDITIONS TABLE (from Symptom-Based Medicine Recommendation System.sql)
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE MEDICINE-CONDITION MAPPING
CREATE TABLE IF NOT EXISTS medicine_condition_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    condition_id UUID REFERENCES medical_conditions(id) ON DELETE CASCADE,
    knowledge_base_id UUID REFERENCES medicine_knowledge_base(id),
    
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
    data_source TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique mapping
    UNIQUE(medicine_id, condition_id)
);

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_medicine_knowledge_search ON medicine_knowledge_base USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_medicine_knowledge_generic ON medicine_knowledge_base(generic_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_knowledge_brand ON medicine_knowledge_base(brand_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_knowledge_therapeutic ON medicine_knowledge_base(therapeutic_class) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON drug_interactions(drug1_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2 ON drug_interactions(drug2_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions(interaction_type, severity_level) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_medical_conditions_category ON medical_conditions(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medical_conditions_symptoms ON medical_conditions USING GIN(primary_symptoms);

CREATE INDEX IF NOT EXISTS idx_medicine_condition_medicine ON medicine_condition_mapping(medicine_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_condition_condition ON medicine_condition_mapping(condition_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_condition_effectiveness ON medicine_condition_mapping(effectiveness_rating, usage_frequency) WHERE is_active = true;

-- 6. INSERT SAMPLE DRUG INTERACTIONS
INSERT INTO drug_interactions (
    drug1_name, drug2_name, interaction_type, severity_level,
    description, description_bn, mechanism, clinical_effect, management_strategy,
    evidence_level, onset_time, duration
) VALUES
-- Major interactions
('Warfarin', 'Aspirin', 'major', 9, 
 'Increased bleeding risk when warfarin is combined with aspirin',
 'ওয়ারফারিন ও এসপিরিনের সংমিশ্রণে রক্তপাতের ঝুঁকি বৃদ্ধি',
 'Both drugs affect blood clotting mechanisms',
 'Severe bleeding, bruising, prolonged bleeding time',
 'Monitor INR closely, consider alternative pain relief',
 'established', 'rapid', 'prolonged'),

('ACE Inhibitors', 'Potassium Supplements', 'major', 8,
 'Risk of hyperkalemia when ACE inhibitors are combined with potassium',
 'এসিই ইনহিবিটর ও পটাশিয়ামের সংমিশ্রণে হাইপারক্যালেমিয়ার ঝুঁকি',
 'Both increase serum potassium levels',
 'Cardiac arrhythmias, muscle weakness',
 'Monitor serum potassium regularly, adjust doses',
 'established', 'delayed', 'short'),

('Metformin', 'Contrast Dye', 'major', 9,
 'Risk of lactic acidosis when metformin is used with iodinated contrast',
 'মেটফরমিন ও কনট্রাস্ট ডাইয়ের সংমিশ্রণে ল্যাকটিক অ্যাসিডোসিসের ঝুঁকি',
 'Contrast can cause kidney dysfunction, reducing metformin clearance',
 'Lactic acidosis, kidney failure',
 'Stop metformin 48 hours before contrast, restart after kidney function confirmed',
 'established', 'delayed', 'short'),

-- Moderate interactions
('Omeprazole', 'Clopidogrel', 'moderate', 6,
 'Omeprazole may reduce the effectiveness of clopidogrel',
 'ওমিপ্রাজল ক্লোপিডোগ্রেলের কার্যকারিতা কমাতে পারে',
 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation',
 'Reduced antiplatelet effect, increased cardiovascular risk',
 'Use alternative PPI like pantoprazole, or separate timing',
 'established', 'delayed', 'prolonged'),

('Ciprofloxacin', 'Theophylline', 'moderate', 7,
 'Ciprofloxacin increases theophylline levels',
 'সিপ্রোফ্লক্সাসিন থিওফাইলিনের মাত্রা বৃদ্ধি করে',
 'Ciprofloxacin inhibits theophylline metabolism',
 'Theophylline toxicity, seizures, cardiac arrhythmias',
 'Monitor theophylline levels, reduce theophylline dose by 30-50%',
 'established', 'delayed', 'prolonged');

-- 7. INSERT SAMPLE MEDICAL CONDITIONS
INSERT INTO medical_conditions (
    condition_name, condition_name_bn, category, category_bn,
    primary_symptoms, primary_symptoms_bn,
    secondary_symptoms, secondary_symptoms_bn,
    description, description_bn,
    warning_signs, warning_signs_bn,
    emergency_symptoms, emergency_symptoms_bn,
    common_age_groups, risk_factors
) VALUES
('Hypertension', 'উচ্চ রক্তচাপ', 'cardiovascular', 'হৃদরোগ',
 ARRAY['High blood pressure', 'Headache', 'Dizziness'],
 ARRAY['উচ্চ রক্তচাপ', 'মাথাব্যথা', 'মাথা ঘোরা'],
 ARRAY['Fatigue', 'Blurred vision', 'Chest pain'],
 ARRAY['ক্লান্তি', 'ঝাপসা দৃষ্টি', 'বুকে ব্যথা'],
 'Persistent elevation of blood pressure above 140/90 mmHg',
 'রক্তচাপ ১৪০/৯০ এর উপরে থাকা',
 ARRAY['Severe headache', 'Chest pain', 'Difficulty breathing'],
 ARRAY['তীব্র মাথাব্যথা', 'বুকে ব্যথা', 'শ্বাসকষ্ট'],
 ARRAY['Severe headache', 'Vision changes', 'Seizures'],
 ARRAY['তীব্র মাথাব্যথা', 'দৃষ্টি পরিবর্তন', 'খিঁচুনি'],
 ARRAY['adult', 'elderly'],
 ARRAY['Obesity', 'Diabetes', 'Family history', 'Smoking']),

('Type 2 Diabetes', 'টাইপ ২ ডায়াবেটিস', 'endocrine', 'অন্তঃক্ষরা',
 ARRAY['High blood sugar', 'Frequent urination', 'Excessive thirst'],
 ARRAY['উচ্চ রক্তে শর্করা', 'ঘন ঘন প্রস্রাব', 'অতিরিক্ত তৃষ্ণা'],
 ARRAY['Fatigue', 'Blurred vision', 'Slow healing wounds'],
 ARRAY['ক্লান্তি', 'ঝাপসা দৃষ্টি', 'ধীরে ক্ষত নিরাময়'],
 'Chronic condition characterized by insulin resistance and high blood glucose',
 'ইনসুলিন প্রতিরোধ ও উচ্চ রক্তে গ্লুকোজের দীর্ঘমেয়াদী অবস্থা',
 ARRAY['Blood sugar >300 mg/dL', 'Persistent vomiting', 'Severe dehydration'],
 ARRAY['রক্তে শর্করা >৩০০ মিগ্রা/ডিএল', 'ক্রমাগত বমি', 'তীব্র পানিশূন্যতা'],
 ARRAY['Diabetic ketoacidosis', 'Hyperosmolar coma', 'Severe hypoglycemia'],
 ARRAY['ডায়াবেটিক কিটোঅ্যাসিডোসিস', 'হাইপারঅসমোলার কোমা', 'তীব্র হাইপোগ্লাইসেমিয়া'],
 ARRAY['adult', 'elderly'],
 ARRAY['Obesity', 'Sedentary lifestyle', 'Family history', 'Age >45']);

-- 8. CREATE FUNCTIONS FOR DRUG INTERACTION CHECKING
CREATE OR REPLACE FUNCTION check_drug_interactions(
    medicine_names TEXT[]
) RETURNS TABLE (
    interaction_id UUID,
    drug1 TEXT,
    drug2 TEXT,
    severity TEXT,
    description TEXT,
    management TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        di.id,
        di.drug1_name,
        di.drug2_name,
        di.interaction_type,
        di.description,
        di.management_strategy
    FROM drug_interactions di
    WHERE di.is_active = true
    AND (
        (di.drug1_name = ANY(medicine_names) AND di.drug2_name = ANY(medicine_names))
        OR
        (di.drug2_name = ANY(medicine_names) AND di.drug1_name = ANY(medicine_names))
    )
    ORDER BY di.severity_level DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. CREATE FUNCTION FOR SYMPTOM-BASED MEDICINE SEARCH
CREATE OR REPLACE FUNCTION search_medicines_by_symptoms(
    symptoms TEXT[],
    age_group TEXT DEFAULT 'adult'
) RETURNS TABLE (
    medicine_id UUID,
    medicine_name TEXT,
    brand_name TEXT,
    effectiveness INTEGER,
    usage_frequency TEXT,
    recommended_dosage TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.brand_name,
        mcm.effectiveness_rating,
        mcm.usage_frequency,
        mcm.recommended_dosage
    FROM medicines m
    JOIN medicine_condition_mapping mcm ON m.id = mcm.medicine_id
    JOIN medical_conditions mc ON mcm.condition_id = mc.id
    WHERE mc.is_active = true 
    AND mcm.is_active = true
    AND m.is_active = true
    AND (
        mc.primary_symptoms && symptoms 
        OR mc.secondary_symptoms && symptoms
    )
    AND (
        age_group = ANY(mc.common_age_groups) 
        OR mc.common_age_groups = '{}'
    )
    ORDER BY mcm.effectiveness_rating DESC, mcm.usage_frequency;
END;
$$ LANGUAGE plpgsql;

-- 10. UPDATE EXISTING MEDICINES WITH KNOWLEDGE BASE DATA
-- Link some existing medicines to knowledge base
INSERT INTO medicine_knowledge_base (
    generic_name, brand_name, manufacturer, strength, form, therapeutic_class,
    indication, price_min, price_max, prescription_required,
    side_effects, contraindications, pregnancy_category
) 
SELECT DISTINCT 
    m.generic_name,
    m.brand_name,
    m.manufacturer,
    m.strength,
    m.form,
    COALESCE(m.therapeutic_class, m.category),
    COALESCE(m.indication, ARRAY[m.category]),
    COALESCE(s.unit_price * 0.8, 5.0),
    COALESCE(s.unit_price * 1.2, 10.0),
    COALESCE(m.prescription_required, false),
    COALESCE(m.side_effects, ARRAY['Consult healthcare provider']),
    COALESCE(m.contraindications, ARRAY['Known hypersensitivity']),
    COALESCE(m.pregnancy_category, 'B')
FROM medicines m
LEFT JOIN stock s ON m.id = s.medicine_id
WHERE m.pharmacy_id = '7bddb287-876f-4bc5-9220-88d32e7c42ba'
AND m.generic_name IS NOT NULL
AND m.brand_name IS NOT NULL
LIMIT 1000
ON CONFLICT (generic_name, brand_name, manufacturer) DO NOTHING;

-- 11. FINAL SUCCESS MESSAGE
SELECT 
    'ADVANCED FEATURES INTEGRATION COMPLETE!' as status,
    'Drug interactions: ' || (SELECT COUNT(*) FROM drug_interactions WHERE is_active = true) as interactions_count,
    'Medical conditions: ' || (SELECT COUNT(*) FROM medical_conditions WHERE is_active = true) as conditions_count,
    'Knowledge base entries: ' || (SELECT COUNT(*) FROM medicine_knowledge_base WHERE is_active = true) as knowledge_entries,
    'Total system medicines: ' || (SELECT COUNT(*) FROM medicines WHERE pharmacy_id = '7bddb287-876f-4bc5-9220-88d32e7c42ba') as total_medicines;
