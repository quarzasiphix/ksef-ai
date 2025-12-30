# KsiegaI Application Architecture - Revision 0.1

**Date**: December 29, 2025  
**Project**: KsiegaI (Fakturing) - Polish Accounting & Invoice Management Platform  
**Database**: Supabase PostgreSQL (Project ID: rncrzxjyffxmfbnxlqtm)

---

## Executive Summary

KsiegaI is a dual-application system consisting of:
1. **ksef-ai**: Vite + React 18 SPA for authenticated accounting workspace
2. **ksiegai-next**: Next.js 14 marketing frontend with SEO-optimized landing pages

The system implements an **event-driven accounting architecture** with a unified ledger as the single source of truth, decision-based authorization gates for spółki (limited companies), and multi-entity support for JDG (sole proprietorships) and corporate structures.

---

## 1. Technology Stack

### Frontend (ksef-ai)
- **Framework**: Vite 5.4.1 + React 18.3.1 + TypeScript 5.5.3
- **Routing**: React Router v6.26.2 with centralized route config
- **State Management**: TanStack Query v5.56.2 (React Query)
- **UI Components**: Radix UI primitives + shadcn/ui patterns
- **Styling**: TailwindCSS 3.4.11 + tailwindcss-animate
- **Forms**: React Hook Form 7.53.0 + Zod 3.23.8 validation
- **Auth**: Supabase Auth with cross-domain token restoration
- **Analytics**: PostHog 1.252.0 (conditional)
- **PDF Generation**: @react-pdf/renderer 4.3.1, jspdf 3.0.1
- **Payments**: Stripe React Stripe.js 3.7.0

### Backend & Database
- **Database**: Supabase PostgreSQL 15.8.1 (eu-north-1)
- **Auth**: Supabase Auth with RLS (Row Level Security)
- **Storage**: Supabase Storage for documents/attachments
- **Real-time**: Supabase Realtime subscriptions
- **Edge Functions**: Deno-based serverless functions

### Marketing Frontend (ksiegai-next)
- **Framework**: Next.js 14.2.16 (App Router)
- **Rendering**: Server-side + static generation
- **Styling**: TailwindCSS 3.4.1
- **Icons**: Lucide React 0.321.0

---

## 2. Database Schema (Key Tables)

### 2.1 Core Business Tables

#### `business_profiles`
Multi-entity support for different business types (JDG, sp. z o.o., S.A.).

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `name`, `tax_id`, `regon`, `krs_number`
- `entity_type` (text): 'dzialalnosc' | 'sp_zoo' | 'sa'
- `is_vat_exempt` (boolean), `vat_exemption_reason` (text)
- `share_capital` (numeric), `establishment_date` (date)
- `stripe_connect_account_id`, `stripe_connect_status`
- `accounting_method` ('ksiegi_rachunkowe' | other)
- `cit_rate` (integer, default 19)

**RLS**: Enabled (17 rows)

---

#### `invoices`
Central invoice table supporting income/expense transactions, KSeF integration, agreement workflow, and ERP sync.

**Key Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `business_profile_id` (uuid, FK → business_profiles)
- `customer_id` (uuid, FK → customers)
- `number` (text), `type` (text), `transaction_type` (text: 'income' | 'expense')
- `issue_date`, `due_date`, `sell_date` (date)
- `status` (text: 'draft' | 'sent' | 'paid' | 'overdue')
- `payment_method` (text), `is_paid` (boolean, default false)
- `total_net_value`, `total_gross_value`, `total_vat_value` (numeric)
- `vat` (boolean), `vat_exemption_reason` (text)
- `currency` (text, default 'PLN'), `exchange_rate` (numeric)
- `decision_id` (uuid, FK → decisions), `decision_reference` (text)
- `contract_id` (uuid, FK → contracts)
- `bank_account_id` (uuid, FK → bank_accounts)
- `cash_account_id` (uuid, FK → payment_accounts)

