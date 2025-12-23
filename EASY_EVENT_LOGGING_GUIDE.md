# Easy Event Logging Guide

## Quick Start - Copy & Paste Pattern

### Step 1: Import the utilities

```typescript
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
```

### Step 2: Get business profile context

```typescript
const { selectedProfileId, profiles } = useBusinessProfile();
const selectedProfile = profiles.find(p => p.id === selectedProfileId);
```

### Step 3: Add logging after successful creation

```typescript
// After your mutation succeeds and you have the created entity:
if (shouldLogEvents(selectedProfile?.entityType)) {
  await logCreationEvent({
    businessProfileId: selectedProfileId!,
    eventType: 'invoice_created', // Change to appropriate event type
    entityType: 'invoice',         // Change to entity type
    entityId: createdEntity.id,
    entityReference: createdEntity.number, // Human-readable reference
    actionSummary: `Utworzono fakturę ${createdEntity.number}`,
    decisionId: formData.decision_id, // Optional: link to decision
    changes: {                         // Optional: what changed
      key: 'value',
    },
  });
}
```

## Event Types Reference

```typescript
// Use these event types:
'invoice_created'
'invoice_issued'
'expense_created'
'contract_created'
'employee_hired'
'bank_account_added'
'document_uploaded'
'asset_acquired'
'resolution_created'
```

## Entity Types Reference

```typescript
// Use these entity types:
'invoice'
'expense'
'contract'
'employee'
'bank_account'
'customer'
'product'
'document'
'asset'
'resolution'
```

## Complete Examples

### Example 1: Invoice Creation

```typescript
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';
import { useBusinessProfile } from '@/context/BusinessProfileContext';

const MyComponent = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const handleCreateInvoice = async (formData) => {
    // Create the invoice
    const invoice = await createInvoice(formData);
    
    // Log the event (only for Spółki)
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
    
    toast.success('Faktura utworzona');
    navigate(`/income/${invoice.id}`);
  };
};
```

### Example 2: Employee Hiring

```typescript
const handleHireEmployee = async (formData) => {
  // Create the employee
  const employee = await createEmployee(formData);
  
  // Log the event (only for Spółki)
  if (shouldLogEvents(selectedProfile?.entityType)) {
    await logCreationEvent({
      businessProfileId: selectedProfileId!,
      eventType: 'employee_hired',
      entityType: 'employee',
      entityId: employee.id,
      entityReference: `${employee.first_name} ${employee.last_name}`,
      actionSummary: `Zatrudniono pracownika: ${employee.first_name} ${employee.last_name}`,
      decisionId: formData.decision_id,
      changes: {
        position: employee.position,
        start_date: employee.start_date,
      },
    });
  }
  
  toast.success('Pracownik dodany');
  navigate('/employees');
};
```

### Example 3: Bank Account Addition

```typescript
const handleAddBankAccount = async (formData) => {
  // Create the bank account
  const account = await createBankAccount(formData);
  
  // Log the event (only for Spółki)
  if (shouldLogEvents(selectedProfile?.entityType)) {
    await logCreationEvent({
      businessProfileId: selectedProfileId!,
      eventType: 'bank_account_added',
      entityType: 'bank_account',
      entityId: account.id,
      entityReference: account.account_number,
      actionSummary: `Dodano konto bankowe: ${account.account_number}`,
      decisionId: formData.decision_id,
      changes: {
        bank_name: account.bank_name,
        currency: account.currency,
      },
    });
  }
  
  toast.success('Konto bankowe dodane');
};
```

### Example 4: Contract Creation

```typescript
const handleCreateContract = async (formData) => {
  // Create the contract
  const contract = await createContract(formData);
  
  // Log the event (only for Spółki)
  if (shouldLogEvents(selectedProfile?.entityType)) {
    await logCreationEvent({
      businessProfileId: selectedProfileId!,
      eventType: 'contract_created',
      entityType: 'contract',
      entityId: contract.id,
      entityReference: contract.number,
      actionSummary: `Utworzono umowę ${contract.number}`,
      decisionId: formData.decision_id,
      changes: {
        subject: contract.subject,
        counterparty: contract.counterparty_name,
      },
    });
  }
  
  toast.success('Umowa utworzona');
  navigate(`/contracts/${contract.id}`);
};
```

## Where to Add Event Logging

Add event logging in these locations:

1. **After successful mutation** - When the entity is created/updated
2. **Before navigation** - Log before redirecting to detail page
3. **Inside try/catch** - After the main operation succeeds

```typescript
try {
  // 1. Create the entity
  const entity = await createEntity(data);
  
  // 2. Log the event (only for Spółki)
  if (shouldLogEvents(selectedProfile?.entityType)) {
    await logCreationEvent({...});
  }
  
  // 3. Show success message
  toast.success('Success');
  
  // 4. Navigate
  navigate('/path');
} catch (error) {
  toast.error('Error');
}
```

## Decision Linking

To link events to decisions, ensure your form has a `decision_id` field:

```typescript
// In your form
<DecisionPicker
  businessProfileId={selectedProfileId}
  value={formData.decision_id}
  onValueChange={(id) => setFormData({...formData, decision_id: id})}
  required
/>

// Then pass it to event logging
decisionId: formData.decision_id
```

## Testing Event Logging

1. Create an entity (invoice, employee, etc.)
2. Navigate to `/accounting/event-log`
3. Verify the event appears in the list
4. Click the entity reference to navigate to it
5. Click the decision reference (if linked)

## Troubleshooting

**Event not appearing?**
- Check if profile is Spółka (sp. z o.o. or S.A.)
- Check console for errors
- Verify `selectedProfileId` is set
- Ensure entity was created successfully

**Navigation not working?**
- Verify `entity_id` is correct
- Check entity type matches route mapping
- See `EventLog.tsx` for route definitions

## Summary

**3 Simple Steps:**
1. Import utilities
2. Get business profile
3. Call `logCreationEvent` after successful creation

**Only for Spółki** - The `shouldLogEvents()` check ensures this only runs for sp. z o.o. and S.A.

**Non-blocking** - Event logging failures won't break your main operation

**Full audit trail** - Every event is tracked with who, when, why, what, and consequences
