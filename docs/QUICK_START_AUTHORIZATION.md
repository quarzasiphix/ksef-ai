# Authorization System - Quick Start Guide

## Overview

The Authorization System provides **governance-grade compliance** for all sensitive operations in KsięgaI.

**Core Principle**: Every irreversible action requires an authorization source (decision/contract/policy).

---

## Installation & Setup

### 1. Database (Already Applied ✅)

Migrations have been applied to production:
- `authorizations` table created
- `authorization_checks` audit trail created
- 99 existing decisions migrated
- Helper functions deployed

### 2. Import Components

```typescript
import {
  // Components
  AuthorizationExplainer,
  CompanyReadinessScore,
  AuthorizationStatusBadge,
  
  // Hooks
  useAuthorizationCheck,
  useAuthorizations,
  useSidebarAuthStatus,
  
  // Utilities
  showAuthorizationError,
  showAuthorizationWarning,
} from '@/modules/authorization';
```

---

## Common Use Cases

### 1. Show "Why is this allowed?" Card

**Use Case**: Display authorization context on invoice/expense/kasa screens

```tsx
import { AuthorizationExplainer } from '@/modules/authorization';

function InvoiceDetails({ invoice }) {
  return (
    <div>
      {/* Your invoice details */}
      
      <AuthorizationExplainer
        actionType="invoice_create"
        amount={invoice.total}
        currency={invoice.currency}
        category={invoice.category}
      />
    </div>
  );
}
```

**Result**: Shows card explaining which decision authorizes this action, with approval status, limits, and expiry dates.

---

### 2. Validate Action Before Submission

**Use Case**: Check if user can perform action before allowing form submission

```tsx
import { useAuthorizationCheck, showAuthorizationError } from '@/modules/authorization';

function CreateExpenseForm() {
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('');
  
  const { data: authCheck } = useAuthorizationCheck({
    actionType: 'expense_create',
    amount,
    category,
  });
  
  const handleSubmit = () => {
    if (!authCheck?.is_authorized) {
      showAuthorizationError(authCheck?.reason || 'Brak zgody');
      return;
    }
    
    // Proceed with submission
    createExpense({ amount, category });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      
      {!authCheck?.is_authorized && authCheck?.reason && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Operacja zablokowana</AlertTitle>
          <AlertDescription>{authCheck.reason}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        type="submit" 
        disabled={!authCheck?.is_authorized}
      >
        Utwórz wydatek
      </Button>
    </form>
  );
}
```

---

### 3. Display Company Readiness Score

**Use Case**: Show compliance dashboard on main screen

```tsx
import { CompanyReadinessScore } from '@/modules/authorization';

function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <CompanyReadinessScore className="col-span-1" />
      
      {/* Other dashboard widgets */}
    </div>
  );
}
```

**Result**: Shows percentage score, active/pending/expired counts, actionable issues, and progress bar.

---

### 4. Add Status Badges to Sidebar

**Use Case**: Visual encoding of authorization health in navigation

```tsx
import { useSidebarAuthStatus, AuthorizationStatusBadge } from '@/modules/authorization';

function AppSidebar() {
  const { data: authStatus } = useSidebarAuthStatus();
  
  return (
    <Sidebar>
      <SidebarMenuItem>
        <Shield className={cn(
          "h-4 w-4",
          authStatus?.decisions.status === 'active' && "text-green-600",
          authStatus?.decisions.status === 'pending' && "text-amber-600",
          authStatus?.decisions.status === 'blocked' && "text-red-600"
        )} />
        <span>Decyzje</span>
        
        {authStatus?.decisions.pendingCount > 0 && (
          <AuthorizationStatusBadge
            status="pending"
            count={authStatus.decisions.pendingCount}
            className="ml-auto"
          />
        )}
      </SidebarMenuItem>
      
      <SidebarMenuItem>
        <Wallet className="h-4 w-4" />
        <span>Kasa</span>
        
        {!authStatus?.kasa.hasConsent && (
          <AuthorizationStatusBadge
            status="blocked"
            label="Brak zgody"
            className="ml-auto"
          />
        )}
      </SidebarMenuItem>
    </Sidebar>
  );
}
```

---

### 5. Record Authorization Check (Audit Trail)

**Use Case**: Log every validation attempt for compliance

```tsx
import { useRecordAuthorizationCheck } from '@/modules/authorization';

function InvoiceApproval({ invoice }) {
  const recordCheck = useRecordAuthorizationCheck();
  
  const handleApprove = async () => {
    // Check authorization
    const authCheck = await checkAuthorization({
      businessProfileId: profile.id,
      actionType: 'invoice_approve',
      amount: invoice.total,
    });
    
    // Record the check
    await recordCheck.mutateAsync({
      authorization_id: authCheck.authorization_id!,
      action_type: 'invoice_approve',
      entity_type: 'invoice',
      entity_id: invoice.id,
      result: authCheck.is_authorized ? 'allowed' : 'blocked',
      reason: authCheck.reason,
      checked_amount: invoice.total,
      checked_currency: invoice.currency,
    });
    
    if (authCheck.is_authorized) {
      approveInvoice(invoice.id);
    }
  };
  
  return <Button onClick={handleApprove}>Zatwierdź</Button>;
}
```

