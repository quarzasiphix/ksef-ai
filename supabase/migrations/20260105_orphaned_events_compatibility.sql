-- ============================================
-- BACKWARDS COMPATIBILITY FOR ORPHANED EVENTS
-- ============================================
-- Handles events without chain_id (legacy data)
-- Provides auto-attach and manual attach workflows

-- ============================================
-- 1. ATTACH EVENT TO CHAIN
-- ============================================
CREATE OR REPLACE FUNCTION attach_event_to_chain(
  p_event_id UUID,
  p_chain_id UUID,
  p_causation_event_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_event events%ROWTYPE;
  v_chain chains%ROWTYPE;
  v_last_event_id UUID;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event not found'
    );
  END IF;
  
  -- Get chain
  SELECT * INTO v_chain FROM chains WHERE id = p_chain_id;
  IF v_chain.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Chain not found'
    );
  END IF;
  
  -- If no causation_event_id provided, use last event in chain
  IF p_causation_event_id IS NULL THEN
    SELECT id INTO v_last_event_id
    FROM events
    WHERE chain_id = p_chain_id
      AND id != p_event_id
    ORDER BY occurred_at DESC, created_at DESC
    LIMIT 1;
  ELSE
    v_last_event_id := p_causation_event_id;
  END IF;
  
  -- Attach event to chain
  UPDATE events
  SET 
    chain_id = p_chain_id,
    object_type = COALESCE(object_type, v_event.entity_type),
    object_id = COALESCE(object_id, v_event.entity_id),
    causation_event_id = v_last_event_id
  WHERE id = p_event_id;
  
  -- If event has object_ref, ensure it's in chain_objects
  IF v_event.object_type IS NOT NULL AND v_event.object_id IS NOT NULL THEN
    INSERT INTO chain_objects (
      chain_id,
      object_type,
      object_id,
      role
    ) VALUES (
      p_chain_id,
      COALESCE(v_event.object_type, v_event.entity_type),
      COALESCE(v_event.object_id, v_event.entity_id),
      'related'
    )
    ON CONFLICT (chain_id, object_type, object_id) DO NOTHING;
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'event_id', p_event_id,
    'chain_id', p_chain_id,
    'causation_event_id', v_last_event_id,
    'method', 'manual'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION attach_event_to_chain IS 'Attach an orphaned event to a chain. Does not change review_status - only timeline grouping.';

-- ============================================
-- 2. AUTO-ATTACH EVENT (DETERMINISTIC)
-- ============================================
CREATE OR REPLACE FUNCTION auto_attach_event(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_event events%ROWTYPE;
  v_chain_id UUID;
  v_method TEXT;
  v_confidence NUMERIC;
  v_object_type TEXT;
  v_object_id UUID;
  v_chain_title TEXT;
  v_metadata_invoice_id UUID;
  v_metadata_cash_id UUID;
  v_metadata_bank_id UUID;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event not found'
    );
  END IF;
  
  -- Already has chain
  IF v_event.chain_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event already has chain_id',
      'chain_id', v_event.chain_id
    );
  END IF;
  
  -- STRATEGY 1: Use object_type + object_id (highest confidence)
  IF v_event.object_type IS NOT NULL AND v_event.object_id IS NOT NULL THEN
    SELECT id INTO v_chain_id
    FROM chains
    WHERE primary_object_type = v_event.object_type
      AND primary_object_id = v_event.object_id
    LIMIT 1;
    
    IF v_chain_id IS NOT NULL THEN
      PERFORM attach_event_to_chain(p_event_id, v_chain_id);
      RETURN jsonb_build_object(
        'success', TRUE,
        'event_id', p_event_id,
        'chain_id', v_chain_id,
        'method', 'object_ref',
        'confidence', 1.0
      );
    END IF;
  END IF;
  
  -- STRATEGY 2: Use entity_type + entity_id (fallback to legacy fields)
  IF v_event.entity_type IS NOT NULL AND v_event.entity_id IS NOT NULL THEN
    SELECT id INTO v_chain_id
    FROM chains
    WHERE primary_object_type = v_event.entity_type
      AND primary_object_id = v_event.entity_id
    LIMIT 1;
    
    IF v_chain_id IS NOT NULL THEN
      PERFORM attach_event_to_chain(p_event_id, v_chain_id);
      RETURN jsonb_build_object(
        'success', TRUE,
        'event_id', p_event_id,
        'chain_id', v_chain_id,
        'method', 'entity_ref',
        'confidence', 0.9
      );
    END IF;
  END IF;
  
  -- STRATEGY 3: Parse metadata for object references
  v_metadata_invoice_id := (v_event.metadata->>'invoice_id')::UUID;
  v_metadata_cash_id := (v_event.metadata->>'cash_entry_id')::UUID;
  v_metadata_bank_id := (v_event.metadata->>'bank_tx_id')::UUID;
  
  IF v_metadata_invoice_id IS NOT NULL THEN
    SELECT id INTO v_chain_id
    FROM chains
    WHERE primary_object_type = 'invoice'
      AND primary_object_id = v_metadata_invoice_id
    LIMIT 1;
    
    IF v_chain_id IS NOT NULL THEN
      PERFORM attach_event_to_chain(p_event_id, v_chain_id);
      RETURN jsonb_build_object(
        'success', TRUE,
        'event_id', p_event_id,
        'chain_id', v_chain_id,
        'method', 'metadata_invoice',
        'confidence', 0.8
      );
    END IF;
  END IF;
  
  IF v_metadata_cash_id IS NOT NULL THEN
    SELECT id INTO v_chain_id
    FROM chains
    WHERE primary_object_type = 'cash_entry'
      AND primary_object_id = v_metadata_cash_id
    LIMIT 1;
    
    IF v_chain_id IS NOT NULL THEN
      PERFORM attach_event_to_chain(p_event_id, v_chain_id);
      RETURN jsonb_build_object(
        'success', TRUE,
        'event_id', p_event_id,
        'chain_id', v_chain_id,
        'method', 'metadata_cash',
        'confidence', 0.8
      );
    END IF;
  END IF;
  
  -- STRATEGY 4: Create new chain for this event
  -- Determine object type and ID
  v_object_type := COALESCE(v_event.object_type, v_event.entity_type, 'unknown');
  v_object_id := COALESCE(v_event.object_id, v_event.entity_id, gen_random_uuid());
  
  -- Generate chain title
  v_chain_title := COALESCE(
    v_event.entity_reference,
    v_event.action_summary,
    'Zdarzenie ' || v_event.event_number
  );
  
  -- Create new chain
  v_chain_id := create_chain(
    v_event.business_profile_id,
    v_object_type,
    v_object_type,
    v_object_id,
    v_chain_title,
    'draft',
    jsonb_build_object(
      'created_from_orphan', TRUE,
      'original_event_id', p_event_id
    )
  );
  
  -- Attach event to new chain
  PERFORM attach_event_to_chain(p_event_id, v_chain_id);
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'event_id', p_event_id,
    'chain_id', v_chain_id,
    'method', 'new_chain',
    'confidence', 0.5,
    'created_new_chain', TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_attach_event IS 'Automatically attach orphaned event to appropriate chain using deterministic algorithm';

