-- =============================================
-- SYMPTOM-BASED MEDICINE SEARCH SYSTEM
-- Intelligent medicine recommendation based on symptoms and indications
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create symptoms and conditions database
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

-- 2. Create medicine-condition relationship table
CREATE TABLE IF NOT EXISTS medicine_condition_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    medicine_knowledge_id UUID REFERENCES medicine_knowledge_base(id),
    condition_id UUID REFERENCES medical_conditions(id),
    
    -- Relationship strength
    effectiveness_score DECIMAL(3,2) CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
    evidence_level TEXT CHECK (evidence_level IN ('high', 'moderate', 'low', 'theoretical')),
    
    -- Usage context
    is_first_line BOOLEAN DEFAULT false,
    is_otc_appropriate BOOLEAN DEFAULT false,
    requires_prescription BOOLEAN DEFAULT true,
    
    -- Age and special considerations
    min_age_months INTEGER DEFAULT 0,
    max_age_months INTEGER, -- NULL means no upper limit
    pregnancy_safe BOOLEAN DEFAULT false,
    lactation_safe BOOLEAN DEFAULT false,
    
    -- Additional notes
    usage_notes TEXT,
    usage_notes_bn TEXT,
    contraindication_notes TEXT,
    contraindication_notes_bn TEXT,
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(medicine_knowledge_id, condition_id)
);

