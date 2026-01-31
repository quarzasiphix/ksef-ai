# Invoice Versions System Documentation

## Executive Summary

The invoice versions system is a **comprehensive audit trail and provenance tracking** implementation that creates an immutable, tamper-evident chain of every invoice state change. It provides cryptographic proof that invoices haven't been improperly edited, protecting both businesses and accountants from disputes and compliance issues.

## 🎯 **Core Purpose & Philosophy**

### **Problem Solved**
> *"If an accountant messes up and types in wrong data, you can prove you didn't edit the invoice"*

The system addresses critical business needs:
- **Audit Protection**: Cryptographic proof of invoice integrity
- **Dispute Resolution**: Clear evidence of who changed what and when
- **Compliance**: Immutable audit trail for tax authorities
- **Accountability**: Track every modification with user attribution
- **Version Control**: Git-like history for invoice documents

### **Core Principles**
- **Immutability**: Once created, versions cannot be modified
- **Cryptographic Integrity**: SHA-256 hashing + chain hashing for tamper detection
- **Complete Provenance**: Every change tracked with user, time, and reason
- **Legal Compliance**: Supports "no editing of issued invoices" requirements
- **Audit-Ready**: Exportable proof for external verification

## 🏗️ **Architecture Overview**

### **Three-Layer Architecture**

#### **1. Data Layer (Database)**
```sql
invoice_versions     -- Immutable snapshots with cryptographic hashes
invoices            -- Main invoice data with version references
invoice_events      -- Optional: Event-level tracking (future)
```

#### **2. Logic Layer (RPC Functions)**
```typescript
rpc_invoice_save_draft()           -- Save draft version
rpc_invoice_issue()               -- Issue invoice (locks it)
rpc_invoice_mark_paid()           -- Mark as paid
rpc_invoice_unmark_paid()         -- Unmark paid (requires reason)
rpc_invoice_apply_change()        -- Apply corrections/modifications
rpc_verify_invoice_chain()        -- Verify integrity
rpc_get_invoice_audit_trail()     -- Get complete history
rpc_export_invoice_audit_proof()  -- Export cryptographic proof
```

#### **3. Presentation Layer (UI)**
```typescript
VersionTimeline.tsx              -- History timeline visualization
VersionPreviewDrawer.tsx         -- Detailed version preview
InvoiceAuditTab.tsx              -- Complete audit interface
InvoiceHistoryDialog.tsx         -- Modal history view
```

## 📊 **Database Schema & Data Model**

### **Core Table: invoice_versions**
```sql
CREATE TABLE invoice_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice reference
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    
    -- Version tracking
    version_number INTEGER NOT NULL,
    
    -- Immutable snapshot
    snapshot_data JSONB NOT NULL,           -- Complete invoice state
    snapshot_hash TEXT NOT NULL,            -- SHA-256 of snapshot
    
    -- Change metadata
    change_type TEXT NOT NULL CHECK (change_type IN (
        'created', 'draft_saved', 'issued', 'paid', 'unpaid', 
        'cancelled', 'corrected', 'modified'
    )),
    change_reason TEXT,                      -- Optional explanation
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Business context
    business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
    
    -- Chain integrity (cryptographic linkage)
    prev_version_id UUID REFERENCES invoice_versions(id),
    chain_hash TEXT,                         -- Hash(prev_hash || snapshot_hash)
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(invoice_id, version_number)
);
```

### **Invoice Table Integration**
```sql
-- Version tracking columns in invoices table
current_version_id UUID,              -- Links to current version
current_version_number INTEGER DEFAULT 0,
primary_chain_id UUID,                 -- Links to version chain
```

### **Data Types Explained**

#### **InvoiceVersion Interface**
```typescript
interface InvoiceVersion {
  version_id: string;
  version_number: number;
  change_type: 'created' | 'draft_saved' | 'issued' | 'paid' | 'unpaid' | 'corrected' | 'modified' | 'cancelled';
  change_reason: string | null;
  changed_by: string;
  changed_at: string;
  snapshot_hash: string;               // SHA-256 of snapshot_data
  chain_hash: string;                  // Tamper-evident chain hash
  snapshot_data: InvoiceSnapshot;      // Complete invoice state
}
```

