-- ============================================================================
-- BUSINESS DELIVERY AND AGREEMENT LAYER
-- ============================================================================
-- Core principle: Documents move between companies with states, and those 
-- states become accounting truth.
--
-- "I sent an invoice and I know it was delivered."
-- "My client saw it."
-- "They accepted it or disputed it."
-- "When it's paid, it's already matched and booked."
--
-- This is the network value.
-- ============================================================================

-- ============================================================================
-- DOCUMENT DELIVERIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What document
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'contract', 'offer', 'receipt')),
  document_id UUID NOT NULL, -- references invoices.id, contracts.id, etc.
  
  -- CRITICAL: Legal state separation
  -- This tracks DRAFT/PROPOSAL documents, NOT issued invoices
  -- Issued invoices go to KSeF and are tracked separately
  is_draft BOOLEAN NOT NULL DEFAULT true,
  
  -- Who sent it
  sender_business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id),
  
  -- Who receives it
  recipient_business_profile_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL,
  recipient_nip TEXT, -- for non-network recipients
  recipient_email TEXT,
  recipient_name TEXT,
  
  -- Delivery method
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('in_app', 'public_link', 'email')),
  
  -- Delivery state (PRE-ISSUANCE ONLY)
  -- These states apply to DRAFTS/PROPOSALS, not issued invoices
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN (
    'sent',           -- draft delivered
    'viewed',         -- recipient opened draft
    'accepted',       -- recipient accepted terms (ready for issuance)
    'disputed',       -- recipient raised dispute on draft
    'rejected',       -- recipient rejected draft (wrong company/data)
    'corrected',      -- sender issued corrected draft version
    'withdrawn',      -- sender withdrew draft
    'issued'          -- document was issued (becomes tax document, goes to KSeF)
  )),
  
  -- Issuance tracking (when draft becomes legal invoice)
  issued_at TIMESTAMPTZ,
  issued_by_user_id UUID REFERENCES auth.users(id),
  ksef_submission_id TEXT,
  ksef_status TEXT CHECK (ksef_status IN ('pending', 'submitted', 'accepted', 'rejected')),
  
  -- Public link (if delivery_method = 'public_link')
  public_link_token TEXT UNIQUE,
  public_link_expires_at TIMESTAMPTZ,
  public_link_requires_verification BOOLEAN DEFAULT false,
  
  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  first_viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  -- Response
  responded_at TIMESTAMPTZ,
  responded_by_user_id UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DELIVERY EVENTS (audit trail for all state changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  delivery_id UUID NOT NULL REFERENCES document_deliveries(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'sent',
    'viewed',
    'accepted',
    'disputed',
    'rejected',
    'corrected',
    'paid',
    'settled',
    'cancelled',
    'link_generated',
    'link_accessed',
    'reminder_sent'
  )),
  
  -- Who triggered this event
  actor_user_id UUID REFERENCES auth.users(id),
  actor_business_profile_id UUID REFERENCES business_profiles(id),
  
  -- Event details
  from_status TEXT,
  to_status TEXT,
  metadata JSONB, -- structured data for disputes, corrections, etc.
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOCUMENT DISPUTES (structured dispute management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  delivery_id UUID NOT NULL REFERENCES document_deliveries(id) ON DELETE CASCADE,
  
  -- Dispute reason (structured)
  dispute_reason TEXT NOT NULL CHECK (dispute_reason IN (
    'incorrect_amount',
    'incorrect_items',
    'incorrect_recipient',
    'not_ordered',
    'already_paid',
    'duplicate',
    'missing_details',
    'other'
  )),
  
  -- Details
  dispute_message TEXT,
  disputed_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  disputed_by_business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  -- Resolution
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN (
    'open',
    'acknowledged',
    'corrected',
    'rejected_by_sender',
    'withdrawn',
    'resolved'
  )),
  
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES auth.users(id),
  resolution_note TEXT,
  
  -- Link to corrected document
  corrected_delivery_id UUID REFERENCES document_deliveries(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DOCUMENT THREADS (scoped communication under documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  delivery_id UUID NOT NULL REFERENCES document_deliveries(id) ON DELETE CASCADE,
  
  -- Message
  message_type TEXT NOT NULL CHECK (message_type IN (
    'comment',
    'dispute_reason',
    'correction_note',
    'payment_confirmation',
    'system_notification'
  )),
  
  message_text TEXT NOT NULL,
  
  -- Author
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  author_business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  -- Visibility
  is_internal BOOLEAN DEFAULT false, -- only visible to sender's team
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT SETTLEMENTS (invoice → pay → settle → book)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which delivery
  delivery_id UUID NOT NULL REFERENCES document_deliveries(id) ON DELETE CASCADE,
  
  -- Payment details
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'stripe',
    'bank_transfer',
    'cash',
    'card',
    'other'
  )),
  
  -- Stripe integration
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_payout_id TEXT,
  
  -- Amounts
  amount_paid DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  fee_amount DECIMAL(15, 2) DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL,
  
  -- Status
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'refunded',
    'disputed'
  )),
  
  -- Timing
  paid_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  
  -- Accounting
  is_booked BOOLEAN DEFAULT false,
  booked_at TIMESTAMPTZ,
  accounting_entry_id UUID, -- link to future accounting_entries table
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BUSINESS NETWORK CONNECTIONS (track who does business with whom)
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  connected_business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Connection type
  connection_type TEXT NOT NULL CHECK (connection_type IN (
    'client',      -- they buy from me
    'supplier',    -- I buy from them
    'both'         -- mutual business
  )),
  
  -- Trust level (for future reputation features)
  trust_level TEXT DEFAULT 'new' CHECK (trust_level IN (
    'new',
    'verified',
    'trusted',
    'preferred',
    'blocked'
  )),
  
  -- Stats
  total_documents_sent INTEGER DEFAULT 0,
  total_documents_received INTEGER DEFAULT 0,
  total_amount_sent DECIMAL(15, 2) DEFAULT 0,
  total_amount_received DECIMAL(15, 2) DEFAULT 0,
  
  -- First and last interaction
  first_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_profile_id, connected_business_profile_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Document deliveries
