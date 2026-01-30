-- Migration: Helper functions for invoice provenance system
-- Purpose: Canonical snapshot creation, hashing, and chain management
-- Author: Invoice Provenance System
-- Date: 2026-01-30

-- Function to create canonical snapshot of invoice
CREATE OR REPLACE FUNCTION create_invoice_snapshot(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_snapshot JSONB;
BEGIN
    -- Create canonical JSON snapshot with deterministic field ordering
    SELECT jsonb_build_object(
        'invoice_id', i.id,
        'invoice_number', i.invoice_number,
        'issue_date', i.issue_date,
        'sale_date', i.sale_date,
        'due_date', i.due_date,
        'status', i.status,
        'payment_status', i.payment_status,
        'business_profile_id', i.business_profile_id,
        'customer_id', i.customer_id,
        'total_amount', i.total_amount,
        'total_net', i.total_net,
        'total_vat', i.total_vat,
        'currency', i.currency,
        'payment_method', i.payment_method,
        'notes', i.notes,
        'items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', ii.name,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'vat_rate', ii.vat_rate,
                    'net_amount', ii.net_amount,
                    'vat_amount', ii.vat_amount,
                    'gross_amount', ii.gross_amount,
                    'unit', ii.unit
                ) ORDER BY ii.id
            )
            FROM invoice_items ii
            WHERE ii.invoice_id = i.id
        )
    ) INTO v_snapshot
    FROM invoices i
    WHERE i.id = p_invoice_id;
    
    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compute SHA-256 hash of JSONB data
CREATE OR REPLACE FUNCTION compute_hash(p_data JSONB)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(p_data::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to compute chain hash
CREATE OR REPLACE FUNCTION compute_chain_hash(p_prev_chain_hash TEXT, p_current_hash TEXT)
RETURNS TEXT AS $$
BEGIN
    IF p_prev_chain_hash IS NULL THEN
        RETURN p_current_hash;
    END IF;
    RETURN encode(digest(p_prev_chain_hash || p_current_hash, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get the latest version for an invoice
CREATE OR REPLACE FUNCTION get_latest_invoice_version(p_invoice_id UUID)
RETURNS TABLE (
    version_id UUID,
    version_number INTEGER,
    chain_hash TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT iv.id, iv.version_number, iv.chain_hash
    FROM invoice_versions iv
    WHERE iv.invoice_id = p_invoice_id
    ORDER BY iv.version_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new invoice version
CREATE OR REPLACE FUNCTION create_invoice_version(
    p_invoice_id UUID,
    p_change_type TEXT,
    p_change_reason TEXT DEFAULT NULL,
    p_business_profile_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_snapshot JSONB;
    v_snapshot_hash TEXT;
    v_prev_version RECORD;
    v_new_version_number INTEGER;
    v_chain_hash TEXT;
    v_new_version_id UUID;
    v_business_profile_id UUID;
BEGIN
    -- Get business profile ID if not provided
    IF p_business_profile_id IS NULL THEN
        SELECT business_profile_id INTO v_business_profile_id
        FROM invoices
        WHERE id = p_invoice_id;
    ELSE
        v_business_profile_id := p_business_profile_id;
    END IF;
    
    -- Create canonical snapshot
    v_snapshot := create_invoice_snapshot(p_invoice_id);
    v_snapshot_hash := compute_hash(v_snapshot);
    
    -- Get previous version
    SELECT * INTO v_prev_version
    FROM get_latest_invoice_version(p_invoice_id);
    
    -- Calculate new version number
    IF v_prev_version IS NULL THEN
        v_new_version_number := 1;
        v_chain_hash := v_snapshot_hash;
    ELSE
        v_new_version_number := v_prev_version.version_number + 1;
        v_chain_hash := compute_chain_hash(v_prev_version.chain_hash, v_snapshot_hash);
    END IF;
    
    -- Insert new version
    INSERT INTO invoice_versions (
        invoice_id,
        version_number,
        snapshot_data,
        snapshot_hash,
        change_type,
        change_reason,
        changed_by,
        business_profile_id,
        prev_version_id,
        chain_hash
    ) VALUES (
        p_invoice_id,
        v_new_version_number,
        v_snapshot,
        v_snapshot_hash,
        p_change_type,
        p_change_reason,
        auth.uid(),
        v_business_profile_id,
        v_prev_version.version_id,
        v_chain_hash
    ) RETURNING id INTO v_new_version_id;
    
    -- Update invoice with current version
    UPDATE invoices
    SET 
        current_version_number = v_new_version_number,
        current_version_id = v_new_version_id
    WHERE id = p_invoice_id;
    
    RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION create_invoice_snapshot IS 'Creates a canonical JSONB snapshot of an invoice with deterministic field ordering';
COMMENT ON FUNCTION compute_hash IS 'Computes SHA-256 hash of JSONB data';
COMMENT ON FUNCTION compute_chain_hash IS 'Computes tamper-evident chain hash from previous hash and current hash';
COMMENT ON FUNCTION get_latest_invoice_version IS 'Returns the latest version record for an invoice';
COMMENT ON FUNCTION create_invoice_version IS 'Creates a new invoice version with snapshot and chain hash';
