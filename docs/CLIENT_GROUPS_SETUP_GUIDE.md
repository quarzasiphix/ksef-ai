# Client Groups (Administrations) - Setup Guide

## Overview

The Client Groups system allows you to organize customers into hierarchical groups (e.g., real estate administrations, country portfolios) and generate clean, scoped invoice sequences per group.

## Database Structure

### Tables Created
- `client_groups` - Parent grouping entities
- `customers.client_group_id` - Links customers to groups

### Key Features
- Group-based invoice numbering (e.g., DOM/2026/01/0001)
- Automatic sequence management per month
- Default settings per group (payment terms, notes)

## Quick Start: Creating Your Groups

### Step 1: Create Client Groups

Run these SQL commands to create your initial groups:

```sql
-- 1. Domikom (Real Estate Administration)
INSERT INTO client_groups (business_profile_id, user_id, name, type, invoice_prefix, default_payment_terms)
VALUES (
  'ba9bcb8a-6be7-4989-ab26-4ea234c892d4', -- Your FILAR business profile ID
  '51797c16-d8a6-41b7-8ea3-a175f7442cef', -- Your user ID
  'Domikom',
  'administration',
  'DOM',
  14
);

-- 2. TOP-BUD (Direct Client)
INSERT INTO client_groups (business_profile_id, user_id, name, type, invoice_prefix, default_payment_terms)
VALUES (
  'ba9bcb8a-6be7-4989-ab26-4ea234c892d4',
  '51797c16-d8a6-41b7-8ea3-a175f7442cef',
  'TOP-BUD',
  'direct_client',
  'TOP',
  14
);

-- 3. Germany Projects
INSERT INTO client_groups (business_profile_id, user_id, name, type, invoice_prefix, default_payment_terms)
VALUES (
  'ba9bcb8a-6be7-4989-ab26-4ea234c892d4',
  '51797c16-d8a6-41b7-8ea3-a175f7442cef',
  'Niemcy / Germany',
  'country',
  'DE',
  14
);

-- 4. Netherlands Projects
INSERT INTO client_groups (business_profile_id, user_id, name, type, invoice_prefix, default_payment_terms)
VALUES (
  'ba9bcb8a-6be7-4989-ab26-4ea234c892d4',
  '51797c16-d8a6-41b7-8ea3-a175f7442cef',
  'Holandia / Netherlands',
  'country',
  'NL',
  14
);
```

### Step 2: Assign Customers to Groups

```sql
-- Get the group IDs first
SELECT id, name, invoice_prefix FROM client_groups;

-- Assign all Wspólnoty to Domikom
UPDATE customers
SET client_group_id = (SELECT id FROM client_groups WHERE invoice_prefix = 'DOM')
WHERE name LIKE 'WSPÓLNOTA MIESZKANIOWA%'
  AND user_id = '51797c16-d8a6-41b7-8ea3-a175f7442cef';

-- Assign TOP-BUD to its group
UPDATE customers
SET client_group_id = (SELECT id FROM client_groups WHERE invoice_prefix = 'TOP')
WHERE name LIKE '%TOP-BUD%'
  AND user_id = '51797c16-d8a6-41b7-8ea3-a175f7442cef';

-- Assign Netherlands clients
UPDATE customers
SET client_group_id = (SELECT id FROM client_groups WHERE invoice_prefix = 'NL')
WHERE name LIKE '%B.V.%' OR name LIKE '%Bemiddeling%'
  AND user_id = '51797c16-d8a6-41b7-8ea3-a175f7442cef';
```

### Step 3: Verify Setup

```sql
-- Check groups and customer counts
SELECT 
  cg.name,
  cg.invoice_prefix,
  COUNT(c.id) as customer_count
FROM client_groups cg
LEFT JOIN customers c ON c.client_group_id = cg.id
WHERE cg.user_id = '51797c16-d8a6-41b7-8ea3-a175f7442cef'
GROUP BY cg.id, cg.name, cg.invoice_prefix
ORDER BY cg.name;
```

## Invoice Numbering

### Format
`PREFIX/YYYY/MM/NNNN`

Examples:
- `DOM/2026/01/0001` - First Domikom invoice in January 2026
- `DOM/2026/01/0002` - Second Domikom invoice in January 2026
- `TOP/2026/01/0001` - First TOP-BUD invoice in January 2026
- `DE/2026/01/0001` - First Germany invoice in January 2026

### How It Works
1. When creating an invoice, select a customer
2. System reads the customer's `client_group_id`
3. Calls `get_next_invoice_number_for_group(group_id, year, month)`
4. Function returns the next number in sequence for that group/month
5. Sequence resets to 1 each new month

### Manual Invoice Number Generation

```sql
-- Get next invoice number for Domikom in January 2026
SELECT get_next_invoice_number_for_group(
  (SELECT id FROM client_groups WHERE invoice_prefix = 'DOM'),
  2026,
  1
);
-- Returns: DOM/2026/01/0001

-- Call again for next invoice
SELECT get_next_invoice_number_for_group(
  (SELECT id FROM client_groups WHERE invoice_prefix = 'DOM'),
  2026,
  1
);
-- Returns: DOM/2026/01/0002
```

## Benefits

### For You
- Clean organization of customers by administration/region
- Easy filtering and reporting
- Separate invoice sequences per client group

### For Your Clients (e.g., Domikom)
- See continuous invoice sequence: DOM/2026/01/0001, 0002, 0003...
- Not confused by gaps from other clients
- Professional, organized invoicing

## Next Steps

1. **Run the setup SQL** to create your groups
2. **Assign existing customers** to appropriate groups
3. **Update invoice creation** to use group-based numbering
4. **Add UI components** for managing groups (optional)

## Future Enhancements

- UI for creating/editing groups
- Bulk customer assignment to groups
- Group-based filtering in customer list
- Invoice list grouped by client group
- Automatic group assignment based on customer name patterns
