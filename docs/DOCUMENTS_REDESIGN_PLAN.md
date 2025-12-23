# Dokumenty System Redesign - Comprehensive Plan

## Vision

Transform the contracts/umowy page into a comprehensive **Dokumenty** hub for spółki that:
1. Separates transactional contracts (money-related) from informational documents
2. Consolidates all document management into one place
3. Provides in-app document generation with PDF export
4. Integrates Supabase bucket storage for external PDFs
5. Auto-fills spółka data into documents
6. Supports folder organization and search

## Current State Analysis

### Existing Pages to Consolidate
1. **`/contracts`** - Basic contract management (JDG-focused)
2. **`/spolka/documents`** - File upload by category (księgowość-style)
3. **`/spolka/resolutions`** - Uchwały management
4. **`/spolka/registry`** - KRS forms and compliance

### Problems with Current Structure
- Documents scattered across multiple pages
- No clear separation between transactional vs informational
- Contract page is too simple for spółka needs
- No in-app document editor
- No PDF generation from database documents
- Księgowość has documents that aren't accounting-related

## New Architecture

### Page Structure: `/dokumenty` (Replaces `/contracts`)

```
/dokumenty
├── Transactional Contracts (Money-related)
│   ├── Private Pay-Out Contracts (Wydatki)
│   │   └── Employment contracts, service contracts, leases
│   └── Private Pay-In Contracts (Przychody)
│       └── Sales contracts, client agreements
│
├── Company Documents (Informational)
│   ├── Umowy Spółki (Company Agreements)
│   │   └── Shareholder agreements, partnership docs
│   ├── Uchwały (Resolutions)
│   │   ├── Board resolutions
│   │   └── Shareholder resolutions
│   ├── Korespondencja Sądowa (Court Correspondence)
│   │   └── KRS notifications, court letters
│   ├── Deklaracje i Oświadczenia (Declarations)
│   │   └── NIP-8, VAT-R, CIT declarations
│   ├── Dokumenty KRS (KRS Papers)
│   │   └── Registration docs, amendments
│   └── Licencje i Zezwolenia (Licenses)
│
└── Templates & Generator
    ├── Pre-built templates (Board resolutions, contracts, etc.)
    └── Custom templates
```

### Document Type Taxonomy

#### Transactional Documents (Link to Accounting)
```typescript
type TransactionalDocumentType = 
  | 'employment_contract'      // Pay-out
  | 'service_contract_expense' // Pay-out
  | 'lease_expense'            // Pay-out
  | 'purchase_agreement'       // Pay-out
  | 'sales_contract'           // Pay-in
  | 'service_contract_income'  // Pay-in
  | 'lease_income';            // Pay-in

interface TransactionalContract {
  // Links to accounting
  payment_account_id?: string;
  expected_amount?: number;
  payment_frequency?: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  next_payment_date?: Date;
  
  // Contract details
  counterparty_id: string;
  contract_value: number;
  currency: string;
}
```

#### Informational Documents (No accounting link)
```typescript
type InformationalDocumentType =
  | 'company_agreement'        // Umowy spółki
  | 'board_resolution'         // Uchwały zarządu
  | 'shareholder_resolution'   // Uchwały wspólników
  | 'court_correspondence'     // Korespondencja sądowa
  | 'krs_document'            // Dokumenty KRS
  | 'tax_declaration'         // Deklaracje podatkowe
  | 'license'                 // Licencje
  | 'power_of_attorney'       // Pełnomocnictwa
  | 'board_minutes'           // Protokoły
  | 'other_informational';

interface InformationalDocument {
  // No accounting links
  document_number?: string;
  issue_date: Date;
  expiry_date?: Date;
  related_entity?: string; // Board member, shareholder, etc.
  legal_basis?: string;
}
```

## UI Components

