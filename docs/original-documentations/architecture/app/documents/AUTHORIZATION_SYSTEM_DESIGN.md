# Authorization & Responsibility System Architecture

## Strategic Positioning

**From**: "Accounting app that happens to do governance"  
**To**: **"System odpowiedzialności i rozliczalności firmy"**

This is not a feature—it's the **core differentiator** against Infakt, wFirma, Symfonia.

**They manage documents. You manage legitimacy.**

---

## A) Core Concept: Authorization Primitive

Every irreversible or sensitive action references an **authorization source**.

### Unified Authorization Model

```typescript
interface Authorization {
  id: string;
  type: 'decision' | 'contract' | 'policy' | 'consent';
  ref_id: string; // UUID of decision/contract/policy
  ref_type: string; // 'decision', 'contract', 'internal_policy'
  
  // What this authorizes
  scope: {
    action_types: string[]; // ['kasa_create', 'invoice_approve', 'expense_create']
    amount_limit?: number;
    currency?: string;
    valid_from: Date;
    valid_to?: Date;
    counterparties?: string[]; // Allowed entities
    categories?: string[]; // Expense/invoice categories
  };
  
  // Approval state
  required_signatures: number;
  current_signatures: number;
  status: 'pending' | 'approved' | 'active' | 'expired' | 'revoked';
  
  // Metadata
  title: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}
```

### Actions That Consume Authorization

| Action | Authorization Type | Example |
|--------|-------------------|---------|
| Kasa creation | Decision | "Zgoda na zarządzanie kasą" |
| Invoice approval | Decision | "Zgoda na sprzedaż produktów i usług" |
| Expense creation | Decision | "Zgoda na koszty operacyjne" |
| Asset disposal | Decision | "Zgoda na zbycie majątku" |
| Capital event | Decision | "Uchwała o podwyższeniu kapitału" |
| High-value payment | Decision | "Zgoda na płatności powyżej 50k PLN" |
| Contract signing | Contract | Existing contract framework |
| Policy enforcement | Policy | Internal compliance rules |

---

## B) Fire Features

### 1. "Why is this allowed?" Button (Killer Feature)

**Component**: `AuthorizationExplainer`

Every important action gets a context card:

```tsx
<AuthorizationExplainer actionType="kasa_create" entityId={kasaId}>
  {/* Renders: */}
  <Card className="border-blue-200 bg-blue-50">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-blue-600" />
        <CardTitle className="text-base">Dlaczego ta operacja jest dozwolona?</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div>
        <p className="text-sm font-medium">Uchwała:</p>
        <p className="text-sm text-muted-foreground">"Zgoda na zarządzanie kasą"</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium">Data zatwierdzenia:</p>
          <p className="text-muted-foreground">12.12.2025</p>
        </div>
        <div>
          <p className="font-medium">Podpisy:</p>
          <Badge variant="outline" className="text-green-600">2/2</Badge>
        </div>
      </div>
      
      <div>
        <p className="font-medium text-sm">Status:</p>
        <Badge className="bg-green-600">Aktywna</Badge>
      </div>
      
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Zakres: Operacje kasowe do 10 000 PLN
        </p>
        <p className="text-xs text-muted-foreground">
          Ważność: do 31.12.2026
        </p>
      </div>
      
      <Button variant="ghost" size="sm" className="w-full">
        <FileText className="h-4 w-4 mr-2" />
        Zobacz pełną uchwałę
      </Button>
    </CardContent>
  </Card>
</AuthorizationExplainer>
```

**Usage**:
- Invoice details page
- Expense approval dialog
- Kasa creation form
- Asset disposal screen
- Payment confirmation

**Value**:
- ✅ Auditors love it
- ✅ Accountants trust it
- ✅ Founders understand it
- ✅ Future disputes = resolved

---

### 2. Decision Scope Enforcement (Auto-Blocking)

**Active validation** against decision scope:

