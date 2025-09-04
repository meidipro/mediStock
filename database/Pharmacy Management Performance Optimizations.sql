-- =============================================
-- DATABASE OPTIMIZATIONS FOR EXISTING MEDISTOCK DATABASE
-- Compatible with your existing schema (pharmacies, medicines, stock, customers, etc.)
-- =============================================

-- 1. Create performance indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_medicines_search_text ON medicines USING GIN(
    to_tsvector('english', 
        COALESCE(generic_name, '') || ' ' || 
        COALESCE(brand_name, '') || ' ' || 
        COALESCE(manufacturer, '')
    )
) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_stock_low_quantity ON stock(pharmacy_id) 
WHERE quantity <= minimum_stock;

CREATE INDEX IF NOT EXISTS idx_stock_expiry_soon ON stock(pharmacy_id, expiry_date) 
WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pharmacies_active_owner ON pharmacies(owner_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(phone, ''))
) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_date ON sales(pharmacy_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_medicine ON sale_items(medicine_id);

-- 2. Create optimized dashboard function
CREATE OR REPLACE FUNCTION get_pharmacy_dashboard_stats(pharmacy_id_param UUID, date_param DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'today_sales', COALESCE(today.total_sales, 0),
        'today_transactions', COALESCE(today.transaction_count, 0),
        'total_due', COALESCE(due.total_due, 0),
        'low_stock_count', COALESCE(low_stock.low_count, 0)
    ) INTO result
    FROM (
        -- Today's sales
        SELECT 
            COALESCE(SUM(total_amount), 0) as total_sales,
            COUNT(*) as transaction_count
        FROM sales 
        WHERE pharmacy_id = pharmacy_id_param 
        AND DATE(sale_date) = date_param
        AND status = 'completed'
    ) today
    CROSS JOIN (
        -- Total due amount
        SELECT COALESCE(SUM(due_amount), 0) as total_due
        FROM sales 
        WHERE pharmacy_id = pharmacy_id_param 
        AND due_amount > 0
        AND status = 'completed'
    ) due
    CROSS JOIN (
        -- Low stock count
        SELECT COUNT(*) as low_count
        FROM stock s
        JOIN medicines m ON s.medicine_id = m.id
        WHERE m.pharmacy_id = pharmacy_id_param
        AND s.quantity <= COALESCE(s.minimum_stock, 10)
        AND m.is_active = true
    ) low_stock;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'today_sales', 0,
            'today_transactions', 0,
            'total_due', 0,
            'low_stock_count', 0,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create optimized medicine search function
CREATE OR REPLACE FUNCTION search_medicines_optimized(
    search_term TEXT,
    pharmacy_id_param UUID,
    page_size INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    generic_name TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    strength TEXT,
    form TEXT,
    category TEXT,
    current_stock INTEGER,
    unit_price DECIMAL,
    minimum_stock INTEGER,
    is_low_stock BOOLEAN,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH search_results AS (
        SELECT 
            m.id,
            m.name,
            m.generic_name,
            m.brand_name,
            m.manufacturer,
            m.strength,
            m.form,
            m.category,
            COALESCE(s.quantity, 0) as current_stock,
            COALESCE(s.unit_price, 0) as unit_price,
            COALESCE(s.minimum_stock, 10) as minimum_stock,
            (COALESCE(s.quantity, 0) <= COALESCE(s.minimum_stock, 10)) as is_low_stock
        FROM medicines m
        LEFT JOIN stock s ON m.id = s.medicine_id
        WHERE m.pharmacy_id = pharmacy_id_param
        AND m.is_active = true
        AND (
            search_term = '' OR
            m.name ILIKE '%' || search_term || '%' OR
            m.generic_name ILIKE '%' || search_term || '%' OR
            m.brand_name ILIKE '%' || search_term || '%' OR
            m.manufacturer ILIKE '%' || search_term || '%'
        )
        ORDER BY 
            CASE 
                WHEN m.name ILIKE search_term || '%' THEN 1
                WHEN m.generic_name ILIKE search_term || '%' THEN 2
                WHEN m.brand_name ILIKE search_term || '%' THEN 3
                ELSE 4 
            END,
            m.name
    ),
    total_count_query AS (
        SELECT COUNT(*) as total_count FROM search_results
    )
    SELECT 
        sr.id,
        sr.name::TEXT,
        sr.generic_name::TEXT,
        sr.brand_name::TEXT,
        sr.manufacturer::TEXT,
        sr.strength::TEXT,
        sr.form::TEXT,
        sr.category::TEXT,
        sr.current_stock::INTEGER,
        sr.unit_price::DECIMAL,
        sr.minimum_stock::INTEGER,
        sr.is_low_stock::BOOLEAN,
        tc.total_count
    FROM search_results sr
    CROSS JOIN total_count_query tc
    LIMIT page_size
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get low stock items
CREATE OR REPLACE FUNCTION get_low_stock_medicines(
    pharmacy_id_param UUID,
    limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    generic_name TEXT,
    current_stock INTEGER,
    minimum_stock INTEGER,
    stock_difference INTEGER,
    unit_price DECIMAL,
    category TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name::TEXT,
        m.generic_name::TEXT,
        COALESCE(s.quantity, 0)::INTEGER as current_stock,
        COALESCE(s.minimum_stock, 10)::INTEGER as minimum_stock,
        (COALESCE(s.minimum_stock, 10) - COALESCE(s.quantity, 0))::INTEGER as stock_difference,
        COALESCE(s.unit_price, 0)::DECIMAL,
        m.category::TEXT
    FROM medicines m
    LEFT JOIN stock s ON m.id = s.medicine_id
    WHERE m.pharmacy_id = pharmacy_id_param
    AND m.is_active = true
    AND COALESCE(s.quantity, 0) <= COALESCE(s.minimum_stock, 10)
    ORDER BY 
        (COALESCE(s.minimum_stock, 10) - COALESCE(s.quantity, 0)) DESC,
        m.name
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function for sales analytics
CREATE OR REPLACE FUNCTION get_sales_analytics(
    pharmacy_id_param UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_sales', COALESCE(SUM(total_amount), 0),
        'total_transactions', COUNT(*),
        'average_transaction', COALESCE(AVG(total_amount), 0),
        'total_due', COALESCE(SUM(due_amount), 0),
        'cash_sales', COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0),
        'card_sales', COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0),
        'period_start', start_date,
        'period_end', end_date
    ) INTO result
    FROM sales
    WHERE pharmacy_id = pharmacy_id_param
    AND DATE(sale_date) BETWEEN start_date AND end_date
    AND status = 'completed';
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', SQLERRM,
            'total_sales', 0,
            'total_transactions', 0
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Add updated_at triggers to existing tables (only if they don't exist)
DO $$
BEGIN
    -- Check and create triggers for medicines
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_medicines_updated_at'
    ) THEN
        CREATE TRIGGER update_medicines_updated_at 
            BEFORE UPDATE ON medicines 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Check and create triggers for stock
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_stock_updated_at'
    ) THEN
        CREATE TRIGGER update_stock_updated_at 
            BEFORE UPDATE ON stock 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Check and create triggers for customers
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at'
    ) THEN
        CREATE TRIGGER update_customers_updated_at 
            BEFORE UPDATE ON customers 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Check and create triggers for sales
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_updated_at'
    ) THEN
        CREATE TRIGGER update_sales_updated_at 
            BEFORE UPDATE ON sales 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 8. Create view for dashboard summary
CREATE OR REPLACE VIEW pharmacy_dashboard_summary AS
SELECT 
    p.id as pharmacy_id,
    p.name as pharmacy_name,
    COUNT(DISTINCT m.id) as total_medicines,
    COUNT(DISTINCT CASE WHEN m.is_active = true THEN m.id END) as active_medicines,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT CASE WHEN s.quantity <= COALESCE(s.minimum_stock, 10) THEN s.id END) as low_stock_items,
    COALESCE(SUM(s.quantity * s.unit_price), 0) as total_inventory_value
FROM pharmacies p
LEFT JOIN medicines m ON p.id = m.pharmacy_id
LEFT JOIN customers c ON p.id = c.pharmacy_id AND c.is_active = true
LEFT JOIN stock s ON m.id = s.medicine_id
WHERE p.is_active = true
GROUP BY p.id, p.name;

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_pharmacy_dashboard_stats(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION search_medicines_optimized(TEXT, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_medicines(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_analytics(UUID, DATE, DATE) TO authenticated;
GRANT SELECT ON pharmacy_dashboard_summary TO authenticated;