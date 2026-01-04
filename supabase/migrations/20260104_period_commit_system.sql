-- ============================================
-- PERIOD COMMIT SYSTEM (Git-like Accounting)
-- ============================================
-- Implements consensus-driven period close with:
-- - Merkle tree digest for deterministic period hashing
-- - Multiple candidates per period (fork retention)
-- - Approval workflow with governance integration
-- - Immutable history with transparent corrections

-- ============================================
-- 1. PERIOD COMMIT CANDIDATES
-- ============================================

CREATE TABLE period_commit_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  -- Period identification
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  
  -- Digest (Merkle root or canonical hash)
  period_digest TEXT NOT NULL,  -- SHA256 hex string
  merkle_root TEXT,  -- If using Merkle tree
  digest_method TEXT DEFAULT 'merkle',  -- 'merkle' or 'canonical'
  
  -- Event set specification
  event_count INT NOT NULL,
  event_ids UUID[] NOT NULL,  -- Deterministically ordered
  
  -- Financial totals (for quick validation)
  total_debit NUMERIC DEFAULT 0,
  total_credit NUMERIC DEFAULT 0,
  currency_totals JSONB,  -- { "PLN": { debit: X, credit: Y }, ... }
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'proposed', 'accepted', 'rejected', 'superseded'
  status_reason TEXT,
  
  -- Chain continuity (optional but recommended)
  previous_commit_id UUID REFERENCES period_commit_candidates(id),
  previous_period_digest TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  proposed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  
  -- Blockers snapshot (at proposal time)
  blockers JSONB,  -- { unverified_count: N, missing_links_count: M, ... }
  
  UNIQUE(business_profile_id, period_year, period_month, id),
  CHECK (status IN ('draft', 'proposed', 'accepted', 'rejected', 'superseded'))
);

CREATE INDEX idx_period_candidates_profile_period ON period_commit_candidates(business_profile_id, period_year, period_month);
CREATE INDEX idx_period_candidates_status ON period_commit_candidates(status);
CREATE INDEX idx_period_candidates_accepted ON period_commit_candidates(business_profile_id, period_year, period_month, status) WHERE status = 'accepted';

COMMENT ON TABLE period_commit_candidates IS 'Git-like commits for accounting periods. Multiple candidates per period (forks) with approval workflow.';
COMMENT ON COLUMN period_commit_candidates.period_digest IS 'Deterministic hash of all events in period. Two systems with same events must compute same digest.';
COMMENT ON COLUMN period_commit_candidates.merkle_root IS 'Merkle tree root for efficient inclusion proofs.';
COMMENT ON COLUMN period_commit_candidates.event_ids IS 'Ordered array of event IDs included in this candidate. Order: (occurred_at, id).';

-- ============================================
-- 2. PERIOD COMMIT APPROVALS
-- ============================================

CREATE TABLE period_commit_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES period_commit_candidates(id) ON DELETE CASCADE,
  
  -- Approver
  approver_user_id UUID NOT NULL REFERENCES auth.users(id),
  approver_role TEXT,  -- 'owner', 'accountant', 'board_member', etc.
  
  -- Decision linkage (governance integration)
  decision_id UUID REFERENCES decisions(id),
  
  -- Approval
  approved BOOLEAN NOT NULL,
  approval_comment TEXT,
  signature_hash TEXT,  -- Optional: cryptographic signature
  
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(candidate_id, approver_user_id)
);

CREATE INDEX idx_period_approvals_candidate ON period_commit_approvals(candidate_id);
CREATE INDEX idx_period_approvals_user ON period_commit_approvals(approver_user_id);

COMMENT ON TABLE period_commit_approvals IS 'Approval votes for period commit candidates. Enables M-of-N governance.';

-- ============================================
-- 3. PERIOD COMMIT CHAIN (Optional)
-- ============================================

