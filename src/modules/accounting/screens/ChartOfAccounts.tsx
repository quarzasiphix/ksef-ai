import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, Search, Edit, Archive, ArchiveRestore, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
  is_synthetic: boolean;
  parent_id: string | null;
  default_vat_rate: number | null;
  is_active: boolean;
  description: string | null;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Aktywa',
  liability: 'Pasywa',
  equity: 'Kapitał',
  revenue: 'Przychody',
  expense: 'Koszty',
  off_balance: 'Pozabilansowe',
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  liability: 'bg-red-500/10 text-red-600 border-red-500/20',
  equity: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  revenue: 'bg-green-500/10 text-green-600 border-green-500/20',
  expense: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  off_balance: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

function ChartOfAccounts() {
  const { selectedProfileId } = useBusinessProfile();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Fetch chart accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-accounts', selectedProfileId, showInactive],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      const query = supabase
        .from('chart_accounts')
        .select('*')
        .eq('business_profile_id', selectedProfileId)
        .order('code');

      if (!showInactive) {
        query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ChartAccount[];
    },
    enabled: !!selectedProfileId,
  });

  // Seed accounts mutation
  const seedAccountsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('seed_chart_accounts', {
        p_business_profile_id: selectedProfileId,
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-accounts'] });
    },
  });

  // Deactivate account mutation
  const deactivateAccountMutation = useMutation({
    mutationFn: async ({ accountId, reason }: { accountId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('deactivate_chart_account', {
        p_account_id: accountId,
        p_actor_name: 'Current User',
        p_reason: reason || null,
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-accounts'] });
    },
  });

  // Reactivate account mutation
  const reactivateAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.rpc('reactivate_chart_account', {
        p_account_id: accountId,
        p_actor_name: 'Current User',
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-accounts'] });
    },
  });

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    if (filterType && account.account_type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        account.code.toLowerCase().includes(query) ||
        account.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group by type
  const accountsByType = filteredAccounts.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, ChartAccount[]>);

  if (!selectedProfileId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Plan kont</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Zarządzanie planem kont księgowych
              </p>
            </div>
            <div className="flex items-center gap-2">
              {accounts.length === 0 && (
                <Button
                  onClick={() => seedAccountsMutation.mutate()}
                  disabled={seedAccountsMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Załaduj podstawowy plan kont
                </Button>
              )}
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj konto
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Szukaj konta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={filterType === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(null)}
              >
                Wszystkie
              </Button>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([type, label]) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Ukryj nieaktywne' : 'Pokaż nieaktywne'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Ładowanie...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Brak planu kont</p>
            <p className="text-sm text-muted-foreground mb-4">
              Załaduj podstawowy plan kont lub dodaj konta ręcznie
            </p>
            <Button
              onClick={() => seedAccountsMutation.mutate()}
              disabled={seedAccountsMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Załaduj podstawowy plan kont
            </Button>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Brak kont spełniających kryteria</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(accountsByType).map(([type, typeAccounts]) => (
              <div key={type}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline" className={ACCOUNT_TYPE_COLORS[type]}>
                    {ACCOUNT_TYPE_LABELS[type]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({typeAccounts.length})
                  </span>
                </h2>

                <div className="grid gap-2">
                  {typeAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={cn(
                        'flex items-center justify-between p-4 border rounded-lg',
                        !account.is_active && 'opacity-50 bg-muted/50'
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-sm">
                            {account.code}
                          </span>
                          <span className="font-medium">{account.name}</span>
                          {account.is_synthetic && (
                            <Badge variant="outline" className="text-xs">
                              Syntetyczne
                            </Badge>
                          )}
                          {!account.is_active && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600">
                              Nieaktywne
                            </Badge>
                          )}
                        </div>
                        {account.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {account.description}
                          </p>
                        )}
                        {account.default_vat_rate !== null && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Domyślna stawka VAT: {account.default_vat_rate}%
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {account.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              deactivateAccountMutation.mutate({ accountId: account.id })
                            }
                            disabled={deactivateAccountMutation.isPending}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reactivateAccountMutation.mutate(account.id)}
                            disabled={reactivateAccountMutation.isPending}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChartOfAccounts;
