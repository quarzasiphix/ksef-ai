# Decisions as Legal Document Hierarchy
## Restructured System Design

### Core Concept
Decisions/Mandates are **legal documents** that sit between Resolutions (uchwały) and operational documents. They form a traceable chain of authority:

```
Uchwała (Resolution)
    ↓
Decyzja/Mandat (Decision with legal numbering)
    ↓
Dokumenty/Faktury/Umowy (Documents/Invoices/Contracts)
```

---

## Document Hierarchy

### Level 1: Uchwały (Resolutions)
**Example:** `Uchwała Nr 1/2024 Wspólników`
- Source of all authority
- Created by shareholders or board
- Broad strategic decisions
- Can create multiple decisions

### Level 2: Decyzje/Mandaty (Decisions/Mandates)
**Example:** `Decyzja §1.2.3 - Zgoda na umowy B2B do 50,000 PLN`
- Legal paragraph-style numbering
- Derived from specific resolution
- Operational authority grant
- Has scope, limits, validity period
- Can be referenced in documents

### Level 3: Operational Documents
**Example:** `Umowa B2B #2024/12/001 (§1.2.3)`
- Contracts, invoices, expenses
- Must reference authorizing decision
- Shows decision number on document
- Traceable back to resolution

---

## Decision Numbering System

### Format: `§[Resolution].[Category].[Sequence]`

#### Examples:
- `§1.1.1` - First operational decision from Resolution 1, Category 1
- `§1.2.3` - Third B2B contract decision from Resolution 1
- `§2.3.1` - First financing decision from Resolution 2

#### Category Codes:
1. **§X.1.Y** - Operational Activity (działalność operacyjna)
2. **§X.2.Y** - B2B Contracts (umowy B2B)
3. **§X.3.Y** - Sales & Services (sprzedaż i usługi)
4. **§X.4.Y** - Operational Costs (koszty operacyjne)
5. **§X.5.Y** - Company Financing (finansowanie)
6. **§X.6.Y** - Compensation (wynagrodzenia)
7. **§X.7.Y** - Custom Projects (projekty specjalne)
8. **§X.9.Y** - Other (inne)

#### Resolution Number (X):
- Increments with each new resolution
- Resets yearly or per term
- Example: Resolution 1/2024 → §1.x.x

---

## Database Schema Updates

### 1. Update Decisions Table
```sql
ALTER TABLE decisions 
  ADD COLUMN decision_number TEXT UNIQUE NOT NULL DEFAULT '§0.0.0',
  ADD COLUMN resolution_id UUID REFERENCES resolutions(id) ON DELETE SET NULL,
  ADD COLUMN parent_decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL,
  ADD COLUMN legal_reference TEXT, -- Full legal text reference
  ADD COLUMN scope_description TEXT, -- What this decision authorizes
  ADD COLUMN is_foundational BOOLEAN DEFAULT false; -- Auto-created vs user-created

-- Index for fast lookups by decision number
CREATE INDEX idx_decisions_number ON decisions(decision_number);
CREATE INDEX idx_decisions_resolution ON decisions(resolution_id);

-- Function to generate next decision number
CREATE OR REPLACE FUNCTION generate_decision_number(
  p_resolution_id UUID,
  p_category TEXT
) RETURNS TEXT AS $$
DECLARE
  v_resolution_number INTEGER;
  v_category_code INTEGER;
  v_sequence INTEGER;
BEGIN
  -- Get resolution number (from resolution table or parse)
  SELECT COALESCE(
    (SELECT number FROM resolutions WHERE id = p_resolution_id LIMIT 1),
    1
  ) INTO v_resolution_number;
  
  -- Map category to code
  v_category_code := CASE p_category
    WHEN 'operational_activity' THEN 1
    WHEN 'b2b_contracts' THEN 2
    WHEN 'sales_services' THEN 3
    WHEN 'operational_costs' THEN 4
    WHEN 'company_financing' THEN 5
    WHEN 'compensation' THEN 6
    WHEN 'custom_projects' THEN 7
    ELSE 9
  END;
  
  -- Get next sequence for this resolution + category
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(decision_number, '.', 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM decisions
  WHERE decision_number LIKE '§' || v_resolution_number || '.' || v_category_code || '.%';
  
  RETURN '§' || v_resolution_number || '.' || v_category_code || '.' || v_sequence;
END;
$$ LANGUAGE plpgsql;
```

