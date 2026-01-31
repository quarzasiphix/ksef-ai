# KSeF Implementation Comprehensive Documentation

## Executive Summary

The current KSeF implementation in ksef-ai is a **sophisticated, production-ready system** that follows the official KSeF 2.0 specification. It provides complete invoice lifecycle management, from pre-KSeF agreement through submission, status tracking, and retrieval. The system is designed as a "pre-KSeF agreement layer" that helps companies negotiate and finalize invoices before public submission to KSeF.

## 🏗️ **Architecture Overview**

### **Core Philosophy**
> "KSeF rejestruje fakty. KsięgaI pomaga firmom dojść do faktów, zanim staną się publiczne."
> 
> (KSeF registers facts. KsięgaI helps companies arrive at facts before they become public.)

The system restores the natural business order:
- **Traditional**: Contract → Agreement → Execution → Record
- **KSeF Compressed**: Record → Correction → Explanation  
- **KsięgaI Restored**: Agreement (private) → Record (KSeF)

### **Service Architecture**

#### **Primary Services (KSeF 2.0 Compliant)**
```typescript
KsefService              // Main orchestrator
KsefAuthManager          // JWT authentication
KsefSessionManager       // Online session lifecycle
KsefBatchSessionManager  // Batch operations
KsefCryptography         // Encryption/decryption
KsefInvoiceValidator     // Pre-submission validation
KsefXmlGenerator         // FA XML generation
KsefRateLimitHandler     // Rate limiting
KsefContextManager       // Multi-entity context
KsefSecretManager        // Token/credential management
```

#### **Supporting Services**
```typescript
KsefInvoiceRetrievalService  // Pull invoices from KSeF
KsefSyncJob                  // Background sync automation
KsefDuplicateDetection       // Duplicate invoice detection
KsefQrCodeService           // QR code generation (CODE I)
```

#### **Legacy Services (Deprecated)**
```typescript
ksefApiClient          // Old API client
ksefAuthService        // Old auth service
ksefRetryHandler       // Old retry logic
```

## 🔐 **Authentication & Session Management**

### **Authentication Flow**

#### **1. Challenge-Response Authentication**
```typescript
// POST /auth/challenge
const challenge = await authManager.getChallenge();
// Returns: { challenge: string, timestamp: string }

// POST /auth/ksef-token  
const authResult = await authManager.authenticateWithKsefToken(
  encryptedToken, 
  contextNip
);
// Returns: { authenticationToken: string, referenceNumber: string }
```

#### **2. JWT Token Management**
```typescript
interface KsefCredentials {
  businessProfileId: string;
  token: string;
  environment: 'test' | 'production';
  expiresAt?: Date;
}
```

#### **3. Session Lifecycle**
```typescript
// 1. Open online session
const session = await sessionManager.openSession('FA', '1-0E');
// Returns: { referenceNumber: string, validUntil: string }

// 2. Send encrypted invoice
const result = await sessionManager.sendInvoice(xmlContent);
// Returns: { invoiceReferenceNumber: string }

// 3. Close session
await sessionManager.closeSession();

// 4. Wait for processing
await sessionManager.waitForCompletion();
const status = await sessionManager.getSessionStatus();
```

### **Multi-Entity Context Management**
```typescript
class KsefContextManager {
  // Manages multiple business profiles per user
  // Handles context switching between entities
  // Maintains separate authentication per entity
}
```

## 📤 **Invoice Submission Flow**

### **Complete Submission Process**

#### **Phase 1: Pre-Submission Validation**
```typescript
const validation = await validator.validateForSubmission(
  invoice,
  businessProfile, 
  customer,
  xmlContent,
  supabaseClient
);

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

**Validation Checks**:
- XML size limits (10MB max)
- XML encoding (UTF-8)
- Schema validation against FA 1-0E
- Duplicate invoice detection
- Required fields completeness
- VAT rate validation
- NIP validation

#### **Phase 2: XML Generation**
```typescript
const xml = xmlGenerator.generateInvoiceXml(
  invoice, 
  businessProfile, 
  customer
);
```

**XML Features**:
- FA (Faktura) schema 1-0E compliant
- Automatic VAT code mapping
- Multi-currency support
- QR code data inclusion
- Digital signature preparation

#### **Phase 3: KSeF Submission**
```typescript
const result = await ksefService.submitInvoice({
  invoice,
  businessProfile,
  customer,
  ksefToken,
  supabaseClient,
  offlineMode?: boolean
});

