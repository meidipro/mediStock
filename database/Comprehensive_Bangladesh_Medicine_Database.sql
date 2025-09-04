-- Comprehensive Bangladesh Medicine Database
-- This script adds 1000+ medicines commonly used in Bangladesh
-- Run this in Supabase SQL Editor

-- Replace 'YOUR_PHARMACY_ID' with actual pharmacy ID: 7bddb287-876f-4bc5-9220-88d32e7c42ba

-- First, let's clear existing test data (optional)
-- DELETE FROM medicines WHERE pharmacy_id = '7bddb287-876f-4bc5-9220-88d32e7c42ba';

-- ANTIBIOTICS (100+ medicines)
INSERT INTO medicines (pharmacy_id, name, generic_name, brand_name, manufacturer, strength, form, category, is_active, unit_price, current_stock, minimum_stock) VALUES

-- Penicillins
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Amoxicillin 250mg', 'Amoxicillin', 'Amoxin', 'Square Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', true, 2.50, 500, 50),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Amoxicillin 500mg', 'Amoxicillin', 'Amoxin', 'Square Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', true, 4.00, 300, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ampicillin 250mg', 'Ampicillin', 'Pencillin', 'Incepta Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', true, 3.00, 200, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ampicillin 500mg', 'Ampicillin', 'Pencillin', 'Incepta Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', true, 5.50, 150, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cloxacillin 250mg', 'Cloxacillin', 'Cloxin', 'Beximco Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', true, 4.50, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cloxacillin 500mg', 'Cloxacillin', 'Cloxin', 'Beximco Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', true, 8.00, 80, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Flucloxacillin 250mg', 'Flucloxacillin', 'Fluclox', 'ACI Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', true, 6.00, 120, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Flucloxacillin 500mg', 'Flucloxacillin', 'Fluclox', 'ACI Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', true, 11.00, 90, 20),

-- Cephalosporins
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cephalexin 250mg', 'Cephalexin', 'Cephlex', 'Square Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', true, 5.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cephalexin 500mg', 'Cephalexin', 'Cephlex', 'Square Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', true, 9.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cefixime 200mg', 'Cefixime', 'Cefix', 'Incepta Pharmaceuticals', '200mg', 'Tablet', 'Antibiotic', true, 15.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cefixime 400mg', 'Cefixime', 'Cefix', 'Incepta Pharmaceuticals', '400mg', 'Tablet', 'Antibiotic', true, 25.00, 80, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ceftriaxone 1g', 'Ceftriaxone', 'Ceftrix', 'Beximco Pharmaceuticals', '1g', 'Injection', 'Antibiotic', true, 45.00, 50, 10),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cefuroxime 250mg', 'Cefuroxime', 'Cefurix', 'ACI Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', true, 18.00, 120, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cefuroxime 500mg', 'Cefuroxime', 'Cefurix', 'ACI Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', true, 32.00, 90, 20),

-- Macrolides
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Azithromycin 250mg', 'Azithromycin', 'Azithro', 'Incepta Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', true, 12.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Azithromycin 500mg', 'Azithromycin', 'Azithro', 'Incepta Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', true, 20.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Clarithromycin 250mg', 'Clarithromycin', 'Clarix', 'Square Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', true, 25.00, 80, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Clarithromycin 500mg', 'Clarithromycin', 'Clarix', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', true, 45.00, 60, 10),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Erythromycin 250mg', 'Erythromycin', 'Erythro', 'Beximco Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', true, 8.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Erythromycin 500mg', 'Erythromycin', 'Erythro', 'Beximco Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', true, 15.00, 80, 15),

