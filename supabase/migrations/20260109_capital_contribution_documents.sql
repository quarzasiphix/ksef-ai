-- Add support for capital contribution document management
-- This migration adds columns to link equity transactions with signed documents

-- ============================================
-- DOCUMENTS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- File information
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase storage
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  public_url TEXT,
  
  -- Document metadata
  document_type TEXT CHECK (document_type IN (
    'cash_contribution_declaration',
    'contract',
    'resolution',
    'invoice',
    'receipt',
    'bank_statement',
    'tax_document',
    'other'
  )),
  
  -- Additional metadata as JSON
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_profile ON documents(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their documents"
  ON documents
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- EQUITY TRANSACTIONS - Add document link
-- ============================================
DO $$
BEGIN
  -- Add signed_document_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'equity_transactions' 
    AND column_name = 'signed_document_id'
  ) THEN
    ALTER TABLE equity_transactions 
    ADD COLUMN signed_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_equity_transactions_document ON equity_transactions(signed_document_id);
  END IF;
  
  -- Add payment_method column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'equity_transactions' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE equity_transactions 
    ADD COLUMN payment_method TEXT CHECK (payment_method IN ('bank', 'cash'));
  END IF;
  
  -- Add cash_account_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'equity_transactions' 
    AND column_name = 'cash_account_id'
  ) THEN
    ALTER TABLE equity_transactions 
    ADD COLUMN cash_account_id UUID REFERENCES cash_accounts(id) ON DELETE SET NULL;
  END IF;
  
  -- Add bank_account_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'equity_transactions' 
    AND column_name = 'bank_account_id'
  ) THEN
    ALTER TABLE equity_transactions 
    ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- STORAGE BUCKET FOR DOCUMENTS
-- ============================================
-- Note: This needs to be run in Supabase dashboard or via storage API
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('documents', 'documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies (run after bucket creation)
-- CREATE POLICY "Users can upload documents"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- CREATE POLICY "Users can read their documents"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- CREATE POLICY "Users can delete their documents"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- ============================================
-- HELPER FUNCTION: Get document with metadata
-- ============================================
CREATE OR REPLACE FUNCTION get_equity_transaction_with_document(transaction_id UUID)
RETURNS TABLE (
  id UUID,
  business_profile_id UUID,
  transaction_type TEXT,
  amount NUMERIC,
  shareholder_name TEXT,
  transaction_date DATE,
  payment_method TEXT,
  signed_document_id UUID,
  document_file_name TEXT,
  document_file_path TEXT,
  document_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.id,
    et.business_profile_id,
    et.transaction_type,
    et.amount,
    et.shareholder_name,
    et.transaction_date,
    et.payment_method,
    et.signed_document_id,
    d.file_name,
    d.file_path,
    d.created_at
  FROM equity_transactions et
  LEFT JOIN documents d ON et.signed_document_id = d.id
  WHERE et.id = transaction_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE documents IS 'Stores uploaded documents and files for business profiles';
COMMENT ON COLUMN equity_transactions.signed_document_id IS 'Link to signed cash contribution declaration for cash payments';
COMMENT ON COLUMN equity_transactions.payment_method IS 'Payment method: bank transfer or cash';
COMMENT ON COLUMN equity_transactions.cash_account_id IS 'Cash register used for cash contributions';
COMMENT ON COLUMN equity_transactions.bank_account_id IS 'Bank account used for bank transfer contributions';
