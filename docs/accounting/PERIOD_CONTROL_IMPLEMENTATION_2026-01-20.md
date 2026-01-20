# Period Control System Implementation
**Date:** January 20, 2026  
**Status:** Complete - Ready for Testing  
**Priority:** HIGH - Core UX Improvement

---

## Executive Summary

Implemented a complete redesign of the accounting period navigation system, replacing the horizontal month scroller with a **state-based Period Control Bar**. This fundamental shift changes the mental model from "date selection" to "obligation state management" - matching how accountants and business owners actually think about their work.

**Key Achievement:** Transformed accounting periods from passive time selectors into active state machines with clear obligations, deadlines, and actions.

---

## Problem Statement

### What Was Wrong

**1. Timeline Scroller Was Anti-User**
- Horizontal scroll = cognitive + motor tax
- Bad on trackpads, mobile, and for older users
- Hid structure (years, quarters, deadlines)
- No concept of "today" or "what's next"

**2. Wrong Mental Model**
- Showed time, not obligation state
- Answered "Which month?" instead of "What needs attention?"
- No visibility into period status (open/due/late/closed)

**3. Missing Critical Features**
- No period closure workflow
- No immutable audit trail
- No locking mechanism
- No clear action guidance

---

## Solution Implemented

### A. Period Control Bar (3 Layers)

#### **Layer 1: "Where Am I?" - Primary Control**
```
┌────────────────────────────────────────────────────────┐
│  ◀  Wrzesień 2025  ▶                                   │
│  Status: ⛔ Po terminie                                 │
│  Termin rozliczenia: 20 października 2025              │
│  Podatek do zapłaty: 114,00 PLN                        │
└────────────────────────────────────────────────────────┘
```

**Features:**
- Centered, prominent, non-scrollable
- Big text, always visible
- Arrow navigation (keyboard-friendly)
- Shows current status and deadline
- Tax amount display

#### **Layer 2: Period Status Rail - Visual State Overview**
```
2025
■ Sty  ✓  (closed)
■ Lut  ✓  (closed)
■ Mar  ✓  (closed)
■ Kwi  ✓  (closed)
■ Maj  ✓  (closed)
■ Cze  ✓  (closed)
■ Lip  ✓  (closed)
■ Sie  ✓  (closed)
■ Wrz  ⛔  (late) ← current
■ Paź  ⏳  (due)
■ Lis  ○  (future)
■ Gru  ○  (future)
```

**Legend:**
- ✓ Closed (green)
- ⏳ Due (amber)
- ⛔ Late (red)
- ○ Future (gray)
- ● Open (blue)

**Features:**
- No scrolling - all 12 months visible
- Click to navigate
- Visual status at a glance
- Warning indicators for late periods

#### **Layer 3: Action Banner - "What Needs Attention"**

**Late Period:**
```
┌────────────────────────────────────────────────────────┐
│ ⚠️ Wrzesień 2025 nie został rozliczony                │
│ Podatek do zapłaty: 114,00 zł                          │
│ Termin minął: 20 października 2025                     │
│ 3 faktury wymagają zaksięgowania                       │
│                                                         │
│ [Przypisz konta]  [Przejdź do dokumentów]             │
└────────────────────────────────────────────────────────┘
```

**Due Period:**
```
┌────────────────────────────────────────────────────────┐
│ ⏰ Wrzesień 2025 wymaga rozliczenia                    │
│ Podatek do zapłaty: 114,00 zł                          │
│ Termin płatności: 20 października 2025                 │
│                                                         │
│ [Przypisz konta]  [Oznacz jako zapłacone]             │
└────────────────────────────────────────────────────────┘
```

**Open Period:**
```
┌────────────────────────────────────────────────────────┐
│ 🟢 Trwa bieżący okres: styczeń 2026                    │
│ 2 faktury zaksięgowane                                 │
│ Termin rozliczenia: 20 lutego 2026                     │
│                                                         │
│ [Przypisz konta]                                       │
└────────────────────────────────────────────────────────┘
```

**Closed Period:**
```
┌────────────────────────────────────────────────────────┐
│ ✓ Styczeń 2026 - okres zamknięty                      │
│ 5 faktur zaksięgowanych                                │
│ Podatek rozliczony: 250,00 PLN                         │
│ Okres zablokowany - dokumenty są niezmienne            │
│                                                         │
│ [Zobacz dokumenty]                                     │
└────────────────────────────────────────────────────────┘
```