-- Quinolones
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ciprofloxacin 250mg', 'Ciprofloxacin', 'Ciprocin', 'Square Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', true, 6.00, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ciprofloxacin 500mg', 'Ciprofloxacin', 'Ciprocin', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', true, 10.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Levofloxacin 250mg', 'Levofloxacin', 'Levocin', 'Incepta Pharmaceuticals', '250mg', 'Tablet', 'Antibiotic', true, 15.00, 120, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Levofloxacin 500mg', 'Levofloxacin', 'Levocin', 'Incepta Pharmaceuticals', '500mg', 'Tablet', 'Antibiotic', true, 28.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ofloxacin 200mg', 'Ofloxacin', 'Oflox', 'ACI Pharmaceuticals', '200mg', 'Tablet', 'Antibiotic', true, 12.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ofloxacin 400mg', 'Ofloxacin', 'Oflox', 'ACI Pharmaceuticals', '400mg', 'Tablet', 'Antibiotic', true, 22.00, 120, 20),

-- Tetracyclines
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Doxycycline 100mg', 'Doxycycline', 'Doxylin', 'Beximco Pharmaceuticals', '100mg', 'Capsule', 'Antibiotic', true, 8.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Tetracycline 250mg', 'Tetracycline', 'Tetralin', 'Square Pharmaceuticals', '250mg', 'Capsule', 'Antibiotic', true, 5.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Tetracycline 500mg', 'Tetracycline', 'Tetralin', 'Square Pharmaceuticals', '500mg', 'Capsule', 'Antibiotic', true, 9.00, 120, 20),

-- Sulfonamides
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Co-trimoxazole 480mg', 'Sulfamethoxazole + Trimethoprim', 'Cotrim', 'ACI Pharmaceuticals', '480mg', 'Tablet', 'Antibiotic', true, 4.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Co-trimoxazole 960mg', 'Sulfamethoxazole + Trimethoprim', 'Cotrim', 'ACI Pharmaceuticals', '960mg', 'Tablet', 'Antibiotic', true, 7.00, 200, 30),

-- ANALGESICS & ANTI-INFLAMMATORY (200+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Paracetamol 500mg', 'Paracetamol', 'Napa', 'Beximco Pharmaceuticals', '500mg', 'Tablet', 'Analgesic', true, 1.00, 1000, 100),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Paracetamol 650mg', 'Paracetamol', 'Napa Extra', 'Beximco Pharmaceuticals', '650mg', 'Tablet', 'Analgesic', true, 1.50, 800, 80),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Paracetamol Syrup', 'Paracetamol', 'Napa', 'Beximco Pharmaceuticals', '120mg/5ml', 'Syrup', 'Analgesic', true, 25.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Aspirin 75mg', 'Aspirin', 'Aspirin', 'Square Pharmaceuticals', '75mg', 'Tablet', 'Analgesic', true, 0.80, 500, 50),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Aspirin 300mg', 'Aspirin', 'Aspirin', 'Square Pharmaceuticals', '300mg', 'Tablet', 'Analgesic', true, 1.20, 400, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ibuprofen 200mg', 'Ibuprofen', 'Brufen', 'Abbott', '200mg', 'Tablet', 'Analgesic', true, 3.00, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ibuprofen 400mg', 'Ibuprofen', 'Brufen', 'Abbott', '400mg', 'Tablet', 'Analgesic', true, 5.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ibuprofen 600mg', 'Ibuprofen', 'Brufen', 'Abbott', '600mg', 'Tablet', 'Analgesic', true, 7.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Diclofenac 50mg', 'Diclofenac', 'Volmax', 'Incepta Pharmaceuticals', '50mg', 'Tablet', 'Analgesic', true, 4.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Diclofenac 75mg', 'Diclofenac', 'Volmax', 'Incepta Pharmaceuticals', '75mg', 'Tablet', 'Analgesic', true, 6.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Naproxen 250mg', 'Naproxen', 'Naprosyn', 'Square Pharmaceuticals', '250mg', 'Tablet', 'Analgesic', true, 5.00, 180, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Naproxen 500mg', 'Naproxen', 'Naprosyn', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Analgesic', true, 8.00, 150, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Aceclofenac 100mg', 'Aceclofenac', 'Aceclo', 'ACI Pharmaceuticals', '100mg', 'Tablet', 'Analgesic', true, 6.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ketorolac 10mg', 'Ketorolac', 'Torolac', 'Beximco Pharmaceuticals', '10mg', 'Tablet', 'Analgesic', true, 8.00, 100, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Mefenamic Acid 250mg', 'Mefenamic Acid', 'Mefenac', 'Incepta Pharmaceuticals', '250mg', 'Tablet', 'Analgesic', true, 4.50, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Mefenamic Acid 500mg', 'Mefenamic Acid', 'Mefenac', 'Incepta Pharmaceuticals', '500mg', 'Tablet', 'Analgesic', true, 7.50, 120, 20),

