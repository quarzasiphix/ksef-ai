import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { BankAccount } from "@/types/bank";
import BankAccountCard from "./BankAccountCard";
import TransactionList from "./TransactionList";
import ImportBankStatementDialog from "./ImportBankStatementDialog";
import BankAnalyticsDashboard from "./BankAnalyticsDashboard";
import { getBankAccountsForProfile, addBankAccount, deleteBankAccount } from '@/integrations/supabase/repositories/bankAccountRepository';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { BankAccountEditDialog } from '@/components/bank/BankAccountEditDialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';

const BankAccountsSection: React.FC = () => {
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [transactions, setTransactions] = useState([]); // TODO: fetch real transactions
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (!selectedProfileId) return;
    setLoadingAccounts(true);
    getBankAccountsForProfile(selectedProfileId)
      .then(accs => {
        setAccounts(accs);
        setSelectedAccount(accs[0] || null);
      })
      .finally(() => setLoadingAccounts(false));
  }, [selectedProfileId]);

  const handleAddAccount = async (data: any) => {
    if (!selectedProfileId) return;
    try {
      const acc = await addBankAccount({
        ...data,
        businessProfileId: selectedProfileId,
        connectedAt: new Date().toISOString(),
      });
      setAccounts(prev => [...prev, acc]);
      toast.success('Dodano konto bankowe');
    } catch (e) {
      toast.error('Błąd dodawania konta');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteBankAccount(id);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      toast.success('Usunięto konto bankowe');
    } catch (e) {
      toast.error('Błąd usuwania konta');
    }
  };

  const handleImport = (txs: any[]) => {
    setTransactions((prev) => [...prev, ...txs]);
    toast.success(`Dodano ${txs.length} transakcji`);
  };

  const selectedTransactions = selectedAccount ? transactions.filter((t) => t.accountId === selectedAccount.id) : [];
  const filteredTransactions = filterType === 'all' ? selectedTransactions : selectedTransactions.filter(t => t.type === filterType);

  // Nowoczesny selector profilu firmy
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        {/* Selector profilu firmy jako karta z dropdownem */}
        <div className="flex-1 min-w-[220px]">
          <Label htmlFor="profile-select" className="mb-1 block text-sm font-medium text-muted-foreground">Profil firmy</Label>
          <Select
            value={selectedProfileId || ''}
            onValueChange={selectProfile}
            disabled={isLoadingProfiles}
          >
            <SelectTrigger id="profile-select" className="w-full bg-white dark:bg-neutral-900 border border-blue-200 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
              {selectedProfile ? (
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 rounded-full p-2">
                    {selectedProfile.logo ? (
                      <img src={selectedProfile.logo} alt={selectedProfile.name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <Building2 className="h-7 w-7 text-blue-600" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-base text-blue-900 dark:text-blue-200">{selectedProfile.name}</span>
                    <span className="text-xs text-muted-foreground">NIP: {selectedProfile.taxId}</span>
                  </div>
                </div>
              ) : (
                <SelectValue placeholder="Wybierz firmę" />
              )}
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id} className="py-2 px-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-full p-2">
                      {p.logo ? (
                        <img src={p.logo} alt={p.name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">NIP: {p.taxId}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Domyślne konto archiwalne z profilu */}
          {selectedProfile?.bankAccount && (
            <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground border border-dashed border-blue-200">
              <span className="font-semibold">Domyślne konto (archiwalne): </span>
              <span>{selectedProfile.bankAccount}</span>
            </div>
          )}
        </div>
        {/* Przycisk dodawania konta */}
        <div className="flex-shrink-0">
          <BankAccountEditDialog
            onSave={handleAddAccount}
            trigger={<Button size="lg" className="rounded-xl shadow bg-blue-600 hover:bg-blue-700 text-white">Dodaj konto bankowe</Button>}
          />
        </div>
      </div>
      {/* Lista kont bankowych */}
      <div className="grid gap-6 sm:grid-cols-2">
        {loadingAccounts ? (
          <div className="text-muted-foreground col-span-2">Ładowanie kont...</div>
        ) : accounts.length === 0 ? (
          <div className="text-muted-foreground col-span-2">Brak kont bankowych dla wybranego profilu.</div>
        ) : (
          accounts.map((acc) => (
            <BankAccountCard
              key={acc.id}
              account={acc}
              selected={selectedAccount?.id === acc.id}
              onSelect={() => setSelectedAccount(acc)}
              onDisconnect={() => handleDeleteAccount(acc.id)}
            />
          ))
        )}
      </div>
      {/* Analytics i transakcje */}
      {selectedAccount && selectedTransactions.length > 0 && (
        <BankAnalyticsDashboard
          transactions={selectedTransactions}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
        />
      )}
      {selectedAccount && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Transakcje – {selectedAccount.accountName}</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionList transactions={filteredTransactions} />
          </CardContent>
        </Card>
      )}
      {selectedAccount && (
        <ImportBankStatementDialog
          open={showImport}
          onOpenChange={setShowImport}
          accountId={selectedAccount.id}
          onImport={handleImport}
        />
      )}
    </div>
  );
};

export default BankAccountsSection; 