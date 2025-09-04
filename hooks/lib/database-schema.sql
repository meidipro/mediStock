-- MediStock BD Complete Database Schema
-- Comprehensive database schema for pharmacy management system

-- ======================================
-- SCRIPT RESET (CLEANUP)
-- ======================================

-- Drop tables in the correct reverse dependency order.
-- CASCADE will handle dependent objects like policies, triggers, and foreign keys.
DROP TABLE IF EXISTS due_invoice_reminders CASCADE;
DROP TABLE IF EXISTS invoice_payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS medicine_groups CASCADE;
DROP TABLE IF EXISTS pharmacy_users CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;

-- Drop functions to ensure a clean slate
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_stock_timestamp();
DROP FUNCTION IF EXISTS update_medicine_groups_search_vector();
DROP FUNCTION IF EXISTS update_medicines_search_vector();
DROP FUNCTION IF EXISTS search_medicines(TEXT, UUID);
DROP FUNCTION IF EXISTS get_low_stock_items(UUID, INTEGER);
DROP FUNCTION IF EXISTS generate_daily_report(UUID, DATE);
DROP FUNCTION IF EXISTS get_customers_with_due(UUID);
DROP FUNCTION IF EXISTS find_customer_by_contact(UUID, VARCHAR);
DROP FUNCTION IF EXISTS update_customer_stats(UUID, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS get_invoice_summary(UUID, DATE, DATE);

-- Drop custom types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS sale_status CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS medicine_form CASCADE;
DROP TYPE IF EXISTS gender CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- ======================================
-- CUSTOM TYPES
-- ======================================

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'salesman', 'cashier');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'mobile_banking', 'due');
CREATE TYPE sale_status AS ENUM ('draft', 'completed', 'cancelled', 'returned');
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment', 'expired', 'damaged');
CREATE TYPE medicine_form AS ENUM ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'powder', 'other');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');

-- ======================================
-- PHARMACY AND USER MANAGEMENT
-- ======================================

-- Pharmacies Table
CREATE TABLE pharmacies (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pharmacy Users Junction Table
CREATE TABLE pharmacy_users (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'salesman',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pharmacy_id, user_id)
);

-- ======================================
-- MEDICINE MANAGEMENT
-- ======================================