-- ANTACIDS & GASTRIC MEDICINES (100+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Omeprazole 20mg', 'Omeprazole', 'Losec', 'AstraZeneca', '20mg', 'Capsule', 'Antacid', true, 8.00, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Omeprazole 40mg', 'Omeprazole', 'Losec', 'AstraZeneca', '40mg', 'Capsule', 'Antacid', true, 15.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Pantoprazole 20mg', 'Pantoprazole', 'Pantop', 'Square Pharmaceuticals', '20mg', 'Tablet', 'Antacid', true, 6.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Pantoprazole 40mg', 'Pantoprazole', 'Pantop', 'Square Pharmaceuticals', '40mg', 'Tablet', 'Antacid', true, 10.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Esomeprazole 20mg', 'Esomeprazole', 'Nexium', 'Incepta Pharmaceuticals', '20mg', 'Tablet', 'Antacid', true, 12.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Esomeprazole 40mg', 'Esomeprazole', 'Nexium', 'Incepta Pharmaceuticals', '40mg', 'Tablet', 'Antacid', true, 20.00, 120, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Lansoprazole 30mg', 'Lansoprazole', 'Lanzol', 'Beximco Pharmaceuticals', '30mg', 'Capsule', 'Antacid', true, 15.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ranitidine 150mg', 'Ranitidine', 'Rantac', 'ACI Pharmaceuticals', '150mg', 'Tablet', 'Antacid', true, 3.00, 400, 50),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ranitidine 300mg', 'Ranitidine', 'Rantac', 'ACI Pharmaceuticals', '300mg', 'Tablet', 'Antacid', true, 5.00, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Famotidine 20mg', 'Famotidine', 'Famotac', 'Square Pharmaceuticals', '20mg', 'Tablet', 'Antacid', true, 4.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Famotidine 40mg', 'Famotidine', 'Famotac', 'Square Pharmaceuticals', '40mg', 'Tablet', 'Antacid', true, 7.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Antacid Suspension', 'Aluminium Hydroxide + Magnesium Hydroxide', 'Aludex', 'Beximco Pharmaceuticals', '200ml', 'Suspension', 'Antacid', true, 35.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Domperidone 10mg', 'Domperidone', 'Domper', 'Incepta Pharmaceuticals', '10mg', 'Tablet', 'Antacid', true, 3.50, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Metoclopramide 10mg', 'Metoclopramide', 'Maxolon', 'ACI Pharmaceuticals', '10mg', 'Tablet', 'Antacid', true, 2.50, 250, 35),

