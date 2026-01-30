# Multi-Line Journal Entries & Accounting Workbench Implementation

## Overview
This document outlines the implementation of multi-line journal entries, accounting workbench, and contracts/documents bridge for the Universal Spółka Accounting system.

## Phase 1: Database Schema - Multi-Line Journal Entries

### New Tables

#### `journal_entries`
```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  event_id UUID NOT NULL REFERENCES events(id),
  period_id UUID REFERENCES accounting_periods(id),
  
  status TEXT NOT NULL CHECK (status IN ('draft', 'posted', 'voided')),
  posting_rule_id UUID REFERENCES posting_rules(id),
  rule_match_explain JSONB,
  
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  description TEXT,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  void_reason TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT balanced_entry CHECK (
    (status = 'draft') OR 
    (status IN ('posted', 'voided') AND total_debit = total_credit)
  )
);
```

#### `journal_entry_lines`
```sql
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  line_number INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('debit', 'credit')),
  
  account_id UUID REFERENCES chart_of_accounts(id),
  account_code TEXT,
  account_name TEXT,
  
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  description TEXT,
  analytic_tags JSONB,
  meta JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(journal_entry_id, line_number)
);
```

### Bridge Tables

#### `contract_accounting_links`
```sql
CREATE TABLE contract_accounting_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  event_id UUID NOT NULL REFERENCES events(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  link_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `document_accounting_links`
```sql
CREATE TABLE document_accounting_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_document_id UUID NOT NULL REFERENCES generated_documents(id),
  event_id UUID NOT NULL REFERENCES events(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  link_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Capital Events

#### `capital_events`
```sql
CREATE TABLE capital_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  event_type TEXT NOT NULL CHECK (event_type IN ('contribution', 'repayment', 'conversion')),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  shareholder_id UUID REFERENCES shareholders(id),
  counterparty_name TEXT,
  
  payment_method TEXT CHECK (payment_method IN ('bank', 'cash', 'in_kind')),
  payment_account_id UUID REFERENCES bank_accounts(id),
  
  event_date DATE NOT NULL,
  description TEXT,
  
  event_id UUID REFERENCES events(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Phase 2: Posting Rules Extension

### Extended `posting_rule_lines` Schema
```typescript
interface PostingRuleLine {
  id: string;
  posting_rule_id: string;
  line_number: number;
  side: 'debit' | 'credit';
  
  // Account selection
  account_selector_type: 'fixed' | 'dynamic' | 'conditional';
  fixed_account_id?: string;
  dynamic_selector?: {
    type: 'payment_account' | 'counterparty_account' | 'category_account';
    fallback_account_id?: string;
  };
  
  // Amount calculation
  amount_selector: {
    type: 'gross' | 'net' | 'vat' | 'percentage' | 'fixed';
    percentage?: number;
    fixed_amount?: number;
    source_field?: string; // e.g., 'payload_snapshot.total_gross_value'
  };
  
  description_template?: string;
  priority: number;
}
```

## Phase 3: Accounting Workbench UI

### Queue View Structure
```typescript
interface AccountingQueueItem {
  id: string;
  entity_type: 'invoice' | 'expense' | 'contract' | 'document' | 'capital_event';
  entity_id: string;
  reference: string; // invoice number, contract title, etc.
  
  event_id: string;
  event_date: Date;
  target_period: { year: number; month: number };
  
  amount: number;
  currency: string;
  
  posting_status: 'ready_auto' | 'needs_review' | 'posted' | 'blocked';
  posting_preview?: JournalEntryPreview;
  
  matched_rule?: {
    rule_id: string;
    rule_name: string;
    match_explanation: string;
  };
  
  period_status: 'open' | 'closed';
}

interface JournalEntryPreview {
  lines: {
    side: 'debit' | 'credit';
    account_code: string;
    account_name: string;
    amount: number;
  }[];
  is_balanced: boolean;
  total_debit: number;
  total_credit: number;
}
```

### Workbench Actions
1. **Auto-księguj** - Auto-post single item
2. **Auto-księguj wszystkie** - Batch auto-post all ready items
3. **Edytuj księgowanie** - Open multi-line editor
4. **Zobacz ślad audytu** - Link to event viewer

## Phase 4: Contracts/Documents Bridge

### Financial Impact Flow
```typescript
// When document is created/finalized
async function handleDocumentFinancial Impact(document: GeneratedDocument) {
  const blueprint = await getDocumentBlueprint(document.blueprint_id);
  
  if (!blueprint.financial_impact?.has_impact) {
    return; // No accounting impact
  }
  
  if (blueprint.financial_impact.requires_amount && !document.amount) {
    throw new Error('Amount required for financial impact');
  }
  
  // Create immutable event
  const event = await createEvent({
    entity_type: 'generated_document',
    entity_id: document.id,
    event_type: 'document_financial_impact',
    business_profile_id: document.business_profile_id,
    payload_snapshot: {
      amount: document.amount,
      currency: document.currency || 'PLN',
      direction: blueprint.financial_impact.direction,
      document_type: blueprint.name,
      counterparty: document.counterparty_info,
    }
  });
  
  // Create accounting link
  await createDocumentAccountingLink({
    generated_document_id: document.id,
    event_id: event.id,
    link_type: 'financial_impact'
  });
  
  // Attempt auto-post if configured
  if (blueprint.financial_impact.auto_create_accounting_entry) {
    try {
      await autoPostEvent(event.id);
    } catch (error) {
      // Mark as needs_review in workbench
      console.warn('Auto-post failed, needs manual review:', error);
    }
  }
}
```

## Phase 5: Implementation Checklist

### Database
- [ ] Create migration for `journal_entries` table
- [ ] Create migration for `journal_entry_lines` table
- [ ] Create migration for `capital_events` table
- [ ] Create migration for bridge tables
- [ ] Add RLS policies for all new tables
- [ ] Create indexes for performance

### Backend/Repository
- [ ] Extend `posting_rule_lines` to support multi-line generation
- [ ] Create `journalEntryRepository.ts` with CRUD operations
- [ ] Create `capitalEventsRepository.ts`
- [ ] Update `postingRulesRepository.ts` for multi-line support
- [ ] Create accounting workbench query functions
- [ ] Implement document/contract financial impact handlers

### UI Components
- [ ] Create `AccountingWorkbench.tsx` main view
- [ ] Create `PostingQueueTable.tsx` component
- [ ] Create `MultiLineJournalEditor.tsx` component
- [ ] Create `CapitalEventsForm.tsx` component
- [ ] Update sidebar to conditionally show VAT for zwolniony entities
- [ ] Add profit-loss, vat-ledger, ledger routes

### Integration
- [ ] Hook document blueprint finalization to emit events
- [ ] Hook contract activation to emit events
- [ ] Update invoice posting to use new journal entry system
- [ ] Maintain backward compatibility with existing 2-line entries

### Testing
- [ ] Test multi-line journal entry creation
- [ ] Test balanced entry validation
- [ ] Test period lock enforcement
- [ ] Test void and repost workflow
- [ ] Test document financial impact flow
- [ ] Test capital events posting

## Migration Strategy

1. **Phase 1**: Create new tables without breaking existing system
2. **Phase 2**: Dual-write mode - write to both old and new structures
3. **Phase 3**: Migrate existing journal entries to new format
4. **Phase 4**: Switch reads to new structure
5. **Phase 5**: Deprecate old structure

## Backward Compatibility

- Existing 2-line invoice posting continues to work
- Old journal entries remain queryable
- New UI provides "simple mode" for quick 2-line entries
- Posting rules can generate either 2-line or multi-line entries
