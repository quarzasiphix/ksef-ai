# Current Invoicing System Documentation

## Overview

The invoicing system in KSeF-AI is a multi-tenant application that manages the complete lifecycle of business invoices, from creation to payment tracking. An invoice represents a legal document for goods or services exchanged between businesses, with full integration to the Polish KSeF system and accounting workflows.

## Data Model

### Core Tables

#### invoices
**Purpose**: Stores complete invoice information with business context
**Key Columns**:
- `id` (uuid): Primary key
- `number` (text): Invoice number (e.g., "FV/2024/001")
- `business_profile_id` (uuid): Links to business_profiles table
- `department_id` (uuid): Optional department linkage for multi-department businesses
- `customer_id` (uuid): Links to customers table
- `issue_date` (date): When invoice was issued
- `due_date` (date): Payment due date
- `is_paid` (boolean): Payment status
- `total_amount` (numeric): Invoice total
- `net_amount` (numeric): Amount before VAT
- `vat_amount` (numeric): VAT amount
- `currency` (text): Currency code (default: PLN)
- `status` (text): Lifecycle status (draft, issued, awaiting_payment, paid, cancelled)
- `is_public` (boolean): Public sharing flag
- `user_id` (uuid): Creator of invoice

**Relationships**:
- FK to `business_profiles(id)`
- FK to `departments(id)` (optional)
- FK to `customers(id)`

#### invoice_items
**Purpose**: Line items for each invoice
**Key Columns**:
- `id` (uuid): Primary key
- `invoice_id` (uuid): FK to invoices
- `description` (text): Item description
- `quantity` (numeric): Quantity
- `unit_price` (numeric): Price per unit
- `net_amount` (numeric): Net amount for line
- `vat_rate` (numeric): VAT percentage
- `vat_amount` (numeric): VAT for line
- `total_amount` (numeric): Total for line

**Relationships**:
- FK to `invoices(id)`

#### events
**Purpose**: Audit trail and event logging for invoice actions
**Key Columns**:
- `id` (uuid): Primary key
- `business_profile_id` (uuid): Business context
- `entity_type` (text): Type of entity (e.g., "invoice", "expense")
- `entity_id` (uuid): ID of the entity
- `event_type` (text): Type of event (e.g., "invoice_created", "invoice_paid")
- `event_data` (jsonb): Event-specific data
- `user_id` (uuid): User who triggered event
- `timestamp` (timestamptz): When event occurred

**Relationships**:
- FK to `business_profiles(id)`

#### business_profiles
**Purpose**: Business entity information
**Key Columns**:
- `id` (uuid): Primary key
- `user_id` (uuid): Owner
- `name` (text): Business name
- `tax_id` (text): NIP number
- `entity_type` (text): Business form (dzialalnosc, sp_zoo, sa)
- `tax_type` (text): Tax regime (skala, liniowy, ryczalt)
- `industry` (text): Business industry
- `subscription_tier` (text): Service level (free, jdg_premium, spolka_premium)

#### departments
**Purpose**: Organizational units within businesses
**Key Columns**:
- `id` (uuid): Primary key
- `business_profile_id` (uuid): Parent business
- `name` (text): Department name
- `description` (text): Optional description

### Invoice to Business Profile and Department Linking

Invoices are linked to business profiles through:
1. Direct FK: `invoices.business_profile_id` → `business_profiles.id`
2. Optional department linkage: `invoices.department_id` → `departments.id`

The `DepartmentSwitcher.tsx` component allows users to switch between departments within a business profile, affecting:
- Default department for new invoices
- Filtering of invoice views
- Context for invoice creation forms

`BusinessProfileForm.tsx` manages business profile settings that influence invoice creation:
- Tax settings (VAT rates, tax regime)
- Default currency and payment terms
- KSeF integration settings
- Subscription-based feature access

## Invoice Lifecycle

### Status Flow
```
draft → issued → awaiting_payment → paid
   ↓       ↓
cancelled cancelled
```

### Lifecycle States
- **draft**: Invoice being created/edited, not yet issued
- **issued**: Final invoice sent to customer, immutable
- **awaiting_payment**: Issued but not yet paid
- **paid**: Payment received, closed
- **cancelled**: Invoice cancelled, archived

### Key Actions & Field Indicators

#### Creation (draft state)
- Invoice number auto-generated or manual
- Customer selection from customers table
- Line items added via `EditableInvoiceItemsTable.tsx`
- Business profile and department context set

