-- ============================================================================
-- UNIFIED EVENTS SYSTEM - PRODUCTION-SAFE MIGRATION
-- ============================================================================

-- 0. Drop dependent views/materialized views so we can alter the events table safely
DROP VIEW IF EXISTS public.audit_log_view;
DROP VIEW IF EXISTS public.expenses_ledger_view;
DROP VIEW IF EXISTS public.invoices_ledger_view;
DROP VIEW IF EXISTS public.ledger_live;
DROP VIEW IF EXISTS public.inbox_live;
DROP MATERIALIZED VIEW IF EXISTS public.inbox_view;
DROP MATERIALIZED VIEW IF EXISTS public.ledger_view;

-- ============================================================================
-- 1. Ensure canonical event_type enum exists (and includes legacy values)
--    (use type-swapping pattern to avoid ALTER TYPE restrictions in transactions)
-- ============================================================================
DROP TYPE IF EXISTS public.event_type_new;

CREATE TYPE public.event_type_new AS ENUM (
  'invoice_created',
  'invoice_issued',
  'invoice_approved',
  'invoice_posted',
  'invoice_reversed',
  'invoice_updated',
  'invoice_deleted',
  'payment_recorded',
  'payment_reversed',
  'payment_reconciled',
  'decision_created',
  'decision_used',
  'decision_expired',
  'decision_revoked',
  'expense_created',
  'expense_approved',
  'expense_posted',
  'expense_reversed',
  'contract_created',
  'contract_signed',
  'contract_terminated',
  'gl_entry_posted',
  'gl_entry_reversed',
  'period_closed',
  'period_reopened',
  'manual_adjustment',
  'system_action',
  'expense_captured',
  'invoice_received',
  'invoice_paid',
  'expense_paid',
  'bank_account_created'
);

ALTER TABLE public.company_events
  ALTER COLUMN event_type TYPE public.event_type_new
  USING event_type::text::public.event_type_new;

ALTER TABLE public.events
  ALTER COLUMN event_type TYPE public.event_type_new
  USING event_type::text::public.event_type_new;

DROP TYPE IF EXISTS public.event_type CASCADE;
ALTER TYPE public.event_type_new RENAME TO event_type;

-- ============================================================================
-- 2. Align public.events schema with canonical contract
-- ============================================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS correlation_id UUID,
  ADD COLUMN IF NOT EXISTS reversed_by_event_id UUID,
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cash_channel TEXT,
  ADD COLUMN IF NOT EXISTS needs_action BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS action_summary TEXT,
  ADD COLUMN IF NOT EXISTS changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.events
  ALTER COLUMN occurred_at TYPE TIMESTAMPTZ USING occurred_at::timestamptz,
  ALTER COLUMN recorded_at TYPE TIMESTAMPTZ USING COALESCE(recorded_at::timestamptz, NOW()),
  ALTER COLUMN event_type TYPE event_type USING event_type::event_type;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_status_check;

-- Normalize legacy status values before enforcing the canonical constraint
UPDATE public.events
SET status = CASE
  WHEN status IN ('pending', 'posted', 'reversed') THEN status
  WHEN status IN ('captured', 'classified') THEN 'pending'
  ELSE 'pending'
END
WHERE status NOT IN ('pending', 'posted', 'reversed');

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_direction_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_direction_check
    CHECK (direction IS NULL OR direction IN ('incoming', 'outgoing', 'neutral'));

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_cash_channel_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_cash_channel_check
    CHECK (cash_channel IS NULL OR cash_channel IN ('bank', 'cash', 'card', 'other'));

ALTER TABLE public.events
  ADD CONSTRAINT events_status_check
    CHECK (status IN ('pending', 'posted', 'reversed'));

-- ============================================================================
-- 3. Performance indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_events_business_profile;
DROP INDEX IF EXISTS idx_events_occurred_at;
DROP INDEX IF EXISTS idx_events_recorded_at;
DROP INDEX IF EXISTS idx_events_event_type;
DROP INDEX IF EXISTS idx_events_entity;
DROP INDEX IF EXISTS idx_events_actor;
DROP INDEX IF EXISTS idx_events_decision;
DROP INDEX IF EXISTS idx_events_parent;
DROP INDEX IF EXISTS idx_events_correlation;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_posted;
DROP INDEX IF EXISTS idx_events_needs_action;
DROP INDEX IF EXISTS idx_events_ledger;

