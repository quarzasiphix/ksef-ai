-- Add business_profile_id column to ryczalt_revenue_categories table
-- This allows categories to be either global (NULL) or profile-specific

ALTER TABLE ryczalt_revenue_categories 
ADD COLUMN business_profile_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ryczalt_categories_business_profile 
ON ryczalt_revenue_categories(business_profile_id);

-- Update existing categories to be global (NULL business_profile_id)
UPDATE ryczalt_revenue_categories 
SET business_profile_id = NULL 
WHERE business_profile_id IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN ryczalt_revenue_categories.business_profile_id IS 
'NULL for global system categories, UUID for profile-specific custom categories';

-- Update the view to include business_profile_id
DROP VIEW IF EXISTS ryczalt_categories_view;

CREATE OR REPLACE VIEW ryczalt_categories_view AS
SELECT 
  rc.id,
  rc.name,
  rc.rate,
  rc.description,
  rc.pkwiu_hint,
  rc.pkd_hint,
  rc.is_default,
  rc.is_active,
  rc.business_profile_id,
  rc.created_at,
  rc.updated_at,
  bp.name as business_profile_name
FROM ryczalt_revenue_categories rc
LEFT JOIN business_profiles bp ON rc.business_profile_id = bp.id
WHERE rc.is_active = true;
