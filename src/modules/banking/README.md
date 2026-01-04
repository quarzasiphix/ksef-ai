# Banking Module Documentation

## 1. Purpose & Scope
The banking module provides first-class handling of bank accounts, imported transactions, and treasury analytics for each business profile (spółka/jdg). It underpins:

- Payment instructions on invoices/contracts (settlement context)
- Transaction analytics and reconciliation dashboards
- Event logging (e.g., bank account creation) for audit trails
- Future automated reconciliation loops (bank import → interpreter → matcher → event verification)

## 2. Data Model (Supabase)
The module persists its state via Supabase Postgres and Storage.

### 2.1 `bank_accounts`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK, default `gen_random_uuid()`) | canonical account identifier |
| `business_profile_id` | uuid | owner entity (joins to `business_profiles`) |
| `bank_name` | text | display label (e.g., "mBank") |
| `account_number` | text | IBAN or account identifier |
| `account_name` | text, nullable | custom label, shown in UI |
| `currency` | text, default `'PLN'` | ISO currency code |
| `type` | text, default `'main'` | semantic role (`main`, `vat`, `tax`, `other`) |
| `balance` | numeric, default `0` | last known balance (informational) |
| `connected_at`, `created_at`, `updated_at` | timestamptz, default `now()` | lifecycle timestamps |
| `is_default` | boolean, default `false` | optional default flag |
| `last_event_id` | uuid | for future ledger linkage |

### 2.2 `bank_transactions`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid (PK) | imported transaction identifier |
| `account_id` | uuid (FK → `bank_accounts.id`) | settlement channel |
| `date` | date | transaction/booking date |
| `description` | text | narrative/title from bank file |
| `amount` | numeric | signed amount (income positive, expense negative) |
| `type` | text | `income` / `expense` (derived on import) |
| `currency` | text, default `'PLN'` | currency code |
| `counterparty`, `category` | text, nullable | enrichment fields |
| `created_at`, `updated_at` | timestamptz | audit columns |

### 2.3 Storage bucket `bank-logs`
- Private bucket storing uploaded CSV/MT940/etc. source files per user (`{userId}/{timestamp}_{filename}`).
- Signed URLs generated via `getBankLogSignedUrl` for traceability.

## 3. Repository Layer
Located under `src/modules/banking/data/`:

| File | Responsibility |
| --- | --- |
| `bankAccountRepository.ts` | CRUD helpers for `bank_accounts` (`getBankAccountsForProfile`, `addBankAccount`, `updateBankAccount`, `deleteBankAccount`). Maps snake_case ↔ camelCase. |
| `bankTransactionRepository.ts` | Import + query helpers (`saveBankTransactions` via `upsert`, account/profile filters, deletion). |
| `bankLogRepository.ts` | Storage helpers for import files (upload/list/signed URL/delete). |

These functions are consumed by React components and other modules (invoices) to keep the banking layer consistent.

## 4. UI Composition
`BankAccountsSection.tsx` drives the treasury workspace:

1. Pulls accounts for the active business profile (`useBusinessProfile`).
2. Displays cards (`BankAccountCard`) with selection, edit, delete, and import actions.
3. Shows analytics (`BankAnalyticsDashboard`) + transaction table (`TransactionList`) for the selected account.
4. Handles CSV imports (`ImportBankStatementDialog` → `saveBankTransactions`).
5. Logs creation events for spółka profiles via `logCreationEvent`/`shouldLogEvents`, enriching the audit trail.

## 5. Invoice & Contract Integration
`BankAccountSelector.tsx` is reused inside invoice/contract forms:

- Fetches accounts for the profile and auto-selects the best candidate (same currency, non-VAT; otherwise first available non-VAT account).
- Exposes `onAddAccount`/`onAddVatAccount` callbacks so invoice flows can open banking dialogs inline.
- Tracks VAT-account readiness (`showVatRecommendation`) to encourage compliance.
- The selected `bank_account_id` is saved on the invoice/contract, ensuring downstream reconciliation knows which channel to expect payments on.

## 6. Event Logging Touchpoints
When bank accounts are added for spółka profiles, `handleAddAccount` emits an event (`eventType: 'bank_account_added'`) with metadata (account number/bank). This keeps `/events` aligned with treasury actions and prepares for reconciliation blockers.

## 7. Planned Bank Import Interpreter & Matcher
To turn the banking data into a closed-loop accounting workflow, implement the following pipeline.

### 7.1 Statement Intake & Normalization
1. **Upload file** (CSV/XML/MT940) → save raw file in `bank-logs` with hash metadata.
2. **`bank_statement_imports` table** (new): stores bank_account_id, period bounds, file hash, row counts, totals, importer user, parsing status.
3. **`bank_transactions_staging` table** (new): per-row normalized fields
   - `transaction_date`, `booking_date`
   - `amount`, `currency`
   - `counterparty_name`, `counterparty_account`
   - `title`, `reference`, `end_to_end_id`
   - `raw_payload` JSON for traceability

Interpreter adapters (per bank format) populate staging rows before promoting to `bank_transactions`.

### 7.2 Matching Engine (deterministic + scored)
For each staged transaction:
1. Filter candidate documents/events:
   - Same `bank_account_id`
   - Amount tolerance ±0.01, currency match
   - Date window ±3 days
2. Score signals:
   - Invoice/contract number detected in reference/title
   - Counterparty similarity (normalized strings)
   - Counterparty IBAN match (if stored)
3. Output suggestions with reason codes (`exact_amount_date_ref`, `amount_only`, etc.).
4. Actions from the reconciliation UI:
   - Link transaction → existing `events` row (sets `bank_transaction_id`, `cash_channel='bank'`, marks verified)
   - If no event exists, spawn a payment event template (`payment_received` / `payment_sent`) and link it, propagating status updates to invoices/contracts (open → partially paid → paid).