---

## B. Period State System

### Period States

```typescript
type PeriodStatus = 'open' | 'due' | 'late' | 'closed' | 'future';
```

**State Transitions:**
```
future → open → due → late
           ↓
        closed (locked)
```

**State Logic:**
- **Future**: Period start date is in the future
- **Open**: Current month (period is ongoing)
- **Due**: Period ended, deadline approaching (< 20th of next month)
- **Late**: Deadline passed (> 20th of next month)
- **Closed**: Period manually closed and locked

### Tax Deadline Calculation

For ryczalt: **20th of the following month**

```typescript
function calculateTaxDeadline(year: number, month: number): Date {
  const nextMonth = addMonths(new Date(year, month - 1, 1), 1);
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);
}
```

---

## C. Period Closure Workflow

### Closure Modal

```
┌──────────────────────────────────────────────────────────┐
│ 🔒 Zamknięcie okresu księgowego                         │
│ Zamykasz okres: Wrzesień 2025                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Podsumowanie okresu:                                     │
│ Przychody: 16,000.00 PLN                                 │
│ Podatek: 830.00 PLN                                      │
│ Faktury: 5                                               │
│                                                           │
│ Co się stanie po zamknięciu okresu?                      │
│ ✓ Zostanie utworzone niezmienne zdarzenie księgowe      │
│ ✓ Stan ewidencji zostanie zapisany jako migawka         │
│ ✓ Okres zostanie oznaczony jako "zamknięty"             │
│                                                           │
│ ☐ Zablokuj okres (nieodwracalne)                        │
│   Zablokowany okres nie może być ponownie otwarty       │
│                                                           │
│ Notatka (opcjonalnie):                                   │
│ [_____________________________________________]           │
│                                                           │
│ ☑ Potwierdzam, że wszystkie dokumenty zostały           │
│   zaksięgowane i rozumiem konsekwencje                  │
│                                                           │
│ [Anuluj]  [Zamknij okres]                               │
└──────────────────────────────────────────────────────────┘
```

### Closure Validation

**Cannot close period if:**
- Period is in the future
- There are unposted invoices
- User hasn't confirmed understanding

**Closure creates:**
- Immutable accounting event
- Period totals snapshot
- Audit trail entry
- Optional lock (prevents reopening)

---

## D. Accounting Events Table

### Immutable Audit Trail

```sql
CREATE TABLE accounting_events (
  id UUID PRIMARY KEY,
  business_profile_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  description TEXT,
  totals_snapshot JSONB,
  related_invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL,
  created_by UUID
);
```

**Event Types:**
- `PERIOD_CLOSED` - Period closure
- `PERIOD_REOPENED` - Period reopened (only if not locked)
- `PERIOD_LOCKED` - Period locked
- `INVOICE_POSTED` - Invoice posted
- `INVOICE_CORRECTED` - Invoice corrected
- `INVOICE_UNPOSTED` - Invoice unposted
- `TAX_PAYMENT_RECORDED` - Tax payment recorded
- `MANUAL_ADJUSTMENT` - Manual adjustment

**Immutability:**
- No updates allowed
- No deletes allowed
- Insert only through functions
- Full audit trail

---

## E. Database Functions

### close_accounting_period

```sql
CREATE FUNCTION close_accounting_period(
  p_business_profile_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_lock_period BOOLEAN DEFAULT FALSE,
  p_closure_note TEXT DEFAULT NULL
) RETURNS JSONB
```

**Validation:**
- Checks for unposted invoices
- Calculates period totals
- Creates totals snapshot
- Records closure event
- Updates period status
- Optionally locks period

**Returns:**
```json
{
  "success": true,
  "period_id": "uuid",
  "event_id": "uuid",
  "totals": {
    "total_revenue": 16000.00,
    "total_tax": 830.00,
    "invoice_count": 5
  },
  "is_locked": false
}
```

### reopen_accounting_period

```sql
CREATE FUNCTION reopen_accounting_period(
  p_business_profile_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_reason TEXT
) RETURNS JSONB
```

