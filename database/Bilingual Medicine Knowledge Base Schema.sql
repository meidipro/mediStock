-- =============================================
-- MEDICINE KNOWLEDGE BASE SCHEMA
-- Comprehensive database schema for 1000+ medicine knowledge base
-- Supports bilingual content (English/Bengali) and complete drug information
-- =============================================

-- 1. Create the main medicine knowledge base table
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

-- Create a function to update the search vector
CREATE OR REPLACE FUNCTION medicine_knowledge_base_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.generic_name, '') || ' ' ||
        COALESCE(NEW.brand_name, '') || ' ' ||
        COALESCE(NEW.manufacturer, '') || ' ' ||
        COALESCE(NEW.therapeutic_class, '') || ' ' ||
        COALESCE(array_to_string(NEW.indication, ' '), '') || ' ' ||
        COALESCE(array_to_string(NEW.alternatives, ' '), '') || ' ' ||
        COALESCE(NEW.generic_name_bn, '') || ' ' ||
        COALESCE(NEW.brand_name_bn, '') || ' ' ||
        COALESCE(array_to_string(NEW.keywords_bn, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the search vector
CREATE TRIGGER medicine_knowledge_base_search_vector_update
    BEFORE INSERT OR UPDATE ON medicine_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION medicine_knowledge_base_search_vector_update();

-- 2. Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_mkb_search_vector ON medicine_knowledge_base USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_mkb_generic_name ON medicine_knowledge_base(generic_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mkb_brand_name ON medicine_knowledge_base(brand_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mkb_therapeutic_class ON medicine_knowledge_base(therapeutic_class) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mkb_prescription_required ON medicine_knowledge_base(prescription_required) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mkb_manufacturer ON medicine_knowledge_base(manufacturer) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mkb_pregnancy_category ON medicine_knowledge_base(pregnancy_category) WHERE is_active = true;

-- Bengali search support
CREATE INDEX IF NOT EXISTS idx_mkb_generic_name_bn ON medicine_knowledge_base(generic_name_bn) WHERE is_active = true AND generic_name_bn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mkb_brand_name_bn ON medicine_knowledge_base(brand_name_bn) WHERE is_active = true AND brand_name_bn IS NOT NULL;

-- 3. Create RLS policies for security
ALTER TABLE medicine_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (medicine knowledge is public)
CREATE POLICY "Allow read access to medicine knowledge base" ON medicine_knowledge_base
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Only allow admin users to modify the knowledge base
CREATE POLICY "Allow admin to manage medicine knowledge base" ON medicine_knowledge_base
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 4. Create therapeutic categories lookup table
CREATE TABLE IF NOT EXISTS therapeutic_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    name_bn TEXT,
    description TEXT,
    description_bn TEXT,
    parent_category UUID REFERENCES therapeutic_categories(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert major therapeutic categories
INSERT INTO therapeutic_categories (name, name_bn, description, description_bn) VALUES
('Analgesic & Antipyretic', 'ব্যথানাশক ও জ্বর নাশক', 'Pain relief and fever reduction medicines', 'ব্যথা উপশম ও জ্বর কমানোর ওষুধ'),
('Antibiotic', 'এন্টিবায়োটিক', 'Medicines to treat bacterial infections', 'ব্যাকটেরিয়া সংক্রমণের চিকিৎসার ওষুধ'),
('Antihypertensive', 'উচ্চ রক্তচাপ নিবারক', 'Blood pressure lowering medicines', 'রক্তচাপ কমানোর ওষুধ'),
('Antidiabetic', 'ডায়াবেটিস নিবারক', 'Diabetes management medicines', 'ডায়াবেটিস নিয়ন্ত্রণের ওষুধ'),
('Antacid', 'অ্যান্টাসিড', 'Stomach acid neutralizing medicines', 'পেটের অ্যাসিড নিষ্ক্রিয়কারী ওষুধ'),
('Beta-2 Agonist', 'বেটা-২ এগোনিস্ট', 'Bronchodilator medicines for asthma', 'হাঁপানির জন্য ব্রঙ্কোডাইলেটর ওষুধ'),
('Anticonvulsant', 'খিঁচুনি নিবারক', 'Seizure control medicines', 'খিঁচুনি নিয়ন্ত্রণের ওষুধ'),
('Antidepressant', 'বিষণ্ণতা নিবারক', 'Depression treatment medicines', 'বিষণ্ণতা চিকিৎসার ওষুধ'),
('Topical Antibiotic', 'বাহ্যিক এন্টিবায়োটিক', 'External antibiotic applications', 'বাহ্যিক এন্টিবায়োটিক প্রয়োগ'),
('Ophthalmic', 'চক্ষু চিকিৎসা', 'Eye care medicines', 'চোখের যত্নের ওষুধ'),
('Contraceptive', 'জন্মনিয়ন্ত্রণ', 'Birth control medicines', 'জন্মনিয়ন্ত্রণের ওষুধ'),
('Vitamin Supplement', 'ভিটামিন সাপ্লিমেন্ট', 'Nutritional supplements', 'পুষ্টি সাপ্লিমেন্ট'),
('Emergency Medication', 'জরুরি ওষুধ', 'Emergency use medicines', 'জরুরি ব্যবহারের ওষুধ')
ON CONFLICT (name) DO NOTHING;

-- 5. Create manufacturer lookup table
CREATE TABLE IF NOT EXISTS manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    name_bn TEXT,
    country TEXT DEFAULT 'Bangladesh',
    website TEXT,
    contact_info JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create medicine knowledge base search function
CREATE OR REPLACE FUNCTION search_medicine_knowledge_base(
    search_query TEXT,
    limit_count INTEGER DEFAULT 10,
    offset_count INTEGER DEFAULT 0,
    therapeutic_class_filter TEXT DEFAULT NULL,
    prescription_filter BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    generic_name TEXT,
    brand_name TEXT,
    generic_name_bn TEXT,
    brand_name_bn TEXT,
    manufacturer TEXT,
    strength TEXT,
    form TEXT,
    therapeutic_class TEXT,
    indication TEXT[],
    price_min DECIMAL,
    price_max DECIMAL,
    prescription_required BOOLEAN,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mkb.id,
        mkb.generic_name,
        mkb.brand_name,
        mkb.generic_name_bn,
        mkb.brand_name_bn,
        mkb.manufacturer,
        mkb.strength,
        mkb.form,
        mkb.therapeutic_class,
        mkb.indication,
        mkb.price_min,
        mkb.price_max,
        mkb.prescription_required,
        ts_rank(mkb.search_vector, plainto_tsquery('english', search_query)) as rank
    FROM medicine_knowledge_base mkb
    WHERE 
        mkb.is_active = true
        AND (
            search_query = '' OR search_query IS NULL OR
            mkb.search_vector @@ plainto_tsquery('english', search_query) OR
            mkb.generic_name ILIKE '%' || search_query || '%' OR
            mkb.brand_name ILIKE '%' || search_query || '%' OR
            mkb.generic_name_bn ILIKE '%' || search_query || '%' OR
            mkb.brand_name_bn ILIKE '%' || search_query || '%'
        )
        AND (therapeutic_class_filter IS NULL OR mkb.therapeutic_class ILIKE '%' || therapeutic_class_filter || '%')
        AND (prescription_filter IS NULL OR mkb.prescription_required = prescription_filter)
    ORDER BY 
        CASE 
            WHEN search_query = '' OR search_query IS NULL THEN 0
            ELSE ts_rank(mkb.search_vector, plainto_tsquery('english', search_query))
        END DESC,
        mkb.brand_name
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get medicine details by ID
CREATE OR REPLACE FUNCTION get_medicine_knowledge_details(medicine_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT to_json(mkb.*) INTO result
    FROM medicine_knowledge_base mkb
    WHERE mkb.id = medicine_id AND mkb.is_active = true;
    
    IF result IS NULL THEN
        RETURN json_build_object('error', 'Medicine not found');
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get alternative brands
CREATE OR REPLACE FUNCTION get_alternative_brands(generic_name_param TEXT)
RETURNS TABLE (
    id UUID,
    brand_name TEXT,
    brand_name_bn TEXT,
    manufacturer TEXT,
    strength TEXT,
    form TEXT,
    price_min DECIMAL,
    price_max DECIMAL,
    prescription_required BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mkb.id,
        mkb.brand_name,
        mkb.brand_name_bn,
        mkb.manufacturer,
        mkb.strength,
        mkb.form,
        mkb.price_min,
        mkb.price_max,
        mkb.prescription_required
    FROM medicine_knowledge_base mkb
    WHERE 
        mkb.is_active = true
        AND LOWER(mkb.generic_name) = LOWER(generic_name_param)
    ORDER BY mkb.brand_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to check drug interactions
CREATE OR REPLACE FUNCTION check_drug_interactions(medicine_ids UUID[])
RETURNS JSON AS $$
DECLARE
    interaction_result JSON;
    med_count INTEGER;
BEGIN
    -- Get the count of medicines
    SELECT array_length(medicine_ids, 1) INTO med_count;
    
    IF med_count IS NULL OR med_count < 2 THEN
        RETURN json_build_object(
            'has_interactions', false,
            'interactions', '[]'::json,
            'message', 'At least 2 medicines required for interaction check'
        );
    END IF;
    
    -- For now, return a simple structure
    -- This can be enhanced with a proper drug interaction database
    SELECT json_build_object(
        'has_interactions', false,
        'interactions', '[]'::json,
        'message', 'Drug interaction checking system will be enhanced in future updates',
        'medicine_count', med_count
    ) INTO interaction_result;
    
    RETURN interaction_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'has_interactions', false,
            'interactions', '[]'::json,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to get medicines by indication
CREATE OR REPLACE FUNCTION get_medicines_by_indication(indication_param TEXT)
RETURNS TABLE (
    id UUID,
    generic_name TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    strength TEXT,
    therapeutic_class TEXT,
    prescription_required BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mkb.id,
        mkb.generic_name,
        mkb.brand_name,
        mkb.manufacturer,
        mkb.strength,
        mkb.therapeutic_class,
        mkb.prescription_required
    FROM medicine_knowledge_base mkb
    WHERE 
        mkb.is_active = true
        AND (
            indication_param = ANY(mkb.indication) OR
            indication_param = ANY(mkb.indication_bn) OR
            EXISTS (
                SELECT 1 FROM unnest(mkb.indication) AS ind 
                WHERE LOWER(ind) LIKE '%' || LOWER(indication_param) || '%'
            ) OR
            EXISTS (
                SELECT 1 FROM unnest(mkb.indication_bn) AS ind_bn 
                WHERE LOWER(ind_bn) LIKE '%' || LOWER(indication_param) || '%'
            )
        )
    ORDER BY mkb.brand_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medicine_knowledge_base_updated_at
    BEFORE UPDATE ON medicine_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON medicine_knowledge_base TO authenticated;
GRANT SELECT ON therapeutic_categories TO authenticated;
GRANT SELECT ON manufacturers TO authenticated;
GRANT EXECUTE ON FUNCTION search_medicine_knowledge_base TO authenticated;
GRANT EXECUTE ON FUNCTION get_medicine_knowledge_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_alternative_brands TO authenticated;
GRANT EXECUTE ON FUNCTION check_drug_interactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_medicines_by_indication TO authenticated;

-- Create a view for easy access to medicine knowledge with formatted data
CREATE OR REPLACE VIEW medicine_knowledge_view AS
SELECT 
    id,
    generic_name,
    brand_name,
    COALESCE(generic_name_bn, generic_name) as generic_name_display,
    COALESCE(brand_name_bn, brand_name) as brand_name_display,
    manufacturer,
    COALESCE(manufacturer_bn, manufacturer) as manufacturer_display,
    strength,
    form,
    COALESCE(form_bn, form) as form_display,
    therapeutic_class,
    COALESCE(therapeutic_class_bn, therapeutic_class) as therapeutic_class_display,
    indication,
    COALESCE(indication_bn, indication) as indication_display,
    alternatives,
    price_min,
    price_max,
    prescription_required,
    common_dosage,
    COALESCE(common_dosage_bn, common_dosage) as common_dosage_display,
    side_effects,
    COALESCE(side_effects_bn, side_effects) as side_effects_display,
    contraindications,
    COALESCE(contraindications_bn, contraindications) as contraindications_display,
    drug_interactions,
    COALESCE(drug_interactions_bn, drug_interactions) as drug_interactions_display,
    storage_instructions,
    COALESCE(storage_instructions_bn, storage_instructions) as storage_instructions_display,
    warnings_precautions,
    COALESCE(warnings_precautions_bn, warnings_precautions) as warnings_precautions_display,
    pregnancy_category,
    pregnancy_info,
    COALESCE(pregnancy_info_bn, pregnancy_info) as pregnancy_info_display,
    lactation_info,
    COALESCE(lactation_info_bn, lactation_info) as lactation_info_display,
    product_images,
    keywords_bn,
    is_active,
    created_at,
    updated_at
FROM medicine_knowledge_base
WHERE is_active = true;

GRANT SELECT ON medicine_knowledge_view TO authenticated;