### 7.3 Reconciliation & Period Commit Blockers
- Maintain blocker summaries: unmatched transactions, events without bank proof, invoices marked paid with no linked transaction.
- Feed blockers into the period-close workflow so accounting commits cannot finalize with unresolved discrepancies.

### 7.4 Policy Hooks
- Department-specific rules (`department_link_policies`): e.g., transport invoices must link to operations/jobs; SaaS invoices to contracts.
- Matching engine should respect these contexts to reduce false positives.

### 7.5 Next Steps Checklist
1. Create migrations for `bank_statement_imports` & `bank_transactions_staging` (+ necessary indexes).
2. Implement parser adapters (start with CSV templates for common banks, later MT940/XML).
3. Build reconciliation queue UI within `/events/reconciliation` (import → preview → match suggestions → link/create events).
4. Extend `events` schema with `bank_transaction_id`, `cash_channel`, `reconciliation_status`.
5. Update invoice status logic to derive from linked payment events.

By documenting and planning the interpreter/matcher here, the banking module now has a clear roadmap for achieving closed-loop, triple-entry accounting aligned with the rest of the system.

---

## 8. Month-End Close: Bank Log–Driven Reconciliation Wizard
This section turns the high-level plan into a concrete flow for month-end close using bank statement imports as “third entry” evidence.

### Step 0 — Select Period & Scope
- Inputs: period (`YYYY-MM`), bank account(s), optional department scope.
- UI immediately loads current period status (draft/proposed/accepted) and blocker counters (“what’s missing to close”).
- Scope constrains downstream queries (only staged imports, events, invoices for these parameters).

### Step 1 — Upload Immutable Bank Logs
- Supported formats: CSV, XML, MT940, etc.
- Each upload creates a `bank_statement_imports` row capturing:
  - `import_id`, `bank_account_id`, `file_hash`, `date_range`, `total_in`, `total_out`, `uploaded_by`.
  - Evidence objects are immutable; re-importing the same file creates a new row (audit trail).
- Raw files stored in `bank-logs` bucket under `{userId}/{timestamp}_{filename}`.

### Step 2 — Interpret into `bank_transactions_staging`
- Interpreter adapters parse raw rows into staging records with both raw and normalized fields:
  - Dates: booking date, value date.
  - Financials: amount, currency.
  - Parties: counterparty name/IBAN.
  - References: title/reference/E2E ID.
  - `txn_fingerprint`: deterministic hash (prevents duplicates).
  - `normalized_counterparty`, `normalized_reference`: ready for fuzzy matching.
  - `raw_payload`: JSON snapshot of the original row (immutability).
- Promotion to `bank_transactions` happens only after reconciliation approval.

### Step 3 — Matching Pass (Suggestion Engine)
**A. Candidate Narrowing**
- Filter invoices/contracts/events that:
  - Share the same `business_profile_id`.
  - Point to the same `bank_account_id` (because settlement context is stored on documents).
  - Fall within the target period (with ±N day tolerance).
  - Are unsettled or partially settled.

**B. Scoring Signals**
- Exact amount (±0.01).
- Date proximity.
- Invoice/contract number present in reference/title.
- Counterparty similarity (normalized strings) or IBAN match.
- Payment reference/E2E ID match.
- Accumulate reasons for transparency.

**C. Auto-Link Rules**
- Auto-link only when confidence is unequivocally high, e.g.:
  - Exact amount + invoice number match.
  - Exact amount + same counterparty + single candidate.
- All other cases flagged for manual review.

### Step 4 — Resolution Queues (Core UX)
Three queues drive user action:

1. **Matched (Ready)**  
   - High-confidence matches. Actions:
     - Link `bank_transactions_staging` → existing `events` row.
     - Mark event verified (third-entry proof).
     - Update invoice/contract status (paid/partial) via linked payment event.

2. **Ambiguous (Needs Choice)**  
   - Multiple plausible matches. Actions:
     - User picks the correct target or splits payment across multiple invoices.
     - Manual choice captures `chosen_by`, `chosen_at`, reasons.

3. **Unmatched (Needs Explanation)**  
   - No suggestions. User must:
     - Attach to an existing document/event (invoice, contract, decision, operation, capital txn).
     - Or create a new event (e.g., bank fee, tax payment) using posting templates.
     - Or mark “ignore” (transfers, duplicates, personal). Ignoring requires a reason code and remains auditable.

### Step 5 — Close Checklist & Blockers
- Deterministic blockers ensure no period can close prematurely:
  - Bank blockers: unmatched transactions, ignored without reason, events missing bank attestation.
  - Accounting blockers: events lacking Wn/Ma, required links (job/contract/decision) missing, decisions lacking signed PDFs.
- When blockers = 0:
  - Generate period digest.
  - Allow “Propose Commit” (multi-user) or “Accept” (single-user).

### Step 6 — Commit / Lock
- Accepted periods become immutable:
  - Reports/export APIs require `commit_id`.
  - Later corrections are recorded as storno + new events in subsequent periods.

### Implementation Safeguards
1. **Bank transactions link to `events`, not directly to invoices.**  
   - Ensures partial payments, bundled payments, refunds/chargebacks stay explainable.

2. **Persist matching outcomes.**  
   - For every transaction store: matched entity id/type, confidence score, reasons, chosen_by, chosen_at.
   - Enables audit, analytics, and re-matching when data changes.

### Minimal Viable Screens
1. **Import & Preview:** upload + parsed rows per bank account.  
2. **Reconciliation Queue:** three queues with actions described above.  
3. **Period Blockers & Commit:** summary view + button to propose/accept close.

These steps deliver a functional month-end reconciliation loop and pave the way for full triple-entry accounting.
