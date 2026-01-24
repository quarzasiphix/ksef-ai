-- Migration: KSeF Received Invoices
-- Description: Add table for storing invoices retrieved from KSeF
-- Date: 2026-01-23

-- Create table for received invoices
CREATE TABLE IF NOT EXISTS ksef_invoices_received (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  ksef_number VARCHAR(35) UNIQUE NOT NULL,
  invoice_xml TEXT NOT NULL,
  invoice_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('subject1', 'subject2', 'subject3', 'subjectAuthorized')),
  permanent_storage_date TIMESTAMPTZ NOT NULL,
  issue_date DATE NOT NULL,
  seller_nip VARCHAR(10) NOT NULL,
  buyer_nip VARCHAR(10),
  total_gross_amount DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'PLN',
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  linked_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_ksef_received_profile ON ksef_invoices_received(business_profile_id);
CREATE INDEX idx_ksef_received_ksef_num ON ksef_invoices_received(ksef_number);
CREATE INDEX idx_ksef_received_storage_date ON ksef_invoices_received(permanent_storage_date);
CREATE INDEX idx_ksef_received_issue_date ON ksef_invoices_received(issue_date);
CREATE INDEX idx_ksef_received_seller_nip ON ksef_invoices_received(seller_nip);
CREATE INDEX idx_ksef_received_buyer_nip ON ksef_invoices_received(buyer_nip) WHERE buyer_nip IS NOT NULL;
CREATE INDEX idx_ksef_received_processed ON ksef_invoices_received(processed) WHERE NOT processed;
CREATE INDEX idx_ksef_received_subject_type ON ksef_invoices_received(subject_type);

-- Enable RLS
ALTER TABLE ksef_invoices_received ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own received invoices
CREATE POLICY "Users can view their own received invoices"
  ON ksef_invoices_received FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own received invoices
CREATE POLICY "Users can insert their own received invoices"
  ON ksef_invoices_received FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own received invoices
CREATE POLICY "Users can update their own received invoices"
  ON ksef_invoices_received FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Update sync state table to track per subject type
ALTER TABLE ksef_sync_state
ADD COLUMN IF NOT EXISTS subject_type VARCHAR(20) CHECK (subject_type IN ('subject1', 'subject2', 'subject3', 'subjectAuthorized')),
ADD COLUMN IF NOT EXISTS permanent_storage_hwm_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_permanent_storage_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invoices_synced INTEGER DEFAULT 0;

-- Create unique constraint on business_profile_id + subject_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_ksef_sync_state_profile_subject 
  ON ksef_sync_state(business_profile_id, subject_type);

-- Add QR code fields to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS ksef_qr_code TEXT,
ADD COLUMN IF NOT EXISTS ksef_qr_label VARCHAR(50),
ADD COLUMN IF NOT EXISTS ksef_qr_url TEXT;

-- Add offline mode flag to ksef_documents_raw
ALTER TABLE ksef_documents_raw
ADD COLUMN IF NOT EXISTS offline_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hash_of_corrected_invoice VARCHAR(255);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ksef_received_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_ksef_received_updated_at ON ksef_invoices_received;
CREATE TRIGGER trigger_update_ksef_received_updated_at
  BEFORE UPDATE ON ksef_invoices_received
  FOR EACH ROW
  EXECUTE FUNCTION update_ksef_received_updated_at();

-- Create view for unprocessed received invoices
CREATE OR REPLACE VIEW ksef_unprocessed_invoices AS
SELECT 
  kir.*,
  bp.name as business_profile_name,
  bp.tax_id as business_profile_nip
FROM ksef_invoices_received kir
JOIN business_profiles bp ON kir.business_profile_id = bp.id
WHERE kir.processed = false
ORDER BY kir.received_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON ksef_unprocessed_invoices TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE ksef_invoices_received IS 'Stores invoices retrieved from KSeF system';
COMMENT ON COLUMN ksef_invoices_received.ksef_number IS 'Unique KSeF invoice number (35 characters)';
COMMENT ON COLUMN ksef_invoices_received.subject_type IS 'Role of business profile: subject1 (seller), subject2 (buyer), subject3 (other party)';
COMMENT ON COLUMN ksef_invoices_received.permanent_storage_date IS 'Date when invoice was permanently stored in KSeF (used for HWM sync)';
COMMENT ON COLUMN ksef_invoices_received.processed IS 'Whether invoice has been imported into local invoices table';
COMMENT ON COLUMN ksef_invoices_received.linked_invoice_id IS 'Reference to local invoice record if imported';
