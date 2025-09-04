-- BARCODE ENHANCED SCHEMA - Add barcode support to existing MediStock schema
-- Run this after the main schema is already in place

-- 1. Add barcode column to medicines table if not exists (with proper constraints)
DO $$ 
BEGIN
    -- Add barcode_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medicines' AND column_name = 'barcode_number') THEN
        ALTER TABLE medicines ADD COLUMN barcode_number VARCHAR(50);
    END IF;
    
    -- Update existing barcode column to barcode_number if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'medicines' AND column_name = 'barcode') THEN
        -- Copy data from barcode to barcode_number if barcode_number is empty
        UPDATE medicines SET barcode_number = barcode 
        WHERE barcode_number IS NULL AND barcode IS NOT NULL;
        
        -- Drop old barcode column
        ALTER TABLE medicines DROP COLUMN IF EXISTS barcode;
    END IF;
END $$;

-- 2. Add barcode-related fields to medicines table
DO $$
BEGIN
    -- Add barcode_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medicines' AND column_name = 'barcode_type') THEN
        ALTER TABLE medicines ADD COLUMN barcode_type VARCHAR(20) DEFAULT 'EAN13';
    END IF;
    
    -- Add barcode_source column to track how barcode was added
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medicines' AND column_name = 'barcode_source') THEN
        ALTER TABLE medicines ADD COLUMN barcode_source VARCHAR(20) DEFAULT 'manual';
    END IF;
    
    -- Add last_scanned timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medicines' AND column_name = 'last_scanned') THEN
        ALTER TABLE medicines ADD COLUMN last_scanned TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add scan_count for analytics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medicines' AND column_name = 'scan_count') THEN
        ALTER TABLE medicines ADD COLUMN scan_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Create barcode scan log table for audit trail
CREATE TABLE IF NOT EXISTS barcode_scan_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    barcode_scanned VARCHAR(50) NOT NULL,
    scan_result VARCHAR(20) NOT NULL, -- 'found', 'not_found', 'error'
    scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_info JSONB DEFAULT '{}',
    scan_context VARCHAR(50), -- 'inventory', 'sales', 'stock_check', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add constraints and indexes for performance
-- Unique constraint on barcode per pharmacy (allow nulls)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medicines_barcode_pharmacy_unique') THEN
        ALTER TABLE medicines ADD CONSTRAINT medicines_barcode_pharmacy_unique 
        UNIQUE (pharmacy_id, barcode_number);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN NULL;
END $$;

-- Indexes for fast barcode lookup
CREATE INDEX IF NOT EXISTS idx_medicines_barcode ON medicines(barcode_number) 
WHERE barcode_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_medicines_barcode_pharmacy ON medicines(pharmacy_id, barcode_number) 
WHERE barcode_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_medicines_barcode_scan_count ON medicines(scan_count DESC);

