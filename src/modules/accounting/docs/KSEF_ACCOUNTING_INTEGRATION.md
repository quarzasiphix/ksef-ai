# KSeF-Accounting Integration Architecture

## 🎯 Core Principle: Separation of Concerns

**KSeF Status ≠ Accounting Status**

- **KSeF**: Document submission to government system (none/pending/submitted/error)
- **Accounting**: Financial posting to Chart of Accounts (unposted/posted/needs_review)

These are **independent state machines** that must remain decoupled.

---

## 📊 Compliance Health Matrix

| KSeF Status | Accounting Status | Badge | Meaning |
|-------------|------------------|-------|---------|
| `submitted` | `posted` | ✅ Green | Fully compliant |
| `submitted` | `needs_review` | ⚠️ Yellow | KSeF ok, posting pending |
| `submitted` | `unposted` | ⚠️ Yellow | KSeF ok, not posted yet |
| `error` | `posted` | ⚠️ Orange | Posted internally, KSeF failed |
| `error` | `unposted` | 🔴 Red | Both failed |
| `none` | `posted` | ℹ️ Blue | Posted, no KSeF required |

---

## 🏗️ Architecture Components

### 1. **Journal Entry Extensions**

Add KSeF tracking to journal headers:

```sql
ALTER TABLE journal_entries ADD COLUMN ksef_reference_number TEXT;
ALTER TABLE journal_entries ADD COLUMN ksef_session_reference_number TEXT;
ALTER TABLE journal_entries ADD COLUMN ksef_upo_url TEXT;

-- Prevent duplicate journals for same source
CREATE UNIQUE INDEX idx_journal_entries_source 
ON journal_entries(source_type, source_id) 
WHERE source_id IS NOT NULL;
```

### 2. **Business Profile Policy**

Add posting trigger policy:

```sql
ALTER TABLE business_profiles 
ADD COLUMN accounting_post_on TEXT DEFAULT 'ksef_submitted'
CHECK (accounting_post_on IN ('ksef_submitted', 'upo_available', 'manual'));
```

**Policies:**
- `ksef_submitted` - Post when KSeF submission succeeds (recommended)
- `upo_available` - Wait for UPO confirmation before posting
- `manual` - Only post via manual review queue

### 3. **Posting Orchestrator (Idempotent)**

Central function for all posting operations:

```sql
CREATE OR REPLACE FUNCTION orchestrate_posting_for_invoice(
  p_invoice_id UUID,
  p_trigger TEXT -- 'invoice_issued' | 'ksef_submitted' | 'payment_registered' | 'manual_request'
) RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_journal_id UUID;
  v_policy TEXT;
  v_result JSONB;
BEGIN
  -- Get invoice and policy
  SELECT i.*, bp.accounting_post_on
  INTO v_invoice
  FROM invoices i
  JOIN business_profiles bp ON bp.id = i.business_profile_id
  WHERE i.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Idempotency: Check if already posted
  IF v_invoice.posting_status = 'posted' AND v_invoice.journal_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 
      'action', 'noop', 
      'reason', 'Already posted',
      'journal_entry_id', v_invoice.journal_entry_id
    );
  END IF;
  
  -- Respect needs_review status (don't overwrite user work)
  IF v_invoice.posting_status = 'needs_review' AND p_trigger != 'manual_request' THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'skipped',
      'reason', 'Needs manual review'
    );
  END IF;
  
  -- Check policy: should we post now?
  v_policy := v_invoice.accounting_post_on;
  
  IF v_policy = 'ksef_submitted' AND p_trigger = 'ksef_submitted' THEN
    -- Policy allows posting on KSeF submission
    -- Call auto-posting logic
    v_result := auto_post_invoice_with_journal(p_invoice_id);
    RETURN v_result;
  ELSIF v_policy = 'upo_available' AND v_invoice.ksef_upo IS NOT NULL THEN
    -- Policy requires UPO before posting
    v_result := auto_post_invoice_with_journal(p_invoice_id);
    RETURN v_result;
  ELSIF v_policy = 'manual' OR p_trigger = 'manual_request' THEN
    -- Manual posting only
    RETURN jsonb_build_object(
      'success', true,
      'action', 'queued',
      'reason', 'Manual posting required'
    );
  ELSE
    -- Policy not met yet
    RETURN jsonb_build_object(
      'success', true,
      'action', 'deferred',
      'reason', 'Policy conditions not met'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 4. **Posting Facts Bundle**

Normalize invoice data for posting rules:

```typescript
interface PostingFacts {
  // Core invoice data
  invoice_id: string;
  invoice_kind: 'income' | 'expense';
  issue_date: string;
  
