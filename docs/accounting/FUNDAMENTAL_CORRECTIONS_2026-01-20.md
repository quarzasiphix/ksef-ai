# Fundamental Corrections to Period Control System
**Date:** January 20, 2026  
**Status:** CRITICAL - Must Fix Before UI Polish  
**Priority:** HIGHEST

---

## Critical Issues Identified

### ❌ **Issue 1: Mixing Period View with Period Closure**

**Problem:**
Currently mixing two separate concepts:
- **Viewing a period** (filtering data by month/quarter/year)
- **Closing a period** (locking and creating immutable audit artifacts)

**Consequence:**
If a period is closed, but totals are still calculated from invoices (which can be edited), then "closed" becomes a lie because totals can drift.

**Fix Required:**
```typescript
// STRICT INVARIANT:
// If period is closed/locked → read from immutable register lines + snapshots
// If period is open → read from live invoices

// ✅ CORRECT:
if (period.status === 'closed' || period.is_locked) {
  // Use snapshot from accounting_events.totals_snapshot
  totals = getFromSnapshot(eventId);
  invoices = getFromRegisterLines(period); // Immutable
} else {
  // Use live data
  totals = calculateFromInvoices(period);
  invoices = getInvoicesForPeriod(period);
}

// ❌ WRONG:
totals = calculateFromInvoices(period); // Always from invoices - DRIFT!
```

**Implementation:**
- Created `periodDataSource.ts` with `getPeriodTotals()` and `getPeriodInvoices()`
- Enforces immutability for closed periods
- Returns `source: 'snapshot' | 'live'` to make it explicit

---

### ❌ **Issue 2: "Paid" vs "Accounted" Confusion**

**Problem:**
Screenshots show invoices marked "Opłacona" (paid) but still "Draft" in accounting terms. Users confuse payment status with accounting status.

**Consequence:**
Constant support tickets: "Why is my paid invoice not showing in reports?"

**Fix Required:**
```typescript
// TWO INDEPENDENT STATUSES - ALWAYS SHOW BOTH:

// Payment Status:
type PaymentStatus = 'paid' | 'unpaid' | 'partial' | 'overdue';

// Accounting Status:
type AccountingStatus = 'unposted' | 'posted' | 'corrected' | 'locked' | 'error';

// Display in UI:
<InvoiceStatusBadges 
  paymentStatus="paid"           // 💰 Opłacona
  accountingStatus="unposted"    // ○ Niezaksięgowana
/>
```

**Implementation:**
- Created `InvoiceStatusBadges.tsx` component
- Dual badge display (payment + accounting)
- Must be used in invoice headers, lists, and cards

---

### ❌ **Issue 3: Hardcoded Deadline for Ryczałt Only**

**Problem:**
Tax deadline calculation is hardcoded: "20th of next month" for ryczałt monthly.

**Missing:**
- Quarterly settlement (PIT cadence)
- VAT monthly/quarterly (JPK)
- Skala/liniowy regimes
- Other declarations/obligations

**Fix Required:**
```typescript
// REGIME-AWARE DEADLINE CALCULATION:

interface DeadlineRules {
  taxRegime: 'ryczalt' | 'skala' | 'liniowy';
  vatCadence: 'monthly' | 'quarterly' | 'none';
  settlementCadence: 'monthly' | 'quarterly' | 'annual';
}

// Ryczałt monthly: 20th of following month
// Ryczałt quarterly: 20th of month following quarter
// Skala/Liniowy monthly: 20th of following month
// VAT monthly: 25th of following month
// VAT quarterly: 25th of month following quarter
```

**Implementation:**
- Updated `periodState.ts` with `DeadlineRules` interface
- Added `calculateTaxDeadline(year, month, rules)`
- Added `calculateVATDeadline(year, month, cadence)`
- No longer hardcoded

---

### ❌ **Issue 4: Posting Grain Ambiguity**

**Problem:**
UI might imply per-service precision when posting is still per-invoice.

**Current State:**
- Phase 1: Invoice-level category (MVP)
- Future: Item-level categories

**Fix Required:**
```typescript
// PHASE 1 (Current):
// - One ryczalt account per invoice
// - UI should NOT show per-item breakdown
// - One register line per invoice

// PHASE 2 (Future):
// - Multiple categories per invoice (mixed)
// - UI shows per-item categorization
// - Multiple register lines per invoice (split by category)
// - OR: Mark invoice as "mixed" and require full item categorization
```

**Implementation:**
- Document clearly in UI: "Konto ryczałtowe dla całej faktury"
- When item-level comes: Add "Kategorie pozycji" section
- Validation: Mixed invoices must be fully categorized before closing

---

## Architectural Corrections

### 1. Separate Period View from Period Closure

**Data Model:**
```sql
-- Period can be in one of these states:
-- 'open' → actively posting invoices
-- 'closed' → finalized, but can reopen
-- 'locked' → permanently closed, cannot reopen

-- When viewing closed period:
SELECT * FROM accounting_events 
WHERE event_type = 'PERIOD_CLOSED' 
  AND period_year = ? AND period_month = ?
ORDER BY created_at DESC LIMIT 1;

-- Use totals_snapshot, NOT live invoice calculation
```

