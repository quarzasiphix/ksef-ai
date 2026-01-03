-- ============================================================================
-- ENTITY LINKS SYSTEM
-- ============================================================================
-- Purpose: Polymorphic linking system for tracking business reasons and relationships
-- between entities (invoices, contracts, operations, vehicles, etc.)
--
-- Philosophy: "Everything financial must have a business reason"
-- - Invoices link to operations/jobs as primary business reason
-- - Contracts link to operations/vehicles/drivers for scope
-- - Ledger events link to operations for context
-- - Attachments already use polymorphic linking (attachments table)
--
-- This table enables:
-- 1. Audit trails: "Why does this invoice exist?" → linked to operation TR/01/26
-- 2. Cross-module navigation: From invoice → see related operation, contracts, attachments
-- 3. Validation rules: "Expense invoice must link to operation or be marked overhead"
-- 4. Cleanup queues: Show entities with missing required links
-- ============================================================================

-- ============================================================================
-- ENTITY LINKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  
  -- Source entity (the thing being linked FROM)
  from_entity_type TEXT NOT NULL,
  from_entity_id UUID NOT NULL,
  
  -- Target entity (the thing being linked TO)
  to_entity_type TEXT NOT NULL,
  to_entity_id UUID NOT NULL,
  
  -- Relationship semantics
  link_role TEXT NOT NULL,
  -- Roles:
  --   'primary_reason' - main business justification (invoice → operation)
  --   'executes' - contract executes this operation
  --   'relates_to' - generic relationship
  --   'covered_by' - entity is covered by target (operation → vehicle contract)
  --   'evidences' - document evidences this entity
  --   'overhead' - marks entity as overhead (no operation link)
  
  -- Optional metadata
  note TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT entity_links_valid_types CHECK (
    from_entity_type IN ('invoice', 'contract', 'ledger_event', 'expense', 'storage_file', 'decision', 'cash_transaction') AND
    to_entity_type IN ('operation', 'job', 'vehicle', 'driver', 'contract', 'decision', 'vendor', 'client', 'overhead_category')
  ),
  CONSTRAINT entity_links_valid_roles CHECK (
    link_role IN ('primary_reason', 'executes', 'relates_to', 'covered_by', 'evidences', 'overhead', 'supports')
  ),
  -- Prevent duplicate links
  CONSTRAINT entity_links_unique_link UNIQUE (from_entity_type, from_entity_id, to_entity_type, to_entity_id, link_role)
);

-- Indexes for performance
CREATE INDEX idx_entity_links_from ON public.entity_links(from_entity_type, from_entity_id);
CREATE INDEX idx_entity_links_to ON public.entity_links(to_entity_type, to_entity_id);
CREATE INDEX idx_entity_links_profile ON public.entity_links(business_profile_id);
CREATE INDEX idx_entity_links_department ON public.entity_links(department_id);
CREATE INDEX idx_entity_links_role ON public.entity_links(link_role);

