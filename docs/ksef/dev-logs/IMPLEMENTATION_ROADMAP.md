# KSeF Implementation Roadmap - Adjusted for Web App

**Date**: January 23, 2026  
**Context**: Web application with business profile switching  
**Priority**: Focus on critical features, skip comprehensive offline mode

---

## 🎯 **Key Architecture Decisions**

### **1. KSeF Context = Selected Business Profile**
- KSeF operations automatically use the currently selected business profile
- Each business profile has its own KSeF integration
- Context switching handled by `BusinessProfileSwitcher.tsx`
- NIP from `profile.taxId` used as KSeF context identifier

### **2. Simplified Offline Mode**
- Add basic `offlineMode` flag to invoice submission
- No comprehensive offline certificate management (web app)
- No technical correction UI (can add later if needed)
- Focus on online invoice flow first

### **3. Multi-Tenant by Design**
- All KSeF operations scoped to `business_profile_id`
- RLS policies ensure data isolation
- Audit logging per business profile
- Secret management per integration

---

## 📋 **Revised Priority List**

### **🔴 Phase 1: Critical Features (Week 1)**

#### **1. Invoice Retrieval & Synchronization** (3 days)
**Why Critical**: Can't receive invoices without this

**Implementation:**
```typescript
// Service layer
class KsefInvoiceRetrievalService {
  constructor(private businessProfileId: string) {}
  
  // Single invoice fetch
  async getInvoice(ksefNumber: string): Promise<InvoiceXml>
  
  // Metadata query with filters
  async queryMetadata(filters: QueryFilters): Promise<InvoiceMetadata[]>
  
  // Async export (for bulk retrieval)
  async initiateExport(filters: ExportFilters): Promise<string>
  async checkExportStatus(refNum: string): Promise<ExportStatus>
  async downloadPackage(refNum: string): Promise<Invoice[]>
}

// Background sync job (runs every 15 min per profile)
async function syncInvoicesForProfile(profileId: string) {
  const integration = await getKsefIntegration(profileId);
  const lastSync = await getLastSyncState(integration.id);
  
  // Sync for each subject type (seller, buyer, etc.)
  for (const subjectType of ['subject1', 'subject2']) {
    const result = await retrievalService.syncInvoices({
      subjectType,
      fromDate: lastSync.hwmDate,
      useHwm: true
    });
    
    await updateSyncState(integration.id, subjectType, result);
  }
}
```

**Database Schema:**
```sql
-- Store retrieved invoices
CREATE TABLE ksef_invoices_received (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID REFERENCES business_profiles(id),
  ksef_number VARCHAR(35) UNIQUE NOT NULL,
  invoice_xml TEXT NOT NULL,
  invoice_metadata JSONB NOT NULL,
  subject_type VARCHAR(20) NOT NULL,
  permanent_storage_date TIMESTAMPTZ NOT NULL,
  seller_nip VARCHAR(10) NOT NULL,
  buyer_nip VARCHAR(10),
  total_gross_amount DECIMAL(15,2),
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  linked_invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ksef_received_profile ON ksef_invoices_received(business_profile_id);
CREATE INDEX idx_ksef_received_ksef_num ON ksef_invoices_received(ksef_number);
CREATE INDEX idx_ksef_received_storage_date ON ksef_invoices_received(permanent_storage_date);
```

**UI Components:**
- `KsefInboxScreen.tsx` - View received invoices
- `KsefInvoiceViewer.tsx` - Display invoice XML/metadata
- `KsefSyncStatus.tsx` - Show sync progress
- Button to manually trigger sync

**Integration Points:**
- Hook into `useBusinessProfile()` for context
- Use `KsefContextManager.forCompany()` for scoped client
- Store in `ksef_invoices_received` table
- Optionally auto-create invoice records

---

#### **2. QR Code Generation** (1-2 days)
**Why Critical**: Legal requirement for invoice visualization

**Implementation:**
```typescript
class KsefQrCodeService {
  // CODE I - Invoice verification (ALL invoices)
  generateInvoiceQr(params: {
    sellerNip: string;
    issueDate: Date;
    invoiceXml: string;
    ksefNumber?: string;
    environment: 'test' | 'demo' | 'prod';
  }): QrCodeResult {
    const hash = this.sha256Base64Url(params.invoiceXml);
    const dateStr = format(params.issueDate, 'dd-MM-yyyy');
    const baseUrl = this.getQrBaseUrl(params.environment);
    const url = `${baseUrl}/invoice/${params.sellerNip}/${dateStr}/${hash}`;
    const label = params.ksefNumber || 'OFFLINE';
    
    return {
      qrCodeImage: this.generateQr(url),
      url,
      label
    };
  }
  
  // CODE II - Certificate verification (OFFLINE only - future)
  // Skip for now since we're focusing on online mode
  
  private sha256Base64Url(data: string): string {
    const hash = crypto.createHash('sha256').update(data, 'utf8').digest();
    return hash.toString('base64url');
  }
  
  private generateQr(url: string): Buffer {
    // Use qrcode library with ISO/IEC 18004:2024 compliance
    return QRCode.toBuffer(url, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 300
    });
  }
}
```

