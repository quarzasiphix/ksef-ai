import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { AccountDetailDrawer } from '../components/AccountDetailDrawer';
import { AccountJumpCommand } from '../components/AccountJumpCommand';
import { groupAccountsByType, formatBalance, getBalanceColor, type AccountWithBalance } from '../lib/account-grouping';

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

interface AccountBalance {
  account_id: string;
  account_code: string;
  current_balance: number;
  month_delta: number;
  ytd_delta: number;
}

function ChartOfAccounts() {
  const { selectedProfileId } = useBusinessProfile();
  const queryClient = useQueryClient();
  
  // UI state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['asset']));
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [currentMonth] = useState(new Date().toLocaleDateString('pl-PL', { month: 'long' }));

  // Keyboard shortcut for Jump command (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsJumpOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch account balances
  const { data: balances = [] } = useQuery<AccountBalance[]>({
    queryKey: ['account-balances', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      const { data, error } = await supabase.rpc('get_account_balances', {
        p_business_profile_id: selectedProfileId,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProfileId,
  });

  // Fetch chart accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-accounts', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      const query = supabase
        .from('chart_accounts')
        .select('*')
        .eq('business_profile_id', selectedProfileId)
        .eq('is_active', true)
        .order('code');

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

  // Merge accounts with balances
  const accountsWithBalances: AccountWithBalance[] = accounts.map(account => {
    const balance = balances.find(b => b.account_id === account.id);
    return {
      ...account,
      current_balance: balance?.current_balance || 0,
      month_delta: balance?.month_delta || 0,
      ytd_delta: balance?.ytd_delta || 0,
    };
  });

  // Group accounts by type and subgroup
  const groupedData = groupAccountsByType(accountsWithBalances);

  // Get selected account details
  const selectedAccount = selectedAccountId 
    ? accountsWithBalances.find(a => a.id === selectedAccountId) 
    : null;

  // Toggle functions
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const toggleSubgroup = (subgroupKey: string) => {
    setExpandedSubgroups(prev => {
      const next = new Set(prev);
      if (next.has(subgroupKey)) {
        next.delete(subgroupKey);
      } else {
        next.add(subgroupKey);
      }
      return next;
    });
  };

  // Jump command handlers
  const handleJumpToGroup = (groupKey: string) => {
    setExpandedGroups(prev => new Set(prev).add(groupKey));
  };

  const handleJumpToSubgroup = (groupKey: string, subgroupKey: string) => {
    setExpandedGroups(prev => new Set(prev).add(groupKey));
    setExpandedSubgroups(prev => new Set(prev).add(`${groupKey}-${subgroupKey}`));
  };

  const handleJumpToAccount = (account: ChartAccount) => {
    const groupKey = account.account_type;
    handleJumpToGroup(groupKey);
    setSelectedAccountId(account.id);
  };

  if (!selectedProfileId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-[#030712] text-slate-100">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white">Chart of Accounts</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Financial structure of your company
                </p>
              </div>
              <div className="flex items-center gap-3">
                {accounts.length === 0 && (
                  <Button
                    onClick={() => seedAccountsMutation.mutate()}
                    disabled={seedAccountsMutation.isPending}
                    variant="ghost"
                    className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Załaduj podstawowy plan kont
                  </Button>
                )}
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                  <Plus className="h-4 w-4 mr-2" />
                  Add account
                </Button>
              </div>
            </div>

            {/* Jump to + Period selector */}
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xl">
                <button
                  onClick={() => setIsJumpOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                >
                  <span className="text-slate-400">Jump to...</span>
                  <kbd className="ml-auto rounded bg-slate-900/50 px-2 py-1 text-xs text-slate-300 font-mono">
                    ⌘K
                  </kbd>
                </button>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg bg-white/5 text-slate-300">
                <span className="text-sm text-slate-400">Month:</span>
                <span className="text-sm font-medium text-white">{currentMonth}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Accordion Cards */}
        <div className="flex-1 overflow-auto px-8 py-6 bg-gradient-to-b from-slate-950/60 via-slate-950 to-slate-950/80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-lg font-medium mb-2 text-white">No chart of accounts</p>
              <p className="text-sm text-slate-400 mb-4">
                Load the default chart or add accounts manually
              </p>
              <Button
                onClick={() => seedAccountsMutation.mutate()}
                disabled={seedAccountsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Load default chart
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-w-5xl">
              {groupedData.map(group => {
                const isExpanded = expandedGroups.has(group.key);
                
                return (
                  <div key={group.key} className="rounded-2xl border border-white/5 bg-white/5 shadow-[0_0_40px_rgba(15,23,42,0.4)] overflow-hidden backdrop-blur-sm">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{group.icon}</span>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-white">{group.label}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          'text-lg font-bold font-mono',
                          getBalanceColor(group.total_balance, group.key)
                        )}>
                          {formatBalance(group.total_balance)}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Subgroups */}
                    {isExpanded && (
                      <div className="border-t border-white/5">
                        {group.subgroups.map(subgroup => {
                          const subgroupId = `${group.key}-${subgroup.key}`;
                          const isSubgroupExpanded = expandedSubgroups.has(subgroupId);

                          return (
                            <div key={subgroupId} className="border-b border-white/5 last:border-b-0">
                              {/* Subgroup Header */}
                              <button
                                onClick={() => toggleSubgroup(subgroupId)}
                                className="w-full flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8" />
                                  <span className="text-sm font-medium text-slate-300">{subgroup.label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={cn(
                                    'text-sm font-semibold font-mono',
                                    getBalanceColor(subgroup.total_balance, group.key)
                                  )}>
                                    {formatBalance(subgroup.total_balance)}
                                  </span>
                                  {isSubgroupExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>
                              </button>

                              {/* Accounts */}
                              {isSubgroupExpanded && (
                                <div className="bg-slate-900/30">
                                  {subgroup.accounts.map(account => (
                                    <div
                                      key={account.id}
                                      className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors group cursor-pointer"
                                      onClick={() => setSelectedAccountId(account.id)}
                                    >
                                      <div className="flex items-center gap-4 flex-1">
                                        <div className="w-8" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3">
                                            <span className="font-medium text-white">{account.name}</span>
                                            {account.is_synthetic && (
                                              <Badge variant="outline" className="text-xs border-white/20 text-white">
                                                Synthetic
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-slate-500 mt-0.5">
                                            {account.code}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className={cn(
                                          'text-sm font-semibold font-mono',
                                          getBalanceColor(account.current_balance, account.account_type)
                                        )}>
                                          {formatBalance(account.current_balance)}
                                        </span>
                                        <button
                                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                          }}
                                        >
                                          <MoreVertical className="h-4 w-4 text-slate-400" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Jump Command Palette */}
      <AccountJumpCommand
        accounts={accounts}
        isOpen={isJumpOpen}
        onClose={() => setIsJumpOpen(false)}
        onSelectGroup={handleJumpToGroup}
        onSelectSubgroup={handleJumpToSubgroup}
        onSelectAccount={handleJumpToAccount}
      />

      {/* Account Detail Drawer */}
      <AccountDetailDrawer
        account={selectedAccount}
        balance={selectedAccount ? {
          current_balance: selectedAccount.current_balance,
          month_delta: selectedAccount.month_delta,
          ytd_delta: selectedAccount.ytd_delta,
        } : null}
        isOpen={!!selectedAccountId}
        onClose={() => setSelectedAccountId(null)}
        onViewLedger={() => {
          // TODO: Navigate to ledger filtered by account
          console.log('View ledger for account:', selectedAccountId);
        }}
      />
    </>
  );
}

export default ChartOfAccounts;
