# Capital Contributions System - Complete Implementation

## Overview

The capital contribution system enables proper tracking of capital events (wniesienie kapitału) with full integration to:
- **Cash registers (Kasa)** - Automatic KP document generation
- **Bank accounts** - Transaction tracking
- **Ledger** - Automatic journal entry creation
- **Events timeline** - Full audit trail
- **Decisions** - Legal basis linking

## Architecture

### Triple Accounting Link
Every capital event maintains three critical links:

1. **Decision/Authority Link** - Legal basis (uchwała wspólników)
2. **Payment Link** - Money movement (KP document or bank transaction)
3. **Ledger Link** - Accounting posting (journal entry)

### Database Schema

#### Enhanced `capital_events` Table
```sql
- payment_method: 'cash' | 'bank' | 'none'
- cash_account_id: UUID (references payment_accounts)
- bank_account_id: UUID (references bank_accounts)
- kp_document_id: UUID (references kasa_documents)
- journal_entry_id: UUID (references journal_entries)
- payment_status: 'pending' | 'paid' | 'cancelled'
- ledger_status: 'not_posted' | 'posted' | 'reversed'
```

#### Enhanced `kasa_documents` Table
```sql
- capital_event_id: UUID (references capital_events)
- linked_document_type: includes 'capital_event'
- category: includes 'capital_contribution'
```

## User Flow

### Creating a Capital Contribution

1. **Navigate to Accounting → Equity → Capital Events**
2. **Click "Dodaj zdarzenie"** to open the wizard

#### Step 1: Event Type
- Select event type (e.g., "Wniesienie kapitału")
- Set event date

#### Step 2: Shareholders & Amounts
- Add one or more shareholders
- Specify amount for each shareholder
- View total contribution amount

#### Step 3: Legal Basis (Decision)
Options:
- **Link to existing decision** - Select from resolutions
- **Create new decision** - Generate uchwała
- **Skip** - Add legal basis later

#### Step 4: Payment Method
Options:
- **Cash (Gotówka)** - Select cash register → Auto-generates KP document
- **Bank transfer** - Select bank account → Links to transaction
- **To be paid** - No immediate payment (pending status)

#### Step 5: Accounting Posting
Options:
- **Generate now** - Creates journal entry immediately
  - Specify debit account (e.g., 130 - Bank)
  - Specify credit account (e.g., 801 - Share Capital)
- **Await accounting** - Manual posting later

### Generated Artifacts

When creating a capital contribution with cash payment:

1. **Capital Event Record** - Main transaction record
2. **KP Document** - Cash receipt (Kasa Przyjmie)
3. **Account Movement** - Updates cash register balance
4. **Journal Entry** (if requested) - Ledger posting
5. **Event Log** - Timeline entry for audit trail

## KP Report Generation

### Automatic KP Document
When payment method is "cash", the system automatically:
1. Generates sequential KP document number (KP/YYYY/NNNN)
2. Creates kasa_document record
3. Links to capital_event
4. Updates cash account balance via account_movements

### KP Report Format
```
KASA PRZYJMIE (KP)
Dokument nr: KP/2025/0001
Data: 08.01.2025

WNIESIENIE KAPITAŁU DO SPÓŁKI

Przyjęto od: Jan Kowalski
Kwota: 50000.00 PLN
Słownie: pięćdziesiąt tysięcy złotych

Tytuł wpłaty: Wniesienie kapitału zakładowego
Typ zdarzenia: Wniesienie kapitału

Podstawa prawna: U/2025/003

Data zdarzenia kapitałowego: 15.01.2025

Przyjął: _______________________
Data: 08.01.2025

---
Dokument wygenerowany automatycznie przez system KsięgaI
ID zdarzenia kapitałowego: abc123...
```

### Downloading KP Report
- Navigate to capital event
- Click "KP" button next to payment link
- Report downloads as text file

## Ledger Integration

### Automatic Journal Entry
When "Generate now" is selected:

**Debit Entry:**
- Account: 130 (Bank) or 140 (Cash)
- Amount: Contribution amount
- Description: "Wniesienie kapitału - [Shareholder Name]"

