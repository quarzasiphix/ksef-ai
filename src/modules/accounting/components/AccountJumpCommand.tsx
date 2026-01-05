import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  ui_subgroup?: string;
}

interface JumpResult {
  type: 'group' | 'subgroup' | 'account';
  id: string;
  label: string;
  sublabel?: string;
  account?: Account;
}

interface AccountJumpCommandProps {
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onSelectGroup: (groupKey: string) => void;
  onSelectSubgroup: (groupKey: string, subgroupKey: string) => void;
  onSelectAccount: (account: Account) => void;
}

const GROUP_LABELS: Record<string, string> = {
  asset: 'Aktywa',
  liability: 'Pasywa',
  equity: 'Kapitał',
  revenue: 'Przychody',
  expense: 'Koszty',
  off_balance: 'Pozabilansowe',
};

export function AccountJumpCommand({
  accounts,
  isOpen,
  onClose,
  onSelectGroup,
  onSelectSubgroup,
  onSelectAccount,
}: AccountJumpCommandProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const results: JumpResult[] = [];

    // Search groups
    Object.entries(GROUP_LABELS).forEach(([key, label]) => {
      if (label.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
        results.push({
          type: 'group',
          id: key,
          label: label,
        });
      }
    });

    // Search subgroups (unique)
    const subgroups = new Set<string>();
    accounts.forEach(acc => {
      if (acc.ui_subgroup && !subgroups.has(acc.ui_subgroup)) {
        if (acc.ui_subgroup.toLowerCase().includes(q)) {
          subgroups.add(acc.ui_subgroup);
          results.push({
            type: 'subgroup',
            id: `${acc.account_type}-${acc.ui_subgroup}`,
            label: acc.ui_subgroup,
            sublabel: GROUP_LABELS[acc.account_type],
          });
        }
      }
    });

    // Search accounts
    accounts.forEach(acc => {
      if (
        acc.code.toLowerCase().includes(q) ||
        acc.name.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'account',
          id: acc.id,
          label: acc.name,
          sublabel: `${acc.code} • ${GROUP_LABELS[acc.account_type]}`,
          account: acc,
        });
      }
    });

    return results.slice(0, 10); // Limit to 10 results
  }, [query, accounts]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (result: JumpResult) => {
    if (result.type === 'group') {
      onSelectGroup(result.id);
    } else if (result.type === 'subgroup') {
      const [groupKey, subgroupKey] = result.id.split('-');
      onSelectSubgroup(groupKey, subgroupKey);
    } else if (result.type === 'account' && result.account) {
      onSelectAccount(result.account);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command palette */}
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Search input */}
        <div className="flex items-center border-b border-slate-700 px-4">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Jump to account, group, or code..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent px-4 py-4 text-slate-100 placeholder-slate-500 outline-none"
            autoFocus
          />
          <kbd className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto p-2">
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-300 hover:bg-slate-800/50'
                )}
              >
                <div className="flex-1">
                  <div className="font-medium">{result.label}</div>
                  {result.sublabel && (
                    <div className="text-sm text-slate-500">{result.sublabel}</div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="p-8 text-center text-slate-500">
            Nie znaleziono wyników dla "{query}"
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            Zacznij pisać, aby wyszukać konto, grupę lub kod...
          </div>
        )}

        {/* Footer hint */}
        <div className="border-t border-slate-700 px-4 py-3 text-xs text-slate-500">
          <span className="mr-4">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5">↑↓</kbd> Nawigacja
          </span>
          <span className="mr-4">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Enter</kbd> Wybierz
          </span>
          <span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5">ESC</kbd> Zamknij
          </span>
        </div>
      </div>
    </div>
  );
}
