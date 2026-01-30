-- Migration: Extend invoices table with version tracking fields
-- Purpose: Add fields to track current version and enable provenance system
-- Author: Invoice Provenance System
-- Date: 2026-01-30

-- Add version tracking columns to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS current_version_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.invoice_versions(id),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);

-- Create index for version lookups
CREATE INDEX IF NOT EXISTS idx_invoices_current_version_id ON public.invoices(current_version_id);
CREATE INDEX IF NOT EXISTS idx_invoices_is_locked ON public.invoices(is_locked) WHERE is_locked = TRUE;

-- Add trigger to prevent direct updates on locked invoices
CREATE OR REPLACE FUNCTION prevent_locked_invoice_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates via RPCs (check if called from RPC context)
    IF current_setting('app.bypass_invoice_lock', true) = 'true' THEN
        RETURN NEW;
    END IF;
    
    -- Block direct updates on locked invoices
    IF OLD.is_locked = TRUE AND (
        OLD.status != NEW.status OR
        OLD.total_amount != NEW.total_amount OR
        OLD.invoice_number != NEW.invoice_number OR
        OLD.issue_date != NEW.issue_date
    ) THEN
        RAISE EXCEPTION 'Cannot directly update locked invoice. Use RPC functions for state changes.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_prevent_locked_invoice_updates ON public.invoices;
CREATE TRIGGER trigger_prevent_locked_invoice_updates
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_invoice_updates();

-- Add comments
COMMENT ON COLUMN public.invoices.current_version_number IS 'Current version number of this invoice (incremented on each state change)';
COMMENT ON COLUMN public.invoices.current_version_id IS 'Reference to the latest invoice_versions record';
COMMENT ON COLUMN public.invoices.is_locked IS 'TRUE when invoice is issued or paid, preventing direct edits';
COMMENT ON COLUMN public.invoices.locked_at IS 'Timestamp when invoice was locked';
COMMENT ON COLUMN public.invoices.locked_by IS 'User who locked the invoice';