```typescript
interface DecisionScope {
  amount_limit?: number;
  currency?: string;
  valid_from: Date;
  valid_to?: Date;
  allowed_categories?: string[];
  allowed_counterparties?: string[];
}

// Enforcement function
function validateAgainstDecision(
  action: Action,
  decision: Decision
): ValidationResult {
  const scope = decision.scope_description; // Parse from JSONB
  
  // Check amount
  if (scope.amount_limit && action.amount > scope.amount_limit) {
    return {
      allowed: false,
      reason: 'amount_exceeded',
      message: `Przekracza limit uchwały "${decision.title}" (${scope.amount_limit} ${scope.currency})`,
      decision_id: decision.id,
    };
  }
  
  // Check date range
  if (scope.valid_to && new Date() > new Date(scope.valid_to)) {
    return {
      allowed: false,
      reason: 'decision_expired',
      message: `Uchwała "${decision.title}" wygasła ${formatDate(scope.valid_to)}`,
      decision_id: decision.id,
    };
  }
  
  // Check category
  if (scope.allowed_categories && !scope.allowed_categories.includes(action.category)) {
    return {
      allowed: false,
      reason: 'category_not_allowed',
      message: `Kategoria "${action.category}" nie jest objęta uchwałą "${decision.title}"`,
      decision_id: decision.id,
    };
  }
  
  return { allowed: true };
}
```

**UI Examples**:

```tsx
// Invoice over limit
<Alert variant="destructive">
  <XCircle className="h-4 w-4" />
  <AlertTitle>❌ Operacja zablokowana</AlertTitle>
  <AlertDescription>
    Przekracza limit uchwały "Zgoda na zarządzanie kasą" (10 000 PLN)
    <Button variant="link" className="p-0 h-auto ml-2">
      Zobacz uchwałę
    </Button>
  </AlertDescription>
</Alert>

// Expense outside scope
<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>⚠️ Uwaga: poza zakresem</AlertTitle>
  <AlertDescription>
    Ta kategoria nie jest objęta żadną aktywną uchwałą.
    Wymaga dodatkowej zgody wspólników.
  </AlertDescription>
</Alert>

// Action after expiry
<Alert variant="destructive">
  <Clock className="h-4 w-4" />
  <AlertTitle>❌ Uchwała wygasła</AlertTitle>
  <AlertDescription>
    Uchwała "Zgoda na sprzedaż" wygasła 15.11.2025.
    Wymagana nowa uchwała przed kontynuowaniem.
  </AlertDescription>
</Alert>
```

---

### 3. Pending Authority Mode (Soft Blocking)

**Latent states** instead of hard errors:

```typescript
type EntityStatus = 
  | 'draft'           // User editing
  | 'pending_authority' // Waiting for decision/approval
  | 'active'          // Fully authorized
  | 'blocked'         // Hard stop (expired/revoked)
  | 'archived';

interface PendingAuthorityState {
  status: 'pending_authority';
  reason: 'missing_decision' | 'missing_signatures' | 'awaiting_approval';
  required_authorization?: {
    type: 'decision' | 'contract';
    title: string;
    action_needed: string;
  };
  can_proceed_with_draft: boolean;
}
```

**Examples**:

```tsx
// Invoice created without decision
<Card className="border-amber-200 bg-amber-50">
  <CardHeader>
    <Badge variant="outline" className="border-amber-500 text-amber-700">
      Oczekuje na uchwałę
    </Badge>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      Faktura zapisana jako szkic. Nie może być wystawiona bez:
    </p>
    <ul className="mt-2 space-y-1 text-sm">
      <li className="flex items-center gap-2">
        <Circle className="h-3 w-3 text-amber-600" />
        Uchwały zezwalającej na sprzedaż
      </li>
    </ul>
    <Button className="mt-3 w-full" variant="outline">
      Utwórz uchwałę
    </Button>
  </CardContent>
</Card>

// Kasa created without signature
<Alert variant="warning">
  <Clock className="h-4 w-4" />
  <AlertTitle>Kasa nieaktywna operacyjnie</AlertTitle>
  <AlertDescription>
    Wymaga podpisu wspólnika przed użyciem.
    <Button variant="link" className="p-0 h-auto ml-2">
      Wyślij do podpisu
    </Button>
  </AlertDescription>
</Alert>

// Asset added, pending approval
<Badge variant="outline" className="border-blue-500 text-blue-700">
  Nieaktywne operacyjnie
</Badge>
```

