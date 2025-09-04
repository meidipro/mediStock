-- Update medicines that have missing categories
-- Run this in Supabase SQL Editor to fix medicines with NULL categories

UPDATE medicines 
SET category = 'Analgesic'
WHERE (name ILIKE '%paracetamol%' OR name ILIKE '%napa%') 
AND category IS NULL;

UPDATE medicines 
SET category = 'ACE Inhibitor'
WHERE (name ILIKE '%lisinopril%' OR name ILIKE '%prinivil%') 
AND category IS NULL;

UPDATE medicines 
SET category = 'Antihistamine'
WHERE (name ILIKE '%loratadine%' OR name ILIKE '%claritin%') 
AND category IS NULL;

UPDATE medicines 
SET category = 'Proton Pump Inhibitor'
WHERE (name ILIKE '%omeprazole%' OR name ILIKE '%losec%') 
AND category IS NULL;

UPDATE medicines 
SET category = 'Beta Blocker'
WHERE (name ILIKE '%metoprolol%' OR name ILIKE '%lopressor%') 
AND category IS NULL;

-- Verify the updates
SELECT name, generic_name, brand_name, category 
FROM medicines 
WHERE pharmacy_id = '7bddb287-876f-4bc5-9220-88d32e7c42ba'
ORDER BY category, name;