  // Financial data
  total_net: number;
  total_vat: number;
  total_gross: number;
  currency: string;
  fx_rate?: number;
  
  // VAT breakdown
  vat_status: 'vat' | 'no_vat' | 'reverse_charge' | 'exempt';
  vat_rates: Array<{
    rate: number;
    net: number;
    vat: number;
  }>;
  
  // Payment
  payment_method: 'bank' | 'cash' | 'card' | 'other';
  payment_status: 'unpaid' | 'partial' | 'paid';
  
  // Contractor
  contractor_id?: string;
  contractor_nip?: string;
  contractor_country?: string;
  
  // KSeF tracking
  ksef_submitted: boolean;
  ksef_reference_number?: string;
  ksef_session_reference_number?: string;
  ksef_upo_url?: string;
  
  // Document type (future-proof)
  document_type: 'invoice' | 'correction' | 'advance' | 'final';
  corrects_invoice_id?: string;
}
```

### 5. **KSeF Retrieval Integration**

When pulling invoices from KSeF:

```typescript
async function processRetrievedKsefInvoice(ksefInvoice: KsefInvoiceData) {
  // 1. Try to match to existing local invoice
  const localInvoice = await matchKsefToLocalInvoice(ksefInvoice);
  
  if (localInvoice) {
    // 2. Update local invoice with KSeF references
    await supabase
      .from('invoices')
      .update({
        ksef_reference_number: ksefInvoice.referenceNumber,
        ksef_session_reference_number: ksefInvoice.sessionReference,
        ksef_upo: ksefInvoice.upo,
        ksef_status: 'submitted',
      })
      .eq('id', localInvoice.id);
    
    // 3. Link journal if exists
    if (localInvoice.journal_entry_id) {
      await supabase
        .from('journal_entries')
        .update({
          ksef_reference_number: ksefInvoice.referenceNumber,
          ksef_session_reference_number: ksefInvoice.sessionReference,
          ksef_upo_url: ksefInvoice.upoUrl,
        })
        .eq('id', localInvoice.journal_entry_id);
    }
    
    // 4. Trigger posting if policy allows
    await orchestratePostingForInvoice(localInvoice.id, 'ksef_submitted');
  } else {
    // 5. Create inbox entry (not auto-posted)
    await createReceivedInvoiceInbox(ksefInvoice);
  }
}
```

---

## 🔄 Posting Workflow

### **Trigger Points**

1. **Invoice Issued** (optional)
   - User creates invoice locally
   - Can trigger draft journal creation
   - Not recommended for auto-posting

2. **KSeF Submitted** (recommended)
   - Invoice successfully submitted to KSeF
   - `ksef_status = 'submitted'`
   - `ksef_reference_number` set
   - Trigger: `orchestrate_posting_for_invoice(id, 'ksef_submitted')`

3. **UPO Available** (stricter)
   - KSeF confirmation received
   - `ksef_upo` populated
   - Only if policy = `upo_available`

4. **Payment Registered** (future)
   - Bank transaction matched
   - Can update journal with payment details

5. **Manual Request**
   - User clicks "Post" in review queue
   - Always allowed regardless of policy

### **Idempotency Guarantees**

- ✅ Multiple triggers don't create duplicate journals
- ✅ Unique constraint on `(source_type, source_id)`
- ✅ Check `posting_status = 'posted'` before creating
- ✅ Respect `needs_review` status (don't overwrite)
- ✅ Return `noop` if already posted

---

## 🎨 UI Components

### **Invoice Detail Page**

Show both statuses separately:

```tsx
<div className="flex gap-4">
  {/* KSeF Status */}
  <Badge variant={ksefStatusVariant(invoice.ksef_status)}>
    KSeF: {invoice.ksef_status}
  </Badge>
  
  {/* Accounting Status */}
  <Badge variant={accountingStatusVariant(invoice.posting_status)}>
    Accounting: {invoice.posting_status}
  </Badge>
  
  {/* Compliance Health */}
  <ComplianceHealthBadge 
    ksefStatus={invoice.ksef_status}
    accountingStatus={invoice.posting_status}
  />
