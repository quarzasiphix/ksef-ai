# Current Accounting System Documentation

## Overview

The accounting system in KSeF-AI implements a dual accounting model supporting both **Spółka (Company)** accounting under Polish Accounting Law and **JDG Ryczałt** simplified taxation. The system processes financial events through a unified ledger architecture that feeds into traditional double-entry bookkeeping and ryczałt revenue reporting.

## Accounting Architecture

### Event → Account → Posting → Period Flow

```
Financial Events (events table)
        ↓
Ledger Events (unified view)
        ↓
Accounting Entries (accounting_entries table)
        ↓
Chart of Accounts (chart_of_accounts table)
        ↓
Accounting Periods (accounting_periods table)
```

### Core Components

#### Events System
**Purpose**: Raw financial event capture
**Table**: `events`
**Key Fields**:
- `entity_type`: "invoice", "expense", "payment", etc.
- `entity_id`: Reference to source document
- `event_type`: "invoice_issued", "expense_added", "payment_received"
- `event_data`: JSON payload with amounts, dates, parties

#### Ledger System
**Purpose**: Unified financial timeline view
**Implementation**: `LedgerEvent` interface in `ledger.ts`
**Layers**:
1. **Time**: Timestamp and date
2. **Event Type**: Categorized financial actions
3. **Document Identity**: Links to source documents
4. **Money Effect**: Amounts, currency, direction
5. **Cash Channel**: How money actually moved
6. **Contextual Links**: Related documents and relationships

#### Accounting Entries
**Purpose**: Double-entry bookkeeping entries
**Table**: `accounting_entries` (referenced but not fully examined)
**Expected Structure**: Debit/credit entries with account linkages

#### Chart of Accounts
**Purpose**: Account hierarchy for Polish accounting standards
**Table**: `chart_of_accounts`
**Key Fields** (based on schema):
- `business_profile_id`: Business context
- `account_number`: Polish account number (e.g., "201", "401")
- `account_name`: Account description
- `account_type`: Asset, liability, income, expense
- `parent_account_id`: Hierarchical structure

#### Accounting Periods
**Purpose**: Time-based accounting closures
**Table**: `accounting_periods`
**Key Fields**:
- `business_profile_id`: Business context
- `period_start/end`: Date range
- `status`: "open", "closing", "closed"
- `type`: Monthly, quarterly, annual

## Chart of Accounts Model

### Polish Accounting Standards
The system uses standard Polish chart of accounts:
- **Assets**: 0xx-1xx (Cash: 100-139, Receivables: 200-209)
- **Liabilities**: 2xx-3xx (Payables: 200-209, Loans: 240-249)
- **Equity**: 8xx (Capital: 801-810)
- **Income**: 4xx-7xx (Sales: 401-410, Other income: 500-599)
- **Expenses**: 4xx-7xx (COGS: 401-410, Operating: 500-599)

### Account Types
- **Synthetic**: Summary accounts (e.g., 201 - Receivables)
- **Analytical**: Detailed sub-accounts (e.g., 201-01 - Customer X)

### Business-Specific Customization
Accounts can be customized per business profile with different hierarchies for:
- Different industries (construction, IT, trade)
- Entity types (JDG vs Spółka)
- Complexity levels (starter vs enterprise)

## JDG Ryczałt Flow

### Overview
Ryczałt (flat-rate taxation) for small businesses with simplified accounting:
- Flat VAT rates (3%, 5.5%, 8.5%, 12.5%, 15%, 17.5%)
- No full double-entry bookkeeping required
- Revenue-based tax calculation

### Rate Determination
Based on PKD (business activity codes):
```json
{
  "services_it": 12.5,
  "trade_retail": 3.0,
  "trade_wholesale": 5.5,
  "services_general": 17.5,
  "transport": 8.5
}
```

### Revenue Processing
1. **Income Events**: Invoices, payments captured as events
2. **Rate Application**: Activity-based ryczałt rate applied
3. **Tax Calculation**: Revenue × Rate = Quarterly tax payment
4. **Reporting**: JPK_RYCZ quarterly declarations

