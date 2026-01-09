-- Create the missing create_event function for unified events system
-- This function creates events and manages event chains

-- ============================================
-- UPDATE CREATE_EVENT FUNCTION TO MATCH CLIENT EXPECTATIONS
-- ============================================
-- Drop the existing function and recreate with the correct signature
DROP FUNCTION IF EXISTS create_event(
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
);

-- Recreate the function with the correct signature that matches the client call
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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
    v_event_number TEXT;
BEGIN
    -- Validate business profile access
    IF NOT EXISTS (
        SELECT 1 FROM business_profiles 
        WHERE id = p_business_profile_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized access to business profile';
    END IF;

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
$$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get event chain
CREATE OR REPLACE FUNCTION get_event_chain(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    business_profile_id UUID,
    event_type TEXT,
    actor_id UUID,
    actor_name TEXT,
    entity_type TEXT,
    entity_id TEXT,
    action_summary TEXT,
    occurred_at TIMESTAMPTZ,
    entity_reference TEXT,
    amount NUMERIC,
    currency TEXT,
    direction TEXT,
    decision_id UUID,
    changes JSONB,
    metadata JSONB,
    parent_event_id UUID,
    correlation_id TEXT,
    status TEXT,
    posted BOOLEAN,
    needs_action BOOLEAN,
    cash_channel TEXT,
    chain_id UUID,
    object_type TEXT,
    object_id UUID,
    object_version_id UUID,
    causation_event_id UUID,
    is_reversed BOOLEAN,
    reversed_by_event_id UUID,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE event_chain AS (
        -- Base: the starting event
        SELECT e.*
        FROM events e
        WHERE e.id = p_event_id
        
        UNION ALL
        
        -- Recursive: parent events
        SELECT e.*
        FROM events e
        INNER JOIN event_chain ec ON e.id = ec.parent_event_id
        WHERE ec.id != e.id  -- Prevent infinite loops
    )
    SELECT 
        ec.id,
        ec.business_profile_id,
        ec.event_type,
        ec.actor_id,
        ec.actor_name,
        ec.entity_type,
        ec.entity_id,
        ec.action_summary,
        ec.occurred_at,
        ec.entity_reference,
        ec.amount,
        ec.currency,
        ec.direction,
        ec.decision_id,
        ec.changes,
        ec.metadata,
        ec.parent_event_id,
        ec.correlation_id,
        ec.status,
        ec.posted,
        ec.needs_action,
        ec.cash_channel,
        ec.chain_id,
        ec.object_type,
        ec.object_id,
        ec.object_version_id,
        ec.causation_event_id,
        ec.is_reversed,
        ec.reversed_by_event_id,
        ec.reversal_reason,
        ec.created_at,
        ec.updated_at
    FROM event_chain ec
    ORDER BY ec.occurred_at ASC;
END;
$$;

-- Get entity timeline
CREATE OR REPLACE FUNCTION get_entity_timeline(
    p_entity_type TEXT,
    p_entity_id TEXT
)
RETURNS TABLE (
    id UUID,
    business_profile_id UUID,
    event_type TEXT,
    actor_id UUID,
    actor_name TEXT,
    entity_type TEXT,
    entity_id TEXT,
    action_summary TEXT,
    occurred_at TIMESTAMPTZ,
    entity_reference TEXT,
    amount NUMERIC,
    currency TEXT,
    direction TEXT,
    decision_id UUID,
    changes JSONB,
    metadata JSONB,
    parent_event_id UUID,
    correlation_id TEXT,
    status TEXT,
    posted BOOLEAN,
    needs_action BOOLEAN,
    cash_channel TEXT,
    chain_id UUID,
    object_type TEXT,
    object_id UUID,
    object_version_id UUID,
    causation_event_id UUID,
    is_reversed BOOLEAN,
    reversed_by_event_id UUID,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.business_profile_id,
        e.event_type,
        e.actor_id,
        e.actor_name,
        e.entity_type,
        e.entity_id,
        e.action_summary,
        e.occurred_at,
        e.entity_reference,
        e.amount,
        e.currency,
        e.direction,
        e.decision_id,
        e.changes,
        e.metadata,
        e.parent_event_id,
        e.correlation_id,
        e.status,
        e.posted,
        e.needs_action,
        e.cash_channel,
        e.chain_id,
        e.object_type,
        e.object_id,
        e.object_version_id,
        e.causation_event_id,
        e.is_reversed,
        e.reversed_by_event_id,
        e.reversal_reason,
        e.created_at,
        e.updated_at
    FROM events e
    WHERE e.entity_type = p_entity_type
    AND e.entity_id = p_entity_id
    AND e.business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
    ORDER BY e.occurred_at DESC;
END;
$$;

-- ============================================
-- SECURITY POLICIES
-- ============================================

-- Enable RLS on events table if not already enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy for create_event function access
CREATE POLICY "Users can create events for their business profiles"
    ON events
    FOR INSERT
    WITH CHECK (
        business_profile_id IN (
            SELECT id FROM business_profiles WHERE user_id = auth.uid()
        )
    );

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_chain TO authenticated;
GRANT EXECUTE ON FUNCTION get_entity_timeline TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION create_event IS 'Creates unified events with chain support and object versioning';
COMMENT ON FUNCTION get_event_chain IS 'Returns the complete chain of events starting from a given event';
COMMENT ON FUNCTION get_entity_timeline IS 'Returns all events for a specific entity in chronological order';
