# KSeF Implementation - Comprehensive Gap Analysis

**Analysis Date**: January 23, 2026  
**Documents Reviewed**: 31 official KSeF 2.0 documentation files  
**Current Implementation Status**: 90% Complete (Foundation)

---

## 📋 **Executive Summary**

After comprehensive review of all official KSeF 2.0 documentation, our implementation has a **solid foundation** but is missing several **critical production features**. The multi-tenant architecture and secret management are production-ready, but we need to implement:

1. **Invoice retrieval and synchronization** (HIGH PRIORITY)
2. **QR code generation** (HIGH PRIORITY - Legal requirement)
3. **Offline mode support** (HIGH PRIORITY - Legal requirement)
4. **XSD validation** (MEDIUM PRIORITY)
5. **Batch session improvements** (MEDIUM PRIORITY)
6. **Rate limiting compliance** (MEDIUM PRIORITY)

---

## ✅ **What We Have (Implemented)**

### **1. Core Authentication & Authorization** ✅
- JWT-based authentication
- Token refresh mechanism
- XAdES signature support
- KSeF token authentication
- Session management

### **2. Multi-Tenant Context Switching** ✅
- Database schema with 5 tables
- Company-scoped API clients
- RLS policies for isolation
- Audit logging
- Integration management

### **3. Secret Management** ✅
- Supabase Vault integration
- Token caching (2-layer)
- Credential rotation
- Expiry monitoring
- Access control

### **4. Interactive Session (Basic)** ✅
- Session opening
- Invoice submission
- Session closing
- Encryption (AES-256-CBC)

### **5. Batch Session (Basic)** ✅
- Batch session manager
- ZIP file handling
- Multi-part upload

### **6. Rate Limiting (Basic)** ✅
- Rate limit handler
- Retry logic
- Exponential backoff

---

## ❌ **Critical Gaps (Must Implement)**

### **GAP 1: Invoice Retrieval & Synchronization** 🔴 **CRITICAL**

**What's Missing:**
- No implementation of invoice fetching from KSeF
- No incremental synchronization with HWM (High Water Mark)
- No background sync job
- No local storage of retrieved invoices

**Required Endpoints:**
```typescript
// Missing implementations:
GET /invoices/ksef/{ksefNumber}              // Get single invoice
POST /invoices/query/metadata                 // Query invoice metadata
POST /invoices/exports                        // Async export initialization
GET /invoices/exports/{referenceNumber}       // Check export status
```

**What Official Docs Say:**
- **Incremental sync** is the recommended approach (przyrostowe-pobieranie-faktur.md)
- Must use `PermanentStorage` date type with `RestrictToPermanentStorageHwmDate = true`
- HWM mechanism ensures completeness
- Sync per subject type (Podmiot1, Podmiot2, Podmiot3)
- 15-minute minimum interval recommended
- Deduplicate by KSeF number from `_metadata.json`

**Implementation Priority**: 🔴 **CRITICAL** - Without this, clients can't receive invoices

**Estimated Effort**: 2-3 days

---

### **GAP 2: QR Code Generation** 🔴 **CRITICAL (LEGAL REQUIREMENT)**

**What's Missing:**
- No QR code generation for invoices
- No CODE I (invoice verification)
- No CODE II (certificate verification for offline)

**What Official Docs Say (kody-qr.md):**

**CODE I - Invoice Verification (ALL invoices):**
```
Format: https://qr.ksef.mf.gov.pl/invoice/{NIP}/{DD-MM-YYYY}/{SHA256-Base64URL}
Components:
- Seller NIP
- Issue date (P_1 field)
- SHA-256 hash of invoice XML (Base64URL)
Label: KSeF number or "OFFLINE"
```

**CODE II - Certificate Verification (OFFLINE invoices only):**
```
Format: https://qr.ksef.mf.gov.pl/certificate/{ContextType}/{ContextValue}/{SellerNIP}/{CertSerial}/{InvoiceHash}/{Signature}
Components:
- Context identifier (Nip/InternalId/NipVatUe)
- Seller NIP
- Certificate serial number
- Invoice hash
- Digital signature (RSASSA-PSS or ECDSA P-256)
Label: "CERTYFIKAT"
```

**Legal Requirement:**
- CODE I required for ALL invoices (online + offline)
- CODE II required for OFFLINE invoices only
- Must comply with ISO/IEC 18004:2024
- Must be on invoice visualization or separate file

**Implementation Priority**: 🔴 **CRITICAL** - Legal compliance requirement

**Estimated Effort**: 1-2 days

---

### **GAP 3: Offline Mode Support** 🔴 **CRITICAL (LEGAL REQUIREMENT)**

