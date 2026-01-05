-- ============================================
-- EVENT CHAINS SYSTEM
-- ============================================
-- Implements "Łańcuch zdarzeń" (Event Chains) as the primary unit of verification
-- A chain represents one business object lifecycle (invoice, payment, reconciliation, etc.)
-- Events are audit trail items that belong to chains

-- ============================================
-- 1. CHAINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  
  -- Chain identification
  chain_type TEXT NOT NULL, -- 'invoice', 'cash_payment', 'bank_transaction', 'reconciliation', 'contract', 'decision'
  chain_number TEXT, -- Human-readable identifier (e.g., "INV-2026-001", "CASH-KP-2026-004")
  
  -- Primary object reference
  primary_object_type TEXT NOT NULL, -- 'invoice', 'cash_entry', 'bank_tx', 'contract', etc.
  primary_object_id UUID NOT NULL,
  primary_object_version_id UUID, -- For versioned objects
  
  -- Chain state machine
  state TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'issued', 'paid', 'posted', 'closed', 'cancelled'
  state_updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Verification & workflow
  requires_verification BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  
  -- Required actions (derived from business rules)
  required_actions JSONB DEFAULT '[]'::JSONB, -- ['approve_payment', 'attach_proof', 'set_accounts']
  blockers JSONB DEFAULT '[]'::JSONB, -- ['missing_ksef_ref', 'missing_debit_account']
  
  -- Financial summary (denormalized for quick access)
  total_amount DECIMAL(15,2),
  currency TEXT DEFAULT 'PLN',
  paid_amount DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2),
  
  -- Metadata
  title TEXT NOT NULL, -- "F/004 – Invoice lifecycle"
  description TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  
  -- Indexes for common queries
  CONSTRAINT chains_unique_primary_object UNIQUE (primary_object_type, primary_object_id)
);

CREATE INDEX idx_chains_business_profile ON public.chains(business_profile_id);
CREATE INDEX idx_chains_type ON public.chains(chain_type);
CREATE INDEX idx_chains_state ON public.chains(state);
CREATE INDEX idx_chains_requires_verification ON public.chains(requires_verification) WHERE requires_verification = TRUE;
CREATE INDEX idx_chains_primary_object ON public.chains(primary_object_type, primary_object_id);

COMMENT ON TABLE public.chains IS 'Event chains - primary unit of verification. Each chain represents one business object lifecycle.';
COMMENT ON COLUMN public.chains.chain_type IS 'Type of business process: invoice, cash_payment, bank_transaction, reconciliation, contract, decision';
COMMENT ON COLUMN public.chains.state IS 'Current state in the lifecycle state machine';
COMMENT ON COLUMN public.chains.required_actions IS 'Array of action codes that must be completed to advance the chain';
COMMENT ON COLUMN public.chains.blockers IS 'Array of blocker codes preventing chain progression';

-- ============================================
-- 2. CHAIN_OBJECTS (Many-to-Many relationship)
-- ============================================
CREATE TABLE IF NOT EXISTS public.chain_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES public.chains(id) ON DELETE CASCADE,
  
  -- Object reference
  object_type TEXT NOT NULL, -- 'invoice', 'cash_entry', 'bank_tx', 'document', 'posting'
  object_id UUID NOT NULL,
  object_version_id UUID, -- For versioned objects
  
  -- Relationship metadata
  role TEXT NOT NULL, -- 'primary', 'settlement', 'evidence', 'related', 'correction'
  link_type TEXT, -- 'settles', 'corrects', 'supports', 'references'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT chain_objects_unique_object UNIQUE (chain_id, object_type, object_id)
);

CREATE INDEX idx_chain_objects_chain ON public.chain_objects(chain_id);
CREATE INDEX idx_chain_objects_object ON public.chain_objects(object_type, object_id);
CREATE INDEX idx_chain_objects_role ON public.chain_objects(role);

