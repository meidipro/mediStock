-- This will clear all possible sources of categories and medicine data.
TRUNCATE TABLE global_medicine_database RESTART IDENTITY CASCADE;
TRUNCATE TABLE medical_conditions RESTART IDENTITY CASCADE;
TRUNCATE TABLE medicines RESTART IDENTITY CASCADE;
