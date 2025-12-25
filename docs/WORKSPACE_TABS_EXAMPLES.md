# Workspace Tabs - Implementation Examples

Real-world examples of integrating the workspace tabs system into your application.

## Example 1: Invoice Detail Page with Dirty Tracking

```tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';
import { useOpenTab } from '@/shared/hooks/useOpenTab';

function InvoiceDetail() {
  const { id } = useParams();
  const { markTabDirty, updateTabState, getTabById, activeTabId } = useWorkspaceTabs();
  const [invoice, setInvoice] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Load invoice data
  useEffect(() => {
    loadInvoice(id).then(setInvoice);
  }, [id]);

  // Restore saved state if exists
  useEffect(() => {
    if (activeTabId) {
      const tab = getTabById(activeTabId);
      if (tab?.state?.invoice) {
        setInvoice(tab.state.invoice);
        setIsDirty(tab.isDirty || false);
      }
    }
  }, [activeTabId]);

  // Save state when switching away
  useEffect(() => {
    return () => {
      if (activeTabId && invoice) {
        updateTabState(activeTabId, { invoice });
      }
    };
  }, [invoice, activeTabId]);

  const handleChange = (field, value) => {
    setInvoice({ ...invoice, [field]: value });
    setIsDirty(true);
    if (activeTabId) {
      markTabDirty(activeTabId, true);
    }
  };

  const handleSave = async () => {
    await saveInvoice(invoice);
    setIsDirty(false);
    if (activeTabId) {
      markTabDirty(activeTabId, false);
    }
    toast.success('Invoice saved');
  };

  if (!invoice) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>{invoice.number}</h1>
        {isDirty && (
          <span className="text-amber-600">
            • Unsaved changes
          </span>
        )}
      </div>

      <form>
        <input
          value={invoice.customerName}
          onChange={(e) => handleChange('customerName', e.target.value)}
        />
        <input
          value={invoice.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
        />
        <button onClick={handleSave} disabled={!isDirty}>
          Save
        </button>
      </form>
    </div>
  );
}
```

## Example 2: Invoice List with Tab Opening

```tsx
import React from 'react';
import { useOpenTab } from '@/shared/hooks/useOpenTab';
import { useQuery } from '@tanstack/react-query';

function InvoiceList() {
  const { openInvoiceTab } = useOpenTab();
  const { data: invoices } = useQuery(['invoices'], fetchInvoices);

  const handleRowClick = (invoice) => {
    // Open in new tab
    openInvoiceTab(invoice.id, invoice.number);
    
    // Track in recent documents
    saveToRecentDocuments({
      id: invoice.id,
      title: invoice.number,
      path: `/income/${invoice.id}`,
      entityId: invoice.id,
      entityType: 'invoice',
    });
  };

  return (
    <div>
      <h1>Faktury</h1>
      <table>
        <thead>
          <tr>
            <th>Number</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices?.map(invoice => (
            <tr
              key={invoice.id}
              onClick={() => handleRowClick(invoice)}
              className="cursor-pointer hover:bg-accent"
            >
              <td>{invoice.number}</td>
              <td>{invoice.customerName}</td>
              <td>{formatCurrency(invoice.amount)}</td>
              <td>
                <StatusBadge status={invoice.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function saveToRecentDocuments(doc) {
  const recent = JSON.parse(localStorage.getItem('recent_documents') || '[]');
  const updated = [
    { ...doc, timestamp: Date.now() },
    ...recent.filter(r => r.id !== doc.id),
  ].slice(0, 20);
  localStorage.setItem('recent_documents', JSON.stringify(updated));
}
```

## Example 3: Contract Detail with Related Documents

```tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useOpenTab } from '@/shared/hooks/useOpenTab';

function ContractDetail() {
  const { id } = useParams();
  const { openInvoiceTab, openCustomerTab } = useOpenTab();
  const { data: contract } = useQuery(['contract', id], () => fetchContract(id));

  if (!contract) return <div>Loading...</div>;

  return (
    <div>
      <h1>{contract.title}</h1>
      
      <section>
        <h2>Customer</h2>
        <button
          onClick={() => openCustomerTab(contract.customerId, contract.customerName)}
          className="text-blue-600 hover:underline"
        >
          {contract.customerName}
        </button>
      </section>

      <section>
        <h2>Related Invoices</h2>
        <ul>
          {contract.invoices?.map(invoice => (
            <li key={invoice.id}>
              <button
                onClick={() => openInvoiceTab(invoice.id, invoice.number)}
                className="text-blue-600 hover:underline"
              >
                {invoice.number} - {formatCurrency(invoice.amount)}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

## Example 4: Custom Tab with Complex State

```tsx
import React, { useState, useEffect } from 'react';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';

