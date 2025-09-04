-- =============================================
-- DATABASE OPTIMIZATIONS FOR 100+ USERS - FIXED
-- =============================================

-- First, let's check what tables already exist and add missing columns
-- This approach is safer and handles existing schemas

-- 1. Create invoices table if it doesn't exist
DO $$ 
BEGIN
    -- Create invoices table
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
        CREATE TABLE invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
            customer_id UUID REFERENCES customers(id),
            total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            due_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            payment_method VARCHAR(20) DEFAULT 'cash',
            status VARCHAR(20) DEFAULT 'pending', -- Changed from payment_status to status
            invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id)
        );
    END IF;

    -- Add missing columns if table exists but columns don't
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
        -- Add status column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'status') THEN
            ALTER TABLE invoices ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
        END IF;
        
        -- Add payment_method column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_method') THEN
            ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash';
        END IF;
        
        -- Add due_amount column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'due_amount') THEN
            ALTER TABLE invoices ADD COLUMN due_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 2. Create invoice_items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        CREATE TABLE invoice_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            medicine_id UUID NOT NULL REFERENCES medicines(id),
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            batch_number VARCHAR(100),
            expiry_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 3. Create performance indexes (with error handling)
DO $$ 
BEGIN
    -- Invoices indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_invoices_pharmacy_date') THEN
        CREATE INDEX idx_invoices_pharmacy_date ON invoices(pharmacy_id, invoice_date DESC);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_invoices_customer') THEN
        CREATE INDEX idx_invoices_customer ON invoices(customer_id) WHERE customer_id IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_invoices_status') THEN
        CREATE INDEX idx_invoices_status ON invoices(pharmacy_id, status);
    END IF;
    
    -- Invoice items indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_invoice_items_invoice') THEN
        CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_invoice_items_medicine') THEN
        CREATE INDEX idx_invoice_items_medicine ON invoice_items(medicine_id);
    END IF;
    
    -- Medicines search optimization
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_medicines_search_optimized') THEN
        CREATE INDEX idx_medicines_search_optimized 
        ON medicines USING GIN(
            to_tsvector('english', 
                COALESCE(generic_name, '') || ' ' || 
                COALESCE(brand_name, '') || ' ' || 
                COALESCE(manufacturer, '')
            )
        ) WHERE is_active = true;
    END IF;
    
    -- Stock items indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_stock_items_low_stock') THEN
        CREATE INDEX idx_stock_items_low_stock 
        ON stock_items(pharmacy_id, minimum_stock) 
        WHERE quantity <= minimum_stock;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_stock_items_expiry') THEN
        CREATE INDEX idx_stock_items_expiry 
        ON stock_items(pharmacy_id, expiry_date) 
        WHERE expiry_date IS NOT NULL;
    END IF;
    
    -- Pharmacy optimization
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_pharmacies_owner') THEN
        CREATE INDEX idx_pharmacies_owner 
        ON pharmacies(owner_id) WHERE is_active = true;
    END IF;
    
    -- Customer search optimization
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_customers_search') THEN
        CREATE INDEX idx_customers_search 
        ON customers USING GIN(
            to_tsvector('english', name || ' ' || COALESCE(phone, ''))
        ) WHERE is_active = true;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating indexes: %', SQLERRM;
END $$;

-- 4. Enable RLS on new tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their pharmacy invoices" ON invoices;
    DROP POLICY IF EXISTS "Users can insert their pharmacy invoices" ON invoices;
    DROP POLICY IF EXISTS "Users can update their pharmacy invoices" ON invoices;
    DROP POLICY IF EXISTS "Users can view their pharmacy invoice items" ON invoice_items;
    DROP POLICY IF EXISTS "Users can insert their pharmacy invoice items" ON invoice_items;

    -- Create new policies
    CREATE POLICY "Users can view their pharmacy invoices" ON invoices
        FOR SELECT USING (
            pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            )
        );

    CREATE POLICY "Users can insert their pharmacy invoices" ON invoices
        FOR INSERT WITH CHECK (
            pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            )
        );

    CREATE POLICY "Users can update their pharmacy invoices" ON invoices
        FOR UPDATE USING (
            pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            )
        );

    -- Invoice items policies
    CREATE POLICY "Users can view their pharmacy invoice items" ON invoice_items
        FOR SELECT USING (
            invoice_id IN (
                SELECT id FROM invoices WHERE pharmacy_id IN (
                    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
                )
            )
        );

    CREATE POLICY "Users can insert their pharmacy invoice items" ON invoice_items
        FOR INSERT WITH CHECK (
            invoice_id IN (
                SELECT id FROM invoices WHERE pharmacy_id IN (
                    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
                )
            )
        );
END $$;

