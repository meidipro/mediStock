-- FINAL WORKING SCHEMA - Properly drops existing functions first
  -- Copy and paste this entire code into Supabase SQL Editor

  -- First, drop ALL functions with all their possible signatures
  DROP FUNCTION IF EXISTS get_low_stock_items(uuid,integer) CASCADE;
  DROP FUNCTION IF EXISTS get_low_stock_items(uuid) CASCADE;
  DROP FUNCTION IF EXISTS get_low_stock_items() CASCADE;
  DROP FUNCTION IF EXISTS search_medicines(text,uuid) CASCADE;
  DROP FUNCTION IF EXISTS search_medicines(text) CASCADE;
  DROP FUNCTION IF EXISTS search_medicines() CASCADE;
  DROP FUNCTION IF EXISTS generate_daily_report(uuid,date) CASCADE;
  DROP FUNCTION IF EXISTS generate_daily_report(uuid) CASCADE;
  DROP FUNCTION IF EXISTS generate_daily_report() CASCADE;
  DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
  DROP FUNCTION IF EXISTS create_pharmacy_with_owner() CASCADE;

  -- Drop all existing policies
  DO $$
  DECLARE
      r RECORD;
  BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP       
          BEGIN
              EXECUTE 'DROP POLICY IF EXISTS "Users can read ' || r.tablename || '      
  they own" ON ' || r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "Users can update ' || r.tablename ||      
  ' they own" ON ' || r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own ' ||
  r.tablename || '" ON ' || r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "' || r.tablename || '_read_policy" ON     
   ' || r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "' || r.tablename || '_write_policy"       
  ON ' || r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "pharmacy_users_read_policy" ON ' ||       
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "pharmacy_users_write_policy" ON ' ||      
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "pharmacy_owner_read" ON ' ||
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "pharmacy_owner_insert" ON ' ||
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "pharmacy_owner_update" ON ' ||
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "pharmacy_owner_delete" ON ' ||
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "medicine_pharmacy_access" ON ' ||
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "stock_pharmacy_access" ON ' ||
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "sales_pharmacy_access" ON ' ||
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "sale_items_access" ON ' ||
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "suppliers_pharmacy_access" ON ' ||        
  r.tablename;
              EXECUTE 'DROP POLICY IF EXISTS "customers_pharmacy_access" ON ' ||        
  r.tablename;
          EXCEPTION
              WHEN OTHERS THEN NULL;
          END;
      END LOOP;
  END $$;

  -- Drop all existing tables in correct order
  DROP TABLE IF EXISTS sale_items CASCADE;
  DROP TABLE IF EXISTS sales CASCADE;
  DROP TABLE IF EXISTS stock CASCADE;
  DROP TABLE IF EXISTS medicines CASCADE;
  DROP TABLE IF EXISTS suppliers CASCADE;
  DROP TABLE IF EXISTS customers CASCADE;
  DROP TABLE IF EXISTS pharmacy_users CASCADE;
  DROP TABLE IF EXISTS pharmacies CASCADE;

  -- Drop views
  DROP VIEW IF EXISTS schema_verification CASCADE;

  -- Create updated_at trigger function
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- 1. Create pharmacies table FIRST
  CREATE TABLE pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 2. Create customers table
  CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    date_of_birth DATE,
    gender VARCHAR(10),
    medical_conditions TEXT,
    allergies TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 3. Create medicines table
  CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    manufacturer VARCHAR(255),
    strength VARCHAR(100),
    dosage VARCHAR(100),
    form VARCHAR(50),
    category VARCHAR(100),
    barcode VARCHAR(100),
    is_prescription_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 4. Create stock table
  CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    batch_number VARCHAR(100),
    expiry_date DATE,
    supplier VARCHAR(255),
    minimum_stock INTEGER DEFAULT 10,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 5. Create sales table
  CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    bill_number VARCHAR(100) UNIQUE,
    invoice_number VARCHAR(100) UNIQUE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    due_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount)
  STORED,
    payment_method VARCHAR(20) DEFAULT 'cash',
    status VARCHAR(20) DEFAULT 'completed',
    items JSONB DEFAULT '[]',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 6. Create sale_items table
  CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,       
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 7. Create suppliers table
  CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

  -- RLS Policies
  CREATE POLICY "pharmacy_owner_read" ON pharmacies FOR SELECT USING (auth.uid() =      
  owner_id);
  CREATE POLICY "pharmacy_owner_insert" ON pharmacies FOR INSERT WITH CHECK
  (auth.uid() = owner_id);
  CREATE POLICY "pharmacy_owner_update" ON pharmacies FOR UPDATE USING (auth.uid()      
  = owner_id);
  CREATE POLICY "pharmacy_owner_delete" ON pharmacies FOR DELETE USING (auth.uid()      
  = owner_id);

  CREATE POLICY "customers_pharmacy_access" ON customers FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = customers.pharmacy_id        
  AND pharmacies.owner_id = auth.uid())
  );

  CREATE POLICY "medicine_pharmacy_access" ON medicines FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = medicines.pharmacy_id        
  AND pharmacies.owner_id = auth.uid())
  );

  CREATE POLICY "stock_pharmacy_access" ON stock FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = stock.pharmacy_id AND        
  pharmacies.owner_id = auth.uid())
  );

  CREATE POLICY "sales_pharmacy_access" ON sales FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = sales.pharmacy_id AND        
  pharmacies.owner_id = auth.uid())
  );

  CREATE POLICY "sale_items_access" ON sale_items FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales s
      JOIN pharmacies p ON p.id = s.pharmacy_id
      WHERE s.id = sale_items.sale_id AND p.owner_id = auth.uid()
    )
  );

  CREATE POLICY "suppliers_pharmacy_access" ON suppliers FOR ALL USING (
    EXISTS (SELECT 1 FROM pharmacies WHERE pharmacies.id = suppliers.pharmacy_id        
  AND pharmacies.owner_id = auth.uid())
  );

  -- Create triggers
  CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies FOR EACH      
  ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH        
  ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON medicines FOR EACH        
  ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH        
  ROW EXECUTE FUNCTION update_updated_at_column();

  -- Create functions (NEW - no conflicts)
  CREATE OR REPLACE FUNCTION get_low_stock_items(
    pharmacy_id_param UUID,
    threshold_param INTEGER DEFAULT 10
  )
  RETURNS TABLE(
    medicine_id UUID,
    medicine_name VARCHAR,
    generic_name VARCHAR,
    brand_name VARCHAR,
    current_stock INTEGER,
    minimum_stock INTEGER,
    stock_status VARCHAR
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      m.id,
      m.name,
      m.generic_name,
      m.brand_name,
      COALESCE(s.quantity, 0)::INTEGER,
      COALESCE(s.minimum_stock, threshold_param)::INTEGER,
      CASE
        WHEN COALESCE(s.quantity, 0) = 0 THEN 'OUT_OF_STOCK'::VARCHAR
        WHEN COALESCE(s.quantity, 0) <= COALESCE(s.minimum_stock, threshold_param)      
  THEN 'LOW_STOCK'::VARCHAR
        ELSE 'ADEQUATE'::VARCHAR
      END
    FROM medicines m
    LEFT JOIN stock s ON m.id = s.medicine_id
    WHERE m.pharmacy_id = pharmacy_id_param
      AND m.is_active = true
      AND (s.quantity IS NULL OR s.quantity <= COALESCE(s.minimum_stock,
  threshold_param))
    ORDER BY COALESCE(s.quantity, 0) ASC;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION search_medicines(
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
    current_stock INTEGER,
    unit_price DECIMAL
  ) AS $$
  BEGIN
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
      COALESCE(s.quantity, 0)::INTEGER,
      COALESCE(s.unit_price, 0::DECIMAL)
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
      CASE WHEN m.name ILIKE search_term || '%' THEN 1 ELSE 2 END,
      m.name
    LIMIT 20;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION generate_daily_report(
    pharmacy_id_param UUID,
    report_date DATE
  )
  RETURNS TABLE(
    total_sales DECIMAL,
    total_transactions INTEGER,
    total_due DECIMAL,
    top_medicines JSONB,
    low_stock_count INTEGER
  ) AS $$
  DECLARE
    start_date TIMESTAMP;
    end_date TIMESTAMP;
  BEGIN
    start_date := report_date::TIMESTAMP;
    end_date := (report_date + INTERVAL '1 day')::TIMESTAMP;

    RETURN QUERY
    SELECT
      COALESCE(SUM(s.total_amount), 0::DECIMAL),
      COUNT(s.id)::INTEGER,
      COALESCE(SUM(s.due_amount), 0::DECIMAL),
      '[]'::JSONB,
      (
        SELECT COUNT(*)::INTEGER
        FROM medicines m
        LEFT JOIN stock st ON m.id = st.medicine_id
        WHERE m.pharmacy_id = pharmacy_id_param
        AND COALESCE(st.quantity, 0) <= 10
      )
    FROM sales s
    WHERE s.pharmacy_id = pharmacy_id_param
      AND s.created_at >= start_date
      AND s.created_at < end_date
      AND s.is_active = true;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Create indexes
  CREATE INDEX idx_pharmacies_owner_id ON pharmacies(owner_id);
  CREATE INDEX idx_customers_pharmacy_id ON customers(pharmacy_id);
  CREATE INDEX idx_medicines_pharmacy_id ON medicines(pharmacy_id);
  CREATE INDEX idx_medicines_name ON medicines(name);
  CREATE INDEX idx_stock_pharmacy_id ON stock(pharmacy_id);
  CREATE INDEX idx_stock_medicine_id ON stock(medicine_id);
  CREATE INDEX idx_sales_pharmacy_id ON sales(pharmacy_id);
  CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
  CREATE INDEX idx_suppliers_pharmacy_id ON suppliers(pharmacy_id);

  -- Verification
  CREATE OR REPLACE VIEW schema_verification AS
  SELECT 'SUCCESS' as status, COUNT(*) as tables_created
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('pharmacies', 'customers', 'medicines', 'stock', 'sales',
  'sale_items', 'suppliers');

  SELECT * FROM schema_verification;