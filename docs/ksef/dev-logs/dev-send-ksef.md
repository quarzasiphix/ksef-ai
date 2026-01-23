# Sending Invoices to KSeF - Implementation Plan

## Overview

This document outlines the complete implementation plan for sending invoices from KsięgaI to the KSeF (National e-Invoice System).

---

## Phase 1: Authentication & Token Management

### 1.1 Database Schema for KSeF Credentials

**Migration**: Add business profile KSeF settings
```sql
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS ksef_environment TEXT DEFAULT 'test' CHECK (ksef_environment IN ('test', 'production'));
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS ksef_token_encrypted TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS ksef_token_expires_at TIMESTAMPTZ;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS ksef_enabled BOOLEAN DEFAULT false;
```

### 1.2 Token Storage Service

**Location**: `src/shared/services/ksef/ksefAuth.ts`

**Functions**:
- `saveKsefToken(businessProfileId, token, environment)` - Encrypt and store token
- `getKsefToken(businessProfileId)` - Decrypt and retrieve token
- `validateToken(token)` - Check token format and expiration
- `refreshTokenIfNeeded(businessProfileId)` - Auto-refresh logic

**Security**:
- Use Supabase Vault for encryption keys
- Never expose tokens to client-side
- All token operations via Supabase Edge Functions

### 1.3 Settings UI Component

**Location**: `src/modules/invoices/components/settings/KsefSettings.tsx`

**Features**:
- Environment toggle (Test/Production)
- Token input (masked)
- Token expiration display
- Connection test button
- Enable/disable KSeF integration

---

## Phase 2: FA(3) XML Generation

### 2.1 Complete XML Generator

**Location**: `src/shared/services/ksef/ksefXmlGenerator.ts`

**Refactor existing `ksefGenerator.ts`**:

```typescript
interface FA3Config {
  systemInfo: string; // "KsięgaI v1.0"
  namespace: string; // Official FA(3) namespace
  schemaVersion: string; // "1-0E"
}

export class KsefXmlGenerator {
  private config: FA3Config;
  
  constructor(config: FA3Config) {
    this.config = config;
  }
  
  generateInvoiceXml(
    invoice: Invoice,
    businessProfile: BusinessProfile,
    customer: Customer
  ): string {
    // Complete implementation with all required fields
  }
  
  private validateInvoiceData(invoice: Invoice): ValidationResult {
    // Pre-submission validation
  }
  
  private formatNIP(nip: string): string {
    // Remove dashes, validate format
  }
  
  private mapVatRate(rate: number | null): string {
    // Map to KSeF codes: 23, 8, 5, 0, zw, np, oo
  }
  
  private formatCurrency(amount: number): string {
    // Format to 2 decimal places
  }
}
```

### 2.2 Field Mapping

**Complete mapping table**:

| KsięgaI Field | FA(3) Element | Required | Notes |
|---------------|---------------|----------|-------|
| `businessProfile.taxId` | `Podmiot1/DaneIdentyfikacyjne/NIP` | | Remove dashes |
| `businessProfile.name` | `Podmiot1/DaneIdentyfikacyjne/Nazwa` | | Max 240 chars |
| `businessProfile.address` | `Podmiot1/Adres/AdresL1` | | Street + number |
| `businessProfile.city` + `postalCode` | `Podmiot1/Adres/AdresL2` | | Format: "00-000 City" |
| `customer.taxId` | `Podmiot2/DaneIdentyfikacyjne/NIP` | | Optional for individuals |
| `customer.name` | `Podmiot2/DaneIdentyfikacyjne/Nazwa` | | |
| `invoice.invoiceNumber` | `Fa/P_2A` | | Must be unique |
| `invoice.issueDate` | `Fa/P_1` | | Format: YYYY-MM-DD |
| `invoice.dueDate` | `Fa/P_6` | | Payment due date |
| `item.name` | `FaWiersz/P_7` | | Description |
| `item.quantity` | `FaWiersz/P_8A` | | |
| `item.unit` | `FaWiersz/P_8B` | | Default: "szt" |
| `item.unitPrice` | `FaWiersz/P_9A` | | Net price |
| `item.totalNetValue` | `FaWiersz/P_11` | | Calculated |
| `item.vatRate` | `FaWiersz/P_12` | | Code: 23, 8, 5, 0, zw |
| `invoice.totalNetValue` | `Podsumowanie/P_13_1` | | Sum of all lines |
| `invoice.totalVatValue` | `Podsumowanie/P_14_1` | | Sum of VAT |
| `invoice.totalGrossValue` | `Podsumowanie/P_15` | | Net + VAT |

