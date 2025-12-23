# Authorization System - Example Integrations

This directory contains complete, working examples of how to integrate the authorization system into different screens.

## Examples

### 1. InvoiceWithAuthorization.tsx
**Complete invoice details screen** showing:
- Authorization context card ("Why is this allowed?")
- Approval validation before submission
- Authorization check recording for audit trail
- Blocking alerts when authorization fails
- Status-based UI rendering

**Key Features**:
- Real-time authorization checking
- Audit trail recording
- Error handling with Polish messages
- Soft-blocking with draft mode

**Usage**:
```tsx
import { InvoiceWithAuthorizationExample } from '@/modules/authorization/examples/InvoiceWithAuthorization';

<InvoiceWithAuthorizationExample invoiceId="invoice-123" />
```

---

### 2. ExpenseWithValidation.tsx
**Expense creation form** demonstrating:
- Real-time validation as user types
- Blocking alerts before submission
- Soft-blocking (save as draft vs submit for approval)
- Authorization check recording

**Key Features**:
- Live amount/category validation
- Dual-mode submission (draft vs approval)
- Clear user guidance when blocked
- Progressive disclosure of authorization issues

**Usage**:
```tsx
import { ExpenseWithValidationExample } from '@/modules/authorization/examples/ExpenseWithValidation';

<ExpenseWithValidationExample />
```

---

### 3. DashboardWithReadiness.tsx
**Dashboard layout** featuring:
- Company Readiness Score widget
- Integration with other metrics
- Responsive grid layout
- Compliance-first design

**Key Features**:
- Readiness score prominently displayed
- Actionable compliance issues
- One-click navigation to fixes
- Auto-refreshing status

**Usage**:
```tsx
import { DashboardWithReadinessExample } from '@/modules/authorization/examples/DashboardWithReadiness';

<DashboardWithReadinessExample />
```

---

## Integration Patterns

### Pattern 1: Display Authorization Context
**When to use**: Detail screens (invoice, expense, contract)

```tsx
<AuthorizationExplainer
  actionType="invoice_approve"
  amount={invoice.total}
  currency={invoice.currency}
  category={invoice.category}
/>
```

### Pattern 2: Validate Before Action
**When to use**: Forms, approval buttons, destructive actions

```tsx
const { data: authCheck } = useAuthorizationCheck({
  actionType: 'expense_create',
  amount: formData.amount,
  category: formData.category,
});

const handleSubmit = () => {
  if (!authCheck?.is_authorized) {
    showAuthorizationError(authCheck?.reason);
    return;
  }
  // Proceed with action
};
```

### Pattern 3: Record Audit Trail
**When to use**: Every authorization check (required for compliance)

```tsx
const recordCheck = useRecordAuthorizationCheck();

await recordCheck.mutateAsync({
  authorization_id: authCheck.authorization_id!,
  action_type: 'invoice_approve',
  entity_type: 'invoice',
  entity_id: invoice.id,
  result: authCheck.is_authorized ? 'allowed' : 'blocked',
  reason: authCheck.reason,
  checked_amount: invoice.total,
});
```

### Pattern 4: Soft-Blocking UI
**When to use**: Forms where draft mode is available

```tsx
{!authCheck?.is_authorized && (
  <AuthorizationBlockingAlert
    reason={authCheck.reason}
    severity="warning"
  />
)}

<Button onClick={saveDraft}>Zapisz jako szkic</Button>
<Button 
  onClick={submitForApproval}
  disabled={!authCheck?.is_authorized}
>
  Wyślij do zatwierdzenia
</Button>
```

### Pattern 5: Dashboard Widget
**When to use**: Main dashboard, compliance overview

```tsx
<div className="grid grid-cols-4 gap-4">
  <CompanyReadinessScore className="col-span-1" />
  {/* Other metrics */}
</div>
```

---

## Common Scenarios

### Scenario 1: Invoice Over Limit
**Problem**: User tries to approve invoice exceeding decision limit

**Solution**:
```tsx
// Authorization check returns:
{
  is_authorized: false,
  reason: "Przekracza limit uchwały \"Zgoda na sprzedaż\" (10 000 PLN)"
}

// UI shows:
<AuthorizationBlockingAlert
  reason="Przekracza limit uchwały \"Zgoda na sprzedaż\" (10 000 PLN)"
  severity="error"
/>
```

### Scenario 2: Expired Decision
**Problem**: Decision has expired, action no longer authorized

**Solution**:
```tsx
// Authorization check returns:
{
  is_authorized: false,
  reason: "Uchwała \"Zgoda na koszty\" wygasła 15.11.2025"
}

// UI shows blocking alert with link to create new decision
```

### Scenario 3: Missing Authorization
**Problem**: No decision exists for this action type

**Solution**:
```tsx
// Authorization check returns:
{
  is_authorized: false,
  reason: "Brak aktywnej uchwały zezwalającej na tę operację"
}

// UI shows:
<AuthorizationBlockingAlert
  reason="Brak aktywnej uchwały zezwalającej na tę operację"
  showCreateDecision={true}
/>
```

---

## Testing Examples

### Test Authorization Check
```typescript
import { renderHook } from '@testing-library/react';
import { useAuthorizationCheck } from '@/modules/authorization';

test('blocks invoice over limit', async () => {
  const { result } = renderHook(() =>
    useAuthorizationCheck({
      actionType: 'invoice_approve',
      amount: 15000,
      currency: 'PLN',
    })
  );

  await waitFor(() => {
    expect(result.current.data?.is_authorized).toBe(false);
    expect(result.current.data?.reason).toContain('Przekracza limit');
  });
});
```

### Test Component Integration
```typescript
import { render, screen } from '@testing-library/react';
import { InvoiceWithAuthorizationExample } from './InvoiceWithAuthorization';

test('shows blocking alert when not authorized', async () => {
  render(<InvoiceWithAuthorizationExample invoiceId="test-id" />);

  await waitFor(() => {
    expect(screen.getByText(/Operacja zablokowana/i)).toBeInTheDocument();
  });
});
```

---

## Best Practices from Examples

1. **Always validate before action** - Check authorization before allowing user to proceed
2. **Record every check** - Use `useRecordAuthorizationCheck` for audit trail
3. **Show context** - Use `AuthorizationExplainer` on detail screens
4. **Soft-block when possible** - Allow draft mode instead of hard errors
5. **Guide users** - Show actionable next steps (create decision, contact admin)
6. **Real-time feedback** - Validate as user types, not just on submit
7. **Polish messages** - All error messages in Polish, user-friendly
8. **Audit compliance** - Every authorization check logged with full context

---

## Next Steps

1. Copy these examples to your actual screens
2. Adjust action types to match your use cases
3. Customize UI to match your design system
4. Add to your test suite
5. Monitor authorization checks in audit log

For more details, see:
- `docs/QUICK_START_AUTHORIZATION.md` - Developer guide
- `docs/AUTHORIZATION_SYSTEM_DESIGN.md` - Architecture
- `docs/IMPLEMENTATION_SUMMARY.md` - Feature overview
