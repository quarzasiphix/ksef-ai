# Invoice Provenance & Audit Chain System

## Overview

The Invoice Provenance system provides a **tamper-evident audit trail** for all invoice state changes. It ensures compliance by making invoice modifications traceable, verifiable, and immutable once an invoice is issued or paid.

## Key Features

- ✅ **Immutable Version History** - Every invoice state change creates an append-only snapshot
- ✅ **Tamper-Evident Chain** - Cryptographic hash chaining detects any data tampering
- ✅ **Strict Enforcement** - Database-level locks prevent silent edits on issued/paid invoices
- ✅ **Audit Trail** - Complete history of who changed what, when, and why
- ✅ **Verification** - Server-side chain verification with exportable proof
- ✅ **Backward Compatible** - Works with existing invoice and event models

## Architecture

### Database Schema

#### invoice_versions Table
Stores immutable snapshots of invoice state at each change:

```sql
CREATE TABLE invoice_versions (
    id UUID PRIMARY KEY,
    invoice_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,        -- Canonical invoice snapshot
    snapshot_hash TEXT NOT NULL,         -- SHA-256 of snapshot_data
    change_type TEXT NOT NULL,           -- created, issued, paid, etc.
    change_reason TEXT,                  -- Optional reason for change
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    business_profile_id UUID NOT NULL,
    prev_version_id UUID,                -- Link to previous version
    chain_hash TEXT,                     -- SHA-256(prev_chain_hash || snapshot_hash)
    UNIQUE(invoice_id, version_number)
);
```

#### Extended invoices Table
Added fields for version tracking and locking:

```sql
ALTER TABLE invoices ADD COLUMN
    current_version_number INTEGER DEFAULT 0,
    current_version_id UUID,
    is_locked BOOLEAN DEFAULT FALSE,     -- TRUE when issued/paid
    locked_at TIMESTAMPTZ,
    locked_by UUID;
```

#### Extended events Table
Added fields for version and chain references:

```sql
ALTER TABLE events ADD COLUMN
    entity_version_id UUID,              -- Links to invoice_versions
    prev_event_id UUID,                  -- Previous event in chain
    chain_hash TEXT,                     -- Event chain hash
    payload_hash TEXT;                   -- SHA-256 of event payload
```

### Change Types

| Change Type | Description | Locks Invoice |
|------------|-------------|---------------|
| `created` | Initial invoice creation | No |
| `draft_saved` | Draft modifications | No |
| `issued` | Invoice issued to customer | **Yes** |
| `paid` | Invoice marked as paid | **Yes** (already locked) |
| `unpaid` | Payment status reverted | No (remains locked) |
| `corrected` | Correction applied to locked invoice | No (remains locked) |
| `modified` | Modification applied to locked invoice | No (remains locked) |
| `cancelled` | Invoice cancelled | No (remains locked) |

## Hash Chain Algorithm

### Canonical Snapshot Creation

Each version creates a **canonical JSON snapshot** with deterministic field ordering:

```json
{
  "invoice_id": "uuid",
  "invoice_number": "FV/2026/001",
  "issue_date": "2026-01-30",
  "sale_date": "2026-01-30",
  "due_date": "2026-02-13",
  "status": "issued",
  "payment_status": "unpaid",
  "business_profile_id": "uuid",
  "customer_id": "uuid",
  "total_amount": 1230.00,
  "total_net": 1000.00,
  "total_vat": 230.00,
  "currency": "PLN",
  "payment_method": "transfer",
  "notes": "...",
  "items": [
    {
      "name": "Service A",
      "quantity": 1,
      "unit_price": 1000.00,
      "vat_rate": 23,
      "net_amount": 1000.00,
      "vat_amount": 230.00,
      "gross_amount": 1230.00,
      "unit": "szt"
    }
  ]
}
```

### Hash Computation

1. **Snapshot Hash**: `SHA-256(canonical_snapshot_json)`
2. **Chain Hash**: 
   - First version: `chain_hash = snapshot_hash`
   - Subsequent versions: `chain_hash = SHA-256(prev_chain_hash || snapshot_hash)`

### Tamper Detection

Any modification to:
- Snapshot data
- Version order
- Chain linkage

Will cause hash verification to fail, proving tampering occurred.

## RPC Functions

### Invoice State Management

#### rpc_invoice_save_draft
Save draft invoice changes (before issuing):

```typescript
const result = await supabase.rpc('rpc_invoice_save_draft', {
  p_invoice_id: 'uuid',
  p_change_reason: 'Updated line items'
});
```

**Returns**: `{ success, invoice_id, version_id, event_id }`

#### rpc_invoice_issue
Issue invoice and lock it:

```typescript
const result = await supabase.rpc('rpc_invoice_issue', {
  p_invoice_id: 'uuid',
  p_invoice_number: 'FV/2026/001',
  p_issue_date: '2026-01-30',
  p_change_reason: 'Invoice issued to customer'
});
```

**Returns**: `{ success, invoice_id, version_id, event_id, invoice_number }`

**Effects**:
- Sets `status = 'issued'`
- Sets `is_locked = TRUE`
- Creates immutable version snapshot
- Blocks direct updates

#### rpc_invoice_mark_paid
Mark invoice as paid:

```typescript
const result = await supabase.rpc('rpc_invoice_mark_paid', {
  p_invoice_id: 'uuid',
  p_payment_date: '2026-02-01',
  p_payment_method: 'transfer',
  p_change_reason: 'Payment received'
});
```

**Returns**: `{ success, invoice_id, version_id, event_id, payment_date }`

#### rpc_invoice_unmark_paid
Revert payment status (requires reason):

```typescript
const result = await supabase.rpc('rpc_invoice_unmark_paid', {
  p_invoice_id: 'uuid',
  p_change_reason: 'Payment was reversed by bank'
});
```

**Returns**: `{ success, invoice_id, version_id, event_id }`

#### rpc_invoice_apply_change
Apply controlled changes to locked invoices:

```typescript
const result = await supabase.rpc('rpc_invoice_apply_change', {
  p_invoice_id: 'uuid',
  p_change_type: 'corrected',  // or 'modified', 'cancelled'
  p_change_reason: 'Corrected due date per customer request',
  p_changes: {
    due_date: '2026-02-20',
    notes: 'Due date extended'
  }
});
```

**Returns**: `{ success, invoice_id, version_id, event_id, change_type }`

### Chain Verification

#### rpc_verify_invoice_chain
Verify integrity of invoice version chain:

```typescript
const verification = await supabase.rpc('rpc_verify_invoice_chain', {
  p_invoice_id: 'uuid'
});
```

**Returns**:
```json
{
  "valid": true,
  "invoice_id": "uuid",
  "version_count": 5,
  "errors": [],
  "verified_at": "2026-01-30T14:30:00Z",
  "verified_by": "user_uuid"
}
```

**Verification Checks**:
- ✅ Snapshot hash matches recomputed hash
- ✅ Chain hash matches recomputed chain
- ✅ Version linkage is intact
- ✅ No missing versions

#### rpc_get_invoice_audit_trail
Get complete audit trail with verification:

```typescript
const auditTrail = await supabase.rpc('rpc_get_invoice_audit_trail', {
  p_invoice_id: 'uuid'
});
```

**Returns**:
```json
{
  "invoice_id": "uuid",
  "invoice_number": "FV/2026/001",
  "current_status": "issued",
  "is_locked": true,
  "current_version_number": 3,
  "versions": [
    {
      "version_id": "uuid",
      "version_number": 1,
      "change_type": "created",
      "change_reason": null,
      "changed_by": "user_uuid",
      "changed_at": "2026-01-30T10:00:00Z",
      "snapshot_hash": "abc123...",
      "chain_hash": "abc123...",
      "snapshot_data": { ... }
    },
    ...
  ],
  "events": [ ... ],
  "verification": { ... },
  "retrieved_at": "2026-01-30T14:30:00Z"
}
```

#### rpc_export_invoice_audit_proof
Export complete audit proof for external verification:

```typescript
const proof = await supabase.rpc('rpc_export_invoice_audit_proof', {
  p_invoice_id: 'uuid'
});
```

**Returns**: Complete proof package with instructions for independent verification.

## Security & RLS

### invoice_versions Policies

```sql
-- Users can view versions for their business profiles
CREATE POLICY "Users can view invoice versions for their business profiles"
    ON invoice_versions FOR SELECT
    USING (business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
    ));

-- Append-only: versions can only be inserted
CREATE POLICY "Invoice versions are append-only"
    ON invoice_versions FOR INSERT
    WITH CHECK (
        business_profile_id IN (
            SELECT id FROM business_profiles WHERE user_id = auth.uid()
        )
        AND changed_by = auth.uid()
    );

-- Block all updates and deletes
CREATE POLICY "Invoice versions cannot be updated"
    ON invoice_versions FOR UPDATE USING (false);

CREATE POLICY "Invoice versions cannot be deleted"
    ON invoice_versions FOR DELETE USING (false);
```

### Invoice Lock Enforcement

Database trigger prevents direct updates on locked invoices:

```sql
CREATE TRIGGER trigger_prevent_locked_invoice_updates
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_invoice_updates();
```