CREATE INDEX idx_deliveries_sender ON document_deliveries(sender_business_profile_id);
CREATE INDEX idx_deliveries_recipient ON document_deliveries(recipient_business_profile_id);
CREATE INDEX idx_deliveries_status ON document_deliveries(delivery_status);
CREATE INDEX idx_deliveries_document ON document_deliveries(document_type, document_id);
CREATE INDEX idx_deliveries_public_link ON document_deliveries(public_link_token) WHERE public_link_token IS NOT NULL;

-- Delivery events
CREATE INDEX idx_delivery_events_delivery ON delivery_events(delivery_id);
CREATE INDEX idx_delivery_events_type ON delivery_events(event_type);
CREATE INDEX idx_delivery_events_created ON delivery_events(created_at DESC);

-- Disputes
CREATE INDEX idx_disputes_delivery ON document_disputes(delivery_id);
CREATE INDEX idx_disputes_status ON document_disputes(resolution_status);
CREATE INDEX idx_disputes_business ON document_disputes(disputed_by_business_profile_id);

-- Threads
CREATE INDEX idx_threads_delivery ON document_threads(delivery_id);
CREATE INDEX idx_threads_author ON document_threads(author_business_profile_id);

-- Settlements
CREATE INDEX idx_settlements_delivery ON payment_settlements(delivery_id);
CREATE INDEX idx_settlements_status ON payment_settlements(payment_status);
CREATE INDEX idx_settlements_stripe_payment ON payment_settlements(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Connections
CREATE INDEX idx_connections_business ON business_connections(business_profile_id);
CREATE INDEX idx_connections_connected ON business_connections(connected_business_profile_id);
CREATE INDEX idx_connections_type ON business_connections(connection_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE document_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_connections ENABLE ROW LEVEL SECURITY;

-- Document deliveries: sender or recipient can view
CREATE POLICY "Users can view deliveries they sent or received"
  ON document_deliveries FOR SELECT
  USING (
    sender_business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
    OR recipient_business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Senders can insert deliveries
CREATE POLICY "Users can create deliveries for their businesses"
  ON document_deliveries FOR INSERT
  WITH CHECK (
    sender_business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Senders and recipients can update delivery status
CREATE POLICY "Users can update deliveries they're involved in"
  ON document_deliveries FOR UPDATE
  USING (
    sender_business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
    OR recipient_business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Delivery events: visible to parties involved
CREATE POLICY "Users can view events for their deliveries"
  ON delivery_events FOR SELECT
  USING (
    delivery_id IN (
      SELECT id FROM document_deliveries
      WHERE sender_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
      OR recipient_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Disputes: visible to both parties
CREATE POLICY "Users can view disputes for their deliveries"
  ON document_disputes FOR SELECT
  USING (
    delivery_id IN (
      SELECT id FROM document_deliveries
      WHERE sender_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
      OR recipient_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Recipients can create disputes
CREATE POLICY "Recipients can create disputes"
  ON document_disputes FOR INSERT
  WITH CHECK (
    disputed_by_business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Threads: visible to both parties (except internal messages)
CREATE POLICY "Users can view thread messages for their deliveries"
  ON document_threads FOR SELECT
  USING (
    delivery_id IN (
      SELECT id FROM document_deliveries
      WHERE sender_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
      OR recipient_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
    AND (
      NOT is_internal
      OR author_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Users can post messages
CREATE POLICY "Users can post messages on their deliveries"
  ON document_threads FOR INSERT
  WITH CHECK (
    author_business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
    AND delivery_id IN (
      SELECT id FROM document_deliveries
      WHERE sender_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
      OR recipient_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Settlements: visible to both parties
CREATE POLICY "Users can view settlements for their deliveries"
  ON payment_settlements FOR SELECT
  USING (
    delivery_id IN (
      SELECT id FROM document_deliveries
      WHERE sender_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
      OR recipient_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Connections: users can view their own connections
CREATE POLICY "Users can view their business connections"
  ON business_connections FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_deliveries_updated_at
  BEFORE UPDATE ON document_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER document_disputes_updated_at
  BEFORE UPDATE ON document_disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER payment_settlements_updated_at
  BEFORE UPDATE ON payment_settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER business_connections_updated_at
  BEFORE UPDATE ON business_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_updated_at();

-- Log delivery status changes
CREATE OR REPLACE FUNCTION log_delivery_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
    INSERT INTO delivery_events (
      delivery_id,
      event_type,
      from_status,
      to_status,
      actor_user_id
    ) VALUES (
      NEW.id,
      NEW.delivery_status,
      OLD.delivery_status,
      NEW.delivery_status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_status_change_logger
  AFTER UPDATE ON document_deliveries
  FOR EACH ROW
  WHEN (OLD.delivery_status IS DISTINCT FROM NEW.delivery_status)
  EXECUTE FUNCTION log_delivery_status_change();

-- Track first view
CREATE OR REPLACE FUNCTION track_first_view()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.first_viewed_at IS NULL AND NEW.first_viewed_at IS NOT NULL THEN
    UPDATE document_deliveries
    SET delivery_status = 'viewed'
    WHERE id = NEW.id
    AND delivery_status = 'sent';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_delivery_first_view
  AFTER UPDATE ON document_deliveries
  FOR EACH ROW
  WHEN (OLD.first_viewed_at IS NULL AND NEW.first_viewed_at IS NOT NULL)
  EXECUTE FUNCTION track_first_view();

-- Update business connections on delivery
CREATE OR REPLACE FUNCTION update_business_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- Only if recipient is in network
  IF NEW.recipient_business_profile_id IS NOT NULL THEN
    INSERT INTO business_connections (
      business_profile_id,
      connected_business_profile_id,
      connection_type,
      total_documents_sent,
      last_interaction_at
    ) VALUES (
      NEW.sender_business_profile_id,
      NEW.recipient_business_profile_id,
      'client',
      1,
      NOW()
    )
    ON CONFLICT (business_profile_id, connected_business_profile_id)
    DO UPDATE SET
      total_documents_sent = business_connections.total_documents_sent + 1,
      last_interaction_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_on_delivery
  AFTER INSERT ON document_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_business_connection();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate secure public link token
CREATE OR REPLACE FUNCTION generate_public_link_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Check if business is in network
CREATE OR REPLACE FUNCTION is_business_in_network(nip_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_profiles WHERE tax_id = nip_to_check
  );
END;
$$ LANGUAGE plpgsql;

-- Get business inbox count
CREATE OR REPLACE FUNCTION get_inbox_count(profile_id UUID)
RETURNS TABLE (
  pending_count INTEGER,
  disputed_count INTEGER,
  requires_action_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE delivery_status IN ('sent', 'viewed'))::INTEGER as pending_count,
    COUNT(*) FILTER (WHERE delivery_status = 'disputed')::INTEGER as disputed_count,
    COUNT(*) FILTER (WHERE delivery_status IN ('sent', 'viewed', 'disputed'))::INTEGER as requires_action_count
  FROM document_deliveries
  WHERE recipient_business_profile_id = profile_id;
END;
$$ LANGUAGE plpgsql;

-- Get delivery with full context
CREATE OR REPLACE FUNCTION get_delivery_context(delivery_uuid UUID)
RETURNS TABLE (
  delivery_id UUID,
  document_type TEXT,
  document_id UUID,
  sender_name TEXT,
  recipient_name TEXT,
  delivery_status TEXT,
  has_dispute BOOLEAN,
  has_payment BOOLEAN,
  thread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dd.id,
    dd.document_type,
    dd.document_id,
    sender.name,
    COALESCE(recipient.name, dd.recipient_name),
    dd.delivery_status,
    EXISTS(SELECT 1 FROM document_disputes WHERE delivery_id = dd.id) as has_dispute,
    EXISTS(SELECT 1 FROM payment_settlements WHERE delivery_id = dd.id) as has_payment,
    (SELECT COUNT(*)::INTEGER FROM document_threads WHERE delivery_id = dd.id) as thread_count
  FROM document_deliveries dd
  LEFT JOIN business_profiles sender ON dd.sender_business_profile_id = sender.id
  LEFT JOIN business_profiles recipient ON dd.recipient_business_profile_id = recipient.id
  WHERE dd.id = delivery_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE document_deliveries IS 'Core delivery layer: documents move between companies with states that become accounting truth';
COMMENT ON TABLE delivery_events IS 'Audit trail for all delivery state changes';
COMMENT ON TABLE document_disputes IS 'Structured dispute management with resolution tracking';
COMMENT ON TABLE document_threads IS 'Document-scoped communication (no general chat)';
COMMENT ON TABLE payment_settlements IS 'Invoice → pay → settle → book flow';
COMMENT ON TABLE business_connections IS 'Track business relationships and reputation';

COMMENT ON COLUMN document_deliveries.delivery_method IS 'in_app (connected client) or public_link (fallback)';
COMMENT ON COLUMN document_deliveries.delivery_status IS 'State machine: sent → viewed → accepted/disputed/rejected → paid → settled';
COMMENT ON COLUMN document_disputes.dispute_reason IS 'Structured reasons prevent chaos';
COMMENT ON COLUMN document_threads.is_internal IS 'Internal notes only visible to sender team';
COMMENT ON COLUMN payment_settlements.stripe_payout_id IS 'Link to Stripe payout for clean bank reconciliation';
COMMENT ON COLUMN business_connections.trust_level IS 'Future: reputation based on delivery/payment behavior';
