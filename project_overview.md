# MediStock BD - Pharmacy Management System
## Complete Development Prompt for Claude Code (Updated with Supabase)

### Project Overview
Build a comprehensive pharmacy management application for local Bangladesh pharmacies with real-time stock management, sales processing, billing, and analytics dashboard using modern cloud-native architecture.

### Core Features to Implement

#### 1. Medicine Database & Auto-Suggestions
- **Built-in Medicine Knowledge Base**: Comprehensive database of medicines available in Bangladesh
- **Smart Auto-Complete**: When user types "a" → show all medicines starting with "a"
- **Medicine Group Suggestions**: If no direct matches found → suggest relevant medicine categories/groups
- **Fallback Recommendations**: Show popular medicines in similar categories when search yields no results
- **Medicine Details**: Each medicine includes:
  - Generic name
  - Brand name
  - Manufacturer
  - Dosage form (tablet, syrup, injection, etc.)
  - Strength/dosage
  - Category (antibiotic, painkiller, etc.)
  - Therapeutic group classification
- **Add/Remove Medicines**: Pharmacy owner can add custom medicines or remove from suggestions

#### 2. Stock Management System
- **Real-time Inventory**: Add/update medicine quantity, unit price, expiry date
- **Low Stock Alerts**: Automatic notifications when stock falls below threshold
- **Batch Management**: Track different batches with expiry dates
- **Stock History**: View all stock movements (added, sold, expired)

#### 3. Sales & Billing Process
- **Flexible Sales Process**:
  1. **Direct Owner Sale**: Owner handles entire process from medicine selection to payment
  2. **Salesman-Owner Process**: Salesman selects medicines → Owner reviews & finalizes payment
  3. **Optional Token System**: For larger pharmacies with separate roles
- **Automatic Calculations**: Price, discount, tax calculations
- **Instant Billing**: Generate receipt immediately after payment
- **Customer Management**: Store customer info for due tracking

#### 4. Due Management
- **Customer Due Tracking**: Track pending payments with customer details
- **Due Collection Alerts**: Remind about overdue payments
- **Payment History**: Complete payment tracking per customer

#### 5. Reporting & Analytics Dashboard
- **Automated Reports**: Daily, 10-day, monthly reports via email (Google Sheets integration)
- **Sales Analytics**:
  - Total sales, profits
  - Top-selling medicines
  - Due collection status
- **Stock Analytics**: Emergency stock alerts, expiry warnings

#### 6. User Management
- **Role-based Access**: Owner, Manager, Salesman, Cashier roles
- **Multi-pharmacy Support**: (Future) Manage multiple pharmacy locations

### Technical Requirements

#### Frontend Framework
```
Cross-Platform Development Options:

Option 1: React Native + Expo (Recommended)
- Single codebase for iOS, Android, and Web
- Native performance on mobile devices
- Easy deployment to app stores
- Desktop support via Electron wrapper

Option 2: Flutter 
- Single codebase for all platforms
- Excellent performance and UI consistency
- Built-in desktop support (Windows, macOS, Linux)
- Strong mobile performance

Option 3: Progressive Web App (PWA)
- Web-based but works like native app
- Installable on all platforms
- Offline capabilities
- Lower development cost

Recommended Stack: React Native + Expo
- Mobile: Native iOS and Android apps
- Desktop: Electron wrapper or PWA
- Web: React Native Web
```

#### Backend Technology
```
Supabase (Backend-as-a-Service)
- PostgreSQL database with real-time subscriptions
- Built-in authentication and authorization
- Row Level Security (RLS) policies
- Real-time data synchronization
- RESTful API auto-generated from database schema
- Edge Functions for custom business logic
- File storage for medicine images/documents
```

#### Database & Cloud Infrastructure
```
Supabase PostgreSQL
- Full-text search capabilities for medicine lookup
- JSONB support for flexible medicine metadata
- Built-in indexing for fast auto-suggestions
- Real-time subscriptions for live stock updates
- Automatic backups and point-in-time recovery
- Built-in connection pooling and performance optimization
```

#### Key Integrations
```
- Supabase Auth for user management
- Supabase Storage for medicine images
- Supabase Edge Functions for complex business logic
- Email service (Resend/SendGrid) for reports via Edge Functions
- Google Sheets API integration via Edge Functions
- SMS service for stock alerts (optional) via Edge Functions
```

### Critical Implementation Details

