# Invoice Table Structure Documentation

## Overview
This document explains the database structure for invoices and invoice items, including correct column names, relationships, and API usage patterns.

---

## 📊 Invoice Table (`invoices`)

### Purpose
Main table storing invoice headers with calculated totals and metadata.

### Key Columns
| Column Name | Data Type | Description | Common Mistakes |
|-------------|-----------|-------------|-----------------|
| `id` | uuid | Primary key | - |
| `number` | text | Invoice number (e.g., "FV/2026/01/001") | ❌ NOT `invoice_number` |
| `total_gross_value` | numeric | Total amount including VAT | ❌ NOT `total_gross` |
| `total_net_value` | numeric | Total amount excluding VAT | ❌ NOT `total_net` |
| `total_vat_value` | numeric | Total VAT amount | - |
| `currency` | text | Currency code (default: "PLN") | - |
| `exchange_rate` | numeric | Exchange rate for non-PLN currencies | - |
| `business_profile_id` | uuid | FK to business_profiles | - |
| `transaction_type` | text | "income" or "expense" | - |
| `issue_date` | date | Invoice issue date (used for both income and expenses) | - |
| `accounting_status` | text | "posted" or "unposted" | - |
| `customer_id` | uuid | FK to customers | - |
| `is_paid` | boolean | Payment status | - |
| `payment_method` | text | Payment method | - |

### Common API Errors
```sql
-- ❌ WRONG - These columns don't exist
SELECT total_gross, total_net FROM invoices;
SELECT invoice_date FROM invoices;

-- ✅ CORRECT - Use proper column names
SELECT total_gross_value, total_net_value FROM invoices;
SELECT issue_date FROM invoices; -- Use issue_date for both income and expenses
```

### Date Column Usage
- ✅ **Use `issue_date`** for both income and expense invoices
- ❌ **`invoice_date` does not exist** in the database
- ✅ **`due_date`** for payment due date
- ✅ **`sell_date`** for date of sale (if different from issue date)

---

## 📋 Invoice Items Table (`invoice_items`)

### Purpose
Stores individual line items for each invoice with detailed calculations.

### Key Columns
| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `id` | uuid | Primary key |
| `invoice_id` | uuid | FK to invoices.id |
| `product_id` | uuid | FK to products (optional) |
| `name` | text | Item description |
| `quantity` | numeric | Quantity |
| `unit_price` | numeric | Price per unit |
| `vat_rate` | numeric | VAT rate (e.g., 23, 8, 5, 0) |
| `unit` | text | Unit (e.g., "szt", "kg", "godz") |
| `total_net_value` | numeric | Net total for this item |
| `total_gross_value` | numeric | Gross total for this item |
| `total_vat_value` | numeric | VAT amount for this item |
| `vat_exempt` | boolean | Whether item is VAT exempt |

### Relationship
```
invoices (1) ←→ (many) invoice_items
```
Each invoice can have multiple line items. The totals in the `invoices` table should equal the sum of corresponding values in `invoice_items`.

---

## 🔗 API Usage Examples

### Basic Invoice Query
```sql
-- ✅ Correct query for invoice totals
SELECT 
  id,
  number,
  total_gross_value,
  total_net_value,
  total_vat_value,
  currency,
  exchange_rate,
  issue_date
FROM invoices 
WHERE business_profile_id = 'your-profile-id'
  AND transaction_type = 'income'
  AND accounting_status = 'posted';
```

### Invoice with Items Query
```sql
-- ✅ Query invoice with line items
SELECT 
  i.id,
  i.number,
  i.total_gross_value,
  i.total_net_value,
  i.total_vat_value,
  ii.name as item_name,
  ii.quantity,
  ii.unit_price,
  ii.vat_rate,
  ii.total_gross_value as item_gross
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.business_profile_id = 'your-profile-id'
  AND i.transaction_type = 'income';
```

### CIT Calculation Query
```sql
-- ✅ Calculate total income for CIT
SELECT 
  SUM(total_gross_value) as total_income,
  COUNT(*) as invoice_count,
  AVG(total_gross_value) as average_invoice_value
FROM invoices 
WHERE business_profile_id = 'your-profile-id'
  AND transaction_type = 'income'
  AND accounting_status = 'posted'
  AND issue_date >= '2026-01-01'
  AND issue_date <= '2026-03-30';
```

