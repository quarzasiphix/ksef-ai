# Asset Management System - Implementation Guide

## Overview

This document describes the **decision-first asset management system** for sp. z o.o., built on the principle that **assets exist because decisions bind capital, not because they were purchased**.

## Core Philosophy

### The Fundamental Principle

> An asset does not exist because it was bought.  
> It exists because the company decided to bind capital or rights.

This system revolves around **decisions**, not objects. Everything else hangs off that.

## Architecture

### 1. Universal Asset Spine

Single abstract `ASSET` object with specializations:

```typescript
Asset {
  asset_class: 'real_estate' | 'vehicle' | 'ip' | 'equipment' | 'financial_asset'
  legal_basis_type: 'uchwala' | 'contract' | 'decision'
  legal_basis_id: UUID  // References the authorizing decision
  ownership_type: 'owned' | 'leased' | 'licensed' | 'right_of_use'
  status: 'authorized' | 'acquired' | 'operational' | 'modified' | 'impaired' | 'disposed'
}
```

### 2. Asset ≠ Value

**Never store "the value" on the asset.** Instead, use `VALUATION_EVENTS`:

```typescript
AssetValuation {
  valuation_type: 'purchase_price' | 'book_value' | 'appraisal' | 'market_estimate'
  amount: number
  authority_level: 'accounting' | 'informational' | 'external_expert' | 'regulatory'
  effective_date: date
}
```

This allows:
- Multiple values simultaneously
- Avoiding legal misrepresentation
- Supporting audits and financing
- Surviving market swings

### 3. Expenses Attach to Obligations, Not Assets

Critical distinction:

```
Decision → Obligation → Transaction → Accounting → Asset context
```

```typescript
Obligation {
  based_on_type: 'uchwala' | 'contract' | 'decision'
  purpose: 'acquire' | 'maintain' | 'improve' | 'dispose'
  accounting_effect: 'capitalized' | 'expense' | 'deferred'
  affects_asset_id?: UUID  // Optional - some obligations don't affect specific assets
}
```

Examples:
- Renovation → `capitalized` → increases asset value
- Insurance → `expense` → operating cost
- Lease payment → NOT an asset

### 4. Forced Lifecycle

Every asset must pass through defined states:

```
Authorized → Acquired → Operational → Modified → Impaired → Disposed
```

Users **cannot skip steps**. This prevents:
- "Ghost assets"
- Forgotten vehicles
- Missing depreciation logic
- Audit nightmares

State transitions are automatically logged with authorization trail.

### 5. Asset-Class Specific Overlays

Each asset class **only adds fields, never new logic**:

**Real Estate:**
- address, land_register_reference, usage_type, depreciation_group

**Vehicles:**
- VIN, registration, mileage, operational_policy (private use allowed?)

**IP:**
- type, jurisdiction, license_scope, expiry

**Financial Assets:**
- instrument_type, counterparty, risk_classification

**Equipment:**
- serial_number, location, condition, maintenance_schedule

## Database Schema

### Core Tables

1. **`assets`** - Universal asset table
2. **`asset_valuations`** - Valuation events (not "the value")
3. **`asset_obligations`** - Expenses/commitments linked to decisions
4. **`asset_state_transitions`** - Audit trail of lifecycle changes

### Asset Class Tables

5. **`asset_real_estate`** - Real estate overlay
6. **`asset_vehicles`** - Vehicle overlay
7. **`asset_ip`** - Intellectual property overlay
8. **`asset_equipment`** - Equipment overlay
9. **`asset_financial`** - Financial assets overlay

## UI Concept

### DO NOT show "Assets" as a list first

Show: **Capital Commitments**

From there:
1. "This decision bound capital into X"
2. Click → see the asset
3. See obligations
4. See transactions
5. See accounting impact
6. See current status

This is how:
- Boards think
- Auditors think
- Banks think

## Implementation Files

### Database
- `supabase/migrations/20251219_asset_management_system.sql` - Complete schema

### Types
- `src/types/assets.ts` - TypeScript types for all entities

### Repository
- `src/integrations/supabase/repositories/assetsRepository.ts` - Data access layer

### UI
- `src/pages/assets/CapitalCommitments.tsx` - Main view (decision → asset flow)

## Migration Steps

### 1. Run Database Migration

```bash
# Apply the migration
supabase db push
```

This creates all tables, indexes, RLS policies, and triggers.

### 2. Regenerate Supabase Types

```bash
# Generate TypeScript types from database
npm run generate-types
```

This will resolve all TypeScript errors in the repository layer.

### 3. Add Routing

Add to `src/App.tsx`:

```typescript
import CapitalCommitments from '@/pages/assets/CapitalCommitments';

// In routes:
<Route path="/assets/capital-commitments" element={<CapitalCommitments />} />
```

### 4. Add Navigation

Add to sidebar navigation (for spółki only):

```typescript
{
  title: "Zaangażowanie kapitału",
  path: "/assets/capital-commitments",
  icon: Coins,
  requiredEntityType: ['sp_zoo', 'sa']
}
```

## Strategic Positioning

### Market As:
- "Asset governance for spółki z o.o."
- "Decision-linked assets"
- "Audit-ready by construction"

### Mandatory for spółki, optional for JDG

Spółki **need** this.  
JDG users will fight it.

### Why This System is Powerful for Spółki

With this model:
- **Misuse becomes visible instantly** - private use leaks are obvious
- **Shareholder disputes are traceable** - full audit trail
- **Audits become procedural, not emotional** - everything is documented
- **KSeF becomes just an output layer** - not the source of truth

You are **encoding corporate memory**.

## Next Steps

### Phase 1: Core Functionality (Current)
- ✅ Database schema
- ✅ TypeScript types
- ✅ Repository layer
- ✅ Capital Commitments view

### Phase 2: Asset Management
- [ ] Asset creation flow (linked to decisions)
- [ ] Asset detail view
- [ ] Valuation management
- [ ] Obligation tracking

### Phase 3: Lifecycle Management
- [ ] Status transition UI
- [ ] Authorization workflow
- [ ] State machine validation
- [ ] Audit trail viewer

### Phase 4: Asset Class Features
- [ ] Real estate management
- [ ] Vehicle tracking (with private use detection)
- [ ] IP portfolio
- [ ] Financial instruments

### Phase 5: Reporting & Analytics
- [ ] Capital deployment reports
- [ ] Asset value trends
- [ ] Obligation fulfillment tracking
- [ ] Governance compliance dashboard

## Key Decisions

### 1. Decision-First Architecture
Every asset **must** have a legal basis (uchwała, contract, or decision). This is enforced at the database level.

### 2. Valuation Events, Not Values
Assets don't have a "value" field. They have a history of valuations. This is critical for:
- Legal compliance
- Audit trails
- Multiple valuation methods
- Market volatility

### 3. Obligations Drive Accounting
Expenses don't attach to assets directly. They attach to obligations, which then affect assets based on `accounting_effect`:
- `capitalized` → increases asset value
- `expense` → operating cost
- `deferred` → prepaid/accrued

### 4. Forced State Machine
Users cannot skip lifecycle states. This prevents data quality issues and ensures governance compliance.

### 5. Spółka-First Design
This system is designed for sp. z o.o. and S.A. It's **not** for JDG users who want simple invoicing.

## TypeScript Errors (Temporary)

The repository layer currently shows TypeScript errors because Supabase types haven't been regenerated yet. These will resolve automatically after:

1. Running the migration
2. Regenerating types with `npm run generate-types`

All errors are related to Supabase not knowing about the new tables yet.

## Testing Strategy

### Unit Tests
- Valuation calculations
- State transition validation
- Obligation accounting effects

### Integration Tests
- Asset creation with decision linkage
- Lifecycle state transitions
- Valuation event recording

### E2E Tests
- Capital commitment flow
- Asset registration workflow
- Obligation fulfillment tracking

## Security Considerations

### Row Level Security (RLS)
All tables have RLS policies ensuring users can only access assets for their business profiles.

### Authorization Trail
All state transitions record:
- Who authorized the change
- What type of authorization (uchwała/decision/user)
- When the change occurred
- Why the change was made

### Audit Compliance
The system is designed to be **audit-ready by construction**:
- Immutable state transitions
- Complete valuation history
- Decision linkage for all assets
- Obligation tracking with fulfillment dates

## Performance Considerations

### Indexes
All critical queries have supporting indexes:
- `assets(business_profile_id, status)`
- `assets(legal_basis_type, legal_basis_id)`
- `asset_valuations(asset_id, effective_date)`
- `asset_obligations(business_profile_id, status)`

### Query Optimization
- Capital commitments use parallel queries
- Asset details fetch related data in single batch
- Valuations ordered by effective_date for fast "current value" lookup

## Conclusion

This is not a traditional asset management system. It's a **governance-first** system that:

1. Encodes corporate memory
2. Makes misuse visible
3. Ensures audit compliance
4. Provides decision traceability
5. Supports multiple valuation methods
6. Enforces lifecycle discipline

The UI shows **Capital Commitments** first, not "Assets list", because that's how boards, auditors, and banks think about capital deployment.

This is the foundation for professional sp. z o.o. management.
