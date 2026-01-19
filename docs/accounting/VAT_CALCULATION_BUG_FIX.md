# VAT Calculation Bug Fix Documentation

## Overview

This document describes the comprehensive fix for a historical VAT calculation bug where VAT-exempt invoices (`zwolniony VAT`) were incorrectly calculated with negative VAT values, causing `total_gross_value` to be less than `total_net_value`.

## The Bug

### Root Cause
The historical bug occurred when `vatRate = -1` (representing VAT-exempt status) was incorrectly treated as a percentage value (`-1%`) instead of a special flag for VAT exemption.

### Incorrect Calculation
```sql
-- WRONG (historical bug)
totalVatValue = totalNetValue * (-1/100) = totalNetValue * -0.01
totalGrossValue = totalNetValue + (-0.01 * totalNetValue) = totalNetValue * 0.99
```

### Correct Calculation
```sql
-- CORRECT (current implementation)
totalVatValue = 0  -- VAT-exempt items have no VAT
totalGrossValue = totalNetValue  -- Gross equals net for VAT-exempt
```

## Impact Analysis

### Affected Tables
1. **invoices** table: Invoice-level totals
2. **invoice_items** table: Individual line item calculations

### Data Issues Found
- **invoice_items**: 14 items with negative `vat_rate`, 14 with negative `total_vat_value`, 16 with `gross < net`
- **invoices**: 14 invoices with negative `total_vat_value`, 13 with `gross < net`

## Fix Implementation

### Step 1: Database Investigation

```sql
-- Check invoice_items table
SELECT 
  COUNT(*) as total_items,
  SUM(CASE WHEN vat_rate < 0 THEN 1 ELSE 0 END) as negative_vat_rate,
  SUM(CASE WHEN total_vat_value < 0 THEN 1 ELSE 0 END) as negative_vat_value,
  SUM(CASE WHEN total_gross_value < total_net_value THEN 1 ELSE 0 END) as gross_less_than_net
FROM invoice_items;
```

### Step 2: Fix invoice_items Table

**Migration: `fix_invoice_items_vat_calculations`**

```sql
-- Fix items with negative vat_rate
UPDATE invoice_items
SET 
  vat_rate = 0,
  vat_exempt = true,
  total_vat_value = 0,
  total_gross_value = total_net_value,
  updated_at = NOW()
WHERE vat_rate < 0;

-- Fix items with negative total_vat_value
UPDATE invoice_items
SET 
  total_vat_value = 0,
  updated_at = NOW()
WHERE total_vat_value < 0;

-- Fix items where gross < net
UPDATE invoice_items
SET 
  total_gross_value = total_net_value,
  updated_at = NOW()
WHERE total_gross_value < total_net_value;
```

### Step 3: Fix invoices Table

**Migration: `fix_invoices_table_vat_calculations`**

```sql
-- Fix negative total_vat_value
UPDATE invoices
SET 
  total_vat_value = 0,
  updated_at = NOW()
WHERE total_vat_value < 0;

-- Fix invoices where gross < net
UPDATE invoices
SET 
  total_gross_value = total_net_value,
  updated_at = NOW()
WHERE total_gross_value < total_net_value;
```

### Step 4: Verification

```sql
-- Verify invoice_items table
SELECT 
  COUNT(*) as total_items,
  SUM(CASE WHEN vat_rate < 0 THEN 1 ELSE 0 END) as negative_vat_rate,
  SUM(CASE WHEN total_vat_value < 0 THEN 1 ELSE 0 END) as negative_vat_value,
  SUM(CASE WHEN total_gross_value < total_net_value THEN 1 ELSE 0 END) as gross_less_than_net,
  SUM(CASE WHEN vat_rate = 0 AND vat_exempt = true THEN 1 ELSE 0 END) as properly_vat_exempt
FROM invoice_items;

-- Verify invoices table
SELECT 
  COUNT(*) as total_invoices,
  SUM(CASE WHEN total_vat_value < 0 THEN 1 ELSE 0 END) as negative_vat_value,
  SUM(CASE WHEN total_gross_value < total_net_value THEN 1 ELSE 0 END) as gross_less_than_net,
  SUM(CASE WHEN vat = false AND total_gross_value = total_net_value AND total_vat_value = 0 THEN 1 ELSE 0 END) as properly_vat_exempt
FROM invoices;
```

## Code Analysis

### Current Implementation (Fixed)

The `saveInvoice` function in `src/modules/invoices/data/invoiceRepository.ts` already contains proper safeguards:

```typescript
// Lines 441-444: Normalization
const isVatExempt = Boolean(item.vatExempt) || normalizedVatRate < 0;
const vatRate = isVatExempt ? 0 : Math.max(0, normalizedVatRate);

// Lines 449-450: Correct calculation
const totalVatValue = isVatExempt ? 0 : totalNetValue * (vatRate / 100);
const totalGrossValue = totalNetValue + totalVatValue;
```

### Key Protections
1. **Negative Rate Detection**: `vat_rate < 0` triggers VAT-exempt logic
2. **Zero VAT for Exempt**: `totalVatValue = 0` for VAT-exempt items
3. **Gross = Net**: `totalGrossValue = totalNetValue` for VAT-exempt items
4. **Non-negative Enforcement**: `Math.max(0, normalizedVatRate)` prevents negative rates

### UI Layer Protection

The `calculateItemValues` function in `src/shared/lib/invoice-utils.ts` also handles this correctly:

```typescript
// Lines 52-53: VAT-exempt detection
const isVatExempt = vatRate === -1;

// Lines 67, 74: Correct calculations
let totalVatValue = isVatExempt ? 0 : totalNetValue * (vatRate / 100);
let totalGrossValue = totalNetValue + (isVatExempt ? 0 : totalVatValue);
```

## Results

### Before Fix
- **invoice_items**: 14 negative vat_rates, 14 negative vat_values, 16 gross<net issues
- **invoices**: 14 negative vat_values, 13 gross<net issues

### After Fix
- **invoice_items**: 0 negative values, 75 properly VAT-exempt items
- **invoices**: 0 negative values, 40 properly VAT-exempt invoices

## Prevention Measures

### Database Level
- No additional constraints needed (application logic handles it)

### Application Level
- Current code already prevents this issue
- VAT-exempt detection is robust in both save and display layers
- Negative rates are automatically converted to proper VAT-exempt status

### Testing Recommendations
1. Test VAT-exempt invoice creation
2. Verify invoice totals display correctly
3. Check PDF generation shows correct values
4. Ensure accounting reports use correct values

## Migration History

### 2025-01-19: fix_invoice_items_vat_calculations
- Fixed 14 items with negative vat_rate
- Set vat_exempt=true for affected items
- Corrected total_vat_value and total_gross_value

### 2025-01-19: fix_invoices_table_vat_calculations
- Fixed 14 invoices with negative total_vat_value
- Corrected total_gross_value where gross < net

## Lessons Learned

1. **Special Values vs Percentages**: Use explicit flags (`vat_exempt`) rather than special numeric values (`-1`)
2. **Data Validation**: Always validate that gross ≥ net and vat ≥ 0
3. **Migration Safety**: Use transaction-safe updates with proper verification
4. **Code Review**: The bug was already fixed in code, only historical data needed cleaning

## Future Considerations

1. **Database Constraints**: Consider adding CHECK constraints to prevent negative VAT values
2. **Audit Trail**: The migrations include `updated_at` changes for audit purposes
3. **Monitoring**: Add alerts if negative VAT values appear again

## Contact

For questions about this fix, refer to the migration files in `supabase/migrations/` or the code in `src/modules/invoices/data/invoiceRepository.ts`.
