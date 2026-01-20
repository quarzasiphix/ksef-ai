# KSEF-AI Invoicing System - Comprehensive Review & Documentation

**Review Date**: January 20, 2026  
**Reviewer**: System Analysis  
**Status**: In Progress

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Invoice Creation Process](#invoice-creation-process)
4. [VAT Calculations](#vat-calculations)
5. [Currency Exchange Handling](#currency-exchange-handling)
6. [Ledger & Event System Integration](#ledger--event-system-integration)
7. [Entity Type Separation (JDG vs Spółka z o.o.)](#entity-type-separation)
8. [Accounting Integration](#accounting-integration)
9. [Critical Issues & Fixes](#critical-issues--fixes)
10. [Improvement Proposals](#improvement-proposals)

---

## 1. System Overview

### Purpose
The invoicing system manages the complete lifecycle of invoices and expenses for Polish businesses, supporting:
- Multiple entity types (JDG, Spółka z o.o.)
- Multiple tax systems (VAT, Ryczałt, Linear)
- Multi-currency transactions
- Integration with accounting ledgers
- Compliance with Polish regulations

### Key Components

#### Frontend Components
- **NewInvoice.tsx** - Main invoice creation form
- **InvoiceDetail.tsx** - Invoice viewing and editing
- **InvoiceList.tsx** / **IncomeList.tsx** - Invoice listing
- **Form Components** - Modular form sections
- **PostInvoiceDialog.tsx** - Accounting posting interface

#### Data Layer
- **invoiceRepository.ts** - Invoice CRUD operations
- **expenseRepository.ts** - Expense-specific operations
- **invoiceNumberingSettingsRepository.ts** - Number generation
- **unifiedEventsRepository.ts** - Event logging

#### Database Tables
- `invoices` - Main invoice data
- `invoice_items` - Line items
- `jdg_revenue_register_lines` - Ryczałt accounting entries
- `unified_events` - Event log for ledger
- `customers` - Counterparty data
- `business_profiles` - Entity configuration

---

## 2. Architecture & Data Flow

### Invoice Creation Flow

```
User Input (NewInvoice.tsx)
    ↓
Form Validation (Zod Schema)
    ↓
Calculate Totals (invoice-utils.ts)
    ↓
Fetch Exchange Rate (if foreign currency)
    ↓
Save to Database (invoiceRepository.ts)
    ↓
Log Event (unifiedEventsRepository.ts)
    ↓
Send Notifications (emailService.ts)
    ↓
Update UI (React Query invalidation)
```

### Data Dependencies

```
Invoice
├── Business Profile (seller)
├── Customer (buyer)
├── Invoice Items[]
│   ├── VAT Rate
│   ├── Unit Price
│   └── Quantity
├── Bank Account (payment details)
├── Contract (optional link)
├── Decision (optional approval)
└── Project (optional categorization)
```

---

## 3. Invoice Creation Process

### Investigation Status: ✅ REVIEWED

### Form Schema (NewInvoice.tsx)

**Required Fields:**
- `number` - Invoice number (auto-generated or manual)
- `issueDate` - Date of issuance
- `dueDate` - Payment deadline
- `sellDate` - Date of sale/service
- `paymentMethod` - Payment type (transfer, cash, card)
- `customerId` - Buyer reference
- `businessProfileId` - Seller reference
- `transactionType` - Income or Expense

**Optional Fields:**
- `comments` - Additional notes
- `type` - Invoice type (sales, proforma, correction, receipt)
- `vat` - VAT enabled/disabled
- `vatExemptionReason` - Reason for VAT exemption
- `currency` - Transaction currency (default: PLN)
- `exchangeRate` - Currency conversion rate
- `exchangeRateDate` - Date of exchange rate
- `items[]` - Line items array

### Item Schema

Each invoice item contains:
- `name` - Item description
- `quantity` - Amount
- `unit` - Unit of measure
- `unitPrice` - Price per unit
- `vatRate` - VAT percentage
- `vatType` - VAT category

### Number Generation

**Logic:**
1. Check for custom numbering settings
2. Generate format: `{prefix}/{sequential}/{year}[/{suffix}]`
3. Validate uniqueness
4. Store in database

**Issues Found:** ❌ NONE

---

## 4. VAT Calculations

### Investigation Status: 🔍 IN PROGRESS

### Current Implementation

**Location:** `src/shared/lib/invoice-utils.ts`

**Function:** `calculateItemValues(item: InvoiceItem)`

