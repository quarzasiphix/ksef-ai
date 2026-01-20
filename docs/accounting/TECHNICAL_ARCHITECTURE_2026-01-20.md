# Accounting System - Technical Architecture
**Date:** January 20, 2026  
**Version:** 2.0  
**Status:** Production

---

## 1. System Overview

### 1.1 Technology Stack

```
Frontend:
├── React 18 with TypeScript
├── TanStack Query (React Query) for data fetching
├── Supabase Client for database access
├── Tailwind CSS + shadcn/ui for styling
├── date-fns for date manipulation
└── Sonner for toast notifications

Backend:
├── Supabase (PostgreSQL 15)
├── PL/pgSQL for database functions
├── Row Level Security (RLS) for access control
└── Real-time subscriptions

State Management:
├── React Query for server state
├── React Context for global state (BusinessProfile)
├── Local component state with useState
└── Sync Manager (useGlobalData) for cached data
```

### 1.2 Module Structure

```
src/modules/accounting/
├── components/           # Reusable UI components
│   ├── AutoPostingButton.tsx
│   ├── RyczaltAccountAssignmentModal.tsx
│   ├── UnpostedQueueWidget.tsx
│   └── ... (38 total)
│
├── screens/             # Full page components
│   ├── RyczaltAccounts.tsx
│   ├── SpzooAccounting.tsx
│   ├── RyczaltCategories.tsx
│   └── ... (23 total)
│
├── data/                # Data access layer
│   ├── postingRulesRepository.ts
│   ├── ryczaltRepository.ts
│   ├── journalRepository.ts
│   └── ... (20 total)
│
├── hooks/               # Custom React hooks
│   ├── useAccountingPeriod.ts
│   └── usePostingRules.ts
│
├── types/               # TypeScript type definitions
│   ├── accounting.ts
│   ├── ryczalt.ts
│   └── ... (4 total)
│
└── utils/               # Utility functions
    └── calculations.ts
```

---

## 2. Database Schema

### 2.1 Core Tables

#### **invoices**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  business_profile_id UUID REFERENCES business_profiles,
  customer_id UUID REFERENCES customers,
  
  -- Invoice details
  number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  sell_date DATE NOT NULL,
  due_date DATE,
  payment_date DATE,
  
  -- Amounts
  total_net_value DECIMAL(15,2),
  total_vat_value DECIMAL(15,2),
  total_gross_value DECIMAL(15,2),
  currency TEXT DEFAULT 'PLN',
  exchange_rate DECIMAL(10,4),
  
  -- Transaction info
  transaction_type TEXT CHECK (transaction_type IN ('income', 'expense')),
  
  -- Accounting fields
  accounting_status TEXT DEFAULT 'unposted' 
    CHECK (accounting_status IN ('unposted', 'posted', 'error')),
  acceptance_status TEXT DEFAULT 'pending'
    CHECK (acceptance_status IN ('pending', 'accepted', 'auto_accepted', 'rejected')),
  
  ryczalt_account_id UUID REFERENCES ryczalt_accounts,
  
  accounting_locked_at TIMESTAMPTZ,
  accounting_locked_by UUID,
  accounting_error_reason TEXT,
  
  posted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_invoices_business_profile ON invoices(business_profile_id);
CREATE INDEX idx_invoices_accounting_status ON invoices(accounting_status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_ryczalt_account ON invoices(ryczalt_account_id);
```

#### **ryczalt_accounts**
```sql
CREATE TABLE ryczalt_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID REFERENCES business_profiles NOT NULL,
  ryczalt_category_id UUID REFERENCES ryczalt_categories NOT NULL,
  
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  description TEXT,
  
  -- Balances
  current_balance DECIMAL(15,2) DEFAULT 0,
  period_balance DECIMAL(15,2) DEFAULT 0,
  year_balance DECIMAL(15,2) DEFAULT 0,
  
  -- PKD codes for automatic categorization
  pkd_codes TEXT[],
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  UNIQUE(business_profile_id, account_number)
);

