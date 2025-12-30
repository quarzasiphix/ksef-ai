# Decision Revocation Workflow with Signature Verification

## Overview

The decision revocation system implements **governance-grade auditability** by requiring digitally signed documents and multi-party approval before revoking any decision/uchwała. This ensures compliance with Polish corporate law and maintains a complete audit trail.

## Key Principles

### 1. **Never Delete - Always Revoke**
- Decisions are **never deleted** from the database
- Revoked decisions remain permanently with status `revoked`
- Full history preserved for audit and legal compliance
- UI copy: "Unieważnienie pozostawia ślad audytowy. Historia i pliki pozostają w systemie."

### 2. **Signed Document Requirement**
- **All revocation requests MUST include a digitally signed PDF**
- Signature verified via **podpis.gov.pl** API (Polish government service)
- Verification checks:
  - `has_signature`: Document contains electronic signature
  - `crypto_valid`: Signature integrity is valid
  - `signer_subject`: Who signed (name from certificate)
  - `signing_time`: When the document was signed

### 3. **Multi-Party Approval**
- Revocation requires approval from all `required_approvers` (wspólnicy/shareholders)
- Each approver must provide their signature (name)
- Approval only possible after document signature is verified
- System tracks approval progress and timestamps

## Status Lifecycle

```
ACTIVE
  ↓ (User initiates revocation)
REVOKE_REQUESTED + creates RevocationRequest with status:
  ↓
pending (no document uploaded yet)
  ↓ (User uploads signed PDF)
pending_verification (document uploaded, awaiting verification)
  ↓ (Signature verified via podpis.gov.pl)
verified (signature valid, ready for approvals)
  ↓ (All required approvers sign off)
approved → Decision status: REVOKED
  
Alternative paths:
- rejected → Decision status: REVOKE_REJECTED
- cancelled → Decision status: ACTIVE
```

## Database Schema

### `revocation_requests` Table

```sql
CREATE TABLE revocation_requests (
  id UUID PRIMARY KEY,
  decision_id UUID REFERENCES decisions(id),
  business_profile_id UUID REFERENCES business_profiles(id),
  reason TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  required_approvers UUID[] NOT NULL,
  
  -- Document fields
  document_url TEXT,
  document_name TEXT,
  document_uploaded_at TIMESTAMPTZ,
  
  -- Signature verification (JSONB)
  signature_verification JSONB,
  
  -- Approval tracking
  approvals JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT CHECK (status IN (
    'pending',
    'pending_verification',
    'verified',
    'approved',
    'rejected',
    'cancelled'
  )),
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `signature_verification` JSONB Structure

```typescript
{
  has_signature: boolean;
  crypto_valid: boolean;
  signer_subject: string | null;  // e.g., "Jan Kowalski"
  signing_time: string | null;     // ISO timestamp
  notes: string[];                 // Verification notes
  verified_at: string;             // When verification occurred
}
```

### `approvals` JSONB Structure

```typescript
[
  {
    user_id: string;
    approved_at: string;  // ISO timestamp
    signature: string;    // Approver's name
  }
]
```

## API Integration: podpis.gov.pl

### Verification Flow

1. **Upload Document**
   ```
   POST https://podpis.gov.pl/api/b4ds/document-signer/add-document
   FormData: { file, fileName, documentId, requestId }
   ```

2. **Verify Signatures**
   ```
   GET https://podpis.gov.pl/api/b4ds/document-signer/unsigned-verification/signRequest/{requestId}/document/{documentId}
   ```

3. **Response Format**
   ```json
   [
     {
       "status": "VALID",
       "signatureData": {
         "pesel": "58102511537",
         "firstName": "ROMUALD",
         "lastName": "BRZEZIŃSKI"
       },
       "type": "TRUSTED",
       "signingTimestamp": "2025-12-16T21:44:33Z"
     }
   ]
   ```

### Implementation

**Repository**: `@modules/documents/data/signatureVerificationRepository.ts`

```typescript
// Main verification function
const result = await verifyElectronicSignature(file);

// Extract signer info
const signers = await extractSigners(file);
// Returns: [{ name, pesel, timestamp, type, valid }]

