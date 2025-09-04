-- CLEANUP DUPLICATE PHARMACIES
  -- Run this FIRST to clean up your database

  -- 1. Show current duplicate situation
  SELECT
    owner_id,
    COUNT(*) as pharmacy_count,
    STRING_AGG(name, ', ') as pharmacy_names,
    STRING_AGG(id::text, ', ') as pharmacy_ids
  FROM pharmacies
  WHERE is_active = true
  GROUP BY owner_id
  ORDER BY pharmacy_count DESC;

  -- 2. Keep only the LATEST pharmacy for each user and deactivate others
  WITH latest_pharmacies AS (
    SELECT DISTINCT ON (owner_id)
      id,
      owner_id,
      name,
      created_at
    FROM pharmacies
    WHERE is_active = true
    ORDER BY owner_id, created_at DESC
  ),
  pharmacies_to_keep AS (
    SELECT id FROM latest_pharmacies
  )
  UPDATE pharmacies
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true
    AND id NOT IN (SELECT id FROM pharmacies_to_keep);

  -- 3. Verify cleanup - should show only 1 pharmacy per user
  SELECT
    owner_id,
    COUNT(*) as active_pharmacy_count,
    STRING_AGG(name, ', ') as pharmacy_names
  FROM pharmacies
  WHERE is_active = true
  GROUP BY owner_id
  ORDER BY active_pharmacy_count DESC;