### Current Implementation Status
- **Events**: Basic invoice/payment events logged
- **Rate Storage**: `ryczalt_rates` JSON in business_profiles
- **Processing**: Appears partially implemented
- **Reporting**: Basic revenue tracking, full JPK_RYCZ not confirmed

## Spółka Flow

### Full Accounting Requirements
For companies (Sp. z o.o., S.A.) requiring full double-entry bookkeeping:
- Complete chart of accounts
- Monthly/quarterly VAT declarations
- Annual financial statements
- CIT (corporate income tax) calculations

### Posting Process
1. **Source Events**: Invoices, expenses, payments
2. **Account Determination**: Business rules map events to accounts
3. **Double Entries**: Debit/credit entries created
4. **Period Assignment**: Entries assigned to accounting periods

### Period Management
- **Status Flow**: open → closing → closed
- **Locks**: Closed periods prevent modifications
- **Adjustments**: Only possible in open periods

### VAT & CIT Considerations
- **VAT Thresholds**: 200,000 PLN annual exemption tracking
- **VAT Status**: Active, exempt, or threshold-based
- **CIT Rates**: Configurable (default 19%)
- **Advance Payments**: Monthly/quarterly tax advances

## How Invoices Feed Accounting Today

### Invoice Integration Points
1. **Event Creation**: Invoice issuance creates `invoice_issued` event
2. **Payment Tracking**: `invoice_paid` events on payment receipt
3. **Account Posting**: Events should trigger accounting entries

### Current State
- **Events**: Invoice lifecycle events logged
- **Ledger**: Unified view exists conceptually
- **Posting**: Appears partially implemented
- **Period Integration**: Period locks prevent modifications

### Missing Links
- **Automated Posting**: Manual account assignment required
- **VAT Calculation**: Basic, but not fully automated
- **Revenue Recognition**: Basic event logging, not full accounting

## RLS & Integrity Considerations

### Accounting Table Security
- **accounting_periods**: Business profile ownership + status restrictions
- **chart_of_accounts**: Business profile ownership
- **events**: Business profile + company member access

### Data Integrity Issues
- **Period Locks**: Updates restricted to open periods (good)
- **Account Validation**: Limited account number validation visible
- **Audit Trail**: Events table prevents updates (good)

### Multi-tenant Safety
- **Business Isolation**: All accounting data scoped to business_profile_id
- **User Permissions**: Company member roles control access
- **Admin Overrides**: Super admin full access

## Known Limitations

### Technical Gaps
- **Posting Automation**: Manual account selection for every transaction
- **Complex Transactions**: Multi-entry transactions not fully supported
- **Currency Handling**: Primarily PLN-focused
- **Inter-company**: No support for consolidated accounting

### Business Logic Issues
- **Revenue Recognition**: Basic invoice-based, no accrual accounting
- **VAT Automation**: Manual VAT rate selection
- **Period Management**: Basic open/close, limited adjustments
- **Reporting**: Basic summaries, not full statutory reports

### JDG vs Spółka Gaps
- **Ryczałt Automation**: Rate application exists but processing unclear
- **JPK Integration**: Appears partial, not full compliance
- **Tax Calculations**: Basic, not comprehensive
- **Threshold Tracking**: VAT exemption logic exists but unverified

## Future Hook Points

### Enhancement Opportunities
1. **Automated Posting Rules**: Event type → account mapping rules
2. **VAT Engine**: Automatic VAT calculation and posting
3. **Period Adjustments**: Adjustment entry support
4. **Multi-currency**: Currency conversion and handling
5. **Consolidated Reporting**: Multi-entity financial statements

### Integration Points
1. **KSeF Integration**: Automatic invoice posting from KSeF
2. **Bank Integration**: Automatic bank feed processing
3. **Expense Management**: Automated expense categorization
4. **Contract Integration**: Contract-to-invoice linkage

### Compliance Improvements
1. **JPK Generation**: Full statutory reporting automation
2. **Audit Trail**: Complete transaction audit trails
3. **Archival**: Long-term document and transaction storage
4. **Digital Signatures**: Electronic signature support
