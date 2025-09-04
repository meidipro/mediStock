-- =======================================================
-- FINAL, SIMPLE RLS POLICY (SINGLE USER PER PHARMACY)
-- =======================================================

-- == POLICY FOR 'pharmacies' TABLE ==

-- A user can do anything (select, insert, update, delete)
-- with a pharmacy record if their user ID matches the 'owner_id' column.
-- This is simple, secure, and has no recursion.
CREATE POLICY "Owners can fully manage their own pharmacy" ON pharmacies
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());


-- == POLICY FOR 'pharmacy_users' TABLE ==

-- A user can do anything with a pharmacy_users record if it
-- belongs to them. This allows them to see their own role.
CREATE POLICY "Users can manage their own membership record" ON pharmacy_users
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- Finally, re-enable RLS on both tables.
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_users ENABLE ROW LEVEL SECURITY;