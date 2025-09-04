-- Smart Notification System Database Schema
-- This file contains all the tables needed for the notification system

-- Notification settings for each pharmacy
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    enabled_types JSONB NOT NULL DEFAULT '{
        "expiryAlerts": true,
        "lowStockAlerts": true,
        "customerReminders": true,
        "businessSummaries": true,
        "systemUpdates": true
    }',
    alert_timings JSONB NOT NULL DEFAULT '{
        "expiryDaysBefore": 30,
        "lowStockThreshold": 10,
        "businessSummaryTime": "09:00",
        "customerReminderDays": 7
    }',
    delivery_methods JSONB NOT NULL DEFAULT '{
        "pushNotifications": true,
        "smsNotifications": false,
        "emailNotifications": false
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pharmacy_id)
);

-- Notification schedule for automated checks
CREATE TABLE IF NOT EXISTS notification_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('expiry', 'stock', 'business_summary', 'customer_reminder')),
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pharmacy_id, type)
);

-- Log of all notifications sent
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    entity_id UUID, -- ID of the related entity (medicine, customer, etc.)
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'handled')),
    delivery_method VARCHAR(20) DEFAULT 'push' CHECK (delivery_method IN ('push', 'sms', 'email')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    handled_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer notification preferences
CREATE TABLE IF NOT EXISTS customer_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    reminder_preferences JSONB NOT NULL DEFAULT '{
        "enableReminders": true,
        "preferredMethod": "sms",
        "reminderDays": 7,
        "preferredTime": "10:00"
    }',
    contact_info JSONB DEFAULT '{
        "sms_number": null,
        "email": null,
        "whatsapp_number": null
    }',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, pharmacy_id)
);

-- Push notification tokens for devices
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    device_type VARCHAR(20) DEFAULT 'mobile' CHECK (device_type IN ('mobile', 'web')),
    device_info JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token)
);

-- Notification templates for customization
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    variables JSONB, -- Available variables for this template
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medicine expiry tracking for notifications
CREATE TABLE IF NOT EXISTS medicine_expiry_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    expiry_date DATE NOT NULL,
    alert_sent_at TIMESTAMP WITH TIME ZONE,
    days_before_alert INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'alerted', 'handled', 'expired')),
    batch_number VARCHAR(100),
    quantity_affected INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock level alerts tracking
CREATE TABLE IF NOT EXISTS stock_level_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    current_quantity INTEGER NOT NULL,
    minimum_threshold INTEGER NOT NULL,
    alert_sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'alerted', 'restocked', 'ignored')),
    reorder_quantity INTEGER,
    supplier_id UUID REFERENCES suppliers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_pharmacy_type ON notification_logs(pharmacy_id, type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_schedule_next_run ON notification_schedule(next_run) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_medicine_expiry_alerts_date ON medicine_expiry_alerts(expiry_date, status);
CREATE INDEX IF NOT EXISTS idx_stock_level_alerts_status ON stock_level_alerts(status, pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(pharmacy_id) WHERE is_active = true;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_schedule_updated_at 
    BEFORE UPDATE ON notification_schedule 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_notification_preferences_updated_at 
    BEFORE UPDATE ON customer_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medicine_expiry_alerts_updated_at 
    BEFORE UPDATE ON medicine_expiry_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_level_alerts_updated_at 
    BEFORE UPDATE ON stock_level_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_expiry_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_level_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_settings
CREATE POLICY "Pharmacy owners can manage their notification settings" ON notification_settings
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

-- RLS Policies for notification_logs
CREATE POLICY "Pharmacy owners can view their notification logs" ON notification_logs
    FOR SELECT USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

-- RLS Policies for other tables (similar pattern)
CREATE POLICY "Pharmacy owners can manage their notification schedule" ON notification_schedule
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

-- RLS Policies for other notification tables
CREATE POLICY "Pharmacy owners can manage customer notification preferences" ON customer_notification_preferences
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Pharmacy owners can manage push tokens" ON push_tokens
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Pharmacy owners can manage notification templates" ON notification_templates
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Pharmacy owners can manage medicine expiry alerts" ON medicine_expiry_alerts
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Pharmacy owners can manage stock level alerts" ON stock_level_alerts
    FOR ALL USING (
        pharmacy_id IN (
            SELECT id FROM pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

-- Insert default notification templates
INSERT INTO notification_templates (type, name, title_template, body_template, variables, is_default, is_active) VALUES
('expiry_alert', 'Medicine Expiry Alert', '⚠️ Medicine Expiry Alert', '{{medicine_name}} expires {{expiry_message}} ({{expiry_date}})', '{"medicine_name": "Medicine name", "expiry_date": "Expiry date", "expiry_message": "in X days or today"}', true, true),
('low_stock', 'Low Stock Alert', '📦 Low Stock Alert', '{{medicine_name}} is running low ({{current_stock}}/{{minimum_stock}} remaining)', '{"medicine_name": "Medicine name", "current_stock": "Current quantity", "minimum_stock": "Minimum threshold"}', true, true),
('customer_reminder', 'Customer Reminder', '👤 Customer Reminder', 'Time to contact {{customer_name}} about {{medicine_name}} refill', '{"customer_name": "Customer name", "medicine_name": "Medicine name"}', true, true),
('business_summary', 'Business Summary', '📊 Daily Business Summary', '{{period}}: ৳{{total_sales}} revenue, {{total_transactions}} transactions', '{"period": "Time period", "total_sales": "Total sales amount", "total_transactions": "Number of transactions"}', true, true),
('system_update', 'System Update', '🔔 MediStock Update', '{{update_message}}', '{"update_message": "Update message"}', true, true);

-- Grant necessary permissions
GRANT ALL ON notification_settings TO authenticated;
GRANT ALL ON notification_schedule TO authenticated;
GRANT ALL ON notification_logs TO authenticated;
GRANT ALL ON customer_notification_preferences TO authenticated;
GRANT ALL ON push_tokens TO authenticated;
GRANT ALL ON notification_templates TO authenticated;
GRANT ALL ON medicine_expiry_alerts TO authenticated;
GRANT ALL ON stock_level_alerts TO authenticated;