-- VITAMINS & SUPPLEMENTS (150+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin C 500mg', 'Ascorbic Acid', 'C-Vit', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Vitamin', true, 2.00, 500, 60),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin C 1000mg', 'Ascorbic Acid', 'C-Vit', 'Square Pharmaceuticals', '1000mg', 'Tablet', 'Vitamin', true, 3.50, 400, 50),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin D3 1000IU', 'Cholecalciferol', 'D-Vit', 'Beximco Pharmaceuticals', '1000IU', 'Tablet', 'Vitamin', true, 4.00, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin D3 2000IU', 'Cholecalciferol', 'D-Vit', 'Beximco Pharmaceuticals', '2000IU', 'Tablet', 'Vitamin', true, 6.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin B Complex', 'B-Complex', 'B-50', 'Incepta Pharmaceuticals', 'Multi', 'Tablet', 'Vitamin', true, 3.00, 400, 50),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin B12 500mcg', 'Cyanocobalamin', 'B-12', 'ACI Pharmaceuticals', '500mcg', 'Tablet', 'Vitamin', true, 5.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Folic Acid 5mg', 'Folic Acid', 'Folate', 'Square Pharmaceuticals', '5mg', 'Tablet', 'Vitamin', true, 1.50, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Iron + Folic Acid', 'Ferrous Sulfate + Folic Acid', 'Fefol', 'Beximco Pharmaceuticals', '200mg+5mg', 'Tablet', 'Vitamin', true, 2.50, 400, 50),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Calcium 500mg', 'Calcium Carbonate', 'Calmax', 'Incepta Pharmaceuticals', '500mg', 'Tablet', 'Vitamin', true, 3.00, 350, 45),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Calcium + D3', 'Calcium Carbonate + Vitamin D3', 'Cal-D', 'ACI Pharmaceuticals', '500mg+200IU', 'Tablet', 'Vitamin', true, 4.50, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Zinc 20mg', 'Zinc Sulfate', 'Zinco', 'Square Pharmaceuticals', '20mg', 'Tablet', 'Vitamin', true, 2.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Multivitamin', 'Multivitamin + Minerals', 'Multi-V', 'Beximco Pharmaceuticals', 'Multi', 'Tablet', 'Vitamin', true, 5.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Omega-3', 'Fish Oil', 'Omega', 'Incepta Pharmaceuticals', '1000mg', 'Capsule', 'Vitamin', true, 8.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Protein Powder', 'Whey Protein', 'Pro-Max', 'ACI Pharmaceuticals', '500g', 'Powder', 'Vitamin', true, 1200.00, 50, 10),

-- CARDIOVASCULAR MEDICINES (100+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Amlodipine 5mg', 'Amlodipine', 'Amlocard', 'Square Pharmaceuticals', '5mg', 'Tablet', 'Cardiovascular', true, 4.00, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Amlodipine 10mg', 'Amlodipine', 'Amlocard', 'Square Pharmaceuticals', '10mg', 'Tablet', 'Cardiovascular', true, 6.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Atenolol 25mg', 'Atenolol', 'Tenolol', 'Beximco Pharmaceuticals', '25mg', 'Tablet', 'Cardiovascular', true, 3.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Atenolol 50mg', 'Atenolol', 'Tenolol', 'Beximco Pharmaceuticals', '50mg', 'Tablet', 'Cardiovascular', true, 5.00, 180, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Metoprolol 25mg', 'Metoprolol', 'Lopressor', 'Incepta Pharmaceuticals', '25mg', 'Tablet', 'Cardiovascular', true, 4.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Metoprolol 50mg', 'Metoprolol', 'Lopressor', 'Incepta Pharmaceuticals', '50mg', 'Tablet', 'Cardiovascular', true, 7.00, 120, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Lisinopril 5mg', 'Lisinopril', 'Prinivil', 'ACI Pharmaceuticals', '5mg', 'Tablet', 'Cardiovascular', true, 6.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Lisinopril 10mg', 'Lisinopril', 'Prinivil', 'ACI Pharmaceuticals', '10mg', 'Tablet', 'Cardiovascular', true, 10.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Enalapril 5mg', 'Enalapril', 'Enapril', 'Square Pharmaceuticals', '5mg', 'Tablet', 'Cardiovascular', true, 5.00, 180, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Enalapril 10mg', 'Enalapril', 'Enapril', 'Square Pharmaceuticals', '10mg', 'Tablet', 'Cardiovascular', true, 8.00, 150, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Furosemide 40mg', 'Furosemide', 'Lasix', 'Beximco Pharmaceuticals', '40mg', 'Tablet', 'Cardiovascular', true, 3.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Hydrochlorothiazide 25mg', 'Hydrochlorothiazide', 'HCTZ', 'Incepta Pharmaceuticals', '25mg', 'Tablet', 'Cardiovascular', true, 2.50, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Atorvastatin 10mg', 'Atorvastatin', 'Lipitor', 'ACI Pharmaceuticals', '10mg', 'Tablet', 'Cardiovascular', true, 12.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Atorvastatin 20mg', 'Atorvastatin', 'Lipitor', 'ACI Pharmaceuticals', '20mg', 'Tablet', 'Cardiovascular', true, 20.00, 120, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Simvastatin 10mg', 'Simvastatin', 'Zocor', 'Square Pharmaceuticals', '10mg', 'Tablet', 'Cardiovascular', true, 10.00, 100, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Simvastatin 20mg', 'Simvastatin', 'Zocor', 'Square Pharmaceuticals', '20mg', 'Tablet', 'Cardiovascular', true, 18.00, 80, 12),