**What's Missing:**
- No offline mode flag in invoice submission
- No offline24 mode support
- No technical correction mechanism
- No automatic offline mode detection

**What Official Docs Say (tryby-offline.md):**

**Three Offline Modes:**

| Mode | Trigger | Deadline | Legal Basis |
|------|---------|----------|-------------|
| **offline24** | User choice (any time) | Next business day | art. 106nda VAT |
| **offline** | System unavailability (announced) | Next business day after restoration | art. 106nh VAT |
| **emergency** | System failure (announced) | 7 business days | art. 106nf VAT |

**Key Requirements:**
- Set `offlineMode: true` when submitting
- System auto-detects offline based on issue date vs submission date
- Generate 2 QR codes for offline invoices (CODE I + CODE II)
- Technical correction allowed for rejected offline invoices
- Correction invoice only after original gets KSeF number

**Technical Correction (korekta-techniczna.md):**
```typescript
// When offline invoice rejected due to technical error:
{
  offlineMode: true,
  hashOfCorrectedInvoice: "SHA256-of-original-rejected-invoice"
}
```

**Implementation Priority**: 🔴 **CRITICAL** - Legal compliance + common use case

**Estimated Effort**: 1 day

---

### **GAP 4: Invoice Duplicate Detection** 🟡 **HIGH**

**What's Missing:**
- No duplicate detection before submission
- No check against existing invoices

**What Official Docs Say (weryfikacja-faktury.md):**

**Duplicate Criteria:**
```
Duplicate = Same combination of:
1. Seller NIP (Podmiot1:NIP)
2. Invoice type (RodzajFaktury)
3. Invoice number (P_2)

Retention: 10 full years from end of issue year
Error code: 440 "Duplikat faktury"
```

**Implementation Priority**: 🟡 **HIGH** - Prevents submission errors

**Estimated Effort**: 4 hours

---

### **GAP 5: XSD Schema Validation** 🟡 **MEDIUM**

**What's Missing:**
- No local XSD validation before submission
- No schema version checking

**What Official Docs Say (weryfikacja-faktury.md):**

**Validation Requirements:**
- Must validate against declared schema (FA(2), FA(3))
- UTF-8 encoding without BOM
- Max size: 1 MB (no attachments), 3 MB (with attachments)
- Max 10,000 invoices per session
- Attachments only in batch mode (except technical corrections)

**Available Schemas:**
- FA(2) - Legacy format
- FA(3) - Current format (production)
- FA_PEF(3) - Peppol format
- FA_KOR_PEF(3) - Peppol correction

**Implementation Priority**: 🟡 **MEDIUM** - Catches errors before submission

**Estimated Effort**: 2-3 hours

---

## ⚠️ **Important Gaps (Should Implement)**

### **GAP 6: Session Status Monitoring** 🟡 **MEDIUM**

**What's Missing:**
- No session status checking
- No invoice status within session
- No failed invoice retrieval
- No UPO (confirmation) download

**Required Endpoints:**
```typescript
GET /sessions                                    // List sessions
GET /sessions/{refNum}                          // Session status
GET /sessions/{refNum}/invoices                 // Session invoices
GET /sessions/{refNum}/invoices/failed          // Failed invoices
GET /sessions/{refNum}/invoices/{invoiceRef}    // Invoice status
GET /sessions/{refNum}/upo                      // Session UPO
```

**What Official Docs Say (sesja-sprawdzenie-stanu-i-pobranie-upo.md):**
- Check session status after submission
- Retrieve UPO (Urzędowe Poświadczenie Odbioru)
- Get failed invoice details with error codes
- UPO available after session completion

**Implementation Priority**: 🟡 **MEDIUM** - Important for error handling

**Estimated Effort**: 1 day

---

### **GAP 7: Batch Session Improvements** 🟡 **MEDIUM**

**What's Missing:**
- No proper ZIP part splitting (>100MB)
- No parallel part upload
- No batch status monitoring
- No failed invoice handling in batch

**What Official Docs Say (sesja-wsadowa.md):**

**Batch Session Limits:**
- Max 50 ZIP files per batch
- Max 100 MB per ZIP file (before encryption)
- Max 5 GB total batch size
- Max 10,000 invoices per batch
- Each invoice processed independently (v2.0 improvement)

**Upload Timing:**
- All parts must be uploaded within 60 minutes of session opening
- Parallel upload recommended for multiple parts

**Implementation Priority**: 🟡 **MEDIUM** - Performance optimization

**Estimated Effort**: 1 day

---

### **GAP 8: Rate Limiting Compliance** 🟡 **MEDIUM**