-- ============================================
-- 3. FIND ORPHANED EVENTS
-- ============================================
CREATE OR REPLACE FUNCTION get_orphaned_events(
  p_business_profile_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_number TEXT,
  action_summary TEXT,
  occurred_at TIMESTAMPTZ,
  entity_type TEXT,
  entity_id UUID,
  entity_reference TEXT,
  object_type TEXT,
  object_id UUID,
  metadata JSONB,
  suggested_chain_id UUID,
  suggested_chain_title TEXT,
  confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.event_type,
    e.event_number,
    e.action_summary,
    e.occurred_at,
    e.entity_type,
    e.entity_id,
    e.entity_reference,
    e.object_type,
    e.object_id,
    e.metadata,
    -- Suggest chain based on object_ref or entity_ref
    (
      SELECT c.id
      FROM chains c
      WHERE (
        (e.object_type IS NOT NULL AND e.object_id IS NOT NULL 
         AND c.primary_object_type = e.object_type 
         AND c.primary_object_id = e.object_id)
        OR
        (e.entity_type IS NOT NULL AND e.entity_id IS NOT NULL
         AND c.primary_object_type = e.entity_type
         AND c.primary_object_id = e.entity_id)
      )
      LIMIT 1
    ) as suggested_chain_id,
    (
      SELECT c.title
      FROM chains c
      WHERE (
        (e.object_type IS NOT NULL AND e.object_id IS NOT NULL 
         AND c.primary_object_type = e.object_type 
         AND c.primary_object_id = e.object_id)
        OR
        (e.entity_type IS NOT NULL AND e.entity_id IS NOT NULL
         AND c.primary_object_type = e.entity_type
         AND c.primary_object_id = e.entity_id)
      )
      LIMIT 1
    ) as suggested_chain_title,
    CASE
      WHEN e.object_type IS NOT NULL AND e.object_id IS NOT NULL THEN 1.0
      WHEN e.entity_type IS NOT NULL AND e.entity_id IS NOT NULL THEN 0.9
      ELSE 0.5
    END as confidence
  FROM events e
  WHERE e.business_profile_id = p_business_profile_id
    AND e.chain_id IS NULL
  ORDER BY e.occurred_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_orphaned_events IS 'Find events without chain_id with suggested chains for auto-attach';

-- ============================================
-- 4. SEARCH CHAINS FOR MANUAL ATTACH
-- ============================================
CREATE OR REPLACE FUNCTION search_chains_for_attach(
  p_business_profile_id UUID,
  p_search_query TEXT,
  p_event_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  chain_id UUID,
  chain_number TEXT,
  title TEXT,
  chain_type TEXT,
  state TEXT,
  event_count BIGINT,
  last_activity_at TIMESTAMPTZ,
  relevance_score NUMERIC
) AS $$
DECLARE
  v_event events%ROWTYPE;
BEGIN
  -- Get event context if provided
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO v_event FROM events WHERE id = p_event_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.chain_number,
    c.title,
    c.chain_type,
    c.state,
    (SELECT COUNT(*) FROM events e WHERE e.chain_id = c.id) as event_count,
    (SELECT MAX(e.occurred_at) FROM events e WHERE e.chain_id = c.id) as last_activity_at,
    -- Calculate relevance score
    CASE
      -- Exact match on chain_number or title
      WHEN c.chain_number ILIKE '%' || p_search_query || '%' 
        OR c.title ILIKE '%' || p_search_query || '%' THEN 1.0
      -- Same object type as event
      WHEN v_event.id IS NOT NULL 
        AND c.primary_object_type = COALESCE(v_event.object_type, v_event.entity_type) THEN 0.8
      -- Same date as event
      WHEN v_event.id IS NOT NULL
        AND DATE(c.created_at) = DATE(v_event.occurred_at) THEN 0.6
      ELSE 0.3
    END as relevance_score
  FROM chains c
  WHERE c.business_profile_id = p_business_profile_id
    AND (
      p_search_query IS NULL
      OR c.chain_number ILIKE '%' || p_search_query || '%'
      OR c.title ILIKE '%' || p_search_query || '%'
      OR c.chain_type ILIKE '%' || p_search_query || '%'
    )
  ORDER BY relevance_score DESC, last_activity_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_chains_for_attach IS 'Search chains for manual event attachment with relevance scoring';

-- ============================================
-- 5. BULK AUTO-ATTACH ORPHANED EVENTS
-- ============================================
CREATE OR REPLACE FUNCTION bulk_auto_attach_orphaned_events(
  p_business_profile_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE
  v_event_id UUID;
  v_result JSONB;
  v_success_count INTEGER := 0;
  v_fail_count INTEGER := 0;
  v_results JSONB := '[]'::JSONB;
BEGIN
  -- Process orphaned events
  FOR v_event_id IN
    SELECT id FROM events
    WHERE business_profile_id = p_business_profile_id
      AND chain_id IS NULL
    ORDER BY occurred_at DESC
    LIMIT p_limit
  LOOP
    -- Try to auto-attach
    v_result := auto_attach_event(v_event_id);
    
    IF (v_result->>'success')::BOOLEAN THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_fail_count := v_fail_count + 1;
    END IF;
    
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'processed', v_success_count + v_fail_count,
    'attached', v_success_count,
    'failed', v_fail_count,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION bulk_auto_attach_orphaned_events IS 'Bulk auto-attach all orphaned events for a business profile';

-- ============================================
-- 6. VIEW: ORPHANED EVENTS SUMMARY
-- ============================================
CREATE OR REPLACE VIEW orphaned_events_summary AS
SELECT 
  e.business_profile_id,
  COUNT(*) as orphaned_count,
  COUNT(*) FILTER (WHERE e.object_type IS NOT NULL AND e.object_id IS NOT NULL) as with_object_ref,
  COUNT(*) FILTER (WHERE e.entity_type IS NOT NULL AND e.entity_id IS NOT NULL) as with_entity_ref,
  COUNT(*) FILTER (WHERE e.object_type IS NULL AND e.entity_type IS NULL) as without_ref,
  MIN(e.occurred_at) as oldest_orphan,
  MAX(e.occurred_at) as newest_orphan
FROM events e
WHERE e.chain_id IS NULL
GROUP BY e.business_profile_id;

GRANT SELECT ON orphaned_events_summary TO authenticated;

COMMENT ON VIEW orphaned_events_summary IS 'Summary of orphaned events by business profile for monitoring';

-- ============================================
-- 7. PREVENT FUTURE ORPHANS (OPTIONAL ENFORCEMENT)
-- ============================================
-- This is commented out by default - uncomment to enforce
-- CREATE OR REPLACE FUNCTION prevent_orphan_events()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Allow if chain_id is provided
--   IF NEW.chain_id IS NOT NULL THEN
--     RETURN NEW;
--   END IF;
--   
--   -- Allow if object_ref is provided (will auto-create chain)
--   IF NEW.object_type IS NOT NULL AND NEW.object_id IS NOT NULL THEN
--     RETURN NEW;
--   END IF;
--   
--   -- Allow if entity_ref is provided (legacy support)
--   IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
--     RETURN NEW;
--   END IF;
--   
--   -- Reject orphan events
--   RAISE EXCEPTION 'Events must have either chain_id or object_ref (object_type + object_id)';
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- CREATE TRIGGER trigger_prevent_orphan_events
--   BEFORE INSERT ON events
--   FOR EACH ROW
--   EXECUTE FUNCTION prevent_orphan_events();

COMMENT ON FUNCTION attach_event_to_chain IS 'Backwards compatibility: attach orphaned events to chains without breaking review workflow';