COMMENT ON TABLE public.chain_objects IS 'Links objects to chains. Allows grouping multiple objects (invoice + payments + documents) into one chain.';
COMMENT ON COLUMN public.chain_objects.role IS 'primary = main object, settlement = payment, evidence = document, related = linked object';

-- ============================================
-- 3. CHAIN_LINKS (Chain-to-Chain relationships)
-- ============================================
CREATE TABLE IF NOT EXISTS public.chain_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_chain_id UUID NOT NULL REFERENCES public.chains(id) ON DELETE CASCADE,
  to_chain_id UUID NOT NULL REFERENCES public.chains(id) ON DELETE CASCADE,
  
  -- Link semantics
  link_type TEXT NOT NULL, -- 'settles', 'corrects', 'references', 'depends_on'
  
  -- Optional amount for settlement links
  amount DECIMAL(15,2),
  currency TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chain_links_no_self_reference CHECK (from_chain_id != to_chain_id),
  CONSTRAINT chain_links_unique_link UNIQUE (from_chain_id, to_chain_id, link_type)
);

CREATE INDEX idx_chain_links_from ON public.chain_links(from_chain_id);
CREATE INDEX idx_chain_links_to ON public.chain_links(to_chain_id);
CREATE INDEX idx_chain_links_type ON public.chain_links(link_type);

COMMENT ON TABLE public.chain_links IS 'Cross-chain relationships. E.g., cash payment chain "settles" invoice chain.';

-- ============================================
-- 4. INVOICE_VERSIONS (Versioning for edits)
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  
  -- Snapshot of invoice state
  snapshot_json JSONB NOT NULL, -- Full invoice data at this version
  
  -- Change tracking
  changed_fields TEXT[], -- ['amount', 'customer_id', 'items']
  change_reason TEXT,
  change_summary TEXT, -- "Changed amount from 1000 to 1200"
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT invoice_versions_unique_version UNIQUE (invoice_id, version_no)
);

CREATE INDEX idx_invoice_versions_invoice ON public.invoice_versions(invoice_id);
CREATE INDEX idx_invoice_versions_created_at ON public.invoice_versions(created_at DESC);

COMMENT ON TABLE public.invoice_versions IS 'Version history for invoices. Each edit creates a new version for audit trail.';