CREATE INDEX IF NOT EXISTS idx_events_business_profile
  ON public.events (business_profile_id);

CREATE INDEX IF NOT EXISTS idx_events_occurred_at
  ON public.events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_recorded_at
  ON public.events (recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_event_type
  ON public.events (event_type);

CREATE INDEX IF NOT EXISTS idx_events_entity
  ON public.events (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_events_actor
  ON public.events (actor_id);

CREATE INDEX IF NOT EXISTS idx_events_decision
  ON public.events (decision_id) WHERE decision_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_parent
  ON public.events (parent_event_id) WHERE parent_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_correlation
  ON public.events (correlation_id) WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_status
  ON public.events (status);

CREATE INDEX IF NOT EXISTS idx_events_posted
  ON public.events (posted) WHERE posted = TRUE;

CREATE INDEX IF NOT EXISTS idx_events_needs_action
  ON public.events (needs_action) WHERE needs_action = TRUE;

CREATE INDEX IF NOT EXISTS idx_events_ledger
  ON public.events (business_profile_id, occurred_at DESC)
  WHERE posted = TRUE AND is_reversed = FALSE;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_policy ON public.events;
DROP POLICY IF EXISTS events_insert_policy ON public.events;
DROP POLICY IF EXISTS events_update_policy ON public.events;
DROP POLICY IF EXISTS events_delete_policy ON public.events;

CREATE POLICY events_select_policy
  ON public.events
  FOR SELECT
  USING (
    business_profile_id IN (
      SELECT bp.id
      FROM public.business_profiles bp
      WHERE bp.user_id = auth.uid()
      UNION
      SELECT cm.business_profile_id
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY events_insert_policy
  ON public.events
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY events_update_policy
  ON public.events
  FOR UPDATE
  USING (FALSE);

CREATE POLICY events_delete_policy
  ON public.events
  FOR DELETE
  USING (FALSE);

-- ============================================================================
-- 5. Updated_at trigger (immutability guard)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_events_updated_at();

-- ============================================================================
-- 6. Helper RPCs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_event(
  p_business_profile_id UUID,
  p_event_type event_type,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action_summary TEXT,
  p_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  p_entity_reference TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'PLN',
  p_direction TEXT DEFAULT NULL,
  p_decision_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT '{}'::jsonb,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_parent_event_id UUID DEFAULT NULL,
  p_correlation_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'pending',
  p_posted BOOLEAN DEFAULT FALSE,
  p_needs_action BOOLEAN DEFAULT FALSE,
  p_cash_channel TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.events (
    business_profile_id,
    event_type,
    actor_id,
    actor_name,
    occurred_at,
    entity_type,
    entity_id,
    entity_reference,
    amount,
    currency,
    direction,
    decision_id,
    action_summary,
    changes,
    metadata,
    parent_event_id,
    correlation_id,
    status,
    posted,
    needs_action,
    cash_channel
  )
  VALUES (
    p_business_profile_id,
    p_event_type,
    p_actor_id,
    p_actor_name,
    p_occurred_at,
    p_entity_type,
    p_entity_id,
    p_entity_reference,
    p_amount,
    p_currency,
    p_direction,
    p_decision_id,
    p_action_summary,
    p_changes,
    p_metadata,
    p_parent_event_id,
    p_correlation_id,
    p_status,
    p_posted,
    p_needs_action,
    p_cash_channel
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.get_event_chain(p_event_id UUID)
RETURNS TABLE (
  id UUID,
  event_type event_type,
  occurred_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ,
  actor_name TEXT,
  action_summary TEXT,
  depth INT
) AS $$
WITH RECURSIVE event_chain AS (
  SELECT
    e.id,
    e.event_type,
    e.occurred_at,
    e.recorded_at,
    e.actor_name,
    e.action_summary,
    e.parent_event_id,
    0 AS depth
  FROM public.events e
  WHERE e.id = p_event_id

  UNION ALL

  SELECT
    e.id,
    e.event_type,
    e.occurred_at,
    e.recorded_at,
    e.actor_name,
    e.action_summary,
    e.parent_event_id,
    ec.depth + 1
  FROM public.events e
  INNER JOIN event_chain ec ON e.id = ec.parent_event_id
)
SELECT id, event_type, occurred_at, recorded_at, actor_name, action_summary, depth
FROM event_chain
ORDER BY depth DESC;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_entity_timeline(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  event_type event_type,
  occurred_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ,
  actor_name TEXT,
  action_summary TEXT,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  posted BOOLEAN,
  is_reversed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.event_type,
    e.occurred_at,
    e.recorded_at,
    e.actor_name,
    e.action_summary,
    e.amount,
    e.currency,
    e.status,
    e.posted,
    e.is_reversed
  FROM events e
  WHERE e.entity_type = p_entity_type
    AND e.entity_id = p_entity_id
  ORDER BY e.occurred_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. Recreate ledger/inbox/audit views using the new schema
-- ============================================================================
CREATE MATERIALIZED VIEW public.ledger_view AS
SELECT
  e.id,
  e.business_profile_id,
  e.event_type,
  e.event_number,
  e.occurred_at,
  e.recorded_at,
  e.amount,
  e.currency,
  e.direction,
  e.cash_channel,
  e.posted,
  e.needs_action,
  e.status,
  e.decision_id,
  e.decision_reference,
  e.blocked_by,
  e.blocked_reason,
  e.source,
  e.classification,
  e.category,
  e.vat_rate,
  e.actor_id,
  e.actor_name,
  e.actor_role,
  e.entity_type,
  e.entity_id,
  e.entity_reference,
  e.document_type,
  e.document_id,
  e.document_number,
  e.counterparty,
  e.linked_documents,
  e.action_summary,
  e.changes,
  e.metadata,
  e.parent_event_id,
  e.is_material,
  e.created_at,
  e.updated_at,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
WHERE e.posted = TRUE
ORDER BY e.occurred_at DESC, e.recorded_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS ledger_view_id_idx
  ON public.ledger_view (id);

REFRESH MATERIALIZED VIEW public.ledger_view;

CREATE MATERIALIZED VIEW public.inbox_view AS
SELECT
  e.id,
  e.business_profile_id,
  e.event_type,
  e.event_number,
  e.occurred_at,
  e.recorded_at,
  e.amount,
  e.currency,
  e.direction,
  e.cash_channel,
  e.posted,
  e.needs_action,
  e.status,
  e.decision_id,
  e.decision_reference,
  e.blocked_by,
  e.blocked_reason,
  e.source,
  e.classification,
  e.category,
  e.vat_rate,
  e.actor_id,
  e.actor_name,
  e.actor_role,
  e.entity_type,
  e.entity_id,
  e.entity_reference,
  e.document_type,
  e.document_id,
  e.document_number,
  e.counterparty,
  e.linked_documents,
  e.action_summary,
  e.changes,
  e.metadata,
  e.parent_event_id,
  e.is_material,
  e.created_at,
  e.updated_at,
  get_inbox_reasons(e.id) AS inbox_reasons,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
WHERE e.posted = FALSE AND e.needs_action = TRUE
ORDER BY e.recorded_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS inbox_view_id_idx
  ON public.inbox_view (id);

REFRESH MATERIALIZED VIEW public.inbox_view;

CREATE VIEW public.audit_log_view AS
SELECT
  e.id,
  e.business_profile_id,
  e.event_type,
  e.event_number,
  e.occurred_at,
  e.recorded_at,
  e.amount,
  e.currency,
  e.direction,
  e.cash_channel,
  e.posted,
  e.needs_action,
  e.status,
  e.decision_id,
  e.decision_reference,
  e.blocked_by,
  e.blocked_reason,
  e.source,
  e.classification,
  e.category,
  e.vat_rate,
  e.actor_id,
  e.actor_name,
  e.actor_role,
  e.entity_type,
  e.entity_id,
  e.entity_reference,
  e.document_type,
  e.document_id,
  e.document_number,
  e.counterparty,
  e.linked_documents,
  e.action_summary,
  e.changes,
  e.metadata,
  e.parent_event_id,
  e.is_material,
  e.created_at,
  e.updated_at,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name,
  u.email AS actor_email
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
LEFT JOIN auth.users u ON u.id = e.actor_id
ORDER BY e.recorded_at DESC;

CREATE VIEW public.expenses_ledger_view AS
SELECT
  e.id,
  e.business_profile_id,
  e.event_type,
  e.event_number,
  e.occurred_at,
  e.recorded_at,
  e.amount,
  e.currency,
  e.direction,
  e.cash_channel,
  e.posted,
  e.needs_action,
  e.status,
  e.decision_id,
  e.decision_reference,
  e.blocked_by,
  e.blocked_reason,
  e.source,
  e.classification,
  e.category,
  e.vat_rate,
  e.actor_id,
  e.actor_name,
  e.actor_role,
  e.entity_type,
  e.entity_id,
  e.entity_reference,
  e.document_type,
  e.document_id,
  e.document_number,
  e.counterparty,
  e.linked_documents,
  e.action_summary,
  e.changes,
  e.metadata,
  e.parent_event_id,
  e.is_material,
  e.created_at,
  e.updated_at,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
WHERE e.posted = TRUE
  AND e.event_type IN ('expense_posted', 'expense_paid', 'expense_approved')
ORDER BY e.occurred_at DESC;

CREATE VIEW public.invoices_ledger_view AS
SELECT
  e.id,
  e.business_profile_id,
  e.event_type,
  e.event_number,
  e.occurred_at,
  e.recorded_at,
  e.amount,
  e.currency,
  e.direction,
  e.cash_channel,
  e.posted,
  e.needs_action,
  e.status,
  e.decision_id,
  e.decision_reference,
  e.blocked_by,
  e.blocked_reason,
  e.source,
  e.classification,
  e.category,
  e.vat_rate,
  e.actor_id,
  e.actor_name,
  e.actor_role,
  e.entity_type,
  e.entity_id,
  e.entity_reference,
  e.document_type,
  e.document_id,
  e.document_number,
  e.counterparty,
  e.linked_documents,
  e.action_summary,
  e.changes,
  e.metadata,
  e.parent_event_id,
  e.is_material,
  e.created_at,
  e.updated_at,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
WHERE e.posted = TRUE AND e.event_type IN ('invoice_issued', 'invoice_received', 'invoice_paid')
ORDER BY e.occurred_at DESC;

CREATE VIEW public.ledger_live AS
SELECT
  e.id,
  e.business_profile_id,
  e.event_type,
  e.event_number,
  e.occurred_at,
  e.recorded_at,
  e.amount,
  e.currency,
  e.direction,
  e.cash_channel,
  e.posted,
  e.needs_action,
  e.status,
  e.decision_id,
  e.decision_reference,
  e.blocked_by,
  e.blocked_reason,
  e.source,
  e.classification,
  e.category,
  e.vat_rate,
  e.actor_id,
  e.actor_name,
  e.actor_role,
  e.entity_type,
  e.entity_id,
  e.entity_reference,
  e.document_type,
  e.document_id,
  e.document_number,
  e.counterparty,
  e.linked_documents,
  e.action_summary,
  e.changes,
  e.metadata,
  e.parent_event_id,
  e.is_material,
  e.created_at,
  e.updated_at,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
WHERE e.posted = TRUE
ORDER BY e.occurred_at DESC, e.recorded_at DESC;

CREATE VIEW public.inbox_live AS
SELECT
  e.id,
  e.business_profile_id,
  e.event_type,
  e.event_number,
  e.occurred_at,
  e.recorded_at,
  e.amount,
  e.currency,
  e.direction,
  e.cash_channel,
  e.posted,
  e.needs_action,
  e.status,
  e.decision_id,
  e.decision_reference,
  e.blocked_by,
  e.blocked_reason,
  e.source,
  e.classification,
  e.category,
  e.vat_rate,
  e.actor_id,
  e.actor_name,
  e.actor_role,
  e.entity_type,
  e.entity_id,
  e.entity_reference,
  e.document_type,
  e.document_id,
  e.document_number,
  e.counterparty,
  e.linked_documents,
  e.action_summary,
  e.changes,
  e.metadata,
  e.parent_event_id,
  e.is_material,
  e.created_at,
  e.updated_at,
  get_inbox_reasons(e.id) AS inbox_reasons,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
WHERE e.posted = FALSE
  AND e.needs_action = TRUE
ORDER BY e.recorded_at DESC;
