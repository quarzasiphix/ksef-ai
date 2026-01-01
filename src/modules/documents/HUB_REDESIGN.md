# Documents Hub Redesign

## Overview

The Documents Hub has been redesigned from a traditional folder-based file manager into a **modern section navigation hub** that serves as the central entry point for all document management.

---

## Design Philosophy

### Before: Folder-Based File Manager
```
┌─────────────────────────────────────────┐
│ [Folder Tree]  │  [Document List]       │
│                │                        │
│ 📁 Contracts   │  Document 1            │
│ 📁 Financial   │  Document 2            │
│ 📁 Operations  │  Document 3            │
│ 📁 Archive     │  ...                   │
└─────────────────────────────────────────┘
```

**Problems:**
- No clear entry point
- Mixed document types in one view
- Folder structure doesn't reflect business logic
- No contextual actions
- No overview of document health

### After: Section Navigation Hub
```
┌─────────────────────────────────────────────────────────┐
│ 📄 Centrum dokumentów                                   │
│ Zarządzaj wszystkimi dokumentami w jednym miejscu       │
└─────────────────────────────────────────────────────────┘

┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 📝 Umowy    │ │ 💵 Finansowe│ │ 🚚 Operacyjne│
│             │ │             │ │             │
│ 45 | 23 | 5 │ │ 128| 98 | 12│ │ 67 | 34 | 7│
│ Total Active│ │ Total Active│ │ Total Active│
│ Pending     │ │ Pending     │ │ Pending     │
│             │ │             │ │             │
│ ⚠️ 2 wymaga │ │ ⚠️ 8 wymaga │ │ ⚠️ 3 wymaga │
│ uwagi       │ │ uwagi       │ │ uwagi       │
│             │ │             │ │             │
│ [Otwórz]    │ │ [Otwórz]    │ │ [Otwórz]    │
└─────────────┘ └─────────────┘ └─────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🕐 Ostatnio edytowane                                   │
├─────────────────────────────────────────────────────────┤
│ 📝 Umowa ramowa z ABC Transport      [Umowy] 2h temu    │
│ 💵 Rozliczenie zlecenia TR/12/2024   [Finanse] 5h temu  │
│ 🚚 Protokół przekazania - Zlecenie   [Operacje] 1d temu │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
✅ Clear overview of all document sections  
✅ At-a-glance health metrics per section  
✅ Quick access to recent documents  
✅ Visual alerts for critical items  
✅ Direct navigation to relevant sections  

---

## Key Features

### 1. Section Cards with Live Stats

Each section displays:
- **Total documents** in that section
- **Active documents** (currently valid/in-use)
- **Pending documents** (awaiting action)
- **Critical alerts** (requires immediate attention)

**Visual Indicators:**
- 🟢 **Green** - All up to date
- 🟡 **Amber** - Items pending review
- 🔴 **Red** - Critical items requiring attention

**Example: Financial Section Card**
```typescript
┌─────────────────────────────────┐
│ 💵 Dokumenty finansowe          │
│ Dowody księgowe i rozliczenia   │
├─────────────────────────────────┤
│  128    │   98    │   12        │
│ Wszystkie│ Aktywne│ Oczekujące  │
├─────────────────────────────────┤
│ ⚠️ 8 wymaga uwagi               │
├─────────────────────────────────┤
│ [Otwórz dokumenty finansowe]    │
└─────────────────────────────────┘
```

### 2. Recent Documents Panel

Shows the 5 most recently edited documents across all sections:
- Document title
- Section badge (with section color)
- Time since last edit
- Click to navigate directly to document

**Benefits:**
- Quick access to work in progress
- Cross-section visibility
- No need to remember which section a document is in

### 3. Global Stats Overview

Three summary cards at the bottom:
- **Total documents** across all sections
- **Pending items** requiring action
- **Critical items** requiring immediate attention

**Example:**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📈 267       │ │ 🕐 29        │ │ ⚠️ 14        │
│ Wszystkie    │ │ Oczekujące   │ │ Wymaga uwagi │
│ dokumenty    │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## Navigation Flow

### Entry Points

**1. Main Navigation → Dokumenty**
```
Sidebar → Dokumenty → Documents Hub (landing page)
```

**2. Direct Section Access**
```
URL: /documents/contracts → Contracts Section Page
URL: /documents/financial → Financial Section Page
URL: /documents/operations → Operations Section Page
```

**3. Document Deep Links**
```
URL: /documents/contracts/abc-123 → Contract Detail Page
```

### User Journey

**Scenario 1: Browse by Section**
```
1. User clicks "Dokumenty" in sidebar
2. Lands on Documents Hub
3. Sees overview of all sections
4. Clicks "Otwórz umowy"
5. Navigates to /documents/contracts
6. Sees filtered list of contracts only
```

**Scenario 2: Continue Recent Work**
```
1. User clicks "Dokumenty" in sidebar
2. Lands on Documents Hub
3. Sees "Ostatnio edytowane" panel
4. Clicks on recent document
5. Navigates directly to document detail page
```

**Scenario 3: Respond to Alert**
```
1. User clicks "Dokumenty" in sidebar
2. Lands on Documents Hub
3. Sees "⚠️ 8 wymaga uwagi" on Financial card
4. Clicks "Otwórz dokumenty finansowe"
5. Lands on /documents/financial
6. Sees filtered view with critical items highlighted
```

---

## Section Card Design

### Visual Hierarchy

**1. Section Icon & Color**
- Large icon with section accent color
- Colored left border (4px)
- Light background tint on hover

**2. Title & Description**
- Bold section title
- Subtitle explaining section purpose
- Truncated to 2 lines

**3. Stats Grid**
- 3-column layout
- Large numbers (2xl font)
- Small labels below

**4. Alert Banner**
- Conditional rendering based on stats
- Red for critical (>0 critical items)
- Amber for pending (>0 pending, 0 critical)
- Green for all clear

**5. Action Button**
- Full-width button
- Outline variant
- Section-specific text

### Interaction States

**Default:**
- White/dark background
- Subtle border
- Section color on left edge

**Hover:**
- Slight scale (1.02)
- Shadow increase
- Cursor pointer

**Click:**
- Navigate to section page
- Smooth transition

---

## Implementation Details

### Component Structure

```
DocumentsHubRedesigned.tsx
├── Header Card
│   ├── Title & Description
│   └── Quick Actions
├── Section Cards Grid (3 columns)
│   ├── Contracts Card
│   ├── Financial Card
│   ├── Operations Card
│   ├── Audit Card
│   └── Decisions Card
├── Recent Documents Panel
│   └── Document List (5 items)
└── Global Stats Row (3 cards)
    ├── Total Documents
    ├── Pending Items
    └── Critical Items