-- Updated timestamp trigger
CREATE TRIGGER entity_links_updated_at
  BEFORE UPDATE ON public.entity_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entity links for their business profiles"
  ON public.entity_links FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM public.business_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create entity links for their business profiles"
  ON public.entity_links FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM public.business_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update entity links for their business profiles"
  ON public.entity_links FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM public.business_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete entity links for their business profiles"
  ON public.entity_links FOR DELETE
  USING (
    business_profile_id IN (
      SELECT id FROM public.business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Invoices with their primary business reason
CREATE OR REPLACE VIEW public.invoices_with_links AS
SELECT 
  i.*,
  el.to_entity_type AS linked_entity_type,
  el.to_entity_id AS linked_entity_id,
  el.link_role,
  el.note AS link_note
FROM public.invoices i
LEFT JOIN public.entity_links el ON (
  el.from_entity_type = 'invoice' AND
  el.from_entity_id = i.id AND
  el.link_role = 'primary_reason'
);

-- View: Contracts with their scope
CREATE OR REPLACE VIEW public.contracts_with_scope AS
SELECT 
  c.*,
  el.to_entity_type AS scope_type,
  el.to_entity_id AS scope_id,
  el.link_role,
  el.note AS scope_note
FROM public.contracts c
LEFT JOIN public.entity_links el ON (
  el.from_entity_type = 'contract' AND
  el.from_entity_id = c.id AND
  el.link_role IN ('executes', 'relates_to', 'covered_by')
);

-- View: Operations with linked invoices and contracts
CREATE OR REPLACE VIEW public.operations_with_links AS
SELECT 
  oj.*,
  json_agg(DISTINCT jsonb_build_object(
    'type', 'invoice',
    'id', inv_links.from_entity_id,
    'role', inv_links.link_role
  )) FILTER (WHERE inv_links.from_entity_id IS NOT NULL) AS linked_invoices,
  json_agg(DISTINCT jsonb_build_object(
    'type', 'contract',
    'id', contract_links.from_entity_id,
    'role', contract_links.link_role
  )) FILTER (WHERE contract_links.from_entity_id IS NOT NULL) AS linked_contracts
FROM public.operational_jobs oj
LEFT JOIN public.entity_links inv_links ON (
  inv_links.to_entity_type = 'operation' AND
  inv_links.to_entity_id = oj.id AND
  inv_links.from_entity_type = 'invoice'
)
LEFT JOIN public.entity_links contract_links ON (
  contract_links.to_entity_type = 'operation' AND
  contract_links.to_entity_id = oj.id AND
  contract_links.from_entity_type = 'contract'
)
GROUP BY oj.id;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Create entity link
CREATE OR REPLACE FUNCTION public.create_entity_link(
  p_business_profile_id UUID,
  p_department_id UUID,
  p_from_entity_type TEXT,
  p_from_entity_id UUID,
  p_to_entity_type TEXT,
  p_to_entity_id UUID,
  p_link_role TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  INSERT INTO public.entity_links (
    business_profile_id,
    department_id,
    from_entity_type,
    from_entity_id,
    to_entity_type,
    to_entity_id,
    link_role,
    note,
    created_by
  ) VALUES (
    p_business_profile_id,
    p_department_id,
    p_from_entity_type,
    p_from_entity_id,
    p_to_entity_type,
    p_to_entity_id,
    p_link_role,
    p_note,
    auth.uid()
  )
  ON CONFLICT (from_entity_type, from_entity_id, to_entity_type, to_entity_id, link_role)
  DO UPDATE SET
    note = EXCLUDED.note,
    updated_at = NOW()
  RETURNING id INTO v_link_id;
  
  RETURN v_link_id;
END;
$$;

-- Function: Get entity links (from perspective)
CREATE OR REPLACE FUNCTION public.get_entity_links_from(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  to_entity_type TEXT,
  to_entity_id UUID,
  link_role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.to_entity_type,
    el.to_entity_id,
    el.link_role,
    el.note,
    el.created_at
  FROM public.entity_links el
  WHERE el.from_entity_type = p_entity_type
    AND el.from_entity_id = p_entity_id
  ORDER BY el.created_at DESC;
END;
$$;

-- Function: Get entity links (to perspective)
CREATE OR REPLACE FUNCTION public.get_entity_links_to(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  from_entity_type TEXT,
  from_entity_id UUID,
  link_role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.from_entity_type,
    el.from_entity_id,
    el.link_role,
    el.note,
    el.created_at
  FROM public.entity_links el
  WHERE el.to_entity_type = p_entity_type
    AND el.to_entity_id = p_entity_id
  ORDER BY el.created_at DESC;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.entity_links IS 'Polymorphic linking system for tracking business reasons and relationships between entities';
COMMENT ON COLUMN public.entity_links.link_role IS 'Semantic role: primary_reason, executes, relates_to, covered_by, evidences, overhead, supports';
COMMENT ON COLUMN public.entity_links.from_entity_type IS 'Source entity type: invoice, contract, ledger_event, expense, storage_file, decision, cash_transaction';
COMMENT ON COLUMN public.entity_links.to_entity_type IS 'Target entity type: operation, job, vehicle, driver, contract, decision, vendor, client, overhead_category';
