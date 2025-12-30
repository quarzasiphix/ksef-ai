# Financial Threads Implementation Guide

## Overview
Financial Threads is a contextual relationship system that transforms the app from isolated record-keeping into a connected decision-making tool. It shows related entities (expenses, bank transactions, contracts, customers) directly on detail pages without navigation.

## What Was Implemented

### 1. FinancialThreadsPanel Component
**Location**: `src/components/financial/FinancialThreadsPanel.tsx`

**Features**:
- Displays related entities grouped by type (expenses, bank, contracts, customers)
- Clickable chips that open entities as workspace tabs (no navigation away)
- Visual indicators: icons, colors, status badges
- Amount display for financial entities
- Empty state with helpful message
- Smooth animations with Framer Motion

**Entity Types Supported**:
- 💸 **Expenses** (red accent)
- 🏦 **Bank Transactions** (blue accent)
- 📄 **Contracts** (amber accent)
- 🏢 **Customers** (violet accent)

**Status Indicators**:
- 🟢 Completed/Rozliczone
- 🟡 Pending/Oczekujące
- 🔴 Overdue/Zaległe

### 2. Integration into Invoice Detail Page
**Location**: `src/modules/invoices/screens/invoices/InvoiceDetail.tsx`

**Layout Changes**:
- Restructured to two-column flex layout
- Main content: `flex-1 min-w-0` (left side)
- Financial Threads Panel: `w-80 flex-shrink-0` (right sidebar)
- Sticky positioning: `sticky top-20` (stays visible on scroll)
- Responsive: Hidden on screens smaller than `xl` breakpoint

**Data Flow**:
```typescript
const relatedEntities = [
  // Contracts (already queried)
  ...linkedContracts.map(contract => ({
    id: contract.id,
    type: 'contract',
    title: contract.number,
    subtitle: contract.title,
    status: 'completed',
  })),
  // TODO: Add expenses query
  // TODO: Add bank transactions query
];
```

## Next Steps to Complete Financial Threads

### Phase 1: Backend Data (High Priority)

#### 1. Add Relations Field to Invoices Table
```sql
ALTER TABLE invoices 
ADD COLUMN relations JSONB DEFAULT '[]'::jsonb;

-- Index for faster queries
CREATE INDEX idx_invoices_relations ON invoices USING gin(relations);
```

**Structure**:
```json
{
  "relations": [
    {
      "entityType": "expense",
      "entityId": "uuid",
      "relationshipType": "related_cost",
      "metadata": {
        "amount": 1000,
        "description": "Marketing expense for this sale"
      }
    },
    {
      "entityType": "bank_transaction",
      "entityId": "uuid",
      "relationshipType": "payment",
      "metadata": {
        "amount": 5000,
        "transactionDate": "2024-01-15"
      }
    }
  ]
}
```

#### 2. Create Repository Functions

**File**: `src/modules/invoices/data/invoiceRelationsRepository.ts`

```typescript
export async function getRelatedEntities(invoiceId: string) {
  // 1. Get invoice relations
  const { data: invoice } = await supabase
    .from('invoices')
    .select('relations')
    .eq('id', invoiceId)
    .single();

  if (!invoice?.relations) return [];

  // 2. Fetch actual entities based on relations
  const entities = await Promise.all(
    invoice.relations.map(async (rel: any) => {
      switch (rel.entityType) {
        case 'expense':
          return fetchExpenseDetails(rel.entityId);
        case 'bank_transaction':
          return fetchBankTransactionDetails(rel.entityId);
        case 'contract':
          return fetchContractDetails(rel.entityId);
        default:
          return null;
      }
    })
  );

  return entities.filter(Boolean);
}

export async function addRelation(
  invoiceId: string,
  entityType: string,
  entityId: string,
  metadata?: any
) {
  // Add relation to invoice.relations array
  // Use Supabase array append function
}

export async function removeRelation(
  invoiceId: string,
  entityId: string
) {
  // Remove relation from invoice.relations array
}
```

#### 3. Update Invoice Detail Query
```typescript
const { data: relatedEntities } = useQuery({
  queryKey: ["invoiceRelations", id],
  queryFn: () => getRelatedEntities(id),
  enabled: !!id,
});
```

### Phase 2: Manual Linking UI (Medium Priority)