#### **InvoiceSnapshot Structure**
```typescript
interface InvoiceSnapshot {
  invoice_id: string;
  invoice_number: string;
  issue_date: string;
  sale_date: string;
  due_date: string;
  type?: string;
  payment_status: string;
  is_paid?: boolean;
  business_profile_id: string;
  customer_id: string;
  total_amount: number;
  total_net: number;
  total_vat: number;
  currency: string;
  payment_method: string;
  comments?: string | null;
  notes?: string | null;
  items: InvoiceItemSnapshot[];       // Complete line items
}
```

## 🔐 **Cryptographic Security Model**

### **Hash-Based Integrity**

#### **1. Snapshot Hash**
```sql
-- SHA-256 hash of canonical JSON snapshot
snapshot_hash = SHA256(canonical_json(snapshot_data))
```

**Purpose**: Detect any modification to invoice data
- **Immutable**: Cannot be changed after creation
- **Unique**: Different data always produces different hash
- **Verifiable**: Anyone can re-compute and verify

#### **2. Chain Hash**
```sql
-- Cryptographic linkage between versions
chain_hash = SHA256(prev_chain_hash || snapshot_hash)

-- First version: chain_hash = SHA256('' || snapshot_hash)
-- Subsequent: chain_hash = SHA256(previous_chain_hash || current_snapshot_hash)
```

**Purpose**: Detect tampering with version sequence
- **Tamper-Evident**: Any modification breaks the chain
- **Sequential**: Each version cryptographically links to previous
- **Irreversible**: Cannot insert/remove versions without detection

### **Verification Process**
```typescript
interface ChainVerification {
  valid: boolean;
  invoice_id: string;
  version_count: number;
  errors: ChainVerificationError[];
  verified_at: string;
  verified_by: string;
}

interface ChainVerificationError {
  version_number: number;
  version_id: string;
  error_type: 'snapshot_hash_mismatch' | 'chain_hash_mismatch' | 
              'initial_chain_hash_invalid' | 'missing_prev_version_link';
  expected?: string;
  computed?: string;
  actual?: string;
  message: string;
}
```

## 🔄 **Version Lifecycle & State Management**

### **Change Types & Their Meanings**

#### **Draft Phase (Editable)**
- **`created`**: Initial invoice creation
- **`draft_saved`**: Manual draft save (user action)

#### **Issuance (Legal Transition)**
- **`issued`**: **LOCKING EVENT** - Invoice becomes legal document
  - Sets `is_locked = true`
  - Prevents further editing
  - Triggers KSeF submission (if enabled)
  - Creates legal issuance timestamp

#### **Post-Issuance (Limited Changes)**
- **`paid`**: Mark as paid (reversible with reason)
- **`unpaid`**: Unmark paid (requires reason)
- **`corrected`**: Tax corrections (credit notes)
- **`modified`**: Administrative changes (rare, requires reason)
- **`cancelled`**: Invoice cancellation

### **State Flow Diagram**
```
Created → Draft Saved → Issued (LOCKED) → Paid/Unpaid
                                   ↓
                              Corrected/Modified/Cancelled
```

### **Locking Mechanism**
```typescript
// Once issued, invoice becomes read-only
if (change_type === 'issued') {
  // Set invoice.is_locked = true
  // Prevent further editing
  // Only allow specific post-issuance changes
}
```

## 📱 **User Interface Components**

### **1. VersionTimeline.tsx - History Visualization**

#### **Features**
- **Chronological Timeline**: Visual version history with icons
- **Filtering Options**: By type (content/payment/accounting) and time
- **Change Type Icons**: Visual indicators for different operations
- **Hash Display**: Truncated hashes with copy functionality
- **Version Actions**: Preview, compare, copy hash
- **Lock Indicators**: Visual badges for locked versions

#### **Change Type Icons**
```typescript
const getChangeTypeIcon = (changeType: string) => {
  switch (changeType) {
    case 'created': return <FileText className="h-4 w-4 text-blue-400" />;
    case 'draft_saved': return <Edit className="h-4 w-4 text-amber-400" />;
    case 'issued': return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'paid': return <DollarSign className="h-4 w-4 text-green-400" />;
    case 'unpaid': return <AlertCircle className="h-4 w-4 text-amber-400" />;
    case 'cancelled': return <XCircle className="h-4 w-4 text-red-400" />;
    case 'corrected':
    case 'modified': return <Edit className="h-4 w-4 text-purple-400" />;
  }
};
```

### **2. VersionPreviewDrawer.tsx - Detailed View**

#### **Features**
- **Read-Only Display**: Complete invoice snapshot
- **Version Metadata**: Version number, change type, timestamp
- **Hash Verification**: Full hash display
- **PDF Download**: Historical PDF generation (TODO)
- **Warning Banner**: Clear "read-only only" indication

