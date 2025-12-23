# Immutable Amendment & Versioning System for Decisions

## Core Principle: Immutability Over In-Place Editing

**Decisions are legal documents that NEVER change in place.**

Instead of editing, we create **Amendment Requests** that:
1. Propose changes with full justification
2. Require signed PDF document
3. Need multi-party approval
4. Create new version when approved
5. Preserve complete audit trail

---

## Database Schema

### `decision_versions` Table

```sql
CREATE TABLE decision_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id),
  version_number INTEGER NOT NULL,
  
  -- Snapshot of decision data at this version
  title TEXT NOT NULL,
  description TEXT,
  decision_type TEXT NOT NULL,
  category TEXT,
  legal_basis TEXT,
  decision_body TEXT NOT NULL, -- ZARZAD | WSPOLNICY
  approval_policy TEXT NOT NULL,
  
  -- Full data snapshot (JSONB)
  data_snapshot JSONB NOT NULL,
  
  -- Audit hashing
  snapshot_hash TEXT NOT NULL, -- SHA-256 of data_snapshot
  previous_version_hash TEXT, -- Hash of previous version (chain)
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at TIMESTAMPTZ, -- When this version was replaced
  superseded_by UUID REFERENCES decision_versions(id),
  
  -- Amendment that created this version
  amendment_id UUID REFERENCES amendment_requests(id),
  
  UNIQUE(decision_id, version_number)
);

CREATE INDEX idx_decision_versions_decision ON decision_versions(decision_id);
CREATE INDEX idx_decision_versions_current ON decision_versions(decision_id, superseded_at) 
  WHERE superseded_at IS NULL;
```

### `amendment_requests` Table

```sql
CREATE TABLE amendment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  -- Current version being amended
  from_version_id UUID NOT NULL REFERENCES decision_versions(id),
  
  -- Proposed changes
  proposed_changes JSONB NOT NULL, -- Full new data
  changes_diff JSONB, -- Computed diff for UI
  justification TEXT NOT NULL,
  
  -- Requester
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Approval tracking
  required_approvers UUID[] NOT NULL DEFAULT '{}',
  approvals JSONB NOT NULL DEFAULT '[]', -- [{user_id, approved_at, signature}]
  
  -- Document with signature
  document_url TEXT,
  document_name TEXT,
  document_uploaded_at TIMESTAMPTZ,
  
  -- Signature verification (from podpis.gov.pl or microservice)
  signature_verification JSONB,
  -- Structure:
  -- {
  --   status: 'valid' | 'invalid' | 'indeterminate' | 'not_checked',
  --   checked_at: timestamp,
  --   signers: [{cn, issuer, signing_time}],
  --   certificate_issuer: string,
  --   has_timestamp: boolean,
  --   revocation_checked: boolean,
  --   report_blob: {} // full validation report
  -- }
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- No document yet
    'pending_verification', -- Document uploaded, awaiting signature check
    'verified',          -- Signature valid, ready for approvals
    'approved',          -- All approvals received, new version created
    'rejected',          -- Rejected by approver
    'cancelled'          -- Cancelled by requester
  )),
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Created version (when approved)
  created_version_id UUID REFERENCES decision_versions(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_amendment_requests_decision ON amendment_requests(decision_id);
CREATE INDEX idx_amendment_requests_status ON amendment_requests(status);
```

### Update `decisions` Table

```sql
-- Add new status values
ALTER TABLE decisions 
DROP CONSTRAINT IF EXISTS decisions_status_check;

ALTER TABLE decisions 
ADD CONSTRAINT decisions_status_check 
CHECK (status IN (
  'draft',
  'pending_approval',
  'active',
  'amendment_pending',  -- NEW: Amendment request in progress
  'amended',            -- NEW: Superseded by newer version
  'revocation_pending',
  'revoked',
  'rejected',
  'cancelled'
));

-- Add versioning fields
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES decision_versions(id),
ADD COLUMN IF NOT EXISTS version_count INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_decisions_current_version ON decisions(current_version_id);
```

---

## Status Lifecycle

### Decision Status Flow

