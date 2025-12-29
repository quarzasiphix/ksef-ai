-- Migration: Add accounting-grade semantic fields to products table
-- Purpose: Transform products from catalog items to accounting rule templates

-- Add new columns for accounting semantics
ALTER TABLE products
ADD COLUMN IF NOT EXISTS accounting_behavior TEXT CHECK (accounting_behavior IN ('przychod_operacyjny', 'pozostale_przychody', 'koszt_operacyjny', 'srodek_trwaly')) DEFAULT 'przychod_operacyjny',
ADD COLUMN IF NOT EXISTS vat_behavior TEXT CHECK (vat_behavior IN ('23', '8', '5', '0', 'zw', 'np', 'ue')) DEFAULT '23',
ADD COLUMN IF NOT EXISTS unit_behavior TEXT DEFAULT 'szt.',
ADD COLUMN IF NOT EXISTS price_editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS vat_overridable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lifecycle_state TEXT CHECK (lifecycle_state IN ('active', 'hidden', 'archived')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS product_category TEXT CHECK (product_category IN ('service', 'good', 'asset')) DEFAULT 'service',
ADD COLUMN IF NOT EXISTS inventory_managed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for faster filtering by lifecycle state
CREATE INDEX IF NOT EXISTS idx_products_lifecycle_state ON products(lifecycle_state);

-- Create index for usage-based sorting
CREATE INDEX IF NOT EXISTS idx_products_usage ON products(usage_count DESC, last_used_at DESC);

-- Create index for filtering by accounting behavior
CREATE INDEX IF NOT EXISTS idx_products_accounting_behavior ON products(accounting_behavior);

-- Migrate existing data: map product_type to accounting_behavior
UPDATE products
SET accounting_behavior = CASE
  WHEN product_type = 'income' THEN 'przychod_operacyjny'
  WHEN product_type = 'expense' THEN 'koszt_operacyjny'
  ELSE 'przychod_operacyjny'
END
WHERE accounting_behavior IS NULL OR accounting_behavior = 'przychod_operacyjny';

-- Migrate existing VAT rates to vat_behavior
UPDATE products
SET vat_behavior = CASE
  WHEN vat_rate = 23 THEN '23'
  WHEN vat_rate = 8 THEN '8'
  WHEN vat_rate = 5 THEN '5'
  WHEN vat_rate = 0 THEN '0'
  WHEN vat_rate = -1 THEN 'zw'
  ELSE '23'
END;

-- Migrate existing units to unit_behavior
UPDATE products
SET unit_behavior = COALESCE(unit, 'szt.');

-- Set all existing products to active state
UPDATE products
SET lifecycle_state = 'active'
WHERE lifecycle_state IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.accounting_behavior IS 'Accounting classification: przychod_operacyjny (operational revenue), pozostale_przychody (other revenue), koszt_operacyjny (operational cost), srodek_trwaly (fixed asset)';
COMMENT ON COLUMN products.vat_behavior IS 'VAT rate behavior: 23%, 8%, 5%, 0%, zw (exempt), np (not applicable), ue (EU)';
COMMENT ON COLUMN products.unit_behavior IS 'Unit of measurement: szt. (pieces), godz. (hours), km (kilometers), ryczalt (lump sum), etc.';
COMMENT ON COLUMN products.price_editable IS 'Whether price can be edited when adding to documents';
COMMENT ON COLUMN products.vat_overridable IS 'Whether VAT rate can be manually overridden on documents';
COMMENT ON COLUMN products.lifecycle_state IS 'Product lifecycle: active (available), hidden (not shown in new docs), archived (historical only)';
COMMENT ON COLUMN products.usage_count IS 'Number of times product has been used in documents';
COMMENT ON COLUMN products.last_used_at IS 'Timestamp of last usage in a document';
COMMENT ON COLUMN products.product_category IS 'Product category: service, good (physical), asset (fixed asset)';
COMMENT ON COLUMN products.inventory_managed IS 'Whether this product has inventory tracking enabled';

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_product_usage(product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW()
  WHERE id = product_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_product_usage(UUID) TO authenticated;

COMMENT ON FUNCTION increment_product_usage IS 'Increments usage count and updates last_used_at timestamp when product is added to a document';