**Agreement Workflow** (Pre-KSeF verification):
- `agreement_status` (enum): 'draft' | 'sent' | 'received' | 'under_discussion' | 'correction_needed' | 'approved' | 'ready_for_ksef' | 'rejected' | 'cancelled'
- `agreement_sent_at`, `agreement_received_at`, `agreement_approved_at`, `agreement_rejected_at` (timestamptz)
- `ready_for_ksef_at`, `ksef_submitted_at` (timestamptz)

**KSeF Integration**:
- `ksef_status` (text: 'none' | 'pending' | 'sent' | 'error')
- `ksef_reference_number`, `ksef_reference`, `ksef_upo`, `ksef_signed_xml`, `ksef_error` (text)

**Payment Integration** (Stripe):
- `payments_enabled` (boolean, default false)
- `payment_status` (text: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded')
- `paid_at` (timestamptz)
- `stripe_checkout_session_id`, `stripe_payment_intent_id` (text)
- `amount_gross_minor` (integer, grosze for PLN)

**ERP Sync**:
- `erp_synced_at` (timestamptz)
- `erp_sync_status` (text: 'pending' | 'synced' | 'failed')
- `erp_entity_id`, `erp_provider` (text)
- `erp_push_attempts` (integer, default 0)

**Accounting State** (Partial):
- `lifecycle_status` (text, default 'issued')
- `booked_to_ledger` (boolean, default false)
- `booked_at` (timestamptz)
- `accounting_source` (text)
- `last_event_id` (uuid, FK → events)

**RLS**: Enabled (rows not disclosed)

---

#### `invoice_items`
Line items for invoices with VAT calculation.

**Key Columns**:
- `id` (uuid, PK)
- `invoice_id` (uuid, FK → invoices)
- `product_id` (uuid, FK → products, nullable)
- `name`, `description` (text)
- `quantity` (numeric), `unit` (text)
- `unit_price`, `total_net_value`, `total_vat_value`, `total_gross_value` (numeric)
- `vat_rate` (numeric), `vat_exempt` (boolean)

---

#### `invoice_payments`
Detailed payment tracking for invoices (Stripe-focused).

**Key Columns**:
- `id` (uuid, PK)
- `invoice_id` (uuid, FK → invoices, ON DELETE CASCADE)
- `business_profile_id` (uuid, FK → business_profiles)
- `user_id` (uuid, FK → auth.users)
- `provider` (text: 'stripe' | 'manual' | 'bank_transfer', default 'stripe')
- `provider_payment_id`, `provider_checkout_id`, `provider_event_id` (text, for idempotency)
- `amount_minor` (integer, grosze), `currency` (text, default 'pln')
- `status` (text: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled')
- `metadata` (jsonb), `error_message` (text)
- `created_at`, `succeeded_at`, `failed_at`, `refunded_at` (timestamptz)

**Trigger**: `update_invoice_payment_status()` updates parent invoice on payment status change.

---

### 2.2 Event & Audit System

#### `events`
**Unified event system** - single source of truth for all financial and operational events. Ledger, inbox, invoices, expenses are filtered views of this table.

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `event_type` (text): 'invoice_issued' | 'invoice_received' | 'invoice_paid' | 'expense_captured' | 'expense_approved' | 'payment_received' | 'payment_sent' | etc.
- `event_number` (text, nullable)

**Dual Temporal Tracking** (CRITICAL):
- `occurred_at` (timestamptz): Economic date (invoice date, expense date)
- `recorded_at` (timestamptz): System/audit date (upload, OCR, creation)

**Financial Properties**:
- `amount` (numeric), `currency` (text), `direction` (text: 'incoming' | 'outgoing' | 'neutral')
- `cash_channel` (text: 'bank' | 'cash' | 'mixed' | 'none')

**Ledger Control**:
- `posted` (boolean, default false): If true, appears in LEDGER. If false, may appear in INBOX.
- `needs_action` (boolean, default false): If true and posted=false, event appears in INBOX as work item.

**Status Progression**:
- `status` (text, default 'captured'): 'captured' → 'classified' → 'approved' → 'posted' → 'settled'

**Authority & Compliance**:
- `decision_id` (uuid, FK → decisions), `decision_reference` (text)
- `blocked_by` (text): Decision ID or requirement that prevents event from being posted
- `blocked_reason` (text)

**Source & Classification**:
- `source` (text, default 'manual'): 'inbox' | 'manual' | 'bank' | 'contract' | 'ocr' | 'api'
- `classification`, `category` (text), `vat_rate` (numeric)

**Actor & Entity**:
- `actor_id` (uuid, FK → auth.users), `actor_name`, `actor_role` (text)
- `entity_type` (text), `entity_id` (uuid), `entity_reference` (text)

**Document Links**:
- `document_type` (text): 'invoice' | 'expense' | 'contract' | 'payment' | 'bank_transaction' | 'decision' | 'adjustment' | 'capital_event'
- `document_id` (uuid), `document_number` (text), `counterparty` (text)
- `linked_documents` (jsonb, default '[]')

**Audit Trail**:
- `action_summary` (text), `changes` (jsonb), `metadata` (jsonb)
- `parent_event_id` (uuid, FK → events, self-reference)
- `is_material` (boolean, default true)

**RLS**: Enabled

---

#### `company_events`
Legacy audit log table for spółki (sp. z o.o., S.A.) - predates unified `events` table.

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `event_type` (enum): 'invoice_created' | 'invoice_issued' | 'expense_recorded' | etc.
- `actor_id` (uuid, FK → auth.users), `actor_name`, `actor_role` (text)
- `occurred_at` (timestamptz, default now())
- `decision_id` (uuid, FK → decisions), `decision_reference`, `authority_level` (text)
- `entity_type`, `entity_id` (uuid), `entity_reference` (text)
- `action_summary` (text), `changes`, `metadata` (jsonb)
- `parent_event_id` (uuid, self-reference)
- `is_material` (boolean, default true)

**Note**: Should be migrated to unified `events` table.

---

### 2.3 Decision & Authorization System

#### `decisions`
Authority gates for spółki - nothing operational or financial is allowed unless a higher authority approved it.

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `resolution_id` (uuid, FK → resolutions, nullable)
- `decision_number` (text), `title`, `description` (text)
- `decision_type` (text): 'budget_approval' | 'contract_authority' | 'hiring_authority' | 'capital_event' | 'operational_policy'
- `category` (text), `scope_description` (text)
- `amount_limit` (numeric), `currency` (text, default 'PLN')
- `valid_from`, `valid_to` (date)
- `allowed_counterparties` (jsonb, default '[]')
- `status` (text, default 'active')
- `decision_body` (text, default 'WSPOLNICY'): 'WSPOLNICY' | 'ZARZAD'
- `approval_policy` (text, default 'ALL_SHAREHOLDERS')
- `allows_actions` (text[]): Actions this decision permits
- `contract_types` (text[]), `blocks_without` (text)
- `is_foundational` (boolean, default false)
- `parent_decision_id` (uuid, self-reference)
- `legal_reference` (text)

**Usage Tracking**:
- `total_contracts`, `total_invoices`, `total_expenses` (integer)
- `total_amount_used` (numeric)

**RLS**: Enabled

---

### 2.4 Treasury & Payment System

#### `payment_accounts`
Bank and cash accounts for treasury management.

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `account_type` (varchar): 'BANK' | 'CASH'
- `name` (varchar), `currency` (varchar, default 'PLN')
- `opening_balance` (numeric, default 0)
- `bank_name`, `account_number` (varchar, nullable)
- `responsible_person` (varchar, nullable)
- `is_active` (boolean, default true)

---

#### `account_movements`
Immutable ledger of all account balance changes.

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `payment_account_id` (uuid, FK → payment_accounts)
- `direction` (varchar): 'IN' | 'OUT'
- `amount` (numeric), `currency` (varchar, default 'PLN')
- `source_type` (varchar): 'DOCUMENT_PAYMENT' | 'OPENING_BALANCE' | 'MANUAL_ADJUSTMENT' | 'REVERSAL'
- `source_id` (uuid, nullable)
- `description` (text)
- `reversed_movement_id` (uuid, self-reference), `reversal_reason` (text)
- `is_reversed` (boolean, default false)
- `created_by` (uuid, FK → auth.users)

---

#### `document_payments`
Links payments to documents (invoices, expenses, contracts).

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `document_type` (varchar): 'sales_invoice' | 'purchase_invoice' | 'KP' | 'KW' | 'contract' | 'other'
- `document_id` (uuid)
- `payment_account_id` (uuid, FK → payment_accounts)
- `movement_id` (uuid, FK → account_movements)
- `amount` (numeric), `currency` (varchar, default 'PLN')
- `payment_date` (date)
- `notes` (text)

---

### 2.5 Supporting Tables

#### `customers`
Counterparties for invoices and contracts.

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `name`, `tax_id`, `email`, `phone` (text)
- `address`, `postal_code`, `city`, `country` (text)
- `is_company` (boolean), `is_vat_payer` (boolean)

---

#### `products`
Product/service catalog for invoice line items.

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `name`, `description` (text)
- `unit_price` (numeric), `unit` (text)
- `vat_rate` (numeric), `category` (text)

---

#### `contracts`
Legal agreements with customers/suppliers.

**Key Columns**:
- `id` (uuid, PK)
- `business_profile_id` (uuid, FK → business_profiles)
- `customer_id` (uuid, FK → customers)
- `contract_number`, `title` (text)
- `contract_type` (text), `status` (text)
- `start_date`, `end_date` (date)
- `total_value` (numeric), `currency` (text)
- `decision_id` (uuid, FK → decisions)

---

## 3. Application Architecture

### 3.1 Entry Point & Providers

**File**: `src/main.tsx`

Boots React 18 with:
- `HelmetProvider` (react-helmet-async) for `<head>` management
- Conditional `PostHogProvider` (analytics) based on `VITE_PUBLIC_POSTHOG_KEY` and localhost detection
- Renders `<App />` component

---

**File**: `src/App.tsx`

Global provider composition (order matters):
1. `ThemeProvider` (dark/light/system theme)
2. `QueryClientProvider` (TanStack Query for server state)
3. `TooltipProvider` (Radix UI tooltips)
4. `Toaster` (sonner toast notifications)
5. `Router` (React Router v6 BrowserRouter)
6. `AuthProvider` (Supabase auth + premium status)
7. `WorkspaceTabsProvider` (multi-tab workspace state)
8. `RouteRenderer` (centralized routing)

---

### 3.2 Routing System

**File**: `src/shared/config/routes.tsx`

Centralized route configuration with:
- **Lazy loading**: All screens loaded via `React.lazy()`
- **Guards**: `public` | `protected` | `premium` | `onboarding`
- **Metadata**: `title`, `icon`, `section`, `hideInNav`
- **Nested routes**: Supports parent/child route hierarchies

**Route Sections**:
- `main`: Dashboard, Invoices, Expenses, Customers, Products, Analytics
- `hr`: Employees, Labour Hours
- `documents`: Contracts, Resolutions
- `governance`: Decisions
- `finance`: Bank, Assets, Ledger
- `accounting`: Accounting shell (premium), Balance Sheet, Equity, Shareholders, CIT, Kasa
- `operations`: Inventory (premium)
- `communication`: Inbox (unified event system)
- `settings`: Profile, Business Profiles, Documents, ERP, Team, Shared Links

**Helpers**:
- `flattenRoutes(routes)`: Flattens nested config for rendering
- `getRoutesBySection(section)`: Filters routes for nav generation
- `getSections()`: Extracts unique section names

---

**File**: `src/pages/routing/RouteRenderer.tsx`

Renders all routes from config:
- **Root redirect**: Checks if user has business profiles → `/dashboard` or `/welcome`
- **Auth routes**: `/auth/login`, `/auth/register`, `/auth/callback` with `PublicGate`
- **Onboarding**: `/welcome` with `ProtectedGate` + `BusinessProfileProvider`
- **Public shared**: `/share/:slug` with `PublicLayout`
- **Protected routes**: Wrapped in persistent `Layout` with `SidebarProvider` + `BusinessProfileProvider`

**Guards** (`src/pages/routing/AppGate.tsx`):
- `AppGate`: Base guard with `requireAuth`, `requirePremium`, `redirectTo` props
- `ProtectedGate`: Shorthand for `requireAuth=true`
- `PremiumGate`: Shorthand for `requireAuth=true` + `requirePremium=true`
- `PublicGate`: Redirects authenticated users to `/dashboard`

**Redirect Logic**:
- Unauthenticated users → `redirectToLogin()` (bounces to Next.js marketing site with `returnTo`)
- Non-premium users → `redirectToPremium(reason)` (bounces to premium page)

---

**File**: `src/components/layout/Layout.tsx`

Persistent layout for authenticated routes:
- **Sidebar**: `AppSidebar` (fixed, hidden on mobile/focus mode)
- **Header**: Top bar with breadcrumbs and page actions
- **Main content**: Adaptive padding for full-bleed routes (accounting, contracts, settings)
- **Footer**: Bottom footer
- **Mobile nav**: `MobileNavigation` (bottom bar)

**Focus Mode**: Hides sidebar and mobile nav for distraction-free editing.

---

### 3.3 Authentication & Authorization

**File**: `src/shared/context/AuthContext.tsx`

Manages:
- **User state**: Supabase session restoration, login/logout
- **Premium status**: Checks `user_metadata.is_premium` or Stripe subscription
- **Cross-domain tokens**: Restores session from URL params (`access_token`, `refresh_token`)
- **Premium modal**: Opens dialog prompting upgrade

**Hooks**:
- `useAuth()`: Returns `{ user, isLoading, isPremium, openPremiumDialog, ... }`

---

**File**: `src/shared/context/BusinessProfileContext.tsx`

Manages selected business profile:
- Loads profiles for current user
- Persists selection in localStorage
- Provides `selectedProfile`, `setSelectedProfile`, `profiles`

---

### 3.4 Workspace Tabs

**File**: `src/shared/context/WorkspaceTabsContext.tsx`

Multi-tab workspace state:
- **Tab operations**: `openTab`, `closeTab`, `closeAllTabs`, `pinTab`, `setTabDirty`
- **Focus mode**: `toggleFocusMode()` hides sidebar/nav
- **Persistence**: Saves tabs to localStorage
- **Navigation integration**: Syncs with React Router location

---

## 4. Module Structure

### 4.1 Invoices Module (`src/modules/invoices`)

**Screens**:
- `IncomeList`: List of income invoices (filtered ledger view)
- `ExpenseList`: List of expense invoices (filtered ledger view)
- `NewInvoice`: Create invoice form with items, VAT, payment method, decision picker
- `EditInvoice`: Update existing invoice
- `InvoiceDetail`: View invoice with agreement workflow, ERP sync status, lifecycle badges

**Components** (72 items):
- `FinancialControlStrip`: Status badges (issued/sent/payment/booked/closed), due date, overdue, VAT/JPK
- `InvoiceLifecycleStatus`: Visual timeline of invoice states
- `AgreementStatusBadge`, `AgreementActionButtons`, `AgreementHistory`: Pre-KSeF verification UI
- `ERPSyncWidget`: ERP integration status and sync controls
- `DecisionStateCard`, `CompactDecisionBadge`: Decision linkage UI
- `InvoiceQualityIndicators`: Data completeness checks
- `ReceivedInvoicesTab`: Inbox for received invoices from counterparties
- `ProfessionalInvoiceRow`, `ProfessionalInvoiceRowMobile`: List row components

**Data** (7 items):
- `invoiceRepository.ts`: CRUD operations for invoices
- `discussionRepository.ts`: Agreement workflow discussions
- `invoiceShareRepository.ts`: Public invoice sharing
- `receivedInvoicesRepository.ts`: Inbox for received invoices
- `expenseRepository.ts`: Expense-specific queries

**Delivery** (`delivery.ts`):
- Native invoice delivery to verified counterparties in KsiegaI network
- Email fallback for non-network recipients

---

### 4.2 Accounting Module (`src/modules/accounting`)

**Screens** (13 items):
- `Accounting`: Main accounting dashboard (premium)
- `AccountingShell`: Wrapper with sidebar for accounting sub-routes
- `BalanceSheet`: Balance sheet view with bilans snapshots
- `Shareholders`: Shareholder equity tracking
- `EquityModule`: Equity events and capital changes
- `CompanyRegistry`: KRS, NIP, VAT registration data
- `CapitalEvents`: Capital contributions, withdrawals, dividends
- `CITDashboard`: Corporate income tax (CIT) dashboard
- `Kasa`: Cash register (KP/KW) transactions
- `TransactionalContracts`: Contracts with financial impact
- `EventLog`: Audit log viewer
- `LedgerPage`: Financial ledger timeline
- `Analytics`: Financial analytics and charts

**Components** (26 items):
- `FinancialLedger`: Full ledger view with filters
- `LedgerEventRow`: Single ledger event row (5-layer structure)
- `MiniLedger`: Embedded ledger for document pages
- Bilans components, equity components, CIT components

**Data** (14 items):
- `eventsRepository.ts`: Event CRUD and stats
- `treasuryRepository.ts`: Payment accounts, movements, document payments
- `ledgerQueries.ts`: Ledger aggregation queries
- Bilans, equity, CIT repositories

**Types** (4 items):
- `audit-events.ts`: Event type taxonomy
- `ledger.ts`: Ledger event interface
- `audit.ts`: Audit log types
- `treasury.ts`: Treasury types

---

### 4.3 Decisions Module (`src/modules/decisions`)

**Screens** (6 items):
- `DecisionsHub`: List of all decisions
- `DecisionNew`: Create decision form
- `DecisionEdit`: Update decision
- `DecisionDetails`: View decision with linked documents

**Components** (5 items):
- `DecisionPicker`: Select decision for invoice/expense
- Decision cards, badges, enforcement indicators

**Data** (2 items):
- `decisionsRepository.ts`: CRUD operations
- Decision enforcement logic

---

### 4.4 Other Modules

**Authorization** (`src/modules/authorization`):
- Authority matrix, enforcement rules, authorization checks
- Implements decision-based access control for spółki

**Banking** (`src/modules/banking`):
- Bank accounts, transactions, reconciliation
- Integration with payment accounts system

**Contracts** (`src/modules/contracts`):
- Contract CRUD, signing workflow, milestone tracking
- Links to invoices and decisions

**Customers** (`src/modules/customers`):
- Customer/supplier CRUD
- Contact management, tax ID validation

**Documents** (`src/modules/documents`):
- Generic document management (not invoices)
- File uploads, attachments

**Employees** (`src/modules/employees`):
- Employee CRUD, labour hours tracking
- Payroll integration (future)

**Inbox** (`src/modules/inbox`):
- Unified inbox for events requiring action
- Discussion threads, received invoices
- Filters by `posted=false AND needs_action=true`

**Onboarding** (`src/modules/onboarding`):
- Welcome wizard for new users
- Business profile creation flow

**Premium** (`src/modules/premium`):
- Premium plan selection, Stripe checkout
- Feature comparison, pricing

**Products** (`src/modules/products`):
- Product/service catalog
- Pricing, VAT rates, categories

**Settings** (`src/modules/settings`):
- Profile settings, business profiles, team management
- Document generation settings, ERP integrations
- Shared links management

**Spółka** (`src/modules/spolka`):
- Company registry (KRS, NIP, VAT)
- Capital events, resolutions, CIT dashboard
- Spółka-specific compliance features

---

## 5. Marketing Frontend (ksiegai-next)

**Framework**: Next.js 14.2.16 with App Router

**Structure**:
- `app/layout.tsx`: Root layout with SEO metadata, dark theme, Header/Footer
- `app/page.tsx`: Landing page with hero, ICP segmentation, onboarding steps, FAQ
- `app/auth/login/page.tsx`: Redirects to `/logowanie` with `returnTo` param
- `app/cennik/`, `app/dla-ksiegowych/`, `app/jak-to-dziala/`: Marketing pages
- `app/polityka-prywatnosci/`, `app/regulamin/`, `app/rodo/`: Legal pages
- `app/premium/`: Premium plan details

**SEO**:
- Structured data (JSON-LD) for `SoftwareApplication`
- OpenGraph and Twitter cards
- Canonical URLs, robots.txt, sitemap

**Integration**:
- Auth routes bounce to marketing site with `returnTo` for post-login redirect
- Shared Supabase backend for user sessions

---

## 6. Current State vs. Desired Dual-State Architecture

### 6.1 Missing Schema Columns

**Invoices table lacks**:
- `economic_state` (enum): DRAFT | ISSUED | DUE | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED
- `accounting_state` (enum): UNAPPROVED | APPROVED | POSTED | REVERSED
- `paid_amount` (numeric): Sum of payments
- `issued_at` (timestamptz): When invoice was legally issued
- `approved_at`, `approved_by` (timestamptz, uuid): Accounting approval
- `posted_at`, `posted_by`, `posting_ref` (timestamptz, uuid, text): Ledger posting

**Current workarounds**:
- Single `status` field mixes economic and accounting states
- `is_paid` boolean doesn't track partial payments
- `lifecycle_status` and `booked_to_ledger` are partial implementations

---

### 6.2 Event System Gaps

**Current**:
- `events` table exists with dual timestamps and status progression
- `company_events` table is legacy audit log
- Event logging is opportunistic (not enforced)

**Missing**:
- Canonical event types for state transitions (`INVOICE_APPROVED`, `INVOICE_POSTED`, `PAYMENT_RECORDED`)
- Automatic state recalculation after event insertion
- Enforcement rule: "Every state transition must correspond to an audit event"

---

### 6.3 Payments Table

**Current**:
- `invoice_payments` (Stripe-focused)
- `document_payments` (generic, links to `account_movements`)

**Missing**:
- Unified payments table with `invoice_id`, `amount`, `paid_at`, `method`, `reference`
- Automatic `paid_amount` update on invoice after payment insertion

---

### 6.4 UI State Derivation

**Current**:
- Components like `FinancialControlStrip` use ad-hoc status strings
- No dual-badge UI ("Zapłacona, niezaksięgowana")

**Needed**:
- Derive labels from `economic_state` + `accounting_state`
- Examples:
  - "Do zapłaty" = `economic_state IN (DUE, OVERDUE)` regardless of `accounting_state`
  - "Zapłacona, niezaksięgowana" = `economic_state = PAID` AND `accounting_state != POSTED`
  - "Zaksięgowana, nieopłacona" = `accounting_state = POSTED` AND `economic_state = DUE`
  - "Wymaga zatwierdzenia" = `accounting_state = UNAPPROVED`

---

## 7. Documentation Alignment

**Documented Architecture** (from `docs/`):
- Event-first system with unified `events` table as single source of truth
- Ledger as primary financial reality, invoices/expenses as filtered views
- Decision system enforcing authority gates
- Dual temporal tracking (`occurred_at` vs `recorded_at`)
- Status progression: captured → classified → approved → posted → settled

**Current Implementation**:
- Partially implemented: `events` table exists, decision system exists
- Not enforced: State transitions via events, automatic posting logic
- UI not aligned: Still uses legacy status flags

---

## 8. Next Steps (Dual-State Rollout)

### Phase 1: Schema Extension
1. Add `economic_state`, `accounting_state` enums to `invoices`
2. Add `paid_amount`, `issued_at`, `approved_at/by`, `posted_at/by` columns
3. Create or normalize `payments` table

### Phase 2: Event Enforcement
1. Define canonical event types (`INVOICE_APPROVED`, `INVOICE_POSTED`, `PAYMENT_RECORDED`)
2. Implement triggers or service functions to update state snapshots after event insertion
3. Enforce rule: "No state change without event"

### Phase 3: UI Refactor
1. Update components to derive labels from dual states
2. Replace `FinancialControlStrip` status logic with dual-badge system
3. Add sticky audit panel showing economic + accounting state

### Phase 4: Migration
1. Backfill existing invoices with computed states
2. Migrate `company_events` to unified `events` table
3. Deprecate legacy status columns

---

## 9. Key Files Reference

### Core Application
- `src/main.tsx`: Entry point
- `src/App.tsx`: Provider composition
- `src/shared/config/routes.tsx`: Centralized routing
- `src/pages/routing/RouteRenderer.tsx`: Route rendering
- `src/pages/routing/AppGate.tsx`: Auth/premium guards
- `src/components/layout/Layout.tsx`: Persistent layout

### Authentication & State
- `src/shared/context/AuthContext.tsx`: Auth provider
- `src/shared/context/BusinessProfileContext.tsx`: Profile selection
- `src/shared/context/WorkspaceTabsContext.tsx`: Workspace tabs

### Invoices
- `src/modules/invoices/screens/invoices/NewInvoice.tsx`: Invoice form
- `src/modules/invoices/components/FinancialControlStrip.tsx`: Status UI
- `src/modules/invoices/data/invoiceRepository.ts`: CRUD

### Accounting
- `src/modules/accounting/screens/LedgerPage.tsx`: Ledger view
- `src/modules/accounting/components/FinancialLedger.tsx`: Ledger component
- `src/modules/accounting/data/eventsRepository.ts`: Event CRUD
- `src/modules/accounting/ledger/types/audit-events.ts`: Event types

### Decisions
- `src/modules/decisions/screens/DecisionsHub.tsx`: Decision list
- `src/modules/decisions/data/decisionsRepository.ts`: Decision CRUD

### Treasury
- `src/shared/lib/treasury-service.ts`: Payment service
- `src/modules/accounting/data/treasuryRepository.ts`: Treasury repo

### Documentation
- `docs/EVENT_SYSTEM_ARCHITECTURE.md`: Unified event model
- `docs/FINANCIAL_LEDGER_IMPLEMENTATION.md`: Ledger design
- `docs/LEDGER_AS_TRUTH_LAYER.md`: Architectural principles

---

## 10. Database Summary

**Project**: Fakturing (rncrzxjyffxmfbnxlqtm)  
**Region**: eu-north-1  
**PostgreSQL**: 15.8.1  
**Status**: ACTIVE_HEALTHY

**Key Tables**:
- `business_profiles` (17 rows, RLS enabled)
- `invoices` (RLS enabled, 50+ columns)
- `invoice_items` (RLS enabled)
- `invoice_payments` (RLS enabled)
- `events` (RLS enabled, unified event system)
- `company_events` (legacy audit log)
- `decisions` (RLS enabled)
- `payment_accounts`, `account_movements`, `document_payments` (treasury)
- `customers`, `products`, `contracts` (master data)
- `bilans_snapshots`, `bilans_row_metadata` (balance sheet)

**Total Tables**: 100+ (including auth, storage, realtime schemas)

---

## Conclusion

KsiegaI is a sophisticated accounting platform with strong architectural foundations (event-driven ledger, decision-based authorization, multi-entity support). The current implementation has most building blocks in place but lacks enforcement of the documented dual-state machine and event-first principles. The next phase should focus on schema extension, event enforcement, and UI alignment to realize the full vision of a deterministic, auditable accounting system.
