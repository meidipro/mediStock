# MediStock - Technical Specifications

## System Architecture Overview

MediStock is built using a modern, scalable architecture designed for high performance and reliability.

### Architecture Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Dashboard  │    │   API Gateway   │
│  (React Native) │◄──►│   (React.js)     │◄──►│   (Supabase)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │   Backend Services      │
                    │   ┌─────────────────┐   │
                    │   │   PostgreSQL    │   │
                    │   │   Database      │   │
                    │   └─────────────────┘   │
                    │   ┌─────────────────┐   │
                    │   │   Real-time     │   │
                    │   │   Subscriptions │   │
                    │   └─────────────────┘   │
                    │   ┌─────────────────┐   │
                    │   │   File Storage  │   │
                    │   └─────────────────┘   │
                    └─────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │   External Services     │
                    │   ┌─────────────────┐   │
                    │   │   bKash API     │   │
                    │   └─────────────────┘   │
                    │   ┌─────────────────┐   │
                    │   │   Nagad API     │   │
                    │   └─────────────────┘   │
                    │   ┌─────────────────┐   │
                    │   │   Rocket API    │   │
                    │   └─────────────────┘   │
                    └─────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React Native 0.72+
- **Language**: TypeScript 5.0+
- **UI Framework**: Expo SDK 49+
- **Navigation**: Expo Router
- **State Management**: React Context API + Custom hooks
- **Styling**: Themed styled components
- **Icons**: Expo Vector Icons (@expo/vector-icons)
- **Camera**: Expo Camera (for barcode scanning)

### Backend
- **Database**: PostgreSQL 14+
- **Backend-as-a-Service**: Supabase
- **Authentication**: Supabase Auth (JWT-based)
- **Real-time**: Supabase Realtime (WebSocket)
- **File Storage**: Supabase Storage
- **API**: Auto-generated RESTful API + GraphQL

### Cloud Infrastructure
- **Hosting**: Supabase Cloud (AWS-backed)
- **CDN**: Global edge network
- **Backup**: Automated daily backups
- **Monitoring**: Built-in monitoring and alerting
- **SSL**: End-to-end encryption

### Development Tools
- **Version Control**: Git
- **Package Manager**: npm/yarn
- **Build Tool**: Expo Application Services (EAS)
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript compiler

## Database Schema

### Core Tables