#### **Content Sections**
```typescript
// 1. Invoice Details
// 2. Line Items (complete with calculations)
// 3. Financial Totals
// 4. Version Metadata
// 5. Cryptographic Hashes
```

### **3. InvoiceAuditTab.tsx - Complete Audit Interface**

#### **Features**
- **Full Audit Trail**: Complete version + event history
- **Verification Status**: Chain integrity validation
- **Export Functionality**: Download audit proof
- **Error Reporting**: Verification failures with details

## 🔧 **Backend Implementation**

### **RPC Functions Overview**

#### **1. State Management Functions**
```sql
-- Save draft (creates new version)
rpc_invoice_save_draft(p_invoice_id, p_change_reason)

-- Issue invoice (locks it, creates version)
rpc_invoice_issue(p_invoice_id, p_invoice_number, p_issue_date, p_change_reason)

-- Payment operations
rpc_invoice_mark_paid(p_invoice_id, p_payment_date, p_payment_method, p_change_reason)
rpc_invoice_unmark_paid(p_invoice_id, p_change_reason)

-- Post-issuance changes
rpc_invoice_apply_change(p_invoice_id, p_change_type, p_change_reason, p_changes)
```

#### **2. Audit & Verification Functions**
```sql
-- Get complete audit trail
rpc_get_invoice_audit_trail(p_invoice_id)

-- Verify chain integrity
rpc_verify_invoice_chain(p_invoice_id)

-- Export cryptographic proof
rpc_export_invoice_audit_proof(p_invoice_id)
```

### **Repository Pattern**
```typescript
export const invoiceAuditRepository = {
  async saveDraft(invoiceId: string, changeReason?: string): Promise<InvoiceStateChangeResult>
  async issueInvoice(invoiceId: string, invoiceNumber: string, issueDate?: string, changeReason?: string): Promise<InvoiceStateChangeResult>
  async markPaid(invoiceId: string, paymentDate?: string, paymentMethod?: string, changeReason?: string): Promise<InvoiceStateChangeResult>
  async unmarkPaid(invoiceId: string, changeReason: string): Promise<InvoiceStateChangeResult>
  async applyChange(invoiceId: string, changeType: string, changeReason: string, changes: Record<string, any>): Promise<InvoiceStateChangeResult>
  async verifyChain(invoiceId: string): Promise<ChainVerification>
  async getAuditTrail(invoiceId: string): Promise<InvoiceAuditTrail>
  async exportAuditProof(invoiceId: string): Promise<AuditProof>
  async downloadAuditProof(invoiceId: string, invoiceNumber?: string): Promise<void>
};
```

## 🛡️ **Security & Compliance Features**

### **Immutable Audit Trail**
- **No Deletions**: Versions cannot be deleted
- **No Modifications**: Snapshot data is immutable
- **Cryptographic Proof**: Tamper-evident chain hashing
- **User Attribution**: Every change tracked to specific user

### **Legal Compliance**
- **Draft vs Issued Separation**: Clear legal boundary
- **Issuance Timestamp**: Exact moment of legal document creation
- **Change Reasons**: Mandatory explanations for post-issuance changes
- **Audit Export**: Portable proof for external verification

### **Access Control**
```sql
-- RLS Policies
-- Users can view versions for their business profiles only
-- Users can create versions for invoices they can access
-- Audit trail access controlled by business profile membership
```

## 📈 **Performance & Scalability**

### **Database Optimization**
```sql
-- Performance indexes
CREATE INDEX idx_invoice_versions_invoice_id ON invoice_versions(invoice_id);
CREATE INDEX idx_invoice_versions_business_profile_id ON invoice_versions(business_profile_id);
CREATE INDEX idx_invoice_versions_changed_at ON invoice_versions(changed_at DESC);
CREATE INDEX idx_invoice_versions_change_type ON invoice_versions(change_type);
CREATE INDEX idx_invoice_versions_chain ON invoice_versions(invoice_id, version_number);
```

### **Efficient Queries**
- **Version Retrieval**: Optimized by invoice_id and version_number
- **Audit Trail**: Single RPC call for complete history
- **Chain Verification**: Efficient hash validation
- **Business Profile Filtering**: Fast access by business context

## 🔍 **Audit Proof System**