**UI Pattern:**
```tsx
// Period Control Bar = VIEWING tool (filter)
// Period Closure Modal = LOCKING tool (finalize)

// These are separate actions:
<PeriodControlBar 
  onPeriodChange={setSelectedPeriod}  // Viewing
/>

<Button onClick={openClosureModal}>   // Closing
  Zamknij okres
</Button>
```

---

### 2. Dual Status Everywhere

**Invoice Header:**
```tsx
<div className="invoice-header">
  <h1>Faktura {number}</h1>
  <InvoiceStatusBadges 
    paymentStatus={invoice.payment_status}
    accountingStatus={invoice.accounting_status}
    paymentDate={invoice.payment_date}
    postedDate={invoice.posted_at}
  />
</div>
```

**Invoice List:**
```tsx
<tr>
  <td>{invoice.number}</td>
  <td>{invoice.customer}</td>
  <td>{invoice.amount}</td>
  <td>
    <InvoiceStatusBadges 
      paymentStatus={invoice.payment_status}
      accountingStatus={invoice.accounting_status}
      compact
    />
  </td>
</tr>
```

**Invoice Card:**
```tsx
<Card>
  <CardHeader>
    <div className="flex justify-between">
      <span>{invoice.number}</span>
      <InvoiceStatusInline 
        paymentStatus={invoice.payment_status}
        accountingStatus={invoice.accounting_status}
      />
    </div>
  </CardHeader>
</Card>
```

---

### 3. Regime-Aware Deadline System

**Business Profile Configuration:**
```typescript
interface BusinessProfile {
  id: string;
  tax_regime: 'ryczalt' | 'skala' | 'liniowy';
  vat_cadence: 'monthly' | 'quarterly' | 'none';
  settlement_cadence: 'monthly' | 'quarterly' | 'annual';
}
```

**Period State Calculation:**
```typescript
const deadlineRules: DeadlineRules = {
  taxRegime: profile.tax_regime,
  vatCadence: profile.vat_cadence,
  settlementCadence: profile.settlement_cadence,
};

const taxDeadline = calculateTaxDeadline(year, month, deadlineRules);
const vatDeadline = calculateVATDeadline(year, month, deadlineRules.vatCadence);
```

**UI Display:**
```tsx
<div className="deadlines">
  <div>Termin podatku: {format(taxDeadline, 'dd MMM yyyy')}</div>
  {vatDeadline && (
    <div>Termin VAT: {format(vatDeadline, 'dd MMM yyyy')}</div>
  )}
</div>
```

---

## UI/UX Corrections

### 1. Ewidencja Layout Redesign

**Current (Wrong):**
```
Numbers → Categories → Invoice rows
```

**Correct:**
```
1. Period Header + Status + Deadline
2. Action Banner (what needs attention)
3. Unaccounted Queue
   - Paid but unposted
   - Missing category
   - Posting errors
4. Posted Register (grouped by ryczałt category)
5. Optional: Analytics cards
```

**Implementation:**
```tsx
<div className="ewidencja">
  <PeriodControlBar />
  <PeriodActionBanner />
  <UnaccountedQueuePanel />
  <PostedRegisterByCategory />
  <AnalyticsCards />
</div>
```

---

### 2. "Filtruj" → "Okres" + "Filtry"

**Current:**
Generic "Filtruj" button (confusing)

**Correct:**
```tsx
// Primary control (always visible):
<PeriodControlBar />  // "Okres" is the main control

// Secondary filters (drawer):
<Button onClick={openFiltersDrawer}>
  Filtry
</Button>

<FiltersDrawer>
  <ScopeSelector />      // Posted vs unposted vs all
  <AccountSelector />    // Ryczałt accounts
  <DocumentTypeSelector /> // Income, correction, note
  <StatusSelector />     // Needs action, late, closed
</FiltersDrawer>
```

---

### 3. "Ten miesiąc" → Smart Jump

**Current:**
Jumps to current month (might not be most urgent)

**Correct:**
```tsx
<div className="quick-actions">
  <Button onClick={jumpToCurrentPeriod}>
    Ten miesiąc
  </Button>
  <Button onClick={jumpToMostUrgent} variant="destructive">
    Najpilniejsze
  </Button>
</div>

// Logic:
function jumpToMostUrgent() {
  const periods = getAllPeriods();
  const urgent = periods.find(p => p.status === 'late') 
    || periods.find(p => p.status === 'due')
    || periods.find(p => p.status === 'open');
  
  navigateToPeriod(urgent);
}
```

---

### 4. Quarter/Year Support

**Don't:**
Make month rail also handle quarters (mess)

**Do:**
```tsx
<div className="period-view-toggle">
  <ToggleGroup>
    <ToggleGroupItem value="month">Miesiąc</ToggleGroupItem>
    <ToggleGroupItem value="quarter">Kwartał</ToggleGroupItem>
    <ToggleGroupItem value="year">Rok</ToggleGroupItem>
  </ToggleGroup>
</div>

// Rules:
// - If quarterly PIT: default = Quarter
// - Inside Quarter: show months, but closure at quarter-level
// - Locking at same granularity you report/settle
```

