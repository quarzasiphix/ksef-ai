# Sidebar Redesign: Task-Oriented Control Panel

## Core Diagnosis

The current sidebar has three fundamental problems:

1. **Mixed mental models** - Money flow, legal structure, operations, and system settings are all mixed at the same visual weight
2. **Too many destinations** - Non-technical users don't think in destinations, they think in tasks: "check money", "send invoice", "see costs"
3. **No visual hierarchy** - Everything looks equally important, which creates cognitive stress

## New Mental Model

**Sidebar is NOT navigation. Sidebar is a control panel.**

The rule becomes:
> "If I click this, what job am I doing?"

Not:
> "What module am I entering?"

## Three-Zone Structure

### Zone 1: MONEY (Primary - Always Visible)
**Purpose**: Daily work, 80% of user activity  
**Visual treatment**: Green/blue accents, larger font (100%), more spacing

```
MONEY
Przepływ pieniędzy
────────────────────
📊 Księga (Ledger)    ← DEFAULT ENTRY, always at top
📄 Faktury
💸 Wydatki
🏦 Bank
💵 Kasa
📈 Analizy
```

**Why this works**:
- Księga becomes the truth layer (strongest concept)
- Faktury & Wydatki feel like subsets of money, not separate worlds
- Grandma logic: "tu są pieniądze"

**UX tweaks**:
- Slightly larger font
- More vertical spacing
- Subtle green accent on hover/active
- Ledger always at top

### Zone 2: STRUCTURE (Legal & Compliance - Collapsed by Default)
**Purpose**: Reference & compliance, not daily actions  
**Visual treatment**: Grey/neutral colors, smaller font (85%), less visual weight

```
STRUCTURE
Formalności i dokumenty
────────────────────────
🏢 Firma (overview)
📑 Dokumenty
⚖️ Decyzje
🏛️ Rejestr spółki
📦 Majątek
```

**Why this works**:
- These are not daily actions
- Should never visually compete with money
- Collapsed by default to reduce cognitive load

**UX rules**:
- Collapsed by default
- Expand only when clicked
- Smaller icons + lighter color

### Zone 3: OPERATIONS (Business Activity - Collapsed by Default)
**Purpose**: Business activity that feeds money  
**Visual treatment**: Warm neutral colors (violet/amber), medium font (90%)

```
OPERATIONS
Działanie firmy
────────────────
👥 Klienci
📦 Produkty
👷 Pracownicy
📬 Skrzynka
🏬 Magazyn
```

**Why this works**:
- These feed money, but are not money
- Contracts live here, but appear inside the ledger as events
- Clear separation from financial reality

### Zone 4: SYSTEM (Always Last - Minimal)
**Purpose**: Settings and help  
**Visual treatment**: Greyed out, smallest font (80%)

```
SYSTEM
────────
⚙️ Ustawienia
❓ Pomoc
```

## Visual Hierarchy Rules

### Font Sizing
- **MONEY**: 100% (base font)
- **OPERATIONS**: 90%
- **STRUCTURE**: 85%
- **SYSTEM**: 80%

### Color Language
- **Money** → green / blue (active, positive)
- **Structure** → grey (neutral, reference)
- **Operations** → soft amber / violet (warm, activity)
- **System** → muted grey (minimal)

**No bright colors. No red in sidebar.**

## Behavior Improvements

### 1. Context Highlighting
When user is in:
- **Invoice** → highlight Faktury AND softly glow Księga
- **Expense** → highlight Wydatki AND Księga
- **Ledger** → only Księga

This reinforces: **"Everything flows through the ledger."**

### 2. Progressive Disclosure
- Only MONEY expanded by default
- Others collapse automatically
- Remember user preference
- Grandma rule: "If I didn't ask for it, don't show it."

### 3. Action Hints (Microcopy)
Add subtle hints under section titles:

```
MONEY
Przepływ pieniędzy

STRUCTURE
Formalności i dokumenty

OPERATIONS
Działanie firmy
```

