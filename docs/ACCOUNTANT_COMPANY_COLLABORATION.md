# Accountant-Company Collaboration Workflow

## Executive Summary

KsięgaI enables **accountants and companies to collaborate on invoices before they enter the accounting system**. This pre-KSeF agreement layer ensures that:

- Companies create and send invoices through KsięgaI
- Recipients review, discuss, and approve invoices
- Agreed invoices automatically sync to the accountant's ERP
- Accountants book invoices in their preferred system (Comarch, enova365, Symfonia, InsERT)
- Status updates sync back to KsięgaI for full visibility

**Result**: No more email ping-pong, no more "I didn't receive that invoice", full audit trail, and accountants work in their existing tools.

---

## The Problem This Solves

### Traditional Flow (Broken)
```
Company → Email PDF → Recipient → Forward to Accountant → Manual Entry → KSeF
```

**Issues**:
- Email gets lost or buried
- No proof of receipt or agreement
- Manual data entry errors
- No discussion trail
- Accountant sees final document only, not the negotiation

### KsięgaI Flow (Fixed)
```
Company → KsięgaI → Native Delivery → Discussion → Agreement → Auto-Push to ERP → KSeF
```

**Benefits**:
- Native delivery (no email)
- Verified receipt
- Built-in discussion thread
- Full audit trail
- Accountant sees context and history
- Automatic ERP sync

---

## Workflow Stages

### Stage 1: Invoice Creation (Company)

**Actor**: Company user  
**Location**: KsięgaI web app  
**Status**: `draft`

1. Company creates invoice in KsięgaI
2. Adds line items, amounts, VAT rates
3. Links to contract (optional but recommended for audit)
4. Adds internal decision/approval if required

**Key Point**: Invoice stays in `draft` until company is ready to send.

---

### Stage 2: Send to Recipient (Company)

**Actor**: Company user  
**Location**: KsięgaI web app  
**Status**: `draft` → `sent`

1. Company clicks "Send to Recipient"
2. If recipient is in KsięgaI network:
   - Invoice delivered **natively** to their inbox
   - Email notification sent (not the document itself)
3. If recipient not in KsięgaI:
   - Invitation sent to join network
   - PDF sent via email as fallback

**Key Point**: Email is notification only. Document lives in system.

---

### Stage 3: Receipt and Review (Recipient)

**Actor**: Recipient company  
**Location**: KsięgaI inbox  
**Status**: `sent` → `received`

1. Recipient sees invoice in inbox
2. Reviews amounts, line items, VAT
3. Can:
   - **Approve immediately** if correct
   - **Start discussion** if questions
   - **Request correction** if errors
   - **Reject** if invalid

**Key Point**: Recipient has full control before agreement.

---

### Stage 4: Discussion and Negotiation (Both Parties)

**Actor**: Company + Recipient  
**Location**: Discussion thread in KsięgaI  
**Status**: `under_discussion`

1. Either party can start discussion
2. Messages are threaded and timestamped
3. Can attach files, reference line items
4. All discussion is **immutable audit trail**
5. Status can change to `correction_needed`

**Example Discussion**:
```
Recipient: "Line item 3 should be 1000 PLN, not 1200 PLN"
Company: "You're right, correcting now"
[Company edits invoice]
Company: "Corrected. Please review again"
Recipient: "Looks good now, approving"
```

**Key Point**: Every word is logged. Accountant can see full context later.

---

### Stage 5: Approval (Recipient)

**Actor**: Recipient  
**Location**: KsięgaI invoice detail  
**Status**: `under_discussion` → `approved` → `ready_for_ksef`

1. Recipient clicks "Approve Invoice"
2. Status changes to `approved`
3. System checks if both parties agreed
4. If yes, status becomes `ready_for_ksef`
5. Invoice is now **locked** (immutable)

**Key Point**: Both parties must agree before ERP sync.

---

### Stage 6: Automatic ERP Sync (System)

**Actor**: KsięgaI Edge Function  
**Location**: Supabase Edge Function `erp-push-invoice`  
**Status**: `ready_for_ksef` → ERP sync

1. System detects invoice is `ready_for_ksef`
2. Checks for active ERP connection with `auto_push_after_agreement = true`
3. Transforms invoice to ERP-specific format
4. Calls ERP API (Comarch, enova365, Symfonia, InsERT)
5. Logs sync to `erp_sync_logs` table
6. Updates invoice `erp_sync_status` to `synced`

**Payload Sent to ERP**:
```json
{
  "ksiegai_invoice_id": "uuid",
  "invoice_number": "FV/2025/001",
  "seller": { "name": "...", "tax_id": "...", "address": "..." },
  "buyer": { "name": "...", "tax_id": "...", "address": "..." },
  "items": [...],
  "total_net": 1000.00,
  "total_vat": 230.00,
  "total_gross": 1230.00,
  "agreed_at": "2025-12-22T14:30:00Z",
  "agreement_status": "ready_for_ksef",
  "ksiegai_url": "https://ksiegai.pl/invoices/uuid"
}
```

**Key Point**: Accountant's ERP now has the invoice with full context link.

---

### Stage 7: Accounting (Accountant)