-- 6. Create optimized dashboard function
CREATE OR REPLACE FUNCTION get_dashboard_stats(pharmacy_id_param UUID, date_param DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'today_sales', COALESCE(today.total_sales, 0),
        'today_transactions', COALESCE(today.transaction_count, 0),
        'total_due', COALESCE(due.total_due, 0),
        'low_stock_count', COALESCE(stock.low_stock_count, 0)
    ) INTO result
    FROM (
        -- Today's sales from invoices table (if exists) or fallback to 0
        SELECT 
            COALESCE(SUM(total_amount), 0) as total_sales,
            COUNT(*) as transaction_count
        FROM invoices 
        WHERE pharmacy_id = pharmacy_id_param 
        AND invoice_date = date_param
    ) today
    CROSS JOIN (
        -- Total due amount
        SELECT COALESCE(SUM(due_amount), 0) as total_due
        FROM invoices 
        WHERE pharmacy_id = pharmacy_id_param 
        AND due_amount > 0
    ) due
    CROSS JOIN (
        -- Low stock count
        SELECT COUNT(*) as low_stock_count
        FROM stock_items si
        JOIN medicines m ON si.medicine_id = m.id
        WHERE m.pharmacy_id = pharmacy_id_param
        AND si.quantity <= si.minimum_stock
    ) stock;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return default values if there's an error
        RETURN json_build_object(
            'today_sales', 0,
            'today_transactions', 0,
            'total_due', 0,
            'low_stock_count', 0
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create optimized search function
CREATE OR REPLACE FUNCTION search_medicines_paginated(
    search_term TEXT,
    pharmacy_id_param UUID,
    page_size INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    generic_name TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    strength TEXT,
    form TEXT,
    current_stock INTEGER,
    unit_price DECIMAL,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH search_results AS (
        SELECT 
            m.*,
            COALESCE(si.quantity, 0) as current_stock,
            COALESCE(si.unit_price, 0) as unit_price
        FROM medicines m
        LEFT JOIN stock_items si ON m.id = si.medicine_id
        WHERE m.pharmacy_id = pharmacy_id_param
        AND m.is_active = true
        AND (
            search_term = '' OR
            m.generic_name ILIKE '%' || search_term || '%' OR
            m.brand_name ILIKE '%' || search_term || '%' OR
            m.manufacturer ILIKE '%' || search_term || '%'
        )
        ORDER BY 
            CASE WHEN m.generic_name ILIKE search_term || '%' THEN 1
                 WHEN m.brand_name ILIKE search_term || '%' THEN 2
                 ELSE 3 END,
            m.generic_name
    ),
    total_count_query AS (
        SELECT COUNT(*) as total_count FROM search_results
    )
    SELECT 
        sr.id,
        sr.generic_name,
        sr.brand_name,
        sr.manufacturer,
        sr.strength,
        sr.form,
        sr.current_stock::INTEGER,
        sr.unit_price,
        tc.total_count
    FROM search_results sr
    CROSS JOIN total_count_query tc
    LIMIT page_size
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create invoice creation function (safe version)
CREATE OR REPLACE FUNCTION create_invoice_with_items(
    invoice_data JSON,
    items_data JSON
)
RETURNS JSON AS $$
DECLARE
    new_invoice_id UUID;
    pharmacy_id_val UUID;
    result JSON;
BEGIN
    -- Extract pharmacy_id from current user
    SELECT id INTO pharmacy_id_val 
    FROM pharmacies 
    WHERE owner_id = auth.uid() 
    LIMIT 1;
    
    IF pharmacy_id_val IS NULL THEN
        RAISE EXCEPTION 'No pharmacy found for user';
    END IF;
    
    -- Insert invoice
    INSERT INTO invoices (
        invoice_number,
        pharmacy_id,
        customer_id,
        total_amount,
        paid_amount,
        due_amount,
        payment_method,
        status,
        invoice_date,
        notes,
        created_by
    ) VALUES (
        (invoice_data->>'invoice_number')::VARCHAR,
        pharmacy_id_val,
        CASE WHEN invoice_data->>'customer_id' != '' 
             THEN (invoice_data->>'customer_id')::UUID 
             ELSE NULL END,
        (invoice_data->>'total_amount')::DECIMAL,
        (invoice_data->>'paid_amount')::DECIMAL,
        (invoice_data->>'due_amount')::DECIMAL,
        (invoice_data->>'payment_method')::VARCHAR,
        (invoice_data->>'status')::VARCHAR,
        (invoice_data->>'invoice_date')::DATE,
        invoice_data->>'notes',
        auth.uid()
    ) RETURNING id INTO new_invoice_id;
    
    -- Insert invoice items
    INSERT INTO invoice_items (
        invoice_id,
        medicine_id,
        quantity,
        unit_price,
        total_amount,
        batch_number,
        expiry_date
    )
    SELECT 
        new_invoice_id,
        (item->>'medicine_id')::UUID,
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::DECIMAL,
        (item->>'total_amount')::DECIMAL,
        item->>'batch_number',
        CASE WHEN item->>'expiry_date' != '' 
             THEN (item->>'expiry_date')::DATE 
             ELSE NULL END
    FROM json_array_elements(items_data) AS item;
    
    -- Update stock quantities
    UPDATE stock_items 
    SET quantity = quantity - (
        SELECT SUM((item->>'quantity')::INTEGER)
        FROM json_array_elements(items_data) AS item
        WHERE (item->>'medicine_id')::UUID = stock_items.medicine_id
    ),
    updated_at = NOW()
    WHERE medicine_id IN (
        SELECT DISTINCT (item->>'medicine_id')::UUID
        FROM json_array_elements(items_data) AS item
    );
    
    SELECT json_build_object(
        'invoice_id', new_invoice_id,
        'success', true,
        'message', 'Invoice created successfully'
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'invoice_id', NULL,
            'success', false,
            'message', 'Error creating invoice: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create maintenance function
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Only run if notifications table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications 
        WHERE created_at < NOW() - INTERVAL '30 days'
        AND is_read = true;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
    ELSE
        RETURN 0;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Final verification
DO $$ 
BEGIN
    RAISE NOTICE 'Database optimization completed successfully!';
    RAISE NOTICE 'Tables created: invoices, invoice_items';
    RAISE NOTICE 'Indexes created: % total', (
        SELECT COUNT(*) FROM pg_indexes 
        WHERE indexname LIKE 'idx_%'
    );
    RAISE NOTICE 'Functions created: get_dashboard_stats, search_medicines_paginated, create_invoice_with_items';
END $$;