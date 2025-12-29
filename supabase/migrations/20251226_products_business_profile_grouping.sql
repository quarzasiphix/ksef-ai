-- Migration: Add business_profile_id to products for proper business grouping
-- Purpose: Allow products to be categorized by which business created them

-- Products table already has business_profile_id as optional
-- Make it more explicit and add index for grouping queries

-- Add index for efficient grouping by business profile
CREATE INDEX IF NOT EXISTS idx_products_business_profile_id ON products(business_profile_id);

-- Add index for combined filtering (user + business profile)
CREATE INDEX IF NOT EXISTS idx_products_user_business ON products(user_id, business_profile_id);

-- Update products to ensure they have business_profile_id set
-- This is a data migration for existing products without business_profile_id
UPDATE products
SET business_profile_id = (
  SELECT id FROM business_profiles 
  WHERE business_profiles.user_id = products.user_id 
  AND business_profiles.is_default = true
  LIMIT 1
)
WHERE business_profile_id IS NULL
  AND user_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN products.business_profile_id IS 'Links product to the business profile that created it. Used for grouping products by business.';

-- Similarly for customers table - ensure proper indexing
CREATE INDEX IF NOT EXISTS idx_customers_business_profile_id ON customers(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_business ON customers(user_id, business_profile_id);

COMMENT ON COLUMN customers.business_profile_id IS 'Links customer to a specific business profile. Used for grouping customers by business.';
