-- Add Sample Medicines for Testing
-- Run this in Supabase SQL Editor to add more medicines to test with

-- First, let's check if we have the right pharmacy ID
-- Replace 'YOUR_PHARMACY_ID' with the actual pharmacy ID from the diagnosis (7bddb287-876f-4bc5-9220-88d32e7c42ba)

INSERT INTO medicines (
  pharmacy_id,
  name,
  generic_name, 
  brand_name,
  manufacturer,
  strength,
  form,
  category,
  is_active
) VALUES 
-- Antibiotics
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Amoxicillin 500mg', 'Amoxicillin', 'Amoxin', 'Square Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Azithromycin 250mg', 'Azithromycin', 'Azithro', 'Incepta Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ciprofloxacin 500mg', 'Ciprofloxacin', 'Ciprocin', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', true),

-- Pain Relief
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Paracetamol 500mg', 'Paracetamol', 'Napa', 'Beximco Pharmaceuticals', '500mg', 'Tablet', 'Analgesic', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ibuprofen 400mg', 'Ibuprofen', 'Brufen', 'Abbott', '400mg', 'Tablet', 'Analgesic', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Aspirin 75mg', 'Aspirin', 'Aspicap', 'Square Pharmaceuticals', '75mg', 'Tablet', 'Analgesic', true),

-- Antacids
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Omeprazole 20mg', 'Omeprazole', 'Losec', 'Square Pharmaceuticals', '20mg', 'Capsule', 'Antacid', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ranitidine 150mg', 'Ranitidine', 'Rani', 'Incepta Pharmaceuticals', '150mg', 'Tablet', 'Antacid', true),

-- Vitamins
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin B Complex', 'B Complex', 'B-50', 'Square Pharmaceuticals', '50mg', 'Tablet', 'Vitamin', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin C 500mg', 'Ascorbic Acid', 'C-Vit', 'Beximco Pharmaceuticals', '500mg', 'Tablet', 'Vitamin', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin D3 1000IU', 'Cholecalciferol', 'D3-Max', 'Incepta Pharmaceuticals', '1000IU', 'Tablet', 'Vitamin', true),

-- Diabetes
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Metformin 500mg', 'Metformin', 'Glucomin', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Antidiabetic', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Glimepiride 2mg', 'Glimepiride', 'Glimex', 'Incepta Pharmaceuticals', '2mg', 'Tablet', 'Antidiabetic', true),

-- Hypertension
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Amlodipine 5mg', 'Amlodipine', 'Amlovas', 'Incepta Pharmaceuticals', '5mg', 'Tablet', 'Antihypertensive', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Atenolol 50mg', 'Atenolol', 'Tenolol', 'Square Pharmaceuticals', '50mg', 'Tablet', 'Antihypertensive', true),

-- Respiratory
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Salbutamol 2mg', 'Salbutamol', 'Ventolin', 'GSK', '2mg', 'Tablet', 'Bronchodilator', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Montelukast 10mg', 'Montelukast', 'Montair', 'Cipla', '10mg', 'Tablet', 'Bronchodilator', true),

-- Allergy
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cetirizine 10mg', 'Cetirizine', 'Histacin', 'Square Pharmaceuticals', '10mg', 'Tablet', 'Antihistamine', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Loratadine 10mg', 'Loratadine', 'Loratin', 'Incepta Pharmaceuticals', '10mg', 'Tablet', 'Antihistamine', true),

-- Digestive
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Domperidone 10mg', 'Domperidone', 'Dompet', 'Square Pharmaceuticals', '10mg', 'Tablet', 'Antiemetic', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Loperamide 2mg', 'Loperamide', 'Lopex', 'Beximco Pharmaceuticals', '2mg', 'Tablet', 'Antidiarrheal', true),

-- Topical
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Hydrocortisone Cream', 'Hydrocortisone', 'Dermacort', 'Square Pharmaceuticals', '1%', 'Cream', 'Topical Steroid', true),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Mupirocin Ointment', 'Mupirocin', 'Mupiban', 'GSK', '2%', 'Ointment', 'Topical Antibiotic', true);

-- Verify the insertion
SELECT 
  COUNT(*) as total_medicines,
  COUNT(DISTINCT category) as total_categories,
  category,
  COUNT(*) as medicines_per_category
FROM medicines 
WHERE pharmacy_id = '7bddb287-876f-4bc5-9220-88d32e7c42ba'
GROUP BY category
ORDER BY medicines_per_category DESC;
