# ERP Integration Architecture

## Overview

KsięgaI acts as a **pre-KSeF agreement and responsibility layer** that sits between companies and their ERP/accounting systems. This architecture enables seamless collaboration between companies and accountants while maintaining full audit trails and control.

## Core Concept

```
Company → KsięgaI (Agreement Layer) → ERP/Accountant → KSeF
   ↓           ↓                          ↓            ↓
Create    Discuss/Approve              Book         Submit
```

### Why This Layer Exists

1. **Agreement Before Submission**: Invoices are negotiated and approved by both parties before entering accounting
2. **Verified Business Network**: Documents are delivered natively within the system, not via email
3. **Audit Trail**: Every discussion, correction, and approval is permanently logged
4. **ERP Bridge**: Accountants work in their preferred ERP, companies work in KsięgaI
5. **Status Sync**: Accounting status (booked, paid) syncs back from ERP to KsięgaI

## Supported ERP Systems

| ERP Provider | Push | Pull | Webhooks | Auth Type | Status |
|--------------|------|------|----------|-----------|--------|
| Comarch (Optima, XL, XT) | ✅ | ✅ | ✅ | API Key | Active |
| enova365 (Soneta) | ✅ | ✅ | ✅ | OAuth2 | Active |
| Symfonia (Sage) | ✅ | ✅ | ❌ | API Key | Active |
| InsERT (GT, Nexo, Subiekt) | ✅ | ✅ | ❌ | API Key | Active |
| Odoo | ✅ | ✅ | ✅ | API Key | Coming Soon |
| Custom | ✅ | ✅ | ✅ | Custom | Active |

## Database Schema

### ERP Connections
Stores connection credentials and configuration for each ERP system.

### ERP Sync Logs
Audit trail of all push/pull operations with full request/response payloads.

### Invoice Agreement Workflow
Status tracking: draft → sent → received → under_discussion → approved → ready_for_ksef

## Edge Functions

### 1. erp-push-invoice
Pushes agreed invoices to ERP after both parties approve.

### 2. erp-webhook
Receives status updates from ERP systems (invoice booked, payment received).

## Next Steps

See ACCOUNTANT_COMPANY_COLLABORATION.md for detailed workflow documentation.