**Psychological benefits**:
- ✅ User can proceed (no frustration)
- ✅ System stays correct (no data corruption)
- ✅ Nothing breaks flow (progressive disclosure)

---

### 4. Decision Diff Viewer (Auditor Gold)

**Component**: `DecisionDiffViewer`

```tsx
<DecisionDiffViewer 
  fromVersion={versionId1} 
  toVersion={versionId2}
  amendmentId={amendmentId}
>
  <Card>
    <CardHeader>
      <CardTitle>Zmiany w uchwale (v2 → v3)</CardTitle>
      <p className="text-sm text-muted-foreground">
        Zmieniono: 15.12.2025 | Zatwierdzone: 2/2 wspólników
      </p>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Changed fields */}
      <div className="space-y-2">
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-xs font-medium text-red-900">Przed zmianą:</p>
          <p className="text-sm text-red-700">
            Limit: <span className="font-mono">10 000 PLN</span>
          </p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-xs font-medium text-green-900">Po zmianie:</p>
          <p className="text-sm text-green-700">
            Limit: <span className="font-mono">15 000 PLN</span>
          </p>
        </div>
      </div>
      
      {/* Justification */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-xs font-medium text-blue-900">Uzasadnienie:</p>
        <p className="text-sm text-blue-700">
          Zwiększenie limitu ze względu na wzrost kosztów operacyjnych
        </p>
      </div>
      
      {/* Signed document */}
      <Button variant="outline" className="w-full">
        <FileText className="h-4 w-4 mr-2" />
        Pobierz podpisany dokument zmiany
      </Button>
      
      {/* Approvals */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Zatwierdzenia:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Jan Kowalski</span>
            <span className="text-muted-foreground">15.12.2025 14:30</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Anna Nowak</span>
            <span className="text-muted-foreground">15.12.2025 15:45</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</DecisionDiffViewer>
```

**Features**:
- ✅ Visual diff (red/green highlighting)
- ✅ Justification display
- ✅ Signed amendment PDF link
- ✅ Approval timeline
- ✅ Hash verification status

---

## C) UX Shifts for Perceived Intelligence

### 1. Intent-Aware Actions (Replace "Save")

**Current**: Generic "Zapisz" everywhere  
**Better**: Context-specific CTAs

```tsx
// Decision creation
<Button>Zapisz szkic</Button>
<Button>Wyślij do zatwierdzenia</Button>

// Amendment proposal
<Button>Złóż wniosek o zmianę</Button>
<Button>Anuluj wniosek</Button>

// Invoice
<Button>Zapisz jako szkic</Button>
<Button>Zatwierdź i zablokuj</Button>
<Button>Wyślij do klienta</Button>

// Expense
<Button>Zapisz szkic</Button>
<Button>Wyślij do akceptacji</Button>

// Version publishing
<Button>Opublikuj wersję {versionNumber}</Button>
```

**Psychological impact**:
- User feels **guided**, not responsible for correctness
- System communicates **intent**, not just mechanics
- Reduces **cognitive load** ("what should I do next?")

---

### 2. Sidebar: Visual Risk & Authority Encoding

**Shield icon color coding**:

```tsx
<SidebarMenuItem>
  <Shield className={cn(
    "h-4 w-4",
    authStatus === 'active' && "text-green-600",
    authStatus === 'pending' && "text-amber-600",
    authStatus === 'blocked' && "text-red-600"
  )} />
  <span>Decyzje</span>
  {pendingCount > 0 && (
    <Badge variant="outline" className="ml-auto">
      {pendingCount} wymaga uwagi
    </Badge>
  )}
</SidebarMenuItem>

<SidebarMenuItem>
  <Wallet className="h-4 w-4" />
  <span>Kasa</span>
  {!hasKasaConsent && (
    <Badge variant="destructive" className="ml-auto text-xs">
      Brak zgody
    </Badge>
  )}
</SidebarMenuItem>
```