---

## Database Queries

### Get All Active Authorizations

```typescript
import { getAuthorizations } from '@/modules/authorization';

const activeAuths = await getAuthorizations(businessProfileId, 'active');
```

### Check Authorization Programmatically

```typescript
import { checkAuthorization } from '@/modules/authorization';

const result = await checkAuthorization({
  businessProfileId: profile.id,
  actionType: 'kasa_create',
  amount: 5000,
  currency: 'PLN',
  category: 'operational',
});

if (!result.is_authorized) {
  console.log('Blocked:', result.reason);
}
```

### Get Company Readiness Metrics

```typescript
import { getCompanyReadinessMetrics } from '@/modules/authorization';

const metrics = await getCompanyReadinessMetrics(businessProfileId);
// Returns: { total_score, active_authorizations, expired_authorizations, ... }
```

---

## Action Types Reference

Common action types to use:

| Action Type | Description | Typical Scope |
|-------------|-------------|---------------|
| `kasa_create` | Create cash register | Amount limit, date range |
| `invoice_create` | Create invoice | Amount limit, categories |
| `invoice_approve` | Approve invoice | Amount limit, counterparties |
| `expense_create` | Create expense | Amount limit, categories |
| `expense_approve` | Approve expense | Amount limit, categories |
| `asset_dispose` | Dispose of asset | Amount limit, asset types |
| `capital_event` | Capital event | Amount limit, event types |
| `payment_high_value` | High-value payment | Amount threshold |
| `contract_sign` | Sign contract | Counterparties, value |

---

## Error Messages (Polish)

The system generates Polish error messages automatically:

```typescript
// Amount exceeded
"Przekracza limit uchwały \"Zgoda na zarządzanie kasą\" (10 000 PLN)"

// Decision expired
"Uchwała \"Zgoda na sprzedaż\" wygasła 15.11.2025"

// Category not allowed
"Kategoria \"marketing\" nie jest objęta uchwałą \"Zgoda na koszty operacyjne\""

// No authorization
"Brak aktywnej uchwały zezwalającej na tę operację"
```

---

## Best Practices

### 1. Always Show Context
Use `AuthorizationExplainer` on detail screens so users understand **why** actions are allowed.

### 2. Validate Early
Check authorization before showing forms, not just on submit.

### 3. Record Everything
Use `recordAuthorizationCheck` for audit trail - it's required for compliance.

### 4. Handle Soft Blocks
Use "pending authority" mode instead of hard errors:

```tsx
{!authCheck?.is_authorized && (
  <Alert variant="warning">
    <AlertTitle>Oczekuje na uchwałę</AlertTitle>
    <AlertDescription>
      Zapisano jako szkic. Wymaga zgody wspólników.
      <Button variant="link" onClick={createDecision}>
        Utwórz uchwałę
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### 5. Update Sidebar Status
Use `useSidebarAuthStatus` to show real-time compliance health.

---

## Testing

### Test Authorization Check

```typescript
// In your test
const mockAuth = {
  is_authorized: false,
  reason: 'Przekracza limit uchwały (10 000 PLN)',
};

// Mock the hook
vi.mock('@/modules/authorization', () => ({
  useAuthorizationCheck: () => ({ data: mockAuth }),
}));
```

### Test with Real Data

1. Create a decision with scope:
   ```json
   {
     "action_types": ["expense_create"],
     "amount_limit": 10000,
     "currency": "PLN",
     "valid_from": "2025-01-01",
     "valid_to": "2025-12-31"
   }
   ```

2. Try creating expense for 15000 PLN
3. Should see: "Przekracza limit uchwały..."

---

## Troubleshooting

### Authorization not found
**Problem**: `useAuthorizationCheck` returns `is_authorized: false` with "No authorization found"

**Solution**: 
1. Check if decision exists with `status = 'active'`
2. Verify `scope.action_types` includes your action type
3. Check if decision has expired (`valid_to` in past)

### Sidebar status not updating
**Problem**: `useSidebarAuthStatus` shows stale data

**Solution**: Hook auto-refreshes every 60 seconds. Force refresh:
```typescript
const { refetch } = useSidebarAuthStatus();
await refetch();
```

### Database function error
**Problem**: `check_authorization` RPC call fails

**Solution**: Ensure migration `20250101000002_create_authorization_system.sql` was applied.

---

## Migration Guide

### From Old Decision System

Old code:
```typescript
const decision = await getDecision(decisionId);
if (decision.status !== 'active') {
  throw new Error('Decision not active');
}
```

New code:
```typescript
const authCheck = await checkAuthorization({
  businessProfileId: profile.id,
  actionType: 'invoice_create',
  amount: invoice.total,
});

if (!authCheck.is_authorized) {
  showAuthorizationError(authCheck.reason);
  return;
}
```

**Benefits**:
- Automatic scope validation (amount, date, category)
- Polish error messages
- Audit trail
- Expiry handling

---

## Support

For questions or issues:
1. Check `docs/AUTHORIZATION_SYSTEM_DESIGN.md` for architecture
2. Check `docs/IMPLEMENTATION_SUMMARY.md` for overview
3. Review database schema in migrations

**Remember**: This is a **compliance graph**, not a CRUD app. Every action should reference an authorization source.
