# Workspace Tabs System

An Apple-style workspace tabs system for managing multiple documents and views simultaneously.

## Overview

The workspace tabs system allows users to:
- Open multiple documents (invoices, contracts, etc.) in separate tabs
- Switch between workspace views (lists, dashboards) without losing context
- Preserve form state and scroll position when switching tabs
- Search and quickly switch between open tabs with Cmd+K
- Pin important tabs to keep them accessible
- Use focus mode to maximize content area

## Architecture

### Core Components

1. **WorkspaceTabsContext** (`src/shared/context/WorkspaceTabsContext.tsx`)
   - Manages tab state (open tabs, active tab, dirty state)
   - Persists tabs to localStorage
   - Handles tab lifecycle (open, close, switch, pin)

2. **TabBar** (`src/components/workspace/TabBar.tsx`)
   - Displays open tabs with Apple-style design
   - Smooth animations for opening/closing tabs
   - Responsive: compresses tabs when space is limited
   - Overflow menu for tabs that don't fit

3. **WorkspaceMenu** (`src/components/workspace/WorkspaceMenu.tsx`)
   - The "⋯" menu in the header
   - Workspace-level actions (not document actions)
   - Tab management, layout controls, focus mode

4. **TabSwitcher** (`src/components/workspace/TabSwitcher.tsx`)
   - Cmd+K / Ctrl+K quick switcher
   - Search through open tabs and recent documents
   - Keyboard navigation (arrows, Enter)

### Tab Types

**Document Tabs** - Specific entities:
- Invoice: `FV/2025/12/003`
- Contract: `Umowa 12/2025`
- Customer profile
- Product details
- Employee record

**Workspace Tabs** - List/search views:
- "Faktury" (invoices list)
- "Kontrakty" (contracts list)
- "Klienci" (customers list)
- "Skrzynka" (inbox)

### Key Rules

1. **One tab per document ID** - Opening the same invoice twice focuses the existing tab
2. **State preservation** - Form inputs, scroll position, filters are preserved per tab
3. **Dirty tracking** - Unsaved changes show a dot indicator and prompt on close
4. **Pinned tabs** - Can't be closed accidentally, survive "close all"

## Usage

### Opening Tabs Programmatically

Use the `useOpenTab` hook for convenient tab opening:

```tsx
import { useOpenTab } from '@/shared/hooks/useOpenTab';

function InvoiceList() {
  const { openInvoiceTab } = useOpenTab();

  const handleInvoiceClick = (invoice) => {
    openInvoiceTab(invoice.id, invoice.number);
  };

  return (
    <div>
      {invoices.map(inv => (
        <button onClick={() => handleInvoiceClick(inv)}>
          {inv.number}
        </button>
      ))}
    </div>
  );
}
```

### Available Methods

```tsx
const {
  openInvoiceTab,      // (id, number) => void
  openExpenseTab,      // (id, number) => void
  openContractTab,     // (id, title) => void
  openCustomerTab,     // (id, name) => void
  openProductTab,      // (id, name) => void
  openEmployeeTab,     // (id, name) => void
  openWorkspaceTab,    // (title, path) => void
  openTab,             // Raw method for custom tabs
} = useOpenTab();
```

### Managing Tab State

Track dirty state (unsaved changes):

```tsx
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';

function InvoiceForm({ invoiceId }) {
  const { markTabDirty, tabs, activeTabId } = useWorkspaceTabs();
  const [formData, setFormData] = useState({});

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    // Mark current tab as dirty
    if (activeTabId) {
      markTabDirty(activeTabId, true);
    }
  };

  const handleSave = async () => {
    await saveInvoice(formData);
    
    // Clear dirty state after save
    if (activeTabId) {
      markTabDirty(activeTabId, false);
    }
  };

  return (
    <form>
      <input onChange={(e) => handleChange('amount', e.target.value)} />
      <button onClick={handleSave}>Save</button>
    </form>
  );
}
```

### Preserving Tab State

Store and restore state when switching tabs:

```tsx
function InvoiceForm({ invoiceId }) {
  const { updateTabState, getTabById, activeTabId } = useWorkspaceTabs();
  const [formData, setFormData] = useState({});

  // Restore state when tab becomes active
  useEffect(() => {
    if (activeTabId) {
      const tab = getTabById(activeTabId);
      if (tab?.state?.formData) {
        setFormData(tab.state.formData);
      }
    }
  }, [activeTabId]);

  // Save state when switching away
  useEffect(() => {
    return () => {
      if (activeTabId) {
        updateTabState(activeTabId, { formData });
      }
    };
  }, [formData, activeTabId]);

  return <form>...</form>;
}
```