**Actor**: Accountant  
**Location**: ERP system (Comarch, enova365, etc.)  
**Status**: ERP booking

1. Accountant sees new invoice in ERP
2. Reviews invoice details
3. Can click `ksiegai_url` to see full discussion history
4. Books invoice in ERP
5. ERP sends webhook to KsięgaI: `invoice.booked`

**Key Point**: Accountant works in familiar ERP, but has access to full context.

---

### Stage 8: Status Sync Back (ERP → KsięgaI)

**Actor**: ERP system  
**Location**: Webhook to `erp-webhook` Edge Function  
**Status**: ERP status → KsięgaI

**Webhook Events**:
- `invoice.booked` - Invoice entered in accounting
- `payment.received` - Payment received from customer
- `invoice.cancelled` - Invoice cancelled

**Example Webhook**:
```json
{
  "provider": "comarch",
  "event_type": "invoice.booked",
  "entity_id": "ERP-12345",
  "ksiegai_invoice_id": "uuid",
  "timestamp": "2025-12-22T15:00:00Z",
  "data": {
    "status": "booked",
    "accounting_entry_id": "ACC-789"
  }
}
```

**Key Point**: Company sees accounting status in KsięgaI without logging into ERP.

---

## Configuration: How to Set Up

### For Companies

1. **Connect ERP** (Settings → ERP Integrations)
   - Choose provider (Comarch, enova365, Symfonia, InsERT)
   - Enter API credentials
   - Enable "Auto-push after agreement"
   - Test connection

2. **Invite Accountant**
   - Add accountant as team member
   - Grant "Accountant" role
   - Accountant can see all invoices and discussions

3. **Create Invoice**
   - Fill in details
   - Send to recipient
   - Wait for agreement
   - Invoice auto-syncs to ERP

### For Accountants

1. **Configure ERP Webhooks**
   - In ERP admin panel, add webhook URL:
     ```
     https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/erp-webhook
     ```
   - Configure events: `invoice.booked`, `payment.received`
   - Add webhook signature key

2. **Work in ERP as Normal**
   - New invoices appear automatically
   - Click KsięgaI link to see discussion
   - Book invoice
   - Status syncs back

---

## Technical Implementation

### Database Tables

**erp_connections**
- Stores API credentials (encrypted)
- Configuration: auto_push, sync_direction
- Status tracking: connected, error, syncing

**erp_sync_logs**
- Audit trail of all sync operations
- Request/response payloads
- Error messages

**invoice_agreement_history**
- Immutable log of status changes
- Who approved, when, why
- Comments and discussion references

### Edge Functions

**erp-push-invoice**
- Triggered when invoice reaches `ready_for_ksef`
- Transforms to ERP format
- Calls ERP API
- Logs result

**erp-webhook**
- Receives ERP status updates
- Verifies signature
- Updates invoice status
- Logs webhook

### Frontend Components

**ERPIntegrations.tsx**
- Settings page for ERP connections
- Test connection button
- Sync logs viewer

**ReceivedInvoiceDetail.tsx**
- Invoice detail with discussion
- Approve/reject buttons
- Status timeline

---

## Security and Compliance

### Data Protection
- API credentials encrypted at rest
- TLS for all API calls
- Webhook signature verification

### Audit Trail
- Every action logged with timestamp and user
- Immutable discussion history
- Full sync logs with payloads

### Access Control
- RLS policies on all tables
- Users see only their invoices
- Accountants see client invoices only

---

## Troubleshooting

### Invoice Not Syncing to ERP

**Check**:
1. ERP connection status is `connected`
2. Invoice status is `ready_for_ksef`
3. `auto_push_after_agreement` is enabled
4. Check `erp_sync_logs` for errors

**Common Issues**:
- Invalid API credentials
- ERP endpoint unreachable
- Invoice data validation failed

### Webhook Not Received

**Check**:
1. Webhook URL configured in ERP
2. ERP can reach Supabase (not blocked by firewall)
3. Webhook signature is correct
4. Check Edge Function logs

---

## Future Enhancements

### Planned Features
- [ ] Bulk invoice sync
- [ ] Custom field mapping per ERP
- [ ] Scheduled sync (not just real-time)
- [ ] Multi-currency support
- [ ] Odoo integration (currently in development)
- [ ] SAP integration
- [ ] Microsoft Dynamics integration

### API Extensions
- [ ] REST API for custom integrations
- [ ] GraphQL API for complex queries
- [ ] Zapier integration
- [ ] Make.com integration

---

## Support and Documentation

### For Developers
- API Documentation: `/docs/API.md`
- ERP Provider SDKs: `/src/integrations/erp/`
- Edge Function Source: `/supabase/functions/`

### For Users
- Video Tutorial: [Coming Soon]
- Setup Guide: Settings → ERP Integrations → Help
- Support: support@ksiegai.pl

---

## Conclusion

The ERP integration layer makes KsięgaI a **collaboration platform** rather than just another accounting tool. Companies and accountants work together in their preferred environments, with full visibility and audit trails.

**Key Takeaway**: Invoices are agreed in KsięgaI, booked in ERP, and status syncs back. Everyone sees what they need, when they need it.