**Status badges on sections**:
- 🟢 Green shield = Fully authorized
- 🟡 Amber shield = Pending approvals
- 🔴 Red shield = Blocked / expired

**Section-level warnings**:
- "Decyzje (1 wymaga uwagi)"
- "Kasa (brak zgody)"
- "Faktury (2 oczekują na uchwałę)"

**Result**: Sidebar becomes a **compliance radar**

---

### 3. Event Log → Narrative Mode

**Current**: Flat list of events  
**Better**: Grouped cause → effect chains

```tsx
<EventChainViewer>
  <EventGroup collapsed={false}>
    <EventGroupHeader>
      <FileText className="h-4 w-4" />
      <span>Utworzono fakturę #2025/12/001</span>
      <ChevronDown className="h-4 w-4 ml-auto" />
    </EventGroupHeader>
    
    <EventGroupContent className="ml-6 border-l-2 border-blue-200 pl-4 space-y-2">
      <EventItem>
        <AlertCircle className="h-3 w-3 text-amber-600" />
        <span className="text-sm">Wymagała zgody</span>
        <span className="text-xs text-muted-foreground">12.12.2025 10:00</span>
      </EventItem>
      
      <EventItem>
        <Link2 className="h-3 w-3 text-blue-600" />
        <span className="text-sm">Powiązana z uchwałą "Zgoda na sprzedaż"</span>
        <span className="text-xs text-muted-foreground">12.12.2025 10:05</span>
      </EventItem>
      
      <EventItem>
        <CheckCircle2 className="h-3 w-3 text-green-600" />
        <span className="text-sm">Zatwierdzona przez Jan Kowalski</span>
        <span className="text-xs text-muted-foreground">12.12.2025 14:30</span>
      </EventItem>
      
      <EventItem>
        <Database className="h-3 w-3 text-green-600" />
        <span className="text-sm">Zaksięgowana</span>
        <span className="text-xs text-muted-foreground">12.12.2025 14:31</span>
      </EventItem>
    </EventGroupContent>
  </EventGroup>
</EventChainViewer>
```

**Features**:
- ✅ Collapsible groups
- ✅ Visual hierarchy (indentation + border)
- ✅ Cause → effect arrows
- ✅ Icon coding (alert, link, check, database)

**Result**: Logs become **explanations**, not noise

---

## D) Strategic Shift: Mental Model

### From "Accounting App" to "System Odpowiedzialności"

**Old positioning**:
- "Księgowość online"
- "Fakturowanie i KSeF"
- "Zarządzanie finansami"

**New positioning**:
- **"System odpowiedzialności i rozliczalności firmy"**
- "Każda operacja ma podstawę prawną"
- "Pełna audytowalność i zgodność"

**Why this wins**:

| Competitor | What they do | What you do |
|------------|--------------|-------------|
| Infakt | Manage invoices | Manage legitimacy |
| wFirma | Track expenses | Track authority |
| Symfonia | Store documents | Prove compliance |

**Core differentiators**:
1. ✅ KSeF layer (legal requirement)
2. ✅ Agreement before state submission
3. ✅ Decisions as authority source
4. ✅ Signatures as proof
5. ✅ Audit log as truth

---

## E) "Wow" Feature: Company Readiness Score

**Component**: `CompanyReadinessCard`

```tsx
<Card className="border-2">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Gotowość firmy</CardTitle>
      <Badge className="text-lg px-3 py-1 bg-green-600">
        92%
      </Badge>
    </div>
    <p className="text-sm text-muted-foreground">
      Twoja firma jest prawie w pełni zgodna
    </p>
  </CardHeader>
  
  <CardContent className="space-y-3">
    {/* Checklist */}
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>Decyzje aktualne</span>
        <Badge variant="outline" className="ml-auto">5/5</Badge>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>Zgody ważne</span>
        <Badge variant="outline" className="ml-auto">3/3</Badge>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span>1 uchwała wygasa za 14 dni</span>
        <Button variant="ghost" size="sm" className="ml-auto p-0 h-auto">
          Odnów
        </Button>
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <XCircle className="h-4 w-4 text-red-600" />
        <span>Brak zgody na operację kasową</span>
        <Button variant="ghost" size="sm" className="ml-auto p-0 h-auto">
          Dodaj
        </Button>
      </div>
    </div>
    
    {/* Progress bar */}
    <div className="space-y-1">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-green-600" style={{ width: '92%' }} />
      </div>
      <p className="text-xs text-muted-foreground text-right">
        8% do pełnej zgodności
      </p>
    </div>
    
    {/* CTA */}
    <Button className="w-full" variant="outline">
      <Shield className="h-4 w-4 mr-2" />
      Pokaż szczegóły
    </Button>
  </CardContent>
</Card>
```