**Credit Entry:**
- Account: 801 (Share Capital)
- Amount: Contribution amount
- Description: "Wniesienie kapitału - [Shareholder Name]"

### Posting Status
- `not_posted` - Awaiting accounting
- `posted` - Journal entry created and posted
- `reversed` - Entry has been reversed

## Events Timeline Integration

All capital contributions appear in the events timeline with:
- Event type: `capital_event`
- Action: `equity_transaction`
- Full metadata including amounts, payment method, and links
- Searchable and filterable

## API Reference

### Repository Functions

#### `createCapitalEvent(input: CreateCapitalEventInput)`
Creates a single capital event with all integrations.

**Input:**
```typescript
{
  business_profile_id: string;
  event_type: 'capital_contribution' | ...;
  event_date: string;
  amount: number;
  shareholder_name: string;
  payment_method: 'cash' | 'bank' | 'none';
  cash_account_id?: string;
  bank_account_id?: string;
  generate_ledger_entry?: boolean;
  debit_account?: string;
  credit_account?: string;
}
```

**Returns:** `CapitalEvent` with all links populated

#### `createCapitalEventFromWizard(wizardData, businessProfileId)`
Creates capital events for multiple shareholders from wizard data.

#### `getCapitalEvents(businessProfileId)`
Retrieves all capital events with joined data (resolutions, KP documents, journal entries).

#### `generateKPReportForCapitalEvent(capitalEventId)`
Generates formatted KP report text for download.

## Cash Register Integration

### Cash Account Selection
- Only active cash registers shown
- Displays current balance
- Validates sufficient funds (for withdrawals)

### KP Document Creation
Automatically handled by `createCashTransaction`:
- Sequential document numbering
- Proper categorization (`capital_contribution`)
- Links to capital event
- Updates account movements
- Creates audit trail

### Balance Updates
Cash register balance updated through `account_movements`:
- Direction: `IN` for capital contributions
- Source type: `equity_transaction`
- Source ID: capital event ID
- Description includes shareholder name

## Security & Compliance

### RLS Policies
All tables protected by Row Level Security:
- Users can only access their own business profiles
- Capital events, KP documents, and journal entries filtered by profile

### Audit Trail
Complete audit trail maintained:
1. Capital event creation timestamp and user
2. KP document generation
3. Account movement records
4. Journal entry posting
5. Event log entries

### Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints validate payment methods and statuses
- Transaction-based operations prevent partial updates
- Rollback on failure ensures consistency

## Testing Checklist

- [ ] Create capital contribution with cash payment
- [ ] Verify KP document generated with correct number
- [ ] Check cash register balance updated
- [ ] Verify journal entry created (if requested)
- [ ] Download and review KP report
- [ ] View event in timeline
- [ ] Create contribution with bank payment
- [ ] Create contribution without payment (pending)
- [ ] Create contribution for multiple shareholders
- [ ] Link to existing decision
- [ ] Verify all links work (decision, payment, ledger)

## Future Enhancements

1. **Shareholder Declarations (Oświadczenia)**
   - Digital signature capture
   - PDF generation with legal template
   - Email delivery to shareholders

2. **Payment Reminders**
   - Automatic notifications for pending contributions
   - Payment deadline tracking
   - Overdue alerts

3. **Capital Structure Visualization**
   - Ownership pie charts
   - Contribution timeline graphs
   - Outstanding obligations dashboard

4. **Integration with KRS**
   - Automatic capital increase notifications
   - Document preparation for court filing
   - Status tracking

## Troubleshooting

### KP Document Not Generated
- Verify cash_account_id is provided
- Check cash register is active
- Ensure user has permissions

### Balance Not Updated
- Check account_movements table for entry
- Verify payment_account_id matches
- Review treasury engine logs

### Journal Entry Missing
- Confirm `generate_ledger_entry` was true
- Verify debit and credit accounts exist
- Check chart_of_accounts for valid accounts

### Event Not in Timeline
- Verify `logEvent` was called successfully
- Check events table for entry
- Review event type and action filters

## Support

For issues or questions:
1. Check database logs for errors
2. Review Supabase function logs
3. Verify RLS policies allow access
4. Contact development team with event ID
