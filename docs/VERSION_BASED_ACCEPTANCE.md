# Version-Based Acceptance System

## Core Principle

**"Acceptance is a signature over a specific version; any accounting-impacting change creates a new version and automatically invalidates acceptance, requiring re-review (or correction if already posted)."**

## The Problem

Without version-based acceptance, "approval" becomes meaningless:
- Accountant accepts invoice for 1000 PLN
- User changes it to 5000 PLN
- System still shows "accepted"
- Audit trail is broken

## The Solution

Acceptance is tied to a **specific version**, not the document "in general":
- Accountant acceptance always references `object_version_id` (e.g., `invoice_version_id`)
- When a new version is created, previous acceptance remains true only for the old version
- Acceptance is not "Invoice accepted" — it's "**Invoice v7 accepted**"

## Review Status Model

### Chain Review Fields

```typescript
review_status: 'draft' | 'pending_review' | 'accepted' | 'rejected' | 'superseded'
reviewed_version_id: UUID  // The specific version that was accepted
reviewed_at: TIMESTAMPTZ
reviewed_by: UUID
review_comment: TEXT
```

### Status Transitions

```
draft → pending_review → accepted
                      ↘ rejected

accepted → superseded (when document changes after acceptance)
```

## Change Severity Classification

Not all changes should invalidate acceptance. We classify changes by their accounting impact:

### Accounting-Impacting Fields (Requires Re-Accept)

Changes to these fields **invalidate acceptance**:
- Amounts: `total_net_value`, `total_vat_value`, `total_gross_value`
- Currency: `currency`, `exchange_rate`
- Identity: `customer_id`
- Dates: `issue_date`, `sell_date`, `due_date`
- Tax: `vat`, `vat_exemption_reason`
- Items: `items` (line items)
- Accounts: `bank_account_id`, `cash_account_id`
- Payment: `payment_method`

### Non-Accounting Fields (No Re-Accept)

Changes to these fields **do NOT invalidate acceptance**:
- Notes: `comments`, `notes`
- Tags: `project_id`, `decision_id`
- Metadata: internal labels, UI preferences

### Change Severity Levels

```typescript
'none'           // No changes
'non_accounting' // Changes that don't affect accounting
'accounting'     // Changes that affect accounting (invalidates acceptance)
```

## Business Rules (MVP Policy)

### Option B: Soft Change with Mandatory Re-Accept

**Chosen for MVP** - startup-friendly, easier early on:

1. **Allow edits if not posted**
   - User can edit accepted invoices
   - Acceptance is automatically invalidated for accounting-impacting changes
   - Chain status becomes `superseded`

2. **Accountant must accept again**
   - System shows "Changes detected after acceptance"
   - Accountant sees diff summary
   - Must explicitly accept the new version

3. **Posted invoices require correction**
   - If invoice is posted to ledger, edits are blocked
   - User must create correction document (faktura korygująca)
   - Or use reversal + reissue workflow

### Future: Option A (Hard Lock)

For "Advanced / Accountant mode":
- Once accepted, editing is completely blocked
- User must create correction document or reversal
- Mirrors real accounting practice
- Better for compliance-heavy environments

## Workflows

### 1. Initial Acceptance

```typescript
// User submits for review
await submitForReview({
  chain_id: chainId,
  version_id: currentVersionId,
});
// Chain: review_status = 'pending_review'

// Accountant accepts
await acceptChain({
  chain_id: chainId,
  version_id: currentVersionId,
  comment: 'Amounts verified, customer correct',
});
// Chain: review_status = 'accepted', reviewed_version_id = v7
```

### 2. Edit After Acceptance (Not Posted)

```typescript
// User edits invoice (changes amount)
// System automatically:
// 1. Creates new version (v8)
// 2. Calculates change_severity = 'accounting'
// 3. Invalidates acceptance: review_status = 'superseded'
// 4. Adds required_action: 'requires_re_acceptance'

// UI shows:
Status: Accepted (v7)
New changes: Draft changes (v8) – not accepted
⚠️ Changes detected after acceptance

// User submits for re-review
await submitForReview({
  chain_id: chainId,
  version_id: newVersionId, // v8
});

// Accountant sees:
Invoice F/004 (changed after acceptance)
Diff: Amount changed from 1000 to 1200 PLN

// Accountant accepts v8
await acceptChain({
  chain_id: chainId,
  version_id: newVersionId,
  comment: 'New amount verified',
});
```

### 3. Edit After Posting (Blocked)

```typescript
// User tries to edit posted invoice
const canEdit = await canEditInvoice(invoiceId);
// Returns: {
//   can_edit: false,
//   reason: 'Invoice is posted to ledger. Use correction workflow.',
//   requires_correction: true
// }

// UI shows:
❌ Cannot edit: Invoice is posted to ledger
→ Create correction document instead
```

### 4. Non-Accounting Change (No Re-Accept)

```typescript
// User edits only comments field
// System automatically:
// 1. Creates new version (v9)
// 2. Calculates change_severity = 'non_accounting'
// 3. Keeps acceptance: review_status = 'accepted'
// 4. No re-review required

// Acceptance remains valid for v7
```

## UI Implementation

### Invoice Drawer - Accepted State

```
┌─────────────────────────────────────────┐
│ Status: ✓ Accepted (v7)                 │
│ Reviewed by: Jan Kowalski               │
│ Reviewed at: 2026-01-05 14:30           │
│ Comment: "Amounts verified"             │
└─────────────────────────────────────────┘
```

### Invoice Drawer - Superseded State

