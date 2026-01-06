-- ============================================================================
-- Verification Script: Customer Business Profile Assignment
-- ============================================================================
-- Run this AFTER the migration to verify results
-- ============================================================================

-- Summary statistics
SELECT 
  'SUMMARY' AS report_type,
  COUNT(*) AS total_customers,
  COUNT(*) FILTER (WHERE business_profile_id IS NOT NULL) AS assigned_customers,
  COUNT(*) FILTER (WHERE business_profile_id IS NULL) AS unassigned_customers,
  ROUND(100.0 * COUNT(*) FILTER (WHERE business_profile_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS assigned_percentage
FROM customers;

-- Customers by business profile
SELECT 
  'BY_PROFILE' AS report_type,
  COALESCE(bp.name, 'Unassigned') AS business_profile_name,
  COUNT(*) AS customer_count
FROM customers c
LEFT JOIN business_profiles bp ON bp.id = c.business_profile_id
GROUP BY bp.id, bp.name
ORDER BY customer_count DESC;

-- Customers with invoice evidence but still unassigned (potential conflicts)
WITH invoice_evidence AS (
  SELECT DISTINCT
    c.id AS customer_id,
    c.name AS customer_name,
    c.tax_id,
    i.business_profile_id,
    bp.name AS business_profile_name
  FROM customers c
  INNER JOIN invoices i ON (
    i.customer_id = c.id
    OR regexp_replace(c.tax_id, '[^0-9]', '', 'g') = regexp_replace(i.customer_nip, '[^0-9]', '', 'g')
    OR regexp_replace(c.tax_id, '[^0-9]', '', 'g') = regexp_replace(i.recipient_nip, '[^0-9]', '', 'g')
  )
  LEFT JOIN business_profiles bp ON bp.id = i.business_profile_id
  WHERE c.business_profile_id IS NULL
    AND i.business_profile_id IS NOT NULL
),
profile_counts AS (
  SELECT
    customer_id,
    customer_name,
    tax_id,
    COUNT(DISTINCT business_profile_id) AS profile_count,
    string_agg(DISTINCT business_profile_name, ', ' ORDER BY business_profile_name) AS profiles
  FROM invoice_evidence
  GROUP BY customer_id, customer_name, tax_id
)
SELECT
  'CONFLICTS' AS report_type,
  customer_name,
  tax_id,
  profile_count,
  profiles
FROM profile_counts
WHERE profile_count > 1
ORDER BY profile_count DESC, customer_name
LIMIT 50;

-- Sample of properly assigned customers
SELECT
  'ASSIGNED_SAMPLE' AS report_type,
  c.name AS customer_name,
  c.tax_id,
  bp.name AS assigned_to_profile,
  COUNT(i.id) AS invoice_count
FROM customers c
INNER JOIN business_profiles bp ON bp.id = c.business_profile_id
LEFT JOIN invoices i ON i.customer_id = c.id AND i.business_profile_id = c.business_profile_id
GROUP BY c.id, c.name, c.tax_id, bp.name
ORDER BY invoice_count DESC
LIMIT 20;

-- Customers without any invoice evidence (truly unassigned)
SELECT
  'NO_EVIDENCE' AS report_type,
  c.name AS customer_name,
  c.tax_id,
  c.created_at
FROM customers c
WHERE c.business_profile_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.customer_id = c.id
      OR regexp_replace(c.tax_id, '[^0-9]', '', 'g') = regexp_replace(i.customer_nip, '[^0-9]', '', 'g')
      OR regexp_replace(c.tax_id, '[^0-9]', '', 'g') = regexp_replace(i.recipient_nip, '[^0-9]', '', 'g')
  )
ORDER BY c.created_at DESC
LIMIT 20;
