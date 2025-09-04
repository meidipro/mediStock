-- =============================================
-- BARCODE INTEGRATION WITH MEDICINE KNOWLEDGE BASE
-- Enhanced barcode system with knowledge base integration
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create and enhance the barcode_registry table
-- First create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS barcode_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT NOT NULL UNIQUE,
    medicine_id UUID REFERENCES medicines(id),
    pharmacy_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Then enhance it with knowledge base integration
DO $$ 
BEGIN
    -- Add knowledge_base_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barcode_registry' AND column_name = 'knowledge_base_id'
    ) THEN
        ALTER TABLE barcode_registry 
        ADD COLUMN knowledge_base_id UUID REFERENCES medicine_knowledge_base(id);
    END IF;
    
    -- Add confidence score for barcode matches
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barcode_registry' AND column_name = 'match_confidence'
    ) THEN
        ALTER TABLE barcode_registry 
        ADD COLUMN match_confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (match_confidence >= 0 AND match_confidence <= 1);
    END IF;
    
    -- Add verified status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barcode_registry' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE barcode_registry 
        ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    -- Add verification metadata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barcode_registry' AND column_name = 'verification_metadata'
    ) THEN
        ALTER TABLE barcode_registry 
        ADD COLUMN verification_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 2. Create indexes for barcode optimization
