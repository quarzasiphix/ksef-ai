import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Search, Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface AccountPickerProps {
  businessProfileId: string;
  value: string | null;
  onChange: (code: string, accountId: string) => void;
  accountType?: string;
  label: string;
  placeholder?: string;
}

interface PickerAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
  is_synthetic: boolean;
  parent_code: string | null;
  default_vat_rate: number | null;
  full_label: string;
}

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-600',
  liability: 'bg-red-500/10 text-red-600',
  equity: 'bg-purple-500/10 text-purple-600',
  revenue: 'bg-green-500/10 text-green-600',
  expense: 'bg-orange-500/10 text-orange-600',
  off_balance: 'bg-gray-500/10 text-gray-600',
};

export function AccountPicker({
  businessProfileId,
  value,
  onChange,
  accountType,
  label,
  placeholder = 'Wybierz konto...',
}: AccountPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch accounts for picker
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-accounts-picker', businessProfileId, accountType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_chart_accounts_for_picker', {
        p_business_profile_id: businessProfileId,
        p_types: accountType ? [accountType] : null,
        p_search: null,
      });

      if (error) throw error;
      return data as PickerAccount[];
    },
    enabled: !!businessProfileId,
  });

  // Filter accounts by search query
  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.code.toLowerCase().includes(query) ||
      account.name.toLowerCase().includes(query)
    );
  });

  // Get selected account
  const selectedAccount = accounts.find((acc) => acc.code === value);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>

      {/* Trigger button */}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start text-left font-normal"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedAccount ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-mono text-sm font-semibold">
              {selectedAccount.code}
            </span>
            <span className="truncate">{selectedAccount.name}</span>
            {selectedAccount.default_vat_rate !== null && (
              <Badge variant="outline" className="text-xs ml-auto">
                VAT {selectedAccount.default_vat_rate}%
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div className="absolute z-50 mt-1 w-full max-h-80 overflow-auto rounded-md border bg-popover shadow-lg">
            {/* Search */}
            <div className="sticky top-0 bg-popover border-b p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Szukaj konta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-border rounded bg-background"
                  autoFocus
                />
              </div>
            </div>

            {/* Account list */}
            <div className="p-1">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Ładowanie...
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'Brak wyników' : 'Brak dostępnych kont'}
                </div>
              ) : (
                filteredAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      onChange(account.code, account.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-accent transition-colors',
                      value === account.code && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono font-semibold text-xs">
                        {account.code}
                      </span>
                      <span className="truncate">{account.name}</span>
                      {account.default_vat_rate !== null && (
                        <Badge
                          variant="outline"
                          className={cn('text-xs ml-auto', ACCOUNT_TYPE_COLORS[account.account_type])}
                        >
                          VAT {account.default_vat_rate}%
                        </Badge>
                      )}
                    </div>
                    {value === account.code && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