### 1. Main Dokumenty Hub
```
┌─────────────────────────────────────────────────────────┐
│ 📄 Dokumenty Spółki                          [+ Nowy]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────┐  ┌──────────────────────────────────┐  │
│ │ 📁 Folders  │  │  Document List / Grid View       │  │
│ │             │  │                                   │  │
│ │ Transactional│  │  [Search & Filters]              │  │
│ │ ├─ Pay-Out  │  │                                   │  │
│ │ └─ Pay-In   │  │  ┌────────────────────────────┐  │  │
│ │             │  │  │ Document Card              │  │  │
│ │ Informational│  │  │ - Title                   │  │  │
│ │ ├─ Umowy    │  │  │ - Type badge              │  │  │
│ │ ├─ Uchwały  │  │  │ - Date                    │  │  │
│ │ ├─ KRS      │  │  │ - [View] [Edit] [PDF]     │  │  │
│ │ ├─ Deklaracje│ │  └────────────────────────────┘  │  │
│ │ └─ Licencje │  │                                   │  │
│ │             │  │  ┌────────────────────────────┐  │  │
│ │ Templates   │  │  │ Another Document...        │  │  │
│ │ ├─ Zarząd   │  │  └────────────────────────────┘  │  │
│ │ └─ Custom   │  │                                   │  │
│ └─────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2. Document Generator Modal
```
┌─────────────────────────────────────────────────────────┐
│ Generuj Dokument                                [X]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 1. Wybierz szablon:                                     │
│    [Dropdown: Uchwała Zarządu, Protokół, Umowa...]     │
│                                                          │
│ 2. Wypełnij dane:                                       │
│    ┌──────────────────────────────────────────────┐    │
│    │ Nazwa spółki: [Auto-filled from profile]     │    │
│    │ Data: [Date picker]                          │    │
│    │ Numer dokumentu: [Auto-generated]            │    │
│    │                                               │    │
│    │ [Rich text editor for content]               │    │
│    │                                               │    │
│    └──────────────────────────────────────────────┘    │
│                                                          │
│ 3. Podgląd:                                             │
│    [Live preview of document with spółka letterhead]   │
│                                                          │
│ [Zapisz w bazie] [Eksportuj PDF] [Zapisz i PDF]       │
└─────────────────────────────────────────────────────────┘
```

### 3. Bucket Viewer & Uploader
```
┌─────────────────────────────────────────────────────────┐
│ Przesyłanie plików                              [X]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [Drag & Drop Area]                                      │
│ Przeciągnij pliki PDF tutaj lub kliknij aby wybrać     │
│                                                          │
│ Kategoria: [Dropdown]                                   │
│ Folder: [Dropdown with folder tree]                    │
│ Tytuł: [Input]                                          │
│ Data dokumentu: [Date]                                  │
│ Data wygaśnięcia: [Date]                               │
│ Numer referencyjny: [Input]                            │
│ Tagi: [Tag input]                                       │
│                                                          │
│ [Prześlij]                                              │
└─────────────────────────────────────────────────────────┘
```

## Database Schema Updates

### Enhanced Contracts Table
```sql
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  document_category TEXT CHECK (document_category IN (
    'transactional_payout',
    'transactional_payin',
    'informational'
  ));

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  is_transactional BOOLEAN DEFAULT false;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  payment_account_id UUID REFERENCES payment_accounts(id);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  expected_amount DECIMAL(15,2);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  payment_frequency TEXT CHECK (payment_frequency IN (
    'one_time', 'monthly', 'quarterly', 'annual'
  ));

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  next_payment_date DATE;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  auto_generate_invoices BOOLEAN DEFAULT false;
```

### Document Generation Settings
```sql
CREATE TABLE IF NOT EXISTS document_generation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  -- Letterhead settings
  use_letterhead BOOLEAN DEFAULT true,
  letterhead_logo_url TEXT,
  
  -- Auto-fill data
  default_signatory TEXT,
  default_legal_basis TEXT,
  
  -- Numbering
  resolution_counter INTEGER DEFAULT 0,
  contract_counter INTEGER DEFAULT 0,
  document_counter INTEGER DEFAULT 0,
  
  -- PDF settings
  pdf_page_size TEXT DEFAULT 'A4',
  pdf_margins JSONB DEFAULT '{"top": 20, "right": 20, "bottom": 20, "left": 20}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [x] Database schema for folders, templates, generated docs
- [x] Repository functions
- [x] TypeScript types
- [ ] Migrate existing contracts to new schema
- [ ] Add document_category to existing contracts

### Phase 2: Document Generator (Week 2)
- [ ] Install react-pdf/renderer for PDF generation
- [ ] Create DocumentGenerator component
- [ ] Implement template variable substitution
- [ ] Add rich text editor (TipTap or similar)
- [ ] Auto-fill spółka data
- [ ] PDF export without bucket storage
- [ ] Preview modal

### Phase 3: Unified Dokumenty Page (Week 3)
- [ ] Create new `/dokumenty` route
- [ ] Build folder tree sidebar
- [ ] Implement document list/grid view
- [ ] Add search and filters
- [ ] Migrate Documents.tsx content
- [ ] Migrate Resolutions.tsx content
- [ ] Integrate CompanyRegistry forms

### Phase 4: Bucket Integration (Week 4)
- [ ] Bucket upload component
- [ ] PDF viewer/preview
- [ ] File management (rename, move, delete)
- [ ] Bulk operations
- [ ] Tag management
- [ ] Advanced search

### Phase 5: Transactional Contracts (Week 5)
- [ ] Link contracts to payment accounts
- [ ] Payment schedule tracking
- [ ] Auto-generate invoices from contracts
- [ ] Contract renewal reminders
- [ ] Financial reporting integration

