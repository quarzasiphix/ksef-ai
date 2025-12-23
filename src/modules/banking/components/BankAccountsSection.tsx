import React, { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { toast } from "sonner";
import { BankAccount, BankTransaction } from "@/modules/banking/bank";
import BankAccountCard from "./BankAccountCard";
import TransactionList from "./TransactionList";
import ImportBankStatementDialog from "@/modules/banking/components/ImportBankStatementDialog";
import BankAnalyticsDashboard from "@/modules/banking/components/BankAnalyticsDashboard";
import { getBankAccountsForProfile, addBankAccount, deleteBankAccount } from '@/modules/banking/data/bankAccountRepository';
import { saveBankTransactions, getBankTransactions, deleteBankTransactions } from '@/modules/banking/data/bankTransactionRepository';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/shared/utils/eventLogging';
import { BankAccountEditDialog } from './BankAccountEditDialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Building2 } from 'lucide-react';

const BankAccountsSection: React.FC = () => {
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

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

  // Fetch transactions when selected account changes
  useEffect(() => {
    if (!selectedAccount) {
      setTransactions([]);
      return;
    }
    
    setLoadingTransactions(true);
    getBankTransactions(selectedAccount.id)
      .then(txs => {
        setTransactions(txs);
      })
      .catch(error => {
        console.error('Error fetching transactions:', error);
        toast.error('Błąd pobierania transakcji');
      })
      .finally(() => setLoadingTransactions(false));
  }, [selectedAccount]);

  const handleAddAccount = async (data: any) => {
    if (!selectedProfileId) return;
    try {
      const acc = await addBankAccount({
        ...data,
        businessProfileId: selectedProfileId,
        connectedAt: new Date().toISOString(),
      });
      
      // Log event for Spółki
      const selectedProfile = profiles.find(p => p.id === selectedProfileId);
      if (shouldLogEvents(selectedProfile?.entityType)) {
        await logCreationEvent({
          businessProfileId: selectedProfileId,
          eventType: 'bank_account_added',
          entityType: 'bank_account',
          entityId: acc.id,
          entityReference: acc.accountNumber || acc.bankName || 'Konto bankowe',
          actionSummary: `Dodano konto bankowe: ${acc.accountNumber || acc.bankName}`,
          changes: {
            bank_name: acc.bankName,
            account_number: acc.accountNumber,
          },
        });
      }
      
      setAccounts(prev => [...prev, acc]);
      toast.success('Dodano konto bankowe');
    } catch (e) {
      toast.error('Błąd dodawania konta');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      // Delete transactions first
      await deleteBankTransactions(id);
      // Then delete the account
      await deleteBankAccount(id);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      if (selectedAccount?.id === id) {
        setSelectedAccount(null);
      }
      toast.success('Usunięto konto bankowe');
    } catch (e) {
      toast.error('Błąd usuwania konta');
    }
  };

  const handleEditAccount = async (id: string, data: any) => {
    try {
      // Zaktualizuj konto w bazie (możesz mieć updateBankAccount, jeśli nie, użyj addBankAccount z istniejącym id)
      const updated = await addBankAccount({ ...data, id });
      setAccounts(prev => prev.map(acc => acc.id === id ? updated : acc));
      toast.success('Zaktualizowano konto bankowe');
    } catch (e) {
      toast.error('Błąd edycji konta');
    }
  };

  const handleImport = async (txs: BankTransaction[]) => {
    if (!selectedAccount) return;
    
    try {
      // Add accountId to each transaction
      const transactionsWithAccountId = txs.map(tx => ({
        ...tx,
        accountId: selectedAccount.id
      }));
      
      // Save to database
      await saveBankTransactions(transactionsWithAccountId);
      
      // Update local state
      setTransactions(prev => [...prev, ...transactionsWithAccountId]);
      toast.success(`Dodano ${txs.length} transakcji`);
    } catch (error) {
      console.error('Error importing transactions:', error);
      toast.error('Błąd importowania transakcji');
    }
  };

  const selectedTransactions = selectedAccount ? transactions.filter((t) => t.accountId === selectedAccount.id) : [];
  const filteredTransactions = filterType === 'all' ? selectedTransactions : selectedTransactions.filter(t => t.type === filterType);

  // Nowoczesny selector profilu firmy
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-4 space-y-8 w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 w-full">
        {/* Selector profilu firmy jako karta z dropdownem */}
        <div className="flex-1 min-w-[220px] max-w-full">
          <Label htmlFor="profile-select" className="mb-1 block text-sm font-medium text-muted-foreground">Profil firmy</Label>
          <Select
            value={selectedProfileId || ''}
            onValueChange={selectProfile}
            disabled={isLoadingProfiles}
          >
            <SelectTrigger id="profile-select" className="w-full bg-white dark:bg-neutral-900 border border-blue-200 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
              {selectedProfile ? (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-blue-100 rounded-full p-2">
                    {selectedProfile.logo ? (
                      <img src={selectedProfile.logo} alt={selectedProfile.name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <Building2 className="h-7 w-7 text-blue-600" />
                    )}
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="font-semibold text-base text-blue-900 dark:text-blue-200 truncate">{selectedProfile.name}</span>
                    <span className="text-xs text-muted-foreground truncate">NIP: {selectedProfile.taxId}</span>
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
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground truncate">NIP: {p.taxId}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Domyślne konto archiwalne z profilu */}
          {selectedProfile?.bankAccount && (
            <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground border border-dashed border-blue-200 overflow-x-auto">
              <span className="font-semibold">Domyślne konto (archiwalne): </span>
              <span>{selectedProfile.bankAccount}</span>
            </div>
          )}
        </div>
        {/* Przycisk dodawania konta */}
        <div className="flex-shrink-0 w-full md:w-auto">
          <BankAccountEditDialog
            onSave={handleAddAccount}
            trigger={<Button size="lg" className="rounded-xl shadow bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto">Dodaj konto bankowe</Button>}
          />
        </div>
      </div>
      {/* Lista kont bankowych */}
      <div className="grid gap-6 sm:grid-cols-2 w-full overflow-x-auto pb-2">
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
            onEdit={() => setEditingAccount(acc)}
            onImport={() => setShowImport(true)}
          />
          ))
        )}
      </div>
      {/* Analytics i transakcje */}
      {selectedAccount && selectedTransactions.length > 0 && (
        <div className="overflow-x-auto">
        <BankAnalyticsDashboard
          transactions={selectedTransactions}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
        />
        </div>
      )}
      {selectedAccount && (
        <Card className="mt-6 overflow-x-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transakcje – {selectedAccount.bankName} ({selectedAccount.accountName})</CardTitle>
              <Button onClick={() => setShowImport(true)} size="sm">
                Importuj wyciąg
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="text-muted-foreground">Ładowanie transakcji...</div>
            ) : (
              <TransactionList transactions={filteredTransactions} />
            )}
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
      {/* Dialog edycji konta */}
      {editingAccount && (
        <BankAccountEditDialog
          initial={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAccount(null);
            }
          }}
          onSave={async (data) => {
            try {
              await handleEditAccount(editingAccount.id, data);
              setEditingAccount(null);
            } catch (error) {
              // Error is already handled in handleEditAccount
            }
          }}
        />
      )}
    </div>
  );
};

export default BankAccountsSection; 