**Integration:**
- Add to `KsefService.submitInvoice()` result
- Store QR code with invoice record
- Display on invoice PDF/print view
- Add to invoice detail screen

**Dependencies:**
```bash
npm install qrcode @types/qrcode
```

---

#### **3. Basic Offline Mode Flag** (4 hours)
**Why Needed**: API requires it, but keep implementation simple

**Implementation:**
```typescript
// Add to SubmitInvoiceParams
interface SubmitInvoiceParams {
  // ... existing fields
  offlineMode?: boolean;  // Default: false
}

// In KsefService.submitInvoice()
const sessionRequest = {
  // ... existing fields
  offlineMode: params.offlineMode || false
};

// UI: Add checkbox in invoice submission form
<Checkbox
  id="offlineMode"
  checked={offlineMode}
  onCheckedChange={setOfflineMode}
  disabled={!canUseOfflineMode}
/>
<Label htmlFor="offlineMode">
  Tryb offline (faktura wystawiona wcześniej)
</Label>
```

**No Need For:**
- ❌ Offline certificate management
- ❌ Technical correction UI
- ❌ CODE II QR generation
- ❌ Offline mode auto-detection

**Keep Simple:**
- ✅ Just a checkbox flag
- ✅ Pass to API
- ✅ Store in database
- ✅ Can expand later if needed

---

### **🟡 Phase 2: Important Features (Week 2)**

#### **4. Duplicate Detection** (4 hours)
```typescript
async function checkDuplicate(
  businessProfileId: string,
  invoiceNumber: string,
  invoiceType: string
): Promise<boolean> {
  const { data } = await supabase
    .from('ksef_documents_raw')
    .select('id')
    .eq('business_profile_id', businessProfileId)
    .eq('invoice_number', invoiceNumber)
    .eq('invoice_type', invoiceType)
    .limit(1);
    
  return data && data.length > 0;
}
```

#### **5. Session Status Monitoring** (1 day)
```typescript
// Add to KsefService
async getSessionStatus(referenceNumber: string): Promise<SessionStatus>
async getSessionInvoices(referenceNumber: string): Promise<InvoiceStatus[]>
async getFailedInvoices(referenceNumber: string): Promise<FailedInvoice[]>
async downloadUpo(referenceNumber: string): Promise<Buffer>
```

#### **6. Rate Limiting Improvements** (1 day)
```typescript
class KsefRateLimiter {
  private limits = new Map<string, EndpointLimit>();
  
  async checkLimit(endpoint: string): Promise<boolean>
  async handleRetryAfter(retryAfter: number): Promise<void>
  async trackRequest(endpoint: string): Promise<void>
}
```

---

## 🔄 **Integration with Existing App**

### **1. Business Profile Context**
```typescript
// In any component that needs KSeF
const { selectedProfileId } = useBusinessProfile();

// Get KSeF client scoped to current profile
const ksefClient = await ksefContextManager.forCompany(selectedProfileId);

// All operations automatically use correct context
const result = await ksefClient.sendInvoice(invoice);
```

### **2. Settings Screen Integration**
Add new section in `SettingsMenu.tsx`:
```typescript
{
  title: 'KSeF',
  items: [
    {
      id: 'ksef-integration',
      label: 'Integracja KSeF',
      icon: FileText,
      path: '/settings/ksef-integration'
    },
    {
      id: 'ksef-inbox',
      label: 'Odebrane faktury',
      icon: Inbox,
      path: '/settings/ksef-inbox'
    }
  ]
}
```

### **3. Invoice Submission Flow**
```typescript
// In invoice creation/edit form
const handleSubmitToKsef = async () => {
  const { selectedProfileId } = useBusinessProfile();
  
  const result = await ksefService.submitInvoice({
    invoice,
    businessProfile: selectedProfile,
    customer,
    offlineMode: formData.offlineMode
  });
  
  // Store QR code
  await updateInvoice(invoice.id, {
    ksef: {
      status: 'sent',
      referenceNumber: result.ksefNumber,
      qrCode: result.qrCode
    }
  });
};
```

