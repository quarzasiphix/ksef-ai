-- Migration: RPC functions for invoice state management with provenance
-- Purpose: Enforce controlled invoice state changes with version tracking
-- Author: Invoice Provenance System
-- Date: 2026-01-30

-- RPC: Save invoice draft (allows updates before issuing)
CREATE OR REPLACE FUNCTION rpc_invoice_save_draft(
    p_invoice_id UUID,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_version_id UUID;
    v_event_id UUID;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Check if invoice is locked
    IF v_invoice.is_locked THEN
        RAISE EXCEPTION 'Cannot save draft for locked invoice. Use rpc_invoice_apply_change for corrections.';
    END IF;
    
    -- Check status
    IF v_invoice.status NOT IN ('draft', 'pending') THEN
        RAISE EXCEPTION 'Can only save drafts for invoices in draft or pending status';
    END IF;
    
    -- Create version snapshot
    v_version_id := create_invoice_version(
        p_invoice_id,
        'draft_saved',
        p_change_reason,
        v_invoice.business_profile_id
    );
    
    -- Create event
    INSERT INTO events (
        business_profile_id,
        event_type,
        actor_id,
        entity_type,
        entity_id,
        entity_version_id,
        payload,
        payload_hash
    ) VALUES (
        v_invoice.business_profile_id,
        'invoice_draft_saved',
        auth.uid(),
        'invoice',
        p_invoice_id,
        v_version_id,
        jsonb_build_object(
            'invoice_id', p_invoice_id,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ),
        compute_hash(jsonb_build_object(
            'invoice_id', p_invoice_id,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ))
    ) RETURNING id INTO v_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'version_id', v_version_id,
        'event_id', v_event_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Issue invoice (locks invoice and creates version)
CREATE OR REPLACE FUNCTION rpc_invoice_issue(
    p_invoice_id UUID,
    p_invoice_number TEXT,
    p_issue_date DATE DEFAULT CURRENT_DATE,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_version_id UUID;
    v_event_id UUID;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Check if already issued
    IF v_invoice.is_locked THEN
        RAISE EXCEPTION 'Invoice is already issued/locked';
    END IF;
    
    -- Check status
    IF v_invoice.status NOT IN ('draft', 'pending') THEN
        RAISE EXCEPTION 'Can only issue invoices in draft or pending status';
    END IF;
    
    -- Enable bypass for this transaction
    PERFORM set_config('app.bypass_invoice_lock', 'true', true);
    
    -- Update invoice status and lock it
    UPDATE invoices
    SET 
        status = 'issued',
        invoice_number = p_invoice_number,
        issue_date = p_issue_date,
        is_locked = TRUE,
        locked_at = NOW(),
        locked_by = auth.uid()
    WHERE id = p_invoice_id;
    
    -- Create version snapshot
    v_version_id := create_invoice_version(
        p_invoice_id,
        'issued',
        p_change_reason,
        v_invoice.business_profile_id
    );
    
    -- Create event
    INSERT INTO events (
        business_profile_id,
        event_type,
        actor_id,
        entity_type,
        entity_id,
        entity_version_id,
        payload,
        payload_hash
    ) VALUES (
        v_invoice.business_profile_id,
        'invoice_issued',
        auth.uid(),
        'invoice',
        p_invoice_id,
        v_version_id,
        jsonb_build_object(
            'invoice_id', p_invoice_id,
            'invoice_number', p_invoice_number,
            'issue_date', p_issue_date,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ),
        compute_hash(jsonb_build_object(
            'invoice_id', p_invoice_id,
            'invoice_number', p_invoice_number,
            'issue_date', p_issue_date,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ))
    ) RETURNING id INTO v_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'version_id', v_version_id,
        'event_id', v_event_id,
        'invoice_number', p_invoice_number
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Mark invoice as paid
CREATE OR REPLACE FUNCTION rpc_invoice_mark_paid(
    p_invoice_id UUID,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_payment_method TEXT DEFAULT NULL,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_version_id UUID;
    v_event_id UUID;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Check if invoice is issued
    IF NOT v_invoice.is_locked THEN
        RAISE EXCEPTION 'Can only mark issued invoices as paid';
    END IF;
    
    -- Check if already paid
    IF v_invoice.payment_status = 'paid' THEN
        RAISE EXCEPTION 'Invoice is already marked as paid';
    END IF;
    
    -- Enable bypass for this transaction
    PERFORM set_config('app.bypass_invoice_lock', 'true', true);
    
    -- Update invoice payment status
    UPDATE invoices
    SET 
        payment_status = 'paid',
        payment_date = p_payment_date,
        payment_method = COALESCE(p_payment_method, payment_method)
    WHERE id = p_invoice_id;
    
    -- Create version snapshot
    v_version_id := create_invoice_version(
        p_invoice_id,
        'paid',
        p_change_reason,
        v_invoice.business_profile_id
    );
    
    -- Create event
    INSERT INTO events (
        business_profile_id,
        event_type,
        actor_id,
        entity_type,
        entity_id,
        entity_version_id,
        payload,
        payload_hash
    ) VALUES (
        v_invoice.business_profile_id,
        'invoice_paid',
        auth.uid(),
        'invoice',
        p_invoice_id,
        v_version_id,
        jsonb_build_object(
            'invoice_id', p_invoice_id,
            'payment_date', p_payment_date,
            'payment_method', p_payment_method,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ),
        compute_hash(jsonb_build_object(
            'invoice_id', p_invoice_id,
            'payment_date', p_payment_date,
            'payment_method', p_payment_method,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ))
    ) RETURNING id INTO v_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'version_id', v_version_id,
        'event_id', v_event_id,
        'payment_date', p_payment_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Unmark invoice as paid (revert to unpaid)
CREATE OR REPLACE FUNCTION rpc_invoice_unmark_paid(
    p_invoice_id UUID,
    p_change_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_version_id UUID;
    v_event_id UUID;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Check if invoice is paid
    IF v_invoice.payment_status != 'paid' THEN
        RAISE EXCEPTION 'Invoice is not marked as paid';
    END IF;
    
    -- Require change reason for audit trail
    IF p_change_reason IS NULL OR p_change_reason = '' THEN
        RAISE EXCEPTION 'Change reason is required when unmarking invoice as paid';
    END IF;
    
    -- Enable bypass for this transaction
    PERFORM set_config('app.bypass_invoice_lock', 'true', true);
    
    -- Update invoice payment status
    UPDATE invoices
    SET 
        payment_status = 'unpaid',
        payment_date = NULL
    WHERE id = p_invoice_id;
    
    -- Create version snapshot
    v_version_id := create_invoice_version(
        p_invoice_id,
        'unpaid',
        p_change_reason,
        v_invoice.business_profile_id
    );
    
    -- Create event
    INSERT INTO events (
        business_profile_id,
        event_type,
        actor_id,
        entity_type,
        entity_id,
        entity_version_id,
        payload,
        payload_hash
    ) VALUES (
        v_invoice.business_profile_id,
        'invoice_unpaid',
        auth.uid(),
        'invoice',
        p_invoice_id,
        v_version_id,
        jsonb_build_object(
            'invoice_id', p_invoice_id,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ),
        compute_hash(jsonb_build_object(
            'invoice_id', p_invoice_id,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ))
    ) RETURNING id INTO v_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'version_id', v_version_id,
        'event_id', v_event_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Apply change to locked invoice (for corrections)
CREATE OR REPLACE FUNCTION rpc_invoice_apply_change(
    p_invoice_id UUID,
    p_change_type TEXT,
    p_change_reason TEXT,
    p_changes JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_version_id UUID;
    v_event_id UUID;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Check if invoice is locked
    IF NOT v_invoice.is_locked THEN
        RAISE EXCEPTION 'Can only apply changes to locked invoices. Use normal update for drafts.';
    END IF;
    
    -- Require change reason for audit trail
    IF p_change_reason IS NULL OR p_change_reason = '' THEN
        RAISE EXCEPTION 'Change reason is required when modifying locked invoice';
    END IF;
    
    -- Validate change type
    IF p_change_type NOT IN ('corrected', 'modified', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid change type. Must be: corrected, modified, or cancelled';
    END IF;
    
    -- Enable bypass for this transaction
    PERFORM set_config('app.bypass_invoice_lock', 'true', true);
    
    -- Apply changes based on type
    IF p_change_type = 'cancelled' THEN
        UPDATE invoices
        SET status = 'cancelled'
        WHERE id = p_invoice_id;
    ELSE
        -- Apply specific field changes from p_changes JSONB
        -- This is a simplified version - in production, you'd validate each field
        UPDATE invoices
        SET 
            notes = COALESCE((p_changes->>'notes')::text, notes),
            due_date = COALESCE((p_changes->>'due_date')::date, due_date)
        WHERE id = p_invoice_id;
    END IF;
    
    -- Create version snapshot
    v_version_id := create_invoice_version(
        p_invoice_id,
        p_change_type,
        p_change_reason,
        v_invoice.business_profile_id
    );
    
    -- Create event
    INSERT INTO events (
        business_profile_id,
        event_type,
        actor_id,
        entity_type,
        entity_id,
        entity_version_id,
        payload,
        payload_hash
    ) VALUES (
        v_invoice.business_profile_id,
        'invoice_' || p_change_type,
        auth.uid(),
        'invoice',
        p_invoice_id,
        v_version_id,
        jsonb_build_object(
            'invoice_id', p_invoice_id,
            'change_type', p_change_type,
            'changes', p_changes,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ),
        compute_hash(jsonb_build_object(
            'invoice_id', p_invoice_id,
            'change_type', p_change_type,
            'changes', p_changes,
            'version_id', v_version_id,
            'change_reason', p_change_reason
        ))
    ) RETURNING id INTO v_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'version_id', v_version_id,
        'event_id', v_event_id,
        'change_type', p_change_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION rpc_invoice_save_draft IS 'Save draft invoice with version tracking (before issuing)';
COMMENT ON FUNCTION rpc_invoice_issue IS 'Issue invoice, lock it, and create immutable version';
COMMENT ON FUNCTION rpc_invoice_mark_paid IS 'Mark issued invoice as paid with version tracking';
COMMENT ON FUNCTION rpc_invoice_unmark_paid IS 'Unmark invoice as paid (requires reason for audit)';
COMMENT ON FUNCTION rpc_invoice_apply_change IS 'Apply controlled changes to locked invoices (corrections, cancellations)';