```
DRAFT
  ↓ (submit for approval)
PENDING_APPROVAL
  ↓ (all approvals received)
ACTIVE (v1)
  ↓ (amendment requested)
AMENDMENT_PENDING (v1 still active, amendment in progress)
  ↓ (amendment approved)
AMENDED (v1 superseded) + new ACTIVE (v2)
  ↓ (another amendment)
AMENDMENT_PENDING (v2 still active)
  ↓ (approved)
AMENDED (v2 superseded) + new ACTIVE (v3)

Alternative paths:
ACTIVE → REVOCATION_PENDING → REVOKED
AMENDMENT_PENDING → (rejected/cancelled) → ACTIVE (stays on current version)
```

### Amendment Request Status Flow

```
pending (no document)
  ↓ (upload signed PDF)
pending_verification
  ↓ (signature verified via microservice)
verified
  ↓ (all approvers sign off)
approved → creates new DecisionVersion
  
Alternative:
verified → rejected (by approver)
any → cancelled (by requester)
```

---

## Event Log Schema

### Events to Log

```typescript
enum AmendmentEventType {
  // Amendment lifecycle
  DECISION_AMENDMENT_REQUESTED = 'decision_amendment_requested',
  DECISION_AMENDMENT_PDF_UPLOADED = 'decision_amendment_pdf_uploaded',
  DECISION_AMENDMENT_SIGNATURE_QUEUED = 'decision_amendment_signature_queued',
  DECISION_AMENDMENT_SIGNATURE_VERIFIED = 'decision_amendment_signature_verified',
  DECISION_AMENDMENT_SIGNATURE_FAILED = 'decision_amendment_signature_failed',
  DECISION_AMENDMENT_APPROVED = 'decision_amendment_approved',
  DECISION_AMENDMENT_REJECTED = 'decision_amendment_rejected',
  DECISION_AMENDMENT_CANCELLED = 'decision_amendment_cancelled',
  
  // Version management
  DECISION_VERSION_PUBLISHED = 'decision_version_published',
  DECISION_VERSION_SUPERSEDED = 'decision_version_superseded',
}

interface AmendmentEventMetadata {
  amendment_id: string;
  decision_id: string;
  from_version: number;
  to_version?: number;
  
  // For signature verification
  signature_status?: 'valid' | 'invalid' | 'indeterminate';
  signature_details?: {
    signer_cn: string;
    issuer: string;
    signing_time: string;
    revocation_checked: boolean;
  };
  
  // For approvals
  approver_id?: string;
  approval_count?: number;
  required_count?: number;
  
  // For version publishing
  before_snapshot_hash?: string;
  after_snapshot_hash?: string;
  changes_summary?: string;
  
  // Rejection/cancellation
  reason?: string;
}
```

### Event Log Entry Example

```json
{
  "event_type": "decision_version_published",
  "business_profile_id": "...",
  "actor_id": "...",
  "occurred_at": "2025-12-23T14:00:00Z",
  "entity_type": "decision",
  "entity_id": "...",
  "action_summary": "Opublikowano wersję 4 uchwały #123/2025",
  "metadata": {
    "amendment_id": "...",
    "decision_id": "...",
    "from_version": 3,
    "to_version": 4,
    "before_snapshot_hash": "sha256:abc123...",
    "after_snapshot_hash": "sha256:def456...",
    "changes_summary": "Zmiana wysokości wynagrodzenia zarządu z 10000 na 12000 PLN",
    "signature_status": "valid",
    "signature_details": {
      "signer_cn": "Jan Kowalski",
      "issuer": "Certum",
      "signing_time": "2025-12-23T13:45:00Z",
      "revocation_checked": true
    }
  }
}
```

---

## UI/UX Implementation

### 1. DecisionDetails (View Mode)

**New Sections**:

#### A. Version History Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Historia wersji</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {/* Current version */}
      <div className="p-3 bg-green-50 border border-green-200 rounded">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="default">Aktualna wersja v{currentVersion}</Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Opublikowano: {formatDate(publishedAt)}
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Pokaż szczegóły
          </Button>
        </div>
      </div>
      
      {/* Previous versions */}
      {previousVersions.map(v => (
        <div key={v.id} className="p-3 border rounded">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">v{v.version_number}</span>
              <p className="text-xs text-muted-foreground">
                Obowiązywała: {formatDate(v.created_at)} - {formatDate(v.superseded_at)}
              </p>
            </div>
            <Button variant="ghost" size="sm">
              Pokaż różnice
            </Button>
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

#### B. Amendment Status Banner (when AMENDMENT_PENDING)
```tsx
{decision.status === 'amendment_pending' && (
  <Alert variant="warning" className="mb-6">
    <AlertTriangle className="h-5 w-5" />
    <AlertTitle>Złożono wniosek o zmianę uchwały</AlertTitle>
    <AlertDescription>
      <div className="space-y-2 mt-2">
        <p>Wniosek czeka na podpisany dokument i akceptacje wspólników</p>
        
        {/* Checklist */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {amendment.document_url ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">Dodany podpisany PDF zmiany</span>
          </div>
          
          <div className="flex items-center gap-2">
            {amendment.signature_verification?.status === 'valid' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : amendment.signature_verification?.status === 'invalid' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">
              Weryfikacja podpisu: {getVerificationLabel(amendment.signature_verification?.status)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {allApproved ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">
              Akceptacje: {approvalCount}/{requiredCount}
            </span>
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={() => navigate(`/amendments/${amendment.id}`)}>
          Zobacz szczegóły wniosku
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}
```

#### C. Action Buttons Update
```tsx
{/* Replace "Edytuj" with "Złóż poprawkę" */}
{decision.status === 'active' && (
  <Button 
    variant="outline" 
    onClick={() => navigate(`/decisions/${id}/amend`)}
  >
    <FileEdit className="h-4 w-4 mr-2" />
    Złóż poprawkę
  </Button>
)}

{/* Disable if amendment pending */}
{decision.status === 'amendment_pending' && (
  <Button variant="outline" disabled>
    <Lock className="h-4 w-4 mr-2" />
    Edycja zablokowana (wniosek w toku)
  </Button>
)}
```

---

### 2. DecisionEdit → AmendmentProposal Mode

**Route**: `/decisions/:id/amend`

**Top Banner**:
```tsx
<Alert className="mb-6 bg-blue-50 border-blue-200">
  <Info className="h-5 w-5 text-blue-600" />
  <AlertTitle>Proponujesz zmianę do uchwały v{currentVersion}</AlertTitle>
  <AlertDescription>
    Zmiana nie wejdzie w życie bez akceptacji wspólników i podpisanego dokumentu.
    Oryginalna uchwała pozostanie niezmieniona do czasu zatwierdzenia.
  </AlertDescription>
</Alert>
```

**Form Sections**:

1. **Co zmieniasz** - editable fields (same as current form)
2. **Uzasadnienie** (required)
   ```tsx
   <div className="space-y-2">
     <Label htmlFor="justification">
       Uzasadnienie zmiany <span className="text-red-600">*</span>
     </Label>
     <Textarea
       id="justification"
       placeholder="Opisz szczegółowo powód wprowadzenia zmian..."
       rows={4}
       required
     />
     <p className="text-xs text-muted-foreground">
       Uzasadnienie będzie widoczne dla wszystkich wspólników i zapisane w audycie.
     </p>
   </div>
   ```

3. **Wymagane zgody**
   ```tsx
   <Card>
     <CardHeader>
       <CardTitle>Wymagane akceptacje</CardTitle>
     </CardHeader>
     <CardContent>
       <div className="space-y-2">
         {requiredApprovers.map(approver => (
           <div key={approver.id} className="flex items-center gap-2">
             <User className="h-4 w-4" />
             <span className="text-sm">{approver.name}</span>
             <Badge variant="outline">Wspólnik</Badge>
           </div>
         ))}
       </div>
     </CardContent>
   </Card>
   ```

4. **Dokument zmiany (podpisany)**
   ```tsx
   <div className="space-y-2">
     <Label htmlFor="amendment-doc">
       Podpisany dokument zmiany <span className="text-red-600">*</span>
     </Label>
     <FileUpload
       accept=".pdf"
       onUpload={handleDocumentUpload}
       maxSize={10 * 1024 * 1024}
     />
     
     {verificationResult && (
       <SignatureVerificationBadge result={verificationResult} />
     )}
     
     <p className="text-xs text-amber-700">
       ⚠️ Wymagany dokument z ważnym podpisem elektronicznym wspólników
     </p>
   </div>
   ```

**CTA Buttons**:
```tsx
<div className="flex gap-2">
  <Button
    onClick={handleSubmitAmendment}
    disabled={!isValid || !hasValidSignature}
    className="bg-blue-600 hover:bg-blue-700"
  >
    Złóż wniosek o zmianę
  </Button>
  
  <Button variant="outline" onClick={() => navigate(-1)}>
    Anuluj
  </Button>
</div>
```

---

### 3. DecisionNew (Create Mode)

**Two Modes**:

#### A. Draft Mode (default)
- No signature required
- No approvals required
- Status: `draft`
- Can be edited freely
- Not visible to others until submitted

#### B. Submit for Approval
- Requires signed PDF of decision
- Requires signature verification
- Transitions to `pending_approval`
- Requires all approvals before becoming `active`

**UI Toggle**:
```tsx
<div className="flex items-center gap-4 mb-6">
  <Label>Tryb tworzenia:</Label>
  <RadioGroup value={mode} onValueChange={setMode}>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="draft" id="draft" />
      <Label htmlFor="draft">Roboczy (bez podpisów)</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="submit" id="submit" />
      <Label htmlFor="submit">Do zatwierdzenia (wymaga podpisów)</Label>
    </div>
  </RadioGroup>
</div>

{mode === 'submit' && (
  <Alert className="mb-4">
    <Info className="h-4 w-4" />
    <AlertDescription>
      Uchwała nie będzie aktywna bez podpisanego dokumentu i akceptacji wspólników.
    </AlertDescription>
  </Alert>
)}
```

---

## Signature Verification Architecture

### Current State (Frontend-Only)
❌ **Problem**: Frontend calls podpis.gov.pl directly
- CORS issues
- No server-side validation
- Can't store verification results reliably
- No retry/queue mechanism

### Recommended Architecture

```
User uploads PDF
    ↓
Supabase Storage
    ↓
Edge Function (trigger)
    ↓
Verification Microservice (Cloud Run / Fly.io)
    ↓
Validation Report (JSON)
    ↓
Store in amendment_requests.signature_verification
    ↓
Update status: pending_verification → verified/invalid
```

### Microservice Options

#### Option A: ETSI DSS (Java-based, most robust)
```yaml
# docker-compose.yml
services:
  signature-validator:
    image: custom/etsi-dss-validator
    environment:
      - TRUST_STORE_PATH=/certs/trust-store.jks
      - OCSP_ENABLED=true
      - CRL_ENABLED=true
    volumes:
      - ./certs:/certs
    ports:
      - "8080:8080"
```

**API Contract**:
```typescript
POST /validate
Content-Type: multipart/form-data

{
  file: <PDF binary>,
  options: {
    checkRevocation: true,
    requireTimestamp: false,
    trustPolicy: 'EU_QUALIFIED'
  }
}

Response:
{
  status: 'valid' | 'invalid' | 'indeterminate',
  checked_at: '2025-12-23T14:00:00Z',
  signers: [
    {
      cn: 'Jan Kowalski',
      issuer: 'Certum Qualified CA',
      signing_time: '2025-12-23T13:45:00Z',
      certificate_valid: true,
      revocation_status: 'good',
      has_timestamp: true
    }
  ],
  certificate_issuer: 'Certum',
  has_timestamp: true,
  revocation_checked: true,
  report_blob: { /* full ETSI validation report */ }
}
```

#### Option B: Poppler pdfsig (Simpler, Unix-based)
```bash
# Install on Cloud Run / Fly.io
apt-get install poppler-utils

# Verify signature
pdfsig document.pdf

# Parse output and return JSON
```

**Pros**: Lightweight, easy to deploy  
**Cons**: Less comprehensive validation (no OCSP/CRL by default)

#### Option C: External API (Fastest to implement)
Use existing service like:
- Adobe Sign API
- DocuSign validation
- Polish government API (if available for server-to-server)

**Pros**: No infrastructure  
**Cons**: Cost, vendor lock-in

---

### Implementation: Edge Function + Microservice

**Edge Function** (`supabase/functions/verify-amendment-signature/index.ts`):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const { amendmentId, documentUrl } = await req.json();
  
  // Download PDF from Storage
  const supabase = createClient(/* ... */);
  const { data: fileData } = await supabase.storage
    .from('documents')
    .download(documentUrl);
  
  // Send to verification microservice
  const formData = new FormData();
  formData.append('file', fileData);
  
  const response = await fetch('https://signature-validator.yourdomain.com/validate', {
    method: 'POST',
    body: formData,
  });
  
  const verificationResult = await response.json();
  
  // Store result in DB
  await supabase
    .from('amendment_requests')
    .update({
      signature_verification: verificationResult,
      status: verificationResult.status === 'valid' ? 'verified' : 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', amendmentId);
  
  // Log event
  await supabase.from('company_events').insert({
    event_type: verificationResult.status === 'valid' 
      ? 'decision_amendment_signature_verified'
      : 'decision_amendment_signature_failed',
    entity_type: 'amendment_request',
    entity_id: amendmentId,
    metadata: verificationResult,
  });
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Repository Functions

### `amendmentRepository.ts`

```typescript
export interface AmendmentRequest {
  id: string;
  decision_id: string;
  business_profile_id: string;
  from_version_id: string;
  proposed_changes: any;
  changes_diff: any;
  justification: string;
  requested_by: string;
  requested_at: string;
  required_approvers: string[];
  approvals: Array<{
    user_id: string;
    approved_at: string;
    signature: string;
  }>;
  document_url?: string;
  document_name?: string;
  document_uploaded_at?: string;
  signature_verification?: SignatureVerification;
  status: 'pending' | 'pending_verification' | 'verified' | 'approved' | 'rejected' | 'cancelled';
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_version_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SignatureVerification {
  status: 'valid' | 'invalid' | 'indeterminate' | 'not_checked';
  checked_at: string;
  signers: Array<{
    cn: string;
    issuer: string;
    signing_time: string;
    certificate_valid: boolean;
    revocation_status?: 'good' | 'revoked' | 'unknown';
    has_timestamp: boolean;
  }>;
  certificate_issuer: string;
  has_timestamp: boolean;
  revocation_checked: boolean;
  report_blob?: any;
}

// Create amendment request
export async function createAmendmentRequest(input: {
  decision_id: string;
  business_profile_id: string;
  from_version_id: string;
  proposed_changes: any;
  justification: string;
  required_approvers: string[];
}): Promise<AmendmentRequest> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');
  
  // Compute diff
  const { data: currentVersion } = await supabase
    .from('decision_versions')
    .select('data_snapshot')
    .eq('id', input.from_version_id)
    .single();
  
  const diff = computeDiff(currentVersion.data_snapshot, input.proposed_changes);
  
  const { data, error } = await supabase
    .from('amendment_requests')
    .insert({
      ...input,
      changes_diff: diff,
      requested_by: user.user.id,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Log event
  await logEvent({
    event_type: 'decision_amendment_requested',
    entity_type: 'amendment_request',
    entity_id: data.id,
    metadata: {
      amendment_id: data.id,
      decision_id: input.decision_id,
      from_version: currentVersion.version_number,
    },
  });
  
  return data;
}

// Upload amendment document
export async function uploadAmendmentDocument(
  amendmentId: string,
  file: File
): Promise<string> {
  // Upload to storage
  const fileName = `amendment-${amendmentId}-${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file);
  
  if (uploadError) throw uploadError;
  
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);
  
  // Update amendment request
  await supabase
    .from('amendment_requests')
    .update({
      document_url: urlData.publicUrl,
      document_name: file.name,
      document_uploaded_at: new Date().toISOString(),
      status: 'pending_verification',
      updated_at: new Date().toISOString(),
    })
    .eq('id', amendmentId);
  
  // Trigger verification (call Edge Function)
  await supabase.functions.invoke('verify-amendment-signature', {
    body: {
      amendmentId,
      documentUrl: fileName,
    },
  });
  
  // Log event
  await logEvent({
    event_type: 'decision_amendment_pdf_uploaded',
    entity_type: 'amendment_request',
    entity_id: amendmentId,
  });
  
  return urlData.publicUrl;
}

// Approve amendment
export async function approveAmendment(
  amendmentId: string,
  userId: string,
  signature: string
): Promise<AmendmentRequest> {
  const { data: amendment } = await supabase
    .from('amendment_requests')
    .select('*')
    .eq('id', amendmentId)
    .single();
  
  if (!amendment) throw new Error('Amendment not found');
  
  // Validate signature verified
  if (amendment.signature_verification?.status !== 'valid') {
    throw new Error('Nie można zatwierdzić bez zweryfikowanego podpisu');
  }
  
  // Add approval
  const updatedApprovals = [
    ...amendment.approvals,
    {
      user_id: userId,
      approved_at: new Date().toISOString(),
      signature,
    },
  ];
  
  const allApproved = amendment.required_approvers.every((id) =>
    updatedApprovals.some((a) => a.user_id === id)
  );
  
  let updateData: any = {
    approvals: updatedApprovals,
    updated_at: new Date().toISOString(),
  };
  
  // If all approved, create new version
  if (allApproved) {
    const newVersion = await createDecisionVersion({
      decision_id: amendment.decision_id,
      proposed_changes: amendment.proposed_changes,
      amendment_id: amendmentId,
    });
    
    updateData.status = 'approved';
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = userId;
    updateData.created_version_id = newVersion.id;
  }
  
  const { data, error } = await supabase
    .from('amendment_requests')
    .update(updateData)
    .eq('id', amendmentId)
    .select()
    .single();
  
  if (error) throw error;
  
  // Log event
  await logEvent({
    event_type: allApproved 
      ? 'decision_amendment_approved' 
      : 'decision_amendment_approval_added',
    entity_type: 'amendment_request',
    entity_id: amendmentId,
    metadata: {
      approver_id: userId,
      approval_count: updatedApprovals.length,
      required_count: amendment.required_approvers.length,
    },
  });
  
  return data;
}
```

### `decisionVersionRepository.ts`

```typescript
export async function createDecisionVersion(input: {
  decision_id: string;
  proposed_changes: any;
  amendment_id: string;
}): Promise<DecisionVersion> {
  // Get current version
  const { data: decision } = await supabase
    .from('decisions')
    .select('*, current_version:decision_versions!current_version_id(*)')
    .eq('id', input.decision_id)
    .single();
  
  const currentVersion = decision.current_version;
  const newVersionNumber = currentVersion.version_number + 1;
  
  // Compute hashes
  const beforeHash = computeHash(currentVersion.data_snapshot);
  const afterHash = computeHash(input.proposed_changes);
  
  // Create new version
  const { data: newVersion, error } = await supabase
    .from('decision_versions')
    .insert({
      decision_id: input.decision_id,
      version_number: newVersionNumber,
      ...input.proposed_changes,
      data_snapshot: input.proposed_changes,
      snapshot_hash: afterHash,
      previous_version_hash: beforeHash,
      amendment_id: input.amendment_id,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Supersede old version
  await supabase
    .from('decision_versions')
    .update({
      superseded_at: new Date().toISOString(),
      superseded_by: newVersion.id,
    })
    .eq('id', currentVersion.id);
  
  // Update decision
  await supabase
    .from('decisions')
    .update({
      ...input.proposed_changes,
      current_version_id: newVersion.id,
      version_count: newVersionNumber,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.decision_id);
  
  // Mark old decision as amended
  await supabase
    .from('decisions')
    .update({ status: 'amended' })
    .eq('current_version_id', currentVersion.id);
  
  // Log event
  await logEvent({
    event_type: 'decision_version_published',
    entity_type: 'decision',
    entity_id: input.decision_id,
    metadata: {
      amendment_id: input.amendment_id,
      from_version: currentVersion.version_number,
      to_version: newVersionNumber,
      before_snapshot_hash: beforeHash,
      after_snapshot_hash: afterHash,
    },
  });
  
  return newVersion;
}

function computeHash(data: any): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  return `sha256:${sha256(str)}`;
}

function computeDiff(before: any, after: any): any {
  // Use library like 'deep-diff' or custom implementation
  return diff(before, after);
}
```

---

## Migration Plan

### Phase 1: Schema Setup
1. Create `decision_versions` table
2. Create `amendment_requests` table
3. Update `decisions` table with versioning fields
4. Migrate existing decisions to v1

### Phase 2: Backend Logic
1. Implement `amendmentRepository.ts`
2. Implement `decisionVersionRepository.ts`
3. Add event logging for all amendment lifecycle events
4. Set up signature verification microservice

### Phase 3: UI Updates
1. Update `DecisionDetails` with version history
2. Convert `DecisionEdit` to `AmendmentProposal` mode
3. Update `DecisionNew` with draft/submit modes
4. Add amendment approval panel

### Phase 4: Testing & Rollout
1. Test amendment flow end-to-end
2. Test signature verification with real PDFs
3. Verify event log completeness
4. Deploy to production

---

## Summary

This system ensures:
- ✅ **100% immutability** - decisions never change in place
- ✅ **Full audit trail** - every change logged with justification
- ✅ **Cryptographic verification** - signed documents required
- ✅ **Version chain** - hash-linked versions prevent tampering
- ✅ **Multi-party approval** - all stakeholders must sign off
- ✅ **Clear UX** - "Złóż poprawkę" instead of "Edytuj"
- ✅ **Robust signature validation** - microservice architecture with ETSI compliance