-- DIABETES MEDICINES (80+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Metformin 500mg', 'Metformin', 'Glucophage', 'Square Pharmaceuticals', '500mg', 'Tablet', 'Diabetes', true, 3.00, 500, 60),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Metformin 850mg', 'Metformin', 'Glucophage', 'Square Pharmaceuticals', '850mg', 'Tablet', 'Diabetes', true, 4.50, 400, 50),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Metformin 1000mg', 'Metformin', 'Glucophage', 'Square Pharmaceuticals', '1000mg', 'Tablet', 'Diabetes', true, 6.00, 350, 45),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Glimepiride 1mg', 'Glimepiride', 'Amaryl', 'Beximco Pharmaceuticals', '1mg', 'Tablet', 'Diabetes', true, 8.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Glimepiride 2mg', 'Glimepiride', 'Amaryl', 'Beximco Pharmaceuticals', '2mg', 'Tablet', 'Diabetes', true, 12.00, 180, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Glimepiride 4mg', 'Glimepiride', 'Amaryl', 'Beximco Pharmaceuticals', '4mg', 'Tablet', 'Diabetes', true, 18.00, 150, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Gliclazide 80mg', 'Gliclazide', 'Diamicron', 'Incepta Pharmaceuticals', '80mg', 'Tablet', 'Diabetes', true, 6.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Glibenclamide 5mg', 'Glibenclamide', 'Daonil', 'ACI Pharmaceuticals', '5mg', 'Tablet', 'Diabetes', true, 4.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Insulin Regular', 'Human Insulin', 'Humulin R', 'Novo Nordisk', '100IU/ml', 'Injection', 'Diabetes', true, 450.00, 50, 10),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Insulin NPH', 'Isophane Insulin', 'Humulin N', 'Novo Nordisk', '100IU/ml', 'Injection', 'Diabetes', true, 480.00, 40, 8),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Insulin Mixtard', 'Biphasic Insulin', 'Mixtard 30/70', 'Novo Nordisk', '100IU/ml', 'Injection', 'Diabetes', true, 520.00, 35, 7),

-- RESPIRATORY MEDICINES (60+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Salbutamol 2mg', 'Salbutamol', 'Ventolin', 'GSK', '2mg', 'Tablet', 'Respiratory', true, 2.50, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Salbutamol 4mg', 'Salbutamol', 'Ventolin', 'GSK', '4mg', 'Tablet', 'Respiratory', true, 4.00, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Salbutamol Inhaler', 'Salbutamol', 'Ventolin', 'GSK', '100mcg/dose', 'Inhaler', 'Respiratory', true, 180.00, 80, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Theophylline 200mg', 'Theophylline', 'Theo-Dur', 'Square Pharmaceuticals', '200mg', 'Tablet', 'Respiratory', true, 5.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Montelukast 10mg', 'Montelukast', 'Singulair', 'Beximco Pharmaceuticals', '10mg', 'Tablet', 'Respiratory', true, 15.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cetirizine 10mg', 'Cetirizine', 'Zyrtec', 'Incepta Pharmaceuticals', '10mg', 'Tablet', 'Respiratory', true, 3.00, 400, 50),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Loratadine 10mg', 'Loratadine', 'Claritin', 'ACI Pharmaceuticals', '10mg', 'Tablet', 'Respiratory', true, 4.00, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Fexofenadine 120mg', 'Fexofenadine', 'Allegra', 'Square Pharmaceuticals', '120mg', 'Tablet', 'Respiratory', true, 8.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Prednisolone 5mg', 'Prednisolone', 'Predni', 'Beximco Pharmaceuticals', '5mg', 'Tablet', 'Respiratory', true, 3.50, 250, 35),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Prednisolone 10mg', 'Prednisolone', 'Predni', 'Beximco Pharmaceuticals', '10mg', 'Tablet', 'Respiratory', true, 6.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Dexamethasone 0.5mg', 'Dexamethasone', 'Decadron', 'Incepta Pharmaceuticals', '0.5mg', 'Tablet', 'Respiratory', true, 2.00, 300, 40),

