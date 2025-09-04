-- =======================================================
-- FINAL AND DEFINITIVE RLS POLICY FIX (SINGLE-USER MODEL) - CORRECTED SYNTAX
-- =======================================================

-- STEP 1: Temporarily disable RLS to safely drop old policies.
ALTER TABLE pharmacies DISABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_users DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL possible old policies on both tables to ensure a clean slate.
DROP POLICY IF EXISTS "Owners can fully manage their own pharmacy" ON pharmacies;
DROP POLICY IF EXISTS "Users can manage their own membership record" ON pharmacy_users;
-- Add any other old policy names here if they exist to be sure they are gone.
DROP POLICY IF EXISTS "Assigned users can view their pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Users can view users of their accessible pharmacies" ON pharmacy_users;


-- STEP 3: Create the two new, simple, non-recursive policies.

-- POLICY 1 (for 'pharmacies' table):
-- A user can do ANYTHING with a pharmacy record if their ID matches the 'owner_id'.
CREATE POLICY "Owners can fully manage their own pharmacy" ON pharmacies
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- POLICY 2 (for 'pharmacy_users' table):
-- A user can do ANYTHING with their own membership record.
CREATE POLICY "Users can manage their own membership record" ON pharmacy_users
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- STEP 4: Re-enable RLS on the tables. This is a critical step.
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_users ENABLE ROW LEVEL SECURITY;