CREATE INDEX idx_ryczalt_accounts_business ON ryczalt_accounts(business_profile_id);
CREATE INDEX idx_ryczalt_accounts_category ON ryczalt_accounts(ryczalt_category_id);
```

#### **jdg_revenue_register_lines**
```sql
CREATE TABLE jdg_revenue_register_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID REFERENCES business_profiles NOT NULL,
  invoice_id UUID REFERENCES invoices,
  
  -- Period tracking
  occurred_at DATE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  
  -- Amounts (in PLN)
  tax_base_amount DECIMAL(15,2) NOT NULL,
  ryczalt_tax_amount DECIMAL(15,2) NOT NULL,
  
  -- Document reference
  document_number TEXT NOT NULL,
  counterparty_name TEXT,
  
  -- Category snapshot (for historical accuracy)
  category_id UUID REFERENCES ryczalt_categories,
  category_name TEXT,
  
  -- Account snapshot
  ryczalt_account_id UUID REFERENCES ryczalt_accounts,
  ryczalt_account_name TEXT,
  ryczalt_account_number TEXT,
  ryczalt_rate DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate posting
  UNIQUE(invoice_id)
);

CREATE INDEX idx_jdg_register_business ON jdg_revenue_register_lines(business_profile_id);
CREATE INDEX idx_jdg_register_period ON jdg_revenue_register_lines(period_year, period_month);
CREATE INDEX idx_jdg_register_account ON jdg_revenue_register_lines(ryczalt_account_id);
```

#### **accounting_periods**
```sql
CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID REFERENCES business_profiles NOT NULL,
  
  -- Period identification
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  fiscal_year INTEGER NOT NULL,
  
  -- Period boundaries
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'open' 
    CHECK (status IN ('open', 'closed', 'locked')),
  is_locked BOOLEAN DEFAULT FALSE,
  
  -- Financial summary
  total_revenue DECIMAL(15,2),
  total_expenses DECIMAL(15,2),
  net_profit_loss DECIMAL(15,2),
  
  -- Tax calculations
  cit_liability DECIMAL(15,2),
  cit_rate DECIMAL(5,2),
  
  -- Closing info
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  
  -- Allow monthly periods per business
  UNIQUE(business_profile_id, period_year, period_month)
);

