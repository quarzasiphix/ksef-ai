# Standardized Invoice Variables System

## Overview

The **Standardized Invoice Variables System** provides a centralized, consistent way to manage invoice-related variables across all email templates. Instead of manually adding invoice variables to each template, you can now use a single database function that returns all invoice data in a standardized format.

## Problem Solved

**Before**: Each email template that sends invoice data had to manually define and fetch all invoice variables:
- Duplicate code across templates
- Inconsistent variable names
- Hard to maintain when adding new invoice fields
- Risk of missing variables in some templates

**After**: One centralized function provides all invoice variables:
- Single source of truth for invoice data
- Consistent variable names across all templates
- Easy to add new invoice fields (update in one place)
- Automatic inclusion of all invoice data

## Architecture

### Database Function

```sql
get_standardized_invoice_variables(p_invoice_id UUID) RETURNS JSONB
```

This function fetches and formats all invoice-related data into a standardized JSONB object.

### Available Variables

The function returns **50+ standardized variables** organized into categories:

#### Basic Invoice Information
- `invoice_id` - UUID of the invoice
- `invoice_number` - Invoice number or ID as fallback
- `invoice_date` - Formatted as DD.MM.YYYY
- `issue_date` - Same as invoice_date
- `due_date` - Payment due date (DD.MM.YYYY)
- `payment_date` - Actual payment date if paid
- `created_at` - Full timestamp (DD.MM.YYYY HH24:MI)
- `status` - Invoice status (draft, sent, paid, overdue, etc.)

#### Financial Data
- `currency` - Currency code (PLN, EUR, USD, etc.)
- `subtotal_amount` - Amount before tax
- `tax_amount` - Total tax amount
- `total_amount` - Final amount to pay
- `paid_amount` - Amount already paid
- `remaining_amount` - Amount still owed

#### Formatted Amounts (Ready for Display)
- `total_amount_formatted` - "1234.56 PLN"
- `subtotal_amount_formatted` - "1000.00 PLN"
- `tax_amount_formatted` - "234.56 PLN"
- `remaining_amount_formatted` - "0.00 PLN"

#### Customer Information
- `customer_id` - Customer UUID
- `customer_name` - Full customer name
- `customer_email` - Email address
- `customer_tax_id` - NIP/VAT number
- `customer_address` - Street address
- `customer_city` - City name
- `customer_postal_code` - Postal code
- `customer_country` - Country (defaults to "Polska")
- `customer_phone` - Phone number

#### Business Profile (Issuer) Information
- `business_id` - Business profile UUID
- `business_name` - Company name
- `business_email` - Company email
- `business_phone` - Company phone
- `business_tax_id` - Company NIP
- `business_address` - Company address
- `business_city` - Company city
- `business_postal_code` - Company postal code
- `business_country` - Company country
- `business_bank_account` - Bank account number for payments

#### Invoice Items (Array)
- `items` - JSON array of invoice line items
  - `item.name` - Item name
  - `item.description` - Item description
  - `item.quantity` - Quantity
  - `item.unit` - Unit of measurement (szt., kg, etc.)
  - `item.unit_price` - Price per unit
  - `item.tax_rate` - Tax rate percentage
  - `item.total_price` - Total for this line
  - `item.total_price_formatted` - Formatted total with currency

#### Calculated Fields
- `items_count` - Number of line items
- `is_paid` - Boolean: true if status is 'paid'
- `is_overdue` - Boolean: true if past due date and unpaid
- `days_until_due` - Integer: days until/since due date

#### Additional Fields
- `notes` - Invoice notes
- `description` - Invoice description
- `payment_terms` - Payment terms text
- `invoice_url` - URL to view invoice (filled by application)
- `download_pdf_url` - URL to download PDF (filled by application)
- `payment_url` - URL for online payment (filled by application)

## Usage

### In Edge Functions

