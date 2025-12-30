# Business Delivery and Agreement Layer

## Core Concept

**"KsięgaI to system, w którym firmy nie tylko wystawiają dokumenty — one je dostarczają, uzgadniają i rozliczają w jednym obiegu."**

This transforms KsięgaI from accounting software into a **business document network** where:
- Documents move between companies with states
- Those states become accounting truth
- Companies agree on documents before they become final

## The Value Proposition

### What Users Feel

1. **"I sent an invoice and I know it was delivered."**
2. **"My client saw it."**
3. **"They accepted it or disputed it."**
4. **"When it's paid, it's already matched and booked."**

This is the network value. Not chat. Not social networking. **Business delivery and agreement.**

## Two Delivery Modes

### 1. In-App Delivery (Connected Client)

If the recipient is in KsięgaI:
- They receive the invoice inside their app immediately
- It appears in their **Business Inbox**
- They can: **accept / dispute / reject**

### 2. Public Link (Fallback)

If not in the app:
- Generate a secure link
- Track open events
- Optionally require "recipient details" to view (NIP/email)

**This creates usefulness even with low network adoption.**

## The Business Inbox (Killer Feature)

One inbox page that works like this:

**Incoming invoice → user chooses one of 3 actions:**

1. **Accept** (and optionally "book it")
2. **Dispute** (structured reason + note)
3. **Reject** (wrong company / wrong data / not ordered)

This is where you become **"KSeF-before-KSeF"** — companies agree on documents before they become final.

## Communication: Strict and Document-Scoped

**No general chat.** Only:
- A thread under an invoice/contract
- Structured reasons (dropdown) + optional message
- Outcomes must resolve to a state:
  - Corrected invoice issued
  - Accepted
  - Rejected
  - Paid

This keeps it professional and prevents chaos.

## Payments: "invoice → pay → settle → book"

For freelancers and small companies, sell one promise:

**"If the client pays through the invoice link, your bookkeeping is basically done."**

### How It Works

1. Invoice has a "Pay" button (Stripe)
2. Many payments accumulate
3. One payout happens
4. You show it as: **one bank entry + internal breakdown per invoice**

Very simple for the user:
- Bank statement stays clean
- Accounting stays clean
- No manual matching hell

**Minimal tech note:** Stripe already supports payout/transfer reporting; you just map payout → invoices in your UI.

## Why This Can Become "Cadena for Poland"

(Without copying Cadena)

### Cadena's Angle
"Business networking" — meet companies

### Your Angle (Stronger)
**"Do business with companies, correctly"**

Not "meet companies" but "do business with companies, correctly."

Once documents move inside the network, you can later add:
- Verified business profiles (NIP/KRS)
- Trusted counterparties list
- Request-for-quote / offers
- Recurring supplier relationships
- Reputation based on delivery/payment behavior (careful, but powerful)

**But the core network starts with invoices and contracts, because that is where real business happens.**

## Database Architecture

### Core Tables

#### `document_deliveries`
The central delivery tracking table.

**Key fields:**
- `document_type`: invoice | contract | offer | receipt
- `document_id`: references the actual document
- `sender_business_profile_id`: who sent it
- `recipient_business_profile_id`: who receives it (if in network)
- `recipient_nip`, `recipient_email`, `recipient_name`: for external recipients
- `delivery_method`: in_app | public_link | email
- `delivery_status`: sent → viewed → accepted/disputed/rejected → paid → settled
- `public_link_token`: secure token for public access
- `view_count`, `first_viewed_at`, `last_viewed_at`: tracking

**State machine:**
```
sent → viewed → accepted → paid → settled
              ↘ disputed → corrected
              ↘ rejected
```

#### `delivery_events`
Audit trail for all state changes.

**Every status change is logged:**
- Who triggered it
- From/to status
- Metadata (structured data)
- IP address, user agent

#### `document_disputes`
Structured dispute management.

**Structured reasons (no chaos):**
- `incorrect_amount`
- `incorrect_items`
- `incorrect_recipient`
- `not_ordered`
- `already_paid`
- `duplicate`
- `missing_details`
- `other` (requires detailed message)

**Resolution tracking:**
- `open` → `acknowledged` → `corrected` / `rejected_by_sender` / `withdrawn` / `resolved`
- Link to corrected document

#### `document_threads`
Document-scoped communication.

**Message types:**
- `comment`
- `dispute_reason`
- `correction_note`
- `payment_confirmation`
- `system_notification`

**Key feature:** `is_internal` flag for sender-only notes.