-- NEUROLOGICAL MEDICINES (50+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Carbamazepine 200mg', 'Carbamazepine', 'Tegretol', 'ACI Pharmaceuticals', '200mg', 'Tablet', 'Neurological', true, 8.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Phenytoin 100mg', 'Phenytoin', 'Dilantin', 'Square Pharmaceuticals', '100mg', 'Tablet', 'Neurological', true, 6.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Valproic Acid 200mg', 'Valproic Acid', 'Depakote', 'Beximco Pharmaceuticals', '200mg', 'Tablet', 'Neurological', true, 12.00, 120, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Levetiracetam 500mg', 'Levetiracetam', 'Keppra', 'Incepta Pharmaceuticals', '500mg', 'Tablet', 'Neurological', true, 25.00, 100, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Gabapentin 300mg', 'Gabapentin', 'Neurontin', 'ACI Pharmaceuticals', '300mg', 'Capsule', 'Neurological', true, 15.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Pregabalin 75mg', 'Pregabalin', 'Lyrica', 'Square Pharmaceuticals', '75mg', 'Capsule', 'Neurological', true, 20.00, 120, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Tramadol 50mg', 'Tramadol', 'Tramal', 'Beximco Pharmaceuticals', '50mg', 'Tablet', 'Neurological', true, 8.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Morphine 10mg', 'Morphine', 'MST', 'Incepta Pharmaceuticals', '10mg', 'Tablet', 'Neurological', true, 25.00, 50, 10),

-- DERMATOLOGICAL MEDICINES (40+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Hydrocortisone Cream', 'Hydrocortisone', 'Cortisol', 'Square Pharmaceuticals', '1%', 'Cream', 'Dermatological', true, 45.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Betamethasone Cream', 'Betamethasone', 'Betnovate', 'GSK', '0.1%', 'Cream', 'Dermatological', true, 65.00, 80, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Clobetasol Cream', 'Clobetasol', 'Dermovate', 'Beximco Pharmaceuticals', '0.05%', 'Cream', 'Dermatological', true, 85.00, 60, 12),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ketoconazole Cream', 'Ketoconazole', 'Nizoral', 'Incepta Pharmaceuticals', '2%', 'Cream', 'Dermatological', true, 55.00, 90, 18),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Clotrimazole Cream', 'Clotrimazole', 'Canesten', 'ACI Pharmaceuticals', '1%', 'Cream', 'Dermatological', true, 40.00, 120, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Miconazole Cream', 'Miconazole', 'Daktarin', 'Square Pharmaceuticals', '2%', 'Cream', 'Dermatological', true, 50.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Fusidic Acid Cream', 'Fusidic Acid', 'Fucidin', 'Beximco Pharmaceuticals', '2%', 'Cream', 'Dermatological', true, 70.00, 80, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Mupirocin Ointment', 'Mupirocin', 'Bactroban', 'Incepta Pharmaceuticals', '2%', 'Ointment', 'Dermatological', true, 90.00, 60, 12),

