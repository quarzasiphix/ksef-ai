-- Migration: Extend events table with version and chain references
-- Purpose: Link events to invoice versions and support event chain hashing
-- Author: Invoice Provenance System
-- Date: 2026-01-30

-- Add chain-related columns to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS entity_version_id UUID REFERENCES public.invoice_versions(id),
ADD COLUMN IF NOT EXISTS prev_event_id UUID REFERENCES public.events(id),
ADD COLUMN IF NOT EXISTS chain_hash TEXT,
ADD COLUMN IF NOT EXISTS payload_hash TEXT;

-- Create indexes for chain traversal
CREATE INDEX IF NOT EXISTS idx_events_entity_version_id ON public.events(entity_version_id);
CREATE INDEX IF NOT EXISTS idx_events_prev_event_id ON public.events(prev_event_id);
CREATE INDEX IF NOT EXISTS idx_events_chain ON public.events(entity_type, entity_id, created_at);

-- Add comments
COMMENT ON COLUMN public.events.entity_version_id IS 'Reference to invoice_versions record if entity_type is invoice';
COMMENT ON COLUMN public.events.prev_event_id IS 'Reference to previous event in the chain for this entity';
COMMENT ON COLUMN public.events.chain_hash IS 'Tamper-evident hash: SHA-256(prev_chain_hash || payload_hash)';
COMMENT ON COLUMN public.events.payload_hash IS 'SHA-256 hash of the event payload for integrity verification';
