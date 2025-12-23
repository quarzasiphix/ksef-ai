# Event Logging Integration Status

## ✅ Completed Integrations

### 1. NewEmployee.tsx
**Status:** ✅ Complete  
**Event Type:** `employee_hired`  
**Entity Type:** `employee`  
**Location:** Lines 16-38 in onSuccess callback

```typescript
// Log event for Spółki
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'employee_hired',
    entityType: 'employee',
    entityId: employee.id,
    entityReference: `${employee.first_name} ${employee.last_name}`,
    actionSummary: `Zatrudniono pracownika: ${employee.first_name} ${employee.last_name}`,
    changes: {
      position: employee.position,
      start_date: employee.start_date,
    },
  });
}
```

### 2. NewCustomer.tsx
**Status:** ✅ Complete  
**Event Type:** `document_uploaded`  
**Entity Type:** `customer`  
**Location:** Lines 24-37 in handleSuccess

```typescript
// Log event for Spółki
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'document_uploaded',
    entityType: 'customer',
    entityId: customer.id,
    entityReference: customer.name,
    actionSummary: `Dodano kontrahenta: ${customer.name}`,
    changes: {
      name: customer.name,
    },
  });
}
```

## 📋 Remaining Integrations

### 3. BankAccounts.tsx
**Status:** ⏳ Pending  
**Event Type:** `bank_account_added`  
**Entity Type:** `bank_account`

**Copy-paste this code after successful bank account creation:**

```typescript
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component:
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation:
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'bank_account_added',
    entityType: 'bank_account',
    entityId: account.id,
    entityReference: account.account_number,
    actionSummary: `Dodano konto bankowe: ${account.account_number}`,
    changes: {
      bank_name: account.bank_name,
      currency: account.currency,
    },
  });
}
```

### 4. ContractNew.tsx
**Status:** ⏳ Pending  
**Event Type:** `contract_created`  
**Entity Type:** `contract`

**Copy-paste this code after successful contract creation:**

```typescript
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component:
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation:
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'contract_created',
    entityType: 'contract',
    entityId: contract.id,
    entityReference: contract.number,
    actionSummary: `Utworzono umowę ${contract.number}`,
    changes: {
      subject: contract.subject,
      counterparty: contract.counterparty_name,
    },
  });
}
```

### 5. NewInvoice.tsx
**Status:** ⏳ Pending (Automatic via trigger, but can add manual logging)  
**Event Type:** `invoice_created`  
**Entity Type:** `invoice`

**Note:** Invoices are already logged automatically via database trigger, but you can add manual logging for immediate feedback:

```typescript
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component:
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation (optional, already logged by trigger):
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'invoice_created',
    entityType: 'invoice',
    entityId: invoice.id,
    entityReference: invoice.number,
    actionSummary: `Utworzono fakturę ${invoice.number}`,
    decisionId: formData.decision_id,
    changes: {
      total_amount: invoice.total_gross_value,
      customer_id: invoice.customer_id,
    },
  });
}
```

### 6. NewProduct.tsx
**Status:** ⏳ Pending  
**Event Type:** `document_uploaded`  
**Entity Type:** `product`

**Copy-paste this code after successful product creation:**