#### Issuing (issued state)
- Status changed to 'issued'
- Issue date set to current date
- Invoice becomes read-only
- Event logged: `invoice_created`

#### Payment Tracking (awaiting_payment → paid)
- `is_paid` boolean field
- Payment events logged via `invoice_payments` table
- Triggers update payment status logic

#### Cancellation
- Status set to 'cancelled'
- Invoice archived but preserved

## Event Logging

### Event Types for Invoices
- `invoice_created`: New invoice issued
- `invoice_updated`: Invoice modified (draft only)
- `invoice_paid`: Payment received
- `invoice_cancelled`: Invoice cancelled
- `invoice_shared`: Public sharing enabled
- `invoice_pdf_generated`: PDF downloaded

### Event Creation Points
Events are created in:
- Invoice repository functions (`saveInvoice`, `updateInvoicePaymentStatus`)
- Invoice UI components (issue, pay, cancel buttons)
- Automatic triggers (payment detection, KSeF sync)

### Event Schema Usage
Events use generic entity linking:
- `entity_type`: "invoice"
- `entity_id`: Invoice UUID
- `event_data`: Invoice-specific payload (amounts, customer, etc.)

## RLS & Multi-tenant Safety

### Row Level Security Policies

#### invoices table
- **Users can create invoices**: `auth.uid()` set as user_id
- **Users can update their business invoices**: Business profile ownership check
- **Users can view their business invoices**: Business profile ownership OR company member permissions
- **Company members can manage invoices**: Role-based permissions for invoice management
- **Admins view all invoices**: Super admin access
- **Public read for shared invoices**: Anonymous access for public invoices
- **Anonymous read shared invoice**: Link-based sharing

#### invoice_items table
- **Users can access their invoice items**: User ownership via invoice linkage
- **Anonymous read shared items**: Link-based sharing

#### events table
- **Users can create events**: Business profile context
- **Users can view their business events**: Business profile ownership OR company member access
- **Multiple policies**: Some policies disabled (events_update_policy = false)

#### business_profiles table
- **Users can view/update their own**: Direct user_id ownership
- **Admins full access**: Super admin privileges

#### departments table
- **Users can manage their business departments**: Business profile ownership
- **Admins view all departments**: Super admin access

### Access Control Matrix

| Role | invoices | invoice_items | events | business_profiles | departments |
|------|----------|----------------|--------|-------------------|-------------|
| Owner | CRUD | CRUD | CR | CRUD | CRUD |
| Staff | CRU* | CRU* | CR | R | R |
| Accountant | CRU* | CRU* | CR | R | R |
| Viewer | R | R | R | R | R |
| Super Admin | CRUD | CRUD | CRUD | CRUD | CRUD |

* = With business/department restrictions

### Security Risks & Issues

#### Broad Policies
- **Issue**: Invoice creation policy allows any authenticated user to create invoices
- **Risk**: Potential tenant leakage if user_id not properly validated
- **Mitigation**: Relies on proper business_profile_id validation

#### Service Role Usage
- **Issue**: Some operations may bypass RLS via service role
- **Risk**: Data integrity if not carefully controlled
- **Detection**: Need audit of service role usage in codebase

#### Missing Policies
- **Issue**: No explicit DELETE policy for events table
- **Risk**: Events cannot be cleaned up
- **Impact**: Audit trail grows indefinitely

#### Cross-tenant Access
- **Issue**: Company member policies allow access across business profiles
- **Risk**: User could access invoices from other companies
- **Mitigation**: Requires explicit company_members table entries

## Current Gaps vs Invoice Change Tracking Goal

### Missing Versioning
- **Current**: No invoice version history
- **Gap**: Cannot track field changes over time
- **Impact**: Audit trail incomplete for compliance

### Change Detection
- **Current**: Events logged for major actions only
- **Gap**: No field-level change tracking
- **Needed**: Before/after values for all modifications

### Relationship Tracking
- **Current**: Static FK relationships
- **Gap**: No historical relationship changes
- **Example**: Department reassignments not tracked

### Archival Strategy
- **Current**: Cancelled invoices remain active
- **Gap**: No clear archival/purge strategy
- **Risk**: Growing data volume

### Required for Change Tracking System
1. **Invoice versions table**: Store complete invoice snapshots
2. **Field-level audit**: Track individual field changes
3. **Relationship history**: Track FK changes over time
4. **Change reasons**: Business logic for changes
5. **Immutable audit trail**: Prevent event modification/deletion