CREATE TABLE period_commit_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  -- Chain position
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  sequence_number INT NOT NULL,  -- 1, 2, 3... (Jan = 1, Feb = 2, etc.)
  
  -- Canonical commit
  canonical_commit_id UUID NOT NULL REFERENCES period_commit_candidates(id),
  
  -- Chain continuity
  previous_commit_id UUID REFERENCES period_commit_candidates(id),
  chain_hash TEXT,  -- SHA256(previous_chain_hash || canonical_commit_digest)
  
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_by UUID REFERENCES auth.users(id),
  
  UNIQUE(business_profile_id, period_year, period_month)
);

CREATE INDEX idx_period_chain_profile ON period_commit_chain(business_profile_id, sequence_number);

COMMENT ON TABLE period_commit_chain IS 'Immutable chain of canonical period commits. Each period references previous period for continuity.';

-- ============================================
-- 4. MERKLE TREE COMPUTATION
-- ============================================

CREATE OR REPLACE FUNCTION compute_event_leaf_hash(
  p_event_id UUID,
  p_event_hash TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_amount NUMERIC,
  p_currency TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      p_event_hash || '|' ||
      p_event_id::TEXT || '|' ||
      p_occurred_at::TEXT || '|' ||
      p_amount::TEXT || '|' ||
      p_currency,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION compute_event_leaf_hash IS 'Compute Merkle tree leaf hash for a single event. Deterministic given same inputs.';

CREATE OR REPLACE FUNCTION compute_merkle_root(
  p_leaf_hashes TEXT[]
)
RETURNS TEXT AS $$
DECLARE
  v_current_level TEXT[];
  v_next_level TEXT[];
  v_i INT;
  v_left TEXT;
  v_right TEXT;
BEGIN
  -- Base case: empty or single leaf
  IF array_length(p_leaf_hashes, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF array_length(p_leaf_hashes, 1) = 1 THEN
    RETURN p_leaf_hashes[1];
  END IF;
  
  v_current_level := p_leaf_hashes;
  
  -- Build tree bottom-up
  WHILE array_length(v_current_level, 1) > 1 LOOP
    v_next_level := ARRAY[]::TEXT[];
    
    FOR v_i IN 1..array_length(v_current_level, 1) BY 2 LOOP
      v_left := v_current_level[v_i];
      
      -- If odd number of nodes, duplicate last node
      IF v_i + 1 > array_length(v_current_level, 1) THEN
        v_right := v_left;
      ELSE
        v_right := v_current_level[v_i + 1];
      END IF;
      
      -- Hash pair
      v_next_level := array_append(
        v_next_level,
        encode(digest(v_left || v_right, 'sha256'), 'hex')
      );
    END LOOP;
    
    v_current_level := v_next_level;
  END LOOP;
  
  RETURN v_current_level[1];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION compute_merkle_root IS 'Compute Merkle tree root from array of leaf hashes. Standard binary tree construction.';

-- ============================================
-- 5. PERIOD DIGEST COMPUTATION
-- ============================================

CREATE OR REPLACE FUNCTION compute_period_digest(
  p_business_profile_id UUID,
  p_period_year INT,
  p_period_month INT,
  p_method TEXT DEFAULT 'merkle'
)
RETURNS TABLE (
  period_digest TEXT,
  merkle_root TEXT,
  event_count INT,
  event_ids UUID[],
  total_debit NUMERIC,
  total_credit NUMERIC,
  currency_totals JSONB
) AS $$
DECLARE
  v_events RECORD;
  v_leaf_hashes TEXT[];
  v_event_ids UUID[];
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_currency_totals JSONB := '{}'::JSONB;
  v_merkle_root TEXT;
  v_canonical_digest TEXT;
BEGIN
  -- Get all closed events in period, deterministically ordered
  FOR v_events IN
    SELECT
      e.id,
      COALESCE(e.metadata->>'event_hash', '') AS event_hash,
      e.occurred_at,
      e.amount,
      e.currency,
      COALESCE((e.metadata->>'debit_account')::TEXT, '') AS debit_account,
      COALESCE((e.metadata->>'credit_account')::TEXT, '') AS credit_account
    FROM events e
    WHERE e.business_profile_id = p_business_profile_id
      AND (e.metadata->>'period_year')::INT = p_period_year
      AND (e.metadata->>'period_month')::INT = p_period_month
      AND e.metadata->>'is_closed' = 'true'
      AND e.is_reversed = FALSE
    ORDER BY e.occurred_at, e.id  -- Deterministic ordering
  LOOP
    -- Compute leaf hash
    v_leaf_hashes := array_append(
      v_leaf_hashes,
      compute_event_leaf_hash(
        v_events.id,
        v_events.event_hash,
        v_events.occurred_at,
        v_events.amount,
        v_events.currency
      )
    );
    
    -- Collect event IDs
    v_event_ids := array_append(v_event_ids, v_events.id);
    
    -- Accumulate totals
    IF v_events.debit_account != '' THEN
      v_total_debit := v_total_debit + v_events.amount;
    END IF;
    
    IF v_events.credit_account != '' THEN
      v_total_credit := v_total_credit + v_events.amount;
    END IF;
    
    -- Currency totals
    IF NOT (v_currency_totals ? v_events.currency) THEN
      v_currency_totals := jsonb_set(
        v_currency_totals,
        ARRAY[v_events.currency],
        '{"debit": 0, "credit": 0}'::JSONB
      );
    END IF;
    
    IF v_events.debit_account != '' THEN
      v_currency_totals := jsonb_set(
        v_currency_totals,
        ARRAY[v_events.currency, 'debit'],
        to_jsonb((v_currency_totals->v_events.currency->>'debit')::NUMERIC + v_events.amount)
      );
    END IF;
    
    IF v_events.credit_account != '' THEN
      v_currency_totals := jsonb_set(
        v_currency_totals,
        ARRAY[v_events.currency, 'credit'],
        to_jsonb((v_currency_totals->v_events.currency->>'credit')::NUMERIC + v_events.amount)
      );
    END IF;
  END LOOP;
  
  -- Compute digest based on method
  IF p_method = 'merkle' THEN
    v_merkle_root := compute_merkle_root(v_leaf_hashes);
    v_canonical_digest := v_merkle_root;
  ELSE
    -- Canonical concatenation
    v_canonical_digest := encode(
      digest(array_to_string(v_leaf_hashes, '|'), 'sha256'),
      'hex'
    );
  END IF;
  
  RETURN QUERY SELECT
    v_canonical_digest,
    v_merkle_root,
    array_length(v_event_ids, 1),
    v_event_ids,
    v_total_debit,
    v_total_credit,
    v_currency_totals;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_period_digest IS 'Compute deterministic digest for a period. Two systems with same closed events will produce same digest.';

-- ============================================
-- 6. PROPOSE PERIOD COMMIT
-- ============================================

CREATE OR REPLACE FUNCTION propose_period_commit(
  p_business_profile_id UUID,
  p_period_year INT,
  p_period_month INT,
  p_user_id UUID,
  p_method TEXT DEFAULT 'merkle'
)
RETURNS UUID AS $$
DECLARE
  v_candidate_id UUID;
  v_digest_result RECORD;
  v_previous_commit period_commit_candidates%ROWTYPE;
  v_blockers JSONB;
  v_unverified_count INT;
  v_missing_links_count INT;
BEGIN
  -- Compute period digest
  SELECT * INTO v_digest_result
  FROM compute_period_digest(p_business_profile_id, p_period_year, p_period_month, p_method);
  
  -- Check for blockers
  SELECT COUNT(*) INTO v_unverified_count
  FROM events
  WHERE business_profile_id = p_business_profile_id
    AND (metadata->>'period_year')::INT = p_period_year
    AND (metadata->>'period_month')::INT = p_period_month
    AND metadata->>'is_closed' = 'true'
    AND metadata->>'verified' != 'true';
  
  -- TODO: Check missing required links based on policies
  v_missing_links_count := 0;
  
  v_blockers := jsonb_build_object(
    'unverified_count', v_unverified_count,
    'missing_links_count', v_missing_links_count
  );
  
  -- Get previous period's canonical commit (if exists)
  SELECT * INTO v_previous_commit
  FROM period_commit_candidates
  WHERE business_profile_id = p_business_profile_id
    AND status = 'accepted'
    AND (
      (period_year = p_period_year AND period_month = p_period_month - 1)
      OR (period_year = p_period_year - 1 AND period_month = 12 AND p_period_month = 1)
    )
  ORDER BY period_year DESC, period_month DESC
  LIMIT 1;
  
  -- Create candidate
  INSERT INTO period_commit_candidates (
    business_profile_id,
    period_year,
    period_month,
    period_digest,
    merkle_root,
    digest_method,
    event_count,
    event_ids,
    total_debit,
    total_credit,
    currency_totals,
    status,
    previous_commit_id,
    previous_period_digest,
    created_by,
    proposed_at,
    blockers
  )
  VALUES (
    p_business_profile_id,
    p_period_year,
    p_period_month,
    v_digest_result.period_digest,
    v_digest_result.merkle_root,
    p_method,
    v_digest_result.event_count,
    v_digest_result.event_ids,
    v_digest_result.total_debit,
    v_digest_result.total_credit,
    v_digest_result.currency_totals,
    'proposed',
    v_previous_commit.id,
    v_previous_commit.period_digest,
    p_user_id,
    NOW(),
    v_blockers
  )
  RETURNING id INTO v_candidate_id;
  
  RETURN v_candidate_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION propose_period_commit IS 'Create a new period commit candidate. Computes digest, checks blockers, links to previous period.';

-- ============================================
-- 7. ACCEPT PERIOD COMMIT
-- ============================================

CREATE OR REPLACE FUNCTION accept_period_commit(
  p_candidate_id UUID,
  p_user_id UUID,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_candidate period_commit_candidates%ROWTYPE;
  v_approval_count INT;
  v_required_approvals INT := 1;  -- TODO: Make configurable per profile
BEGIN
  -- Get candidate
  SELECT * INTO v_candidate
  FROM period_commit_candidates
  WHERE id = p_candidate_id;
  
  IF v_candidate.id IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;
  
  IF v_candidate.status != 'proposed' THEN
    RAISE EXCEPTION 'Candidate must be in proposed status';
  END IF;
  
  -- Check blockers (unless forced)
  IF NOT p_force THEN
    IF (v_candidate.blockers->>'unverified_count')::INT > 0 THEN
      RAISE EXCEPTION 'Cannot accept: % unverified events', (v_candidate.blockers->>'unverified_count')::INT;
    END IF;
    
    IF (v_candidate.blockers->>'missing_links_count')::INT > 0 THEN
      RAISE EXCEPTION 'Cannot accept: % events missing required links', (v_candidate.blockers->>'missing_links_count')::INT;
    END IF;
  END IF;
  
  -- Check approvals
  SELECT COUNT(*) INTO v_approval_count
  FROM period_commit_approvals
  WHERE candidate_id = p_candidate_id
    AND approved = TRUE;
  
  IF v_approval_count < v_required_approvals THEN
    RAISE EXCEPTION 'Insufficient approvals: % of % required', v_approval_count, v_required_approvals;
  END IF;
  
  -- Supersede other candidates for same period
  UPDATE period_commit_candidates
  SET status = 'superseded'
  WHERE business_profile_id = v_candidate.business_profile_id
    AND period_year = v_candidate.period_year
    AND period_month = v_candidate.period_month
    AND id != p_candidate_id
    AND status IN ('draft', 'proposed');
  
  -- Accept candidate
  UPDATE period_commit_candidates
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = p_user_id
  WHERE id = p_candidate_id;
  
  -- Lock all events in period
  UPDATE events
  SET metadata = jsonb_set(metadata, '{period_locked}', 'true'::JSONB)
  WHERE business_profile_id = v_candidate.business_profile_id
    AND (metadata->>'period_year')::INT = v_candidate.period_year
    AND (metadata->>'period_month')::INT = v_candidate.period_month;
  
  -- Add to chain
  INSERT INTO period_commit_chain (
    business_profile_id,
    period_year,
    period_month,
    sequence_number,
    canonical_commit_id,
    previous_commit_id,
    chain_hash,
    locked_by
  )
  VALUES (
    v_candidate.business_profile_id,
    v_candidate.period_year,
    v_candidate.period_month,
    (v_candidate.period_year - 2000) * 12 + v_candidate.period_month,  -- Simple sequence
    v_candidate.id,
    v_candidate.previous_commit_id,
    encode(
      digest(
        COALESCE(v_candidate.previous_period_digest, '') || v_candidate.period_digest,
        'sha256'
      ),
      'hex'
    ),
    p_user_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION accept_period_commit IS 'Accept a period commit candidate as canonical. Enforces blockers, approvals, locks period, adds to chain.';

-- ============================================
-- 8. VERIFY PERIOD COMMIT
-- ============================================

CREATE OR REPLACE FUNCTION verify_period_commit(
  p_candidate_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  stored_digest TEXT,
  computed_digest TEXT,
  mismatch_reason TEXT
) AS $$
DECLARE
  v_candidate period_commit_candidates%ROWTYPE;
  v_computed RECORD;
BEGIN
  -- Get candidate
  SELECT * INTO v_candidate
  FROM period_commit_candidates
  WHERE id = p_candidate_id;
  
  IF v_candidate.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, 'Candidate not found'::TEXT;
    RETURN;
  END IF;
  
  -- Recompute digest
  SELECT * INTO v_computed
  FROM compute_period_digest(
    v_candidate.business_profile_id,
    v_candidate.period_year,
    v_candidate.period_month,
    v_candidate.digest_method
  );
  
  -- Compare
  IF v_candidate.period_digest = v_computed.period_digest THEN
    RETURN QUERY SELECT TRUE, v_candidate.period_digest, v_computed.period_digest, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT
      FALSE,
      v_candidate.period_digest,
      v_computed.period_digest,
      'Digest mismatch: stored vs computed'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_period_commit IS 'Verify period commit integrity by recomputing digest and comparing with stored value.';

-- ============================================
-- 9. COMPARE CANDIDATES (DIFF)
-- ============================================

CREATE OR REPLACE FUNCTION compare_period_candidates(
  p_candidate_a_id UUID,
  p_candidate_b_id UUID
)
RETURNS TABLE (
  event_id UUID,
  status TEXT,  -- 'only_in_a', 'only_in_b', 'in_both'
  event_summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH candidate_a AS (
    SELECT unnest(event_ids) AS event_id
    FROM period_commit_candidates
    WHERE id = p_candidate_a_id
  ),
  candidate_b AS (
    SELECT unnest(event_ids) AS event_id
    FROM period_commit_candidates
    WHERE id = p_candidate_b_id
  )
  SELECT
    COALESCE(a.event_id, b.event_id) AS event_id,
    CASE
      WHEN a.event_id IS NOT NULL AND b.event_id IS NULL THEN 'only_in_a'
      WHEN a.event_id IS NULL AND b.event_id IS NOT NULL THEN 'only_in_b'
      ELSE 'in_both'
    END AS status,
    e.action_summary AS event_summary
  FROM candidate_a a
  FULL OUTER JOIN candidate_b b ON a.event_id = b.event_id
  LEFT JOIN events e ON e.id = COALESCE(a.event_id, b.event_id)
  ORDER BY e.occurred_at, e.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compare_period_candidates IS 'Compare two period commit candidates. Returns events unique to each or present in both.';

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON period_commit_candidates TO authenticated;
GRANT SELECT ON period_commit_approvals TO authenticated;
GRANT SELECT ON period_commit_chain TO authenticated;

-- Only service role can insert/update (via RPCs)
GRANT INSERT, UPDATE ON period_commit_candidates TO service_role;
GRANT INSERT ON period_commit_approvals TO service_role;
GRANT INSERT ON period_commit_chain TO service_role;
