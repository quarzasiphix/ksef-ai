-- Create ryczałt accounts table for JDG businesses
-- These are the actual accounting accounts that track income by ryczałt category

CREATE TABLE IF NOT EXISTS ryczalt_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  ryczalt_category_id UUID REFERENCES ryczalt_revenue_categories(id) ON DELETE SET NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name TEXT NOT NULL,
  account_type VARCHAR(50) DEFAULT 'ryczalt_revenue',
  account_class INTEGER DEFAULT 7, -- Revenue accounts
  parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  current_balance NUMERIC(15,2) DEFAULT 0.00,
  period_balance NUMERIC(15,2) DEFAULT 0.00,
  year_balance NUMERIC(15,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique account numbers per business profile
  CONSTRAINT ryczalt_accounts_unique_number UNIQUE(business_profile_id, account_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ryczalt_accounts_profile ON ryczalt_accounts(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_ryczalt_accounts_category ON ryczalt_accounts(ryczalt_category_id);
CREATE INDEX IF NOT EXISTS idx_ryczalt_accounts_active ON ryczalt_accounts(is_active) WHERE is_active = true;

-- Create function to automatically create ryczałt accounts for new JDG profiles
CREATE OR REPLACE FUNCTION create_default_ryczalt_accounts(p_business_profile_id UUID)
RETURNS VOID AS $$
DECLARE
  category_record RECORD;
  account_counter INTEGER := 700; -- Start from 700 for ryczałt accounts
BEGIN
  -- Only create for JDG profiles
  IF EXISTS (SELECT 1 FROM business_profiles WHERE id = p_business_profile_id AND entity_type = 'dzialalnosc') THEN
    
    -- Create an account for each default ryczałt category
    FOR category_record IN 
      SELECT id, name, rate 
      FROM ryczalt_revenue_categories 
      WHERE is_default = true 
      ORDER BY rate, name
    LOOP
      INSERT INTO ryczalt_accounts (
        business_profile_id,
        ryczalt_category_id,
        account_number,
        account_name,
        description
      ) VALUES (
        p_business_profile_id,
        category_record.id,
        '7' || LPAD((account_counter)::TEXT, 2, '0'), -- 700, 701, 702, etc.
        'Przychody - ' || category_record.name,
        'Ryczałtowe przychody z kategorii: ' || category_record.name || ' (' || category_record.rate || '%)'
      );
      
      account_counter := account_counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Created default ryczałt accounts for profile %', p_business_profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create ryczałt accounts when JDG profile is created
CREATE OR REPLACE FUNCTION trigger_create_ryczalt_accounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Create ryczałt accounts asynchronously (don't block profile creation)
  PERFORM pg_notify('create_ryczalt_accounts', NEW.id::TEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_create_ryczalt_accounts ON business_profiles;

-- Create trigger
CREATE TRIGGER auto_create_ryczalt_accounts
  AFTER INSERT ON business_profiles
  FOR EACH ROW
  WHEN (NEW.entity_type = 'dzialalnosc')
  EXECUTE FUNCTION trigger_create_ryczalt_accounts();

-- Add helpful comments
COMMENT ON TABLE ryczalt_accounts IS 'Ryczałt revenue accounts for JDG businesses. Each account tracks income for a specific ryczałt category.';
COMMENT ON COLUMN ryczalt_accounts.account_number IS 'Account number in format 7XX for ryczałt revenue accounts';
COMMENT ON COLUMN ryczalt_accounts.current_balance IS 'Current balance for this ryczałt account';
COMMENT ON COLUMN ryczalt_accounts.period_balance IS 'Balance for current accounting period';
COMMENT ON COLUMN ryczalt_accounts.year_balance IS 'Balance for current fiscal year';

-- Create view for easy querying of ryczał accounts with category info
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
  rc.name as category_name,
  rc.rate as category_rate,
  rc.description as category_description,
  ra.created_at,
  ra.updated_at
FROM ryczalt_accounts ra
LEFT JOIN ryczalt_revenue_categories rc ON ra.ryczalt_category_id = rc.id
WHERE ra.is_active = true;