**What's Missing:**
- No rate limit tracking per endpoint
- No 429 response handling with Retry-After
- No sliding window implementation
- No endpoint-specific limits

**What Official Docs Say (limity-api.md):**

**Critical Limits (Production):**

| Endpoint | req/s | req/min | req/h |
|----------|-------|---------|-------|
| POST /invoices/exports | 4 | 8 | 20 |
| POST /invoices/query/metadata | 8 | 16 | 20 |
| GET /invoices/ksef/{num} | 8 | 16 | 64 |
| POST /sessions/online | 10 | 30 | 120 |
| POST /sessions/batch | 10 | 20 | 60 |

**Rate Limit Model:**
- Sliding window (not fixed intervals)
- Per (context + IP address) pair
- HTTP 429 with `Retry-After` header
- Multiple violations = longer blocks
- Higher limits 20:00-06:00 (night hours)

**Implementation Priority**: 🟡 **MEDIUM** - Prevents API blocks

**Estimated Effort**: 1 day

---

### **GAP 9: Certificate Management** 🟢 **LOW**

**What's Missing:**
- No KSeF certificate enrollment
- No certificate status checking
- No certificate revocation

**What Official Docs Say (certyfikaty-KSeF.md):**

**Certificate Types:**
1. **Authentication** - For API authentication only
2. **Offline** - For offline invoice signing + authentication

**Certificate Operations:**
```typescript
POST /certificates/enrollments        // Request certificate
GET /certificates/enrollments/{id}    // Check enrollment status
GET /certificates                     // List certificates
GET /certificates/{serial}            // Get certificate details
DELETE /certificates/{serial}         // Revoke certificate
GET /certificates/limits              // Check certificate quota
```

**Use Cases:**
- Offline invoice signing (requires Offline type)
- Alternative to qualified certificates
- Internal KSeF system only (not qualified)

**Implementation Priority**: 🟢 **LOW** - Optional feature

**Estimated Effort**: 1-2 days

---

### **GAP 10: Permissions Management** 🟢 **LOW**

**What's Missing:**
- No permission granting UI
- No permission verification
- No indirect permission delegation

**What Official Docs Say (uprawnienia.md):**

**KSeF 2.0 Permission Model:**
- Direct permissions (client → provider)
- Indirect permissions (client → provider → employee)
- General permissions (provider → employee for all clients)
- Self-invoicing permissions (EU entities)

**Key Endpoints:**
```typescript
POST /permissions/entities/grants     // Grant permission
DELETE /permissions/entities/grants   // Revoke permission
GET /permissions/entities/grants      // List permissions
POST /permissions/verification        // Verify permissions
```

**Implementation Priority**: 🟢 **LOW** - Admin feature

**Estimated Effort**: 2-3 days

---

## 📊 **Gap Priority Matrix**

### **🔴 CRITICAL (Must Have for Production)**
1. **Invoice Retrieval & Sync** - Can't receive invoices without this
2. **QR Code Generation** - Legal requirement
3. **Offline Mode Support** - Legal requirement + common use case

**Total Effort**: 4-6 days

### **🟡 HIGH (Should Have Soon)**
4. **Duplicate Detection** - Prevents errors
5. **XSD Validation** - Catches errors early
6. **Session Status Monitoring** - Error handling
7. **Batch Improvements** - Performance
8. **Rate Limiting** - Prevents blocks

**Total Effort**: 3-4 days

### **🟢 LOW (Nice to Have)**
9. **Certificate Management** - Optional
10. **Permissions Management** - Admin feature

**Total Effort**: 3-5 days

---

## 🎯 **Recommended Implementation Order**

### **Phase 1: Critical Features (Week 1)**
1. **Offline Mode Support** (1 day)
   - Add `offlineMode` flag
   - Implement technical correction
   - Auto-detection logic

2. **QR Code Generation** (1-2 days)
   - CODE I for all invoices
   - CODE II for offline invoices
   - ISO/IEC 18004:2024 compliance

3. **Invoice Retrieval** (2-3 days)
   - Single invoice fetch
   - Metadata query
   - Export initialization
   - Background sync job

### **Phase 2: High Priority (Week 2)**
4. **Duplicate Detection** (4 hours)
5. **XSD Validation** (2-3 hours)
6. **Session Status Monitoring** (1 day)
7. **Rate Limiting Improvements** (1 day)
8. **Batch Session Improvements** (1 day)

### **Phase 3: Optional Features (Week 3+)**
9. **Certificate Management** (1-2 days)
10. **Permissions Management** (2-3 days)

---

## 🔍 **Detailed Implementation Specifications**

### **1. Invoice Retrieval Implementation**