CREATE INDEX idx_accounting_periods_business ON accounting_periods(business_profile_id);
CREATE INDEX idx_accounting_periods_year_month ON accounting_periods(period_year, period_month);
```

### 2.2 Database Functions

#### **auto_post_pending_invoices**
```sql
CREATE OR REPLACE FUNCTION auto_post_pending_invoices(
  p_business_profile_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_result JSONB;
  v_posted_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Process unposted, accepted invoices within date range
  FOR v_invoice IN
    SELECT id, number, transaction_type
    FROM invoices
    WHERE business_profile_id = p_business_profile_id
      AND accounting_status = 'unposted'
      AND (acceptance_status IN ('accepted', 'auto_accepted'))
      AND (p_start_date IS NULL OR issue_date >= p_start_date)
      AND (p_end_date IS NULL OR issue_date <= p_end_date)
    ORDER BY issue_date ASC
    LIMIT p_limit
  LOOP
    -- Try to post
    SELECT auto_post_invoice_unified(v_invoice.id) INTO v_result;
    
    IF (v_result->>'success')::BOOLEAN THEN
      v_posted_count := v_posted_count + 1;
    ELSE
      v_failed_count := v_failed_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.number,
        'error', v_result->>'error'
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'posted_count', v_posted_count,
    'failed_count', v_failed_count,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### **auto_post_invoice_unified**
```sql
CREATE OR REPLACE FUNCTION auto_post_invoice_unified(
  p_invoice_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_profile RECORD;
  v_result JSONB;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF v_invoice.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invoice not found');
  END IF;
  
  -- Get profile
  SELECT * INTO v_profile FROM business_profiles WHERE id = v_invoice.business_profile_id;
  
  -- Route based on entity type
  IF v_profile.entity_type = 'dzialalnosc' THEN
    -- JDG: Check tax type
    IF v_profile.tax_type = 'ryczalt' THEN
      -- Post to register
      SELECT post_to_jdg_register(p_invoice_id) INTO v_result;
      RETURN v_result;
    ELSE
      -- For skala/liniowy: simplified posting
      UPDATE invoices SET accounting_status = 'posted', posted_at = NOW() WHERE id = p_invoice_id;
      RETURN jsonb_build_object('success', TRUE, 'method', 'jdg_simplified');
    END IF;
  ELSE
    -- Spółka: Simplified posting (placeholder)
    UPDATE invoices SET accounting_status = 'posted', posted_at = NOW() WHERE id = p_invoice_id;
    RETURN jsonb_build_object('success', TRUE, 'method', 'spolka_simplified');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### **post_to_jdg_register**
```sql
CREATE OR REPLACE FUNCTION post_to_jdg_register(
  p_invoice_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_profile RECORD;
  v_customer RECORD;
  v_account RECORD;
  v_register_line_id UUID;
  v_amount_pln NUMERIC;
  v_period_year INTEGER;
  v_period_month INTEGER;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVOICE_NOT_FOUND');
  END IF;

  -- Check if already posted
  IF EXISTS (SELECT 1 FROM jdg_revenue_register_lines WHERE invoice_id = p_invoice_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_POSTED');
  END IF;

  -- Get business profile
  SELECT * INTO v_profile FROM business_profiles WHERE id = v_invoice.business_profile_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND');
  END IF;

  -- Get customer
  SELECT * INTO v_customer FROM customers WHERE id = v_invoice.customer_id;

  -- Calculate period
  v_period_year := EXTRACT(YEAR FROM v_invoice.sell_date);
  v_period_month := EXTRACT(MONTH FROM v_invoice.sell_date);

  -- Ensure accounting period exists
  PERFORM ensure_accounting_period_exists(v_invoice.business_profile_id, v_invoice.sell_date);

  -- Convert amount to PLN
  v_amount_pln := v_invoice.total_gross_value * COALESCE(v_invoice.exchange_rate, 1);

  -- Require ryczałt account for ryczałt businesses
  IF v_profile.tax_type = 'ryczalt' AND v_invoice.transaction_type = 'income' THEN
    IF v_invoice.ryczalt_account_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'MISSING_ACCOUNT',
        'message', 'W ryczałcie musisz wybrać konto ryczałtowe');
    END IF;

    -- Get account details
    SELECT * INTO v_account FROM ryczalt_accounts_view WHERE id = v_invoice.ryczalt_account_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACCOUNT');
    END IF;
  END IF;

  -- Create register line
  INSERT INTO jdg_revenue_register_lines (
    business_profile_id, invoice_id, occurred_at,
    period_year, period_month,
    tax_base_amount, ryczalt_tax_amount,
    document_number, counterparty_name,
    category_id, category_name,
    ryczalt_account_id, ryczalt_account_name, ryczalt_account_number,
    ryczalt_rate, created_at
  ) VALUES (
    v_invoice.business_profile_id, v_invoice.id, v_invoice.sell_date,
    v_period_year, v_period_month,
    v_amount_pln, (v_amount_pln * v_account.category_rate / 100),
    v_invoice.number, COALESCE(v_customer.name, 'Nieznany klient'),
    v_account.ryczalt_category_id, v_account.category_name,
    v_account.id, v_account.account_name, v_account.account_number,
    v_account.category_rate, NOW()
  ) RETURNING id INTO v_register_line_id;

  -- Update invoice status
  UPDATE invoices
  SET accounting_status = 'posted',
      accounting_locked_at = NOW(),
      accounting_locked_by = auth.uid(),
      posted_at = NOW()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'register_line_id', v_register_line_id,
    'period_year', v_period_year,
    'period_month', v_period_month
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'RPC_ERROR', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Component Architecture

### 3.1 Component Hierarchy

```
App
└── AccountingModule
    ├── Dashboard
    │   ├── UnpostedQueueWidget
    │   │   └── AutoPostingButton (batch mode)
    │   ├── PeriodSummaryCards
    │   └── TaxObligationsTimeline
    │
    ├── RyczaltAccounts
    │   ├── AccountCard[]
    │   │   ├── AccountSummary
    │   │   ├── InvoiceList
    │   │   └── AccountActions
    │   └── AddAccountForm
    │
    ├── InvoiceDetail
    │   ├── InvoiceHeader
    │   ├── InvoiceItems
    │   ├── AccountingStatus
    │   └── AutoPostingButton (single mode)
    │
    └── Modals
        ├── RyczaltAccountAssignmentModal
        ├── ManualPostingModal (future)
        └── PeriodClosingModal (future)
```

### 3.2 Data Flow

```
User Action (Click "Auto-księguj")
    ↓
AutoPostingButton.handleBatchPost()
    ↓
autoPostPendingInvoices(profileId, limit, startDate, endDate)
    ↓
Supabase RPC: auto_post_pending_invoices()
    ↓
Database: Filter & process invoices
    ↓
For each invoice: auto_post_invoice_unified()
    ↓
Route by entity_type & tax_type
    ↓
post_to_jdg_register() or simplified posting
    ↓
Return result: { success, posted_count, failed_count, errors }
    ↓
Check for MISSING_ACCOUNT errors
    ↓
If errors: Open RyczaltAccountAssignmentModal
    ↓
User assigns accounts
    ↓
Save assignments to database
    ↓
Invalidate React Query cache
    ↓
Auto-retry posting
    ↓
Success: Show toast notification
    ↓
UI updates with new data
```

### 3.3 State Management

#### **Server State (React Query)**
```typescript
// Invoices
useQuery(['invoices', userId, profileId, period])

// Ryczalt Accounts
useQuery(['ryczalt-accounts', profileId])

// JDG Register
useQuery(['jdg-revenue-register', profileId, year, month])

// Accounting Periods
useQuery(['accounting-periods', profileId])
```

#### **Global State (Context)**
```typescript
// Business Profile Context
const { 
  profiles,           // All user's business profiles
  selectedProfileId,  // Currently selected profile
  selectedProfile     // Full profile object
} = useBusinessProfile();
```

#### **Cached State (Sync Manager)**
```typescript
// Global data hook with caching
const { 
  invoices,          // { data, isLoading, error }
  businessProfiles,  // { data, isLoading, error }
  customers,         // { data, isLoading, error }
  products,          // { data, isLoading, error }
  expenses           // { data, isLoading, error }
} = useGlobalData();
```

#### **Local Component State**
```typescript
// Modal state
const [showAssignmentModal, setShowAssignmentModal] = useState(false);
const [missingAccountInvoiceIds, setMissingAccountInvoiceIds] = useState<string[]>([]);

// Form state
const [formData, setFormData] = useState({ ... });

// Loading state
const [isPosting, setIsPosting] = useState(false);
```

---

## 4. API Layer

### 4.1 Repository Pattern

```typescript
// postingRulesRepository.ts
export async function autoPostPendingInvoices(
  businessProfileId: string,
  limit: number = 100,
  startDate?: Date,
  endDate?: Date
): Promise<PostingResult> {
  const { data, error } = await supabase.rpc('auto_post_pending_invoices', {
    p_business_profile_id: businessProfileId,
    p_limit: limit,
    p_start_date: startDate?.toISOString().split('T')[0],
    p_end_date: endDate?.toISOString().split('T')[0]
  });

  if (error) throw error;
  return data;
}

// ryczaltRepository.ts
export async function listRyczaltAccounts(
  businessProfileId: string
): Promise<RyczaltAccount[]> {
  const { data, error } = await supabase
    .from('ryczalt_accounts')
    .select('*, ryczalt_categories(*)')
    .eq('business_profile_id', businessProfileId)
    .eq('is_active', true)
    .order('account_number');

  if (error) throw error;
  return data || [];
}
```

### 4.2 Type Definitions

```typescript
// types/accounting.ts
export interface PostingResult {
  success: boolean;
  posted_count: number;
  failed_count: number;
  errors: PostingError[];
}

export interface PostingError {
  invoice_id: string;
  invoice_number: string;
  error: 'MISSING_ACCOUNT' | 'RPC_ERROR' | 'ALREADY_POSTED' | 'INVALID_ACCOUNT';
  message?: string;
}

export interface RyczaltAccount {
  id: string;
  business_profile_id: string;
  ryczalt_category_id: string;
  account_number: string;
  account_name: string;
  description: string;
  current_balance: number;
  period_balance: number;
  year_balance: number;
  category_rate: number;
  pkd_codes: string[];
  is_active: boolean;
}

export interface RegisterLine {
  id: string;
  business_profile_id: string;
  invoice_id: string;
  occurred_at: string;
  period_year: number;
  period_month: number;
  tax_base_amount: number;
  ryczalt_tax_amount: number;
  document_number: string;
  counterparty_name: string;
  ryczalt_account_id: string;
  ryczalt_account_name: string;
  ryczalt_rate: number;
}
```

---

## 5. Security & Access Control

### 5.1 Row Level Security (RLS)

```sql
-- Invoices: Users can only access their own invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (user_id = auth.uid());

-- Ryczalt Accounts: Users can only access accounts for their business profiles
CREATE POLICY "Users can view own ryczalt accounts"
  ON ryczalt_accounts FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- JDG Register: Users can only access their own register lines
CREATE POLICY "Users can view own register lines"
  ON jdg_revenue_register_lines FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );
```

### 5.2 Function Security

```sql
-- All accounting functions use SECURITY DEFINER
-- This allows them to bypass RLS when needed
-- But they validate user access internally

CREATE OR REPLACE FUNCTION auto_post_pending_invoices(...)
RETURNS JSONB AS $$
BEGIN
  -- Function validates that user owns the business profile
  -- before processing invoices
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission only to authenticated users
GRANT EXECUTE ON FUNCTION auto_post_pending_invoices TO authenticated;
```

---

## 6. Performance Considerations

### 6.1 Database Optimization

**Indexes:**
```sql
-- Critical indexes for query performance
CREATE INDEX idx_invoices_business_profile ON invoices(business_profile_id);
CREATE INDEX idx_invoices_accounting_status ON invoices(accounting_status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_ryczalt_account ON invoices(ryczalt_account_id);

-- Composite indexes for common queries
CREATE INDEX idx_invoices_profile_status_date 
  ON invoices(business_profile_id, accounting_status, issue_date);
```

**Query Optimization:**
```sql
-- Use specific columns instead of SELECT *
SELECT id, number, issue_date, total_gross_value
FROM invoices
WHERE business_profile_id = $1
  AND accounting_status = 'unposted'
  AND issue_date >= $2
  AND issue_date <= $3
ORDER BY issue_date ASC
LIMIT 100;
```

### 6.2 Frontend Optimization

**React Query Caching:**
```typescript
// Cache invoices for 5 minutes
useQuery(['invoices', profileId], fetchInvoices, {
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000
});

// Prefetch related data
queryClient.prefetchQuery(['ryczalt-accounts', profileId]);
```

**Component Optimization:**
```typescript
// Memoize expensive calculations
const taxAmount = useMemo(() => 
  calculateTax(amount, rate), 
  [amount, rate]
);

// Memoize components
const AccountCard = React.memo(({ account }) => {
  // ...
});
```

---

## 7. Error Handling

### 7.1 Error Types

```typescript
// Custom error classes
class AccountingError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

class ValidationError extends AccountingError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, details);
  }
}

class DatabaseError extends AccountingError {
  constructor(message: string, details?: any) {
    super('DATABASE_ERROR', message, details);
  }
}
```

### 7.2 Error Handling Pattern

```typescript
try {
  const result = await autoPostPendingInvoices(profileId, 100, startDate, endDate);
  
  if (result.success) {
    // Check for specific errors
    const missingAccountErrors = result.errors?.filter(
      err => err.error === 'MISSING_ACCOUNT'
    );
    
    if (missingAccountErrors.length > 0) {
      // Handle missing accounts
      handleMissingAccounts(missingAccountErrors);
    } else {
      // Success
      showSuccessToast(result.posted_count);
    }
  }
} catch (error) {
  if (error instanceof ValidationError) {
    showValidationError(error.message);
  } else if (error instanceof DatabaseError) {
    showDatabaseError(error.message);
  } else {
    showGenericError();
  }
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// Test business logic
describe('calculateTax', () => {
  it('should calculate ryczalt tax correctly', () => {
    expect(calculateTax(1000, 8.5)).toBe(85);
  });
  
  it('should handle zero amounts', () => {
    expect(calculateTax(0, 8.5)).toBe(0);
  });
});

// Test data transformations
describe('transformInvoiceData', () => {
  it('should transform database invoice to UI format', () => {
    const dbInvoice = { ... };
    const uiInvoice = transformInvoiceData(dbInvoice);
    expect(uiInvoice).toMatchObject({ ... });
  });
});
```

### 8.2 Integration Tests

```typescript
// Test database functions
describe('auto_post_pending_invoices', () => {
  it('should post invoices within date range', async () => {
    const result = await supabase.rpc('auto_post_pending_invoices', {
      p_business_profile_id: testProfileId,
      p_start_date: '2025-08-01',
      p_end_date: '2025-08-31'
    });
    
    expect(result.data.success).toBe(true);
    expect(result.data.posted_count).toBeGreaterThan(0);
  });
});
```

### 8.3 E2E Tests

```typescript
// Test complete workflows
describe('Auto-posting workflow', () => {
  it('should post invoices with account assignment', async () => {
    // 1. Navigate to accounting dashboard
    await page.goto('/accounting');
    
    // 2. Click auto-post button
    await page.click('[data-testid="auto-post-button"]');
    
    // 3. Modal should open with invoices
    await page.waitForSelector('[data-testid="assignment-modal"]');
    
    // 4. Assign accounts
    await page.selectOption('[data-testid="account-select-0"]', accountId);
    
    // 5. Save and post
    await page.click('[data-testid="save-assignments"]');
    
    // 6. Verify success
    await page.waitForSelector('[data-testid="success-toast"]');
  });
});
```

---

## 9. Deployment & DevOps

### 9.1 Database Migrations

```sql
-- Migration file: 20260120_add_date_filtering_to_auto_post.sql
-- Description: Add date range parameters to auto_post_pending_invoices

-- Drop old function
DROP FUNCTION IF EXISTS auto_post_pending_invoices(UUID, INTEGER);

-- Create new function with date parameters
CREATE OR REPLACE FUNCTION auto_post_pending_invoices(
  p_business_profile_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
-- ... function body ...
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_post_pending_invoices TO authenticated;
```

### 9.2 Environment Configuration

```typescript
// config/accounting.ts
export const accountingConfig = {
  // Posting limits
  maxBatchSize: 100,
  defaultBatchSize: 50,
  
  // Period settings
  allowFuturePeriods: false,
  maxHistoricalMonths: 24,
  
  // Validation
  requireAccountAssignment: true,
  allowNegativeAmounts: false,
  
  // Features
  enableAutoPosting: true,
  enableManualPosting: true,
  enablePeriodClosing: false,
};
```

---

## 10. Future Architecture Considerations

### 10.1 Microservices Potential

```
Current: Monolithic
├── Frontend (React)
└── Backend (Supabase)

Future: Microservices
├── Frontend (React)
├── API Gateway
├── Accounting Service
│   ├── Posting Engine
│   ├── Period Management
│   └── Report Generation
├── Tax Service
│   ├── VAT Calculations
│   ├── CIT Calculations
│   └── JPK Generation
└── Integration Service
    ├── Bank Sync
    ├── KSeF Integration
    └── External APIs
```

### 10.2 Event-Driven Architecture

```typescript
// Event bus for accounting events
eventBus.on('invoice.posted', async (event) => {
  // Update balances
  await updateAccountBalances(event.accountId);
  
  // Recalculate period totals
  await recalculatePeriodTotals(event.periodId);
  
  // Send notifications
  await sendPostingNotification(event.userId);
});

eventBus.on('period.closed', async (event) => {
  // Generate reports
  await generatePeriodReports(event.periodId);
  
  // Calculate tax obligations
  await calculateTaxObligations(event.periodId);
  
  // Lock period
  await lockPeriod(event.periodId);
});
```

### 10.3 Caching Strategy

```
Level 1: Browser Cache (React Query)
├── 5 minute stale time
├── 10 minute cache time
└── Automatic invalidation

Level 2: CDN Cache (Future)
├── Static assets
├── Public reports
└── API responses (short TTL)

Level 3: Redis Cache (Future)
├── User sessions
├── Frequently accessed data
└── Computed aggregations
```

---

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Maintained By:** Development Team