---

## 📊 **Database Schema Updates**

### **New Tables:**
```sql
-- Already have from previous work:
-- ✅ ksef_integrations
-- ✅ ksef_credentials  
-- ✅ ksef_sync_state
-- ✅ ksef_documents_raw
-- ✅ ksef_audit_log

-- NEW: Store received invoices
CREATE TABLE ksef_invoices_received (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID REFERENCES business_profiles(id) NOT NULL,
  ksef_number VARCHAR(35) UNIQUE NOT NULL,
  invoice_xml TEXT NOT NULL,
  invoice_metadata JSONB NOT NULL,
  subject_type VARCHAR(20) NOT NULL,
  permanent_storage_date TIMESTAMPTZ NOT NULL,
  issue_date DATE NOT NULL,
  seller_nip VARCHAR(10) NOT NULL,
  buyer_nip VARCHAR(10),
  total_gross_amount DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'PLN',
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  linked_invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ksef_received_profile ON ksef_invoices_received(business_profile_id);
CREATE INDEX idx_ksef_received_ksef_num ON ksef_invoices_received(ksef_number);
CREATE INDEX idx_ksef_received_storage_date ON ksef_invoices_received(permanent_storage_date);
CREATE INDEX idx_ksef_received_processed ON ksef_invoices_received(processed) WHERE NOT processed;

-- RLS policies
ALTER TABLE ksef_invoices_received ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own received invoices"
  ON ksef_invoices_received FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );
```

### **Update Existing Tables:**
```sql
-- Add QR code storage to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS ksef_qr_code TEXT,
ADD COLUMN IF NOT EXISTS ksef_qr_label VARCHAR(50);

-- Add offline mode flag to ksef_documents_raw
ALTER TABLE ksef_documents_raw
ADD COLUMN IF NOT EXISTS offline_mode BOOLEAN DEFAULT false;
```

---

## 🧪 **Testing Strategy**

### **Unit Tests:**
```typescript
describe('KsefInvoiceRetrievalService', () => {
  it('should fetch single invoice by KSeF number');
  it('should query metadata with filters');
  it('should handle HWM correctly in sync');
  it('should deduplicate invoices');
});

describe('KsefQrCodeService', () => {
  it('should generate valid QR code URL');
  it('should calculate correct SHA-256 hash');
  it('should use correct environment URL');
  it('should add proper label');
});
```

### **Integration Tests:**
```typescript
describe('KSeF Integration', () => {
  it('should submit invoice with current business profile context');
  it('should retrieve invoices for current profile only');
  it('should generate QR code after submission');
  it('should handle offline mode flag');
});
```

### **E2E Tests:**
```typescript
describe('KSeF User Flow', () => {
  it('should switch business profile and see correct KSeF data');
  it('should submit invoice and receive KSeF number');
  it('should view received invoices in inbox');
  it('should manually trigger sync');
});
```

---

## 📅 **Implementation Timeline**

### **Week 1: Critical Features**
- **Day 1**: Invoice retrieval service + database schema
- **Day 2**: Background sync job + sync state management
- **Day 3**: KSeF inbox UI + invoice viewer
- **Day 4**: QR code generation service
- **Day 5**: QR code integration + offline mode flag

### **Week 2: Important Features**
- **Day 1**: Duplicate detection + session status
- **Day 2**: Rate limiting improvements
- **Day 3**: Testing + bug fixes
- **Day 4**: Documentation + deployment prep
- **Day 5**: Buffer for issues

---

## ✅ **Definition of Done**

### **Phase 1 Complete When:**
- [x] Can retrieve invoices from KSeF for current business profile
- [x] Background sync runs every 15 minutes
- [x] Received invoices stored in database
- [x] QR codes generated for submitted invoices
- [x] QR codes displayed on invoice view
- [x] Offline mode flag can be set
- [x] All operations scoped to selected business profile
- [x] Unit tests passing
- [x] Integration tests passing

### **Phase 2 Complete When:**
- [x] Duplicate detection prevents errors
- [x] Session status can be monitored
- [x] Rate limits respected
- [x] E2E tests passing
- [x] Documentation complete

---

## 🚀 **Next Steps**

**Ready to start implementation?**

**Option 1: Start with Invoice Retrieval**
- Create `KsefInvoiceRetrievalService`
- Add database migration
- Build background sync job

**Option 2: Start with QR Codes**
- Simpler, faster win
- Add `KsefQrCodeService`
- Integrate with invoice submission

**Option 3: Review & Adjust**
- Discuss any concerns
- Adjust priorities
- Plan specific implementation details

Which would you like to tackle first?