**Database Schema Additions:**
```sql
-- Store retrieved invoices
CREATE TABLE ksef_invoices_received (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID REFERENCES business_profiles(id),
  ksef_number VARCHAR(35) UNIQUE NOT NULL,
  invoice_xml TEXT NOT NULL,
  invoice_metadata JSONB NOT NULL,
  subject_type VARCHAR(20) NOT NULL, -- subject1, subject2, subject3
  permanent_storage_date TIMESTAMPTZ NOT NULL,
  issue_date DATE NOT NULL,
  seller_nip VARCHAR(10) NOT NULL,
  buyer_nip VARCHAR(10),
  total_gross_amount DECIMAL(15,2),
  currency VARCHAR(3),
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ksef_invoices_ksef_number ON ksef_invoices_received(ksef_number);
CREATE INDEX idx_ksef_invoices_profile ON ksef_invoices_received(business_profile_id);
CREATE INDEX idx_ksef_invoices_storage_date ON ksef_invoices_received(permanent_storage_date);
```

**Service Implementation:**
```typescript
class KsefInvoiceRetrievalService {
  // Single invoice fetch
  async getInvoice(ksefNumber: string): Promise<string>
  
  // Metadata query
  async queryInvoiceMetadata(filters: InvoiceQueryFilters): Promise<InvoiceMetadata[]>
  
  // Async export
  async initiateExport(filters: InvoiceExportFilters): Promise<string>
  async checkExportStatus(referenceNumber: string): Promise<ExportStatus>
  async downloadExportPackage(referenceNumber: string): Promise<Invoice[]>
  
  // Incremental sync with HWM
  async syncInvoices(
    businessProfileId: string,
    subjectType: SubjectType,
    fromDate?: Date
  ): Promise<SyncResult>
}
```

**Background Sync Job:**
```typescript
// Cron job: Every 15 minutes per subject type
async function ksefInboxSyncJob() {
  const activeIntegrations = await getActiveIntegrations();
  
  for (const integration of activeIntegrations) {
    for (const subjectType of ['subject1', 'subject2', 'subject3']) {
      try {
        const lastSync = await getLastSyncPoint(integration.id, subjectType);
        const result = await syncInvoices(
          integration.business_profile_id,
          subjectType,
          lastSync.permanent_storage_hwm_date
        );
        
        await updateSyncState(integration.id, subjectType, {
          last_sync_at: new Date(),
          permanent_storage_hwm_date: result.newHwmDate,
          invoices_synced: result.count
        });
      } catch (error) {
        await logSyncError(integration.id, subjectType, error);
      }
    }
  }
}
```

---

### **2. QR Code Generation Implementation**

**Service Implementation:**
```typescript
class KsefQrCodeService {
  // CODE I - Invoice verification
  generateInvoiceQrCode(
    sellerNip: string,
    issueDate: Date,
    invoiceXml: string,
    ksefNumber?: string
  ): Buffer {
    const hash = this.calculateSha256Base64Url(invoiceXml);
    const dateStr = this.formatDate(issueDate); // DD-MM-YYYY
    const url = `${KSEF_QR_URL}/invoice/${sellerNip}/${dateStr}/${hash}`;
    const label = ksefNumber || 'OFFLINE';
    return this.generateQrWithLabel(url, label);
  }
  
  // CODE II - Certificate verification (offline only)
  generateCertificateQrCode(
    contextType: ContextType,
    contextValue: string,
    sellerNip: string,
    certificateSerial: string,
    invoiceXml: string,
    privateKey: CryptoKey
  ): Buffer {
    const hash = this.calculateSha256Base64Url(invoiceXml);
    const pathToSign = `${KSEF_QR_DOMAIN}/certificate/${contextType}/${contextValue}/${sellerNip}/${certificateSerial}/${hash}`;
    const signature = this.signRsaPss(pathToSign, privateKey);
    const url = `https://${pathToSign}/${signature}`;
    return this.generateQrWithLabel(url, 'CERTYFIKAT');
  }
  
  private calculateSha256Base64Url(data: string): string {
    const hash = crypto.createHash('sha256').update(data, 'utf8').digest();
    return this.base64UrlEncode(hash);
  }
  
  private signRsaPss(data: string, privateKey: CryptoKey): string {
    // RSASSA-PSS with SHA-256, MGF1-SHA-256, salt length 32
    const signature = crypto.sign('sha256', Buffer.from(data), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    });
    return this.base64UrlEncode(signature);
  }
  
  private generateQrWithLabel(url: string, label: string): Buffer {
    // Use QR library (e.g., qrcode) with ISO/IEC 18004:2024 compliance
    const qrCode = QRCode.create(url, { errorCorrectionLevel: 'M' });
    return this.addLabelToQr(qrCode, label);
  }
}
```

---

### **3. Offline Mode Implementation**

**Update Invoice Submission:**
```typescript
interface SubmitInvoiceParams {
  invoice: Invoice;
  businessProfile: BusinessProfile;
  customer: Customer;
  ksefToken: string;
  supabaseClient: any;
  offlineMode?: boolean;  // NEW
  hashOfCorrectedInvoice?: string;  // NEW - for technical corrections
}