CREATE INDEX IF NOT EXISTS idx_barcode_scan_log_pharmacy ON barcode_scan_log(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_log_created ON barcode_scan_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_log_barcode ON barcode_scan_log(barcode_scanned);

-- 5. Enhanced search function with barcode support
CREATE OR REPLACE FUNCTION search_medicines_with_barcode(
    search_term TEXT,
    pharmacy_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    generic_name VARCHAR,
    brand_name VARCHAR,
    manufacturer VARCHAR,
    strength VARCHAR,
    form VARCHAR,
    category VARCHAR,
    barcode_number VARCHAR,
    current_stock INTEGER,
    unit_price DECIMAL,
    match_type VARCHAR
) AS $$
BEGIN
    -- First try exact barcode match
    IF search_term ~ '^[0-9A-Z\-\.\/\+\s]+$' AND length(search_term) >= 6 THEN
        RETURN QUERY
        SELECT 
            m.id,
            m.name,
            m.generic_name,
            m.brand_name,
            m.manufacturer,
            m.strength,
            m.form,
            m.category,
            m.barcode_number,
            COALESCE(s.quantity, 0)::INTEGER,
            COALESCE(s.unit_price, 0::DECIMAL),
            'barcode_exact'::VARCHAR as match_type
        FROM medicines m
        LEFT JOIN stock s ON m.id = s.medicine_id
        WHERE m.is_active = true
            AND (pharmacy_id_param IS NULL OR m.pharmacy_id = pharmacy_id_param)
            AND m.barcode_number = search_term
        LIMIT 1;
        
        -- If exact barcode match found, return immediately
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- Then try name-based search
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.generic_name,
        m.brand_name,
        m.manufacturer,
        m.strength,
        m.form,
        m.category,
        m.barcode_number,
        COALESCE(s.quantity, 0)::INTEGER,
        COALESCE(s.unit_price, 0::DECIMAL),
        CASE 
            WHEN m.name ILIKE search_term || '%' THEN 'name_exact'
            WHEN m.generic_name ILIKE search_term || '%' THEN 'generic_exact'
            WHEN m.brand_name ILIKE search_term || '%' THEN 'brand_exact'
            ELSE 'partial_match'
        END::VARCHAR as match_type
    FROM medicines m
    LEFT JOIN stock s ON m.id = s.medicine_id
    WHERE m.is_active = true
        AND (pharmacy_id_param IS NULL OR m.pharmacy_id = pharmacy_id_param)
        AND (
            m.name ILIKE '%' || search_term || '%'
            OR m.generic_name ILIKE '%' || search_term || '%'
            OR m.brand_name ILIKE '%' || search_term || '%'
            OR m.manufacturer ILIKE '%' || search_term || '%'
        )
    ORDER BY 
        CASE 
            WHEN m.name ILIKE search_term || '%' THEN 1
            WHEN m.generic_name ILIKE search_term || '%' THEN 2
            WHEN m.brand_name ILIKE search_term || '%' THEN 3
            ELSE 4
        END,
        m.name
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to log barcode scans
CREATE OR REPLACE FUNCTION log_barcode_scan(
    pharmacy_id_param UUID,
    medicine_id_param UUID,
    barcode_param VARCHAR,
    scan_result_param VARCHAR,
    scanned_by_param UUID,
    scan_context_param VARCHAR DEFAULT 'unknown'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO barcode_scan_log (
        pharmacy_id,
        medicine_id,
        barcode_scanned,
        scan_result,
        scanned_by,
        scan_context,
        created_at
    ) VALUES (
        pharmacy_id_param,
        medicine_id_param,
        barcode_param,
        scan_result_param,
        scanned_by_param,
        scan_context_param,
        NOW()
    ) RETURNING id INTO log_id;
    
    -- Update medicine scan count if found
    IF medicine_id_param IS NOT NULL THEN
        UPDATE medicines 
        SET scan_count = COALESCE(scan_count, 0) + 1,
            last_scanned = NOW()
        WHERE id = medicine_id_param;
    END IF;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get barcode statistics
CREATE OR REPLACE FUNCTION get_barcode_stats(
    pharmacy_id_param UUID
)
RETURNS TABLE(
    total_medicines INTEGER,
    medicines_with_barcodes INTEGER,
    medicines_without_barcodes INTEGER,
    barcode_coverage_percentage DECIMAL,
    total_scans_today INTEGER,
    most_scanned_medicine JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(barcode_number)::INTEGER as with_barcode,
            COUNT(*) - COUNT(barcode_number) as without_barcode
        FROM medicines 
        WHERE pharmacy_id = pharmacy_id_param AND is_active = true
    ),
    scan_stats AS (
        SELECT COUNT(*)::INTEGER as scans_today
        FROM barcode_scan_log
        WHERE pharmacy_id = pharmacy_id_param 
        AND created_at >= CURRENT_DATE
    ),
    top_scanned AS (
        SELECT 
            jsonb_build_object(
                'id', m.id,
                'name', m.name,
                'generic_name', m.generic_name,
                'scan_count', m.scan_count
            ) as medicine_info
        FROM medicines m
        WHERE m.pharmacy_id = pharmacy_id_param 
        AND m.is_active = true
        AND m.scan_count > 0
        ORDER BY m.scan_count DESC
        LIMIT 1
    )
    SELECT 
        s.total,
        s.with_barcode,
        s.without_barcode::INTEGER,
        CASE 
            WHEN s.total = 0 THEN 0
            ELSE ROUND((s.with_barcode::DECIMAL / s.total::DECIMAL) * 100, 2)
        END,
        ss.scans_today,
        COALESCE(ts.medicine_info, '{}'::JSONB)
    FROM stats s
    CROSS JOIN scan_stats ss
    LEFT JOIN top_scanned ts ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable RLS for barcode_scan_log table
ALTER TABLE barcode_scan_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "barcode_scan_log_pharmacy_access" ON barcode_scan_log FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = barcode_scan_log.pharmacy_id AND pharmacies.owner_id = auth.uid())
);

-- 9. Create triggers for updated_at
CREATE TRIGGER update_barcode_scan_log_updated_at 
    BEFORE UPDATE ON barcode_scan_log 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Add some sample barcode data for testing (optional - remove in production)
DO $$
BEGIN
    -- Only add sample data if medicines table is empty or has less than 5 records
    IF (SELECT COUNT(*) FROM medicines) < 5 THEN
        INSERT INTO medicines (
            pharmacy_id, 
            name, 
            generic_name, 
            brand_name, 
            manufacturer, 
            strength, 
            form, 
            category, 
            barcode_number,
            barcode_type,
            barcode_source
        ) 
        SELECT 
            p.id,
            'Paracetamol 500mg',
            'Paracetamol',
            'Napa',
            'Beximco Pharmaceuticals',
            '500mg',
            'tablet',
            'analgesic',
            '8944000080081',
            'EAN13',
            'manual'
        FROM pharmacies p
        WHERE NOT EXISTS (
            SELECT 1 FROM medicines m 
            WHERE m.pharmacy_id = p.id 
            AND m.barcode_number = '8944000080081'
        )
        LIMIT 1;
        
        INSERT INTO medicines (
            pharmacy_id, 
            name, 
            generic_name, 
            brand_name, 
            manufacturer, 
            strength, 
            form, 
            category, 
            barcode_number,
            barcode_type,
            barcode_source
        ) 
        SELECT 
            p.id,
            'Omeprazole 20mg',
            'Omeprazole',
            'Seclo',
            'Square Pharmaceuticals',
            '20mg',
            'capsule',
            'proton pump inhibitor',
            '8944000080098',
            'EAN13',
            'manual'
        FROM pharmacies p
        WHERE NOT EXISTS (
            SELECT 1 FROM medicines m 
            WHERE m.pharmacy_id = p.id 
            AND m.barcode_number = '8944000080098'
        )
        LIMIT 1;
    END IF;
END $$;

-- Verification query
CREATE OR REPLACE VIEW barcode_schema_verification AS
SELECT 
    'barcode_enhanced_schema' as schema_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'medicines' AND column_name = 'barcode_number') as barcode_column_exists,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_name = 'barcode_scan_log') as scan_log_table_exists,
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_name = 'search_medicines_with_barcode') as search_function_exists,
    (SELECT COUNT(*) FROM medicines WHERE barcode_number IS NOT NULL) as medicines_with_barcodes;

SELECT * FROM barcode_schema_verification;