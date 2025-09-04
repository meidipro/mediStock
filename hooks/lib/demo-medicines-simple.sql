-- Simple Demo Medicines for Testing
-- Run this in Supabase SQL Editor

-- Insert essential medicines for testing
INSERT INTO medicines (generic_name, brand_name, manufacturer, strength, form) VALUES 

-- Pain Relief
('Paracetamol', 'Napa', 'Beximco Pharmaceuticals', '500mg', 'tablet'),
('Paracetamol', 'Ace', 'Square Pharmaceuticals', '500mg', 'tablet'),
('Ibuprofen', 'Profen', 'ACI Limited', '400mg', 'tablet'),

-- Antibiotics  
('Amoxicillin', 'Amoxin', 'Square Pharmaceuticals', '500mg', 'capsule'),
('Azithromycin', 'Azithral', 'Square Pharmaceuticals', '500mg', 'tablet'),
('Ciprofloxacin', 'Ciprocin', 'Square Pharmaceuticals', '500mg', 'tablet'),

-- Gastrointestinal
('Omeprazole', 'Seclo', 'Square Pharmaceuticals', '20mg', 'capsule'),
('Pantoprazole', 'Pantopra', 'Incepta Pharmaceuticals', '40mg', 'tablet'),
('Domperidone', 'Domidon', 'Square Pharmaceuticals', '10mg', 'tablet'),

-- Diabetes
('Metformin', 'Glycomet', 'Incepta Pharmaceuticals', '500mg', 'tablet'),
('Glimepiride', 'Amaryl', 'Sanofi', '2mg', 'tablet'),

-- Cardiovascular
('Amlodipine', 'Amlodac', 'Incepta Pharmaceuticals', '5mg', 'tablet'),
('Atenolol', 'Tenolol', 'Square Pharmaceuticals', '50mg', 'tablet'),
('Losartan', 'Losartan', 'Square Pharmaceuticals', '50mg', 'tablet'),

-- Allergy
('Cetirizine', 'Alatrol', 'Incepta Pharmaceuticals', '10mg', 'tablet'),
('Loratadine', 'Clarityn', 'Schering-Plough', '10mg', 'tablet'),

-- Vitamins
('Vitamin B Complex', 'B-50', 'Square Pharmaceuticals', '1mg', 'tablet'),
('Vitamin C', 'C-Vit', 'Beximco Pharmaceuticals', '500mg', 'tablet'),
('Calcium Carbonate', 'Calcin', 'Square Pharmaceuticals', '500mg', 'tablet'),

-- Topical
('Povidone Iodine', 'Betadine', 'Mundipharma', '10%', 'cream'),
('Hydrocortisone', 'Hydrocort', 'Square Pharmaceuticals', '1%', 'cream')

ON CONFLICT (generic_name, brand_name, manufacturer, strength) DO NOTHING;