---

## Implementation Sprint Plan

### Sprint 1: Fix Fundamentals (This Week)

**Day 1-2: Data Layer**
- [x] Create `periodDataSource.ts` with immutable snapshot logic
- [x] Update `periodState.ts` with regime-aware deadlines
- [x] Create `InvoiceStatusBadges.tsx` component
- [ ] Update database queries to use snapshots for closed periods
- [ ] Add `payment_status` column to invoices table

**Day 3-4: UI Components**
- [x] Create `UnaccountedQueuePanel.tsx`
- [ ] Update `PeriodControlBar` to use regime-aware deadlines
- [ ] Add "Najpilniejsze" button
- [ ] Implement dual status display everywhere

**Day 5: Integration**
- [ ] Update `RyczaltAccounts.tsx` to use new data source
- [ ] Propagate Period Control Bar to all accounting screens
- [ ] Test closed period immutability
- [ ] Verify dual status display

---

### Sprint 2: Period Closure (Next Week)

**Day 1-2: Closure Workflow**
- [x] Create `PeriodClosureModal.tsx` (already done)
- [ ] Add validation (no unposted invoices)
- [ ] Implement closure event creation
- [ ] Test lock/unlock logic

**Day 3-4: Audit Trail**
- [ ] Create "Historia zdarzeń okresu" panel
- [ ] Display all period events
- [ ] Show who/when for each action
- [ ] Add event filtering

**Day 5: Testing**
- [ ] Test full closure workflow
- [ ] Verify immutability after closure
- [ ] Test reopen (only if not locked)
- [ ] User acceptance testing

---

### Sprint 3: Unaccounted Control Center (Week 3)

**Day 1-2: Data Queries**
- [ ] Query paid but unposted invoices
- [ ] Query missing category assignments
- [ ] Query posting errors
- [ ] Implement efficient filtering

**Day 3-4: UI Implementation**
- [ ] Complete `UnaccountedQueuePanel` with real data
- [ ] Add "Fix" CTAs for each issue type
- [ ] Integrate with assignment modal
- [ ] Add batch operations

**Day 5: Polish**
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error handling
- [ ] User testing

---

### Sprint 4: Item-Level Categories (Future)

**Only when ready to split posting:**
- [ ] Add per-item category in invoice form
- [ ] UI for mixed invoice categorization
- [ ] Split posting into multiple register lines
- [ ] Validation: mixed invoices fully categorized
- [ ] Update totals calculation

---

## Non-Negotiable Rules

### 1. Closed Period Immutability
```typescript
// ALWAYS enforce:
if (period.status === 'closed' || period.is_locked) {
  // Read from snapshot, NOT from invoices
  data = getFromSnapshot(period);
}
```

### 2. Dual Status Display
```typescript
// ALWAYS show both:
<InvoiceStatusBadges 
  paymentStatus={...}      // Payment state
  accountingStatus={...}   // Accounting state
/>
```

### 3. Regime-Aware Deadlines
```typescript
// NEVER hardcode:
const deadline = new Date(year, month, 20); // ❌ WRONG

// ALWAYS use rules:
const deadline = calculateTaxDeadline(year, month, rules); // ✅ CORRECT
```

### 4. Period Closure Validation
```typescript
// CANNOT close if:
// - Any invoice unposted
// - Period is future
// - Missing category assignments

// MUST create:
// - PERIOD_CLOSED event
// - totals_snapshot
// - closed_at, closed_by
```

---

## Testing Checklist

### Closed Period Immutability
- [ ] Close a period
- [ ] Edit an invoice in that period
- [ ] Verify totals DON'T change (read from snapshot)
- [ ] Verify invoice list shows register lines, not invoices

### Dual Status Display
- [ ] Create paid but unposted invoice
- [ ] Verify both badges show
- [ ] Verify payment badge = "Opłacona"
- [ ] Verify accounting badge = "Niezaksięgowana"

### Regime-Aware Deadlines
- [ ] Test ryczałt monthly (20th next month)
- [ ] Test ryczałt quarterly (20th after quarter)
- [ ] Test VAT monthly (25th next month)
- [ ] Test VAT quarterly (25th after quarter)

### Period Closure
- [ ] Try to close with unposted invoices (should fail)
- [ ] Close successfully
- [ ] Verify event created
- [ ] Verify snapshot saved
- [ ] Try to reopen (should work if not locked)
- [ ] Lock period
- [ ] Try to reopen (should fail)

---

## Success Criteria

### Data Integrity
✅ Closed periods read from snapshots, not invoices  
✅ Totals never drift after closure  
✅ Full audit trail of all actions  
✅ Immutability enforced at database level

### User Experience
✅ Clear distinction between paid and accounted  
✅ No confusion about invoice status  
✅ Deadlines match actual tax obligations  
✅ "Najpilniejsze" jumps to most urgent period

### Compliance
✅ Matches Polish tax law  
✅ Proper period closure workflow  
✅ Immutable evidence for audits  
✅ Regime-specific deadline calculations

---

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Status:** Active - Implementation in Progress  
**Next Review:** After Sprint 1 completion