**Validation:**
- Cannot reopen locked periods
- Requires reason for audit trail
- Records reopening event

---

## F. Components Created

### 1. PeriodControlBar.tsx
**Purpose:** Main period navigation component  
**Features:**
- 3-layer design (control, rail, status)
- Arrow navigation
- Visual state indicators
- Click to navigate
- Keyboard accessible

### 2. PeriodActionBanner.tsx
**Purpose:** Context-aware action guidance  
**Features:**
- Different banners per state
- Clear action buttons
- Deadline visibility
- Tax amount display
- Unposted invoice count

### 3. PeriodClosureModal.tsx
**Purpose:** Period closure workflow  
**Features:**
- Period summary display
- Lock option
- Optional note
- Confirmation checkbox
- Validation

### 4. periodState.ts (Utils)
**Purpose:** Period state calculation logic  
**Functions:**
- `calculateTaxDeadline()`
- `calculatePeriodStatus()`
- `generateYearPeriodStates()`
- `getCurrentPeriod()`
- `canClosePeriod()`
- `formatPeriodName()`

### 5. periodRepository.ts (Data Layer)
**Purpose:** Period management API  
**Functions:**
- `closeAccountingPeriod()`
- `reopenAccountingPeriod()`
- `getAccountingEvents()`
- `getClosedPeriods()`
- `getPeriodStatistics()`

---

## G. Updated Screens

### RyczaltAccounts.tsx

**Changes:**
- Replaced timeline scroller with Period Control Bar
- Added Period Action Banner
- Added Period Closure Modal
- Added period state management
- Integrated with accounting events

**New Features:**
- Period navigation by state
- Visual status overview
- Action-driven workflow
- Period closure capability
- Immutable audit trail

---

## H. KPIR Hidden for Ryczalt

**Implementation:**
- KPIR (Księga Przychodów i Rozchodów) is only for skala/liniowy tax regimes
- Ryczalt entities use JDG Revenue Register instead
- Navigation and UI automatically hide KPIR for ryczalt profiles

**Logic:**
```typescript
if (businessProfile.tax_type === 'ryczalt') {
  // Show: Ewidencja przychodów (Revenue Register)
  // Hide: KPIR
} else {
  // Show: KPIR
  // Hide: Ewidencja przychodów
}
```

---

## I. Benefits

### For Grandma (Non-Technical Users)
✅ **Clear guidance:** "This month" / "Deadline" / "Pay this"  
✅ **No scrolling:** All months visible  
✅ **Visual status:** Green = good, Red = urgent  
✅ **Action buttons:** One click to fix issues  
✅ **No confusion:** System tells you what to do

### For Accountants
✅ **State visibility:** Closed vs open periods at a glance  
✅ **Immutable history:** Full audit trail  
✅ **Predictable workflows:** Clear closure process  
✅ **Compliance:** Matches Polish tax reality  
✅ **Professional:** Proper accounting controls

### For Developers
✅ **Safer accounting:** Immutable events prevent data loss  
✅ **Better UX:** State-driven instead of date-driven  
✅ **Fewer support questions:** Self-explanatory interface  
✅ **Audit trail:** Full history of all changes  
✅ **Scalable:** Easy to add new states/events

---

## J. Technical Implementation

### Files Created
```
src/modules/accounting/
├── components/
│   ├── PeriodControlBar.tsx (new)
│   ├── PeriodActionBanner.tsx (new)
│   └── PeriodClosureModal.tsx (new)
├── utils/
│   └── periodState.ts (new)
└── data/
    └── periodRepository.ts (new)

supabase/migrations/
└── 20260120_add_accounting_events_table.sql (new)
```

### Files Modified
```
src/modules/accounting/screens/
└── RyczaltAccounts.tsx (major update)
```

### Database Changes
```sql
-- New table
accounting_events (immutable audit trail)

-- New columns
accounting_periods.is_locked
accounting_periods.closed_at
accounting_periods.closed_by

-- New functions
close_accounting_period()
reopen_accounting_period()
record_period_closure_event()
record_invoice_posted_event()
```

---

## K. Testing Checklist

### Period Navigation
- [ ] Arrow buttons navigate months correctly
- [ ] Click on month rail navigates correctly
- [ ] Current period is highlighted
- [ ] Keyboard navigation works (arrow keys)

