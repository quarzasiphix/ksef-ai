import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Invoice, InvoiceType } from '@/shared/types';
import { Badge } from '@/shared/ui/badge';
import { Plus, ArrowDownCircle, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { useGlobalData } from '@/shared/hooks/use-global-data';
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useProjectScope } from "@/shared/context/ProjectContext";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { saveInvoice } from '@/modules/invoices/data/invoiceRepository';
import { LedgerView } from '@/modules/invoices/components/ledger/LedgerView';
import { PeriodSwitcherMobile } from '@/modules/invoices/components/ledger/PeriodSwitcherMobile';
import { FilterSheetMobile } from '@/modules/invoices/components/ledger/FilterSheetMobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { getAvailableYears } from '@/shared/lib/ledger-utils';

type SmartFilter = 'all' | 'unpaid' | 'paid' | 'overdue';

const isSharedExpense = (expense: any) =>
  (expense?.isShared) ||
  (typeof expense?.id === 'string' && expense.id.startsWith('share-'));

export default function ExpenseList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { expenses: { data: allExpenses = [], isLoading: isLoadingExpenses } } = useGlobalData();
  const { selectedProfileId } = useBusinessProfile();
  const { selectedProjectId, selectedProject } = useProjectScope();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];

    return allExpenses.filter(expense => {
      const isShared = isSharedExpense(expense);

      if (!isShared && selectedProfileId && expense.businessProfileId !== selectedProfileId) {
        return false;
      }
      if (!isShared && selectedProjectId && expense.projectId !== selectedProjectId) {
        return false;
      }

      const type = (expense.transactionType || (expense as any).transaction_type || "").toString().toLowerCase();
      if (type !== "expense") return false;

      const matchesSearch =
        expense.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      let matchesSmartFilter = true;
      const isPaid = (expense as any).isPaid || (expense as any).status === 'paid';
      const dueDate = expense.dueDate ? new Date(expense.dueDate) : null;
      const isOverdue = dueDate && dueDate < new Date() && !isPaid;

      switch (smartFilter) {
        case 'unpaid':
          matchesSmartFilter = !isPaid;
          break;
        case 'paid':
          matchesSmartFilter = isPaid;
          break;
        case 'overdue':
          matchesSmartFilter = !!isOverdue;
          break;
        default:
          matchesSmartFilter = true;
      }

      // Period filtering (mobile)
      let matchesPeriod = true;
      if (selectedYear !== null) {
        // Use issue_date for expenses
        const dateString = expense.date || expense.issueDate;
        const expenseDate = new Date(dateString);
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth() + 1;
        
        if (selectedMonth !== null) {
          matchesPeriod = expenseYear === selectedYear && expenseMonth === selectedMonth;
        } else {
          matchesPeriod = expenseYear === selectedYear;
        }
      }

      return matchesSearch && matchesSmartFilter && matchesPeriod;
    });
  }, [allExpenses, selectedProfileId, selectedProjectId, searchTerm, smartFilter, selectedYear, selectedMonth]);

  const availableYears = useMemo(() => {
    if (!allExpenses) return [];
    return getAvailableYears(allExpenses.filter(exp => {
      const type = (exp.transactionType || (exp as any).transaction_type || "").toString().toLowerCase();
      return type === "expense";
    }));
  }, [allExpenses]);

  const stats = useMemo(() => {
    const unpaid = filteredExpenses.filter(e => !(e as any).isPaid);
    const totalPending = unpaid.reduce((sum, e) => sum + (e.amount || e.totalGrossValue || 0), 0);
    const overdue = filteredExpenses.filter(e => {
      const isPaid = (e as any).isPaid;
      const dueDate = e.dueDate ? new Date(e.dueDate) : null;
      return dueDate && dueDate < new Date() && !isPaid;
    });
    
    return {
      total: filteredExpenses.length,
      pending: unpaid.length,
      overdue: overdue.length,
      totalPending,
    };
  }, [filteredExpenses]);

  const handleAddZus = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const desc = `ZUS składka ${month}/${year}`;
    const date = today.toISOString().slice(0, 10);
    navigate(`/expense/new?zus=1&desc=${encodeURIComponent(desc)}&date=${date}`);
  };

  const handleTogglePaid = async (id: string, expense: Invoice) => {
    try {
      const updatedInvoice = { ...expense, isPaid: !expense.isPaid };
      await saveInvoice(updatedInvoice);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(updatedInvoice.isPaid ? 'Oznaczono jako zapłacone' : 'Oznaczono jako niezapłacone');
    } catch (error) {
      console.error('Error toggling paid status:', error);
      toast.error('Błąd podczas zmiany statusu płatności');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Wydatek został usunięty');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Błąd podczas usuwania wydatku');
    }
  };

  if (isLoadingExpenses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden py-6 space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ArrowDownCircle className="h-8 w-8 text-red-500" />
            Rejestr wydatków
          </h1>
          <p className="text-muted-foreground mt-1">
            Chronologiczny rejestr zdarzeń kosztowych z podsumowaniami okresowymi
          </p>
          {selectedProject && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedProject.color || '#0ea5e9' }}
              />
              <span>
                Widok projektu:{" "}
                <span className="font-semibold">{selectedProject.name}</span>
                {selectedProject.code && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({selectedProject.code})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/expense/new">
              <Plus className="h-4 w-4 mr-2" />
              Nowy wydatek
            </Link>
          </Button>
          <Button variant="outline" onClick={handleAddZus}>
            Dodaj ZUS
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie wydatki</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">faktur kosztowych</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Do zapłaty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">niezapłaconych</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przeterminowane</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">wymaga uwagi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartość do zapłaty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pl-PL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(stats.totalPending)} zł
            </div>
            <p className="text-xs text-muted-foreground">do zapłaty</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-3">
                Zdarzenia kosztowe
                {selectedProject && (
                  <span className="text-xs font-semibold uppercase tracking-wide inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: selectedProject.color || '#0ea5e9' }}
                    />
                    Projekt: {selectedProject.name}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Dokumenty ujęte w systemie: {filteredExpenses.length}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center flex-wrap w-full">
              {isMobile ? (
                <>
                  <PeriodSwitcherMobile
                    years={availableYears}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onPeriodSelect={(year, month) => {
                      setSelectedYear(year);
                      setSelectedMonth(month || null);
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant={smartFilter !== 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsMobileFiltersOpen(true)}
                    className="gap-1.5"
                  >
                    <Filter className="h-4 w-4" />
                    {smartFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-1">1</Badge>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={isFiltersOpen ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="gap-1.5"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filtry</span>
                    {smartFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-1">1</Badge>
                    )}
                  </Button>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj: kontrahent, opis..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleContent>
            <div className="px-6 pb-4 border-b">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status płatności</label>
                <Select value={smartFilter} onValueChange={(value: SmartFilter) => setSmartFilter(value)}>
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="unpaid">Niezapłacone</SelectItem>
                    <SelectItem value="paid">Zapłacone</SelectItem>
                    <SelectItem value="overdue">Przeterminowane</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <CardContent className="pt-6">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto space-y-3">
                <div className="text-lg font-medium">
                  {smartFilter !== 'all'
                    ? 'Brak dokumentów spełniających kryteria'
                    : searchTerm.length > 0
                    ? 'Brak wyników wyszukiwania'
                    : 'Brak zarejestrowanych wydatków'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {searchTerm.length > 0
                    ? 'Spróbuj wyszukać po nazwie kontrahenta lub opisie.'
                    : 'Dodaj swój pierwszy wydatek.'}
                </p>
                {smartFilter === 'all' && searchTerm.length === 0 && (
                  <Link
                    to="/expense/new"
                    className="inline-flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nowy wydatek
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <LedgerView
              invoices={filteredExpenses}
              isIncome={false}
              onView={(id) => {
                const expense = filteredExpenses.find(e => e.id === id);
                if (expense && isSharedExpense(expense)) {
                  const invoiceId =
                    (expense as any).linkedInvoiceId ||
                    (expense as any).invoiceId ||
                    expense.id.replace(/^share-/, '');
                  navigate(`/expense/${invoiceId}`);
                } else {
                  navigate(`/expense/${id}`);
                }
              }}
              onEdit={(id) => navigate(`/expense/edit/${id}`)}
              onDelete={handleDelete}
              onTogglePaid={handleTogglePaid}
            />
          )}
        </CardContent>
      </Card>

      {isMobile && (
        <>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj: kontrahent, opis..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <FilterSheetMobile
            isOpen={isMobileFiltersOpen}
            onOpenChange={setIsMobileFiltersOpen}
            smartFilter={smartFilter as any}
            documentTypeFilter={'all'}
            onSmartFilterChange={(filter) => {
              const mapping: Record<string, SmartFilter> = {
                'all': 'all',
                'unpaid_issued': 'unpaid',
                'paid_not_booked': 'paid',
                'overdue': 'overdue'
              };
              setSmartFilter(mapping[filter] || 'all');
            }}
            onDocumentTypeFilterChange={() => {}}
            onReset={() => setSmartFilter('all')}
            isIncome={false}
          />
        </>
      )}
    </div>
  );
}
