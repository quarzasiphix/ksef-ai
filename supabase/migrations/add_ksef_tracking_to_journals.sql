-- Migration: Add KSeF tracking to journal entries
-- Purpose: Link journal entries to KSeF submissions for audit trail and compliance

-- Add KSeF reference fields to journal_entries
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS ksef_reference_number TEXT,
ADD COLUMN IF NOT EXISTS ksef_session_reference_number TEXT,
ADD COLUMN IF NOT EXISTS ksef_upo_url TEXT;

-- Create unique constraint to prevent duplicate journals for same source
-- This ensures idempotency: one invoice = one journal entry
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_source_unique
ON journal_entries(source_type, source_id)
WHERE source_id IS NOT NULL;

-- Add index for KSeF reference lookups
CREATE INDEX IF NOT EXISTS idx_journal_entries_ksef_reference
ON journal_entries(ksef_reference_number)
WHERE ksef_reference_number IS NOT NULL;

-- Add accounting posting policy to business_profiles
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS accounting_post_on TEXT DEFAULT 'ksef_submitted'
CHECK (accounting_post_on IN ('ksef_submitted', 'upo_available', 'manual'));

-- Comment on new columns
COMMENT ON COLUMN journal_entries.ksef_reference_number IS 'KSeF reference number from successful submission';
COMMENT ON COLUMN journal_entries.ksef_session_reference_number IS 'KSeF session reference for batch tracking';
COMMENT ON COLUMN journal_entries.ksef_upo_url IS 'URL to KSeF UPO (confirmation document)';
COMMENT ON COLUMN business_profiles.accounting_post_on IS 'Policy for when to trigger accounting posting: ksef_submitted (post on KSeF success), upo_available (wait for UPO), manual (only via review queue)';
