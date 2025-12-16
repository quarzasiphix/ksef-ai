-- Stripe Connect Payment System Migration
-- This migration adds support for merchants to accept payments via Stripe Connect

-- 1. Add Stripe Connect fields to business_profiles table
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_started' CHECK (stripe_connect_status IN ('not_started', 'pending', 'enabled')),
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_default_currency TEXT DEFAULT 'pln',
ADD COLUMN IF NOT EXISTS stripe_country TEXT DEFAULT 'PL',
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_stripe_account ON business_profiles(stripe_connect_account_id);

-- 2. Add payment fields to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payments_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS amount_gross_minor INTEGER, -- Amount in minor units (grosze for PLN)
ADD COLUMN IF NOT EXISTS payment_method_type TEXT; -- 'stripe', 'bank_transfer', 'cash', etc.

-- Create indexes for payment lookups
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session ON invoices(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent ON invoices(stripe_payment_intent_id);

-- 3. Create invoice_payments table for detailed payment tracking
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Payment provider details
    provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'manual', 'bank_transfer')),
    provider_payment_id TEXT, -- Stripe payment_intent_id or similar
    provider_checkout_id TEXT, -- Stripe checkout_session_id or similar
    provider_event_id TEXT UNIQUE, -- For idempotency (webhook event ID)
    
    -- Payment amounts (in minor units - grosze)
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'pln',
    
    -- Payment status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'cancelled')),
    
    -- Metadata
    metadata JSONB,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    succeeded_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ
);

-- Create indexes for invoice_payments
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_business_profile ON invoice_payments(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_user ON invoice_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_provider_event ON invoice_payments(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_status ON invoice_payments(status);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_created ON invoice_payments(created_at DESC);

-- 4. Create function to update invoice payment status
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a payment succeeds, update the invoice
    IF NEW.status = 'succeeded' AND (OLD.status IS NULL OR OLD.status != 'succeeded') THEN
        UPDATE invoices
        SET 
            payment_status = 'paid',
            paid_at = NEW.succeeded_at,
            is_paid = TRUE,
            stripe_payment_intent_id = NEW.provider_payment_id,
            stripe_checkout_session_id = NEW.provider_checkout_id,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    
    -- When a payment fails
    IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
        UPDATE invoices
        SET 
            payment_status = 'failed',
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    
    -- When a payment is refunded
    IF NEW.status = 'refunded' AND (OLD.status IS NULL OR OLD.status != 'refunded') THEN
        UPDATE invoices
        SET 
            payment_status = 'refunded',
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_invoice_payment_status ON invoice_payments;
CREATE TRIGGER trigger_update_invoice_payment_status
    AFTER INSERT OR UPDATE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- 5. Add RLS policies for invoice_payments
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment records
CREATE POLICY "Users can view own invoice payments"
    ON invoice_payments FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert payment records (via backend functions)
CREATE POLICY "Users can insert invoice payments"
    ON invoice_payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access to invoice payments"
    ON invoice_payments FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- 6. Create function to calculate amount in minor units
CREATE OR REPLACE FUNCTION calculate_invoice_amount_minor(invoice_id UUID)
RETURNS INTEGER AS $$
DECLARE
    gross_value NUMERIC;
    currency_code TEXT;
    minor_units INTEGER;
BEGIN
    SELECT total_gross_value, COALESCE(currency, 'PLN')
    INTO gross_value, currency_code
    FROM invoices
    WHERE id = invoice_id;
    
    -- Most currencies use 2 decimal places (100 minor units = 1 major unit)
    -- Some exceptions exist but PLN, EUR, USD all use 2
    minor_units := ROUND(gross_value * 100);
    
    RETURN minor_units;
END;
$$ LANGUAGE plpgsql;

-- 7. Update existing invoices to populate amount_gross_minor
UPDATE invoices
SET amount_gross_minor = ROUND(total_gross_value * 100)
WHERE amount_gross_minor IS NULL;

-- 8. Create view for payment analytics
CREATE OR REPLACE VIEW invoice_payment_analytics AS
SELECT 
    bp.id as business_profile_id,
    bp.name as business_name,
    COUNT(DISTINCT ip.id) as total_payments,
    COUNT(DISTINCT CASE WHEN ip.status = 'succeeded' THEN ip.id END) as successful_payments,
    SUM(CASE WHEN ip.status = 'succeeded' THEN ip.amount_minor ELSE 0 END) as total_revenue_minor,
    AVG(CASE WHEN ip.status = 'succeeded' THEN ip.amount_minor END) as avg_payment_minor,
    COUNT(DISTINCT ip.invoice_id) as invoices_with_payments,
    MAX(ip.succeeded_at) as last_payment_at
FROM business_profiles bp
LEFT JOIN invoice_payments ip ON bp.id = ip.business_profile_id
GROUP BY bp.id, bp.name;

-- 9. Add comment documentation
COMMENT ON COLUMN business_profiles.stripe_connect_account_id IS 'Stripe Connect account ID (acct_*)';
COMMENT ON COLUMN business_profiles.stripe_connect_status IS 'Onboarding status: not_started, pending, or enabled';
COMMENT ON COLUMN business_profiles.stripe_charges_enabled IS 'Whether the account can accept charges';
COMMENT ON COLUMN business_profiles.stripe_payouts_enabled IS 'Whether the account can receive payouts';

COMMENT ON COLUMN invoices.payments_enabled IS 'Whether online payments are enabled for this invoice';
COMMENT ON COLUMN invoices.payment_status IS 'Current payment status: unpaid, pending, paid, failed, or refunded';
COMMENT ON COLUMN invoices.amount_gross_minor IS 'Total gross amount in minor currency units (grosze for PLN)';

COMMENT ON TABLE invoice_payments IS 'Detailed payment transaction records for invoices';
COMMENT ON COLUMN invoice_payments.provider_event_id IS 'Unique event ID from payment provider for idempotency';

-- 10. Grant necessary permissions
GRANT SELECT ON invoice_payment_analytics TO authenticated;
GRANT ALL ON invoice_payments TO authenticated;