</div>
```

### **Compliance Health Badge**

```tsx
function ComplianceHealthBadge({ ksefStatus, accountingStatus }) {
  if (ksefStatus === 'submitted' && accountingStatus === 'posted') {
    return <Badge className="bg-green-500">✅ Fully Compliant</Badge>;
  }
  
  if (ksefStatus === 'submitted' && accountingStatus === 'needs_review') {
    return <Badge className="bg-yellow-500">⚠️ KSeF OK, Posting Pending</Badge>;
  }
  
  if (ksefStatus === 'error' && accountingStatus === 'posted') {
    return <Badge className="bg-orange-500">⚠️ Posted, KSeF Failed</Badge>;
  }
  
  if (ksefStatus === 'error' && accountingStatus === 'unposted') {
    return <Badge className="bg-red-500">🔴 Both Failed</Badge>;
  }
  
  if (ksefStatus === 'none' && accountingStatus === 'posted') {
    return <Badge className="bg-blue-500">ℹ️ Posted (No KSeF)</Badge>;
  }
  
  return <Badge variant="secondary">Pending</Badge>;
}
```

### **Event Drawer (Read-Only)**

```tsx
{/* In Event Drawer */}
{invoice.journal_entry_id && (
  <Button
    variant="ghost"
    onClick={() => navigate(`/accounting/journal/${invoice.journal_entry_id}`)}
  >
    View Posting →
  </Button>
)}
```

### **Posting Queue Filters**

Add KSeF-aware filters:

```tsx
<Select>
  <option value="all">All Unposted</option>
  <option value="ksef_submitted">KSeF Submitted, Needs Posting</option>
  <option value="ksef_error">KSeF Error, Needs Review</option>
  <option value="no_ksef">No KSeF Required</option>
</Select>
```

---

## 📋 Migration Checklist

### **Database Changes**

- [ ] Add `ksef_reference_number` to `journal_entries`
- [ ] Add `ksef_session_reference_number` to `journal_entries`
- [ ] Add `ksef_upo_url` to `journal_entries`
- [ ] Add unique constraint on `(source_type, source_id)`
- [ ] Add `accounting_post_on` policy to `business_profiles`
- [ ] Create `orchestrate_posting_for_invoice` function
- [ ] Update `auto_post_invoice_with_journal` to accept PostingFacts

### **Backend Functions**

- [ ] Implement `orchestrate_posting_for_invoice`
- [ ] Hook orchestrator to KSeF submission success
- [ ] Hook orchestrator to UPO receipt
- [ ] Update KSeF retrieval to link journals
- [ ] Add PostingFacts normalization function
- [ ] Update posting rules to use PostingFacts

### **Frontend Components**

- [ ] Create `ComplianceHealthBadge` component
- [ ] Update invoice detail page with dual status
- [ ] Add KSeF filters to posting queue
- [ ] Remove posting editor from Event Drawer
- [ ] Add "View Posting" link in Event Drawer
- [ ] Update posting queue to show KSeF context

### **Documentation**

- [ ] Document KSeF-Accounting separation
- [ ] Document posting policies
- [ ] Document orchestrator usage
- [ ] Update user guide for compliance badges

---

## 🚀 Implementation Priority

### **Phase 1: Foundation (Critical)**

1. ✅ Database schema changes
2. ✅ Unique constraint on journals
3. ✅ Orchestrator function (basic)
4. ✅ Hook to KSeF submission

### **Phase 2: UI (High Priority)**

5. Compliance health badge
6. Dual status display
7. KSeF-aware posting queue
8. Event drawer cleanup (already done)

### **Phase 3: Advanced (Medium Priority)**

9. PostingFacts normalization
10. Policy configuration UI
11. KSeF retrieval integration
12. Inbox for received invoices

### **Phase 4: Future-Proofing (Low Priority)**

13. Correction invoice support
14. Advance invoice support
15. Multi-currency posting
16. Payment matching

---

## ✅ Benefits

1. **Clean Separation** - KSeF and Accounting are independent
2. **Idempotency** - No duplicate journals from retries
3. **Flexibility** - Policy-driven posting triggers
4. **Auditability** - Full KSeF reference tracking
5. **Future-Proof** - Ready for corrections, advances, etc.
6. **User Control** - Manual override always available
7. **Compliance** - Clear health indicators

---

**Status**: Architecture defined, ready for implementation  
**Next**: Database migrations and orchestrator function  
**Last Updated**: 2026-01-31 12:35 PM
