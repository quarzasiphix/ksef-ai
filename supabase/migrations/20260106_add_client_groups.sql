-- ============================================================================
-- Migration: Add Client Groups (Administrations/Portfolios)
-- Date: 2026-01-06
-- ============================================================================
-- Purpose: Group customers under parent entities (e.g., Domikom administration)
-- for cleaner invoice organization and scoped numbering sequences.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create client_groups table
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  
  -- Group type for filtering and logic
  type TEXT NOT NULL CHECK (type IN ('administration', 'direct_client', 'country', 'portfolio', 'other')),
  
  -- Invoice series configuration
  invoice_prefix TEXT, -- e.g., 'DOM', 'TOP', 'DE', 'NL'
  invoice_sequence_current INTEGER DEFAULT 0, -- Current sequence number per month
  invoice_sequence_month TEXT, -- Track which month the sequence is for (YYYY-MM format)
  
  -- Default settings for invoices in this group
  default_payment_terms INTEGER DEFAULT 14, -- days
  default_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique prefix per business profile
  UNIQUE(business_profile_id, invoice_prefix)
);

-- Add RLS policies
ALTER TABLE client_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own client groups"
  ON client_groups FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own client groups"
  ON client_groups FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own client groups"
  ON client_groups FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own client groups"
  ON client_groups FOR DELETE
  USING (user_id = auth.uid());

-- Add indexes
CREATE INDEX idx_client_groups_business_profile ON client_groups(business_profile_id);
CREATE INDEX idx_client_groups_user ON client_groups(user_id);
CREATE INDEX idx_client_groups_type ON client_groups(type);

-- Add comments
COMMENT ON TABLE client_groups IS 'Parent grouping entities for customers (e.g., real estate administrations, country portfolios)';
COMMENT ON COLUMN client_groups.type IS 'Type of group: administration (real estate), direct_client, country (DE/NL), portfolio, other';
COMMENT ON COLUMN client_groups.invoice_prefix IS 'Prefix for invoice numbering (e.g., DOM, TOP, DE, NL)';
COMMENT ON COLUMN client_groups.invoice_sequence_current IS 'Current sequence number for invoices in this group for the current month';
COMMENT ON COLUMN client_groups.invoice_sequence_month IS 'Month for which the current sequence applies (YYYY-MM)';

-- ============================================================================
-- STEP 2: Add client_group_id to customers table
-- ============================================================================
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS client_group_id UUID REFERENCES client_groups(id) ON DELETE SET NULL;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_customers_client_group ON customers(client_group_id);

-- Add comment
COMMENT ON COLUMN customers.client_group_id IS 'Optional parent group (administration/portfolio) this customer belongs to';

-- ============================================================================
-- STEP 3: Create function to get next invoice number for a group
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_invoice_number_for_group(
  p_client_group_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_current_sequence INTEGER;
  v_current_month TEXT;
  v_target_month TEXT;
  v_next_sequence INTEGER;
  v_invoice_number TEXT;
BEGIN
  -- Get group details
  SELECT invoice_prefix, invoice_sequence_current, invoice_sequence_month
  INTO v_prefix, v_current_sequence, v_current_month
  FROM client_groups
  WHERE id = p_client_group_id;
  
  -- If no prefix, return NULL (caller should handle)
  IF v_prefix IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Format target month as YYYY-MM
  v_target_month := p_year || '-' || LPAD(p_month::TEXT, 2, '0');
  
  -- Check if we need to reset sequence (new month)
  IF v_current_month IS NULL OR v_current_month != v_target_month THEN
    v_next_sequence := 1;
    
    -- Update the group with new month and reset sequence
    UPDATE client_groups
    SET invoice_sequence_current = v_next_sequence,
        invoice_sequence_month = v_target_month,
        updated_at = NOW()
    WHERE id = p_client_group_id;
  ELSE
    -- Increment sequence for same month
    v_next_sequence := v_current_sequence + 1;
    
    -- Update the group with incremented sequence
    UPDATE client_groups
    SET invoice_sequence_current = v_next_sequence,
        updated_at = NOW()
    WHERE id = p_client_group_id;
  END IF;
  
  -- Format invoice number: PREFIX/YYYY/MM/NNNN
  v_invoice_number := v_prefix || '/' || p_year || '/' || LPAD(p_month::TEXT, 2, '0') || '/' || LPAD(v_next_sequence::TEXT, 4, '0');
  
  RETURN v_invoice_number;
END;
$$;

COMMENT ON FUNCTION get_next_invoice_number_for_group IS 'Generate next invoice number for a client group with format: PREFIX/YYYY/MM/NNNN';

-- ============================================================================
-- STEP 4: Create some default groups for existing data (optional)
-- ============================================================================
-- This is a helper to create common groups - you can customize or skip this

-- Example: Create a "General" fallback group for each business profile
-- INSERT INTO client_groups (business_profile_id, user_id, name, type, invoice_prefix)
-- SELECT 
--   bp.id,
--   bp.user_id,
--   'Ogólne / General',
--   'other',
--   'GEN'
-- FROM business_profiles bp
-- WHERE NOT EXISTS (
--   SELECT 1 FROM client_groups cg 
--   WHERE cg.business_profile_id = bp.id AND cg.invoice_prefix = 'GEN'
-- );

-- ============================================================================
-- STEP 5: Add updated_at trigger for client_groups
-- ============================================================================
CREATE OR REPLACE FUNCTION update_client_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_groups_updated_at
  BEFORE UPDATE ON client_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_client_groups_updated_at();