// In KsefService.submitInvoice():
async submitInvoice(params: SubmitInvoiceParams): Promise<SubmitInvoiceResult> {
  // ... existing validation ...
  
  // Build request with offline mode
  const request = {
    ...existingFields,
    offlineMode: params.offlineMode || false,
    hashOfCorrectedInvoice: params.hashOfCorrectedInvoice
  };
  
  // Submit to KSeF
  const result = await this.sessionManager.sendInvoice(request);
  
  // Generate QR codes
  if (params.offlineMode) {
    // Generate CODE I + CODE II
    const qrCode1 = this.qrService.generateInvoiceQrCode(...);
    const qrCode2 = this.qrService.generateCertificateQrCode(...);
    result.qrCodes = { invoice: qrCode1, certificate: qrCode2 };
  } else {
    // Generate CODE I only
    const qrCode = this.qrService.generateInvoiceQrCode(...);
    result.qrCodes = { invoice: qrCode };
  }
  
  return result;
}
```

---

## 📝 **Testing Requirements**

### **For Each Feature:**
1. **Unit tests** for core logic
2. **Integration tests** with KSeF test environment
3. **E2E tests** for complete flows
4. **Load tests** for rate limiting

### **Test Environment:**
- Use KSeF TE (test) environment
- Self-signed certificates allowed
- Test with sample NIPs
- Verify against official examples

---

## 🚀 **Deployment Checklist**

### **Before Production:**
- [ ] All critical features implemented
- [ ] QR codes comply with ISO/IEC 18004:2024
- [ ] Offline mode tested with all 3 scenarios
- [ ] Rate limits configured per environment
- [ ] Background sync job deployed
- [ ] Monitoring dashboards configured
- [ ] Error alerting set up
- [ ] Documentation updated
- [ ] User training materials prepared

---

## 📚 **Reference Documentation**

**Official KSeF 2.0 Docs:**
- Main guide: `README.md`
- API changes: `przeglad-kluczowych-zmian-ksef-api-2-0.md`
- Environments: `srodowiska.md`
- Authentication: `uwierzytelnianie.md`
- Interactive session: `sesja-interaktywna.md`
- Batch session: `sesja-wsadowa.md`
- Invoice retrieval: `pobieranie-faktur/pobieranie-faktur.md`
- Incremental sync: `pobieranie-faktur/przyrostowe-pobieranie-faktur.md`
- HWM mechanism: `pobieranie-faktur/hwm.md`
- QR codes: `kody-qr.md`
- Offline modes: `tryby-offline.md`
- Technical correction: `offline/korekta-techniczna.md`
- Validation: `faktury/weryfikacja-faktury.md`
- Rate limits: `limity/limity-api.md`
- Permissions: `uprawnienia.md`
- Certificates: `certyfikaty-KSeF.md`

**OpenAPI Specification:**
- Test: https://api-test.ksef.mf.gov.pl/docs/v2
- Demo: https://api-demo.ksef.mf.gov.pl/docs/v2
- Production: https://api.ksef.mf.gov.pl/docs/v2

---

## 🎯 **Success Metrics**

### **Phase 1 Complete When:**
- [ ] Can submit invoices in offline mode
- [ ] QR codes generated for all invoices
- [ ] Can retrieve invoices from KSeF
- [ ] Background sync running every 15 min
- [ ] All invoices stored locally

### **Phase 2 Complete When:**
- [ ] Duplicate detection prevents errors
- [ ] XSD validation catches issues early
- [ ] Session status monitored
- [ ] Rate limits respected
- [ ] Batch uploads optimized

### **Production Ready When:**
- [ ] All Phase 1 + Phase 2 complete
- [ ] 100% test coverage for critical paths
- [ ] Load tested at 2x expected volume
- [ ] Monitoring and alerting active
- [ ] Documentation complete

---

**Current Status**: 📊 **Foundation Complete (90%)**  
**Next Milestone**: 🎯 **Critical Features (Phase 1)**  
**Timeline to Production**: ⏱️ **2-3 weeks**

The foundation is solid. Focus on the 3 critical features first, then iterate on improvements.