**Scoring logic**:

```typescript
interface ReadinessScore {
  total: number; // 0-100
  breakdown: {
    decisions: {
      score: number;
      active: number;
      total: number;
      expiring_soon: number;
    };
    consents: {
      score: number;
      valid: number;
      required: number;
    };
    signatures: {
      score: number;
      signed: number;
      pending: number;
    };
    compliance: {
      score: number;
      issues: string[];
    };
  };
}

function calculateReadinessScore(company: Company): ReadinessScore {
  const decisions = getActiveDecisions(company.id);
  const expiringSoon = decisions.filter(d => 
    d.valid_to && daysBetween(new Date(), d.valid_to) < 30
  );
  
  const decisionsScore = (decisions.length / getRequiredDecisions(company).length) * 100;
  const consentsScore = (getValidConsents(company.id).length / getRequiredConsents(company).length) * 100;
  const signaturesScore = (getSignedDocuments(company.id).length / getTotalDocuments(company.id).length) * 100;
  
  const total = (decisionsScore + consentsScore + signaturesScore) / 3;
  
  return {
    total: Math.round(total),
    breakdown: {
      decisions: {
        score: decisionsScore,
        active: decisions.length,
        total: getRequiredDecisions(company).length,
        expiring_soon: expiringSoon.length,
      },
      // ... etc
    },
  };
}
```

**Why this is Hormozi-level clarity**:
- ✅ Single number (92%) = instant understanding
- ✅ Actionable items = clear next steps
- ✅ Progress bar = gamification
- ✅ Color coding = visual hierarchy
- ✅ One-click fixes = reduced friction

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. ✅ Create `authorizations` table
2. ✅ Migrate existing decisions to authorization model
3. ✅ Build `AuthorizationExplainer` component
4. ✅ Add scope enforcement validation

### Phase 2: Core Features (Week 3-4)
1. ✅ Implement pending authority mode
2. ✅ Build decision diff viewer
3. ✅ Update all CTAs to intent-aware
4. ✅ Add sidebar risk encoding

### Phase 3: Intelligence Layer (Week 5-6)
1. ✅ Create narrative event log
2. ✅ Build Company Readiness Score
3. ✅ Add auto-blocking for scope violations
4. ✅ Implement "Why is this allowed?" everywhere

### Phase 4: Polish & Launch (Week 7-8)
1. ✅ Documentation and training
2. ✅ Marketing materials emphasizing legitimacy
3. ✅ Onboarding flow highlighting compliance
4. ✅ Case studies for auditors/accountants

---

## Success Metrics

**Quantitative**:
- Time to resolve audit queries: -70%
- User confidence score: +40%
- Compliance violation rate: -90%
- Decision creation rate: +50%

**Qualitative**:
- "I trust this system" (user feedback)
- "This is auditor-grade" (accountant testimonials)
- "Finally, clarity" (founder quotes)

---

## Competitive Moat

This system creates a **compliance graph**, not a CRUD app.

**Network effects**:
- More decisions → better enforcement
- More events → clearer narrative
- More signatures → stronger proof
- More audits → higher trust

**Switching costs**:
- Entire authorization history locked in
- Audit trail becomes company memory
- Compliance becomes muscle memory

**No competitor can copy this easily** because it requires:
1. Deep understanding of Polish corporate law
2. Event-sourced architecture
3. Signature verification infrastructure
4. Immutable versioning system

You're not building features. **You're building legitimacy infrastructure.**