#### `payment_settlements`
Invoice → pay → settle → book flow.

**Stripe integration:**
- `stripe_payment_intent_id`
- `stripe_charge_id`
- `stripe_payout_id` (for clean bank reconciliation)

**Amounts:**
- `amount_paid`
- `fee_amount`
- `net_amount`

**Accounting:**
- `is_booked`
- `booked_at`
- `accounting_entry_id` (future link to accounting entries)

#### `business_connections`
Track who does business with whom.

**Connection types:**
- `client` (they buy from me)
- `supplier` (I buy from them)
- `both` (mutual business)

**Trust levels (future reputation):**
- `new` → `verified` → `trusted` → `preferred`
- `blocked` (for bad actors)

**Stats:**
- Total documents sent/received
- Total amounts
- First/last interaction dates

## Implementation Files

### Database
- `supabase/migrations/20251219_business_delivery_network.sql`
  - All tables, indexes, RLS policies, triggers
  - Helper functions for inbox counts, delivery context
  - Automatic connection tracking

### TypeScript Types
- `src/types/delivery.ts`
  - Complete type definitions
  - Helper functions for status checks
  - Validation functions
  - Labels and UI helpers

### UI Components
- `src/pages/inbox/BusinessInbox.tsx`
  - Main inbox view with tabs (all/pending/disputed)
  - Stats cards (requires action, pending, disputed, total value)
  - Delivery list with status badges
  
- `src/pages/inbox/InboxItemActions.tsx`
  - Accept/Dispute/Reject action buttons
  - Dialogs for each action with structured inputs
  - Dispute reason dropdown
  - Validation for "other" reason
  
- `src/pages/inbox/InboxItemDetails.tsx`
  - Side panel with full delivery details
  - Sender information
  - Delivery timeline
  - Dispute details (if any)
  - Payment information (if any)
  - Thread messages
  - Event history

## Next Steps to Complete Implementation

### 1. Apply Database Migration
```bash
# The migration is ready in:
# supabase/migrations/20251219_business_delivery_network.sql

# Apply via Supabase MCP:
mcp1_apply_migration(
  project_id: "rncrzxjyffxmfbnxlqtm",
  name: "business_delivery_network",
  query: <migration_sql>
)
```

### 2. Regenerate Supabase Types
```bash
npm run generate-types
```

This will resolve all TypeScript errors related to the new tables.

### 3. Add Missing Utility Functions

**`src/lib/utils.ts`** - Add `formatCurrency`:
```typescript
export function formatCurrency(amount: number, currency: string = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}
```

**`src/hooks/useAuth.ts`** - Add `currentBusinessProfile`:
```typescript
// Add to AuthContextType and useAuth hook
currentBusinessProfile: BusinessProfile | null;
```

### 4. Create Repository Layer

**`src/integrations/supabase/repositories/deliveryRepository.ts`**

Functions needed:
- `createDelivery(input: CreateDeliveryInput)`
- `updateDeliveryStatus(deliveryId, status)`
- `getBusinessInbox(businessProfileId, filters)`
- `getDeliveryDetails(deliveryId)`
- `createDispute(input: CreateDisputeInput)`
- `resolveDispute(input: ResolveDisputeInput)`
- `addThreadMessage(input: CreateThreadMessageInput)`
- `recordPayment(input: RecordPaymentInput)`
- `generatePublicLink(deliveryId, options)`
- `trackLinkView(token, metadata)`

### 5. Integrate with Existing Invoice Flow

**When sending an invoice:**
1. Check if recipient is in network (by NIP)
2. If yes: create in-app delivery
3. If no: create public link delivery
4. Show delivery status on invoice detail page

**Add to invoice detail page:**
- Delivery status badge
- "Send to client" button (if not sent)
- "View delivery details" button (if sent)
- Public link (if using public link delivery)

### 6. Add Public Link Viewer

**`src/pages/public/DeliveryViewer.tsx`**

Public page accessible without login:
- Verify token
- Optionally require recipient verification (NIP/email)
- Display document (invoice/contract)
- Track view event
- Show "Pay Now" button (if invoice + Stripe enabled)

### 7. Stripe Payment Integration

**Invoice payment flow:**
1. User clicks "Pay" on invoice (in-app or public link)
2. Stripe Checkout session created
3. On success: create `payment_settlement` record
4. Link payment to delivery
5. Update delivery status to "paid"
6. When Stripe payout happens: mark as "settled"
7. Show in accounting as one bank entry with breakdown