### **AuditProof Structure**
```typescript
interface AuditProof {
  proof_type: 'invoice_audit_chain';
  proof_version: string;
  generated_at: string;
  generated_by: string;
  invoice: {
    id: string;
    invoice_number: string;
    issue_date: string;
    total_amount: number;
    currency: string;
    status: string;
    is_locked: boolean;
  };
  audit_trail: InvoiceAuditTrail;
  instructions: string;  // How to verify the proof
}
```

### **Verification Instructions**
The audit proof includes:
- **Complete Version History**: All snapshots with hashes
- **Chain Validation**: Step-by-step hash verification
- **External Verification**: Instructions for third-party validation
- **Legal Standing**: Explanation of proof validity

### **Export Formats**
- **JSON**: Complete machine-readable proof
- **PDF**: Human-readable audit report (future)
- **CSV**: Summary data for accounting systems (future)

## 🚀 **Integration Points**

### **Invoice Detail Page Integration**
```typescript
// InvoiceDetail.tsx includes:
const [showHistory, setShowHistory] = useState(false);

// History button in UI
<Button onClick={() => setShowHistory(true)}>
  Historia wersji
</Button>

// Modal integration
<InvoiceHistoryDialog 
  open={showHistory}
  onOpenChange={setShowHistory}
  invoiceId={invoice.id}
/>
```

### **Accounting System Integration**
- **Journal Entry Linking**: Versions can reference journal entries
- **Posting Status**: Accounting status tracked in versions
- **Audit Correlation**: Accounting changes linked to invoice versions

### **KSeF Integration**
- **Submission Tracking**: KSeF status changes create versions
- **UPO Storage**: UPO documents stored with versions
- **Compliance**: KSeF requires immutable audit trails

## 📋 **Use Cases & Scenarios**

### **1. Accountant Error Scenario**
**Problem**: Accountant accidentally enters wrong VAT rate
**Solution**: 
- Original version shows correct data
- Accountant's change creates new version with reason
- Cryptographic proof shows exactly what changed
- Business can demonstrate original correct data

### **2. Tax Authority Audit**
**Problem**: Tax authority questions invoice authenticity
**Solution**:
- Export complete audit proof
- Show cryptographic chain integrity
- Demonstrate no unauthorized modifications
- Provide complete change history with user attribution

### **3. Customer Dispute**
**Problem**: Customer claims invoice was changed after issuance
**Solution**:
- Show issued version with timestamp
- Prove no modifications occurred since issuance
- Demonstrate cryptographic integrity
- Provide legal evidence of document stability

### **4. Internal Review**
**Problem**: Management needs to review invoice changes
**Solution**:
- Complete version timeline
- Filter by date range or change type
- User attribution for all changes
- Business reason for each modification

## 🔮 **Future Enhancements**

### **Planned Features**
- **PDF Version Generation**: Historical PDFs for each version
- **Automated Verification**: Periodic chain integrity checks
- **Advanced Filtering**: More sophisticated audit trail filtering
- **Integration Extensions**: Links to more external systems
- **Mobile Interface**: Optimized mobile audit viewing

### **Potential Extensions**
- **Smart Contract Integration**: Blockchain-based verification
- **Multi-Entity Auditing**: Cross-business audit trails
- **AI Anomaly Detection**: Automatic suspicious change detection
- **Advanced Reporting**: Sophisticated audit analytics

---

## Conclusion

The invoice versions system provides **robust, cryptographically-secure audit trails** that protect businesses from disputes and ensure compliance. It creates an **immutable, tamper-evident chain** of every invoice change, providing clear proof of document integrity.

### **Key Benefits**:
✅ **Cryptographic Proof**: SHA-256 + chain hashing prevents tampering  
✅ **Complete Audit Trail**: Every change tracked with user, time, and reason  
✅ **Legal Compliance**: Supports "no editing" requirements for issued invoices  
✅ **Dispute Resolution**: Clear evidence of what changed and when  
✅ **User-Friendly**: Intuitive UI for viewing and comparing versions  
✅ **Exportable Proof**: Portable audit verification for external parties  

### **Implementation Status**:
- ✅ **Database Schema**: Complete with cryptographic hashing
- ✅ **Backend Logic**: All RPC functions implemented
- ✅ **Frontend UI**: Timeline, preview, and audit interfaces
- ✅ **Integration**: Connected to invoice detail pages
- 🔄 **PDF Generation**: Planned enhancement
- 🔄 **Advanced Analytics**: Future development

The system successfully addresses the core requirement: **"If an accountant messes up, you can prove you didn't edit the invoice"** through comprehensive cryptographic audit trails and immutable version tracking.
