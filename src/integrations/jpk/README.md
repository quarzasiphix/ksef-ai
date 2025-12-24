# JPK Integration Module

## Overview

This module handles generation and validation of JPK (Jednolity Plik Kontrolny) files for Polish tax compliance.

## Architecture Principles

### 1. Canonical Accounting Model First

JPK files are **reports over normalized ledger data**, not direct transformations of UI objects.

The source data model includes:
- Company profile (VAT status, NIP, address, period rules)
- Counterparty records (customers, suppliers)
- Documents (invoices, corrections, payments)
- VAT registers (sales/purchase entries with proper codes)
- Posting/booking (accounts, journals)

### 2. Versioned Schema Mapping

Each JPK type and version has its own dedicated mapper:

```
jpk/
  v7m/          # JPK_V7M (monthly VAT register)
    v3/         # Schema version 3
      mapper.ts
      types.ts
      validator.ts
    v4/         # Future schema version
  v7k/          # JPK_V7K (quarterly VAT register)
    v3/
  fa/           # JPK_FA (invoices - on demand)
    v2/
  kr/           # JPK_KR (full accounting - on demand)
    v1/
  schemas/      # XSD files for validation
```

**Benefits:**
- When MF releases new schema versions, add new folder instead of rewriting
- Each version is independently tested
- Clean separation of concerns

### 3. Generation Process

**Step 1: Pick schema type + version**
Based on:
- File type (JPK_V7M vs V7K, JPK_FA, JPK_KR, etc.)
- Period (month/quarter/year)
- Enforcement date (versions switch over time)

**Step 2: Transform accounting model to XML**
- Use XML builder library (xmlbuilder2)
- Fill fields exactly per official schema + XSD
- Apply business logic rules

**Step 3: Validate**
Two-stage validation:
1. **XSD validation** - structure matches schema
2. **Business rules validation** - MF logic rules (required combinations, sums, codes)

Many vendors fail by doing only XSD validation.

### 4. VAT Status Logic

**Critical distinction:**

- **VAT-active companies**: Must file JPK_V7M/V7K monthly/quarterly
- **VAT-exempt companies** (zwolniona z VAT): 
  - ❌ Do NOT file JPK_V7M/V7K
  - ✅ Generate other JPK files (FA, KR, PKPIR, MAG) only **on demand** from tax office

The UI must reflect this explicitly.

## Schema Update Strategy

**Strategy A: Schema Watcher + Releases** (recommended)

1. Store schemas in repo (XSD + notes)
2. Nightly/weekly job checks gov.pl for changes (hash/diff)
3. If new version detected → create issue/PR → update mapping + tests → release

**Implementation:**
- Schemas stored in `jpk/schemas/`
- Update checker runs in CI
- Version metadata tracked in `jpk/versions.json`

## File Types

### JPK_V7M / JPK_V7K (VAT Register)
- **Who**: VAT-active companies only
- **When**: Monthly (V7M) or Quarterly (V7K)
- **Contains**: Sales and purchase VAT registers with detailed codes
- **Schema**: Frequently updated by MF

### JPK_FA (Invoices)
- **Who**: All companies
- **When**: On demand from tax office
- **Contains**: Invoice details
- **Schema**: Stable

### JPK_KR (Full Accounting)
- **Who**: Spółka (companies with full accounting)
- **When**: On demand from tax office
- **Contains**: Complete ledger entries
- **Schema**: Complex, stable

### JPK_PKPIR (Tax Revenue Book)
- **Who**: JDG (sole proprietors) using simplified accounting
- **When**: On demand
- **Contains**: Revenue book entries

## Submission (Future)

MF "e-dokumenty" gateway:
- REST API for submission
- Authentication (qualified signature / trusted profile)
- Status polling (UPO / processing status)
- Test environment available

## Testing

Each mapper must have:
- Test fixtures: known invoices → expected XML fragments
- XSD validation tests
- Business rule validation tests
- Round-trip tests where applicable

## References

- Official schemas: https://www.gov.pl/web/kas/struktury-jpk
- JPK_V7 documentation: https://www.gov.pl/web/kas/jpk-vat
- e-dokumenty gateway: https://www.podatki.gov.pl/e-deklaracje/