### 2.3 XML Validation

**Location**: `src/shared/services/ksef/ksefValidator.ts`

```typescript
export class KsefValidator {
  validateXmlStructure(xml: string): ValidationResult {
    // Validate against XSD schema
  }
  
  validateBusinessRules(invoice: Invoice): ValidationResult {
    // Check totals match
    // Verify required fields
    // Validate NIP format
  }
  
  validateBeforeSubmission(xml: string): ValidationResult {
    // Combined validation
  }
}
```

---

## Phase 3: KSeF API Client

### 3.1 Session Management

**Location**: `src/shared/services/ksef/ksefApiClient.ts`

```typescript
export class KsefApiClient {
  private baseUrl: string;
  private sessionToken: string | null = null;
  
  constructor(environment: 'test' | 'production') {
    this.baseUrl = environment === 'test' 
      ? 'https://ksef-test.mf.gov.pl/api'
      : 'https://ksef.mf.gov.pl/api';
  }
  
  async initSession(token: string): Promise<SessionResponse> {
    const response = await fetch(`${this.baseUrl}/online/Session/InitToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });
    
    const data = await response.json();
    this.sessionToken = data.sessionToken;
    return data;
  }
  
  async terminateSession(): Promise<void> {
    // Close session
  }
}
```

### 3.2 Invoice Submission

```typescript
interface SubmitInvoiceRequest {
  invoiceXml: string;
  businessProfileId: string;
}

interface SubmitInvoiceResponse {
  elementReferenceNumber: string;
  processingCode: number;
  processingDescription: string;
  timestamp: string;
}

async submitInvoice(request: SubmitInvoiceRequest): Promise<SubmitInvoiceResponse> {
  if (!this.sessionToken) {
    throw new Error('Session not initialized');
  }
  
  const response = await fetch(`${this.baseUrl}/online/Invoice/Send`, {
    method: 'POST',
    headers: {
      'SessionToken': this.sessionToken,
      'Content-Type': 'application/xml',
    },
    body: request.invoiceXml
  });
  
  if (!response.ok) {
    throw await this.handleError(response);
  }
  
  return await response.json();
}
```

### 3.3 UPO Retrieval

```typescript
async getUpo(referenceNumber: string): Promise<string> {
  const response = await fetch(
    `${this.baseUrl}/online/Invoice/Upo/${referenceNumber}`,
    {
      headers: { 'SessionToken': this.sessionToken }
    }
  );
  
  return await response.text(); // Returns XML UPO
}
```

---

## Phase 4: Error Handling & Retry Logic

### 4.1 Error Classification

**Location**: `src/shared/services/ksef/ksefErrors.ts`

```typescript
export enum KsefErrorType {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'auth_error',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  DUPLICATE_INVOICE = 'duplicate_invoice',
  RATE_LIMIT = 'rate_limit',
}

export class KsefError extends Error {
  constructor(
    public type: KsefErrorType,
    public code: number,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
  }
}
```

### 4.2 Retry Strategy

```typescript
export class KsefRetryHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        await this.delay(this.getBackoffDelay(attempt));
      }
    }
    
    throw lastError!;
  }
  
  private shouldRetry(error: Error, attempt: number): boolean {
    if (error instanceof KsefError) {
      return error.retryable && attempt < 3;
    }
    return false;
  }
  
  private getBackoffDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return Math.pow(2, attempt) * 1000;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.3 Offline24 Queue

**Database table**:
```sql
CREATE TABLE ksef_submission_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  business_profile_id UUID REFERENCES business_profiles(id) NOT NULL,
  xml_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deadline_at TIMESTAMPTZ NOT NULL
);
```

**Queue processor** (Supabase Edge Function - runs every hour):
```typescript
// Process queued invoices
// Retry failed submissions
// Alert if approaching 24h deadline
```

---

## Phase 5: Database Updates

### 5.1 Invoice Status Updates

**After successful submission**:
```sql
UPDATE invoices SET
  ksef_status = 'submitted',
  ksef_reference_number = ${referenceNumber},
  ksef_submitted_at = NOW(),
  ksef_upo = ${upoXml},
  ksef_error = NULL
WHERE id = ${invoiceId};
```

**After failed submission**:
```sql
UPDATE invoices SET
  ksef_status = 'error',
  ksef_error = ${errorMessage},
  ksef_submitted_at = NULL
WHERE id = ${invoiceId};
```

### 5.2 Audit Log