```typescript
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

// In component:
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);

// After successful creation:
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

### 7. Cash Register Creation (Future)
**Status:** 🔮 Future Feature  
**Event Type:** `bank_account_added` or custom `cash_register_created`  
**Entity Type:** `cash_register` or `bank_account`

**When implementing cash registers, use this pattern:**

```typescript
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'bank_account_added', // or 'cash_register_created'
    entityType: 'cash_register',
    entityId: cashRegister.id,
    entityReference: cashRegister.name,
    actionSummary: `Utworzono kasę fiskalną: ${cashRegister.name}`,
    decisionId: formData.decision_id,
    changes: {
      register_number: cashRegister.register_number,
      location: cashRegister.location,
    },
  });
}
```

## 🎯 Integration Checklist

For each file, follow these steps:

### Step 1: Add Imports
```typescript
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';
```

### Step 2: Get Business Profile
```typescript
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);
```

### Step 3: Add Event Logging in Success Callback
```typescript
// After successful creation, before toast/navigation:
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'appropriate_event_type',
    entityType: 'entity_type',
    entityId: entity.id,
    entityReference: 'human-readable reference',
    actionSummary: 'Human-readable action description',
    decisionId: formData.decision_id, // Optional
    changes: {
      key: 'value',
    },
  });
}
```

### Step 4: Test
1. Create the entity
2. Navigate to `/accounting/event-log`
3. Verify event appears
4. Click entity reference to navigate
5. Verify decision link (if applicable)

## 📊 Event Type Mapping

| Action | Event Type | Entity Type |
|--------|-----------|-------------|
| Create Invoice | `invoice_created` | `invoice` |
| Issue Invoice | `invoice_issued` | `invoice` |
| Create Expense | `expense_created` | `expense` |
| Approve Expense | `expense_approved` | `expense` |
| Create Contract | `contract_created` | `contract` |
| Sign Contract | `contract_signed` | `contract` |
| Hire Employee | `employee_hired` | `employee` |
| Terminate Employee | `employee_terminated` | `employee` |
| Add Bank Account | `bank_account_added` | `bank_account` |
| Remove Bank Account | `bank_account_removed` | `bank_account` |
| Add Customer | `document_uploaded` | `customer` |
| Add Product | `document_uploaded` | `product` |
| Upload Document | `document_uploaded` | `document` |
| Create Cash Register | `bank_account_added` | `cash_register` |

## 🔍 Where to Find Success Callbacks

Different files have different patterns:

1. **useMutation with onSuccess:**
   ```typescript
   const mutation = useMutation({
     mutationFn: createEntity,
     onSuccess: async (entity) => {
       // Add event logging here
     }
   });
   ```

2. **handleSuccess function:**
   ```typescript
   const handleSuccess = async (entity) => {
     // Add event logging here
   };
   ```

3. **try/catch block:**
   ```typescript
   try {
     const entity = await createEntity(data);
     // Add event logging here
   } catch (error) {
     // Error handling
   }
   ```

## 🚀 Quick Reference

**3-Step Pattern:**
1. Import utilities
2. Get business profile
3. Log after success

**Only for Spółki:**
- The `shouldLogEvents()` check ensures this only runs for sp. z o.o. and S.A.
- JDG and other entity types are automatically excluded

**Non-blocking:**
- Event logging failures won't break your main operation
- Errors are logged to console but don't throw

## 📝 Files Reference

**Utility:**
- `src/utils/eventLogging.ts` - Main utility with templates

**Documentation:**
- `EASY_EVENT_LOGGING_GUIDE.md` - Complete guide with examples
- `EVENT_FIRST_ARCHITECTURE.md` - Architecture overview
- `EVENT_LOG_IMPLEMENTATION.md` - Event Log page details

**Integrated Files:**
- ✅ `src/pages/employees/NewEmployee.tsx`
- ✅ `src/pages/customers/NewCustomer.tsx`
- ⏳ `src/pages/bank/BankAccounts.tsx`
- ⏳ `src/pages/contracts/ContractNew.tsx`
- ⏳ `src/pages/invoices/NewInvoice.tsx`
- ⏳ `src/pages/products/NewProduct.tsx`

## 🎓 Next Steps

1. **Complete remaining integrations** using the copy-paste templates above
2. **Test each integration** by creating entities and checking the event log
3. **Add decision linking** where applicable (invoices, contracts, employees, bank accounts)
4. **Extend to other actions** (updates, deletions, approvals)
5. **Consider JDG support** in the future (currently Spółki-only)

## 💡 Tips

- Always use `shouldLogEvents()` to check entity type
- Always use `await` when calling `logCreationEvent()`
- Always provide `entityReference` for human-readable display
- Always include `actionSummary` in Polish
- Optional: Add `changes` object for detailed audit trail
- Optional: Add `decisionId` to link to authorizing decision
- Optional: Add `metadata` for additional context

## 🔗 Related Systems

- **Decision System** - Link events to decisions via `decisionId`
- **Event Log Page** - View all events at `/accounting/event-log`
- **Database Triggers** - Automatic logging for invoices and expenses
- **Enforcement Rules** - Future: Block actions without decisions