### Period States
- [ ] Future periods show gray circle
- [ ] Open period shows blue circle
- [ ] Due period shows amber clock
- [ ] Late period shows red warning
- [ ] Closed period shows green checkmark

### Action Banners
- [ ] Late banner shows for overdue periods
- [ ] Due banner shows for approaching deadline
- [ ] Open banner shows for current month
- [ ] Closed banner shows for locked periods
- [ ] Action buttons work correctly

### Period Closure
- [ ] Cannot close period with unposted invoices
- [ ] Cannot close future periods
- [ ] Closure modal shows correct totals
- [ ] Lock option works
- [ ] Confirmation required
- [ ] Event created in database
- [ ] Period status updated

### Audit Trail
- [ ] Closure events recorded
- [ ] Events are immutable
- [ ] Event history visible
- [ ] User attribution correct

### KPIR Visibility
- [ ] KPIR hidden for ryczalt profiles
- [ ] Revenue register shown for ryczalt
- [ ] KPIR shown for skala/liniowy
- [ ] Navigation updated correctly

---

## L. User Guide

### How to Navigate Periods

**Method 1: Arrow Buttons**
1. Click ◀ to go to previous month
2. Click ▶ to go to next month

**Method 2: Month Rail**
1. Look at the 12-month overview
2. Click on any month to jump to it
3. Status icons show period state

### How to Close a Period

**Prerequisites:**
- All invoices must be posted
- Period must be past (not future)

**Steps:**
1. Navigate to the period you want to close
2. Check the action banner for unposted invoices
3. If any, click "Przypisz konta" to assign accounts
4. Once all posted, click "Zamknij okres" button
5. Review period summary in modal
6. Optionally check "Zablokuj okres" for permanent lock
7. Add optional note
8. Check confirmation checkbox
9. Click "Zamknij okres"

**Result:**
- Period status changes to "closed"
- Immutable event created
- Period totals saved
- If locked, cannot be reopened

### Understanding Period States

**🟢 Open (Bieżący):**
- Current month
- Invoices can be posted
- Period is active

**⏰ Due (Do rozliczenia):**
- Month ended
- Deadline approaching
- Action required

**⛔ Late (Po terminie):**
- Deadline passed
- Urgent action needed
- Possible penalties

**✓ Closed (Zamknięty):**
- Period finalized
- Documents immutable
- Safe and reported

**○ Future (Przyszły):**
- Not yet started
- No action needed

---

## M. Next Steps

### Immediate (This Week)
1. **User testing** - Test with real accountants
2. **Mobile testing** - Verify responsive design
3. **Performance** - Test with many periods
4. **Documentation** - Update user guides

### Short-term (Next 2 Weeks)
1. **Quarter view** - Add quarterly period view
2. **Year view** - Add annual summary
3. **Bulk operations** - Close multiple periods
4. **Export** - Export period summaries

### Medium-term (Next Month)
1. **Tax payment tracking** - Record payments
2. **Deadline reminders** - Email notifications
3. **Period templates** - Recurring entries
4. **Advanced permissions** - Role-based closure

---

## N. Success Metrics

### Current Achievement
✅ **State-based navigation** - Implemented  
✅ **Visual status overview** - Implemented  
✅ **Action guidance** - Implemented  
✅ **Period closure** - Implemented  
✅ **Immutable audit trail** - Implemented  
✅ **KPIR hidden for ryczalt** - Implemented

### Target Metrics
🎯 **User satisfaction** - > 4.5/5  
🎯 **Time to close period** - < 2 minutes  
🎯 **Support tickets** - 50% reduction  
🎯 **Error rate** - < 1%  
🎯 **Adoption rate** - > 90%

---

## O. Conclusion

This implementation represents a fundamental shift in how the accounting system handles periods. By moving from a passive date selector to an active state machine, we've created a system that:

1. **Matches mental models** - How accountants actually think
2. **Guides users** - Clear actions at every step
3. **Ensures compliance** - Proper closure and locking
4. **Provides safety** - Immutable audit trail
5. **Improves UX** - No scrolling, clear status

The system is now ready for testing and will provide a significantly better experience for both technical and non-technical users.

---

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Status:** Implementation Complete  
**Next Review:** After user testing
