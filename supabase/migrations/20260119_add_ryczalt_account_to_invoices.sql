-- Add ryczalt_account_id column to invoices table
-- This links invoices to user's custom ryczałt accounts instead of categories

ALTER TABLE invoices 
ADD COLUMN ryczalt_account_id UUID REFERENCES ryczalt_accounts(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_ryczalt_account 
ON invoices(ryczalt_account_id);

-- Add helpful comment
COMMENT ON COLUMN invoices.ryczalt_account_id IS 
'Link to user-created ryczałt account. Used for JDG ryczałt taxation to track which custom account this invoice belongs to.';
