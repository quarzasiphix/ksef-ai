-- Migration: RPC function for invoice chain verification
-- Purpose: Verify integrity of invoice version chain and detect tampering
-- Author: Invoice Provenance System
-- Date: 2026-01-30

-- RPC: Verify invoice chain integrity
CREATE OR REPLACE FUNCTION rpc_verify_invoice_chain(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_version RECORD;
    v_prev_chain_hash TEXT;
    v_computed_snapshot_hash TEXT;
    v_computed_chain_hash TEXT;
    v_version_count INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_is_valid BOOLEAN := TRUE;
BEGIN
    -- Verify each version in the chain
    FOR v_version IN
        SELECT *
        FROM invoice_versions
        WHERE invoice_id = p_invoice_id
        ORDER BY version_number ASC
    LOOP
        v_version_count := v_version_count + 1;
        
        -- Verify snapshot hash
        v_computed_snapshot_hash := compute_hash(v_version.snapshot_data);
        IF v_computed_snapshot_hash != v_version.snapshot_hash THEN
            v_is_valid := FALSE;
            v_errors := v_errors || jsonb_build_object(
                'version_number', v_version.version_number,
                'version_id', v_version.id,
                'error_type', 'snapshot_hash_mismatch',
                'expected', v_version.snapshot_hash,
                'computed', v_computed_snapshot_hash,
                'message', 'Snapshot data has been tampered with'
            );
        END IF;
        
        -- Verify chain hash
        IF v_version.version_number = 1 THEN
            -- First version: chain_hash should equal snapshot_hash
            IF v_version.chain_hash != v_version.snapshot_hash THEN
                v_is_valid := FALSE;
                v_errors := v_errors || jsonb_build_object(
                    'version_number', v_version.version_number,
                    'version_id', v_version.id,
                    'error_type', 'initial_chain_hash_invalid',
                    'expected', v_version.snapshot_hash,
                    'actual', v_version.chain_hash,
                    'message', 'Initial chain hash should equal snapshot hash'
                );
            END IF;
            v_prev_chain_hash := v_version.chain_hash;
        ELSE
            -- Subsequent versions: verify chain continuity
            v_computed_chain_hash := compute_chain_hash(v_prev_chain_hash, v_version.snapshot_hash);
            IF v_computed_chain_hash != v_version.chain_hash THEN
                v_is_valid := FALSE;
                v_errors := v_errors || jsonb_build_object(
                    'version_number', v_version.version_number,
                    'version_id', v_version.id,
                    'error_type', 'chain_hash_mismatch',
                    'expected', v_version.chain_hash,
                    'computed', v_computed_chain_hash,
                    'message', 'Chain hash does not match computed value - chain may be broken'
                );
            END IF;
            v_prev_chain_hash := v_version.chain_hash;
        END IF;
        
        -- Verify prev_version_id linkage
        IF v_version.version_number > 1 AND v_version.prev_version_id IS NULL THEN
            v_is_valid := FALSE;
            v_errors := v_errors || jsonb_build_object(
                'version_number', v_version.version_number,
                'version_id', v_version.id,
                'error_type', 'missing_prev_version_link',
                'message', 'Previous version link is missing'
            );
        END IF;
    END LOOP;
    
    -- Check if any versions exist
    IF v_version_count = 0 THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'invoice_id', p_invoice_id,
            'version_count', 0,
            'errors', jsonb_build_array(jsonb_build_object(
                'error_type', 'no_versions',
                'message', 'No versions found for this invoice'
            ))
        );
    END IF;
    
    -- Return verification result
    RETURN jsonb_build_object(
        'valid', v_is_valid,
        'invoice_id', p_invoice_id,
        'version_count', v_version_count,
        'errors', v_errors,
        'verified_at', NOW(),
        'verified_by', auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get invoice audit trail
CREATE OR REPLACE FUNCTION rpc_get_invoice_audit_trail(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_versions JSONB;
    v_events JSONB;
    v_verification JSONB;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Get all versions
    SELECT jsonb_agg(
        jsonb_build_object(
            'version_id', iv.id,
            'version_number', iv.version_number,
            'change_type', iv.change_type,
            'change_reason', iv.change_reason,
            'changed_by', iv.changed_by,
            'changed_at', iv.changed_at,
            'snapshot_hash', iv.snapshot_hash,
            'chain_hash', iv.chain_hash,
            'snapshot_data', iv.snapshot_data
        ) ORDER BY iv.version_number ASC
    ) INTO v_versions
    FROM invoice_versions iv
    WHERE iv.invoice_id = p_invoice_id;
    
    -- Get all related events
    SELECT jsonb_agg(
        jsonb_build_object(
            'event_id', e.id,
            'event_type', e.event_type,
            'actor_id', e.actor_id,
            'created_at', e.created_at,
            'entity_version_id', e.entity_version_id,
            'payload', e.payload,
            'payload_hash', e.payload_hash
        ) ORDER BY e.created_at ASC
    ) INTO v_events
    FROM events e
    WHERE e.entity_type = 'invoice' AND e.entity_id = p_invoice_id;
    
    -- Verify chain
    v_verification := rpc_verify_invoice_chain(p_invoice_id);
    
    -- Return complete audit trail
    RETURN jsonb_build_object(
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice.invoice_number,
        'current_status', v_invoice.status,
        'is_locked', v_invoice.is_locked,
        'current_version_number', v_invoice.current_version_number,
        'versions', COALESCE(v_versions, '[]'::JSONB),
        'events', COALESCE(v_events, '[]'::JSONB),
        'verification', v_verification,
        'retrieved_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Export audit proof (simplified version for export)
CREATE OR REPLACE FUNCTION rpc_export_invoice_audit_proof(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_audit_trail JSONB;
    v_invoice RECORD;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Get full audit trail
    v_audit_trail := rpc_get_invoice_audit_trail(p_invoice_id);
    
    -- Return exportable proof
    RETURN jsonb_build_object(
        'proof_type', 'invoice_audit_chain',
        'proof_version', '1.0',
        'generated_at', NOW(),
        'generated_by', auth.uid(),
        'invoice', jsonb_build_object(
            'id', p_invoice_id,
            'invoice_number', v_invoice.invoice_number,
            'issue_date', v_invoice.issue_date,
            'total_amount', v_invoice.total_amount,
            'currency', v_invoice.currency,
            'status', v_invoice.status,
            'is_locked', v_invoice.is_locked
        ),
        'audit_trail', v_audit_trail,
        'instructions', 'This proof can be independently verified by recomputing all hashes and checking chain continuity. Each version snapshot_hash is SHA-256(snapshot_data). Each chain_hash is SHA-256(prev_chain_hash || snapshot_hash).'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION rpc_verify_invoice_chain IS 'Verifies integrity of invoice version chain by recomputing all hashes';
COMMENT ON FUNCTION rpc_get_invoice_audit_trail IS 'Returns complete audit trail with versions, events, and verification status';
COMMENT ON FUNCTION rpc_export_invoice_audit_proof IS 'Exports complete audit proof for external verification';
