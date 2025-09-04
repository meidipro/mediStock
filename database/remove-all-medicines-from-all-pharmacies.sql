-- This will delete ALL medicines from the database, for all pharmacies.
TRUNCATE TABLE medicines RESTART IDENTITY CASCADE;

-- This will clear the medicine knowledge base.
TRUNCATE TABLE medicine_knowledge_base RESTART IDENTITY CASCADE;