-- ============================================
-- 5. UPDATE EVENTS TABLE
-- ============================================
-- Add new columns to existing events table
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS chain_id UUID REFERENCES public.chains(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS object_type TEXT,
  ADD COLUMN IF NOT EXISTS object_id UUID,
  ADD COLUMN IF NOT EXISTS object_version_id UUID,
  ADD COLUMN IF NOT EXISTS causation_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_events_chain ON public.events(chain_id);
CREATE INDEX IF NOT EXISTS idx_events_object ON public.events(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_events_causation ON public.events(causation_event_id);

COMMENT ON COLUMN public.events.chain_id IS 'Every event belongs to exactly one chain';
COMMENT ON COLUMN public.events.object_type IS 'Type of object this event is about (invoice, cash_entry, etc.)';
COMMENT ON COLUMN public.events.object_id IS 'ID of the object this event is about';
COMMENT ON COLUMN public.events.object_version_id IS 'For versioned objects, which version this event relates to';
COMMENT ON COLUMN public.events.causation_event_id IS 'Parent event that caused this event (for timeline hierarchy)';

-- ============================================
-- 6. ADD primary_chain_id TO OBJECTS
-- ============================================
-- Add primary_chain_id to invoices
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS primary_chain_id UUID REFERENCES public.chains(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_primary_chain ON public.invoices(primary_chain_id);

COMMENT ON COLUMN public.invoices.primary_chain_id IS 'The primary chain this invoice belongs to (for traceability)';

-- Add primary_chain_id to cash_transactions (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_transactions') THEN
    ALTER TABLE public.cash_transactions 
      ADD COLUMN IF NOT EXISTS primary_chain_id UUID REFERENCES public.chains(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_cash_transactions_primary_chain ON public.cash_transactions(primary_chain_id);
  END IF;
END $$;

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function: Create a new chain
CREATE OR REPLACE FUNCTION create_chain(
  p_business_profile_id UUID,
  p_chain_type TEXT,
  p_primary_object_type TEXT,
  p_primary_object_id UUID,
  p_title TEXT,
  p_initial_state TEXT DEFAULT 'draft',
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_chain_id UUID;
  v_chain_number TEXT;
BEGIN
  -- Generate chain number based on type
  v_chain_number := p_chain_type || '-' || to_char(NOW(), 'YYYY-MM') || '-' || lpad(nextval('events_event_number_seq')::TEXT, 4, '0');
  
  -- Create chain
  INSERT INTO chains (
    business_profile_id,
    chain_type,
    chain_number,
    primary_object_type,
    primary_object_id,
    state,
    title,
    metadata
  ) VALUES (
    p_business_profile_id,
    p_chain_type,
    v_chain_number,
    p_primary_object_type,
    p_primary_object_id,
    p_initial_state,
    p_title,
    p_metadata
  )
  RETURNING id INTO v_chain_id;
  
  -- Add primary object to chain_objects
  INSERT INTO chain_objects (
    chain_id,
    object_type,
    object_id,
    role
  ) VALUES (
    v_chain_id,
    p_primary_object_type,
    p_primary_object_id,
    'primary'
  );
  
  RETURN v_chain_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_chain IS 'Create a new event chain for a business object';

-- Function: Add object to chain
CREATE OR REPLACE FUNCTION add_object_to_chain(
  p_chain_id UUID,
  p_object_type TEXT,
  p_object_id UUID,
  p_role TEXT,
  p_link_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO chain_objects (
    chain_id,
    object_type,
    object_id,
    role,
    link_type
  ) VALUES (
    p_chain_id,
    p_object_type,
    p_object_id,
    p_role,
    p_link_type
  )
  ON CONFLICT (chain_id, object_type, object_id) DO NOTHING
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_object_to_chain IS 'Add an object to an existing chain (e.g., attach payment to invoice chain)';

-- Function: Link two chains
CREATE OR REPLACE FUNCTION link_chains(
  p_from_chain_id UUID,
  p_to_chain_id UUID,
  p_link_type TEXT,
  p_amount DECIMAL DEFAULT NULL,
  p_currency TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO chain_links (
    from_chain_id,
    to_chain_id,
    link_type,
    amount,
    currency
  ) VALUES (
    p_from_chain_id,
    p_to_chain_id,
    p_link_type,
    p_amount,
    p_currency
  )
  ON CONFLICT (from_chain_id, to_chain_id, link_type) DO NOTHING
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_chains IS 'Create a relationship between two chains (e.g., payment settles invoice)';

-- Function: Update chain state
CREATE OR REPLACE FUNCTION update_chain_state(
  p_chain_id UUID,
  p_new_state TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE chains
  SET 
    state = p_new_state,
    state_updated_at = NOW(),
    metadata = CASE 
      WHEN p_metadata IS NOT NULL THEN metadata || p_metadata
      ELSE metadata
    END,
    updated_at = NOW()
  WHERE id = p_chain_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_chain_state IS 'Update the state of a chain in its lifecycle';

-- Function: Get chain timeline (all events for a chain)
CREATE OR REPLACE FUNCTION get_chain_timeline(p_chain_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  action_summary TEXT,
  occurred_at TIMESTAMPTZ,
  actor_name TEXT,
  object_type TEXT,
  object_id UUID,
  causation_event_id UUID,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.event_type,
    e.action_summary,
    e.occurred_at,
    e.actor_name,
    e.object_type,
    e.object_id,
    e.causation_event_id,
    e.metadata
  FROM events e
  WHERE e.chain_id = p_chain_id
  ORDER BY e.occurred_at ASC, e.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_chain_timeline IS 'Get all events for a chain in chronological order (timeline view)';

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Trigger: Update chain updated_at on event creation
CREATE OR REPLACE FUNCTION update_chain_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chain_id IS NOT NULL THEN
    UPDATE chains
    SET updated_at = NOW()
    WHERE id = NEW.chain_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chain_timestamp
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_chain_timestamp();

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_versions ENABLE ROW LEVEL SECURITY;

-- Chains policies
CREATE POLICY "Users can view chains for their business profiles"
  ON public.chains FOR SELECT
  USING (
    business_profile_id IN (
      SELECT bp.id FROM business_profiles bp
      WHERE bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chains for their business profiles"
  ON public.chains FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT bp.id FROM business_profiles bp
      WHERE bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chains for their business profiles"
  ON public.chains FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT bp.id FROM business_profiles bp
      WHERE bp.user_id = auth.uid()
    )
  );

-- Chain objects policies
CREATE POLICY "Users can view chain objects for their chains"
  ON public.chain_objects FOR SELECT
  USING (
    chain_id IN (
      SELECT c.id FROM chains c
      JOIN business_profiles bp ON c.business_profile_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage chain objects for their chains"
  ON public.chain_objects FOR ALL
  USING (
    chain_id IN (
      SELECT c.id FROM chains c
      JOIN business_profiles bp ON c.business_profile_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

-- Chain links policies
CREATE POLICY "Users can view chain links for their chains"
  ON public.chain_links FOR SELECT
  USING (
    from_chain_id IN (
      SELECT c.id FROM chains c
      JOIN business_profiles bp ON c.business_profile_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage chain links for their chains"
  ON public.chain_links FOR ALL
  USING (
    from_chain_id IN (
      SELECT c.id FROM chains c
      JOIN business_profiles bp ON c.business_profile_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

-- Invoice versions policies
CREATE POLICY "Users can view invoice versions for their invoices"
  ON public.invoice_versions FOR SELECT
  USING (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN business_profiles bp ON i.business_profile_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoice versions for their invoices"
  ON public.invoice_versions FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN business_profiles bp ON i.business_profile_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

-- ============================================
-- 10. MIGRATION: Backfill existing events with chains
-- ============================================

-- This will create chains for existing invoices and link their events
DO $$
DECLARE
  v_invoice RECORD;
  v_chain_id UUID;
BEGIN
  -- For each invoice that doesn't have a chain yet
  FOR v_invoice IN 
    SELECT DISTINCT 
      i.id as invoice_id,
      i.business_profile_id,
      i.number,
      i.transaction_type
    FROM invoices i
    WHERE i.primary_chain_id IS NULL
    LIMIT 100 -- Process in batches to avoid timeout
  LOOP
    -- Create chain for this invoice
    v_chain_id := create_chain(
      v_invoice.business_profile_id,
      'invoice',
      'invoice',
      v_invoice.invoice_id,
      'Faktura ' || COALESCE(v_invoice.number, v_invoice.invoice_id::TEXT),
      'draft',
      jsonb_build_object('transaction_type', v_invoice.transaction_type)
    );
    
    -- Update invoice with chain reference
    UPDATE invoices
    SET primary_chain_id = v_chain_id
    WHERE id = v_invoice.invoice_id;
    
    -- Link all events for this invoice to the chain
    UPDATE events
    SET 
      chain_id = v_chain_id,
      object_type = 'invoice',
      object_id = v_invoice.invoice_id
    WHERE entity_type = 'invoice' 
      AND entity_id = v_invoice.invoice_id
      AND chain_id IS NULL;
  END LOOP;
END $$;

COMMENT ON TABLE public.chains IS 'Event chains system - primary unit of verification and workflow. Implements "Łańcuch zdarzeń" concept.';
