# Copy-Paste Event Logging Templates

## Quick Integration Guide

This document provides ready-to-use code snippets for integrating event logging into any file.

---

## 🎯 Universal Template (Works Everywhere)

### Step 1: Add These Imports (Top of File)

```typescript
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';
```

### Step 2: Add These Lines (Inside Component)

```typescript
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);
```

### Step 3: Add Event Logging (After Successful Creation)

```typescript
// Log event for Spółki
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'EVENT_TYPE_HERE',
    entityType: 'ENTITY_TYPE_HERE',
    entityId: entity.id,
    entityReference: 'HUMAN_READABLE_REFERENCE',
    actionSummary: 'Polish description of what happened',
    decisionId: formData?.decision_id, // Optional
    changes: {
      // Optional: what changed
    },
  });
}
```

---

## 📋 Ready-to-Use Snippets by File

### BankAccounts.tsx

**Add after successful bank account creation:**

```typescript
// Imports (top of file)
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'bank_account_added',
    entityType: 'bank_account',
    entityId: account.id,
    entityReference: account.account_number,
    actionSummary: `Dodano konto bankowe: ${account.account_number}`,
    decisionId: formData?.decision_id,
    changes: {
      bank_name: account.bank_name,
      currency: account.currency,
    },
  });
}
```

---

### ContractNew.tsx

**Add after successful contract creation:**

```typescript
// Imports (top of file)
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'contract_created',
    entityType: 'contract',
    entityId: contract.id,
    entityReference: contract.number,
    actionSummary: `Utworzono umowę ${contract.number}`,
    decisionId: formData?.decision_id,
    changes: {
      subject: contract.subject,
      counterparty: contract.counterparty_name,
    },
  });
}
```

---

### NewInvoice.tsx

**Add after successful invoice creation (optional, already logged by trigger):**

```typescript
// Imports (top of file)
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'invoice_created',
    entityType: 'invoice',
    entityId: invoice.id,
    entityReference: invoice.number,
    actionSummary: `Utworzono fakturę ${invoice.number}`,
    decisionId: formData?.decision_id,
    changes: {
      total_amount: invoice.total_gross_value,
      customer_id: invoice.customer_id,
    },
  });
}
```

---

### NewProduct.tsx

**Add after successful product creation:**

```typescript
// Imports (top of file)
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'document_uploaded',
    entityType: 'product',
    entityId: product.id,
    entityReference: product.name,
    actionSummary: `Dodano produkt: ${product.name}`,
    changes: {
      price: product.price,
      unit: product.unit,
    },
  });
}
```

---

### Cash Register Creation (Future)

**When implementing cash registers:**

```typescript
// Imports (top of file)
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'bank_account_added',
    entityType: 'cash_register',
    entityId: cashRegister.id,
    entityReference: cashRegister.name,
    actionSummary: `Utworzono kasę fiskalną: ${cashRegister.name}`,
    decisionId: formData?.decision_id,
    changes: {
      register_number: cashRegister.register_number,
      location: cashRegister.location,
    },
  });
}
```

---

## 🔧 Common Patterns

### Pattern 1: useMutation with onSuccess

```typescript
const mutation = useMutation({
  mutationFn: createEntity,
  onSuccess: async (entity) => {
    queryClient.invalidateQueries({ queryKey: ["entities"] });
    
    // ADD EVENT LOGGING HERE
    if (shouldLogEvents(selectedProfile?.entityType)) {
      await logCreationEvent({
        businessProfileId: selectedProfileId!,
        eventType: 'entity_created',
        entityType: 'entity',
        entityId: entity.id,
        entityReference: entity.name,
        actionSummary: `Utworzono: ${entity.name}`,
      });
    }
    
    toast.success('Success');
    navigate('/path');
  },
});
```

### Pattern 2: handleSuccess Function

