-- Add signature verification fields to revocation_requests table
-- This migration adds support for tracking digital signature verification from podpis.gov.pl

-- Add signature_verification JSONB column to store verification data
ALTER TABLE revocation_requests 
ADD COLUMN IF NOT EXISTS signature_verification JSONB;

-- Update status enum to include new verification states
-- Note: This assumes the status column exists as text or varchar
-- If it's an enum, you'll need to alter the enum type first

-- Add comment explaining the signature_verification structure
COMMENT ON COLUMN revocation_requests.signature_verification IS 
'Stores signature verification data from podpis.gov.pl API:
{
  "has_signature": boolean,
  "crypto_valid": boolean,
  "signer_subject": string | null,
  "signing_time": string | null,
  "notes": string[],
  "verified_at": string
}';

-- Update existing pending requests to have proper status
-- This ensures backward compatibility
UPDATE revocation_requests 
SET status = 'pending'
WHERE status = 'pending' 
  AND document_url IS NULL;

UPDATE revocation_requests 
SET status = 'pending_verification'
WHERE status = 'pending' 
  AND document_url IS NOT NULL
  AND signature_verification IS NULL;
