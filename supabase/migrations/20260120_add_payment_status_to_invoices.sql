-- Add payment_status column to invoices table
-- This is CRITICAL to separate payment state from accounting state

-- Add payment_status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'unpaid' 
      CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'overdue'));
  END IF;
END $$;

-- Add payment_date column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_date DATE;
  END IF;
END $$;

-- Add partial_payment_amount column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'partial_payment_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN partial_payment_amount DECIMAL(15,2);
  END IF;
END $$;

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status 
  ON invoices(payment_status);

-- Create index for paid but unposted queries (critical for unaccounted queue)
CREATE INDEX IF NOT EXISTS idx_invoices_paid_unposted 
  ON invoices(business_profile_id, payment_status, accounting_status)
  WHERE payment_status = 'paid' AND accounting_status = 'unposted';

-- Function to automatically update payment_status based on payment_date
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_date is set and matches total, mark as paid
  IF NEW.payment_date IS NOT NULL AND NEW.partial_payment_amount IS NULL THEN
    NEW.payment_status := 'paid';
  -- If partial payment
  ELSIF NEW.partial_payment_amount IS NOT NULL AND NEW.partial_payment_amount > 0 THEN
    NEW.payment_status := 'partial';
  -- If overdue (due_date passed and not paid)
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.payment_status = 'unpaid' THEN
    NEW.payment_status := 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update payment status
DROP TRIGGER IF EXISTS trigger_update_payment_status ON invoices;
CREATE TRIGGER trigger_update_payment_status
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();

-- Migrate existing data: if payment_date exists, mark as paid
UPDATE invoices 
SET payment_status = 'paid' 
WHERE payment_date IS NOT NULL 
  AND payment_status = 'unpaid';

-- Mark overdue invoices
UPDATE invoices 
SET payment_status = 'overdue' 
WHERE due_date < CURRENT_DATE 
  AND payment_status = 'unpaid'
  AND payment_date IS NULL;

COMMENT ON COLUMN invoices.payment_status IS 'Payment state (independent from accounting_status)';
COMMENT ON COLUMN invoices.payment_date IS 'Date when invoice was paid';
COMMENT ON COLUMN invoices.partial_payment_amount IS 'Amount paid if partial payment';