```typescript
// Fetch standardized variables for an invoice
const { data: invoiceVars, error } = await supabase
  .rpc('get_standardized_invoice_variables', { 
    p_invoice_id: invoiceId 
  });

// invoiceVars now contains all 50+ variables ready to use
const allVariables = {
  ...invoiceVars,
  custom_message: 'Your custom message here',
  email: recipientEmail
};

// Use with template rendering
const finalHtml = replaceAllVariables(htmlTemplate, allVariables);
```

### In Email Templates

Templates can now use any standardized variable without manual setup:

```html
<h1>Faktura nr {{invoice_number}}</h1>
<p>Data wystawienia: {{invoice_date}}</p>
<p>Termin płatności: {{due_date}}</p>
<p>Kwota: {{total_amount_formatted}}</p>

<h2>Dane klienta:</h2>
<p>{{customer_name}}</p>
<p>{{customer_address}}, {{customer_city}}</p>
<p>NIP: {{customer_tax_id}}</p>

<h2>Pozycje:</h2>
{{#items}}
<tr>
  <td>{{item.name}}</td>
  <td>{{item.quantity}} {{item.unit}}</td>
  <td>{{item.total_price_formatted}}</td>
</tr>
{{/items}}
```

## Email Templates Using This System

### 1. Send Invoice to Client (`send_invoice_to_client`)

**Purpose**: Send invoices to clients with full invoice details

**Template Key**: `send_invoice_to_client`

**Subject**: `Otrzymałeś fakturę nr {{invoice_number}} od {{business_name}}`

**Features**:
- Professional Polish email design
- Full invoice details with due date highlighted
- Invoice items table
- Bank transfer information
- Custom message support
- Contact information

**Additional Variables**:
- `custom_message` - Optional personal message from sender

### 2. New Invoice Notification (`invoice_generated`)

**Purpose**: Notify user when they create a new invoice

**Template Key**: `invoice_generated`

**Can be updated to use**: Standardized variables by setting `invoice_variables.use_standardized = true`

## Adding New Invoice Fields

When you need to add a new invoice field that should be available in all templates:

### Step 1: Update the Database Function

```sql
-- Edit the get_standardized_invoice_variables function
CREATE OR REPLACE FUNCTION get_standardized_invoice_variables(
  p_invoice_id UUID
) RETURNS JSONB AS $$
BEGIN
  SELECT jsonb_build_object(
    -- ... existing fields ...
    
    -- Add your new field here
    'new_field_name', i.new_column_name,
    'new_field_formatted', format_function(i.new_column_name)
  )
  -- ... rest of function ...
END;
$$ LANGUAGE plpgsql;
```

### Step 2: Update Template Documentation

Add the new variable to the template's `variables` array:

```sql
UPDATE email_templates 
SET variables = variables || '["new_field_name"]'::jsonb
WHERE template_key IN ('send_invoice_to_client', 'invoice_generated');
```

### Step 3: Use in Templates

The new variable is now automatically available in all templates:

```html
<p>New Field: {{new_field_name}}</p>
```

## Benefits

### For Developers
- **Single Source of Truth**: One function to maintain
- **Type Safety**: JSONB ensures consistent data structure
- **Easy Testing**: Test one function instead of multiple templates
- **Reduced Code Duplication**: No repeated variable fetching logic

### For Template Designers
- **Consistent Variables**: Same names across all templates
- **Complete Data**: All invoice data available automatically
- **Easy Discovery**: Check function definition to see available variables
- **No Database Knowledge Needed**: Just use the variables

### For Maintenance
- **Add Once, Use Everywhere**: New fields automatically available
- **Version Control**: Function changes are tracked in migrations
- **Documentation**: Function serves as living documentation
- **Backwards Compatible**: Adding fields doesn't break existing templates

## Migration Strategy

### For Existing Templates

1. **Identify Invoice Templates**: Find templates that send invoice data
2. **Mark for Standardization**: Add `invoice_variables` field
3. **Update Edge Functions**: Use `get_standardized_invoice_variables()`
4. **Test**: Verify all variables render correctly
5. **Deploy**: Roll out to production

### Example Migration

