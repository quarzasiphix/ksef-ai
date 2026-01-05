-- ============================================
-- UPDATE CREATE_EVENT RPC FOR CHAIN SYSTEM
-- ============================================
-- Enhances the create_event function to support chain_id and object references

CREATE OR REPLACE FUNCTION create_event(
  p_business_profile_id UUID,
  p_event_type TEXT,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action_summary TEXT,
  p_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  p_entity_reference TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL,
  p_currency TEXT DEFAULT 'PLN',
  p_direction TEXT DEFAULT NULL,
  p_decision_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'pending',
  p_posted BOOLEAN DEFAULT FALSE,
  p_needs_action BOOLEAN DEFAULT FALSE,
  -- NEW PARAMETERS FOR CHAIN SYSTEM
  p_chain_id UUID DEFAULT NULL,
  p_object_type TEXT DEFAULT NULL,
  p_object_id UUID DEFAULT NULL,
  p_object_version_id UUID DEFAULT NULL,
  p_causation_event_id UUID DEFAULT NULL,
  p_auto_create_chain BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_event_number TEXT;
  v_chain_id UUID;
  v_chain_title TEXT;
BEGIN
  -- Generate event number
  v_event_number := 'EVT-' || to_char(NOW(), 'YYYY-MM') || '-' || lpad(nextval('events_event_number_seq')::TEXT, 6, '0');
  
  -- Auto-create chain if not provided and auto_create is true
  IF p_chain_id IS NULL AND p_auto_create_chain THEN
    -- Determine chain title based on entity type
    CASE p_entity_type
      WHEN 'invoice' THEN
        v_chain_title := 'Faktura ' || COALESCE(p_entity_reference, p_entity_id::TEXT);
      WHEN 'cash_entry' THEN
        v_chain_title := 'Płatność gotówkowa ' || COALESCE(p_entity_reference, p_entity_id::TEXT);
      WHEN 'bank_tx' THEN
        v_chain_title := 'Transakcja bankowa ' || COALESCE(p_entity_reference, p_entity_id::TEXT);
      ELSE
        v_chain_title := p_entity_type || ' ' || COALESCE(p_entity_reference, p_entity_id::TEXT);
    END CASE;
    
    -- Create chain
    v_chain_id := create_chain(
      p_business_profile_id,
      p_entity_type, -- chain_type = entity_type
      COALESCE(p_object_type, p_entity_type), -- primary_object_type
      COALESCE(p_object_id, p_entity_id), -- primary_object_id
      v_chain_title,
      'draft',
      COALESCE(p_metadata, '{}'::JSONB)
    );
  ELSE
    v_chain_id := p_chain_id;
  END IF;
  
  -- Create the event
  INSERT INTO events (
    business_profile_id,
    event_type,
    event_number,
    actor_id,
    actor_name,
    entity_type,
    entity_id,
    action_summary,
    occurred_at,
    entity_reference,
    amount,
    currency,
    direction,
    decision_id,
    changes,
    metadata,
    status,
    posted,
    needs_action,
    -- NEW FIELDS
    chain_id,
    object_type,
    object_id,
    object_version_id,
    causation_event_id
  ) VALUES (
    p_business_profile_id,
    p_event_type,
    v_event_number,
    p_actor_id,
    p_actor_name,
    p_entity_type,
    p_entity_id,
    p_action_summary,
    p_occurred_at,
    p_entity_reference,
    p_amount,
    p_currency,
    p_direction,
    p_decision_id,
    p_changes,
    p_metadata,
    p_status,
    p_posted,
    p_needs_action,
    -- NEW FIELDS
    v_chain_id,
    COALESCE(p_object_type, p_entity_type),
    COALESCE(p_object_id, p_entity_id),
    p_object_version_id,
    p_causation_event_id
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_event IS 'Create a new event with chain support. Auto-creates chain if not provided.';

-- ============================================
-- HELPER: Create invoice version on edit
-- ============================================
CREATE OR REPLACE FUNCTION create_invoice_version(
  p_invoice_id UUID,
  p_snapshot_json JSONB,
  p_changed_fields TEXT[],
  p_change_reason TEXT DEFAULT NULL,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
  v_next_version_no INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO v_next_version_no
  FROM invoice_versions
  WHERE invoice_id = p_invoice_id;
  
  -- Create version
  INSERT INTO invoice_versions (
    invoice_id,
    version_no,
    snapshot_json,
    changed_fields,
    change_reason,
    change_summary,
    created_by
  ) VALUES (
    p_invoice_id,
    v_next_version_no,
    p_snapshot_json,
    p_changed_fields,
    p_change_reason,
    p_change_summary,
    auth.uid()
  )
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_invoice_version IS 'Create a new version snapshot when invoice is edited';

-- ============================================
-- VIEW: Chain Summary (for list view)
-- ============================================
CREATE OR REPLACE VIEW chain_summary AS
SELECT 
  c.id,
  c.business_profile_id,
  c.chain_type,
  c.chain_number,
  c.title,
  c.state,
  c.state_updated_at,
  c.requires_verification,
  c.verified_at,
  c.total_amount,
  c.currency,
  c.paid_amount,
  c.remaining_amount,
  c.required_actions,
  c.blockers,
  c.created_at,
  c.updated_at,
  c.closed_at,
  
  -- Primary object info
  c.primary_object_type,
  c.primary_object_id,
  
  -- Count of events in chain
  (SELECT COUNT(*) FROM events e WHERE e.chain_id = c.id) as event_count,
  
  -- Last event timestamp
  (SELECT MAX(e.occurred_at) FROM events e WHERE e.chain_id = c.id) as last_activity_at,
  
  -- Count of related objects
  (SELECT COUNT(*) FROM chain_objects co WHERE co.chain_id = c.id AND co.role != 'primary') as related_object_count,
  
  -- Attention flags
  CASE 
    WHEN array_length(c.blockers::TEXT[], 1) > 0 THEN TRUE
    WHEN c.requires_verification AND c.verified_at IS NULL THEN TRUE
    WHEN array_length(c.required_actions::TEXT[], 1) > 0 THEN TRUE
    ELSE FALSE
  END as needs_attention
  
FROM chains c;

COMMENT ON VIEW chain_summary IS 'Summary view of chains for list display with computed fields';

-- Grant access to view
GRANT SELECT ON chain_summary TO authenticated;

-- ============================================
-- FUNCTION: Get chain with full timeline
-- ============================================
CREATE OR REPLACE FUNCTION get_chain_detail(p_chain_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'chain', row_to_json(c.*),
    'events', (
      SELECT json_agg(row_to_json(e.*) ORDER BY e.occurred_at ASC)
      FROM events e
      WHERE e.chain_id = p_chain_id
    ),
    'objects', (
      SELECT json_agg(row_to_json(co.*))
      FROM chain_objects co
      WHERE co.chain_id = p_chain_id
    ),
    'links', (
      SELECT json_agg(json_build_object(
        'from_chain', cl.from_chain_id,
        'to_chain', cl.to_chain_id,
        'link_type', cl.link_type,
        'amount', cl.amount,
        'currency', cl.currency
      ))
      FROM chain_links cl
      WHERE cl.from_chain_id = p_chain_id OR cl.to_chain_id = p_chain_id
    )
  )
  INTO v_result
  FROM chains c
  WHERE c.id = p_chain_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_chain_detail IS 'Get complete chain details including events, objects, and links';
