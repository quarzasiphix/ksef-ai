import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import { Button } from '@/shared/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
  is_synthetic: boolean;
  is_active: boolean;
}

interface AccountPickerProps {
  value?: string;
  onChange: (accountId: string) => void;
  placeholder?: string;
  filterType?: string; // Filter by account_type
  disabled?: boolean;
}

export function AccountPicker({
  value,
  onChange,
  placeholder = 'Select account...',
  filterType,
  disabled = false,
}: AccountPickerProps) {
  const { selectedProfileId } = useBusinessProfile();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch chart accounts
  const { data: accounts = [] } = useQuery<ChartAccount[]>({
    queryKey: ['chart-accounts', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      let query = supabase
        .from('chart_accounts')
        .select('*')
        .eq('business_profile_id', selectedProfileId)
        .eq('is_active', true)
        .order('code');

      if (filterType) {
        query = query.eq('account_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ChartAccount[];
    },
    enabled: !!selectedProfileId,
  });

  // Filter accounts based on search
  const filteredAccounts = accounts.filter(account => {
    const search = searchQuery.toLowerCase();
    return (
      account.code.toLowerCase().includes(search) ||
      account.name.toLowerCase().includes(search)
    );
  });

  // Group accounts by type
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, ChartAccount[]>);

  const selectedAccount = accounts.find(a => a.id === value);

  const accountTypeLabels: Record<string, string> = {
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
    revenue: 'Revenue',
    expense: 'Expenses',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !value && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          {selectedAccount ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs">{selectedAccount.code}</span>
              <span>{selectedAccount.name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by code or name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No account found.</CommandEmpty>
            {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
              <CommandGroup key={type} heading={accountTypeLabels[type] || type}>
                {typeAccounts.map(account => (
                  <CommandItem
                    key={account.id}
                    value={account.id}
                    onSelect={() => {
                      onChange(account.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === account.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      {account.code}
                    </span>
                    <span className="flex-1">{account.name}</span>
                    {account.is_synthetic && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Synthetic)
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