**Bypass mechanism**: RPCs set `app.bypass_invoice_lock = 'true'` to allow controlled updates.

## Usage Patterns

### Creating and Issuing Invoice

```typescript
// 1. Create draft invoice (normal flow)
const invoice = await invoiceRepository.saveInvoice({
  // ... invoice data
});

// 2. Save draft changes (optional, creates version)
await supabase.rpc('rpc_invoice_save_draft', {
  p_invoice_id: invoice.id,
  p_change_reason: 'Added additional line items'
});

// 3. Issue invoice (locks it)
await supabase.rpc('rpc_invoice_issue', {
  p_invoice_id: invoice.id,
  p_invoice_number: 'FV/2026/001',
  p_issue_date: new Date().toISOString().split('T')[0],
  p_change_reason: 'Invoice issued to customer'
});

// 4. Mark as paid when payment received
await supabase.rpc('rpc_invoice_mark_paid', {
  p_invoice_id: invoice.id,
  p_payment_date: new Date().toISOString().split('T')[0],
  p_payment_method: 'transfer',
  p_change_reason: 'Payment received via bank transfer'
});
```

### Correcting Locked Invoice

```typescript
// Apply correction to issued invoice
await supabase.rpc('rpc_invoice_apply_change', {
  p_invoice_id: invoice.id,
  p_change_type: 'corrected',
  p_change_reason: 'Customer requested due date extension',
  p_changes: {
    due_date: '2026-02-28',
    notes: 'Due date extended per customer request'
  }
});
```

### Viewing Audit Trail

```typescript
// Get complete audit trail
const auditTrail = await supabase.rpc('rpc_get_invoice_audit_trail', {
  p_invoice_id: invoice.id
});

console.log('Version count:', auditTrail.version_count);
console.log('Chain valid:', auditTrail.verification.valid);
console.log('Versions:', auditTrail.versions);
```

### Exporting Proof

```typescript
// Export audit proof for accountant/auditor
const proof = await supabase.rpc('rpc_export_invoice_audit_proof', {
  p_invoice_id: invoice.id
});

// Download as JSON file
const blob = new Blob([JSON.stringify(proof, null, 2)], {
  type: 'application/json'
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `invoice-${invoice.invoice_number}-audit-proof.json`;
a.click();
```

## Migration & Backfill

### Migration Order

Run migrations in this order:

1. `20260130_create_invoice_versions.sql` - Create invoice_versions table
2. `20260130_extend_invoices_version_tracking.sql` - Extend invoices table
3. `20260130_extend_events_chain_support.sql` - Extend events table
4. `20260130_rpc_invoice_provenance_helpers.sql` - Helper functions
5. `20260130_rpc_invoice_state_management.sql` - State management RPCs
6. `20260130_rpc_invoice_chain_verification.sql` - Verification RPCs
7. `20260130_backfill_invoice_versions.sql` - Backfill existing invoices

### Backfill Process

After running all migrations:

```sql
-- Run backfill function
SELECT * FROM backfill_invoice_versions();

-- Verify all invoices have versions
SELECT COUNT(*) FROM invoices WHERE current_version_id IS NULL;
-- Should return 0

-- Check for backfill errors
SELECT * FROM backfill_invoice_versions() WHERE success = FALSE;
```

## UI Integration

### Audit/History Tab

Add to invoice detail screen:

```typescript
// InvoiceAuditTab.tsx
const InvoiceAuditTab = ({ invoiceId }: { invoiceId: string }) => {
  const [auditTrail, setAuditTrail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditTrail();
  }, [invoiceId]);

  const loadAuditTrail = async () => {
    const { data } = await supabase.rpc('rpc_get_invoice_audit_trail', {
      p_invoice_id: invoiceId
    });
    setAuditTrail(data);
    setLoading(false);
  };

  const exportProof = async () => {
    const { data } = await supabase.rpc('rpc_export_invoice_audit_proof', {
      p_invoice_id: invoiceId
    });
    // Download logic here
  };

  if (loading) return <div>Loading audit trail...</div>;

  return (
    <div>
      <h2>Invoice Audit Trail</h2>
      
      {/* Verification Status */}
      <div className={auditTrail.verification.valid ? 'success' : 'error'}>
        Chain Integrity: {auditTrail.verification.valid ? '✓ Valid' : '✗ Invalid'}
      </div>

      {/* Version Timeline */}
      <div>
        <h3>Version History ({auditTrail.version_count} versions)</h3>
        {auditTrail.versions.map(version => (
          <div key={version.version_id}>
            <strong>v{version.version_number}</strong> - {version.change_type}
            <br />
            {version.changed_at} by {version.changed_by}
            <br />
            {version.change_reason && <em>{version.change_reason}</em>}
            <br />
            Hash: <code>{version.snapshot_hash.substring(0, 16)}...</code>
          </div>
        ))}
      </div>

      {/* Export Button */}
      <button onClick={exportProof}>
        Export Audit Proof
      </button>
    </div>
  );
};
```

