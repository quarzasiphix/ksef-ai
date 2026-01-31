# KSeF-Accounting Integration - Implementation Roadmap

## 🎯 Objective

Make the journal entry and accounting system future-proof for KSeF integration while maintaining clean separation of concerns.

---

## ✅ Completed

### **Phase 0: Foundation**
- ✅ Multi-line journal entry system
- ✅ Chart of Accounts integration
- ✅ Posting editor UI
- ✅ Review queue
- ✅ Event Drawer cleanup (removed accounting)
- ✅ Fixed infinite loops (VAT, ProfitLoss)

### **Phase 1: Architecture & Documentation**
- ✅ KSeF-Accounting separation architecture documented
- ✅ Compliance health matrix defined
- ✅ Posting orchestrator design
- ✅ PostingFacts bundle specification
- ✅ Migration SQL scripts created
- ✅ ComplianceHealthBadge component created
- ✅ PostingFacts types and validation
- ✅ Posting orchestrator implementation

---

## 🚧 In Progress

### **Phase 2: Database Migrations**

**Priority: HIGH**

1. **Apply KSeF tracking migration**
   ```bash
   # File: supabase/migrations/add_ksef_tracking_to_journals.sql
   ```
   - [ ] Add `ksef_reference_number` to `journal_entries`
   - [ ] Add `ksef_session_reference_number` to `journal_entries`
   - [ ] Add `ksef_upo_url` to `journal_entries`
   - [ ] Create unique constraint on `(source_type, source_id)`
   - [ ] Add `accounting_post_on` policy to `business_profiles`

2. **Apply orchestrator function migration**
   ```bash
   # File: supabase/migrations/create_orchestrate_posting_function.sql
   ```
   - [ ] Create `orchestrate_posting_for_invoice` function
   - [ ] Grant execute permissions
   - [ ] Test function with sample data

**Commands:**
```bash
# Apply migrations
supabase db push

# Or via Supabase MCP
mcp1_apply_migration project_id="rncrzxjyffxmfbnxlqtm" name="add_ksef_tracking_to_journals" query="<SQL>"
mcp1_apply_migration project_id="rncrzxjyffxmfbnxlqtm" name="create_orchestrate_posting_function" query="<SQL>"
```

---

## 📋 Pending

### **Phase 3: Backend Integration**

**Priority: HIGH**

3. **Update auto-posting to use PostingFacts**
   - [ ] Modify `autoPostInvoiceWithJournal` to accept PostingFacts
   - [ ] Update posting rules to use PostingFacts bundle
   - [ ] Add KSeF reference linking to journals

4. **Hook orchestrator to KSeF flow**
   - [ ] Find KSeF submission success handler
   - [ ] Add `onKsefSubmissionSuccess(invoiceId)` call
   - [ ] Find UPO receipt handler
   - [ ] Add `onKsefUpoReceived(invoiceId)` call
   - [ ] Test with KSeF sandbox

5. **Update journal repository**
   - [ ] Add KSeF fields to `createJournalEntry`
   - [ ] Update `createJournalFromInvoice` to include KSeF refs
   - [ ] Add function to update journal with KSeF data

### **Phase 4: UI Components**

**Priority: MEDIUM**

6. **Invoice detail page updates**
   - [ ] Add dual status display (KSeF + Accounting)
   - [ ] Integrate `ComplianceHealthBadge`
   - [ ] Show KSeF reference numbers
   - [ ] Add "View Journal" link if posted

7. **Posting queue enhancements**
   - [ ] Add KSeF status filter
   - [ ] Show KSeF context in queue
   - [ ] Add compliance health column
   - [ ] Filter: "KSeF submitted, needs posting"

8. **Event Drawer final touches**
   - [ ] Add "View Posting" read-only link
   - [ ] Show KSeF status badge
   - [ ] Link to journal entry viewer

### **Phase 5: KSeF Retrieval Integration**

**Priority: MEDIUM**

9. **Match retrieved invoices to local**
   - [ ] Implement matching logic (NIP + date + total + number)
   - [ ] Update local invoice with KSeF references
   - [ ] Link journal if exists
   - [ ] Trigger orchestrator if policy allows