function AdvancedSearch() {
  const { updateTabState, getTabById, activeTabId, markTabDirty } = useWorkspaceTabs();
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customer: '',
    minAmount: '',
    maxAmount: '',
  });
  const [results, setResults] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Restore state
  useEffect(() => {
    if (activeTabId) {
      const tab = getTabById(activeTabId);
      if (tab?.state) {
        setFilters(tab.state.filters || {});
        setResults(tab.state.results || []);
        setScrollPosition(tab.state.scrollPosition || 0);
      }
    }
  }, [activeTabId]);

  // Restore scroll position
  useEffect(() => {
    if (scrollPosition > 0) {
      window.scrollTo(0, scrollPosition);
    }
  }, [scrollPosition]);

  // Save state on unmount
  useEffect(() => {
    return () => {
      if (activeTabId) {
        updateTabState(activeTabId, {
          filters,
          results,
          scrollPosition: window.scrollY,
        });
      }
    };
  }, [filters, results, activeTabId]);

  const handleSearch = async () => {
    const data = await searchInvoices(filters);
    setResults(data);
    if (activeTabId) {
      markTabDirty(activeTabId, true);
    }
  };

  return (
    <div>
      <div className="filters">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
        />
        <input
          placeholder="Customer"
          value={filters.customer}
          onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="results">
        {results.map(result => (
          <div key={result.id}>{result.number}</div>
        ))}
      </div>
    </div>
  );
}
```

## Example 5: Inbox with Multiple Document Types

```tsx
import React from 'react';
import { useOpenTab } from '@/shared/hooks/useOpenTab';

function Inbox() {
  const { openInvoiceTab, openContractTab } = useOpenTab();
  const { data: items } = useQuery(['inbox'], fetchInboxItems);

  const handleItemClick = (item) => {
    switch (item.type) {
      case 'invoice':
        openInvoiceTab(item.id, item.title);
        break;
      case 'contract':
        openContractTab(item.id, item.title);
        break;
      default:
        console.warn('Unknown item type:', item.type);
    }
  };

  return (
    <div>
      <h1>Skrzynka</h1>
      <div className="space-y-2">
        {items?.map(item => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="p-4 border rounded cursor-pointer hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              {item.type === 'invoice' && <FileText className="h-5 w-5" />}
              {item.type === 'contract' && <FileCheck className="h-5 w-5" />}
              <div className="flex-1">
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-muted-foreground">
                  {item.description}
                </div>
              </div>
              {item.status === 'pending' && (
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                  Oczekuje
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Example 6: Programmatic Tab Management

```tsx
import React from 'react';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';

function TabManager() {
  const {
    tabs,
    activeTabId,
    closeTab,
    closeAllTabs,
    pinTab,
    unpinTab,
    switchTab,
  } = useWorkspaceTabs();

  const handleCloseAll = () => {
    if (confirm('Close all tabs?')) {
      closeAllTabs();
    }
  };

  const handlePinToggle = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isPinned) {
      unpinTab(tabId);
    } else {
      pinTab(tabId);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2>Open Tabs ({tabs.length})</h2>
        <button onClick={handleCloseAll}>Close All</button>
      </div>

      <div className="space-y-2">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={cn(
              'p-3 border rounded flex items-center gap-3',
              tab.id === activeTabId && 'bg-accent'
            )}
          >
            {tab.icon && <tab.icon className="h-5 w-5" />}
            <div className="flex-1">
              <div className="font-medium">{tab.title}</div>
              <div className="text-sm text-muted-foreground">{tab.path}</div>
            </div>
            {tab.isDirty && (
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            )}
            <button onClick={() => handlePinToggle(tab.id)}>
              <Pin className={cn('h-4 w-4', tab.isPinned && 'text-primary')} />
            </button>
            <button onClick={() => switchTab(tab.id)}>
              Switch
            </button>
            <button onClick={() => closeTab(tab.id)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Tips and Best Practices

1. **Always track recent documents** - Improves tab switcher UX
2. **Save state on unmount** - Use cleanup function in useEffect
3. **Debounce dirty tracking** - Don't mark dirty on every keystroke
4. **Provide visual feedback** - Show loading states, dirty indicators
5. **Handle errors gracefully** - Don't break tabs on API errors
6. **Test tab switching** - Ensure state persists correctly
7. **Limit open tabs** - Consider warning at 10+ tabs
8. **Use semantic titles** - "FV/2025/12/003" not "Invoice"
