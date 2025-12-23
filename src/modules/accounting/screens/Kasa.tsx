import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  Wallet,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Banknote,
  FileText,
  User,
  Calendar,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  ArrowLeftRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import DecisionPicker from '@/modules/decisions/components/DecisionPicker';
import { logEvent } from '@/modules/accounting/data/eventsRepository';
import {
  getCashAccounts,
  createCashAccount,
  updateCashAccount,
  getCashTransactions,
  createCashTransaction,
  approveCashTransaction,
  deleteCashTransaction,
  getCashRegisterSummary,
  exportCashRegisterCSV,
  createCashReconciliation,
  getLastReconciliation,
  getCashSettings,
  createCashTransfer,
} from '@/modules/accounting/data/kasaRepository';
import { getBankAccountsForProfile } from '@/modules/banking/data/bankAccountRepository';
import type { BankAccount } from '@/modules/banking/bank';
import type {
  CashAccount,
  CashTransaction,
  CashTransactionType,
  CashCategory,
  CashRegisterSummary,
  CashReconciliation,
  CashSettings,
  CreateCashAccountInput,
  CreateCashTransactionInput,
  TransferType,
} from '@/modules/accounting/kasa';
import {
  CASH_CATEGORY_LABELS,
  KP_CATEGORIES,
  KW_CATEGORIES,
} from '@/modules/accounting/kasa';

