-- Migration: Backfill invoice versions for existing invoices
-- Purpose: Create initial version snapshots for all existing invoices
-- Author: Invoice Provenance System
-- Date: 2026-01-30
-- WARNING: This migration should be run after all other provenance migrations

-- Backfill function to create initial versions for existing invoices
CREATE OR REPLACE FUNCTION backfill_invoice_versions()
RETURNS TABLE (
    invoice_id UUID,
    version_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_invoice RECORD;
    v_version_id UUID;
    v_error TEXT;
BEGIN
    -- Process each invoice that doesn't have a version yet
    FOR v_invoice IN
        SELECT i.*
        FROM invoices i
        LEFT JOIN invoice_versions iv ON i.id = iv.invoice_id
        WHERE iv.id IS NULL
        ORDER BY i.created_at ASC
    LOOP
        BEGIN
            -- Determine change type based on current status
            v_version_id := create_invoice_version(
                v_invoice.id,
                CASE 
                    WHEN v_invoice.status = 'issued' THEN 'issued'
                    WHEN v_invoice.payment_status = 'paid' THEN 'paid'
                    WHEN v_invoice.status = 'cancelled' THEN 'cancelled'
                    ELSE 'created'
                END,
                'Initial version created during backfill migration',
                v_invoice.business_profile_id
            );
            
            -- Update invoice lock status if it should be locked
            IF v_invoice.status IN ('issued', 'paid', 'cancelled') THEN
                UPDATE invoices
                SET 
                    is_locked = TRUE,
                    locked_at = COALESCE(v_invoice.issue_date, v_invoice.created_at),
                    locked_by = v_invoice.user_id
                WHERE id = v_invoice.id;
            END IF;
            
            -- Return success
            invoice_id := v_invoice.id;
            version_id := v_version_id;
            success := TRUE;
            error_message := NULL;
            RETURN NEXT;
            
        EXCEPTION WHEN OTHERS THEN
            -- Return error
            invoice_id := v_invoice.id;
            version_id := NULL;
            success := FALSE;
            error_message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute backfill (commented out by default - uncomment to run)
-- SELECT * FROM backfill_invoice_versions();

-- Add comment
COMMENT ON FUNCTION backfill_invoice_versions IS 'Backfills initial versions for all existing invoices without versions';

-- Note: After running this migration, you should:
-- 1. Uncomment the SELECT statement above and run it
-- 2. Verify all invoices have versions: SELECT COUNT(*) FROM invoices WHERE current_version_id IS NULL;
-- 3. Check for any errors in the backfill results
-- 4. Create corresponding events for backfilled versions if needed