#### 1. Add "Link Entity" Button
On invoice detail page, add button to manually create links:

```tsx
<Button 
  variant="outline" 
  size="sm"
  onClick={() => setShowLinkDialog(true)}
>
  <Link2 className="h-4 w-4 mr-2" />
  Powiąż dokument
</Button>
```

#### 2. Create LinkEntityDialog Component
**File**: `src/components/financial/LinkEntityDialog.tsx`

Features:
- Search/select expenses, bank transactions, contracts
- Add optional note/description
- Preview before linking
- Bulk linking support

### Phase 3: AI Suggestions (Future)

#### 1. Smart Relationship Detection
```typescript
async function suggestRelations(invoiceId: string) {
  // Analyze:
  // - Same customer/contractor
  // - Similar dates (±30 days)
  // - Similar amounts
  // - Matching descriptions/keywords
  // - Contract references in notes
  
  return suggestedLinks;
}
```

#### 2. Auto-Link on Creation
When creating invoice:
- Check for active contracts with same customer
- Suggest linking if found
- One-click accept suggestion

## Usage Examples

### Example 1: Income Invoice with Related Expenses
```typescript
const relatedEntities = [
  {
    id: 'exp-123',
    type: 'expense',
    title: 'Faktura kosztowa #FK/2024/001',
    subtitle: 'Marketing - Google Ads',
    amount: -1200,
    status: 'completed',
  },
  {
    id: 'exp-456',
    type: 'expense',
    title: 'Faktura kosztowa #FK/2024/002',
    subtitle: 'Podwykonawca - Jan Kowalski',
    amount: -3000,
    status: 'pending',
  },
];
```

**User sees**:
- Income: +10,000 PLN
- Related costs: -4,200 PLN
- **Net profit visible at a glance**: ~5,800 PLN

### Example 2: Expense with Contract and Bank Payment
```typescript
const relatedEntities = [
  {
    id: 'contract-789',
    type: 'contract',
    title: 'Umowa #UMW/2024/001',
    subtitle: 'Usługi marketingowe',
    status: 'completed',
  },
  {
    id: 'bank-321',
    type: 'bank',
    title: 'Przelew wychodzący',
    subtitle: 'mBank - 15.01.2024',
    amount: -5000,
    status: 'completed',
  },
];
```

**User sees**:
- Expense is covered by contract
- Payment already made via bank
- **Full audit trail in one view**

## Benefits

### For Users
1. **No navigation needed** - See related data without leaving page
2. **Instant context** - Understand full financial picture
3. **Quick access** - Click to open related entity as tab
4. **Decision support** - See profit margins, payment status, contract coverage

### For Business
1. **Reduced clicks** - 3-5 clicks saved per invoice review
2. **Faster decisions** - Context visible immediately
3. **Better insights** - Understand relationships between transactions
4. **Audit readiness** - Full trail visible at a glance

## Technical Notes

### Performance
- Lazy load related entities (only fetch when panel visible)
- Cache relationship queries (React Query)
- Debounce search in link dialog
- Limit displayed entities (show top 5, rest in dropdown)

### Responsive Design
- Desktop (xl+): Full sidebar panel
- Tablet/Mobile: Collapsible section or bottom sheet
- Print view: Exclude panel (not needed in PDF)

### Accessibility
- Keyboard navigation for chips
- Screen reader labels for status indicators
- Focus management when opening tabs
- ARIA labels for relationship types

## Migration Path

### Week 1: Foundation
- ✅ Create FinancialThreadsPanel component
- ✅ Integrate into invoice detail page
- Add relations field to database
- Create repository functions

### Week 2: Manual Linking
- Build LinkEntityDialog
- Add "Link Entity" button
- Implement add/remove relation functions
- Test with real data

### Week 3: Smart Suggestions
- Implement relationship detection algorithm
- Add suggestion UI
- Test accuracy with historical data
- Refine matching rules

### Week 4: Polish & Rollout
- Add to expense detail pages
- Add to contract detail pages
- User documentation
- Monitor usage analytics

## Success Metrics

Track these to measure impact:

1. **Usage**: % of invoices with at least 1 relation
2. **Engagement**: Clicks on related entity chips
3. **Efficiency**: Time spent on invoice detail pages (should decrease)
4. **Satisfaction**: User feedback on "finding related data"

Target: 40% of invoices should have relations within 3 months