-- Medicine Groups Table
CREATE TABLE medicine_groups (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  group_name VARCHAR(255) NOT NULL,
  description TEXT,
  common_symptoms TEXT[],
  search_vector TSVECTOR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medicines Table with full-text search
CREATE TABLE medicines (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  generic_name VARCHAR(255) NOT NULL,
  brand_name VARCHAR(255),
  manufacturer VARCHAR(255),
  strength VARCHAR(100),
  form medicine_form,
  category VARCHAR(100),
  therapeutic_group VARCHAR(100),
  group_id UUID REFERENCES medicine_groups(id),
  metadata JSONB DEFAULT '{}',
  search_vector TSVECTOR,
  barcode_number VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- CUSTOMER MANAGEMENT
-- ======================================

-- Customers Table
CREATE TABLE customers (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  location VARCHAR(500),
  contact_number VARCHAR(20),
  date_of_birth DATE,
  gender gender,
  total_due DECIMAL(10,2) DEFAULT 0,
  due_balance DECIMAL(10,2) DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  last_transaction_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- SUPPLIER MANAGEMENT
-- ======================================

-- Suppliers Table
CREATE TABLE suppliers (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- STOCK MANAGEMENT
-- ======================================

-- Stock Table
CREATE TABLE stock (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  manufacture_date DATE,
  supplier VARCHAR(255),
  low_stock_threshold INTEGER DEFAULT 10,
  location VARCHAR(100),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  UNIQUE(pharmacy_id, medicine_id, batch_number)
);

-- Stock Movements History
CREATE TABLE stock_movements (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES stock(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  movement_type movement_type,
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  batch_number VARCHAR(100),
  reference_type VARCHAR(50),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- INVOICE MANAGEMENT
-- ======================================

-- Invoices Table
CREATE TABLE invoices (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status VARCHAR(20) DEFAULT 'due' CHECK (status IN ('paid', 'partial', 'due', 'cancelled', 'overdue')),
  payment_terms VARCHAR(100),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_amounts CHECK (
    subtotal >= 0 AND
    total_amount >= 0 AND
    paid_amount >= 0 AND
    paid_amount <= total_amount
  )
);

-- Invoice Payments Table
CREATE TABLE invoice_payments (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  transaction_reference VARCHAR(100),
  payment_notes TEXT,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_payment_amount CHECK (payment_amount > 0)
);

-- Due Invoice Reminders Table
CREATE TABLE due_invoice_reminders (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) DEFAULT 'sms' CHECK (reminder_type IN ('sms', 'call', 'email', 'whatsapp')),
  reminder_date TIMESTAMPTZ DEFAULT NOW(),
  days_overdue INTEGER,
  reminder_content TEXT,
  response_received BOOLEAN DEFAULT false,
  response_date TIMESTAMPTZ,
  response_notes TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- SALES MANAGEMENT
-- ======================================

-- Sales Table
CREATE TABLE sales (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assisted_by UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES customers(id),
  bill_number VARCHAR(100) UNIQUE NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  payment_method payment_method DEFAULT 'cash',
  status sale_status DEFAULT 'completed',
  notes TEXT,
  return_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ
);

-- Payments Table
CREATE TABLE payments (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  transaction_id VARCHAR(100),
  notes TEXT,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- PURCHASE MANAGEMENT
-- ======================================

-- Purchases Table
CREATE TABLE purchases (
  id UUID DEFAULT extensions.gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  invoice_number VARCHAR(100),
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ======================================
-- INDEXES FOR PERFORMANCE
-- ======================================

-- Search indexes
CREATE INDEX medicines_search_idx ON medicines USING GIN(search_vector);
CREATE INDEX medicine_groups_search_idx ON medicine_groups USING GIN(search_vector);
CREATE INDEX medicines_name_idx ON medicines(generic_name, brand_name);

-- Performance indexes
CREATE INDEX pharmacy_users_pharmacy_idx ON pharmacy_users(pharmacy_id);
CREATE INDEX pharmacy_users_user_idx ON pharmacy_users(user_id);
CREATE INDEX customers_pharmacy_idx ON customers(pharmacy_id);
CREATE INDEX suppliers_pharmacy_idx ON suppliers(pharmacy_id);
CREATE INDEX stock_pharmacy_idx ON stock(pharmacy_id);
CREATE INDEX stock_medicine_idx ON stock(medicine_id);
CREATE INDEX stock_expiry_idx ON stock(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX stock_low_threshold_idx ON stock(pharmacy_id, quantity, low_stock_threshold);
CREATE INDEX sales_pharmacy_idx ON sales(pharmacy_id);
CREATE INDEX sales_date_idx ON sales(created_at);
CREATE INDEX sales_customer_idx ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX stock_movements_stock_idx ON stock_movements(stock_id);
CREATE INDEX payments_sale_idx ON payments(sale_id);

-- Invoice management indexes
CREATE INDEX invoices_pharmacy_idx ON invoices(pharmacy_id);
CREATE INDEX invoices_customer_idx ON invoices(customer_id);
CREATE INDEX invoices_status_idx ON invoices(status);
CREATE INDEX invoices_due_amount_idx ON invoices(due_amount) WHERE due_amount > 0;
CREATE INDEX invoices_date_idx ON invoices(invoice_date);
CREATE INDEX invoice_payments_invoice_idx ON invoice_payments(invoice_id);
CREATE INDEX invoice_payments_customer_idx ON invoice_payments(customer_id);
CREATE INDEX invoice_payments_date_idx ON invoice_payments(payment_date);
CREATE INDEX due_reminders_invoice_idx ON due_invoice_reminders(invoice_id);
CREATE INDEX due_reminders_customer_idx ON due_invoice_reminders(customer_id);
CREATE INDEX customers_contact_idx ON customers(contact_number) WHERE contact_number IS NOT NULL;
CREATE INDEX customers_phone_idx ON customers(phone) WHERE phone IS NOT NULL;

-- ======================================
-- ROW LEVEL SECURITY (RLS)
-- ======================================

-- Enable RLS on all tables
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_invoice_reminders ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Public read access for general medicine information
CREATE POLICY "Medicines are publicly viewable" ON medicines FOR SELECT USING (true);
CREATE POLICY "Medicine groups are publicly viewable" ON medicine_groups FOR SELECT USING (true);

-- Pharmacy policies
CREATE POLICY "Users can manage their own pharmacies" ON pharmacies
FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Assigned users can view their pharmacies" ON pharmacies
FOR SELECT USING (id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid()));

-- Pharmacy users policies
CREATE POLICY "Users can view their own pharmacy relationships" ON pharmacy_users
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Pharmacy owners can manage users in their pharmacies" ON pharmacy_users
FOR ALL USING (pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert pharmacy relationships for owned pharmacies" ON pharmacy_users  
FOR INSERT WITH CHECK (pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update their own pharmacy relationships" ON pharmacy_users
FOR UPDATE USING (user_id = auth.uid() OR pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid()));

-- Data access policies for assigned pharmacy users
CREATE POLICY "Assigned users can manage data for their pharmacy" ON customers
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON suppliers
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON stock
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON stock_movements
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON sales
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON payments
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON purchases
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON invoices
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON invoice_payments
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Assigned users can manage data for their pharmacy" ON due_invoice_reminders
FOR ALL USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true))
WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_users WHERE user_id = auth.uid() AND is_active = true));


-- ======================================
-- DATABASE FUNCTIONS
-- ======================================

-- Function for medicine search with ranking
CREATE OR REPLACE FUNCTION search_medicines(
  search_term TEXT,
  pharmacy_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  generic_name VARCHAR,
  brand_name VARCHAR,
  manufacturer VARCHAR,
  strength VARCHAR,
  form VARCHAR,
  current_stock INTEGER,
  unit_price DECIMAL,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.generic_name,
    m.brand_name,
    m.manufacturer,
    m.strength,
    m.form::VARCHAR,
    COALESCE(s.quantity, 0) as current_stock,
    COALESCE(s.unit_price, 0) as unit_price,
    ts_rank(m.search_vector, websearch_to_tsquery('english', search_term)) as rank
  FROM medicines m
  LEFT JOIN stock s ON m.id = s.medicine_id
    AND (pharmacy_id_param IS NULL OR s.pharmacy_id = pharmacy_id_param)
  WHERE m.search_vector @@ websearch_to_tsquery('english', search_term)
    AND m.is_active = true
  ORDER BY rank DESC, m.generic_name
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to get low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(
  pharmacy_id_param UUID,
  threshold_param INTEGER DEFAULT 10
)
RETURNS TABLE (
  medicine_id UUID,
  generic_name VARCHAR,
  brand_name VARCHAR,
  current_quantity INTEGER,
  threshold INTEGER,
  batch_number VARCHAR,
  expiry_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.medicine_id,
    m.generic_name,
    m.brand_name,
    s.quantity as current_quantity,
    s.low_stock_threshold as threshold,
    s.batch_number,
    s.expiry_date
  FROM stock s
  INNER JOIN medicines m ON s.medicine_id = m.id
  WHERE s.pharmacy_id = pharmacy_id_param
    AND s.quantity <= COALESCE(s.low_stock_threshold, threshold_param)
    AND s.quantity > 0
  ORDER BY s.quantity ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get customers with due balances
CREATE OR REPLACE FUNCTION get_customers_with_due(
  pharmacy_id_param UUID
)
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR,
  contact_number VARCHAR,
  location VARCHAR,
  due_balance DECIMAL,
  total_invoices INTEGER,
  last_transaction_date TIMESTAMPTZ,
  days_since_last_transaction INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as customer_id,
    c.name as customer_name,
    COALESCE(c.contact_number, c.phone) as contact_number,
    COALESCE(c.location, c.address) as location,
    c.due_balance,
    c.total_invoices,
    c.last_transaction_date,
    CASE
      WHEN c.last_transaction_date IS NOT NULL THEN
        EXTRACT(days FROM NOW() - c.last_transaction_date)::INTEGER
      ELSE NULL
    END as days_since_last_transaction
  FROM customers c
  WHERE c.pharmacy_id = pharmacy_id_param
    AND c.due_balance > 0
    AND c.is_active = true
  ORDER BY c.due_balance DESC, c.last_transaction_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- USER REGISTRATION AUTOMATION
-- ======================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger runs after a new user signs up
  -- It automatically creates basic user profile data if needed
  
  -- The user will be prompted to create a pharmacy after registration
  -- through the app's Account setup flow
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to create pharmacy and user relationship
CREATE OR REPLACE FUNCTION create_pharmacy_with_owner(
  pharmacy_name VARCHAR,
  license_number VARCHAR DEFAULT NULL,
  address TEXT DEFAULT NULL,
  phone VARCHAR DEFAULT NULL,
  email VARCHAR DEFAULT NULL,
  owner_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  pharmacy_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  new_pharmacy_id UUID;
  target_user_id UUID;
BEGIN
  -- Use provided user_id or current authenticated user
  target_user_id := COALESCE(owner_user_id, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'User not authenticated'::TEXT;
    RETURN;
  END IF;

  -- Create the pharmacy
  INSERT INTO pharmacies (name, license_number, address, phone, email, owner_id)
  VALUES (pharmacy_name, license_number, address, phone, email, target_user_id)
  RETURNING id INTO new_pharmacy_id;

  -- Create pharmacy_users relationship
  INSERT INTO pharmacy_users (pharmacy_id, user_id, role, is_active)
  VALUES (new_pharmacy_id, target_user_id, 'owner', TRUE);

  -- Return success
  RETURN QUERY SELECT new_pharmacy_id, TRUE, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- TRIGGERS FOR AUTOMATION
-- ======================================

-- Generic function to update the `updated_at` timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update `search_vector` for `medicine_groups`
CREATE OR REPLACE FUNCTION update_medicine_groups_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
      coalesce(NEW.group_name, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      array_to_string(NEW.common_symptoms, ' ')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update_medicine_groups
BEFORE INSERT OR UPDATE ON medicine_groups
FOR EACH ROW EXECUTE FUNCTION update_medicine_groups_search_vector();

-- Trigger to update `search_vector` for `medicines`
CREATE OR REPLACE FUNCTION update_medicines_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
      coalesce(NEW.generic_name, '') || ' ' ||
      coalesce(NEW.brand_name, '') || ' ' ||
      coalesce(NEW.manufacturer, '') || ' ' ||
      coalesce(NEW.category, '') || ' ' ||
      coalesce(NEW.therapeutic_group, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update_medicines
BEFORE INSERT OR UPDATE ON medicines
FOR EACH ROW EXECUTE FUNCTION update_medicines_search_vector();

-- Apply `updated_at` triggers to all relevant tables
CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacy_users_updated_at BEFORE UPDATE ON pharmacy_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medicine_groups_updated_at BEFORE UPDATE ON medicine_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON medicines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ======================================
-- REAL-TIME SUBSCRIPTIONS
-- ======================================
ALTER PUBLICATION supabase_realtime ADD TABLE stock;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_payments;

-- ======================================
-- INITIAL DATA (SEEDING)
-- ======================================

INSERT INTO medicine_groups (group_name, description, common_symptoms) VALUES
('Analgesics', 'Pain relief medicines', ARRAY['pain', 'headache', 'fever', 'inflammation']),
('Antibiotics', 'Bacterial infection treatment', ARRAY['infection', 'fever', 'bacterial']),
('Antacids', 'Stomach acid relief', ARRAY['acidity', 'heartburn', 'indigestion']),
('Cough & Cold', 'Respiratory symptoms', ARRAY['cough', 'cold', 'congestion', 'sore throat']),
('Diabetes Care', 'Blood sugar management', ARRAY['diabetes', 'blood sugar', 'insulin']),
('Hypertension', 'Blood pressure management', ARRAY['high blood pressure', 'hypertension']);

INSERT INTO medicines (generic_name, brand_name, manufacturer, strength, form, category, therapeutic_group, group_id) VALUES
('Paracetamol', 'Napa', 'Beximco Pharmaceuticals', '500mg', 'tablet', 'Analgesic', 'Non-narcotic analgesic', (SELECT id from medicine_groups WHERE group_name = 'Analgesics')),
('Paracetamol', 'Ace', 'Square Pharmaceuticals', '500mg', 'tablet', 'Analgesic', 'Non-narcotic analgesic', (SELECT id from medicine_groups WHERE group_name = 'Analgesics')),
('Omeprazole', 'Losec', 'AstraZeneca', '20mg', 'capsule', 'Antacid', 'Proton pump inhibitor', (SELECT id from medicine_groups WHERE group_name = 'Antacids')),
('Amoxicillin', 'Amoxin', 'Square Pharmaceuticals', '500mg', 'capsule', 'Antibiotic', 'Penicillin', (SELECT id from medicine_groups WHERE group_name = 'Antibiotics')),
('Azithromycin', 'Azithrocin', 'Square Pharmaceuticals', '500mg', 'tablet', 'Antibiotic', 'Macrolide', (SELECT id from medicine_groups WHERE group_name = 'Antibiotics')),
('Metformin', 'Diabex', 'Novartis', '500mg', 'tablet', 'Antidiabetic', 'Biguanide', (SELECT id from medicine_groups WHERE group_name = 'Diabetes Care')),
('Aspirin', 'Disprin', 'Reckitt Benckiser', '325mg', 'tablet', 'Analgesic', 'Salicylate', (SELECT id from medicine_groups WHERE group_name = 'Analgesics')),
('Ibuprofen', 'Brufen', 'Abbott', '400mg', 'tablet', 'Analgesic', 'NSAID', (SELECT id from medicine_groups WHERE group_name = 'Analgesics')),
('Ciprofloxacin', 'Ciprocin', 'Square Pharmaceuticals', '500mg', 'tablet', 'Antibiotic', 'Quinolone', (SELECT id from medicine_groups WHERE group_name = 'Antibiotics')),
('Ranitidine', 'Ranac', 'Square Pharmaceuticals', '150mg', 'tablet', 'Antacid', 'H2 receptor antagonist', (SELECT id from medicine_groups WHERE group_name = 'Antacids'));