```
┌─────────────────────────────────────────┐
│ Status: ⚠️ Accepted (v7) - Changes Made │
│                                         │
│ Previous acceptance: v7                 │
│ Current version: v8 (draft)             │
│                                         │
│ Changes after acceptance:               │
│ • Amount: 1000 → 1200 PLN              │
│ • Customer: Changed                     │
│                                         │
│ Actions:                                │
│ [Submit for Re-Acceptance]              │
│ [Revert to Accepted Version]           │
└─────────────────────────────────────────┘
```

### Accountant Queue

```
┌─────────────────────────────────────────┐
│ Pending Review (3)                      │
├─────────────────────────────────────────┤
│ F/004 - Changed after acceptance        │
│ Amount: 1000 → 1200 PLN                │
│ Customer: ABC Sp. z o.o.                │
│ [View Diff] [Accept v8] [Reject]        │
├─────────────────────────────────────────┤
│ F/005 - New invoice                     │
│ Amount: 500 PLN                         │
│ [Accept v1] [Reject]                    │
└─────────────────────────────────────────┘
```

### Timeline View

```
Timeline for Invoice F/004

v1 • Created invoice (1000 PLN)
   └─ 2026-01-05 10:00

v2 • Edited: Changed customer
   └─ 2026-01-05 10:15

v3 • Submitted for review
   └─ 2026-01-05 11:00

   ✓ Accepted by Jan Kowalski
   └─ 2026-01-05 14:30
   "Amounts verified, customer correct"

v4 • Edited: Amount changed to 1200 PLN
   └─ 2026-01-05 15:00
   ⚠️ Acceptance invalidated

v5 • Submitted for re-review
   └─ 2026-01-05 15:30

   ⏳ Pending review...
```

## Database Schema

### chains table (updated)

```sql
review_status TEXT DEFAULT 'draft'
  CHECK (review_status IN ('draft', 'pending_review', 'accepted', 'rejected', 'superseded'))

reviewed_version_id UUID  -- References invoice_versions.id
reviewed_at TIMESTAMPTZ
reviewed_by UUID REFERENCES auth.users(id)
review_comment TEXT
```

### invoice_versions table (updated)

```sql
change_severity TEXT DEFAULT 'accounting'
  CHECK (change_severity IN ('none', 'non_accounting', 'accounting'))

accounting_impact_fields TEXT[]  -- Fields that changed and impact accounting
non_accounting_fields TEXT[]     -- Fields that changed but don't impact accounting
```

### field_classifications table (new)

```sql
object_type TEXT        -- 'invoice', 'cash_entry', etc.
field_name TEXT         -- 'total_gross_value', 'comments', etc.
classification TEXT     -- 'accounting' | 'non_accounting'
description TEXT
```

## API Reference

### Accept Chain

```typescript
acceptChain({
  chain_id: string,
  version_id: string,  // Specific version being accepted
  comment?: string,
})
```

### Reject Chain

```typescript
rejectChain({
  chain_id: string,
  version_id: string,
  comment: string,  // Required
})
```

### Submit for Review

```typescript
submitForReview({
  chain_id: string,
  version_id: string,
})
```

### Check Edit Permission

```typescript
canEditInvoice(invoiceId: string): Promise<{
  can_edit: boolean,
  reason: string,
  requires_correction?: boolean,
  will_invalidate_acceptance?: boolean,
}>
```

### Get Chains Requiring Review

```typescript
getChainsRequiringReview(businessProfileId: string): Promise<ChainWithReview[]>
```

### Get Version Diff

```typescript
getVersionDiff(versionId1: string, versionId2: string): Promise<{
  version1: VersionWithSeverity,
  version2: VersionWithSeverity,
  changes: Array<{
    field: string,
    old_value: any,
    new_value: any,
    is_accounting_impact: boolean,
  }>,
}>
```

### Revert to Accepted Version

```typescript
revertToAcceptedVersion(chainId: string): Promise<string>
```

## Automatic Behavior

### On Version Creation

When `create_invoice_version` is called:

1. **Calculate change severity**
   - Compare `changed_fields` against `field_classifications`
   - Determine if changes are accounting-impacting

2. **If accounting-impacting AND chain is accepted**
   - Set `review_status = 'superseded'`
   - Add `required_actions: ['requires_re_acceptance']`
   - Keep original `reviewed_version_id` (for history)

3. **If posted**
   - Set `review_status = 'superseded'`
   - Add `blockers: ['posted_invoice_edited']`
   - Add `required_actions: ['requires_correction']`

### On Acceptance

When `accept_chain` is called:

1. **Check if posted**
   - If posted, reject with error
   - Must use correction workflow

2. **Update chain**
   - Set `review_status = 'accepted'`
   - Set `reviewed_version_id = p_version_id`
   - Set `reviewed_at = NOW()`
   - Set `reviewed_by = auth.uid()`
   - Remove `requires_re_acceptance` from `required_actions`

## Benefits

✅ **Audit Trail** - Clear record of what was accepted and when  
✅ **Accountability** - Accountant signature tied to specific version  
✅ **Compliance** - Posted invoices protected from silent edits  
✅ **Flexibility** - Non-accounting changes don't require re-review  
✅ **Transparency** - Users see exactly what changed after acceptance  
✅ **Workflow Clarity** - Clear states and required actions  

## Migration

Existing chains will be set to `review_status = 'draft'` by default. No data loss occurs.

## Summary

The version-based acceptance system ensures that approval has real meaning by:

1. Tying acceptance to specific versions
2. Automatically invalidating acceptance for accounting-impacting changes
3. Requiring explicit re-review after changes
4. Protecting posted invoices from edits
5. Allowing non-accounting changes without re-review

**The one-sentence rule:** Acceptance is a signature over a specific version; any accounting-impacting change creates a new version and automatically invalidates acceptance, requiring re-review (or correction if already posted).