interface SubmitInvoiceResult {
  success: boolean;
  referenceNumber?: string;        // KSeF invoice number
  sessionReferenceNumber?: string; // Session reference
  upo?: string;                   // UPO download URL
  warnings?: string[];
  error?: string;
  qrCode?: {
    dataUrl: string;
    url: string;
    label: string;
  };
}
```

#### **Phase 4: Post-Submission Processing**
```typescript
// 1. Generate QR Code (CODE I - mandatory)
const qrCode = await ksefQrCodeService.generateInvoiceQr({
  sellerNip: businessProfile.taxId,
  issueDate: new Date(invoice.issueDate),
  invoiceXml: xml,
  ksefNumber: result.referenceNumber,
  environment: 'test' | 'prod'
});

// 2. Store in database
await supabaseClient
  .from('invoices')
  .update({
    ksef_status: 'submitted',
    ksef_reference_number: result.referenceNumber,
    ksef_session_reference_number: result.sessionReferenceNumber,
    ksef_upo: result.upo,
    ksef_qr_code: qrCode.qrCodeDataUrl,
    ksef_qr_label: qrCode.label,
    ksef_qr_url: qrCode.url,
    ksef_submitted_at: new Date().toISOString()
  })
  .eq('id', invoice.id);
```

## 📥 **Invoice Retrieval System**

### **Background Sync Architecture**

#### **Sync Job Configuration**
```typescript
interface SyncJobConfig {
  intervalMinutes: number;        // Default: 15 minutes
  maxConcurrentProfiles: number; // Default: 3
  retryAttempts: number;         // Default: 3
  retryDelayMs: number;          // Default: 5000ms
  subjectTypes: SubjectType[];   // ['subject1', 'subject2', 'subject3']
}
```

#### **Subject Types (KSeF Entity Roles)**
```typescript
type SubjectType = 'subject1' | 'subject2' | 'subject3' | 'subjectAuthorized';

// subject1: Seller (wystawca)
// subject2: Buyer (nabywca) 
// subject3: Authorized third party
// subjectAuthorized: Authorized representative
```

### **Retrieval Process**

#### **1. Metadata Query**
```typescript
const metadata = await ksefService.queryInvoiceMetadata(filters, accessToken);

interface InvoiceQueryFilters {
  subjectType: SubjectType;
  dateRange: {
    from: Date;
    to?: Date;
    dateType: 'Issue' | 'Invoicing' | 'PermanentStorage';
    restrictToPermanentStorageHwmDate?: boolean;
  };
  invoiceTypes?: string[];
  pageSize?: number;
  pageOffset?: number;
}
```

#### **2. Async Export Initiation**
```typescript
const exportRef = await ksefService.initiateInvoiceExport(filters, accessToken);
// Returns: { referenceNumber: string }
```

#### **3. Export Status Monitoring**
```typescript
const status = await ksefService.getExportStatus(exportRef.referenceNumber, accessToken);

