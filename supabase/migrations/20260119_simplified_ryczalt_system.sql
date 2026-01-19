-- Simplified ryczałt system: Users create accounts linked to global categories
-- This is much simpler than the previous category-based system

-- Drop the old complex system if it exists
DROP TABLE IF EXISTS ryczalt_accounts CASCADE;
DROP TABLE IF EXISTS ryczalt_revenue_categories CASCADE;

-- Create simplified global categories (system-wide, not per-profile)
CREATE TABLE ryczalt_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  description TEXT,
  pkd_codes TEXT[], -- Array of PKD codes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user's custom ryczał accounts
CREATE TABLE ryczalt_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  ryczalt_category_id UUID NOT NULL REFERENCES ryczalt_categories(id) ON DELETE RESTRICT,
  account_number VARCHAR(20) NOT NULL,
  account_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  current_balance NUMERIC(15,2) DEFAULT 0.00,
  period_balance NUMERIC(15,2) DEFAULT 0.00,
  year_balance NUMERIC(15,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique account numbers per business profile
  CONSTRAINT ryczalt_accounts_unique_number UNIQUE(business_profile_id, account_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ryczalt_categories_active ON ryczalt_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ryczalt_accounts_profile ON ryczalt_accounts(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_ryczalt_accounts_category ON ryczalt_accounts(ryczalt_category_id);
CREATE INDEX IF NOT EXISTS idx_ryczalt_accounts_active ON ryczalt_accounts(is_active) WHERE is_active = true;

-- Insert standard global ryczałt categories
INSERT INTO ryczalt_categories (id, name, rate, description, pkd_codes, is_active) VALUES
-- 3% rate
(gen_random_uuid(), 'Handel detaliczny i hurtowy', 3.00, 'Sprzedaż towarów i produktów', ARRAY['45', '46', '47'], true),
-- 5.5% rate
(gen_random_uuid(), 'Usługi gastronomiczne', 5.50, 'Restauracje, bary, catering', ARRAY['56'], true),
(gen_random_uuid(), 'Usługi budowlane', 5.50, 'Roboty budowlane, remontowe, wykończeniowe', ARRAY['41', '42', '43'], true),
(gen_random_uuid(), 'Usługi transportowe', 5.50, 'Transport towarów i osób', ARRAY['49', '50', '51'], true),
(gen_random_uuid(), 'Usługi medyczne', 5.50, 'Usługi medyczne, pielęgniarskie, fizjoterapia', ARRAY['86'], true),
(gen_random_uuid(), 'Usługi inne', 5.50, 'Pozostałe usługi', NULL, true),
-- 8.5% rate
(gen_random_uuid(), 'Usługi doradcze i konsultingowe', 8.50, 'Doradztwo biznesowe, konsulting, szkolenia', ARRAY['70', '85'], true),
(gen_random_uuid(), 'Usługi prawnicze i księgowe', 8.50, 'Usługi prawne, księgowe, audytorskie', ARRAY['69'], true),
(gen_random_uuid(), 'Usługi marketingowe i reklamowe', 8.50, 'Marketing, reklama, public relations', ARRAY['73'], true),
-- 12% rate
(gen_random_uuid(), 'Usługi IT i programowanie', 12.00, 'Działalność IT, programowanie, konsulting techniczny', ARRAY['62', '63'], true),
(gen_random_uuid(), 'Usługi projektowe i architektoniczne', 12.00, 'Projektowanie, architektura, inżynieria', ARRAY['71'], true),
-- 15% rate
(gen_random_uuid(), 'Wolne zawody', 15.00, 'Działalność lekarska, prawnicza, notarialna', ARRAY['86', '69'], true),
-- 17% rate
(gen_random_uuid(), 'Działalność artystyczna i rozrywkowa', 17.00, 'Działalność twórcza, artystyczna, rozrywkowa', ARRAY['90', '91', '93'], true);

-- Create view for easy querying
CREATE OR REPLACE VIEW ryczalt_accounts_view AS
SELECT 
  ra.id,
  ra.business_profile_id,
  ra.ryczalt_category_id,
  ra.account_number,
  ra.account_name,
  ra.description,
  ra.is_active,
  ra.current_balance,
  ra.period_balance,
  ra.year_balance,
  ra.created_at,
  ra.updated_at,
  rc.name as category_name,
  rc.rate as category_rate,
  rc.description as category_description,
  rc.pkd_codes,
  bp.name as business_profile_name
FROM ryczalt_accounts ra
LEFT JOIN ryczalt_categories rc ON ra.ryczalt_category_id = rc.id
LEFT JOIN business_profiles bp ON ra.business_profile_id = bp.id
WHERE ra.is_active = true;

-- Add helpful comments
COMMENT ON TABLE ryczalt_categories IS 'Global ryczałt categories with standard rates. These are system-wide and not per-profile.';
COMMENT ON TABLE ryczalt_accounts IS 'User-created ryczałt accounts linked to global categories. Each business profile can have custom accounts.';
COMMENT ON COLUMN ryczalt_accounts.account_number IS 'Account number (e.g., 701, 702) for the business profile';
COMMENT ON COLUMN ryczalt_accounts.ryczalt_category_id IS 'Link to global ryczałt category that determines the tax rate';