### Phase 6: KSeF Integration Planning (Week 6)
- [ ] Research KSeF API requirements
- [ ] Design invoice submission workflow
- [ ] Plan authentication/credentials storage
- [ ] Design status tracking system
- [ ] Plan error handling and retries

## KSeF Integration Architecture (Preliminary)

### What is KSeF?
Krajowy System e-Faktur - Polish national e-invoicing system (mandatory from 2024)

### Integration Requirements
1. **Authentication**
   - Token-based auth with Ministry of Finance
   - Store credentials securely (encrypted)
   - Token refresh mechanism

2. **Invoice Submission**
   - Convert invoice to KSeF XML format (FA_VAT schema)
   - Submit via REST API
   - Receive KSeF reference number
   - Store submission status

3. **Status Tracking**
   - Poll for acceptance/rejection
   - Handle corrections
   - Store KSeF invoice number (KSeF ID)

4. **Document Retrieval**
   - Fetch invoices from KSeF
   - Import into system
   - Match with existing invoices

### Proposed Database Schema
```sql
CREATE TABLE ksef_credentials (
  id UUID PRIMARY KEY,
  business_profile_id UUID REFERENCES business_profiles(id),
  nip TEXT NOT NULL,
  token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  environment TEXT CHECK (environment IN ('test', 'production')),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE ksef_submissions (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  business_profile_id UUID REFERENCES business_profiles(id),
  
  submission_date TIMESTAMPTZ DEFAULT now(),
  ksef_reference_number TEXT,
  ksef_invoice_number TEXT, -- KSeF ID
  
  status TEXT CHECK (status IN (
    'pending', 'submitted', 'accepted', 'rejected', 'corrected'
  )),
  
  xml_payload TEXT,
  error_message TEXT,
  
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);
```

### Edge Function: `ksef-submit-invoice`
```typescript
// Pseudocode
async function submitToKSeF(invoiceId: string) {
  // 1. Get invoice data
  const invoice = await getInvoice(invoiceId);
  
  // 2. Get KSeF credentials
  const creds = await getKSeFCredentials(invoice.business_profile_id);
  
  // 3. Convert to KSeF XML format
  const xml = convertToKSeFXML(invoice);
  
  // 4. Submit to KSeF API
  const response = await fetch('https://ksef.mf.gov.pl/api/...', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${creds.token}`,
      'Content-Type': 'application/xml'
    },
    body: xml
  });
  
  // 5. Store submission record
  await createKSeFSubmission({
    invoice_id: invoiceId,
    ksef_reference_number: response.referenceNumber,
    status: 'submitted',
    xml_payload: xml
  });
  
  // 6. Poll for status (webhook or polling)
  // ...
}
```

## Additional Spółka Features

### 1. Board Member Management
- Track board composition
- Link contracts to board members
- Manage terms and appointments
- Generate board resolutions

### 2. Shareholder Registry
- Track share ownership
- Capital changes history
- Dividend distributions
- Generate shareholder resolutions

### 3. Compliance Calendar
- Track filing deadlines (CIT, annual reports)
- KRS update reminders
- License renewal dates
- Contract expiry alerts

### 4. Financial Reporting
- Automatic P&L generation
- Balance sheet
- Cash flow statement
- CIT calculation

### 5. Document Approval Workflows
- Multi-level approval for resolutions
- Electronic signatures
- Audit trail
- Version control

## Migration Strategy

### Step 1: Data Migration
```sql
-- Add new columns to existing contracts
UPDATE contracts 
SET document_category = 'informational'
WHERE contract_type IN ('general', 'nda', 'partnership');

UPDATE contracts 
SET document_category = 'transactional_payout',
    is_transactional = true
WHERE contract_type IN ('employment', 'service', 'lease');
```

### Step 2: Move Existing Pages
1. Keep `/contracts` route but redirect to `/dokumenty`
2. Move Documents.tsx content to new unified page
3. Integrate Resolutions as a tab/section
4. Merge CompanyRegistry forms

### Step 3: User Communication
- In-app notification about new Dokumenty page
- Quick tour/tutorial
- Migration guide in docs

## Success Metrics

1. **User Adoption**
   - 80% of spółka users using Dokumenty within 1 month
   - Average 10+ documents per spółka

2. **Efficiency**
   - 50% reduction in time to create documents
   - 90% of documents use templates

3. **Compliance**
   - 100% of resolutions properly numbered
   - All KRS documents organized and accessible

4. **Integration**
   - KSeF submission success rate > 95%
   - Average submission time < 30 seconds

## Next Immediate Actions

1. ✅ Create this plan document
2. [ ] Review and approve architecture
3. [ ] Set up react-pdf/renderer
4. [ ] Create DocumentGenerator component
5. [ ] Build unified Dokumenty page layout
6. [ ] Implement PDF export
7. [ ] Test with real spółka data
