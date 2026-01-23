# KSeF Multi-Tenant Context Switching Architecture

**Created**: January 22, 2026  
**Purpose**: Enable Tovernet to manage KSeF operations for multiple client companies with proper isolation

---

## 🎯 **Core Concept**

**Context Switching** = Making KSeF API calls **WITH** Tovernet credentials **FOR** client company context

```
┌─────────────────────────────────────────────────────────────┐
│  Tovernet (Provider)                                        │
│  - Has system KSeF token/certificate                        │
│  - Granted permissions by multiple clients                  │
│  - Makes API calls on behalf of clients                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ API Call
                           │ Auth: Tovernet token
                           │ Context: Client NIP
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  KSeF API                                                   │
│  - Validates Tovernet has permission for Client NIP         │
│  - Returns data scoped to Client NIP context                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Client Company (Taxpayer)                                  │
│  - Granted Tovernet permission in KSeF portal               │
│  - Their invoices are accessed via Tovernet's calls         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 **Database Schema**

### **1. ksef_credentials** (System-Level)
Stores Tovernet's KSeF authentication credentials

```sql
- id: UUID
- provider_nip: VARCHAR(10) -- Tovernet NIP
- auth_type: 'token' | 'certificate'
- secret_ref: TEXT -- Reference to Vault/KMS
- expires_at: TIMESTAMPTZ
- is_active: BOOLEAN
```

**Key Points**:
- ONE set of credentials per provider (Tovernet)
- Secrets stored in secure vault (never in DB)
- Used for ALL client operations

### **2. ksef_integrations** (Per-Tenant)
Tracks which clients granted Tovernet permission

```sql
- id: UUID
- company_id: UUID -- Internal company reference
- taxpayer_nip: VARCHAR(10) -- Client NIP
- provider_nip: VARCHAR(10) -- Tovernet NIP
- status: 'pending' | 'active' | 'revoked' | 'error'
- granted_scopes: JSONB -- ["InvoiceRead", "InvoiceWrite"]
- last_verified_at: TIMESTAMPTZ
```

**Key Points**:
- ONE row per client company
- Status tracks permission lifecycle
- Scopes define what operations are allowed

### **3. ksef_sync_state** (Per-Tenant)
Tracks synchronization state for inbox polling

```sql
- company_id: UUID
- integration_id: UUID
- last_pull_timestamp: TIMESTAMPTZ
- last_pull_cursor: TEXT -- KSeF continuation token
- sync_enabled: BOOLEAN
```

**Key Points**:
- Used by background jobs
- Enables incremental sync
- Per-company isolation

### **4. ksef_documents_raw** (Immutable Storage)
Stores all KSeF documents as received

```sql
- id: UUID
- company_id: UUID
- ksef_number: VARCHAR(35)
- document_type: 'invoice' | 'upo' | 'correction'
- raw_xml: TEXT
- direction: 'incoming' | 'outgoing'
- processed: BOOLEAN
```

**Key Points**:
- Immutable audit trail
- Raw XML preserved
- Links to normalized invoices

### **5. ksef_audit_log** (All Operations)
Comprehensive audit trail

```sql
- company_id: UUID
- operation: VARCHAR(50)
- taxpayer_nip: VARCHAR(10) -- Client context
- provider_nip: VARCHAR(10) -- Tovernet auth
- response_status: INTEGER
- duration_ms: INTEGER
- error_message: TEXT
```

**Key Points**:
- Every API call logged
- Security and compliance
- Performance monitoring

---

## 🔄 **API Wrapper Pattern**

### **Usage**

```typescript
import { KsefContextManager } from './ksefContextManager';

// 1. Initialize context manager
const contextManager = new KsefContextManager(config, supabase);

// 2. Get company-scoped client
const ksefClient = await contextManager.forCompany(companyId);

// 3. Make API calls (automatically scoped)
const invoices = await ksefClient.listInvoices({ from, to });
const invoice = await ksefClient.getInvoice(ksefNumber);
const result = await ksefClient.sendInvoice(invoiceXml);
```

### **What Happens Internally**

```typescript
forCompany(companyId) {
  // 1. Load integration
  const integration = await getActiveIntegration(companyId);
  // → taxpayer_nip = "1234567890" (client)
  
  // 2. Load provider credentials
  const credential = await getProviderCredential(integration.provider_nip);
  // → provider_nip = "0000000000" (Tovernet)
  
  // 3. Get access token
  const token = await getAccessToken(credential);
  // → Bearer token for Tovernet
  
  // 4. Create scoped client
  return new KsefCompanyClient(service, integration, this);
  // → All calls use: Auth=Tovernet, Context=Client
}
```

### **Request Structure**

```http
POST /api/v2/sessions/online
Authorization: Bearer <TOVERNET_TOKEN>
X-KSeF-Taxpayer-NIP: 1234567890  # Client context
Content-Type: application/json

{
  "invoice": "...",
  "taxpayerContext": {
    "nip": "1234567890"
  }
}
```

---

## 🔐 **Security Architecture**

### **1. Multi-Tenant Isolation**

```typescript
// ✅ CORRECT - Scoped to company
const client = await contextManager.forCompany(companyId);
const invoices = await client.listInvoices();
// → Only sees invoices for this company

// ❌ WRONG - Global access
const invoices = await ksefApi.listAllInvoices();
// → Would see all companies (security breach)
```

### **2. Secret Management**

```typescript
// ❌ WRONG - Secret in database
INSERT INTO ksef_credentials (secret) VALUES ('actual_token_here');

// ✅ CORRECT - Reference to vault
INSERT INTO ksef_credentials (secret_ref) VALUES ('ksef_tovernet_token');