const Kasa = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [settings, setSettings] = useState<CashSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('transactions');

  // Dialogs
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(null);
  const [transactionType, setTransactionType] = useState<CashTransactionType>('KW');

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    opening_balance: 0,
    responsible_person: '',
    decision_id: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    counterparty_name: '',
    counterparty_tax_id: '',
    category: '' as CashCategory | '',
    is_tax_deductible: true,
  });

  const [reconciliationForm, setReconciliationForm] = useState({
    counted_balance: 0,
    explanation: '',
  });

  const [transferForm, setTransferForm] = useState({
    transfer_type: 'bank_to_cash' as TransferType,
    bank_account_id: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (selectedProfileId) {
      setSelectedAccountId(null);
      loadData();
    }
  }, [selectedProfileId]);

  useEffect(() => {
    if (selectedAccountId && selectedProfileId) {
      loadTransactions();
      loadSummary();
    }
  }, [selectedAccountId, selectedProfileId, dateFilter]);

  const loadData = async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const [accountsData, settingsData, bankAccountsData] = await Promise.all([
        getCashAccounts(selectedProfileId),
        getCashSettings(selectedProfileId),
        getBankAccountsForProfile(selectedProfileId),
      ]);
      setAccounts(accountsData);
      setSettings(settingsData);
      setBankAccounts(bankAccountsData);

      if (accountsData.length > 0) {
        const stillValid = selectedAccountId && accountsData.some(a => a.id === selectedAccountId);
        setSelectedAccountId(stillValid ? selectedAccountId : accountsData[0].id);
      } else {
        setSelectedAccountId(null);
      }
    } catch (error) {
      console.error('Error loading cash data:', error);
      toast.error('Błąd podczas ładowania danych kasy');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!selectedProfileId || !selectedAccountId) return;
    try {
      const txs = await getCashTransactions(selectedProfileId, {
        cashAccountId: selectedAccountId,
        startDate: dateFilter.start,
        endDate: dateFilter.end,
      });
      setTransactions(txs);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadSummary = async () => {
    if (!selectedProfileId || !selectedAccountId) return;
    try {
      const summaryData = await getCashRegisterSummary(
        selectedProfileId,
        selectedAccountId,
        dateFilter.start,
        dateFilter.end
      );
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleCreateAccount = async () => {
    if (!selectedProfileId) return;
    
    // Require decision for spółki
    const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';
    if (isSpoolka && !accountForm.decision_id) {
      toast.error('Wybierz decyzję autoryzującą utworzenie kasy');
      return;
    }
    
    try {
      const input: CreateCashAccountInput = {
        business_profile_id: selectedProfileId,
        name: accountForm.name,
        opening_balance: accountForm.opening_balance,
        responsible_person: accountForm.responsible_person || null,
      };
      const newAccount = await createCashAccount(input);
      
      // Log event for cash register creation
      await logEvent(
        selectedProfileId,
        'bank_account_created',
        'cash_account',
        newAccount.id,
        `Utworzono kasę: ${accountForm.name}`,
        {
          decisionId: accountForm.decision_id || undefined,
          entityReference: accountForm.name,
          changes: {
            name: accountForm.name,
            opening_balance: accountForm.opening_balance,
            responsible_person: accountForm.responsible_person,
          },
        }
      );
      
      toast.success('Kasa utworzona');
      setAccountDialogOpen(false);
      setAccountForm({ name: '', opening_balance: 0, responsible_person: '', decision_id: '' });
      loadData();
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Błąd podczas tworzenia kasy');
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;
    try {
      await updateCashAccount(editingAccount.id, {
        name: accountForm.name,
        responsible_person: accountForm.responsible_person || null,
      });
      toast.success('Kasa zaktualizowana');
      setAccountDialogOpen(false);
      setEditingAccount(null);
      setAccountForm({ name: '', opening_balance: 0, responsible_person: '', decision_id: '' });
      loadData();
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Błąd podczas aktualizacji kasy');
    }
  };

  const handleCreateTransaction = async () => {
    if (!selectedProfileId || !selectedAccountId || !transactionForm.category) return;
    
    // Check for high expense warning
    if (
      transactionType === 'KW' &&
      settings?.high_expense_warning_threshold &&
      transactionForm.amount > settings.high_expense_warning_threshold
    ) {
      const confirmed = window.confirm(
        `Uwaga: Kwota ${transactionForm.amount.toFixed(2)} zł przekracza próg ostrzeżenia (${settings.high_expense_warning_threshold.toFixed(2)} zł). Czy na pewno chcesz kontynuować?`
      );
      if (!confirmed) return;
    }

    try {
      const input: CreateCashTransactionInput = {
        business_profile_id: selectedProfileId,
        cash_account_id: selectedAccountId,
        type: transactionType,
        amount: transactionForm.amount,
        date: transactionForm.date,
        description: transactionForm.description,
        counterparty_name: transactionForm.counterparty_name || null,
        counterparty_tax_id: transactionForm.counterparty_tax_id || null,
        category: transactionForm.category as CashCategory,
        is_tax_deductible: transactionForm.is_tax_deductible,
      };
      await createCashTransaction(input);
      toast.success(`Dokument ${transactionType} utworzony`);
      setTransactionDialogOpen(false);
      resetTransactionForm();
      loadTransactions();
      loadSummary();
      loadData();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Błąd podczas tworzenia dokumentu');
    }
  };

  const handleApproveTransaction = async (id: string) => {
    try {
      await approveCashTransaction(id);
      toast.success('Dokument zatwierdzony');
      loadTransactions();
    } catch (error) {
      console.error('Error approving transaction:', error);
      toast.error('Błąd podczas zatwierdzania');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten dokument?')) return;
    try {
      await deleteCashTransaction(id);
      toast.success('Dokument usunięty');
      loadTransactions();
      loadSummary();
      loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Błąd podczas usuwania');
    }
  };

  const handleReconciliation = async () => {
    if (!selectedProfileId || !selectedAccountId) return;
    try {
      await createCashReconciliation({
        business_profile_id: selectedProfileId,
        cash_account_id: selectedAccountId,
        counted_balance: reconciliationForm.counted_balance,
        explanation: reconciliationForm.explanation || null,
      });
      toast.success('Uzgodnienie kasy zapisane');
      setReconciliationDialogOpen(false);
      setReconciliationForm({ counted_balance: 0, explanation: '' });
      loadSummary();
      loadData();
    } catch (error) {
      console.error('Error creating reconciliation:', error);
      toast.error('Błąd podczas uzgodnienia kasy');
    }
  };

  const handleExportCSV = async () => {
    if (!selectedProfileId || !selectedAccountId) return;
    try {
      const csv = await exportCashRegisterCSV(
        selectedProfileId,
        selectedAccountId,
        dateFilter.start,
        dateFilter.end
      );
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kasa_${selectedAccountId}_${dateFilter.start}_${dateFilter.end}.csv`;
      link.click();
      toast.success('Eksport CSV zakończony');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Błąd podczas eksportu');
    }
  };

  const handleTransfer = async () => {
    if (!selectedProfileId || !selectedAccountId || !transferForm.amount) return;
    try {
      await createCashTransfer({
        business_profile_id: selectedProfileId,
        cash_account_id: selectedAccountId,
        bank_account_id: transferForm.bank_account_id || null,
        transfer_type: transferForm.transfer_type,
        amount: transferForm.amount,
        date: transferForm.date,
        description: transferForm.description || null,
      });
      const actionLabel = transferForm.transfer_type === 'bank_to_cash' 
        ? 'Pobranie z banku' 
        : 'Wpłata do banku';
      toast.success(`${actionLabel} zarejestrowane`);
      setTransferDialogOpen(false);
      setTransferForm({
        transfer_type: 'bank_to_cash',
        bank_account_id: '',
        amount: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
      });
      loadTransactions();
      loadSummary();
      loadData();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error('Błąd podczas rejestracji transferu');
    }
  };

  const openTransferDialog = () => {
    setTransferForm({
      transfer_type: 'bank_to_cash',
      bank_account_id: bankAccounts.length > 0 ? bankAccounts[0].id : '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
    });
    setTransferDialogOpen(true);
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      counterparty_name: '',
      counterparty_tax_id: '',
      category: '',
      is_tax_deductible: true,
    });
  };

  const openNewTransaction = (type: CashTransactionType) => {
    setTransactionType(type);
    resetTransactionForm();
    setTransactionDialogOpen(true);
  };

  const openEditAccount = (account: CashAccount) => {
    setEditingAccount(account);
    setAccountForm({
      name: account.name,
      opening_balance: account.opening_balance,
      responsible_person: account.responsible_person || '',
    });
    setAccountDialogOpen(true);
  };

  const openReconciliation = () => {
    const currentAccount = accounts.find(a => a.id === selectedAccountId);
    setReconciliationForm({
      counted_balance: currentAccount?.current_balance || 0,
      explanation: '',
    });
    setReconciliationDialogOpen(true);
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const filteredTransactions = transactions.filter(tx =>
    tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.document_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.counterparty_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = transactionType === 'KP' ? KP_CATEGORIES : KW_CATEGORIES;

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Kasa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zarządzaj gotówką spółki (wpłaty i wypłaty fizycznej gotówki)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingAccount(null);
              setAccountForm({ name: '', opening_balance: 0, responsible_person: '', decision_id: '' });
              setAccountDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nowa kasa
          </Button>
        </div>
      </div>

      {/* Cash Accounts Selector */}
      {accounts.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {accounts.map(account => (
                <Button
                  key={account.id}
                  variant={selectedAccountId === account.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAccountId(account.id)}
                  className="flex items-center gap-2"
                >
                  <Banknote className="h-4 w-4" />
                  {account.name}
                  <Badge variant={account.status === 'active' ? 'default' : 'secondary'} className="ml-1">
                    {account.current_balance.toFixed(2)} {account.currency}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {selectedAccount && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Wpływy (KP)</p>
                  <p className="text-lg font-semibold text-green-600">
                    +{summary.totalKP.toFixed(2)} zł
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Wydatki (KW)</p>
                  <p className="text-lg font-semibold text-red-600">
                    -{summary.totalKW.toFixed(2)} zł
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Stan kasy</p>
                  <p className="text-lg font-semibold">
                    {summary.currentBalance.toFixed(2)} zł
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                {summary.lastReconciliation ? (
                  summary.lastReconciliation.result === 'match' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Ostatnie uzgodnienie</p>
                  <p className="text-sm font-medium">
                    {summary.lastReconciliation
                      ? format(new Date(summary.lastReconciliation.reconciliation_date), 'd MMM yyyy', { locale: pl })
                      : 'Brak'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {selectedAccount && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setTransactionType('KP');
                    setTransactionForm({
                      amount: 0,
                      date: format(new Date(), 'yyyy-MM-dd'),
                      description: 'Wpłata kapitału własnego',
                      counterparty_name: selectedProfile?.name || '',
                      counterparty_tax_id: '',
                      category: 'capital_contribution',
                      is_tax_deductible: false,
                    });
                    setTransactionDialogOpen(true);
                  }}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Wpłata kapitału
                </Button>
                <Button
                  onClick={() => openNewTransaction('KP')}
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  KP (Wpłata)
                </Button>
                <Button
                  onClick={() => openNewTransaction('KW')}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  KW (Wypłata)
                </Button>
                <Button
                  onClick={openTransferDialog}
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Transfer
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openReconciliation}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Uzgodnij kasę
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Eksport CSV
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditAccount(selectedAccount)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edytuj kasę
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po opisie, numerze lub kontrahencie..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFilter.start}
                  onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="w-auto"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={dateFilter.end}
                  onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="w-auto"
                />
              </div>
            </div>

            {/* Transactions Table */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak dokumentów kasowych w wybranym okresie</p>
                <p className="text-sm mt-1">
                  Dodaj pierwszy dokument KP lub KW
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr dokumentu</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead>Kontrahent</TableHead>
                      <TableHead>Kategoria</TableHead>
                      <TableHead className="text-right">Kwota</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">
                          {tx.document_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(tx.date), 'd MMM yyyy', { locale: pl })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.type === 'KP' ? 'default' : 'destructive'}
                            className={tx.type === 'KP' ? 'bg-green-600' : ''}
                          >
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell>
                          {tx.counterparty_name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CASH_CATEGORY_LABELS[tx.category] || tx.category}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${tx.type === 'KP' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'KP' ? '+' : '-'}{tx.amount.toFixed(2)} zł
                        </TableCell>
                        <TableCell>
                          {tx.is_approved ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Zatwierdzony
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Oczekuje
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!tx.is_approved && (
                                <DropdownMenuItem onClick={() => handleApproveTransaction(tx.id)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Zatwierdź
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Usuń
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No accounts message */}
      {accounts.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Brak kas</h3>
            <p className="text-muted-foreground mb-4">
              Utwórz pierwszą kasę, aby rozpocząć śledzenie gotówki
            </p>
            <Button onClick={() => setAccountDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Utwórz kasę
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edytuj kasę' : 'Nowa kasa'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? 'Zaktualizuj dane kasy'
                : 'Utwórz nową kasę do zarządzania gotówką'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="account-name">Nazwa kasy</Label>
              <Input
                id="account-name"
                value={accountForm.name}
                onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="np. Kasa główna, Kasa kierowcy"
              />
            </div>
            {!editingAccount && (
              <div>
                <Label htmlFor="opening-balance">Saldo początkowe (PLN)</Label>
                <Input
                  id="opening-balance"
                  type="number"
                  step="0.01"
                  value={accountForm.opening_balance}
                  onChange={e => setAccountForm(prev => ({ ...prev, opening_balance: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            )}
            <div>
              <Label htmlFor="responsible-person">Osoba odpowiedzialna</Label>
              <Input
                id="responsible-person"
                value={accountForm.responsible_person}
                onChange={e => setAccountForm(prev => ({ ...prev, responsible_person: e.target.value }))}
                placeholder="np. Jan Kowalski"
              />
            </div>
            {!editingAccount && (selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa') && (
              <div>
                <DecisionPicker
                  businessProfileId={selectedProfileId || ''}
                  value={accountForm.decision_id}
                  onValueChange={(id) => setAccountForm(prev => ({ ...prev, decision_id: id }))}
                  categoryFilter="cash_management"
                  required={true}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={editingAccount ? handleUpdateAccount : handleCreateAccount}
              disabled={!accountForm.name}
            >
              {editingAccount ? 'Zapisz' : 'Utwórz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {transactionType === 'KP' ? (
                <>
                  <ArrowDownCircle className="h-5 w-5 text-green-600" />
                  <span>Nowy dokument KP (Wpłata)</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-5 w-5 text-red-600" />
                  <span>Nowy dokument KW (Wypłata)</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {transactionType === 'KP'
                ? 'Zarejestruj wpłatę gotówki do kasy'
                : 'Zarejestruj wydatek gotówkowy'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tx-amount">Kwota (PLN)</Label>
                <Input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transactionForm.amount || ''}
                  onChange={e => setTransactionForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="tx-date">Data</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={transactionForm.date}
                  onChange={e => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tx-category">Kategoria</Label>
              <Select
                value={transactionForm.category}
                onValueChange={value => setTransactionForm(prev => ({ ...prev, category: value as CashCategory }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {CASH_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transactionForm.category === 'capital_contribution' && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  Wpłata kapitału własnego do kasy firmowej (nie podlega opodatkowaniu)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="tx-description">Opis / tytuł</Label>
              <Textarea
                id="tx-description"
                value={transactionForm.description}
                onChange={e => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="np. Zakup paliwa, tankowanie pojazdu WE12345"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tx-counterparty">Kontrahent</Label>
                <Input
                  id="tx-counterparty"
                  value={transactionForm.counterparty_name}
                  onChange={e => setTransactionForm(prev => ({ ...prev, counterparty_name: e.target.value }))}
                  placeholder="Nazwa firmy lub osoby"
                />
              </div>
              <div>
                <Label htmlFor="tx-tax-id">NIP kontrahenta</Label>
                <Input
                  id="tx-tax-id"
                  value={transactionForm.counterparty_tax_id}
                  onChange={e => setTransactionForm(prev => ({ ...prev, counterparty_tax_id: e.target.value }))}
                  placeholder="1234567890"
                />
              </div>
            </div>
            {transactionType === 'KW' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tx-deductible"
                  checked={transactionForm.is_tax_deductible}
                  onChange={e => setTransactionForm(prev => ({ ...prev, is_tax_deductible: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="tx-deductible" className="text-sm font-normal">
                  Koszt uzyskania przychodu (odliczany od podatku)
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleCreateTransaction}
              disabled={!transactionForm.amount || !transactionForm.category || !transactionForm.description}
              className={transactionType === 'KP' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Zapisz {transactionType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog open={reconciliationDialogOpen} onOpenChange={setReconciliationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Uzgodnienie kasy
            </DialogTitle>
            <DialogDescription>
              Policz fizyczną gotówkę i wprowadź stan kasy
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Stan systemowy:</span>
                  <span className="font-medium">
                    {selectedAccount?.current_balance.toFixed(2)} zł
                  </span>
                </div>
              </CardContent>
            </Card>
            <div>
              <Label htmlFor="counted-balance">Policzony stan gotówki (PLN)</Label>
              <Input
                id="counted-balance"
                type="number"
                step="0.01"
                value={reconciliationForm.counted_balance || ''}
                onChange={e => setReconciliationForm(prev => ({ ...prev, counted_balance: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            {selectedAccount && reconciliationForm.counted_balance !== selectedAccount.current_balance && (
              <Card className={`border-2 ${
                reconciliationForm.counted_balance > selectedAccount.current_balance
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
              }`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-5 w-5 ${
                      reconciliationForm.counted_balance > selectedAccount.current_balance
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`} />
                    <div>
                      <p className="font-medium">
                        {reconciliationForm.counted_balance > selectedAccount.current_balance
                          ? 'Nadwyżka'
                          : 'Niedobór'}
                        : {Math.abs(reconciliationForm.counted_balance - selectedAccount.current_balance).toFixed(2)} zł
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Wymagane jest wyjaśnienie różnicy
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {selectedAccount && reconciliationForm.counted_balance !== selectedAccount.current_balance && (
              <div>
                <Label htmlFor="explanation">Wyjaśnienie różnicy</Label>
                <Textarea
                  id="explanation"
                  value={reconciliationForm.explanation}
                  onChange={e => setReconciliationForm(prev => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Opisz przyczynę różnicy między stanem systemowym a policzonym..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconciliationDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleReconciliation}
              disabled={
                selectedAccount &&
                reconciliationForm.counted_balance !== selectedAccount.current_balance &&
                !reconciliationForm.explanation
              }
            >
              Zapisz uzgodnienie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
              Transfer Bank ↔ Kasa
            </DialogTitle>
            <DialogDescription>
              Zarejestruj pobranie gotówki z banku lub wpłatę do banku
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kierunek transferu</Label>
              <Select
                value={transferForm.transfer_type}
                onValueChange={value => setTransferForm(prev => ({ ...prev, transfer_type: value as TransferType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_to_cash">
                    Bank → Kasa (pobranie gotówki)
                  </SelectItem>
                  <SelectItem value="cash_to_bank">
                    Kasa → Bank (wpłata gotówki)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bankAccounts.length > 0 && (
              <div>
                <Label>Konto bankowe</Label>
                <Select
                  value={transferForm.bank_account_id}
                  onValueChange={value => setTransferForm(prev => ({ ...prev, bank_account_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz konto bankowe" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(ba => (
                      <SelectItem key={ba.id} value={ba.id}>
                        {ba.bankName} - {ba.accountNumber?.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transfer-amount">Kwota (PLN)</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferForm.amount || ''}
                  onChange={e => setTransferForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="transfer-date">Data</Label>
                <Input
                  id="transfer-date"
                  type="date"
                  value={transferForm.date}
                  onChange={e => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="transfer-description">Opis (opcjonalnie)</Label>
              <Input
                id="transfer-description"
                value={transferForm.description}
                onChange={e => setTransferForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="np. Pobranie na zakupy, Wpłata utargu"
              />
            </div>
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm">
                  {transferForm.transfer_type === 'bank_to_cash' ? (
                    <>
                      <ArrowDownCircle className="h-4 w-4 text-green-600" />
                      <span>Saldo kasy zwiększy się o <strong>{transferForm.amount.toFixed(2)} zł</strong></span>
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="h-4 w-4 text-red-600" />
                      <span>Saldo kasy zmniejszy się o <strong>{transferForm.amount.toFixed(2)} zł</strong></span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!transferForm.amount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Zarejestruj transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Kasa;
