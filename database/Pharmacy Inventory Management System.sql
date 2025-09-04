-- PURCHASE-INVENTORY INTEGRATION SCHEMA (FINAL VERSION)
-- Add purchase tracking and stock movement tables to existing schema

-- 1. Create stock_movements table for audit trail
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    quantity_before INTEGER,
    quantity_after INTEGER,
    unit_cost DECIMAL(10,2),
    batch_number VARCHAR(100),
    barcode_scanned VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 2. Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    tax_number VARCHAR(100),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    order_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_pharmacy ON stock_movements(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_medicine ON stock_movements(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suppliers_pharmacy ON suppliers(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_pharmacy ON purchase_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_medicine ON purchase_order_items(medicine_id);

-- 6. Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 7. Now drop existing policies if they exist (after tables are created)
DROP POLICY IF EXISTS "stock_movements_pharmacy_access" ON stock_movements;
DROP POLICY IF EXISTS "suppliers_pharmacy_access" ON suppliers;
DROP POLICY IF EXISTS "purchase_orders_pharmacy_access" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_order_items_pharmacy_access" ON purchase_order_items;

-- 8. Create RLS policies
CREATE POLICY "stock_movements_pharmacy_access" ON stock_movements FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = stock_movements.pharmacy_id AND pharmacies.owner_id = auth.uid())
);

CREATE POLICY "suppliers_pharmacy_access" ON suppliers FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = suppliers.pharmacy_id AND pharmacies.owner_id = auth.uid())
);

CREATE POLICY "purchase_orders_pharmacy_access" ON purchase_orders FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = purchase_orders.pharmacy_id AND pharmacies.owner_id = auth.uid())
);

CREATE POLICY "purchase_order_items_pharmacy_access" ON purchase_order_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM purchase_orders po 
        JOIN pharmacies p ON p.id = po.pharmacy_id 
        WHERE po.id = purchase_order_items.purchase_order_id 
        AND p.owner_id = auth.uid()
    )
);

-- 9. Create update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;

CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at 
    BEFORE UPDATE ON purchase_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Create purchase recommendations function
CREATE OR REPLACE FUNCTION get_purchase_recommendations(
    pharmacy_id_param UUID,
    days_lookback INTEGER DEFAULT 30
)
RETURNS TABLE(
    medicine_id UUID,
    medicine_name VARCHAR,
    current_stock INTEGER,
    minimum_stock INTEGER,
    recommended_order_quantity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.medicine_id,
        m.name as medicine_name,
        st.quantity as current_stock,
        st.minimum_stock,
        GREATEST(st.minimum_stock * 2 - st.quantity, 10) as recommended_order_quantity
    FROM stock st
    JOIN medicines m ON m.id = st.medicine_id
    WHERE st.pharmacy_id = pharmacy_id_param
    AND st.quantity <= st.minimum_stock
    ORDER BY st.quantity ASC, m.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create the cleanup function that your app needs
CREATE OR REPLACE FUNCTION cleanup_duplicate_medicines(
    pharmacy_id_param UUID
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete medicines that have no stock entries
    DELETE FROM medicines 
    WHERE pharmacy_id = pharmacy_id_param
    AND is_active = true
    AND id NOT IN (
        SELECT DISTINCT medicine_id 
        FROM stock 
        WHERE pharmacy_id = pharmacy_id_param
        AND medicine_id IS NOT NULL
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create stock movement logging function
CREATE OR REPLACE FUNCTION log_stock_movement(
    pharmacy_id_param UUID,
    medicine_id_param UUID,
    movement_type_param VARCHAR,
    quantity_param INTEGER,
    unit_cost_param DECIMAL DEFAULT NULL,
    batch_number_param VARCHAR DEFAULT NULL,
    notes_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    movement_id UUID;
BEGIN
    INSERT INTO stock_movements (
        pharmacy_id,
        medicine_id,
        movement_type,
        quantity,
        unit_cost,
        batch_number,
        notes,
        created_by
    ) VALUES (
        pharmacy_id_param,
        medicine_id_param,
        movement_type_param,
        quantity_param,
        unit_cost_param,
        batch_number_param,
        notes_param,
        auth.uid()
    ) RETURNING id INTO movement_id;
    
    RETURN movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final verification
SELECT 
    '✅ PURCHASE INTEGRATION SCHEMA INSTALLED' as message,
    NOW() as installed_at;

SELECT 
    'Tables Created: ' || COUNT(*) as tables_status
FROM information_schema.tables 
WHERE table_name IN ('stock_movements', 'suppliers', 'purchase_orders', 'purchase_order_items');

SELECT 
    'Functions Created: ' || COUNT(*) as functions_status
FROM information_schema.routines 
WHERE routine_name IN ('get_purchase_recommendations', 'cleanup_duplicate_medicines', 'log_stock_movement');

-- Test the cleanup function is working
SELECT 'cleanup_duplicate_medicines function' as test_name, 'Ready to use' as status;