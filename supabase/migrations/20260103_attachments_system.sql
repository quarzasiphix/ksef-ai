-- =====================================================
-- ATTACHMENTS SYSTEM
-- Universal file linking for decisions, ledger, contracts, operations, etc.
-- =====================================================

-- Create attachment role enum
CREATE TYPE attachment_role AS ENUM (
  -- Decision evidence roles
  'DECISION_DRAFT_PDF',
  'DECISION_SIGNED_PDF',
  'DECISION_SCAN',
  'DECISION_SUPPORTING_DOC',
  
  -- Ledger/accounting roles
  'PRIMARY',
  'SUPPORTING',
  'SCAN',
  'SIGNED',
  'COST_ESTIMATE',
  'CORRESPONDENCE',
  
  -- Contract roles
  'CONTRACT_DRAFT',
  'CONTRACT_SIGNED',
  'CONTRACT_AMENDMENT',
  'CONTRACT_ANNEX',
  
  -- Operation roles
  'ROUTE_SHEET',
  'DELIVERY_PROOF',
  'PHOTO',
  'CUSTOMER_CORRESPONDENCE',
  
  -- Capital roles
  'SHAREHOLDER_DECLARATION',
  'TRANSFER_CONFIRMATION',
  'NOTARY_DEED',
  
  -- Generic
  'OTHER'
);

-- Create attachments table (polymorphic linking)
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  
  -- Link to storage file
  storage_file_id UUID NOT NULL REFERENCES public.storage_files(id) ON DELETE CASCADE,
  
  -- Polymorphic entity reference
  entity_type TEXT NOT NULL, -- 'decision', 'ledger_event', 'contract', 'operation', 'capital_transaction', etc.
  entity_id UUID NOT NULL,
  
  -- Attachment metadata
  role attachment_role NOT NULL DEFAULT 'OTHER',
  note TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'decision',
    'ledger_event', 
    'contract',
    'operation',
    'capital_transaction',
    'invoice',
    'case',
    'document'
  ))
);

-- Indexes for performance
CREATE INDEX idx_attachments_business_profile ON public.attachments(business_profile_id);
CREATE INDEX idx_attachments_department ON public.attachments(department_id);
CREATE INDEX idx_attachments_storage_file ON public.attachments(storage_file_id);
CREATE INDEX idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_role ON public.attachments(role);

-- Composite index for common queries
CREATE INDEX idx_attachments_entity_lookup ON public.attachments(business_profile_id, entity_type, entity_id);

-- RLS Policies
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for their business profiles
CREATE POLICY "Users can view attachments for their business profiles"
  ON public.attachments
  FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM public.business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Users can create attachments for their business profiles
CREATE POLICY "Users can create attachments for their business profiles"
  ON public.attachments
  FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM public.business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Users can update attachments for their business profiles
CREATE POLICY "Users can update attachments for their business profiles"
  ON public.attachments
  FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM public.business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete attachments for their business profiles
CREATE POLICY "Users can delete attachments for their business profiles"
  ON public.attachments
  FOR DELETE
  USING (
    business_profile_id IN (
      SELECT id FROM public.business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_attachments_updated_at();

-- Helper view: Attachments with file details
CREATE OR REPLACE VIEW public.attachments_with_files AS
SELECT 
  a.*,
  sf.file_name,
  sf.storage_path,
  sf.file_size,
  sf.mime_type,
  sf.file_extension,
  sf.uploaded_at,
  d.name as department_name,
  d.color as department_color
FROM public.attachments a
JOIN public.storage_files sf ON a.storage_file_id = sf.id
LEFT JOIN public.departments d ON a.department_id = d.id;

-- Grant permissions
GRANT SELECT ON public.attachments_with_files TO authenticated;
