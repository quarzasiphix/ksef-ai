-- Add VAT exemption threshold tracking fields to business_profiles
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS vat_threshold_pln NUMERIC DEFAULT 200000,
ADD COLUMN IF NOT EXISTS vat_threshold_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Add comment explaining the fields
COMMENT ON COLUMN business_profiles.vat_threshold_pln IS 'Annual VAT exemption threshold in PLN (default 200,000 for art. 113)';
COMMENT ON COLUMN business_profiles.vat_threshold_year IS 'Year for which the threshold is being tracked';
