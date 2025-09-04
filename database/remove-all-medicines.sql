-- IMPORTANT: Please replace '7bddb287-876f-4bc5-9220-88d32e7c42ba' with your actual pharmacy_id if it is different.
DELETE FROM medicines WHERE pharmacy_id = '7bddb287-876f-4bc5-9220-88d32e7c42ba';

-- This will clear the medicine knowledge base, which is not tied to a specific pharmacy.
TRUNCATE TABLE medicine_knowledge_base RESTART IDENTITY CASCADE;