10. **Inbox for received invoices**
    - [ ] Create UI for unmatched KSeF invoices
    - [ ] Allow user to accept/link to contractor
    - [ ] Trigger posting after acceptance

### **Phase 6: Policy Configuration**

**Priority: LOW**

11. **Business profile settings**
    - [ ] Add UI for `accounting_post_on` policy
    - [ ] Explain each policy option
    - [ ] Show current policy in settings
    - [ ] Allow admin to change policy

12. **Policy enforcement testing**
    - [ ] Test `ksef_submitted` policy
    - [ ] Test `upo_available` policy
    - [ ] Test `manual` policy
    - [ ] Test policy changes mid-flow

### **Phase 7: Advanced Features**

**Priority: LOW**

13. **Document type support**
    - [ ] Correction invoice posting
    - [ ] Advance invoice posting
    - [ ] Final invoice posting
    - [ ] Link corrections to originals

14. **Multi-currency support**
    - [ ] FX rate handling in PostingFacts
    - [ ] Multi-currency journal entries
    - [ ] FX gain/loss accounts

15. **Payment matching**
    - [ ] Bank transaction matching
    - [ ] Update journal with payment details
    - [ ] Payment status tracking

---

## 🔍 Testing Checklist

### **Unit Tests**
- [ ] PostingFacts validation
- [ ] Orchestrator idempotency
- [ ] Compliance health badge logic
- [ ] KSeF reference linking

### **Integration Tests**
- [ ] KSeF submission → auto-posting
- [ ] UPO receipt → posting (if policy)
- [ ] Manual posting override
- [ ] Duplicate prevention

### **E2E Tests**
- [ ] Create invoice → KSeF submit → auto-post → verify journal
- [ ] KSeF error → manual post → compliance badge
- [ ] Retrieve KSeF invoice → match → link journal
- [ ] Policy change → behavior change

---

## 📊 Success Metrics

1. **Separation of Concerns**
   - ✅ KSeF status independent from accounting status
   - ✅ No coupling between systems
   - ✅ Clear compliance indicators

2. **Idempotency**
   - ✅ No duplicate journals from retries
   - ✅ Unique constraint enforced
   - ✅ Safe to replay events

3. **Flexibility**
   - ✅ Policy-driven posting triggers
   - ✅ Manual override always available
   - ✅ Future-proof for new document types

4. **Auditability**
   - ✅ Full KSeF reference tracking
   - ✅ Posting trigger history
   - ✅ Compliance health visible

---

## 🚀 Next Actions

**Immediate (Today):**
1. Apply database migrations
2. Test orchestrator function
3. Update invoice detail page with dual status

**Short-term (This Week):**
4. Hook orchestrator to KSeF submission
5. Update posting queue with KSeF filters
6. Test end-to-end flow

**Medium-term (Next Sprint):**
7. KSeF retrieval integration
8. Policy configuration UI
9. Inbox for received invoices

**Long-term (Future):**
10. Correction invoice support
11. Multi-currency posting
12. Payment matching

---

## 📁 Files Reference

### **Created:**
- `accounting/docs/KSEF_ACCOUNTING_INTEGRATION.md` - Architecture
- `accounting/docs/IMPLEMENTATION_ROADMAP.md` - This file
- `supabase/migrations/add_ksef_tracking_to_journals.sql` - DB schema
- `supabase/migrations/create_orchestrate_posting_function.sql` - Orchestrator
- `accounting/components/ComplianceHealthBadge.tsx` - UI component
- `accounting/types/postingFacts.ts` - Type definitions
- `accounting/data/postingOrchestrator.ts` - Orchestrator client

### **To Modify:**
- `accounting/data/autoPostingRules.ts` - Use PostingFacts
- `accounting/data/journalRepository.ts` - Add KSeF fields
- `ksef/[submission handler]` - Hook orchestrator
- `invoices/[detail page]` - Add dual status
- `accounting/screens/PostingQueue.tsx` - Add KSeF filters

---

**Status**: Architecture complete, migrations ready, implementation pending  
**Next Step**: Apply database migrations  
**Last Updated**: 2026-01-31 12:45 PM