#### Medicine Auto-Suggestion System
```typescript
// Supabase query with full-text search
const searchMedicines = async (query: string) => {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .or(`generic_name.ilike.%${query}%,brand_name.ilike.%${query}%`)
    .order('generic_name')
    .limit(10);
  
  return data;
};

// If no exact matches, suggest groups using PostgreSQL full-text search
const suggestGroups = async (query: string) => {
  const { data, error } = await supabase
    .from('medicine_groups')
    .select(`
      *,
      popular_medicines:medicines(generic_name, brand_name)
    `)
    .textSearch('search_vector', query)
    .limit(5);
  
  return data;
};
```

#### Real-time Stock Management with Supabase
```typescript
// Real-time stock updates
const subscribeToStockUpdates = () => {
  const subscription = supabase
    .channel('stock_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stock',
        filter: `pharmacy_id=eq.${pharmacyId}`
      },
      (payload) => {
        // Update UI in real-time
        handleStockUpdate(payload);
      }
    )
    .subscribe();
  
  return subscription;
};

// Low stock alert using PostgreSQL function
const checkLowStock = async () => {
  const { data, error } = await supabase
    .rpc('get_low_stock_items', { 
      pharmacy_id: pharmacyId,
      threshold: 10 
    });
  
  return data;
};
```

#### Sales Token System with Row Level Security
```typescript
// RLS Policy for sales access control
/*
CREATE POLICY "Users can only access their pharmacy's sales" ON sales
FOR ALL USING (
  auth.uid() IN (
    SELECT user_id FROM pharmacy_users 
    WHERE pharmacy_id = sales.pharmacy_id
  )
);
*/

// Flexible Sales Flow with Supabase
const createSale = async (saleData: SaleData) => {
  const { data, error } = await supabase
    .from('sales')
    .insert({
      ...saleData,
      created_by: user.id,
      pharmacy_id: userPharmacy.id,
      status: 'draft' // or 'completed' for direct sales
    })
    .select()
    .single();
  
  return data;
};
```

#### Automated Reporting with Edge Functions
```typescript
// Supabase Edge Function for automated reports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Generate daily sales report
  const { data: salesData } = await supabase
    .rpc('generate_daily_report', {
      report_date: new Date().toISOString().split('T')[0]
    });

  // Send email report
  // Integration with Resend or SendGrid
  
  return new Response(JSON.stringify({ success: true }))
})
```

### Database Schema (PostgreSQL with Supabase)

#### Medicine Table
```sql
CREATE TABLE medicines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  generic_name VARCHAR NOT NULL,
  brand_name VARCHAR,
  manufacturer VARCHAR,
  strength VARCHAR,
  form VARCHAR, -- tablet, syrup, injection
  category VARCHAR,
  therapeutic_group VARCHAR,
  metadata JSONB, -- Additional flexible data
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', 
      coalesce(generic_name, '') || ' ' || 
      coalesce(brand_name, '') || ' ' || 
      coalesce(manufacturer, '')
    )
  ) STORED,
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create GIN index for full-text search
CREATE INDEX medicines_search_idx ON medicines USING GIN(search_vector);
CREATE INDEX medicines_name_idx ON medicines(generic_name, brand_name);
```

#### Medicine Groups Table
```sql
CREATE TABLE medicine_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name VARCHAR NOT NULL,
  description TEXT,
  common_symptoms TEXT[],
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', 
      coalesce(group_name, '') || ' ' || 
      coalesce(description, '') || ' ' ||
      array_to_string(common_symptoms, ' ')
    )
  ) STORED,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX medicine_groups_search_idx ON medicine_groups USING GIN(search_vector);
```

#### Stock Table with Real-time Updates
```sql
CREATE TABLE stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id),
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  batch_number VARCHAR,
  expiry_date DATE,
  low_stock_threshold INTEGER DEFAULT 10,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(pharmacy_id, medicine_id, batch_number)
);

-- Enable real-time for stock table
ALTER PUBLICATION supabase_realtime ADD TABLE stock;
```

#### Sales Table with JSONB for Flexibility
```sql
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assisted_by UUID REFERENCES auth.users(id),
  items JSONB NOT NULL, -- Array of sale items
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  due_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  customer_id UUID REFERENCES customers(id),
  payment_method VARCHAR DEFAULT 'cash',
  status VARCHAR DEFAULT 'completed',
  bill_number VARCHAR UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their pharmacy's sales" ON sales
FOR ALL USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM pharmacy_users 
    WHERE user_id = auth.uid()
  )
);
```

### Supabase-Specific Features

#### Real-time Subscriptions
- Live stock level updates across all connected devices
- Real-time sales notifications
- Instant low stock alerts
- Live dashboard updates