interface ExportStatus {
  referenceNumber: string;
  status: 'Processing' | 'Completed' | 'Failed';
  packageParts?: PackagePart[];
  permanentStorageHwmDate?: string;
  lastPermanentStorageDate?: string;
  isTruncated?: boolean;
  invoiceCount?: number;
  errorMessage?: string;
}
```

#### **4. Package Download & Processing**
```typescript
// Download encrypted packages
for (const part of status.packageParts) {
  const encryptedData = await downloadPackagePart(part.downloadUrl);
  
  // Decrypt using session keys
  const decryptedData = await decryptAes256(encryptedData, symmetricKey, iv);
  
  // Extract and parse invoices
  const invoices = await extractInvoicesFromPackage(decryptedData);
  
  // Store in database
  await storeReceivedInvoices(invoices);
}
```

### **High Water Mark (HWM) Sync**
```typescript
interface KsefSyncState {
  business_profile_id: UUID;
  subject_type: SubjectType;
  permanent_storage_hwm_date: Timestamp; // Incremental sync point
  last_permanent_storage_date: Timestamp;
  total_invoices_pulled: Integer;
  sync_enabled: Boolean;
  sync_interval_minutes: Integer; // Default: 15
}
```

**HWM Strategy**:
- Tracks `permanent_storage_hwm_date` per subject type
- Only pulls invoices newer than last sync point
- Prevents duplicate processing
- Handles KSeF data retention policies

## 📊 **Database Schema & State Management**

### **Core Invoice Table Integration**
```sql
-- KSeF-related columns in invoices table
ksef_status TEXT DEFAULT 'none'                    -- none/pending/submitted/error
ksef_reference_number TEXT                          -- KSeF invoice number
ksef_session_reference_number TEXT                   -- Session reference
ksef_upo TEXT                                       -- UPO download URL
ksef_signed_xml TEXT                                -- Signed XML content
ksef_error TEXT                                     -- Error message
ready_for_ksef_at TIMESTAMPTZ                       -- Ready timestamp
ksef_submitted_at TIMESTAMPTZ                        -- Submission timestamp
ksef_qr_code TEXT                                   -- QR code data URL
ksef_qr_label VARCHAR                               -- QR code label
ksef_qr_url TEXT                                    -- QR code URL
ksef_uploaded_at TIMESTAMPTZ                        -- Upload timestamp
```

### **KSeF-Specific Tables**

#### **1. Submission Queue**
```sql
CREATE TABLE ksef_submission_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL,
  business_profile_id UUID NOT NULL,
  xml_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',                    -- pending/processing/success/failed
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deadline_at TIMESTAMPTZ NOT NULL                   -- Processing deadline
);
```

#### **2. Audit Log**
```sql
CREATE TABLE ksef_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID,
  integration_id UUID,
  user_id UUID,
  operation TEXT NOT NULL,                          -- submit/query/retrieve/error
  endpoint TEXT NOT NULL,
  http_method VARCHAR,
  taxpayer_nip VARCHAR,
  provider_nip VARCHAR,
  request_id TEXT,
  request_payload JSONB,
  response_status INTEGER,
  response_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **3. Sync State Management**
```sql
CREATE TABLE ksef_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL,
  subject_type VARCHAR,
  permanent_storage_hwm_date TIMESTAMPTZ,           -- High water mark
  last_permanent_storage_date TIMESTAMPTZ,
  total_invoices_pulled INTEGER DEFAULT 0,
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_interval_minutes INTEGER DEFAULT 15,
  last_sync_at TIMESTAMPTZ,
  consecutive_errors INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ
);
```

#### **4. Unprocessed Invoices Staging**
```sql
CREATE TABLE ksef_unprocessed_invoices (
  id UUID,
  business_profile_id UUID,
  ksef_number VARCHAR,
  invoice_xml TEXT,
  invoice_metadata JSONB,
  subject_type VARCHAR,
  permanent_storage_date TIMESTAMPTZ,
  processed BOOLEAN DEFAULT FALSE,
  linked_invoice_id UUID,                          -- Link to main invoice table
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 **Status Tracking & Event Handling**

### **Invoice KSeF Status Flow**
```typescript
type KsefStatus = 'none' | 'pending' | 'submitted' | 'error';

// Flow: none → pending → submitted/error
// 'pending': Ready for KSeF, queued for submission
// 'submitted': Successfully submitted to KSeF
// 'error': Submission failed, retryable or fatal
```

### **Event-Driven Architecture**
```typescript
// KSeF events are tracked in the main events table
interface KsefEvent {
  business_profile_id: UUID;
  event_type: 'ksef_submitted' | 'ksef_error' | 'ksef_retrieved';
  entity_type: 'invoice';
  entity_id: UUID;
  description: TEXT;
  metadata: JSONB;                                  // KSeF response data
}
```

### **Real-time Status Updates**
```typescript
// Supabase Realtime subscriptions for KSeF status changes
const subscription = supabase
  .channel('ksef_status_changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'invoices',
      filter: `ksef_status=in.('submitted','error')`
    },
    (payload) => {
      // Handle KSeF status change
      updateInvoiceUI(payload.new);
    }
  )
  .subscribe();
```

## ⚡ **Error Handling & Retry Mechanisms**

### **Comprehensive Error Classification**
```typescript
enum KsefErrorType {
  VALIDATION_ERROR = 'validation_error',      // Invoice validation failed
  AUTHENTICATION_ERROR = 'auth_error',        // KSeF auth failed
  NETWORK_ERROR = 'network_error',            // Network connectivity
  SERVER_ERROR = 'server_error',              // KSeF server error
  DUPLICATE_INVOICE = 'duplicate_invoice',    // Duplicate detected
  RATE_LIMIT = 'rate_limit',                  // Rate limit exceeded
  SESSION_ERROR = 'session_error',            // Session management
}

