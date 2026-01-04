-- ============================================
-- CREATE EVENT RPC
-- ============================================
-- Canonical event creation function for the unified events table
-- This replaces the old log_company_event RPC

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
  p_changes JSONB DEFAULT '{}'::JSONB,
  p_metadata JSONB DEFAULT '{}'::JSONB,
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
  v_event_number TEXT;
BEGIN
  -- Generate event number (simple sequential for now)
  SELECT 'EVT-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(event_number FROM 5) AS INTEGER)), 0) + 1::TEXT, 8, '0')
  INTO v_event_number
  FROM events
  WHERE business_profile_id = p_business_profile_id
    AND event_number LIKE 'EVT-%';
  
  -- If no events exist yet, start from 1
  IF v_event_number IS NULL THEN
    v_event_number := 'EVT-00000001';
  END IF;
  
  -- Insert event
  INSERT INTO events (
    business_profile_id,
    event_type,
    event_number,
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
    cash_channel,
    is_reversed,
    is_material
  ) VALUES (
    p_business_profile_id,
    p_event_type,
    v_event_number,
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
    p_cash_channel,
    FALSE, -- is_reversed
    (p_amount IS NOT NULL AND ABS(p_amount) > 1000) -- is_material if amount > 1000
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_event IS 'Create a new event in the unified events table. Returns the event ID.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_event TO authenticated;

-- ============================================
-- HELPER RPCS FOR EVENT QUERIES
-- ============================================

-- Get event chain (event + all ancestors)
CREATE OR REPLACE FUNCTION get_event_chain(p_event_id UUID)
RETURNS TABLE (
  id UUID,
  business_profile_id UUID,
  event_type TEXT,
  event_number TEXT,
  actor_id UUID,
  actor_name TEXT,
  occurred_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ,
  entity_type TEXT,
  entity_id UUID,
  entity_reference TEXT,
  amount DECIMAL,
  currency TEXT,
  direction TEXT,
  decision_id UUID,
  action_summary TEXT,
  changes JSONB,
  metadata JSONB,
  parent_event_id UUID,
  correlation_id UUID,
  status TEXT,
  posted BOOLEAN,
  needs_action BOOLEAN,
  is_reversed BOOLEAN,
  is_material BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE event_chain AS (
    -- Base case: the requested event
    SELECT e.*
    FROM events e
    WHERE e.id = p_event_id
    
    UNION ALL
    
    -- Recursive case: parent events
    SELECT e.*
    FROM events e
    INNER JOIN event_chain ec ON e.id = ec.parent_event_id
  )
  SELECT * FROM event_chain
  ORDER BY occurred_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_event_chain TO authenticated;

-- Get entity timeline (all events for an entity)
CREATE OR REPLACE FUNCTION get_entity_timeline(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  business_profile_id UUID,
  event_type TEXT,
  event_number TEXT,
  actor_id UUID,
  actor_name TEXT,
  occurred_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ,
  entity_type TEXT,
  entity_id UUID,
  entity_reference TEXT,
  amount DECIMAL,
  currency TEXT,
  direction TEXT,
  decision_id UUID,
  action_summary TEXT,
  changes JSONB,
  metadata JSONB,
  parent_event_id UUID,
  correlation_id UUID,
  status TEXT,
  posted BOOLEAN,
  needs_action BOOLEAN,
  is_reversed BOOLEAN,
  is_material BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM events
  WHERE events.entity_type = p_entity_type
    AND events.entity_id = p_entity_id
  ORDER BY occurred_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_entity_timeline TO authenticated;