### 2. Update Resolutions Table
```sql
ALTER TABLE resolutions
  ADD COLUMN resolution_number TEXT UNIQUE, -- e.g., "1/2024"
  ADD COLUMN resolution_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  ADD COLUMN sequence_in_year INTEGER;

-- Auto-generate resolution numbers
CREATE OR REPLACE FUNCTION generate_resolution_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_sequence INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM NEW.date);
  
  SELECT COALESCE(MAX(sequence_in_year), 0) + 1
  INTO v_sequence
  FROM resolutions
  WHERE resolution_year = v_year
    AND business_profile_id = NEW.business_profile_id;
  
  NEW.resolution_number := v_sequence || '/' || v_year;
  NEW.resolution_year := v_year;
  NEW.sequence_in_year := v_sequence;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_resolution_number
  BEFORE INSERT ON resolutions
  FOR EACH ROW
  EXECUTE FUNCTION generate_resolution_number();
```

### 3. Document Links Table (Enhanced)
```sql
-- Add decision reference to all document types
ALTER TABLE contracts ADD COLUMN decision_reference TEXT; -- e.g., "§1.2.3"
ALTER TABLE invoices ADD COLUMN decision_reference TEXT;
ALTER TABLE expenses ADD COLUMN decision_reference TEXT;
ALTER TABLE company_documents ADD COLUMN decision_reference TEXT;

-- Create view for document hierarchy
CREATE OR REPLACE VIEW document_hierarchy AS
SELECT 
  'contract' as doc_type,
  c.id as doc_id,
  c.number as doc_number,
  c.decision_id,
  c.decision_reference,
  d.decision_number,
  d.title as decision_title,
  d.resolution_id,
  r.resolution_number,
  r.title as resolution_title,
  c.business_profile_id
FROM contracts c
LEFT JOIN decisions d ON c.decision_id = d.id
LEFT JOIN resolutions r ON d.resolution_id = r.id

UNION ALL

SELECT 
  'invoice' as doc_type,
  i.id as doc_id,
  i.number as doc_number,
  i.decision_id,
  i.decision_reference,
  d.decision_number,
  d.title as decision_title,
  d.resolution_id,
  r.resolution_number,
  r.title as resolution_title,
  i.business_profile_id
FROM invoices i
LEFT JOIN decisions d ON i.decision_id = d.id
LEFT JOIN resolutions r ON d.resolution_id = r.id

UNION ALL

SELECT 
  'expense' as doc_type,
  e.id as doc_id,
  e.description as doc_number,
  e.decision_id,
  e.decision_reference,
  d.decision_number,
  d.title as decision_title,
  d.resolution_id,
  r.resolution_number,
  r.title as resolution_title,
  e.business_profile_id
FROM expenses e
LEFT JOIN decisions d ON e.decision_id = d.id
LEFT JOIN resolutions r ON d.resolution_id = r.id;
```

---

## UI Integration

### 1. DocumentsHub Structure
```
📁 Dokumenty Spółki
  ├── 📜 Uchwały (Resolutions)
  │   ├── Uchwała 1/2024 - Działalność operacyjna
  │   │   └── 📋 Decyzje (6 decisions)
  │   │       ├── §1.1.1 - Prowadzenie działalności
  │   │       │   └── 📄 Linked: 12 invoices, 5 contracts
  │   │       ├── §1.2.1 - Umowy B2B do 50k PLN
  │   │       │   └── 📄 Linked: 3 contracts
  │   │       └── ...
  │   └── Uchwała 2/2024 - Finansowanie
  │       └── 📋 Decyzje (3 decisions)
  │
  ├── 📁 Umowy (Contracts)
  │   └── Shows decision reference in list
  │
  └── 📁 Inne Dokumenty
```

### 2. Decision Card in DocumentsHub
```tsx
<DecisionCard>
  <DecisionNumber>§1.2.3</DecisionNumber>
  <DecisionTitle>Zgoda na umowy B2B do 50,000 PLN</DecisionTitle>
  <ResolutionLink>← Uchwała 1/2024</ResolutionLink>
  
  <Limits>
    <Limit>Max kwota: 50,000 PLN</Limit>
    <Limit>Okres: 2024-01-01 do 2024-12-31</Limit>
  </Limits>
  
  <LinkedDocuments>
    <Tab>Umowy (3)</Tab>
    <Tab>Faktury (12)</Tab>
    <Tab>Wydatki (0)</Tab>
  </LinkedDocuments>
  
  <UsageBar>
    <Progress value={35000} max={50000} />
    <Text>35,000 / 50,000 PLN wykorzystane (70%)</Text>
  </UsageBar>
</DecisionCard>
```