### VAT Ledger Query
```sql
-- ✅ Get VAT data for VAT ledger
SELECT 
  id,
  number,
  issue_date,
  total_net_value,
  total_vat_value,
  total_gross_value,
  CASE 
    WHEN total_vat_value > 0 AND total_net_value > 0 
    THEN ROUND((total_vat_value / total_net_value) * 100)
    ELSE 0 
  END as vat_rate
FROM invoices 
WHERE business_profile_id = 'your-profile-id'
  AND accounting_status = 'posted'
  AND total_vat_value != 0
ORDER BY issue_date DESC;
```

---

## 📝 Data Flow

### Invoice Creation Flow
1. Create invoice header in `invoices` table
2. Create line items in `invoice_items` table
3. Calculate totals from line items
4. Update invoice header with calculated totals
5. Set `accounting_status = 'unposted'`

### Posting Flow
1. Validate invoice data
2. Create accounting event
3. Update `accounting_status = 'posted'`
4. Invoice appears in accounting reports

---

## ⚠️ Common Pitfalls

### 1. Wrong Column Names
```sql
-- ❌ WRONG
SELECT total_gross, total_net FROM invoices;

-- ✅ CORRECT  
SELECT total_gross_value, total_net_value FROM invoices;
```

### 2. Missing Business Profile Filter
```sql
-- ❌ WRONG - Returns all invoices from all businesses
SELECT * FROM invoices;

-- ✅ CORRECT - Filter by business profile
SELECT * FROM invoices WHERE business_profile_id = 'your-id';
```

### 3. Wrong Date Column
```sql
-- ❌ WRONG - issue_date doesn't exist for expenses
SELECT * FROM invoices WHERE issue_date >= '2026-01-01';

-- ✅ CORRECT - Use appropriate date column
SELECT * FROM invoices 
WHERE 
  (transaction_type = 'income' AND issue_date >= '2026-01-01')
  OR 
  (transaction_type = 'expense' AND invoice_date >= '2026-01-01');
```

### 4. Ignoring Accounting Status
```sql
-- ❌ WRONG - Includes unposted invoices
SELECT SUM(total_gross_value) FROM invoices;

-- ✅ CORRECT - Only include posted invoices
SELECT SUM(total_gross_value) FROM invoices 
WHERE accounting_status = 'posted';
```

---

## 🔍 Debugging Tips

### Check Invoice Totals Consistency
```sql
-- Verify totals match line items sum
SELECT 
  i.id,
  i.number,
  i.total_gross_value as invoice_total,
  SUM(ii.total_gross_value) as items_sum,
  i.total_gross_value - SUM(ii.total_gross_value) as difference
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.business_profile_id = 'your-id'
GROUP BY i.id, i.number, i.total_gross_value
HAVING i.total_gross_value != SUM(ii.total_gross_value);
```

### Find Unposted Invoices
```sql
-- Find invoices that need posting
SELECT 
  id,
  number,
  total_gross_value,
  issue_date
FROM invoices 
WHERE business_profile_id = 'your-id'
  AND accounting_status = 'unposted'
  AND transaction_type = 'income';
```

---

## 📚 Related Documents

- [Invoicing Current Documentation](./invoicing-current.md)
- [Accounting Improvements Summary](../accounting/docs/ACCOUNTING_IMPROVEMENTS_SUMMARY.md)
- [Security & Access Control](./invoicing-current.md#security-issues)

---

## 🚀 Quick Reference

### Essential Columns for Accounting
- `total_gross_value` - Use for revenue calculations
- `total_net_value` - Use for net revenue calculations  
- `total_vat_value` - Use for VAT calculations
- `accounting_status` - Filter for 'posted' only
- `transaction_type` - Filter for 'income' vs 'expense'

### Always Include in Queries
- `business_profile_id` - For tenant isolation
- `accounting_status = 'posted'` - For accounting reports
- Appropriate date column (`issue_date` or `invoice_date`)

### Never Use
- `total_gross` (doesn't exist)
- `total_net` (doesn't exist)  
- `invoice_number` (use `number` instead)