#### Row Level Security (RLS)
- Automatic data isolation per pharmacy
- Role-based access control at database level
- Secure multi-tenancy without application-level filtering

#### Edge Functions for Business Logic
- Automated report generation
- Stock alert processing
- Integration with external APIs
- Custom authentication flows

#### Built-in Authentication
- Email/password authentication
- Role-based permissions
- Session management
- Password reset flows

### Performance Optimization with Supabase

#### Database Optimization
```sql
-- Optimized queries for medicine search
CREATE OR REPLACE FUNCTION search_medicines(search_term TEXT)
RETURNS TABLE (
  id UUID,
  generic_name VARCHAR,
  brand_name VARCHAR,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.generic_name,
    m.brand_name,
    ts_rank(m.search_vector, websearch_to_tsquery(search_term)) as rank
  FROM medicines m
  WHERE m.search_vector @@ websearch_to_tsquery(search_term)
    AND m.is_active = true
  ORDER BY rank DESC, m.generic_name
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

#### Caching Strategy
- Supabase automatic query caching
- Edge caching for static medicine data
- Real-time cache invalidation
- CDN for medicine images

### Security Considerations with Supabase
- Row Level Security policies for data isolation
- JWT-based authentication
- API rate limiting
- Input validation at database level
- Secure file uploads to Supabase Storage
- Environment variable management

### Deployment Strategy
- **Mobile Apps**: Deploy to iOS App Store and Google Play Store
- **Desktop Apps**: 
  - Windows: Microsoft Store or direct download (.exe)
  - macOS: Mac App Store or direct download (.dmg)
  - Linux: Snap Store or AppImage
- **Web Version**: Progressive Web App (PWA) hosted on Vercel/Netlify
- **Backend**: Fully managed by Supabase (no server deployment needed)
- **Edge Functions**: Auto-deployed to Supabase Edge Runtime
- Environment-based configuration via Supabase CLI

### Development Phases

#### Phase 1: Supabase Setup & Core Foundation (Days 1-7)
- Set up Supabase project and database schema
- Configure Row Level Security policies
- Implement Supabase Auth integration
- Create medicine database with full-text search
- Build basic stock management with real-time updates

#### Phase 2: Sales System with Real-time Features (Days 8-14)
- Implement real-time sales processing
- Build role-based interfaces with RLS
- Add automatic calculations using PostgreSQL functions
- Create customer and due management with live sync

#### Phase 3: Analytics & Automation (Days 15-21)
- Deploy Supabase Edge Functions for reports
- Build real-time analytics dashboard
- Implement automated alerts using database triggers
- Add Google Sheets integration via Edge Functions

#### Phase 4: Cross-Platform Testing & Deployment (Days 22-30)
- Test real-time sync across all platforms
- Performance optimization with Supabase
- App store submission preparation
- Production deployment with Supabase

### Supabase Advantages for MediStock BD

#### Development Speed
- No backend server setup required
- Auto-generated APIs from database schema
- Built-in authentication and file storage
- Real-time subscriptions out of the box

#### Scalability
- Auto-scaling PostgreSQL database
- Global edge network
- Connection pooling included
- Built-in backup and recovery

#### Cost Effectiveness
- Pay-as-you-scale pricing
- No server maintenance costs
- Built-in monitoring and analytics
- Free tier for development and small pharmacies

#### Developer Experience
- Excellent TypeScript support
- Local development with Supabase CLI
- Database migrations and version control
- Real-time database changes in development

### Success Metrics
- **User Adoption**: Number of active pharmacies
- **Usage Frequency**: Daily active users with real-time engagement
- **Feature Utilization**: Most used features with Supabase Analytics
- **Performance**: Average response time < 1 second (Supabase edge optimization)
- **Error Rate**: < 0.5% application errors
- **Real-time Engagement**: Active real-time connections per pharmacy

### Next Steps for Claude Code
1. Initialize React Native + Expo project with Supabase integration
2. Set up Supabase project with database schema and RLS policies
3. Configure Supabase Auth and real-time subscriptions
4. Implement medicine search with PostgreSQL full-text search
5. Build responsive UI with real-time data synchronization
6. Deploy Edge Functions for automated reporting
7. Test cross-platform real-time functionality
8. Prepare for app store submissions with Supabase backend

This updated architecture leverages Supabase's modern Backend-as-a-Service platform to provide real-time capabilities, better security, and faster development while maintaining all the core features of the pharmacy management system.