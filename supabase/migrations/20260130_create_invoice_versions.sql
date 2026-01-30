-- Migration: Create invoice_versions table for invoice provenance/audit chain
-- Purpose: Store immutable snapshots of invoice state changes with tamper-evident hashing
-- Author: Invoice Provenance System
-- Date: 2026-01-30

-- Create invoice_versions table
CREATE TABLE IF NOT EXISTS public.invoice_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice reference
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    
    -- Version tracking
    version_number INTEGER NOT NULL,
    
    -- Canonical snapshot (immutable JSON representation)
    snapshot_data JSONB NOT NULL,
    snapshot_hash TEXT NOT NULL, -- SHA-256 hash of canonical snapshot
    
    -- Change metadata
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'draft_saved', 'issued', 'paid', 'unpaid', 'cancelled', 'corrected', 'modified')),
    change_reason TEXT, -- Optional reason for the change
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Business context
    business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    
    -- Chain integrity
    prev_version_id UUID REFERENCES public.invoice_versions(id),
    chain_hash TEXT, -- Hash of (prev_chain_hash || snapshot_hash) for tamper detection
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(invoice_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_invoice_versions_invoice_id ON public.invoice_versions(invoice_id);
CREATE INDEX idx_invoice_versions_business_profile_id ON public.invoice_versions(business_profile_id);
CREATE INDEX idx_invoice_versions_changed_at ON public.invoice_versions(changed_at DESC);
CREATE INDEX idx_invoice_versions_change_type ON public.invoice_versions(change_type);
CREATE INDEX idx_invoice_versions_chain ON public.invoice_versions(invoice_id, version_number);

-- Enable RLS
ALTER TABLE public.invoice_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view versions for their business profiles
CREATE POLICY "Users can view invoice versions for their business profiles"
    ON public.invoice_versions
    FOR SELECT
    USING (
        business_profile_id IN (
            SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Append-only - versions can only be inserted, never updated or deleted
CREATE POLICY "Invoice versions are append-only"
    ON public.invoice_versions
    FOR INSERT
    WITH CHECK (
        business_profile_id IN (
            SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
        )
        AND changed_by = auth.uid()
    );

-- RLS Policy: Block all updates (enforce immutability)
CREATE POLICY "Invoice versions cannot be updated"
    ON public.invoice_versions
    FOR UPDATE
    USING (false);

-- RLS Policy: Block all deletes (enforce immutability)
CREATE POLICY "Invoice versions cannot be deleted"
    ON public.invoice_versions
    FOR DELETE
    USING (false);

-- Add comment
COMMENT ON TABLE public.invoice_versions IS 'Immutable audit trail of invoice state changes with tamper-evident chain hashing';
COMMENT ON COLUMN public.invoice_versions.snapshot_data IS 'Canonical JSON snapshot of invoice state at this version';
COMMENT ON COLUMN public.invoice_versions.snapshot_hash IS 'SHA-256 hash of snapshot_data for integrity verification';
COMMENT ON COLUMN public.invoice_versions.chain_hash IS 'Tamper-evident hash chain: SHA-256(prev_chain_hash || snapshot_hash)';
COMMENT ON COLUMN public.invoice_versions.change_type IS 'Type of change: created, draft_saved, issued, paid, unpaid, cancelled, corrected, modified';