```sql
CREATE TABLE ksef_submission_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id),
  business_profile_id UUID REFERENCES business_profiles(id),
  action TEXT NOT NULL, -- 'submit', 'retry', 'error'
  status_code INTEGER,
  request_xml TEXT,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

## Phase 6: UI Integration

### 6.1 Invoice Detail - Send Button

**Location**: `src/modules/invoices/components/InvoiceDetail.tsx`

```tsx
<Button
  onClick={handleSendToKsef}
  disabled={!canSendToKsef}
  loading={isSending}
>
  <Send className="w-4 h-4 mr-2" />
  Wyślij do KSeF
</Button>
```

**Validation before send**:
- Invoice must be finalized
- Business profile must have KSeF enabled
- All required fields present
- No existing KSeF reference

### 6.2 Status Badge Component

**Location**: `src/modules/invoices/components/KsefStatusBadge.tsx`

```tsx
interface KsefStatusBadgeProps {
  status: 'none' | 'pending' | 'submitted' | 'error';
  referenceNumber?: string;
  errorMessage?: string;
}

export function KsefStatusBadge({ status, referenceNumber, errorMessage }: KsefStatusBadgeProps) {
  const variants = {
    none: { color: 'gray', icon: MinusCircle, text: 'Nie wysłano' },
    pending: { color: 'yellow', icon: Clock, text: 'Oczekuje' },
    submitted: { color: 'green', icon: CheckCircle, text: 'Wysłano' },
    error: { color: 'red', icon: XCircle, text: 'Błąd' },
  };
  
  // Render badge with tooltip showing details
}
```

### 6.3 UPO Viewer Modal

**Location**: `src/modules/invoices/components/KsefUpoModal.tsx`

```tsx
export function KsefUpoModal({ invoiceId, upoXml }: Props) {
  // Display UPO details
  // Download UPO as PDF option
  // Show KSeF reference number
  // Show submission timestamp
}
```

---

## Phase 7: Supabase Edge Functions

### 7.1 Submit Invoice Function

**Location**: `supabase/functions/ksef-submit-invoice/index.ts`

```typescript
serve(async (req) => {
  const { invoiceId, businessProfileId } = await req.json();
  
  // 1. Fetch invoice, business profile, customer
  // 2. Get KSeF token from encrypted storage
  // 3. Generate FA(3) XML
  // 4. Validate XML
  // 5. Initialize KSeF session
  // 6. Submit invoice
  // 7. Get UPO
  // 8. Update database
  // 9. Return result
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### 7.2 Process Queue Function

**Location**: `supabase/functions/ksef-process-queue/index.ts`

**Cron schedule**: Every hour

```typescript
serve(async (req) => {
  // Fetch pending queue items
  // Process each with retry logic
  // Update statuses
  // Send alerts for items approaching deadline
});
```

---

## Phase 8: Testing Strategy

### 8.1 Unit Tests

- XML generation for various invoice types
- Field mapping accuracy
- Validation logic
- Error handling

### 8.2 Integration Tests

- Token management flow
- API client methods
- Database updates
- Queue processing

### 8.3 End-to-End Tests

**Test scenarios**:
1. Send valid invoice → Success
2. Send duplicate invoice → Error 409
3. Send with missing NIP → Validation error
4. Send with incorrect totals → Validation error
5. Network timeout → Retry → Success
6. KSeF unavailable → Queue → Process later
7. Token expired → Refresh → Retry
8. Retrieve UPO after submission

---

## Implementation Timeline

### Week 1-2: Foundation
- Database migrations
- Token management service
- Settings UI
- XML generator refactor

### Week 3-4: Core Integration
- KSeF API client
- Session management
- Invoice submission flow
- Error handling

### Week 5: Reliability
- Retry logic
- Offline24 queue
- Audit logging
- Edge functions

### Week 6: UI/UX
- Status badges
- Send button integration
- UPO viewer
- Error displays

### Week 7: Testing
- Unit tests
- Integration tests
- E2E tests
- Test environment validation

### Week 8: Production Prep
- Security audit
- Performance testing
- Documentation
- Production token setup
- Gradual rollout

---

## Success Criteria

- Invoice can be sent to KSeF with one click
- UPO is retrieved and stored automatically
- Errors are handled gracefully with user-friendly messages
- Offline24 queue ensures no invoice is lost
- All submissions are logged for audit
- Token management is secure and automated
- 99%+ success rate for valid invoices
- Average submission time < 3 seconds

---

## Next Steps

1. Begin Phase 1 implementation
2. Set up test KSeF environment access
3. Obtain test tokens for development
4. Create XML samples for all invoice types
5. Review with stakeholders