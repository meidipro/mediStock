-- MediStock BD Database Schema - Fixed Version
-- Essential tables only for authentication to work

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and policies to start fresh
DROP POLICY IF EXISTS "Users can view their own pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Users can insert pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Users can update their own pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Users can view pharmacy users for their pharmacies" ON pharmacy_users;
DROP POLICY IF EXISTS "Users can insert pharmacy users" ON pharmacy_users;

DROP TABLE IF EXISTS pharmacy_users CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ======================================
-- PHARMACY AND USER MANAGEMENT
-- ======================================

-- Pharmacies Table
CREATE TABLE pharmacies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles and Permissions
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'salesman', 'cashier');

-- Pharmacy Users Junction Table
CREATE TABLE pharmacy_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
-- ROW LEVEL SECURITY POLICIES
-- ======================================

-- Enable RLS on tables
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_users ENABLE ROW LEVEL SECURITY;

-- Simple pharmacies policies (avoid recursion)
CREATE POLICY "Users can view their owned pharmacies" ON pharmacies
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own pharmacies" ON pharmacies
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their owned pharmacies" ON pharmacies
FOR UPDATE USING (owner_id = auth.uid());

-- Simple pharmacy_users policies
CREATE POLICY "Users can view their pharmacy users" ON pharmacy_users
FOR SELECT USING (
  user_id = auth.uid() OR 
  pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid())
);

CREATE POLICY "Pharmacy owners can insert users" ON pharmacy_users
FOR INSERT WITH CHECK (
  pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update their own pharmacy user record" ON pharmacy_users
FOR UPDATE USING (
  user_id = auth.uid() OR 
  pharmacy_id IN (SELECT id FROM pharmacies WHERE owner_id = auth.uid())
);