```

### Data Loading

```typescript
interface SectionStats {
  total: number;      // All documents in section
  active: number;     // Currently valid/active
  pending: number;    // Awaiting action
  critical: number;   // Requires immediate attention
}

interface RecentDocument {
  id: string;
  title: string;
  section: DocumentSection;
  status: string;
  updated_at: string;
}
```

**Queries:**
1. `getSectionStats()` - Aggregate counts per section
2. `getRecentDocuments(limit: 5)` - Latest edited across all sections

### Routing

```typescript
// Hub landing page
/documents → DocumentsHubRedesigned

// Section pages
/documents/contracts → SectionDocumentsPage (section='contracts')
/documents/financial → SectionDocumentsPage (section='financial')
/documents/operations → SectionDocumentsPage (section='operations')
/documents/audit → SectionDocumentsPage (section='audit')

// Document detail pages
/documents/:section/:id → DocumentDetailPage (with auto-redirect)
```

---

## Responsive Design

### Desktop (≥1024px)
- 3-column section grid
- Full stats visible
- Recent documents in single column

### Tablet (768px - 1023px)
- 2-column section grid
- Compact stats
- Recent documents scrollable

### Mobile (<768px)
- 1-column section grid
- Stacked stats
- Recent documents list
- Collapsible global stats

---

## Color Coding

Each section has a distinct accent color for visual distinction:

| Section | Color | Hex | Usage |
|---------|-------|-----|-------|
| Contracts | Blue | `#3b82f6` | Borders, icons, badges |
| Financial | Green | `#10b981` | Borders, icons, badges |
| Operations | Amber | `#f59e0b` | Borders, icons, badges |
| Audit | Indigo | `#6366f1` | Borders, icons, badges |
| Decisions | Purple | `#8b5cf6` | Borders, icons, badges |

**Alert Colors:**
- Critical: Red `#ef4444`
- Pending: Amber `#f59e0b`
- Success: Green `#10b981`

---

## Accessibility

### Keyboard Navigation
- Tab through section cards
- Enter to navigate to section
- Arrow keys for recent documents list

### Screen Readers
- Semantic HTML structure
- ARIA labels on interactive elements
- Status announcements for alerts

### Color Contrast
- All text meets WCAG AA standards
- Icons have sufficient contrast
- Alert colors distinguishable

---

## Future Enhancements

### Phase 1 (Current)
✅ Section navigation hub  
✅ Live stats per section  
✅ Recent documents panel  
✅ Global overview stats  

### Phase 2 (Planned)
- [ ] Favorites/pinned documents
- [ ] Search across all sections
- [ ] Bulk actions from hub
- [ ] Custom dashboard widgets

### Phase 3 (Future)
- [ ] Document activity feed
- [ ] Collaboration indicators
- [ ] AI-powered suggestions
- [ ] Export/reporting from hub

---

## Migration from Old Hub

### Old DocumentsHub.tsx
- Legacy folder-based navigation
- Mixed document types
- Complex state management
- Preserved at `/contracts` for backward compatibility

### New DocumentsHubRedesigned.tsx
- Section-based navigation
- Clear separation of concerns
- Simplified state (stats + recent only)
- Primary route at `/documents`

### Transition Strategy
1. New hub at `/documents` (main entry)
2. Old hub at `/contracts` (legacy support)
3. Gradual migration of internal links
4. Deprecation notice in old hub
5. Remove old hub after 2-3 months

---

## Summary

The redesigned Documents Hub transforms document management from a **file browser** into a **business intelligence dashboard** that:

1. **Provides clarity** - Clear overview of all document sections
2. **Surfaces insights** - At-a-glance health metrics
3. **Enables action** - Direct navigation to critical items
4. **Improves efficiency** - Quick access to recent work
5. **Scales gracefully** - Easy to add new sections

The hub serves as the **central command center** for all document-related activities, making it easy to understand document health and navigate to the right place quickly.