### 8. Add to Navigation

Add "Business Inbox" to main navigation:
```typescript
{
  name: "Skrzynka Biznesowa",
  path: "/inbox",
  icon: Inbox,
  badge: inboxCount > 0 ? inboxCount : undefined,
}
```

### 9. Notification System

**Real-time notifications for:**
- New delivery received
- Delivery viewed by recipient
- Delivery accepted/disputed/rejected
- Payment received
- Dispute resolved

Use Supabase Realtime subscriptions on `document_deliveries` table.

### 10. Analytics Dashboard

**For business owners:**
- Delivery success rate
- Average time to acceptance
- Dispute rate
- Payment conversion rate
- Top clients/suppliers by volume

## Strategic Positioning

### The KSeF Relationship (Critical)

**"KSeF rejestruje fakty. KsięgaI pomaga firmom dojść do faktów, zanim staną się publiczne."**

(KSeF registers facts. KsięgaI helps companies arrive at facts before they become public.)

#### What This Means

KsięgaI is a **pre-KSeF agreement layer**:
- Companies negotiate and agree on invoices privately
- Corrections happen before KSeF submission, not after
- KSeF receives the final truth, not the negotiation noise
- This is **process hygiene**, not tax evasion

#### The Natural Order Restored

```
Traditional commerce:  contract → agreement → execution → record
KSeF compressed this:  record → correction → explanation
KsięgaI restores:      agreement (private) → record (KSeF)
```

**This is not anti-state. This is how commercial law always worked.**

See `docs/KSEF_POSITIONING.md` for complete legal and philosophical positioning.

### Marketing Messages

**Primary:**
- "Uzgodnij fakturę, zanim trafi do KSeF" (Agree on invoice before it goes to KSeF)
- "Mniej korekt w KSeF = mniej pytań z urzędu skarbowego"

**Never say:**
- ❌ "Avoid KSeF" / "Hide invoices" / "Keep private from government"

**Always say:**
- ✅ "Pre-invoice agreement" / "Error reduction" / "Clean KSeF submissions"

### Competitive Advantages

1. **vs Email:** Proof of delivery, read receipts, structured responses
2. **vs iFirma/Fakturownia:** Agreement before submission, not just generation
3. **vs Accounting software:** Documents move between companies with agreement states
4. **vs KSeF directly:** Agreement happens BEFORE submission (fewer corrections)
5. **vs Chaos:** Structured negotiation instead of email/phone trails

### Network Effects

**Early adopters get:**
- Instant delivery to other network members
- Fallback to public links for non-members
- Incentive to invite clients/suppliers (better experience)

**As network grows:**
- More deliveries happen in-app
- Faster payment cycles
- Reputation/trust signals
- Verified business directory

### Revenue Model

**Entity-based pricing still applies:**
- JDG: 19 zł/month (basic delivery features)
- Spółka: 89 zł/month (full network features + governance)
- Enterprise: Custom (white-label network, API access)

**Additional revenue streams:**
- Payment processing fees (Stripe passthrough + small markup)
- Premium features: priority delivery, advanced analytics
- API access for integrations
- Verified business badges

## Technical Notes

### Security Considerations

1. **Public links:** Time-limited tokens, optional verification
2. **RLS policies:** Strict sender/recipient access control
3. **Audit trail:** All actions logged with IP/user agent
4. **Data privacy:** Internal messages not visible to counterparty

### Performance Optimization

1. **Indexes:** All foreign keys and status fields indexed
2. **Caching:** Inbox counts cached, invalidated on updates
3. **Real-time:** Selective subscriptions (only active deliveries)
4. **Pagination:** Inbox list paginated for large volumes

### Future Enhancements

1. **Bulk operations:** Accept/dispute multiple deliveries
2. **Templates:** Pre-filled dispute reasons for common issues
3. **Reminders:** Automatic follow-ups for pending deliveries
4. **Integrations:** Export to accounting software (e.g., Symfonia, Comarch)
5. **Mobile app:** Push notifications for delivery events
6. **API:** Allow third-party integrations
7. **Reputation system:** Trust scores based on behavior
8. **Offers/RFQ:** Extend beyond invoices to procurement

## Conclusion

This business delivery network transforms KsięgaI from "yet another invoicing tool" into **the way Polish companies do business with each other**.

The core insight: **Documents moving between companies with agreed states is more valuable than documents sitting in isolated systems.**

Start with invoices. Prove the value. Expand to contracts, offers, and beyond.

**The network is the moat.**