// Quick check
const isValid = await hasValidGovernmentSignature(file);
```

## UI Components

### 1. RevokeDecisionDialog

**Location**: `@modules/decisions/components/RevokeDecisionDialog.tsx`

**Features**:
- Two-step flow: Warning → Details
- **Auto-verification**: PDF files automatically verified on upload
- Real-time signature status display
- Confirmation phrase: "UNIEWAŻNIAM"
- Disabled submit until signature verified

**UX Copy**:
- "Podpisany dokument uchwały uchylającej *"
- "⚠️ Wymagany dokument z ważnym podpisem elektronicznym wspólników"
- "Weryfikacja: integralność pliku (podpis.gov.pl)"

### 2. RevocationApprovalPanel

**Location**: `@modules/decisions/components/RevocationApprovalPanel.tsx`

**Features**:
- Status badges with verification states
- Signature verification display
- Approval progress bar
- Approve/Reject/Cancel actions
- Disabled approval until `status === 'verified'`

**Status Badges**:
- `pending`: "Oczekuje na dokument" (amber)
- `pending_verification`: "Weryfikacja podpisu" (blue)
- `verified`: "Podpis zweryfikowany" (green, shield icon)
- `approved`: "Zatwierdzone" (green)
- `rejected`: "Odrzucone" (red)

### 3. DecisionDetails & DecisionEdit

**Updates**:
- "Unieważnij" button (red, destructive) for active decisions
- Edit button disabled when `status === 'revoke_requested'`
- Status banners for revocation states
- Revocation panel shown when pending

## Repository Functions

### `revocationRepository.ts`

```typescript
// Create revocation request
createRevocationRequest(input: CreateRevocationRequestInput)
// Status: 'pending' if no doc, 'pending_verification' if doc uploaded

// Upload document
uploadRevocationDocument(revocationRequestId, file)
// Sets status to 'pending_verification'

// Store verification results
storeSignatureVerification(revocationRequestId, verificationData)
// Sets status to 'verified' if valid, 'pending' if invalid

// Add approval
addApprovalToRevocationRequest(revocationRequestId, userId, signature)
// Checks if document verified before allowing approval
// Auto-approves and revokes decision when all approvers signed

// Reject/Cancel
rejectRevocationRequest(revocationRequestId, userId, notes)
cancelRevocationRequest(revocationRequestId, userId)
```

## Security & Validation

### Document Upload
- Max file size: 10MB
- Allowed formats: PDF, JPG, PNG
- PDF files auto-verified on upload

### Approval Validation
- Cannot approve without verified signature
- Error: "Nie można zatwierdzić unieważnienia bez zweryfikowanego podpisu na dokumencie"
- Each approver can only approve once
- All required approvers must sign

### Signature Verification
- Uses official Polish government API
- No credentials stored (stateless)
- Full audit trail with timestamps
- PESEL validation via trusted source

## UI Microcopy Guidelines

### Precision Over Friendliness
- "Weryfikacja podpisu: integralność pliku"
- "Nie potwierdzamy kwalifikacji podpisu ani list zaufania na tym etapie." (tooltip)

### Audit Trail Emphasis
- "Unieważnienie pozostawia ślad audytowy"
- "Historia i pliki pozostają w systemie"
- "Ta operacja jest audytowana i zapisana w historii zdarzeń"

### Status Communication
- "Oczekuje na unieważnienie (brak podpisanego dokumentu)"
- "Unieważniona (dokument podpisany)"
- "Czeka na unieważnienie (wymaga zgód)"

## Testing

### Sample Files
- `docs/signed-test/oswiadczenie-przyjecia-gotowki (3).pdf` - Signed PDF
- `docs/signed-test/f22n1-podpis-eletroniczny-faktury.xml` - Signed XML invoice

### Test Scenarios

1. **Happy Path**
   - Create decision → Initiate revocation → Upload signed PDF
   - Verify signature auto-runs → Status: `verified`
   - Approvers sign off → Status: `approved` → Decision: `revoked`

2. **Invalid Signature**
   - Upload unsigned PDF → Verification fails
   - Status remains `pending` → Cannot approve
   - User must upload valid signed document

3. **Rejection**
   - Approver rejects → Status: `rejected`
   - Decision status: `revoke_rejected`
   - Revocation request closed

4. **Cancellation**
   - Requester cancels → Status: `cancelled`
   - Decision status: `active`
   - Revocation request closed

## Future Enhancements

1. **Email Notifications**
   - Notify approvers when revocation requested
   - Alert when signature verified
   - Confirm when approved/rejected

2. **Event Log Integration**
   - Record all revocation lifecycle events
   - Link to `company_events` table
   - Display in EventChainViewer

3. **Shareholder Auto-Discovery**
   - Fetch actual shareholders from `company_members`
   - Filter by role (owner, shareholder)
   - Auto-populate `required_approvers`

4. **Advanced Signature Types**
   - Support for qualified signatures (kwalifikowany)
   - Certificate chain validation
   - Trust list verification

## Legal Compliance

This system ensures compliance with:
- **Polish Commercial Companies Code** (Kodeks spółek handlowych)
- **Electronic Signature Act** (Ustawa o podpisie elektronicznym)
- **GDPR** (data retention and audit requirements)

All revocation actions are:
- ✅ Permanently recorded
- ✅ Cryptographically verified
- ✅ Multi-party approved
- ✅ Timestamped and auditable
- ✅ Immutable (soft-delete only)