#### 1. Pharmacies
```sql
CREATE TABLE pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    license_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Stock Management
```sql
CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id),
    medicine_id UUID REFERENCES medicines(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    minimum_stock INTEGER DEFAULT 10,
    batch_number VARCHAR(100),
    expiry_date DATE,
    supplier VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimized indexes
CREATE INDEX idx_stock_pharmacy_medicine ON stock(pharmacy_id, medicine_id);
CREATE INDEX idx_stock_expiry ON stock(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_stock_low ON stock(pharmacy_id, quantity, minimum_stock);
```

#### 3. Medicines Database
```sql
CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generic_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    manufacturer VARCHAR(255),
    category VARCHAR(100),
    strength VARCHAR(100),
    form VARCHAR(50), -- tablet, capsule, syrup, etc.
    unit VARCHAR(20), -- piece, bottle, box, etc.
    barcode VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GIN index for fast text search
CREATE INDEX idx_medicines_search ON medicines USING GIN (
    to_tsvector('english', generic_name || ' ' || brand_name || ' ' || manufacturer)
);
```

#### 4. Invoice System
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id),
    customer_id UUID REFERENCES customers(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    due_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'cash',
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. Subscription System
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    duration_months INTEGER NOT NULL,
    price_bdt DECIMAL(10,2) NOT NULL,
    features JSONB NOT NULL DEFAULT '{}',
    limitations JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pharmacy_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id),
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active',
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Functions

#### Optimized Dashboard Statistics
```sql
CREATE OR REPLACE FUNCTION get_pharmacy_dashboard_stats(p_pharmacy_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH daily_stats AS (
        SELECT 
            COALESCE(SUM(total_amount), 0) as today_sales,
            COUNT(*) as today_transactions
        FROM invoices 
        WHERE pharmacy_id = p_pharmacy_id 
        AND invoice_date = CURRENT_DATE
    ),
    stock_stats AS (
        SELECT 
            COUNT(*) as total_medicines,
            COUNT(*) FILTER (WHERE quantity <= minimum_stock) as low_stock_count,
            COALESCE(SUM(quantity * unit_price), 0) as inventory_value
        FROM stock 
        WHERE pharmacy_id = p_pharmacy_id
    ),
    monthly_stats AS (
        SELECT 
            COALESCE(SUM(total_amount), 0) as month_sales,
            COUNT(*) as month_transactions
        FROM invoices 
        WHERE pharmacy_id = p_pharmacy_id 
        AND invoice_date >= date_trunc('month', CURRENT_DATE)
    )
    SELECT json_build_object(
        'today_sales', daily_stats.today_sales,
        'today_transactions', daily_stats.today_transactions,
        'month_sales', monthly_stats.month_sales,
        'month_transactions', monthly_stats.month_transactions,
        'total_medicines', stock_stats.total_medicines,
        'low_stock_count', stock_stats.low_stock_count,
        'inventory_value', stock_stats.inventory_value
    ) INTO result
    FROM daily_stats, stock_stats, monthly_stats;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Security Implementation

### Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Pharmacy access policy
CREATE POLICY "Users can only access their own pharmacy data"
ON pharmacies FOR ALL
USING (owner_id = auth.uid());

-- Stock access policy
CREATE POLICY "Users can only access their pharmacy's stock"
ON stock FOR ALL
USING (pharmacy_id IN (
    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
));
```

### Authentication Flow
1. **Registration**: Email/password + pharmacy details
2. **Verification**: Email verification required
3. **Login**: JWT token-based authentication
4. **Session Management**: Automatic token refresh
5. **Logout**: Token invalidation

### Data Protection
- **Encryption at Rest**: AES-256 encryption
- **Encryption in Transit**: TLS 1.3
- **API Security**: JWT tokens, rate limiting
- **Database Security**: RLS policies, prepared statements
- **File Upload**: Virus scanning, type validation

## Performance Optimization

### Database Optimization
- **Indexes**: Strategic indexing for common queries
- **Connection Pooling**: Supabase connection pooling
- **Query Optimization**: Prepared statements, efficient joins
- **Caching**: Query result caching where appropriate

### Mobile App Optimization
- **Code Splitting**: Lazy loading of screens
- **Image Optimization**: Automatic image compression
- **Offline Capability**: Local SQLite for offline mode
- **Memory Management**: Proper cleanup of listeners

### Network Optimization
- **Real-time Subscriptions**: Only subscribe to necessary data
- **Batch Operations**: Grouping database operations
- **Compression**: API response compression
- **CDN**: Static asset delivery via CDN

## Real-time Features

### Live Data Synchronization
```typescript
// Stock updates across all devices
useEffect(() => {
  const subscription = supabase
    .channel(`stock_changes_${pharmacyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'stock',
      filter: `pharmacy_id=eq.${pharmacyId}`,
    }, (payload) => {
      // Update local state
      handleStockUpdate(payload);
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [pharmacyId]);
```

### Notification System
- **Low Stock Alerts**: Automated when stock falls below minimum
- **Expiry Warnings**: 30, 15, 7 days before expiration
- **Payment Reminders**: Due amount notifications
- **System Updates**: App updates and maintenance notifications

## API Endpoints

### RESTful API Structure
```
GET    /api/stock                    # Get all stock items
POST   /api/stock                    # Add new stock item
PUT    /api/stock/:id                # Update stock item
DELETE /api/stock/:id                # Remove stock item

GET    /api/invoices                 # Get all invoices
POST   /api/invoices                 # Create new invoice
PUT    /api/invoices/:id             # Update invoice
GET    /api/invoices/:id/pdf         # Generate invoice PDF

GET    /api/medicines/search         # Search medicines
GET    /api/dashboard/stats          # Dashboard statistics
POST   /api/reports/generate         # Generate reports
```

## Testing Strategy

### Unit Testing
- **Coverage**: 80%+ code coverage
- **Framework**: Jest + React Native Testing Library
- **Mocking**: Database and API mocking
- **Automation**: Automated test runs on commits

### Integration Testing
- **API Testing**: End-to-end API testing
- **Database Testing**: Transaction rollback testing
- **Real-time Testing**: WebSocket connection testing

### Performance Testing
- **Load Testing**: Concurrent user testing
- **Database Performance**: Query execution time monitoring
- **Mobile Performance**: Memory and CPU usage monitoring

## Deployment & DevOps

### Mobile App Deployment
- **Platform**: Expo Application Services (EAS)
- **Build Process**: Automated builds on Git push
- **Distribution**: Google Play Store, Apple App Store
- **OTA Updates**: Expo over-the-air updates for JS changes

### Backend Deployment
- **Hosting**: Supabase Cloud (managed)
- **Database**: PostgreSQL on AWS RDS
- **Monitoring**: Built-in Supabase monitoring
- **Backup**: Automated daily backups with point-in-time recovery

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
name: Build and Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      - run: npm run type-check
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: eas build --platform all
```

## Scalability Considerations

### Horizontal Scaling
- **Database**: Read replicas for query distribution
- **API**: Stateless design for easy scaling
- **File Storage**: CDN distribution for global access

### Vertical Scaling
- **Database**: Automatic resource scaling
- **Memory**: Efficient memory usage patterns
- **Processing**: Background job processing

### Growth Projections
- **Users**: Support for 100,000+ concurrent users
- **Data**: Petabyte-scale data storage capability
- **Transactions**: 1M+ transactions per day capacity

## Monitoring & Analytics

### Application Monitoring
- **Performance**: Response time, error rate tracking
- **Usage**: Feature usage analytics
- **Crashes**: Automated crash reporting
- **User Behavior**: In-app analytics

### Business Intelligence
- **Revenue Tracking**: Subscription revenue monitoring
- **Customer Metrics**: Churn rate, lifetime value
- **Product Metrics**: Feature adoption rates
- **Performance KPIs**: System uptime, response times

## Compliance & Standards

### Healthcare Compliance
- **Data Privacy**: GDPR-compliant data handling
- **Medical Data**: Secure handling of prescription data
- **Audit Trails**: Complete action logging
- **Regulatory**: Bangladesh pharmacy law compliance

### Technical Standards
- **Security**: ISO 27001 practices
- **Quality**: ISO 9001 development processes  
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Web vitals optimization

---

*This technical specification is a living document and will be updated as the system evolves.*