// Retrieve from vault
const token = await vault.getSecret('ksef_tovernet_token');
```

### **3. Audit Trail**

Every operation is logged:
```typescript
await logOperation({
  companyId: '...',
  operation: 'send_invoice',
  taxpayerNip: '1234567890', // Client
  providerNip: '0000000000', // Tovernet
  responseStatus: 200,
  durationMs: 1234,
});
```

---

## 🚀 **Onboarding Flow**

### **Step 1: Client Grants Permission in KSeF Portal**

Client goes to KSeF portal and:
1. Navigates to Permissions
2. Grants permission to Tovernet NIP
3. Selects scopes: `InvoiceRead`, `InvoiceWrite`
4. Confirms

### **Step 2: Client Adds Integration in KsięgaI**

```typescript
// UI: "Add KSeF Integration" form
const integration = await contextManager.createIntegration({
  companyId: currentCompany.id,
  taxpayerNip: currentCompany.nip,
  providerNip: TOVERNET_NIP,
  grantedScopes: ['InvoiceRead', 'InvoiceWrite'],
});
// → Status: 'pending'
```

### **Step 3: System Verifies Permission**

```typescript
// Automatic verification
const result = await contextManager.verifyIntegration(companyId);

if (result.success) {
  // → Status: 'active'
  // → Show success message
} else {
  // → Status: 'error'
  // → Show: "Permission not found. Please grant in KSeF portal."
}
```

### **Step 4: Background Sync Starts**

```typescript
// Cron job runs every 15 minutes
async function syncKsefInbox(companyId: string) {
  const client = await contextManager.forCompany(companyId);
  const invoices = await client.listInvoices({
    from: lastSyncTimestamp,
    type: 'incoming',
  });
  
  for (const invoice of invoices) {
    await storeRawDocument(invoice);
    await parseAndNormalize(invoice);
    await emitEvent('KSEF_INVOICE_RECEIVED', invoice);
  }
}
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Database & Core** ✅
- [x] Create database schema
- [x] Add RLS policies
- [x] Create helper functions
- [x] Build context manager

### **Phase 2: API Integration** ⬜
- [ ] Implement secret retrieval from vault
- [ ] Add KSeF API context injection
- [ ] Build verification endpoint
- [ ] Add error handling for revoked permissions

### **Phase 3: Background Sync** ⬜
- [ ] Create inbox polling job
- [ ] Implement document storage
- [ ] Build XML parser
- [ ] Add event emission

### **Phase 4: UI Components** ⬜
- [ ] Integration management page
- [ ] Onboarding wizard
- [ ] Status dashboard
- [ ] Audit log viewer

---

## 🔍 **Error Handling**

### **Permission Revoked**

```typescript
try {
  const invoices = await client.listInvoices();
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    // Update integration status
    await contextManager.revokeIntegration(companyId, 'Permission revoked by client');
    
    // Notify user
    await notifyUser({
      type: 'warning',
      message: 'KSeF permission was revoked. Please grant permission again.',
    });
  }
}
```

### **Token Expired**

```typescript
try {
  const invoices = await client.listInvoices();
} catch (error) {
  if (error.code === 'TOKEN_EXPIRED') {
    // Refresh token
    await refreshProviderToken();
    
    // Retry once
    return await client.listInvoices();
  }
}
```

### **Integration Not Active**

```typescript
const client = await contextManager.forCompany(companyId);
// → Throws: "KSeF integration is not active (status: pending)"

// Show user: "Please complete KSeF integration setup"
```

---

## 📊 **Monitoring & Observability**

### **Key Metrics**

1. **Integration Health**
   - Active integrations count
   - Failed verifications
   - Last successful sync per company

2. **API Performance**
   - Average response time per operation
   - Error rate by company
   - Rate limit hits

3. **Sync Status**
   - Documents synced per day
   - Sync lag (time behind real-time)
   - Failed sync attempts

### **Dashboards**

```sql
-- Active integrations
SELECT status, COUNT(*) 
FROM ksef_integrations 
GROUP BY status;

-- Recent errors
SELECT company_id, operation, error_message, created_at
FROM ksef_audit_log
WHERE response_status >= 400
ORDER BY created_at DESC
LIMIT 50;

-- Sync health
SELECT 
  company_id,
  last_pull_timestamp,
  EXTRACT(EPOCH FROM (NOW() - last_pull_timestamp))/60 as minutes_since_sync,
  consecutive_errors
FROM ksef_sync_state
WHERE sync_enabled = true;
```

---

## 🎓 **Key Principles**

1. **Never Mix Contexts** - Each API call is explicitly scoped to one company
2. **Audit Everything** - Every operation logged for security and debugging
3. **Fail Safely** - Permission errors don't affect other companies
4. **Verify Early** - Test connection before marking integration active
5. **Secrets Server-Side** - Never expose tokens to browser
6. **Immutable Storage** - Raw documents preserved for audit trail

---

## 🔗 **Related Documentation**

- `uprawnienia.md` - Official KSeF permissions specification
- `20260122_ksef_multi_tenant_context_switching.sql` - Database schema
- `ksefContextManager.ts` - Implementation code
- `COMPREHENSIVE_DOCUMENTATION_REVIEW.md` - Full KSeF review

---

## ✅ **Status**

**Implementation**: 60% Complete
- ✅ Database schema
- ✅ Context manager core
- ⬜ Secret management integration
- ⬜ Background sync jobs
- ⬜ UI components

**Next Steps**:
1. Integrate with Supabase Vault for secrets
2. Build verification endpoint
3. Create onboarding UI
4. Implement background sync

---

**Architecture Status**: ✅ **PRODUCTION-READY DESIGN**  
**Implementation Status**: ⚠️ **IN PROGRESS**  
**Estimated Completion**: 3-4 days
