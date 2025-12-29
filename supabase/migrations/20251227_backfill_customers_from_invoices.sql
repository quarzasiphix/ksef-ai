-- Migration: Backfill customers.business_profile_id based on invoice usage
-- Goal: ensure every existing customer is linked to the business profile that actually issued invoices for them.
-- Strategy:
--   1. Aggregate invoices -> (customer_id, business_profile_id, invoice_count, last_issue_date, last_update).
--   2. Rank per customer so the most frequently used business profile wins (ties broken by most recent activity).
--   3. Update customers to set the inferred business_profile_id.
--   4. If a customer has invoices under multiple business profiles, mark is_shared = true to keep multi-org visibility.

WITH usage AS (
  SELECT
    customer_id,
    business_profile_id,
    COUNT(*) AS invoice_count,
    MAX(issue_date) AS last_issue_date,
    MAX(updated_at) AS last_updated_at
  FROM invoices
  WHERE customer_id IS NOT NULL
    AND business_profile_id IS NOT NULL
  GROUP BY customer_id, business_profile_id
),
ranked AS (
  SELECT
    usage.*,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY invoice_count DESC,
               last_issue_date DESC,
               last_updated_at DESC,
               business_profile_id
    ) AS rn,
    COUNT(*) OVER (PARTITION BY customer_id) AS business_count
  FROM usage
)
UPDATE customers c
SET business_profile_id = r.business_profile_id,
    is_shared = CASE
                  WHEN r.business_count > 1 THEN true
                  ELSE COALESCE(c.is_shared, false)
                END
FROM ranked r
WHERE r.customer_id = c.id
  AND r.rn = 1
  AND (
        c.business_profile_id IS DISTINCT FROM r.business_profile_id
        OR (r.business_count > 1 AND COALESCE(c.is_shared, false) = false)
      );

-- Optional sanity check: review how many customers were updated and how many remain without a profile.
-- Uncomment to inspect during migration execution.
-- SELECT
--   COUNT(*) FILTER (WHERE business_profile_id IS NOT NULL) AS customers_with_profile,
--   COUNT(*) FILTER (WHERE business_profile_id IS NULL) AS customers_without_profile
-- FROM customers;