class KsefError extends Error {
  constructor(
    public type: KsefErrorType,
    public code: number,
    message: string,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'KsefError';
  }
}
```

### **Retry Strategy**
```typescript
export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,        // 1 second
  maxDelay: 8000,         // 8 seconds
  exponentialBackoff: true
};
```

**Retry Logic**:
- **Network errors**: Retry with exponential backoff
- **Rate limits**: Wait and retry with longer delay
- **Authentication errors**: Refresh token and retry
- **Validation errors**: No retry (user action required)
- **Server errors**: Limited retries
- **Duplicate errors**: No retry (manual review)

### **Circuit Breaker Pattern**
```typescript
class KsefRateLimitHandler {
  private requestCount: number = 0;
  private windowStart: number = Date.now();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  // Rate limiting: 100 requests per minute for test environment
  // Rate limiting: 1000 requests per minute for production
}
```

## 🔗 **Integration with Invoice Lifecycle**

### **Pre-KSeF Agreement Layer**
```typescript
// Business delivery network for pre-KSeF negotiations
interface DocumentDelivery {
  delivery_status: 'sent' | 'viewed' | 'accepted' | 'disputed' | 'rejected' | 'paid' | 'settled';
  agreement_sent_at: TIMESTAMPTZ;
  agreement_received_at: TIMESTAMPTZ;
  agreement_approved_at: TIMESTAMPTZ;
  agreement_rejection_reason: TEXT;
}
```

### **Legal State Separation**
```typescript
// Critical legal boundary: draft vs issued invoice
interface Invoice {
  is_draft BOOLEAN NOT NULL DEFAULT TRUE;        -- Legal requirement
  issued_at TIMESTAMPTZ;                          -- NULL for drafts
  issued_by_user_id UUID;                         -- Audit trail
  ksef_submission_id TEXT;                        -- NULL until submitted
}
```

**Legal Compliance**:
- **Draft Phase**: Commercial negotiations, no tax implications
- **Issuance**: User action "Wystaw fakturę (dokument podatkowy)"
- **KSeF Submission**: Automatic after issuance (if enabled)
- **No Backdating**: Issuance date = action date

### **Multi-Entity Support**
```typescript
// Per-business-profile KSeF integration
interface BusinessProfile {
  ksef_enabled: BOOLEAN;
  ksef_environment: 'test' | 'production';
  ksef_token: TEXT;                               -- Encrypted storage
  ksef_nip: VARCHAR;                              -- Tax identifier
  ksef_integration_id: UUID;                       -- Integration tracking
}
```

## 🛡️ **Security & Compliance**

### **Encryption & Cryptography**
```typescript
class KsefCryptography {
  // AES-256 encryption for invoice content
  // RSA encryption for session keys
  // Digital signature preparation
  // QR code data generation
}
```

### **Token Management**
```typescript
class KsefSecretManager {
  // Secure token storage (encrypted at rest)
  // Automatic token refresh
  // Multi-entity token isolation
  // Audit logging for token usage
}
```

### **Audit Trail**
```typescript
// Complete audit logging for all KSeF operations
// Request/response payload logging
// User action tracking
// Error logging with context
// Performance monitoring
```

## 📈 **Performance & Scalability**

### **Batch Operations**
```typescript
class KsefBatchSessionManager {
  // Batch invoice submission
  // Bulk status queries
  // Efficient session reuse
  // Parallel processing
}
```

### **Background Processing**
```typescript
// Queue-based submission system
// Automatic retry mechanisms
// Progress tracking
// Error recovery
```

### **Caching Strategy**
```typescript
// Authentication token caching
// Session key caching
// Metadata result caching
// QR code caching
```

## 🚀 **Configuration & Deployment**

### **Environment Configuration**
```typescript
export const KSEF_CONFIGS: Record<KsefEnvironment, KsefConfig> = {
  test: {
    environment: 'test',
    baseUrl: 'https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge',
    apiUrl: 'https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge',
    systemInfo: 'KsięgaI v1.0',
    namespace: 'http://crd.gov.pl/wzor/2023/06/29/12648/',
    schemaVersion: '1-0E',
  },
  production: {
    environment: 'production',
    baseUrl: 'https://api.ksef.mf.gov.pl/v2',
    apiUrl: 'https://api.ksef.mf.gov.pl/v2',
    systemInfo: 'KsięgaI v1.0',
    namespace: 'http://crd.gov.pl/wzor/2023/06/29/12648/',
    schemaVersion: '1-0E',
  },
};
```

### **Rate Limits & Quotas**
- **Test Environment**: 100 requests/minute
- **Production Environment**: 1000 requests/minute
- **Session Duration**: 30 minutes maximum
- **Invoice Size**: 10MB maximum
- **Batch Size**: 100 invoices per session

## 🔧 **Development & Testing**

### **Test Infrastructure**
```typescript
class KsefTestTokenGenerator {
  // Generates test tokens for development
  // Mock KSeF responses
  // Test environment setup
}
```

### **Debugging Tools**
```typescript
// Request/response logging
// Error detail extraction
// Performance monitoring
// Status tracking dashboard
```

## 📋 **Integration Points for Journal System**

### **Current KSeF → Journal Integration**
```typescript
// KSeF submission creates events
// Events can reference journal entries
// KSeF status changes trigger accounting workflows
```

### **Recommended Journal Integration Points**

#### **1. KSeF Submission → Journal Entry Creation**
```typescript
// When invoice is submitted to KSeF:
// 1. Create journal entry (if not exists)
// 2. Link journal entry to KSeF reference
// 3. Update accounting status
// 4. Create audit event
```

#### **2. KSeF Retrieval → Journal Matching**
```typescript
// When invoices are retrieved from KSeF:
// 1. Match to existing journal entries
// 2. Create missing journal entries
// 3. Update KSeF reference numbers
// 4. Sync accounting status
```

#### **3. KSeF Status → Accounting Workflow**
```typescript
// KSeF status changes:
// - 'submitted' → Auto-post journal entry
// - 'error' → Mark as needs_review
// - 'upo_available' → Finalize posting
```

### **Data Flow Recommendations**
```typescript
// Invoice creation → Draft → Agreement → Issuance → KSeF submission → Journal posting