```sql
-- Mark template as using standardized variables
UPDATE email_templates 
SET invoice_variables = jsonb_build_object(
  'use_standardized', true,
  'additional_variables', ARRAY['custom_field_1', 'custom_field_2']
)
WHERE template_key = 'your_template_key';
```

## Best Practices

### 1. Always Use Standardized Variables for Invoices
```typescript
// ✅ Good
const vars = await supabase.rpc('get_standardized_invoice_variables', { 
  p_invoice_id: id 
});

// ❌ Bad - Manual fetching
const invoice = await supabase.from('invoices').select('*').eq('id', id);
const customer = await supabase.from('customers').select('*').eq('id', invoice.customer_id);
// ... manually building variables object
```

### 2. Add Custom Variables After Standardized Ones
```typescript
const allVariables = {
  ...standardizedVars,  // All invoice data
  custom_message: customMessage,  // Template-specific additions
  email: recipientEmail
};
```

### 3. Document Template-Specific Variables
```sql
-- In template metadata
variables: [
  ...standardized_invoice_variables,
  'custom_message',  -- Document what this is for
  'special_field'    -- Document what this is for
]
```

### 4. Use Formatted Fields for Display
```html
<!-- ✅ Good - Uses pre-formatted field -->
<p>Total: {{total_amount_formatted}}</p>

<!-- ❌ Bad - Manual formatting in template -->
<p>Total: {{total_amount}} {{currency}}</p>
```

## Performance Considerations

### Caching
The function performs JOINs and aggregations. Consider caching results:

```typescript
// Cache standardized variables for frequently accessed invoices
const cacheKey = `invoice_vars_${invoiceId}`;
let vars = cache.get(cacheKey);

if (!vars) {
  vars = await supabase.rpc('get_standardized_invoice_variables', { 
    p_invoice_id: invoiceId 
  });
  cache.set(cacheKey, vars, 300); // 5 minute cache
}
```

### Selective Fields
If you only need a few fields, you can still use the function but extract what you need:

```typescript
const { invoice_number, total_amount_formatted, due_date } = standardizedVars;
```

## Testing

### Test the Function Directly

```sql
-- Test with a real invoice ID
SELECT get_standardized_invoice_variables('your-invoice-uuid-here');

-- Verify all fields are present
SELECT jsonb_object_keys(
  get_standardized_invoice_variables('your-invoice-uuid-here')
);
```

### Test in Templates

```typescript
// Unit test for template rendering
const mockVars = await supabase.rpc('get_standardized_invoice_variables', { 
  p_invoice_id: testInvoiceId 
});

const rendered = renderTemplate(template, mockVars);
expect(rendered).toContain(mockVars.invoice_number);
expect(rendered).toContain(mockVars.total_amount_formatted);
```

## Troubleshooting

### Variable Not Showing in Email

1. **Check function returns the variable**:
   ```sql
   SELECT get_standardized_invoice_variables('invoice-id') -> 'variable_name';
   ```

2. **Verify template syntax**:
   ```html
   <!-- Correct -->
   {{variable_name}}
   
   <!-- Wrong -->
   {{ variable_name }}  <!-- Extra spaces -->
   {variable_name}      <!-- Missing braces -->
   ```

3. **Check variable is not null**:
   ```sql
   -- Function uses COALESCE for optional fields
   'field_name', COALESCE(i.field_name, '')
   ```

### Performance Issues

1. **Add indexes** on frequently joined tables:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
   CREATE INDEX IF NOT EXISTS idx_invoices_business_profile_id ON invoices(business_profile_id);
   CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
   ```

2. **Monitor function execution time**:
   ```sql
   EXPLAIN ANALYZE 
   SELECT get_standardized_invoice_variables('invoice-id');
   ```

## Future Enhancements

- **Multi-language Support**: Return variables in different languages
- **Currency Conversion**: Automatic currency conversion fields
- **Tax Calculations**: More detailed tax breakdown
- **Payment History**: Include payment transaction details
- **Attachments**: Include links to invoice attachments
- **QR Codes**: Generate payment QR codes