```typescript
const handleSuccess = async (entity: Entity) => {
  // ADD EVENT LOGGING HERE
  if (shouldLogEvents(selectedProfile?.entityType)) {
    await logCreationEvent({
      businessProfileId: selectedProfileId!,
      eventType: 'entity_created',
      entityType: 'entity',
      entityId: entity.id,
      entityReference: entity.name,
      actionSummary: `Utworzono: ${entity.name}`,
    });
  }
  
  toast.success('Success');
  navigate('/path');
};
```

### Pattern 3: try/catch Block

```typescript
try {
  const entity = await createEntity(data);
  
  // ADD EVENT LOGGING HERE
  if (shouldLogEvents(selectedProfile?.entityType)) {
    await logCreationEvent({
      businessProfileId: selectedProfileId!,
      eventType: 'entity_created',
      entityType: 'entity',
      entityId: entity.id,
      entityReference: entity.name,
      actionSummary: `Utworzono: ${entity.name}`,
    });
  }
  
  toast.success('Success');
  navigate('/path');
} catch (error) {
  toast.error('Error');
}
```

---

## 📊 Event Type Reference

| Action | Event Type |
|--------|-----------|
| Create invoice | `invoice_created` |
| Issue invoice | `invoice_issued` |
| Export invoice | `invoice_exported` |
| Create expense | `expense_created` |
| Approve expense | `expense_approved` |
| Reject expense | `expense_rejected` |
| Create contract | `contract_created` |
| Sign contract | `contract_signed` |
| Terminate contract | `contract_terminated` |
| Hire employee | `employee_hired` |
| Terminate employee | `employee_terminated` |
| Add bank account | `bank_account_added` |
| Remove bank account | `bank_account_removed` |
| Upload document | `document_uploaded` |
| Share document | `document_shared` |
| Acquire asset | `asset_acquired` |
| Dispose asset | `asset_disposed` |
| Create resolution | `resolution_created` |
| Capital event | `capital_event` |
| Make payment | `payment_made` |
| Receive payment | `payment_received` |

---

## 🎯 Entity Type Reference

| Entity | Entity Type |
|--------|------------|
| Invoice | `invoice` |
| Expense | `expense` |
| Contract | `contract` |
| Employee | `employee` |
| Bank Account | `bank_account` |
| Customer | `customer` |
| Product | `product` |
| Document | `document` |
| Asset | `asset` |
| Resolution | `resolution` |
| Cash Register | `cash_register` |

---

## ✅ Testing Checklist

After adding event logging:

1. ✅ Create the entity in the app
2. ✅ Navigate to `/accounting/event-log`
3. ✅ Verify event appears in the list
4. ✅ Check event has correct type badge
5. ✅ Click entity reference - should navigate to entity
6. ✅ If decision linked, click decision badge - should navigate to decision
7. ✅ Verify event only logs for Spółki (not JDG)

---

## 🚨 Important Notes

- **Only for Spółki**: Event logging only runs for sp. z o.o. and S.A.
- **Non-blocking**: Failures won't break your main operation
- **Always await**: Use `await` when calling `logCreationEvent()`
- **Polish language**: Use Polish for `actionSummary`
- **Human-readable**: Use `entityReference` for display (invoice number, name, etc.)
- **Optional fields**: `decisionId`, `changes`, `metadata` are all optional

---

## 💡 Pro Tips

1. **Copy the entire snippet** - Don't try to type it manually
2. **Replace placeholders** - Change `EVENT_TYPE_HERE`, `ENTITY_TYPE_HERE`, etc.
3. **Test immediately** - Check the event log after each integration
4. **Use decision linking** - Add `decisionId` where applicable
5. **Add meaningful changes** - Include relevant fields in `changes` object

---

## 🔗 Related Documentation

- `EASY_EVENT_LOGGING_GUIDE.md` - Complete guide with examples
- `EVENT_LOGGING_INTEGRATION_STATUS.md` - Integration status tracker
- `EVENT_FIRST_ARCHITECTURE.md` - Architecture overview
- `src/utils/eventLogging.ts` - Utility functions and templates