### 3. Contract/Invoice Form
```tsx
<FormSection title="Podstawa prawna">
  <DecisionSelector
    businessProfileId={businessProfileId}
    value={decisionId}
    onChange={handleDecisionChange}
    categoryFilter="b2b_contracts"
  />
  
  {selectedDecision && (
    <DecisionPreview>
      <Badge>§{selectedDecision.decision_number}</Badge>
      <Text>{selectedDecision.title}</Text>
      <Link to={`/decisions/${selectedDecision.id}`}>
        Zobacz szczegóły mandatu
      </Link>
      <Alert>
        Limit: {selectedDecision.amount_limit_pln} PLN
        Wykorzystano: {selectedDecision.usage_amount} PLN
        Pozostało: {selectedDecision.amount_limit_pln - selectedDecision.usage_amount} PLN
      </Alert>
    </DecisionPreview>
  )}
</FormSection>
```

### 4. Document Display (PDF/View)
```
┌─────────────────────────────────────────┐
│ UMOWA B2B #2024/12/001                  │
│                                         │
│ Podstawa prawna:                        │
│ Decyzja §1.2.3                         │
│ "Zgoda na umowy B2B do 50,000 PLN"     │
│ (Uchwała 1/2024 Wspólników)            │
│                                         │
│ Strony umowy:                           │
│ ...                                     │
└─────────────────────────────────────────┘
```

---

## Migration Strategy

### Phase 1: Add Numbering System
1. Add `decision_number` and `resolution_number` columns
2. Create auto-numbering functions
3. Migrate existing decisions to numbered format
4. Update foundational decisions with proper numbers

### Phase 2: Link Resolutions
1. Ensure all decisions have `resolution_id`
2. For foundational decisions, create "Uchwała Założycielska" (Founding Resolution)
3. Update UI to show resolution links

### Phase 3: Integrate into DocumentsHub
1. Add "Decyzje" section to DocumentsHub
2. Show decision tree under each resolution
3. Display linked documents under each decision
4. Add decision reference to document cards

### Phase 4: Update Forms
1. Show decision number in picker
2. Display decision preview with limits
3. Add decision reference to generated PDFs
4. Validate against decision limits before save

---

## Example Data Flow

### Creating a Contract:
1. User selects business profile
2. System loads active decisions for profile
3. User selects: **§1.2.3 - Umowy B2B do 50k PLN**
4. Form shows:
   - Decision title
   - Remaining limit: 15,000 PLN
   - Valid until: 2024-12-31
5. User enters contract amount: 10,000 PLN
6. System validates: ✓ Within limit
7. Contract saved with:
   - `decision_id` → UUID of decision
   - `decision_reference` → "§1.2.3"
8. Decision usage updated: +10,000 PLN

### Viewing in DocumentsHub:
```
📜 Uchwała 1/2024
  └── §1.2.3 - Umowy B2B do 50k PLN
      ├── Umowa #2024/12/001 - 10,000 PLN
      ├── Umowa #2024/12/002 - 15,000 PLN
      └── Umowa #2024/12/003 - 10,000 PLN
      
      Total: 35,000 / 50,000 PLN (70%)
```

---

## Benefits of This Approach

1. **Legal Traceability:** Every document traces to resolution via decision number
2. **Professional Numbering:** Legal paragraph style (§) looks professional
3. **Easy Reference:** "This contract is authorized under §1.2.3"
4. **Integrated Documents:** Decisions are documents, not separate entities
5. **Clear Hierarchy:** Resolution → Decision → Documents
6. **Audit Trail:** Full chain of authority visible
7. **Compliance:** Meets corporate governance requirements

---

## Next Steps

1. **Database Migration:** Add numbering columns and functions
2. **Update Types:** Add `decision_number`, `resolution_number` to TypeScript types
3. **Migrate Data:** Assign numbers to existing decisions and resolutions
4. **Update DecisionsHub:** Show as part of DocumentsHub with tree view
5. **Update Forms:** Display decision numbers and references
6. **PDF Generation:** Include decision reference on documents
