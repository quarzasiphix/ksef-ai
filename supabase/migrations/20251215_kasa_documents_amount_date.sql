-- Add required amount/date fields to kasa_documents for Kasa UI compatibility

ALTER TABLE IF EXISTS kasa_documents
  ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2);

ALTER TABLE IF EXISTS kasa_documents
  ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE IF EXISTS kasa_documents
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'PLN';

-- Backfill currency/payment_date if needed (best-effort)
UPDATE kasa_documents
SET currency = COALESCE(currency, 'PLN')
WHERE currency IS NULL;