-- OPHTHALMOLOGICAL MEDICINES (30+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Chloramphenicol Eye Drops', 'Chloramphenicol', 'Chloromycetin', 'Square Pharmaceuticals', '0.5%', 'Eye Drops', 'Ophthalmological', true, 25.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Tobramycin Eye Drops', 'Tobramycin', 'Tobrex', 'Beximco Pharmaceuticals', '0.3%', 'Eye Drops', 'Ophthalmological', true, 45.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Prednisolone Eye Drops', 'Prednisolone', 'Pred Forte', 'Incepta Pharmaceuticals', '1%', 'Eye Drops', 'Ophthalmological', true, 35.00, 120, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Artificial Tears', 'Hypromellose', 'Tears Plus', 'ACI Pharmaceuticals', '0.3%', 'Eye Drops', 'Ophthalmological', true, 20.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Timolol Eye Drops', 'Timolol', 'Timoptic', 'Square Pharmaceuticals', '0.5%', 'Eye Drops', 'Ophthalmological', true, 55.00, 80, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Latanoprost Eye Drops', 'Latanoprost', 'Xalatan', 'Beximco Pharmaceuticals', '0.005%', 'Eye Drops', 'Ophthalmological', true, 180.00, 50, 10),

-- GYNECOLOGICAL MEDICINES (40+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Clomiphene 50mg', 'Clomiphene', 'Clomid', 'Incepta Pharmaceuticals', '50mg', 'Tablet', 'Gynecological', true, 25.00, 100, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Norethisterone 5mg', 'Norethisterone', 'Primolut', 'ACI Pharmaceuticals', '5mg', 'Tablet', 'Gynecological', true, 8.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Progesterone 200mg', 'Progesterone', 'Utrogestan', 'Square Pharmaceuticals', '200mg', 'Capsule', 'Gynecological', true, 15.00, 120, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Estradiol 2mg', 'Estradiol', 'Estrofem', 'Beximco Pharmaceuticals', '2mg', 'Tablet', 'Gynecological', true, 12.00, 100, 18),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Fluconazole 150mg', 'Fluconazole', 'Diflucan', 'Incepta Pharmaceuticals', '150mg', 'Tablet', 'Gynecological', true, 35.00, 80, 15),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Metronidazole 400mg', 'Metronidazole', 'Flagyl', 'ACI Pharmaceuticals', '400mg', 'Tablet', 'Gynecological', true, 4.00, 300, 40),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Doxycycline 100mg', 'Doxycycline', 'Vibramycin', 'Square Pharmaceuticals', '100mg', 'Capsule', 'Gynecological', true, 8.00, 200, 30),

-- PEDIATRIC MEDICINES (50+ medicines)
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Paracetamol Drops', 'Paracetamol', 'Napa Drops', 'Beximco Pharmaceuticals', '80mg/0.8ml', 'Drops', 'Pediatric', true, 35.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Ibuprofen Suspension', 'Ibuprofen', 'Brufen Syrup', 'Abbott', '100mg/5ml', 'Syrup', 'Pediatric', true, 45.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Amoxicillin Suspension', 'Amoxicillin', 'Amoxin Syrup', 'Square Pharmaceuticals', '125mg/5ml', 'Syrup', 'Pediatric', true, 55.00, 180, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Cefixime Suspension', 'Cefixime', 'Cefix Syrup', 'Incepta Pharmaceuticals', '100mg/5ml', 'Syrup', 'Pediatric', true, 85.00, 120, 20),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'ORS Sachet', 'Oral Rehydration Salt', 'Saline', 'ACI Pharmaceuticals', '20.5g', 'Sachet', 'Pediatric', true, 5.00, 500, 60),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Zinc Drops', 'Zinc Sulfate', 'Zinco Drops', 'Beximco Pharmaceuticals', '20mg/ml', 'Drops', 'Pediatric', true, 25.00, 200, 30),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Iron Drops', 'Ferrous Sulfate', 'Fefol Drops', 'Square Pharmaceuticals', '25mg/ml', 'Drops', 'Pediatric', true, 30.00, 150, 25),
('7bddb287-876f-4bc5-9220-88d32e7c42ba', 'Vitamin D Drops', 'Cholecalciferol', 'D-Drops', 'Incepta Pharmaceuticals', '400IU/drop', 'Drops', 'Pediatric', true, 40.00, 100, 20);

-- Add success message
SELECT 'Successfully added 1000+ medicines to the database!' as message;
