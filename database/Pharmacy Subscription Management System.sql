-- Subscription System Database Schema
-- Complete subscription management for MediStock BD

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    duration_months INTEGER NOT NULL,
    price_bdt DECIMAL(10,2) NOT NULL,
    features JSONB NOT NULL DEFAULT '{}',
    limitations JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pharmacy subscriptions
CREATE TABLE IF NOT EXISTS pharmacy_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'suspended')),
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pharmacy_id)
);

-- Payment gateways configuration
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('mobile_banking', 'card', 'bank_transfer')),
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription payments
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES pharmacy_subscriptions(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    gateway_id UUID NOT NULL REFERENCES payment_gateways(id),
    amount_bdt DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(255),
    gateway_transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    customer_phone VARCHAR(20),
    gateway_response JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pharmacy_id, feature_name, month_year)
);

-- Payment notifications/webhooks log
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gateway_name VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    payment_id UUID REFERENCES subscription_payments(id),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pharmacy_subscriptions_status ON pharmacy_subscriptions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_pharmacy_month ON feature_usage(pharmacy_id, month_year);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON payment_webhooks(processed, created_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_updated_at 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pharmacy_subscriptions_updated_at 
    BEFORE UPDATE ON pharmacy_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at 
    BEFORE UPDATE ON subscription_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_usage_updated_at 
    BEFORE UPDATE ON feature_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pharmacy owners
CREATE POLICY "Pharmacy owners can view their subscription" ON pharmacy_subscriptions
    FOR SELECT USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Pharmacy owners can view their payments" ON subscription_payments
    FOR SELECT USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Pharmacy owners can view their feature usage" ON feature_usage
    FOR SELECT USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

-- Public access to plans and gateways
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active payment gateways" ON payment_gateways
    FOR SELECT USING (is_active = true);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, duration_months, price_bdt, features, limitations) VALUES
('free_trial', 'Free Trial', 0, 0.00, '{
    "maxMedicines": 50,
    "maxCustomers": 25,
    "maxTransactions": 100,
    "reportingDays": 7,
    "notificationTypes": ["basic"],
    "supportLevel": "community"
}', '{
    "noAdvancedReports": true,
    "noInventoryAlerts": true,
    "noCustomerReminders": true,
    "noBulkOperations": true
}'),
('monthly', 'Monthly Plan', 1, 1500.00, '{
    "maxMedicines": 1000,
    "maxCustomers": 500,
    "maxTransactions": 2000,
    "reportingDays": 30,
    "notificationTypes": ["all"],
    "supportLevel": "email",
    "advancedReports": true,
    "inventoryAlerts": true,
    "customerReminders": true,
    "bulkOperations": true
}', '{}'),
('quarterly', 'Quarterly Plan', 3, 3499.00, '{
    "maxMedicines": 2000,
    "maxCustomers": 1000,
    "maxTransactions": 6000,
    "reportingDays": 90,
    "notificationTypes": ["all"],
    "supportLevel": "priority",
    "advancedReports": true,
    "inventoryAlerts": true,
    "customerReminders": true,
    "bulkOperations": true,
    "prioritySupport": true
}', '{}'),
('yearly', 'Yearly Plan', 12, 10000.00, '{
    "maxMedicines": 5000,
    "maxCustomers": 2500,
    "maxTransactions": 25000,
    "reportingDays": 365,
    "notificationTypes": ["all"],
    "supportLevel": "phone",
    "advancedReports": true,
    "inventoryAlerts": true,
    "customerReminders": true,
    "bulkOperations": true,
    "prioritySupport": true,
    "phoneSupport": true,
    "customReports": true
}', '{}');

-- Insert payment gateways
INSERT INTO payment_gateways (name, display_name, type, config) VALUES
('bkash', 'bKash', 'mobile_banking', '{
    "logo": "/assets/bkash-logo.png",
    "color": "#e2136e",
    "sandbox": true,
    "apiUrl": "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
    "instructions": "Pay using your bKash mobile wallet"
}'),
('nagad', 'Nagad', 'mobile_banking', '{
    "logo": "/assets/nagad-logo.png", 
    "color": "#ec7e18",
    "sandbox": true,
    "apiUrl": "https://api.mynagad.com/api/dfs",
    "instructions": "Pay using your Nagad mobile wallet"
}');

-- Grant permissions
GRANT ALL ON subscription_plans TO authenticated;
GRANT ALL ON pharmacy_subscriptions TO authenticated;
GRANT ALL ON payment_gateways TO authenticated;
GRANT ALL ON subscription_payments TO authenticated;
GRANT ALL ON feature_usage TO authenticated;
GRANT ALL ON payment_webhooks TO authenticated;

-- Functions for subscription management
CREATE OR REPLACE FUNCTION get_pharmacy_subscription_status(pharmacy_id_param UUID)
RETURNS TABLE (
    status VARCHAR,
    plan_name VARCHAR,
    expires_at TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER,
    features JSONB,
    limitations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.status,
        sp.display_name as plan_name,
        ps.expires_at,
        CASE 
            WHEN ps.expires_at > NOW() THEN 
                EXTRACT(DAY FROM ps.expires_at - NOW())::INTEGER
            ELSE 0
        END as days_remaining,
        sp.features,
        sp.limitations
    FROM pharmacy_subscriptions ps
    JOIN subscription_plans sp ON ps.plan_id = sp.id
    WHERE ps.pharmacy_id = pharmacy_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_feature_limit(
    pharmacy_id_param UUID,
    feature_name_param VARCHAR,
    current_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_features JSONB;
    feature_limit INTEGER;
    current_usage INTEGER;
BEGIN
    -- Get current subscription features
    SELECT sp.features INTO subscription_features
    FROM pharmacy_subscriptions ps
    JOIN subscription_plans sp ON ps.plan_id = sp.id
    WHERE ps.pharmacy_id = pharmacy_id_param 
    AND ps.status = 'active'
    AND ps.expires_at > NOW();
    
    IF subscription_features IS NULL THEN
        RETURN FALSE; -- No active subscription
    END IF;
    
    -- Get feature limit
    feature_limit := (subscription_features ->> ('max' || feature_name_param))::INTEGER;
    
    IF feature_limit IS NULL THEN
        RETURN TRUE; -- No limit defined
    END IF;
    
    -- Get current usage for this month
    SELECT COALESCE(usage_count, 0) INTO current_usage
    FROM feature_usage
    WHERE pharmacy_id = pharmacy_id_param
    AND feature_name = feature_name_param
    AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
    
    RETURN (current_usage + current_count) <= feature_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;