-- Complete Fix for Low Stock Alerts Issue
-- This script will:
-- 1. Clean up duplicate medicines created by app bugs
-- 2. Fix the low stock function to show only real low stock items
-- 3. Provide verification queries

-- Step 1: Show current status
SELECT 'BEFORE CLEANUP - Current Status' as step;

SELECT COUNT(*) as total_medicines FROM medicines WHERE is_active = true;

SELECT COUNT(*) as medicines_without_stock
FROM medicines m
LEFT JOIN stock s ON m.id = s.medicine_id
WHERE s.medicine_id IS NULL AND m.is_active = true;

SELECT COUNT(*) as medicines_with_stock
FROM medicines m
INNER JOIN stock s ON m.id = s.medicine_id
WHERE m.is_active = true;

-- Step 2: Clean up medicines without any stock (these are the duplicates)
SELECT 'STEP 2 - Cleaning up duplicate medicines' as step;

DELETE FROM medicines 
WHERE id IN (
    SELECT m.id 
    FROM medicines m
    LEFT JOIN stock s ON m.id = s.medicine_id
    WHERE s.medicine_id IS NULL
        AND m.is_active = true
);

-- Step 3: Update the low stock function to only show real low stock items
SELECT 'STEP 3 - Updating low stock function' as step;

DROP FUNCTION IF EXISTS get_low_stock_items(uuid,integer) CASCADE;

CREATE OR REPLACE FUNCTION get_low_stock_items(
  pharmacy_id_param UUID,
  threshold_param INTEGER DEFAULT 10
)
RETURNS TABLE(
  medicine_id UUID,
  generic_name VARCHAR,
  brand_name VARCHAR,
  current_quantity INTEGER,
  threshold INTEGER,
  batch_number VARCHAR,
  expiry_date VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.generic_name,
    m.brand_name,
    s.quantity::INTEGER,
    COALESCE(s.minimum_stock, threshold_param)::INTEGER,
    s.batch_number,
    s.expiry_date::VARCHAR
  FROM medicines m
  INNER JOIN stock s ON m.id = s.medicine_id  -- Only medicines WITH actual stock
  WHERE m.pharmacy_id = pharmacy_id_param 
    AND m.is_active = true
    AND s.quantity > 0  -- Has some stock (not completely out)
    AND s.quantity <= COALESCE(s.minimum_stock, threshold_param)  -- But below minimum threshold
  ORDER BY s.quantity ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Verification - Show results after cleanup
SELECT 'AFTER CLEANUP - Final Status' as step;

SELECT COUNT(*) as total_medicines_remaining FROM medicines WHERE is_active = true;

SELECT COUNT(*) as medicines_with_actual_stock
FROM medicines m
INNER JOIN stock s ON m.id = s.medicine_id
WHERE m.is_active = true;

-- Test the new low stock function
SELECT COUNT(*) as actual_low_stock_items
FROM get_low_stock_items((SELECT id FROM pharmacies LIMIT 1), 10);

-- Show some examples of remaining medicines with stock
SELECT 
    m.name,
    m.generic_name,
    s.quantity,
    s.minimum_stock,
    CASE 
        WHEN s.quantity <= COALESCE(s.minimum_stock, 10) THEN 'LOW STOCK'
        ELSE 'ADEQUATE'
    END as stock_status
FROM medicines m
INNER JOIN stock s ON m.id = s.medicine_id
WHERE m.is_active = true
ORDER BY s.quantity ASC
LIMIT 10;