-- Add document categorization fields to contracts
-- Required for DocumentsHub / ContractNew to align with transactional vs informational docs

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'document_category'
  ) THEN
    ALTER TABLE contracts
      ADD COLUMN document_category TEXT
      CHECK (document_category IN ('transactional_payout', 'transactional_payin', 'informational'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'is_transactional'
  ) THEN
    ALTER TABLE contracts
      ADD COLUMN is_transactional BOOLEAN DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contracts_document_category ON contracts(document_category);
CREATE INDEX IF NOT EXISTS idx_contracts_is_transactional ON contracts(is_transactional);