This massively helps non-technical users.

## Contracts Integration with Ledger

Contracts should:
1. **Live in OPERATIONS** (business activity)
2. **Appear in Księga** as:
   - Neutral events (amber/blue)
   - Anchors for invoices & expenses

**Ledger row example**:
```
📜 Umowa podpisana
UMW/2025/01 • Tovernet
```

- Click → opens contract
- Hover → shows related invoices & costs

This keeps contracts financially relevant, not abstract.

## Optional Advanced Features

### 1. Simple Mode Toggle
For older / non-financial users:
- Hide STRUCTURE entirely
- Hide Analizy
- Show only:
  - Księga
  - Faktury
  - Wydatki
  - Bank

**Huge usability win for grandma users.**

### 2. Ledger-First Onboarding
On first login:
- Sidebar highlights Księga
- Tooltip: "Tu widzisz wszystko, co dzieje się z pieniędzmi"

This anchors the entire app around your strongest feature.

## Implementation Details

### State Management
```typescript
const [expandedSections, setExpandedSections] = useState<Set<string>>(
  () => new Set(['money']) // Money always expanded
);
```

### Context Highlighting Logic
```typescript
const isLedgerRelated = () => {
  return location.pathname.startsWith('/ledger') ||
         location.pathname.startsWith('/income') ||
         location.pathname.startsWith('/expense') ||
         location.pathname.startsWith('/bank') ||
         location.pathname.startsWith('/accounting/kasa');
};

const shouldHighlightLedger = isLedgerRelated() && 
                              !location.pathname.startsWith('/ledger');
```

### Visual Styling
```typescript
// Money section - dominant
<SidebarGroupLabel className="text-sm text-green-400/90">
  MONEY
</SidebarGroupLabel>

// Structure/Operations - subdued
<SidebarGroupLabel className="text-xs text-sidebar-foreground/50">
  STRUCTURE
</SidebarGroupLabel>

// Ledger glow effect
className={cn(
  getNavClassName(item.path),
  showLedgerGlow && "ring-1 ring-green-400/30 bg-green-400/5"
)}
```

## User Benefits

### For Grandma Users
- **Less overwhelming**: Only see what matters (money)
- **Clear tasks**: "Check money" not "Navigate to accounting module"
- **Visual calm**: No competing priorities

### For Power Users
- **Faster navigation**: Money always visible
- **Context awareness**: Ledger connection always clear
- **Progressive disclosure**: Expand only what's needed

### For Accountants
- **Ledger-first**: Truth layer is primary entry point
- **Clear hierarchy**: Money → Structure → Operations
- **Professional**: Calm, analytical, not flashy

## Success Metrics

Track these to measure impact:

1. **Time to first action**: Should decrease by 30%
2. **Ledger adoption**: 60% of users visit ledger within first week
3. **Support tickets**: Reduce "where is X?" questions by 50%
4. **User satisfaction**: NPS increase for "ease of navigation"
5. **Task completion**: Faster invoice/expense creation

## Migration Strategy

### Phase 1: Soft Launch
- Feature flag for new sidebar
- A/B test with 10% of users
- Gather feedback

### Phase 2: Gradual Rollout
- Increase to 50% of users
- Monitor metrics
- Fix edge cases

### Phase 3: Full Deployment
- 100% rollout
- Remove old sidebar code
- Update documentation

### Phase 4: Optimization
- Add Simple Mode toggle
- Implement ledger-first onboarding
- Refine visual hierarchy based on usage

## Key Takeaways

1. **Sidebar is a control panel**, not a navigation menu
2. **Money first**, everything else secondary
3. **Ledger is the spine**, all financial pages connect to it
4. **Progressive disclosure** reduces cognitive load
5. **Visual hierarchy** guides user attention
6. **Context highlighting** reinforces mental model

The sidebar should answer: **"What job am I doing?"** not **"What module am I entering?"**

This is the difference between a tool and a system.