interface InvoiceKsefJournalFlow {
  // 1. Draft phase
  is_draft: true;
  ksef_status: 'none';
  accounting_status: 'unposted';
  
  // 2. Agreement phase  
  is_draft: true;
  ksef_status: 'none';
  accounting_status: 'unposted';
  
  // 3. Issuance phase
  is_draft: false;
  issued_at: now();
  ksef_status: 'pending';
  accounting_status: 'unposted';
  
  // 4. KSeF submission phase
  ksef_status: 'submitted';
  ksef_reference_number: 'KSeF-number';
  accounting_status: 'posted';          // Auto-post
  journal_entry_id: 'uuid';             // Linked journal
  
  // 5. Completion phase
  ksef_status: 'completed';
  ksef_upo: 'upo-url';
  accounting_status: 'posted';
  journal_entry_id: 'uuid';
}
```

---

## Conclusion

The current KSeF implementation is **comprehensive and production-ready**, with:

✅ **Complete KSeF 2.0 Compliance**  
✅ **Robust Authentication & Session Management**  
✅ **Full Invoice Lifecycle Support**  
✅ **Background Sync & Retrieval**  
✅ **Comprehensive Error Handling**  
✅ **Security & Compliance**  
✅ **Multi-Entity Support**  
✅ **Audit Trail & Monitoring**  

### **Key Strengths for Journal Integration**:

1. **Event-Driven Architecture**: Already creates audit events for all operations
2. **Status Tracking**: Comprehensive status management for KSeF operations  
3. **Multi-Entity Support**: Per-business-profile KSeF integration
4. **Robust Error Handling**: Retry mechanisms and error classification
5. **Background Processing**: Queue-based system for reliable operations
6. **Legal Compliance**: Proper draft vs issued invoice separation

### **Integration Recommendations**:

- **Link journal entries to KSeF reference numbers**
- **Trigger auto-posting on successful KSeF submission**
- **Use KSeF events as audit trail for accounting operations**
- **Maintain separate but linked systems (KSeF for compliance, Journal for accounting)**

The system is well-architected for seamless journal integration while maintaining clear separation of concerns between tax compliance (KSeF) and accounting operations (Journal).