CREATE INDEX IF NOT EXISTS idx_barcode_registry_knowledge_id ON barcode_registry(knowledge_base_id) WHERE knowledge_base_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_barcode_registry_verified ON barcode_registry(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_barcode_registry_confidence ON barcode_registry(match_confidence DESC) WHERE match_confidence >= 0.8;

-- 3. Create enhanced barcode lookup function with knowledge base integration
CREATE OR REPLACE FUNCTION lookup_barcode_with_knowledge(
    barcode_param TEXT,
    pharmacy_id_param UUID DEFAULT NULL,
    include_suggestions BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    exact_match RECORD;
    suggestions JSON;
    knowledge_info JSON;
BEGIN
    -- First, try to find exact barcode match
    SELECT 
        br.*,
        m.id as medicine_id,
        m.name as medicine_name,
        m.generic_name as medicine_generic_name,
        m.brand_name as medicine_brand_name,
        m.manufacturer as medicine_manufacturer,
        m.strength as medicine_strength,
        m.form as medicine_form,
        s.quantity as current_stock,
        s.unit_price as current_price,
        mkb.id as knowledge_id,
        mkb.generic_name as kb_generic_name,
        mkb.brand_name as kb_brand_name,
        mkb.manufacturer as kb_manufacturer,
        mkb.therapeutic_class as kb_therapeutic_class,
        mkb.indication as kb_indication,
        mkb.price_min as kb_price_min,
        mkb.price_max as kb_price_max,
        mkb.prescription_required as kb_prescription_required
    INTO exact_match
    FROM barcode_registry br
    LEFT JOIN medicines m ON br.medicine_id = m.id AND (pharmacy_id_param IS NULL OR m.pharmacy_id = pharmacy_id_param)
    LEFT JOIN stock s ON m.id = s.medicine_id
    LEFT JOIN medicine_knowledge_base mkb ON br.knowledge_base_id = mkb.id AND mkb.is_active = true
    WHERE br.barcode = barcode_param
    AND br.is_active = true
    ORDER BY br.match_confidence DESC, br.created_at DESC
    LIMIT 1;

    -- If exact match found
    IF exact_match.barcode IS NOT NULL THEN
        -- Get knowledge base information if available
        IF exact_match.knowledge_id IS NOT NULL THEN
            SELECT json_build_object(
                'id', exact_match.knowledge_id,
                'generic_name', exact_match.kb_generic_name,
                'brand_name', exact_match.kb_brand_name,
                'manufacturer', exact_match.kb_manufacturer,
                'therapeutic_class', exact_match.kb_therapeutic_class,
                'indication', exact_match.kb_indication,
                'price_range', json_build_object(
                    'min', exact_match.kb_price_min,
                    'max', exact_match.kb_price_max
                ),
                'prescription_required', exact_match.kb_prescription_required
            ) INTO knowledge_info;
        END IF;

        SELECT json_build_object(
            'found', true,
            'barcode', exact_match.barcode,
            'match_confidence', exact_match.match_confidence,
            'is_verified', exact_match.is_verified,
            'medicine', CASE 
                WHEN exact_match.medicine_id IS NOT NULL THEN json_build_object(
                    'id', exact_match.medicine_id,
                    'name', exact_match.medicine_name,
                    'generic_name', exact_match.medicine_generic_name,
                    'brand_name', exact_match.medicine_brand_name,
                    'manufacturer', exact_match.medicine_manufacturer,
                    'strength', exact_match.medicine_strength,
                    'form', exact_match.medicine_form,
                    'current_stock', COALESCE(exact_match.current_stock, 0),
                    'unit_price', exact_match.current_price
                )
                ELSE NULL
            END,
            'knowledge_base', knowledge_info,
            'source', 'barcode_registry'
        ) INTO result;
        
        RETURN result;
    END IF;

    -- If no exact match and suggestions requested, try to find similar medicines
    IF include_suggestions THEN
        -- Try to find medicines with similar names in the knowledge base
        -- This is a simplified approach - in reality, you might use more sophisticated matching
        SELECT json_agg(
            json_build_object(
                'id', mkb.id,
                'generic_name', mkb.generic_name,
                'brand_name', mkb.brand_name,
                'manufacturer', mkb.manufacturer,
                'strength', mkb.strength,
                'form', mkb.form,
                'therapeutic_class', mkb.therapeutic_class,
                'price_range', json_build_object(
                    'min', mkb.price_min,
                    'max', mkb.price_max
                ),
                'match_score', 0.6,
                'source', 'knowledge_base_suggestion'
            )
        ) INTO suggestions
        FROM medicine_knowledge_base mkb
        WHERE mkb.is_active = true
        -- This is a placeholder for more sophisticated matching logic
        AND LENGTH(mkb.brand_name) > 3
        LIMIT 5;
    END IF;

    -- Return no match with suggestions
    SELECT json_build_object(
        'found', false,
        'barcode', barcode_param,
        'suggestions', COALESCE(suggestions, '[]'::json),
        'message', 'No exact barcode match found'
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'found', false,
            'error', SQLERRM,
            'barcode', barcode_param
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to register new barcode with knowledge base link
CREATE OR REPLACE FUNCTION register_barcode_with_knowledge(
    barcode_param TEXT,
    medicine_id_param UUID DEFAULT NULL,
    knowledge_base_id_param UUID DEFAULT NULL,
    pharmacy_id_param UUID DEFAULT NULL,
    match_confidence_param DECIMAL DEFAULT 1.0,
    verification_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_id UUID;
    result JSON;
BEGIN
    -- Validate that at least one ID is provided
    IF medicine_id_param IS NULL AND knowledge_base_id_param IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Either medicine_id or knowledge_base_id must be provided'
        );
    END IF;
    
    -- Validate confidence score
    IF match_confidence_param < 0 OR match_confidence_param > 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Confidence score must be between 0 and 1'
        );
    END IF;
    
    -- Insert new barcode registration
    INSERT INTO barcode_registry (
        barcode,
        medicine_id,
        knowledge_base_id,
        pharmacy_id,
        match_confidence,
        is_verified,
        verification_metadata,
        is_active,
        created_at
    ) VALUES (
        barcode_param,
        medicine_id_param,
        knowledge_base_id_param,
        pharmacy_id_param,
        match_confidence_param,
        CASE WHEN match_confidence_param >= 0.9 THEN true ELSE false END,
        json_build_object(
            'verification_notes', verification_notes,
            'auto_verified', match_confidence_param >= 0.9,
            'created_by_function', true
        ),
        true,
        NOW()
    ) RETURNING id INTO new_id;
    
    SELECT json_build_object(
        'success', true,
        'id', new_id,
        'barcode', barcode_param,
        'medicine_id', medicine_id_param,
        'knowledge_base_id', knowledge_base_id_param,
        'match_confidence', match_confidence_param,
        'message', 'Barcode registered successfully'
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Barcode already exists in registry'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to auto-link barcodes with knowledge base using intelligent matching
CREATE OR REPLACE FUNCTION auto_link_barcodes_to_knowledge()
RETURNS JSON AS $$
DECLARE
    linked_count INTEGER := 0;
    total_processed INTEGER := 0;
    barcode_record RECORD;
    knowledge_match RECORD;
    match_score DECIMAL;
BEGIN
    -- Process barcodes that don't have knowledge base links
    FOR barcode_record IN 
        SELECT 
            br.id,
            br.barcode,
            br.medicine_id,
            m.generic_name,
            m.brand_name,
            m.manufacturer,
            m.strength,
            m.form
        FROM barcode_registry br
        LEFT JOIN medicines m ON br.medicine_id = m.id
        WHERE br.knowledge_base_id IS NULL
        AND br.is_active = true
        AND m.id IS NOT NULL
    LOOP
        total_processed := total_processed + 1;
        
        -- Try to find matching knowledge base entry
        SELECT 
            mkb.id,
            mkb.generic_name,
            mkb.brand_name,
            mkb.manufacturer,
            -- Calculate simple match score based on name similarity
            CASE 
                WHEN LOWER(mkb.brand_name) = LOWER(barcode_record.brand_name) 
                     AND LOWER(mkb.generic_name) = LOWER(barcode_record.generic_name) THEN 1.0
                WHEN LOWER(mkb.brand_name) = LOWER(barcode_record.brand_name) THEN 0.8
                WHEN LOWER(mkb.generic_name) = LOWER(barcode_record.generic_name) THEN 0.9
                WHEN mkb.brand_name ILIKE '%' || barcode_record.brand_name || '%' 
                     OR barcode_record.brand_name ILIKE '%' || mkb.brand_name || '%' THEN 0.7
                ELSE 0.5
            END as match_score
        INTO knowledge_match
        FROM medicine_knowledge_base mkb
        WHERE mkb.is_active = true
        AND (
            LOWER(mkb.brand_name) = LOWER(barcode_record.brand_name)
            OR LOWER(mkb.generic_name) = LOWER(barcode_record.generic_name)
            OR mkb.brand_name ILIKE '%' || barcode_record.brand_name || '%'
            OR barcode_record.brand_name ILIKE '%' || mkb.brand_name || '%'
        )
        ORDER BY CASE 
            WHEN LOWER(mkb.brand_name) = LOWER(barcode_record.brand_name) 
                 AND LOWER(mkb.generic_name) = LOWER(barcode_record.generic_name) THEN 1.0
            WHEN LOWER(mkb.brand_name) = LOWER(barcode_record.brand_name) THEN 0.8
            WHEN LOWER(mkb.generic_name) = LOWER(barcode_record.generic_name) THEN 0.9
            WHEN mkb.brand_name ILIKE '%' || barcode_record.brand_name || '%' 
                 OR barcode_record.brand_name ILIKE '%' || mkb.brand_name || '%' THEN 0.7
            ELSE 0.5
        END DESC
        LIMIT 1;
        
        -- If good match found (score >= 0.7), link them
        IF knowledge_match.id IS NOT NULL AND knowledge_match.match_score >= 0.7 THEN
            UPDATE barcode_registry 
            SET 
                knowledge_base_id = knowledge_match.id,
                match_confidence = knowledge_match.match_score,
                is_verified = CASE WHEN knowledge_match.match_score >= 0.9 THEN true ELSE false END,
                verification_metadata = verification_metadata || json_build_object(
                    'auto_linked', true,
                    'auto_link_score', knowledge_match.match_score,
                    'auto_link_date', NOW(),
                    'matched_by', 'auto_link_function'
                )
            WHERE id = barcode_record.id;
            
            linked_count := linked_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'total_processed', total_processed,
        'linked_count', linked_count,
        'message', 'Auto-linking completed successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'total_processed', total_processed,
            'linked_count', linked_count
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get barcode statistics
CREATE OR REPLACE FUNCTION get_barcode_knowledge_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_barcodes', total_stats.total_barcodes,
        'linked_to_knowledge', total_stats.linked_count,
        'verified_links', total_stats.verified_count,
        'link_percentage', ROUND(
            (total_stats.linked_count::decimal / NULLIF(total_stats.total_barcodes, 0)) * 100, 2
        ),
        'verification_percentage', ROUND(
            (total_stats.verified_count::decimal / NULLIF(total_stats.linked_count, 0)) * 100, 2
        ),
        'confidence_distribution', total_stats.confidence_stats,
        'top_manufacturers', total_stats.top_manufacturers
    ) INTO result
    FROM (
        SELECT 
            COUNT(*) as total_barcodes,
            COUNT(knowledge_base_id) as linked_count,
            COUNT(CASE WHEN is_verified THEN 1 END) as verified_count,
            json_build_object(
                'high_confidence', COUNT(CASE WHEN match_confidence >= 0.9 THEN 1 END),
                'medium_confidence', COUNT(CASE WHEN match_confidence >= 0.7 AND match_confidence < 0.9 THEN 1 END),
                'low_confidence', COUNT(CASE WHEN match_confidence < 0.7 THEN 1 END)
            ) as confidence_stats,
            (
                SELECT json_agg(manufacturer_stats)
                FROM (
                    SELECT 
                        mkb.manufacturer,
                        COUNT(*) as barcode_count
                    FROM barcode_registry br
                    JOIN medicine_knowledge_base mkb ON br.knowledge_base_id = mkb.id
                    WHERE br.is_active = true AND mkb.is_active = true
                    GROUP BY mkb.manufacturer
                    ORDER BY COUNT(*) DESC
                    LIMIT 10
                ) manufacturer_stats
            ) as top_manufacturers
        FROM barcode_registry
        WHERE is_active = true
    ) total_stats;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION lookup_barcode_with_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION register_barcode_with_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION auto_link_barcodes_to_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION get_barcode_knowledge_stats TO authenticated;

-- 8. Create view for easy barcode-knowledge access
CREATE OR REPLACE VIEW barcode_knowledge_view AS
SELECT 
    br.id as barcode_id,
    br.barcode,
    br.medicine_id,
    br.knowledge_base_id,
    br.match_confidence,
    br.is_verified,
    br.verification_metadata,
    br.created_at as barcode_created_at,
    
    -- Medicine information
    m.name as medicine_name,
    m.generic_name as medicine_generic_name,
    m.brand_name as medicine_brand_name,
    m.manufacturer as medicine_manufacturer,
    m.pharmacy_id,
    
    -- Knowledge base information
    mkb.generic_name as kb_generic_name,
    mkb.brand_name as kb_brand_name,
    mkb.manufacturer as kb_manufacturer,
    mkb.strength as kb_strength,
    mkb.form as kb_form,
    mkb.therapeutic_class as kb_therapeutic_class,
    mkb.indication as kb_indication,
    mkb.price_min as kb_price_min,
    mkb.price_max as kb_price_max,
    mkb.prescription_required as kb_prescription_required,
    
    -- Stock information
    s.quantity as current_stock,
    s.unit_price as current_price,
    s.expiry_date
FROM barcode_registry br
LEFT JOIN medicines m ON br.medicine_id = m.id
LEFT JOIN medicine_knowledge_base mkb ON br.knowledge_base_id = mkb.id AND mkb.is_active = true
LEFT JOIN stock s ON m.id = s.medicine_id
WHERE br.is_active = true;

GRANT SELECT ON barcode_knowledge_view TO authenticated;

-- 9. Create trigger to auto-link new barcodes
CREATE OR REPLACE FUNCTION trigger_auto_link_barcode()
RETURNS TRIGGER AS $$
DECLARE
    knowledge_match RECORD;
    medicine_info RECORD;
BEGIN
    -- Only process if knowledge_base_id is NULL and medicine_id is provided
    IF NEW.knowledge_base_id IS NULL AND NEW.medicine_id IS NOT NULL THEN
        -- Get medicine information
        SELECT generic_name, brand_name, manufacturer
        INTO medicine_info
        FROM medicines
        WHERE id = NEW.medicine_id;
        
        IF medicine_info IS NOT NULL THEN
            -- Try to find matching knowledge base entry
            SELECT id, 
                   CASE 
                       WHEN LOWER(brand_name) = LOWER(medicine_info.brand_name) 
                            AND LOWER(generic_name) = LOWER(medicine_info.generic_name) THEN 1.0
                       WHEN LOWER(brand_name) = LOWER(medicine_info.brand_name) THEN 0.8
                       WHEN LOWER(generic_name) = LOWER(medicine_info.generic_name) THEN 0.9
                       ELSE 0.7
                   END as match_score
            INTO knowledge_match
            FROM medicine_knowledge_base
            WHERE is_active = true
            AND (
                LOWER(brand_name) = LOWER(medicine_info.brand_name)
                OR LOWER(generic_name) = LOWER(medicine_info.generic_name)
            )
            ORDER BY CASE 
                WHEN LOWER(brand_name) = LOWER(medicine_info.brand_name) 
                     AND LOWER(generic_name) = LOWER(medicine_info.generic_name) THEN 1.0
                WHEN LOWER(brand_name) = LOWER(medicine_info.brand_name) THEN 0.8
                WHEN LOWER(generic_name) = LOWER(medicine_info.generic_name) THEN 0.9
                ELSE 0.7
            END DESC
            LIMIT 1;
            
            -- If good match found, update the record
            IF knowledge_match.id IS NOT NULL AND knowledge_match.match_score >= 0.8 THEN
                NEW.knowledge_base_id := knowledge_match.id;
                NEW.match_confidence := knowledge_match.match_score;
                NEW.is_verified := CASE WHEN knowledge_match.match_score >= 0.9 THEN true ELSE false END;
                NEW.verification_metadata := COALESCE(NEW.verification_metadata, '{}'::jsonb) || 
                    json_build_object(
                        'auto_linked_on_insert', true,
                        'auto_link_score', knowledge_match.match_score,
                        'auto_link_date', NOW()
                    )::jsonb;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_link_barcode ON barcode_registry;
CREATE TRIGGER trigger_auto_link_barcode
    BEFORE INSERT ON barcode_registry
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_link_barcode();

-- 10. Insert some sample barcode data for testing (optional)
-- Uncomment the following section if you want to insert sample data

/*
-- Sample barcode registrations
INSERT INTO barcode_registry (barcode, medicine_id, match_confidence, verification_metadata)
SELECT 
    '123456789' || LPAD(ROW_NUMBER() OVER()::text, 3, '0'),
    m.id,
    0.95,
    '{"sample_data": true}'::jsonb
FROM medicines m
WHERE m.is_active = true
LIMIT 10
ON CONFLICT (barcode) DO NOTHING;
*/

-- Success message
SELECT 'Barcode-Knowledge Base integration setup completed successfully!' as status;