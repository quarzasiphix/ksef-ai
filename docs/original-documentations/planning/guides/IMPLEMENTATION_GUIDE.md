# ERP Integration Implementation Guide

## What Has Been Completed

### ✅ Backend Infrastructure (Supabase)

**Database Migrations Applied**:
1. `create_erp_connections` - ERP connection management tables
2. `add_invoice_agreement_workflow` - Invoice agreement status tracking

**Edge Functions Deployed**:
1. `erp-webhook` - Receives status updates from ERP systems
   - URL: `https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/erp-webhook`
   - No JWT required (uses signature verification)
   
2. `erp-push-invoice` - Pushes agreed invoices to ERP
   - URL: `https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/erp-push-invoice`
   - Requires JWT authentication

### ✅ Frontend Components

**Created**:
- `src/types/erp.ts` - TypeScript types for ERP integrations
- `src/pages/settings/ERPIntegrations.tsx` - Settings UI for ERP connections
- `src/integrations/supabase/repositories/erpRepository.ts` - Database operations
- `src/App.tsx` - Route added for `/settings/erp`
- `src/pages/settings/SettingsMenu.tsx` - ERP Integrations card already present

### ✅ Documentation

- `docs/ERP_INTEGRATION_ARCHITECTURE.md` - Technical architecture overview
- `docs/ACCOUNTANT_COMPANY_COLLABORATION.md` - Complete workflow documentation

---

## What Needs to Be Done Next

### 1. Frontend UI Enhancements

#### A. Agreement Status Badges Component
**File**: `src/components/invoices/AgreementStatusBadge.tsx`

```typescript
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, MessageSquare, AlertCircle, XCircle } from "lucide-react";

export type AgreementStatus = 
  | 'draft' 
  | 'sent' 
  | 'received' 
  | 'under_discussion' 
  | 'correction_needed' 
  | 'approved' 
  | 'ready_for_ksef' 
  | 'rejected' 
  | 'cancelled';

interface Props {
  status: AgreementStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function AgreementStatusBadge({ status, size = 'md' }: Props) {
  // Implementation with icons and colors for each status
}
```

**Purpose**: Show invoice agreement status throughout the app

---

#### B. Agreement Timeline Component
**File**: `src/components/invoices/AgreementTimeline.tsx`

```typescript
interface TimelineEvent {
  status: AgreementStatus;
  timestamp: string;
  user_name: string;
  comment?: string;
}

interface Props {
  invoiceId: string;
}

export function AgreementTimeline({ invoiceId }: Props) {
  // Fetch from invoice_agreement_history table
  // Display vertical timeline with status changes
}
```

**Purpose**: Show full audit trail of invoice agreement process

---

#### C. ERP Sync Status Indicator
**File**: `src/components/invoices/ERPSyncStatus.tsx`

```typescript
interface Props {
  erpSyncStatus: 'pending' | 'synced' | 'failed' | null;
  erpSyncedAt?: string;
  connectionId?: string;
}

export function ERPSyncStatus({ erpSyncStatus, erpSyncedAt, connectionId }: Props) {
  // Show sync status with icon
  // Link to ERP sync logs if available
}
```

**Purpose**: Display ERP synchronization status on invoices

---

### 2. Invoice Detail Page Updates

**File**: `src/pages/invoices/InvoiceDetail.tsx`

**Add**:
1. Agreement status badge at top
2. Agreement timeline in sidebar or tab
3. ERP sync status indicator
4. "Send for Agreement" button (if draft)
5. "Approve Invoice" button (if received)
6. "Push to ERP" button (if ready_for_ksef and manual push)

---

### 3. Received Invoice Detail Updates

**File**: `src/pages/inbox/ReceivedInvoiceDetail.tsx`

**Add**:
1. Agreement action buttons:
   - "Approve" - Changes status to `approved`
   - "Request Correction" - Changes to `correction_needed`
   - "Reject" - Changes to `rejected`
   - "Start Discussion" - Opens discussion thread
2. Agreement timeline
3. Current status badge

---

### 4. Dashboard Updates

**File**: `src/pages/Dashboard.tsx`

**Add New Widgets**:
1. "Pending Agreements" - Invoices awaiting approval
2. "Ready for KSeF" - Invoices approved, ready to sync
3. "ERP Sync Status" - Recent sync operations

