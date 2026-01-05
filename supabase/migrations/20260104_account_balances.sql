-- ============================================
-- ACCOUNT BALANCES FOR CHART OF ACCOUNTS UI
-- ============================================
-- Provides current balance + period deltas for each account

CREATE OR REPLACE FUNCTION get_account_balances(
  p_business_profile_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_period_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  p_period_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT
)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  current_balance DECIMAL(15,2),
  month_delta DECIMAL(15,2),
  ytd_delta DECIMAL(15,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH current_balances AS (
    -- Get current balance (all posted entries up to as_of_date)
    SELECT 
      jl.account_id,
      jl.account_code,
      SUM(jl.debit - jl.credit) as balance
    FROM gl_journal_lines jl
    JOIN gl_journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.business_profile_id = p_business_profile_id
      AND je.status = 'posted'
      AND je.entry_date <= p_as_of_date
    GROUP BY jl.account_id, jl.account_code
  ),
  month_deltas AS (
    -- Get this month's delta
    SELECT 
      jl.account_id,
      SUM(jl.debit - jl.credit) as delta
    FROM gl_journal_lines jl
    JOIN gl_journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.business_profile_id = p_business_profile_id
      AND je.status = 'posted'
      AND je.period = (p_period_year || '-' || LPAD(p_period_month::TEXT, 2, '0'))
    GROUP BY jl.account_id
  ),
  ytd_deltas AS (
    -- Get year-to-date delta
    SELECT 
      jl.account_id,
      SUM(jl.debit - jl.credit) as delta
    FROM gl_journal_lines jl
    JOIN gl_journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.business_profile_id = p_business_profile_id
      AND je.status = 'posted'
      AND EXTRACT(YEAR FROM je.entry_date) = p_period_year
      AND je.entry_date <= p_as_of_date
    GROUP BY jl.account_id
  )
  SELECT 
    ca.id as account_id,
    ca.code as account_code,
    COALESCE(cb.balance, 0) as current_balance,
    COALESCE(md.delta, 0) as month_delta,
    COALESCE(yd.delta, 0) as ytd_delta
  FROM chart_accounts ca
  LEFT JOIN current_balances cb ON cb.account_id = ca.id
  LEFT JOIN month_deltas md ON md.account_id = ca.id
  LEFT JOIN ytd_deltas yd ON yd.account_id = ca.id
  WHERE ca.business_profile_id = p_business_profile_id
    AND ca.is_active = TRUE
  ORDER BY ca.code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_account_balances IS 'Get current balance + period deltas for all active accounts. Used by Chart of Accounts UI.';

GRANT EXECUTE ON FUNCTION get_account_balances TO authenticated;
