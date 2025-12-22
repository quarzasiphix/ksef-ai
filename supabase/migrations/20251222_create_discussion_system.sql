-- Discussion System for Invoice Communication
-- Creates discussion_threads, discussion_messages, and discussion_participants tables

-- ============================================================================
-- DISCUSSION THREADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to invoice
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Thread owner
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Thread metadata
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
  
  -- Stats
  participant_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discussion_threads_invoice_id ON discussion_threads(invoice_id);
CREATE INDEX idx_discussion_threads_business_profile_id ON discussion_threads(business_profile_id);
CREATE INDEX idx_discussion_threads_status ON discussion_threads(status);

-- ============================================================================
-- DISCUSSION MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS discussion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Thread reference
  thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  
  -- Author
  user_id UUID NOT NULL REFERENCES auth.users(id),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Message content
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'status_change', 'attachment')),
  
  -- Attachments
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size BIGINT,
  
  -- Metadata
  is_internal BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  reply_to_message_id UUID REFERENCES discussion_messages(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discussion_messages_thread_id ON discussion_messages(thread_id);
CREATE INDEX idx_discussion_messages_user_id ON discussion_messages(user_id);
CREATE INDEX idx_discussion_messages_created_at ON discussion_messages(created_at);

-- ============================================================================
-- DISCUSSION PARTICIPANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS discussion_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Thread and user
  thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Role
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'viewer')),
  
  -- Read tracking
  last_read_at TIMESTAMPTZ,
  unread_count INT DEFAULT 0,
  
  -- Settings
  notifications_enabled BOOLEAN DEFAULT true,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one participant per thread per user
  UNIQUE(thread_id, user_id)
);

CREATE INDEX idx_discussion_participants_thread_id ON discussion_participants(thread_id);
CREATE INDEX idx_discussion_participants_user_id ON discussion_participants(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_participants ENABLE ROW LEVEL SECURITY;

-- Discussion Threads Policies
-- Users can view threads for invoices they own or received
CREATE POLICY "Users can view accessible discussion threads"
  ON discussion_threads FOR SELECT
  USING (
    -- Owner of the invoice
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = discussion_threads.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR
    -- Receiver of the invoice (via shares)
    EXISTS (
      SELECT 1 FROM invoice_shares
      WHERE invoice_shares.invoice_id = discussion_threads.invoice_id
      AND invoice_shares.receiver_user_id = auth.uid()
    )
    OR
    -- Thread owner
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Users can create threads for their own invoices
CREATE POLICY "Users can create discussion threads for own invoices"
  ON discussion_threads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = discussion_threads.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Users can update threads they own
CREATE POLICY "Users can update own discussion threads"
  ON discussion_threads FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Discussion Messages Policies
-- Users can view messages in threads they have access to
CREATE POLICY "Users can view messages in accessible threads"
  ON discussion_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM discussion_threads
      WHERE 
        -- Owner of the invoice
        EXISTS (
          SELECT 1 FROM invoices
          WHERE invoices.id = discussion_threads.invoice_id
          AND invoices.user_id = auth.uid()
        )
        OR
        -- Receiver of the invoice
        EXISTS (
          SELECT 1 FROM invoice_shares
          WHERE invoice_shares.invoice_id = discussion_threads.invoice_id
          AND invoice_shares.receiver_user_id = auth.uid()
        )
        OR
        -- Thread owner
        discussion_threads.business_profile_id IN (
          SELECT id FROM business_profiles WHERE user_id = auth.uid()
        )
    )
  );

-- Users can post messages to threads they have access to
CREATE POLICY "Users can post messages to accessible threads"
  ON discussion_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    thread_id IN (
      SELECT id FROM discussion_threads
      WHERE 
        EXISTS (
          SELECT 1 FROM invoices
          WHERE invoices.id = discussion_threads.invoice_id
          AND invoices.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM invoice_shares
          WHERE invoice_shares.invoice_id = discussion_threads.invoice_id
          AND invoice_shares.receiver_user_id = auth.uid()
        )
        OR
        discussion_threads.business_profile_id IN (
          SELECT id FROM business_profiles WHERE user_id = auth.uid()
        )
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON discussion_messages FOR UPDATE
  USING (user_id = auth.uid());

-- Discussion Participants Policies
-- Users can view participants in threads they have access to
CREATE POLICY "Users can view participants in accessible threads"
  ON discussion_participants FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM discussion_threads
      WHERE 
        EXISTS (
          SELECT 1 FROM invoices
          WHERE invoices.id = discussion_threads.invoice_id
          AND invoices.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM invoice_shares
          WHERE invoice_shares.invoice_id = discussion_threads.invoice_id
          AND invoice_shares.receiver_user_id = auth.uid()
        )
        OR
        discussion_threads.business_profile_id IN (
          SELECT id FROM business_profiles WHERE user_id = auth.uid()
        )
    )
  );

-- Users can manage their own participation
CREATE POLICY "Users can manage own participation"
  ON discussion_participants FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to mark thread as read
CREATE OR REPLACE FUNCTION mark_thread_as_read(p_thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE discussion_participants
  SET 
    last_read_at = NOW(),
    unread_count = 0
  WHERE thread_id = p_thread_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update thread's last_message_at
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discussion_threads
  SET 
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_last_message
  AFTER INSERT ON discussion_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message();

-- Trigger to increment unread count for participants
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discussion_participants
  SET unread_count = unread_count + 1
  WHERE thread_id = NEW.thread_id
  AND user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_unread_count
  AFTER INSERT ON discussion_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();