---

### 5. Repository Functions to Add

**File**: `src/integrations/supabase/repositories/invoiceRepository.ts`

```typescript
// Update invoice agreement status
export async function updateInvoiceAgreementStatus(
  invoiceId: string,
  newStatus: AgreementStatus,
  userId: string,
  action: string,
  comment?: string
): Promise<void> {
  await supabase.rpc('update_invoice_agreement_status', {
    p_invoice_id: invoiceId,
    p_new_status: newStatus,
    p_user_id: userId,
    p_action: action,
    p_comment: comment
  });
}

// Get agreement history
export async function getInvoiceAgreementHistory(
  invoiceId: string
): Promise<AgreementHistoryEntry[]> {
  const { data, error } = await supabase
    .from('invoice_agreement_history')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// Get invoices pending agreement
export async function getInvoicesPendingAgreement(
  businessProfileId: string
): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices_pending_agreement')
    .select('*')
    .eq('business_profile_id', businessProfileId);
  
  if (error) throw error;
  return data || [];
}

// Get invoices ready for KSeF
export async function getInvoicesReadyForKSeF(
  businessProfileId: string
): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices_ready_for_ksef')
    .select('*')
    .eq('business_profile_id', businessProfileId);
  
  if (error) throw error;
  return data || [];
}
```

---

### 6. ERP Push Integration

**File**: `src/integrations/supabase/repositories/erpRepository.ts`

**Add**:
```typescript
export async function manualPushInvoiceToERP(
  invoiceId: string,
  connectionId?: string
): Promise<void> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/erp-push-invoice`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice_id: invoiceId,
        connection_id: connectionId
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to push invoice to ERP');
  }
  
  return await response.json();
}
```

---

### 7. Types to Add

**File**: `src/types/index.ts`

```typescript
export type AgreementStatus = 
  | 'draft'
  | 'sent'
  | 'received'
  | 'under_discussion'
  | 'correction_needed'
  | 'approved'
  | 'ready_for_ksef'
  | 'rejected'
  | 'cancelled';

export interface AgreementHistoryEntry {
  id: string;
  invoice_id: string;
  user_id: string;
  previous_status: AgreementStatus | null;
  new_status: AgreementStatus;
  action: string;
  comment: string | null;
  created_at: string;
}

// Extend Invoice interface
export interface Invoice {
  // ... existing fields
  agreement_status: AgreementStatus;
  agreement_sent_at?: string;
  agreement_received_at?: string;
  agreement_approved_at?: string;
  agreement_rejected_at?: string;
  agreement_rejection_reason?: string;
  ready_for_ksef_at?: string;
  ksef_submitted_at?: string;
  erp_synced_at?: string;
  erp_sync_status?: 'pending' | 'synced' | 'failed';
}
```

---

### 8. ERP Provider-Specific Implementations

Each ERP provider needs specific API integration code in the Edge Functions.

**Priority Order**:
1. **Comarch** - Most popular in Poland
2. **enova365** - Second most popular
3. **Symfonia** - Third
4. **InsERT** - Fourth
5. **Odoo** - Open source, lower priority

**Implementation Steps per Provider**:
1. Get API documentation from provider
2. Create test account/sandbox
3. Implement authentication (API key, OAuth2, etc.)
4. Implement invoice push format transformation
5. Implement webhook signature verification
6. Test end-to-end flow
7. Document setup process for users

---

### 9. Testing Checklist

#### Unit Tests
- [ ] ERP repository functions
- [ ] Agreement status transitions
- [ ] Invoice validation before push

#### Integration Tests
- [ ] Create invoice → Send → Approve → Push to ERP
- [ ] ERP webhook receives status update
- [ ] Agreement timeline displays correctly
- [ ] ERP sync logs are created

#### E2E Tests
- [ ] Full workflow: Company creates invoice
- [ ] Recipient receives and approves
- [ ] Invoice syncs to ERP
- [ ] Status syncs back from ERP

---

### 10. Deployment Steps

1. **Database**:
   - ✅ Migrations already applied to production

2. **Edge Functions**:
   - ✅ Already deployed to production
   - Test webhook endpoint with curl
   - Test push endpoint with Postman

3. **Frontend**:
   - Build and deploy Next.js app
   - Verify ERP settings page loads
   - Test connection creation flow

4. **Documentation**:
   - Create user-facing setup guides
   - Create video tutorials
   - Update help center

---

## Quick Start for Developers

### 1. Test ERP Webhook Locally

```bash
# Start Supabase locally
supabase start

