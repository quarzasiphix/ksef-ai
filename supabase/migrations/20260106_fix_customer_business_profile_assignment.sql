-- ============================================================================
-- Migration: Fix Customer-to-Business-Profile Assignment
-- Date: 2026-01-06
-- ============================================================================
-- Problem: Previous backfill (20251227) was incorrect and created bad groupings.
-- Solution: Reset and recompute ownership from invoice evidence with strict rules.
--
-- Rules:
-- 1. Reset all customers.business_profile_id = NULL
-- 2. Match customers to business profiles via invoices using:
--    - Primary: invoices.customer_id (strongest link)
--    - Fallback: normalized NIP (10 digits, no spaces/dashes)
-- 3. Assignment logic:
--    - If exactly ONE business_profile_id issued invoices → assign it
--    - If MULTIPLE business_profile_ids issued invoices → keep NULL (conflict)
--    - If NO invoice evidence → keep NULL (unassigned)
-- ============================================================================

-- ============================================================================
-- STEP 1: Reset all customer business_profile_id assignments
-- ============================================================================
UPDATE customers
SET business_profile_id = NULL,
    is_shared = false
WHERE business_profile_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Helper function to normalize NIP (remove spaces, dashes, ensure 10 digits)
-- ============================================================================
CREATE OR REPLACE FUNCTION normalize_nip(nip TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF nip IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  nip := regexp_replace(nip, '[^0-9]', '', 'g');
  
  -- Return only if exactly 10 digits
  IF length(nip) = 10 THEN
    RETURN nip;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ============================================================================
-- STEP 3: Create temporary table with invoice evidence
-- ============================================================================
-- This aggregates all invoice evidence linking customers to business profiles
-- Note: We only use customer_id for matching since invoices table doesn't store NIP
CREATE TEMP TABLE customer_invoice_evidence AS
WITH invoice_links AS (
  -- Link via customer_id (only available evidence)
  SELECT DISTINCT
    i.customer_id,
    i.business_profile_id
  FROM invoices i
  WHERE i.customer_id IS NOT NULL
    AND i.business_profile_id IS NOT NULL
),
profile_counts AS (
  -- Count how many distinct business_profile_ids issued invoices for each customer
  SELECT
    customer_id,
    COUNT(DISTINCT business_profile_id) AS profile_count,
    -- Get the single profile_id if count = 1, otherwise NULL
    -- Use array_agg to get the profile_id when there's only one
    CASE
      WHEN COUNT(DISTINCT business_profile_id) = 1 
      THEN (array_agg(DISTINCT business_profile_id))[1]
      ELSE NULL
    END AS assigned_profile_id
  FROM invoice_links
  GROUP BY customer_id
)
SELECT
  customer_id,
  profile_count,
  assigned_profile_id
FROM profile_counts;

-- ============================================================================
-- STEP 4: Update customers with deterministic assignments
-- ============================================================================
-- Only assign if exactly ONE business_profile_id has invoice evidence
UPDATE customers c
SET business_profile_id = e.assigned_profile_id
FROM customer_invoice_evidence e
WHERE c.id = e.customer_id
  AND e.profile_count = 1
  AND e.assigned_profile_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Generate conflict report (customers with multiple business profiles)
-- ============================================================================
-- These customers have invoices from multiple business profiles
-- They remain unassigned (business_profile_id = NULL) for manual review
DO $$
DECLARE
  conflict_count INTEGER;
  conflict_details TEXT;
BEGIN
  SELECT COUNT(*)
  INTO conflict_count
  FROM customer_invoice_evidence
  WHERE profile_count > 1;
  
  IF conflict_count > 0 THEN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'CONFLICT REPORT: % customers have invoices from multiple business profiles', conflict_count;
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'These customers remain UNASSIGNED (business_profile_id = NULL)';
    RAISE NOTICE 'Manual review required to determine correct assignment or create duplicates';
    RAISE NOTICE '============================================================================';
    
    -- Log details of conflicted customers
    FOR conflict_details IN
      SELECT 
        'Customer: ' || c.name || 
        ' (NIP: ' || COALESCE(c.tax_id, 'N/A') || 
        ') has invoices from ' || e.profile_count || ' different business profiles'
      FROM customer_invoice_evidence e
      INNER JOIN customers c ON c.id = e.customer_id
      WHERE e.profile_count > 1
      ORDER BY c.name
      LIMIT 20
    LOOP
      RAISE NOTICE '%', conflict_details;
    END LOOP;
    
    IF conflict_count > 20 THEN
      RAISE NOTICE '... and % more conflicts', conflict_count - 20;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Generate summary report
-- ============================================================================
DO $$
DECLARE
  total_customers INTEGER;
  assigned_customers INTEGER;
  unassigned_customers INTEGER;
  conflict_customers INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_customers FROM customers;
  SELECT COUNT(*) INTO assigned_customers FROM customers WHERE business_profile_id IS NOT NULL;
  SELECT COUNT(*) INTO unassigned_customers FROM customers WHERE business_profile_id IS NULL;
  SELECT COUNT(*) INTO conflict_customers FROM customer_invoice_evidence WHERE profile_count > 1;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total customers: %', total_customers;
  RAISE NOTICE 'Assigned to business profile: % (%.1f%%)', 
    assigned_customers, 
    (assigned_customers::NUMERIC / NULLIF(total_customers, 0) * 100);
  RAISE NOTICE 'Unassigned (no invoice evidence): % (%.1f%%)', 
    unassigned_customers - conflict_customers,
    ((unassigned_customers - conflict_customers)::NUMERIC / NULLIF(total_customers, 0) * 100);
  RAISE NOTICE 'Conflicts (multiple profiles): % (%.1f%%)', 
    conflict_customers,
    (conflict_customers::NUMERIC / NULLIF(total_customers, 0) * 100);
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- STEP 7: Cleanup
-- ============================================================================
DROP TABLE IF EXISTS customer_invoice_evidence;

-- ============================================================================
-- STEP 8: Add index for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_business_profile_id 
  ON customers(business_profile_id) 
  WHERE business_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_tax_id 
  ON customers(tax_id) 
  WHERE tax_id IS NOT NULL;

-- ============================================================================
-- STEP 9: Add comments
-- ============================================================================
COMMENT ON COLUMN customers.business_profile_id IS 
  'Business profile that owns this customer. Assigned based on invoice evidence. NULL = unassigned or conflict.';

COMMENT ON COLUMN customers.is_shared IS 
  'Whether this customer is shared across multiple business profiles. Currently unused after migration fix.';
