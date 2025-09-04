# Lib Folder Documentation

## 📄 Database Setup Files

### `database-schema-fixed.sql`
**Purpose**: Essential database schema for MediStock BD
**Usage**: Run this in Supabase SQL Editor to set up core tables
**Contains**:
- `pharmacies` table
- `pharmacy_users` table  
- User roles and permissions
- Basic RLS policies

### `demo-medicines-simple.sql`
**Purpose**: Sample medicine data for testing
**Usage**: Run after database setup to add 20+ essential medicines
**Contains**:
- Pain relief medicines (Napa, Profen)
- Antibiotics (Amoxin, Azithral)
- Diabetes medicines (Glycomet)
- Cardiovascular medicines
- Vitamins and supplements

## 🧠 Smart Features

### `medicine-knowledge-base.ts` ✅ **ACTIVELY USED**
**Purpose**: Intelligent medicine database for smart suggestions
**Connected to**: 
- `SmartMedicineInput` component
- `MedicineQuickSearch` component  
- Sales screen
- Inventory screen

**Features**:
- 🔍 **Smart Search**: Auto-suggests medicines as you type
- 💊 **Alternative Brands**: Shows alternatives for same generic medicine
- ⚠️ **Drug Interactions**: Checks for dangerous medicine combinations
- 📊 **Medicine Classifications**: Organizes by therapeutic class
- 🏭 **Manufacturer Info**: Bangladesh-specific brand knowledge

**Methods**:
- `getSmartSuggestions()` - Real-time search suggestions
- `getAlternativeBrands()` - Find generic alternatives  
- `checkInteractions()` - Drug interaction warnings
- `searchByIndication()` - Find medicines by symptoms

## 🚀 Setup Instructions

1. **First**: Run `database-schema-fixed.sql` in Supabase
2. **Then**: Run `demo-medicines-simple.sql` for test data
3. **Result**: Ready-to-use pharmacy management system with smart features

## 🗑️ Cleaned Up

Removed redundant files:
- ❌ `database-schema.sql` (too comprehensive)
- ❌ `database-schema-safe.sql` (redundant)
- ❌ `database-schema-minimal.sql` (superseded by fixed)
- ❌ `demo-medicines.sql` (too large, simple version better)

## 📁 Current Files Status
- ✅ `database-schema-fixed.sql` - Essential database setup
- ✅ `demo-medicines-simple.sql` - Test data
- ✅ `medicine-knowledge-base.ts` - **Smart features engine**
- ✅ `ai-service.ts` - AI integration (GROQ)
- ✅ `types.ts` - TypeScript definitions
- ✅ `supabase.js` - Database connection

**All files are essential and actively used!**