# Deploy function locally
supabase functions serve erp-webhook

# Test with curl
curl -X POST http://localhost:54321/functions/v1/erp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "comarch",
    "event_type": "invoice.booked",
    "entity_id": "ERP-12345",
    "ksiegai_invoice_id": "your-uuid-here",
    "timestamp": "2025-12-22T15:00:00Z",
    "data": {
      "status": "booked",
      "accounting_entry_id": "ACC-789"
    }
  }'
```

### 2. Test ERP Push Locally

```bash
# Get auth token from Supabase
# Then test push
curl -X POST http://localhost:54321/functions/v1/erp-push-invoice \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "your-invoice-uuid"
  }'
```

### 3. Add Agreement Status to Existing Invoice

```sql
-- Update existing invoice to test agreement workflow
UPDATE invoices 
SET agreement_status = 'draft'
WHERE id = 'your-invoice-id';

-- Simulate sending
SELECT update_invoice_agreement_status(
  'your-invoice-id'::uuid,
  'sent'::invoice_agreement_status,
  'your-user-id'::uuid,
  'sent',
  'Sent for approval'
);
```

---

## Priority Implementation Order

### Week 1: Core Agreement Workflow
1. Add agreement status badges
2. Add agreement action buttons to ReceivedInvoiceDetail
3. Wire up status update functions
4. Test invoice approval flow

### Week 2: ERP Integration UI
1. Complete ERP connection creation flow
2. Add ERP sync status indicators
3. Add manual push button
4. Test connection and push

### Week 3: Timeline and History
1. Build agreement timeline component
2. Add to invoice detail pages
3. Test audit trail display

### Week 4: Dashboard and Polish
1. Add pending agreements widget
2. Add ready for KSeF widget
3. Polish UI/UX
4. Write user documentation

---

## Support and Resources

### Internal Documentation
- Architecture: `docs/ERP_INTEGRATION_ARCHITECTURE.md`
- Workflow: `docs/ACCOUNTANT_COMPANY_COLLABORATION.md`
- This guide: `docs/IMPLEMENTATION_GUIDE.md`

### External Resources
- Comarch API: https://www.comarch.pl/erp/api-documentation
- enova365 API: https://www.enova.pl/api
- Symfonia API: https://www.symfonia.pl/integracje
- InsERT API: https://www.insert.com.pl/api
- Odoo API: https://www.odoo.com/documentation/api

### Supabase Resources
- Edge Functions: https://supabase.com/docs/guides/functions
- Database Functions: https://supabase.com/docs/guides/database/functions
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security

---

## Troubleshooting Common Issues

### Issue: Edge Function not receiving webhooks
**Solution**: Check firewall rules, verify webhook URL in ERP settings

### Issue: Invoice not syncing to ERP
**Solution**: Check `erp_sync_logs` table for error messages, verify connection status

### Issue: Agreement status not updating
**Solution**: Check RLS policies, verify user has permission to update invoice

### Issue: ERP credentials not working
**Solution**: Verify API key is correct, check if API endpoint is reachable

---

## Next Steps After Implementation

1. **Marketing**: Update landing page to highlight ERP integrations
2. **Sales**: Create case studies showing accountant-company collaboration
3. **Support**: Train support team on ERP integration troubleshooting
4. **Product**: Gather feedback from beta users, iterate on UX
5. **Partnerships**: Reach out to ERP providers for official partnerships

---

## Success Metrics

Track these KPIs to measure success:

- **Adoption**: % of users who connect ERP
- **Usage**: Number of invoices pushed to ERP per month
- **Satisfaction**: NPS score from accountants using the integration
- **Efficiency**: Time saved vs. manual entry (survey)
- **Errors**: ERP sync failure rate (target: <5%)

---

**Last Updated**: 2025-12-22  
**Status**: Backend complete, frontend in progress  
**Next Milestone**: Agreement workflow UI (Week 1)