## Limitations & Considerations

### Current Limitations

1. **Snapshot Scope**: Only captures invoice header and items, not related entities (customer, business profile)
2. **Item Changes**: Locked invoices cannot have items added/removed (by design)
3. **Correction Scope**: `rpc_invoice_apply_change` currently only supports limited field updates
4. **Performance**: Large version histories may impact query performance
5. **Storage**: Each version stores complete snapshot (not delta)

### Future Enhancements

1. **Delta Snapshots**: Store only changed fields for space efficiency
2. **Related Entity Snapshots**: Include customer/business profile data in snapshot
3. **Correction Invoice**: Support formal correction invoices (korekta)
4. **Bulk Operations**: Batch version creation for multiple invoices
5. **Event Chain Hashing**: Extend chain hashing to events table
6. **External Timestamping**: Add blockchain/trusted timestamp anchoring
7. **Automated Verification**: Scheduled chain verification jobs

### Performance Considerations

- **Indexes**: All critical paths are indexed (invoice_id, business_profile_id, version_number)
- **RLS**: Policies use indexed columns for efficient filtering
- **Snapshot Size**: Average snapshot ~5-10KB, manageable for typical invoice volumes
- **Chain Verification**: O(n) where n = version count, fast for typical chains (<100 versions)

## Compliance & Audit

### What This System Provides

✅ **Tamper Evidence**: Any modification to historical data is detectable  
✅ **Complete Audit Trail**: Who, what, when, why for every change  
✅ **Immutability**: Versions cannot be updated or deleted  
✅ **Verification**: Independent verification of chain integrity  
✅ **Export**: Audit proof can be exported for external review  

### What This System Does NOT Provide

❌ **Legal Non-Repudiation**: No digital signatures or trusted timestamps  
❌ **Blockchain Anchoring**: Hashes are not anchored to external blockchain  
❌ **Regulatory Compliance**: Does not guarantee compliance with specific regulations (e.g., KSeF, VAT)  
❌ **Backup Protection**: Does not protect against database loss (use regular backups)  

### Recommended Practices

1. **Regular Verification**: Run `rpc_verify_invoice_chain` periodically
2. **Export Proofs**: Export audit proofs for critical invoices
3. **Backup Strategy**: Ensure invoice_versions table is included in backups
4. **Access Control**: Restrict RPC function access via RLS and API policies
5. **Monitoring**: Monitor for failed version creation or verification errors

## Troubleshooting

### Invoice Won't Update

**Error**: "Cannot directly update locked invoice"

**Solution**: Use appropriate RPC function:
- For corrections: `rpc_invoice_apply_change`
- For payment status: `rpc_invoice_mark_paid` / `rpc_invoice_unmark_paid`

### Chain Verification Failed

**Error**: `verification.valid = false`

**Diagnosis**: Check `verification.errors` array for specific issues

**Common Causes**:
- Manual database updates bypassing RPCs
- Data corruption
- Migration issues

**Resolution**: Contact system administrator, may require data recovery

### Missing Versions

**Error**: Invoice has no versions

**Solution**: Run backfill migration:
```sql
SELECT * FROM backfill_invoice_versions() WHERE invoice_id = 'uuid';
```

## Support & Maintenance

### Monitoring Queries

```sql
-- Invoices without versions
SELECT COUNT(*) FROM invoices WHERE current_version_id IS NULL;

-- Recent version creation
SELECT COUNT(*) FROM invoice_versions WHERE created_at > NOW() - INTERVAL '24 hours';

-- Failed verifications (requires logging)
SELECT * FROM invoice_chain_verification_log WHERE valid = FALSE;

-- Version count distribution
SELECT 
  version_count,
  COUNT(*) as invoice_count
FROM (
  SELECT invoice_id, COUNT(*) as version_count
  FROM invoice_versions
  GROUP BY invoice_id
) t
GROUP BY version_count
ORDER BY version_count;
```

### Maintenance Tasks

- **Weekly**: Verify chain integrity for critical invoices
- **Monthly**: Review version count distribution, optimize if needed
- **Quarterly**: Export audit proofs for accounting period
- **Annually**: Archive old versions if storage becomes concern

---

**Version**: 1.0  
**Last Updated**: 2026-01-30  
**Author**: Invoice Provenance System  
**Status**: Production Ready