-- 3. Create symptom search optimization table
CREATE TABLE IF NOT EXISTS symptom_search_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Search pattern
    search_term TEXT NOT NULL,
    search_term_bn TEXT,
    normalized_term TEXT NOT NULL, -- Standardized version
    
    -- Related terms
    synonyms TEXT[] DEFAULT '{}',
    synonyms_bn TEXT[] DEFAULT '{}',
    related_terms TEXT[] DEFAULT '{}',
    
    -- Mapping to conditions
    condition_ids UUID[] DEFAULT '{}',
    confidence_scores DECIMAL[] DEFAULT '{}', -- Parallel array to condition_ids
    
    -- Usage statistics
    search_count INTEGER DEFAULT 0,
    last_searched TIMESTAMPTZ,
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_medical_conditions_category ON medical_conditions(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medical_conditions_symptoms ON medical_conditions USING GIN(primary_symptoms) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medical_conditions_symptoms_bn ON medical_conditions USING GIN(primary_symptoms_bn) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_medicine_condition_mapping_medicine ON medicine_condition_mapping(medicine_knowledge_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_condition_mapping_condition ON medicine_condition_mapping(condition_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_condition_mapping_effectiveness ON medicine_condition_mapping(effectiveness_score DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_condition_mapping_first_line ON medicine_condition_mapping(is_first_line) WHERE is_first_line = true;

CREATE INDEX IF NOT EXISTS idx_symptom_search_term ON symptom_search_patterns(search_term) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_symptom_search_normalized ON symptom_search_patterns(normalized_term) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_symptom_search_synonyms ON symptom_search_patterns USING GIN(synonyms) WHERE is_active = true;

-- 5. Insert comprehensive medical conditions data
INSERT INTO medical_conditions (
    condition_name, condition_name_bn, category, category_bn,
    primary_symptoms, primary_symptoms_bn, secondary_symptoms, secondary_symptoms_bn,
    description, description_bn, warning_signs, warning_signs_bn,
    emergency_symptoms, emergency_symptoms_bn, common_age_groups
) VALUES
-- Respiratory conditions
('Common Cold', 'সাধারণ সর্দি', 'respiratory', 'শ্বাসযন্ত্রীয়',
 ARRAY['runny nose', 'sneezing', 'cough', 'sore throat'], 
 ARRAY['নাক দিয়ে পানি পড়া', 'হাঁচি', 'কাশি', 'গলা ব্যথা'],
 ARRAY['mild fever', 'headache', 'fatigue', 'nasal congestion'],
 ARRAY['হালকা জ্বর', 'মাথাব্যথা', 'ক্লান্তি', 'নাক বন্ধ'],
 'Viral upper respiratory tract infection', 'ভাইরাল উর্ধ্ব শ্বাসযন্ত্রের সংক্রমণ',
 ARRAY['high fever', 'severe headache', 'difficulty breathing'],
 ARRAY['উচ্চ জ্বর', 'তীব্র মাথাব্যথা', 'শ্বাসকষ্ট'],
 ARRAY['severe breathing difficulty', 'chest pain', 'blue lips'],
 ARRAY['গুরুতর শ্বাসকষ্ট', 'বুকে ব্যথা', 'ঠোঁট নীল'],
 ARRAY['infant', 'child', 'adult', 'elderly']),

('Asthma Attack', 'হাঁপানির আক্রমণ', 'respiratory', 'শ্বাসযন্ত্রীয়',
 ARRAY['wheezing', 'shortness of breath', 'chest tightness', 'cough'],
 ARRAY['শাঁ শাঁ শব্দ', 'শ্বাসকষ্ট', 'বুকে চাপ', 'কাশি'],
 ARRAY['anxiety', 'rapid breathing', 'pale skin'],
 ARRAY['উদ্বেগ', 'দ্রুত শ্বাস', 'ফ্যাকাশে ত্বক'],
 'Inflammatory airway disease causing breathing difficulties', 'প্রদাহজনিত শ্বাসনালী রোগ যা শ্বাসকষ্ট সৃষ্টি করে',
 ARRAY['severe wheezing', 'inability to speak full sentences', 'blue fingernails'],
 ARRAY['তীব্র শাঁ শাঁ শব্দ', 'পূর্ণ বাক্য বলতে না পারা', 'নখ নীল'],
 ARRAY['severe breathing difficulty', 'loss of consciousness', 'blue lips'],
 ARRAY['গুরুতর শ্বাসকষ্ট', 'অজ্ঞান হওয়া', 'ঠোঁট নীল'],
 ARRAY['child', 'adult', 'elderly']),

-- Digestive conditions
('Acid Reflux', 'অ্যাসিড রিফ্লাক্স', 'digestive', 'পরিপাকতন্ত্রীয়',
 ARRAY['heartburn', 'acid regurgitation', 'chest pain', 'difficulty swallowing'],
 ARRAY['বুক জ্বালা', 'অ্যাসিড উঠে আসা', 'বুকে ব্যথা', 'গিলতে কষ্ট'],
 ARRAY['chronic cough', 'hoarse voice', 'bad breath'],
 ARRAY['দীর্ঘমেয়াদী কাশি', 'কর্কশ স্বর', 'মুখে দুর্গন্ধ'],
 'Stomach acid flowing back into the esophagus', 'পাকস্থলীর অ্যাসিড খাদ্যনালীতে ফিরে আসা',
 ARRAY['severe chest pain', 'difficulty swallowing', 'vomiting blood'],
 ARRAY['তীব্র বুকে ব্যথা', 'গিলতে খুব কষ্ট', 'রক্ত বমি'],
 ARRAY['severe chest pain mimicking heart attack', 'black tarry stools'],
 ARRAY['হার্ট অ্যাটাকের মত তীব্র বুকে ব্যথা', 'কালো আলকাতরার মত পায়খানা'],
 ARRAY['adult', 'elderly']),

('Diarrhea', 'ডায়রিয়া', 'digestive', 'পরিপাকতন্ত্রীয়',
 ARRAY['loose stools', 'frequent bowel movements', 'abdominal cramps'],
 ARRAY['পাতলা পায়খানা', 'ঘন ঘন পায়খানা', 'পেটে খিঁচুনি'],
 ARRAY['nausea', 'vomiting', 'fever', 'dehydration'],
 ARRAY['বমি বমি ভাব', 'বমি', 'জ্বর', 'পানিশূন্যতা'],
 'Frequent loose or watery bowel movements', 'ঘন ঘন পাতলা বা পানির মত পায়খানা',
 ARRAY['severe dehydration', 'blood in stool', 'high fever'],
 ARRAY['গুরুতর পানিশূন্যতা', 'পায়খানায় রক্ত', 'উচ্চ জ্বর'],
 ARRAY['severe dehydration', 'bloody stools', 'signs of shock'],
 ARRAY['গুরুতর পানিশূন্যতা', 'রক্তাক্ত পায়খানা', 'শকের লক্ষণ'],
 ARRAY['infant', 'child', 'adult', 'elderly']),

-- Pain conditions
('Headache', 'মাথাব্যথা', 'neurological', 'স্নায়ুতন্ত্রীয়',
 ARRAY['head pain', 'pressure feeling', 'throbbing pain'],
 ARRAY['মাথায় ব্যথা', 'চাপ অনুভব', 'স্পন্দনশীল ব্যথা'],
 ARRAY['nausea', 'light sensitivity', 'sound sensitivity'],
 ARRAY['বমি বমি ভাব', 'আলোর প্রতি সংবেদনশীলতা', 'শব্দের প্রতি সংবেদনশীলতা'],
 'Pain in the head or neck region', 'মাথা বা ঘাড় অঞ্চলে ব্যথা',
 ARRAY['severe sudden headache', 'fever with headache', 'vision changes'],
 ARRAY['হঠাৎ তীব্র মাথাব্যথা', 'জ্বরের সাথে মাথাব্যথা', 'দৃষ্টির পরিবর্তন'],
 ARRAY['worst headache of life', 'neck stiffness', 'confusion'],
 ARRAY['জীবনের সবচেয়ে খারাপ মাথাব্যথা', 'ঘাড় শক্ত', 'বিভ্রান্তি'],
 ARRAY['child', 'adult', 'elderly']),

('Muscle Pain', 'পেশীর ব্যথা', 'musculoskeletal', 'পেশী-কঙ্কালতন্ত্রীয়',
 ARRAY['muscle aches', 'stiffness', 'soreness', 'cramping'],
 ARRAY['পেশী ব্যথা', 'শক্ততা', 'যন্ত্রণা', 'খিঁচুনি'],
 ARRAY['fatigue', 'weakness', 'reduced range of motion'],
 ARRAY['ক্লান্তি', 'দুর্বলতা', 'নড়াচড়ার সীমাবদ্ধতা'],
 'Pain and discomfort in muscle tissues', 'পেশী টিস্যুতে ব্যথা ও অস্বস্তি',
 ARRAY['severe pain', 'swelling', 'inability to use muscle'],
 ARRAY['তীব্র ব্যথা', 'ফোলা', 'পেশী ব্যবহার করতে না পারা'],
 ARRAY['severe muscle weakness', 'dark urine', 'kidney problems'],
 ARRAY['গুরুতর পেশী দুর্বলতা', 'গাঢ় প্রস্রাব', 'কিডনি সমস্যা'],
 ARRAY['child', 'adult', 'elderly']),

-- Allergic conditions
('Allergic Reaction', 'অ্যালার্জিক প্রতিক্রিয়া', 'allergic', 'অ্যালার্জিক',
 ARRAY['skin rash', 'itching', 'hives', 'swelling'],
 ARRAY['চামড়ায় র‍্যাশ', 'চুলকানি', 'আমবাত', 'ফোলা'],
 ARRAY['runny nose', 'sneezing', 'watery eyes', 'congestion'],
 ARRAY['নাক দিয়ে পানি', 'হাঁচি', 'চোখ দিয়ে পানি', 'নাক বন্ধ'],
 'Immune system reaction to allergens', 'অ্যালার্জেনের প্রতি রোগ প্রতিরোধ ব্যবস্থার প্রতিক্রিয়া',
 ARRAY['difficulty breathing', 'facial swelling', 'rapid pulse'],
 ARRAY['শ্বাসকষ্ট', 'মুখ ফোলা', 'দ্রুত নাড়ী'],
 ARRAY['anaphylaxis', 'severe breathing difficulty', 'loss of consciousness'],
 ARRAY['অ্যানাফাইল্যাক্সিস', 'গুরুতর শ্বাসকষ্ট', 'অজ্ঞান হওয়া'],
 ARRAY['infant', 'child', 'adult', 'elderly']);

-- 6. Insert medicine-condition mappings
INSERT INTO medicine_condition_mapping (
    medicine_knowledge_id, condition_id, effectiveness_score, evidence_level,
    is_first_line, is_otc_appropriate, requires_prescription, usage_notes, usage_notes_bn
)
SELECT 
    mkb.id as medicine_knowledge_id,
    mc.id as condition_id,
    CASE 
        -- Paracetamol for headache and muscle pain
        WHEN mkb.generic_name ILIKE '%paracetamol%' AND mc.condition_name IN ('Headache', 'Muscle Pain') THEN 0.9
        -- Salbutamol for asthma
        WHEN mkb.generic_name ILIKE '%salbutamol%' AND mc.condition_name = 'Asthma Attack' THEN 0.95
        -- Loratadine for allergic reactions
        WHEN mkb.generic_name ILIKE '%loratadine%' AND mc.condition_name = 'Allergic Reaction' THEN 0.85
        -- Omeprazole for acid reflux
        WHEN mkb.generic_name ILIKE '%omeprazole%' AND mc.condition_name = 'Acid Reflux' THEN 0.9
        -- ORS for diarrhea
        WHEN mkb.generic_name ILIKE '%oral rehydration%' AND mc.condition_name = 'Diarrhea' THEN 0.95
        ELSE 0.7
    END as effectiveness_score,
    'high' as evidence_level,
    CASE 
        WHEN mkb.generic_name ILIKE '%paracetamol%' AND mc.condition_name IN ('Headache', 'Muscle Pain') THEN true
        WHEN mkb.generic_name ILIKE '%salbutamol%' AND mc.condition_name = 'Asthma Attack' THEN true
        WHEN mkb.generic_name ILIKE '%loratadine%' AND mc.condition_name = 'Allergic Reaction' THEN true
        ELSE false
    END as is_first_line,
    NOT mkb.prescription_required as is_otc_appropriate,
    mkb.prescription_required,
    CASE 
        WHEN mkb.generic_name ILIKE '%paracetamol%' THEN 'Safe and effective for mild to moderate pain and fever'
        WHEN mkb.generic_name ILIKE '%salbutamol%' THEN 'Fast-acting bronchodilator for acute symptoms'
        WHEN mkb.generic_name ILIKE '%loratadine%' THEN 'Non-sedating antihistamine for daily use'
        ELSE 'Follow prescribing guidelines'
    END as usage_notes,
    CASE 
        WHEN mkb.generic_name ILIKE '%paracetamol%' THEN 'হালকা থেকে মাঝারি ব্যথা ও জ্বরের জন্য নিরাপদ ও কার্যকর'
        WHEN mkb.generic_name ILIKE '%salbutamol%' THEN 'তীব্র লক্ষণের জন্য দ্রুত কার্যকর ব্রঙ্কোডাইলেটর'
        WHEN mkb.generic_name ILIKE '%loratadine%' THEN 'দৈনিক ব্যবহারের জন্য নন-সিডেটিং অ্যান্টিহিস্টামিন'
        ELSE 'প্রেসক্রিপশন নির্দেশনা অনুসরণ করুন'
    END as usage_notes_bn
FROM medicine_knowledge_base mkb
CROSS JOIN medical_conditions mc
WHERE mkb.is_active = true 
AND mc.is_active = true
AND (
    (mkb.generic_name ILIKE '%paracetamol%' AND mc.condition_name IN ('Headache', 'Muscle Pain')) OR
    (mkb.generic_name ILIKE '%salbutamol%' AND mc.condition_name = 'Asthma Attack') OR
    (mkb.generic_name ILIKE '%loratadine%' AND mc.condition_name = 'Allergic Reaction') OR
    (mkb.generic_name ILIKE '%omeprazole%' AND mc.condition_name = 'Acid Reflux') OR
    (mkb.indication && ARRAY['Common cold', 'Upper respiratory infections'] AND mc.condition_name = 'Common Cold') OR
    (mkb.indication && ARRAY['Diarrhea', 'Gastroenteritis'] AND mc.condition_name = 'Diarrhea')
)
ON CONFLICT (medicine_knowledge_id, condition_id) DO NOTHING;

-- 7. Insert common symptom search patterns
INSERT INTO symptom_search_patterns (
    search_term, search_term_bn, normalized_term, synonyms, synonyms_bn, 
    condition_ids, confidence_scores
) 
SELECT 
    symptoms.term,
    symptoms.term_bn,
    LOWER(TRIM(symptoms.term)),
    symptoms.syn_array,
    symptoms.syn_bn_array,
    ARRAY[mc.id],
    ARRAY[0.9]
FROM medical_conditions mc,
LATERAL (
    SELECT 
        unnest(mc.primary_symptoms) as term,
        unnest(COALESCE(mc.primary_symptoms_bn, mc.primary_symptoms)) as term_bn,
        ARRAY['symptom', 'complaint'] as syn_array,
        ARRAY['লক্ষণ', 'সমস্যা'] as syn_bn_array
) symptoms
WHERE mc.is_active = true
ON CONFLICT DO NOTHING;

-- 8. Create comprehensive symptom-based medicine search function
CREATE OR REPLACE FUNCTION search_medicines_by_symptoms(
    symptoms_text TEXT,
    patient_age_years INTEGER DEFAULT NULL,
    is_pregnant BOOLEAN DEFAULT false,
    is_lactating BOOLEAN DEFAULT false,
    prefer_otc BOOLEAN DEFAULT false,
    limit_results INTEGER DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    conditions_found JSON[] := '{}';
    medicines_suggested JSON[] := '{}';
    search_terms TEXT[];
    normalized_symptoms TEXT;
    condition_record RECORD;
    medicine_record RECORD;
    total_conditions INTEGER := 0;
    total_medicines INTEGER := 0;
BEGIN
    -- Normalize and prepare search terms
    normalized_symptoms := LOWER(TRIM(symptoms_text));
    search_terms := string_to_array(normalized_symptoms, ' ');
    
    -- Find matching conditions based on symptoms
    FOR condition_record IN
        SELECT 
            mc.*,
            -- Calculate relevance score based on symptom matches
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM unnest(mc.primary_symptoms) as ps 
                    WHERE normalized_symptoms ILIKE '%' || LOWER(ps) || '%'
                ) THEN 0.9
                WHEN EXISTS (
                    SELECT 1 FROM unnest(mc.secondary_symptoms) as ss 
                    WHERE normalized_symptoms ILIKE '%' || LOWER(ss) || '%'
                ) THEN 0.7
                WHEN EXISTS (
                    SELECT 1 FROM unnest(mc.primary_symptoms_bn) as psb 
                    WHERE normalized_symptoms ILIKE '%' || LOWER(psb) || '%'
                ) THEN 0.9
                ELSE 0.5
            END as relevance_score,
            -- Count symptom matches
            (
                SELECT COUNT(*) FROM unnest(mc.primary_symptoms) as ps 
                WHERE normalized_symptoms ILIKE '%' || LOWER(ps) || '%'
            ) +
            (
                SELECT COUNT(*) FROM unnest(mc.secondary_symptoms) as ss 
                WHERE normalized_symptoms ILIKE '%' || LOWER(ss) || '%'
            ) as symptom_match_count
        FROM medical_conditions mc
        WHERE mc.is_active = true
        AND (
            EXISTS (
                SELECT 1 FROM unnest(mc.primary_symptoms) as ps 
                WHERE normalized_symptoms ILIKE '%' || LOWER(ps) || '%'
            ) OR
            EXISTS (
                SELECT 1 FROM unnest(mc.secondary_symptoms) as ss 
                WHERE normalized_symptoms ILIKE '%' || LOWER(ss) || '%'
            ) OR
            EXISTS (
                SELECT 1 FROM unnest(mc.primary_symptoms_bn) as psb 
                WHERE normalized_symptoms ILIKE '%' || LOWER(psb) || '%'
            ) OR
            EXISTS (
                SELECT 1 FROM unnest(mc.secondary_symptoms_bn) as ssb 
                WHERE normalized_symptoms ILIKE '%' || LOWER(ssb) || '%'
            )
        )
        ORDER BY relevance_score DESC, symptom_match_count DESC
        LIMIT 5
    LOOP
        total_conditions := total_conditions + 1;
        
        -- Add condition to results
        conditions_found := conditions_found || json_build_object(
            'id', condition_record.id,
            'condition_name', condition_record.condition_name,
            'condition_name_bn', condition_record.condition_name_bn,
            'category', condition_record.category,
            'relevance_score', condition_record.relevance_score,
            'symptom_matches', condition_record.symptom_match_count,
            'description', condition_record.description,
            'description_bn', condition_record.description_bn,
            'warning_signs', condition_record.warning_signs,
            'warning_signs_bn', condition_record.warning_signs_bn,
            'emergency_symptoms', condition_record.emergency_symptoms,
            'emergency_symptoms_bn', condition_record.emergency_symptoms_bn
        );
        
        -- Find medicines for this condition
        FOR medicine_record IN
            SELECT 
                mkb.*,
                mcm.effectiveness_score,
                mcm.is_first_line,
                mcm.is_otc_appropriate,
                mcm.requires_prescription,
                mcm.usage_notes,
                mcm.usage_notes_bn,
                mcm.pregnancy_safe,
                mcm.lactation_safe,
                -- Calculate overall suitability score
                (
                    mcm.effectiveness_score * 0.4 +
                    CASE WHEN mcm.is_first_line THEN 0.3 ELSE 0.1 END +
                    CASE WHEN prefer_otc AND mcm.is_otc_appropriate THEN 0.2 ELSE 0.1 END +
                    CASE WHEN is_pregnant AND NOT mcm.pregnancy_safe THEN -0.5 ELSE 0.1 END +
                    CASE WHEN is_lactating AND NOT mcm.lactation_safe THEN -0.3 ELSE 0.1 END
                ) as suitability_score
            FROM medicine_condition_mapping mcm
            JOIN medicine_knowledge_base mkb ON mcm.medicine_knowledge_id = mkb.id
            WHERE mcm.condition_id = condition_record.id
            AND mcm.is_active = true
            AND mkb.is_active = true
            -- Age filtering
            AND (patient_age_years IS NULL OR 
                 (mcm.min_age_months IS NULL OR patient_age_years * 12 >= mcm.min_age_months) AND
                 (mcm.max_age_months IS NULL OR patient_age_years * 12 <= mcm.max_age_months))
            -- Pregnancy/lactation filtering
            AND (NOT is_pregnant OR mcm.pregnancy_safe OR mcm.pregnancy_safe IS NULL)
            AND (NOT is_lactating OR mcm.lactation_safe OR mcm.lactation_safe IS NULL)
            ORDER BY suitability_score DESC, mcm.effectiveness_score DESC
            LIMIT 3 -- Top 3 medicines per condition
        LOOP
            total_medicines := total_medicines + 1;
            
            medicines_suggested := medicines_suggested || json_build_object(
                'medicine_id', medicine_record.id,
                'generic_name', medicine_record.generic_name,
                'brand_name', medicine_record.brand_name,
                'generic_name_bn', medicine_record.generic_name_bn,
                'brand_name_bn', medicine_record.brand_name_bn,
                'manufacturer', medicine_record.manufacturer,
                'strength', medicine_record.strength,
                'form', medicine_record.form,
                'therapeutic_class', medicine_record.therapeutic_class,
                'price_range', json_build_object(
                    'min', medicine_record.price_min,
                    'max', medicine_record.price_max
                ),
                'prescription_required', medicine_record.prescription_required,
                'common_dosage', medicine_record.common_dosage,
                'common_dosage_bn', medicine_record.common_dosage_bn,
                'effectiveness_score', medicine_record.effectiveness_score,
                'suitability_score', ROUND(medicine_record.suitability_score::numeric, 2),
                'is_first_line', medicine_record.is_first_line,
                'is_otc_appropriate', medicine_record.is_otc_appropriate,
                'usage_notes', medicine_record.usage_notes,
                'usage_notes_bn', medicine_record.usage_notes_bn,
                'condition_treated', condition_record.condition_name,
                'condition_treated_bn', condition_record.condition_name_bn,
                'safety_profile', json_build_object(
                    'pregnancy_safe', medicine_record.pregnancy_safe,
                    'lactation_safe', medicine_record.lactation_safe,
                    'pregnancy_category', medicine_record.pregnancy_category
                ),
                'recommendation_level', CASE 
                    WHEN medicine_record.suitability_score >= 0.8 THEN 'highly_recommended'
                    WHEN medicine_record.suitability_score >= 0.6 THEN 'recommended'
                    WHEN medicine_record.suitability_score >= 0.4 THEN 'consider'
                    ELSE 'caution'
                END
            );
        END LOOP;
    END LOOP;
    
    -- Build final result
    SELECT json_build_object(
        'search_query', symptoms_text,
        'patient_profile', json_build_object(
            'age_years', patient_age_years,
            'is_pregnant', is_pregnant,
            'is_lactating', is_lactating,
            'prefer_otc', prefer_otc
        ),
        'conditions_found', array_to_json(conditions_found),
        'medicines_suggested', array_to_json(medicines_suggested),
        'summary', json_build_object(
            'total_conditions', total_conditions,
            'total_medicines', total_medicines,
            'search_success', total_conditions > 0
        ),
        'disclaimers', json_build_array(
            'This is for informational purposes only',
            'Always consult a healthcare professional',
            'Emergency symptoms require immediate medical attention',
            'Do not self-diagnose or self-medicate for serious conditions'
        ),
        'disclaimers_bn', json_build_array(
            'এটি শুধুমাত্র তথ্যগত উদ্দেশ্যে',
            'সর্বদা একজন স্বাস্থ্যসেবা পেশাদারের পরামর্শ নিন',
            'জরুরি লক্ষণের জন্য তাৎক্ষণিক চিকিৎসা প্রয়োজন',
            'গুরুতর অবস্থার জন্য স্ব-নির্ণয় বা স্ব-চিকিৎসা করবেন না'
        ),
        'searched_at', NOW()
    ) INTO result;
    
    -- Update search statistics
    UPDATE symptom_search_patterns 
    SET search_count = search_count + 1, last_searched = NOW()
    WHERE normalized_term = normalized_symptoms;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'search_query', symptoms_text,
            'search_success', false
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get popular symptom searches
CREATE OR REPLACE FUNCTION get_popular_symptom_searches(
    days_back INTEGER DEFAULT 30,
    limit_results INTEGER DEFAULT 20
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'popular_searches', json_agg(
            json_build_object(
                'search_term', ssp.search_term,
                'search_term_bn', ssp.search_term_bn,
                'search_count', ssp.search_count,
                'last_searched', ssp.last_searched,
                'related_conditions', (
                    SELECT json_agg(mc.condition_name)
                    FROM medical_conditions mc
                    WHERE mc.id = ANY(ssp.condition_ids)
                )
            ) ORDER BY ssp.search_count DESC
        ),
        'period_days', days_back,
        'total_searches', SUM(ssp.search_count)
    ) INTO result
    FROM symptom_search_patterns ssp
    WHERE ssp.last_searched >= NOW() - INTERVAL '1 day' * days_back
    AND ssp.is_active = true
    ORDER BY ssp.search_count DESC
    LIMIT limit_results;
    
    RETURN COALESCE(result, json_build_object('popular_searches', '[]'::json, 'total_searches', 0));
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to get condition details with medicines
CREATE OR REPLACE FUNCTION get_condition_with_medicines(
    condition_id_param UUID,
    patient_age_years INTEGER DEFAULT NULL,
    prefer_otc BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    condition_info RECORD;
    medicines_list JSON;
BEGIN
    -- Get condition information
    SELECT * INTO condition_info
    FROM medical_conditions
    WHERE id = condition_id_param AND is_active = true;
    
    IF condition_info IS NULL THEN
        RETURN json_build_object('error', 'Condition not found');
    END IF;
    
    -- Get associated medicines
    SELECT json_agg(
        json_build_object(
            'medicine_id', mkb.id,
            'generic_name', mkb.generic_name,
            'brand_name', mkb.brand_name,
            'manufacturer', mkb.manufacturer,
            'strength', mkb.strength,
            'form', mkb.form,
            'price_range', json_build_object('min', mkb.price_min, 'max', mkb.price_max),
            'prescription_required', mkb.prescription_required,
            'effectiveness_score', mcm.effectiveness_score,
            'is_first_line', mcm.is_first_line,
            'is_otc_appropriate', mcm.is_otc_appropriate,
            'usage_notes', mcm.usage_notes,
            'usage_notes_bn', mcm.usage_notes_bn
        ) ORDER BY mcm.effectiveness_score DESC, mcm.is_first_line DESC
    ) INTO medicines_list
    FROM medicine_condition_mapping mcm
    JOIN medicine_knowledge_base mkb ON mcm.medicine_knowledge_id = mkb.id
    WHERE mcm.condition_id = condition_id_param
    AND mcm.is_active = true
    AND mkb.is_active = true
    AND (NOT prefer_otc OR mcm.is_otc_appropriate);
    
    -- Build result
    SELECT json_build_object(
        'condition', json_build_object(
            'id', condition_info.id,
            'name', condition_info.condition_name,
            'name_bn', condition_info.condition_name_bn,
            'category', condition_info.category,
            'description', condition_info.description,
            'description_bn', condition_info.description_bn,
            'primary_symptoms', condition_info.primary_symptoms,
            'primary_symptoms_bn', condition_info.primary_symptoms_bn,
            'warning_signs', condition_info.warning_signs,
            'warning_signs_bn', condition_info.warning_signs_bn,
            'emergency_symptoms', condition_info.emergency_symptoms,
            'emergency_symptoms_bn', condition_info.emergency_symptoms_bn
        ),
        'medicines', COALESCE(medicines_list, '[]'::json),
        'retrieved_at', NOW()
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION search_medicines_by_symptoms TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_symptom_searches TO authenticated;
GRANT EXECUTE ON FUNCTION get_condition_with_medicines TO authenticated;

-- 12. Create views for easy access
CREATE OR REPLACE VIEW symptom_medicine_recommendations AS
SELECT 
    mc.condition_name,
    mc.condition_name_bn,
    mc.category,
    mc.primary_symptoms,
    mc.primary_symptoms_bn,
    mkb.generic_name,
    mkb.brand_name,
    mkb.manufacturer,
    mkb.strength,
    mkb.form,
    mkb.price_min,
    mkb.price_max,
    mkb.prescription_required,
    mcm.effectiveness_score,
    mcm.is_first_line,
    mcm.is_otc_appropriate,
    mcm.usage_notes,
    mcm.usage_notes_bn
FROM medical_conditions mc
JOIN medicine_condition_mapping mcm ON mc.id = mcm.condition_id
JOIN medicine_knowledge_base mkb ON mcm.medicine_knowledge_id = mkb.id
WHERE mc.is_active = true 
AND mcm.is_active = true 
AND mkb.is_active = true
ORDER BY mc.condition_name, mcm.effectiveness_score DESC;

GRANT SELECT ON symptom_medicine_recommendations TO authenticated;

-- Success message
SELECT 'Symptom-based Medicine Search System setup completed successfully!' as status;