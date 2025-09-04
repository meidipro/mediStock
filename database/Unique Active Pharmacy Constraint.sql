 -- PREVENT FUTURE DUPLICATES
  -- Create unique constraint to prevent multiple active pharmacies per user
  CREATE UNIQUE INDEX CONCURRENTLY idx_unique_active_pharmacy_per_owner
  ON pharmacies (owner_id)
  WHERE is_active = true;