## Keyboard Shortcuts

- **Cmd+K / Ctrl+K** - Open tab switcher
- **↑ / ↓** - Navigate in tab switcher
- **Enter** - Select tab in switcher
- **Esc** - Close tab switcher

## Workspace Menu (⋯)

The workspace menu contains **workspace-level actions only**:

### Tabs Section
- Pin/Unpin current tab
- Close other tabs
- Close tabs to the right
- Close all tabs

### Layout Section
- Focus mode (hide sidebar, maximize content)
- Collapse/expand sidebar

### Tools Section
- Tab switcher (Cmd+K)
- Restore previous session

### What NOT to Put Here

❌ Document-specific actions:
- Approve/reject invoice
- Save document
- Delete contract
- Edit customer

These belong in the document view UI, not the workspace menu.

## Design Principles

### Apple-Style Aesthetics

1. **Rounded pill tabs** - Not rectangular Windows-style tabs
2. **Subtle glass effect** - Backdrop blur on active tab
3. **Smooth animations** - Spring physics for tab movements
4. **Dynamic sizing** - Tabs compress gracefully, don't wrap
5. **Minimal chrome** - Clean, uncluttered interface

### UX Best Practices

1. **Preserve context** - Never lose user's work when switching tabs
2. **Confirm destructive actions** - Warn before closing dirty tabs
3. **Visual feedback** - Show unsaved changes with amber dot
4. **Keyboard-first** - All actions accessible via keyboard
5. **Responsive** - Works on all screen sizes

## Integration Examples

### Opening Tab from List View

```tsx
function InvoiceList() {
  const { openInvoiceTab } = useOpenTab();

  return (
    <table>
      {invoices.map(invoice => (
        <tr key={invoice.id} onClick={() => openInvoiceTab(invoice.id, invoice.number)}>
          <td>{invoice.number}</td>
          <td>{invoice.customer}</td>
        </tr>
      ))}
    </table>
  );
}
```

### Opening Tab from Navigation

```tsx
function Sidebar() {
  const { openWorkspaceTab } = useOpenTab();

  return (
    <nav>
      <button onClick={() => openWorkspaceTab('Faktury', '/income')}>
        Faktury
      </button>
      <button onClick={() => openWorkspaceTab('Kontrakty', '/contracts')}>
        Kontrakty
      </button>
    </nav>
  );
}
```

### Recent Documents Tracking

To enable recent documents in the tab switcher, save to localStorage:

```tsx
function saveToRecent(document) {
  const recent = JSON.parse(localStorage.getItem('recent_documents') || '[]');
  
  const newRecent = [
    {
      id: document.id,
      title: document.title,
      path: document.path,
      entityId: document.id,
      entityType: document.type,
      timestamp: Date.now(),
    },
    ...recent.filter(r => r.id !== document.id),
  ].slice(0, 20); // Keep last 20
  
  localStorage.setItem('recent_documents', JSON.stringify(newRecent));
}
```

## Focus Mode

Focus mode hides the sidebar and mobile navigation to maximize content area:

```tsx
const { focusMode, setFocusMode } = useWorkspaceTabs();

// Toggle focus mode
<button onClick={() => setFocusMode(!focusMode)}>
  {focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
</button>
```

The Layout component automatically hides/shows UI based on focus mode state.

## Performance Considerations

1. **Tab limit** - Consider limiting to 10-15 open tabs
2. **State cleanup** - Clear tab state when closing tabs
3. **Lazy loading** - Only render active tab content
4. **Debounce dirty tracking** - Don't mark dirty on every keystroke

## Future Enhancements

- [ ] Drag and drop to reorder tabs
- [ ] Tab groups/workspaces
- [ ] Split view (two tabs side-by-side)
- [ ] Tab history (back/forward navigation)
- [ ] Restore closed tab (Cmd+Shift+T)
- [ ] Export/import tab sessions
- [ ] Collaborative tabs (see what teammates have open)

## Troubleshooting

### Tabs not persisting after refresh
Check that localStorage is enabled and not full.

### Tab state not restoring
Ensure you're calling `updateTabState` before unmounting.

### Dirty indicator not showing
Call `markTabDirty(tabId, true)` when form changes.

### Tab switcher not opening
Check that Cmd+K handler is registered and not conflicting with other shortcuts.

## API Reference

See `src/shared/context/WorkspaceTabsContext.tsx` for complete API documentation.
