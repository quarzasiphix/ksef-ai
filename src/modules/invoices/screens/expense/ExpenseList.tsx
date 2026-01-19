import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Invoice, InvoiceType } from '@/shared/types';
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/shared/ui/badge';
import { Plus, FileText, AlertCircle, Clock, CheckCircle2, MessageSquare, ArrowDownCircle, TrendingUp, Calendar, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { useGlobalData } from '@/shared/hooks/use-global-data';
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useProjectScope } from "@/shared/context/ProjectContext";

import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import ExpenseCard from '@/modules/invoices/components/expenses/ExpenseCard';
import ExpenseListView from '@/modules/invoices/components/expenses/ExpenseListView';
import { formatCurrency } from '@/shared/lib/utils';
import { Checkbox } from '@/shared/ui/checkbox';
import { LayoutGrid, List as ListIcon } from 'lucide-react';
import { saveInvoice } from '@/modules/invoices/data/invoiceRepository';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const ZUS_NIP = "5220005994";
const ZUS_NAME = "ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH";

const isSharedExpense = (expense: any) =>
  (expense?.isShared) ||
  (typeof expense?.id === 'string' && expense.id.startsWith('share-'));

const getExpenseDetailPath = (expense: any) => {
  if (isSharedExpense(expense)) {
    const invoiceId =
      expense?.linkedInvoiceId ||
      expense?.invoiceId ||
      expense?.id?.replace(/^share-/, '') ||
      expense?.id;
    return `/expense/${invoiceId}`;
  }
  return `/expense/${expense?.id}`;
};

// ExpenseList component for displaying a list of expenses
export default function ExpenseList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "upcoming">("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const { expenses: { data: allExpenses = [], isLoading: isLoadingExpenses } } = useGlobalData();
  const { selectedProfileId } = useBusinessProfile();
  const { selectedProjectId, selectedProject } = useProjectScope();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];

    const list = allExpenses.filter(expense => {
      const isShared = isSharedExpense(expense);

      // Apply business profile filter only to own expenses; always include shared ones
      if (!isShared && selectedProfileId && expense.businessProfileId !== selectedProfileId) {
        return false;
      }
      if (!isShared && selectedProjectId && expense.projectId !== selectedProjectId) {
        return false;
      }

      const type = (expense.transactionType || (expense as any).transaction_type || "").toString().toLowerCase();
      return type === "expense";
    });

    console.log("Filtered expenses count:", list.length);
    return list;
  }, [allExpenses, selectedProfileId, selectedProjectId]);

  // Categorize expenses
  const categorizedExpenses = useMemo(() => {
    const today = new Date();
    const urgent: typeof filteredExpenses = [];
    const needsReview: typeof filteredExpenses = [];
    const upcoming: typeof filteredExpenses = [];
    const paid: typeof filteredExpenses = [];
    const overdue: typeof filteredExpenses = [];

    filteredExpenses.forEach(expense => {
      const dueDate = expense.dueDate ? new Date(expense.dueDate) : null;
      const isPaid = (expense as any).isPaid || (expense as any).status === 'paid';
      const isReceived = isSharedExpense(expense);
      
      if (isPaid) {
        paid.push(expense);
      } else if (dueDate) {
        const daysUntilDue = differenceInDays(dueDate, today);
        
        if (daysUntilDue < 0) {
          overdue.push(expense);
        } else if (daysUntilDue <= 7) {
          urgent.push(expense);
        } else if (daysUntilDue <= 30) {
          upcoming.push(expense);
        }
      }
      
      if (isReceived && !isPaid) {
        needsReview.push(expense);
      }
    });

    return { urgent, needsReview, upcoming, paid, overdue, all: filteredExpenses };
  }, [filteredExpenses]);

  // Calculate stats
  const stats = useMemo(() => {
    const unpaid = filteredExpenses.filter(e => !(e as any).isPaid);
    const totalPending = unpaid.reduce((sum, e) => sum + (e.amount || e.totalGrossValue || 0), 0);
    
    return {
      total: filteredExpenses.length,
      pending: unpaid.length,
      urgent: categorizedExpenses.urgent.length + categorizedExpenses.overdue.length,
      needsReview: categorizedExpenses.needsReview.length,
      totalPending,
    };
  }, [filteredExpenses, categorizedExpenses]);

  const isLoading = isLoadingExpenses;

  const handleAddZus = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const desc = `ZUS składka ${month}/${year}`;
    const date = today.toISOString().slice(0, 10);
    navigate(`/expense/new?zus=1&desc=${encodeURIComponent(desc)}&date=${date}`);
  };

  const toggleExpenseSelection = (expenseId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    setSelectedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId);
      } else {
        newSet.add(expenseId);
      }
      return newSet;
    });
  };

  const handleMarkAsPaid = async (id: string, expense: Invoice) => {
    try {
      await saveInvoice({ ...expense, isPaid: true });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Oznaczono jako zapłacone');
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Błąd podczas oznaczania jako zapłacone');
    }
  };

  const handleMarkAsUnpaid = async (id: string, expense: Invoice) => {
    try {
      await saveInvoice({ ...expense, isPaid: false });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Oznaczono jako niezapłacone');
    } catch (error) {
      console.error('Error marking as unpaid:', error);
      toast.error('Błąd podczas oznaczania jako niezapłacone');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden py-6 space-y-6 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ArrowDownCircle className="h-8 w-8 text-red-500" />
            Wydatki
          </h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj fakturami kosztowymi i płatnościami
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

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie wydatki</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">faktur kosztowych</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Do zapłaty</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">niezapłaconych</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pilne</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <p className="text-xs text-muted-foreground">wymaga uwagi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartość do zapłaty</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalPending)}
            </div>
            <p className="text-xs text-muted-foreground">PLN do zapłaty</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">
              Wszystkie
              <Badge className="ml-2">{stats.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Do zapłaty
              <Badge className="ml-2 bg-amber-500">{stats.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Nadchodzące
              <Badge className="ml-2 bg-blue-500">{categorizedExpenses.upcoming.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* View Mode Toggle */}
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            className={`px-3 py-2 text-sm flex items-center gap-2 ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            onClick={() => setViewMode('grid')}
            aria-label="Widok siatki"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Siatka</span>
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm flex items-center gap-2 border-l ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            onClick={() => setViewMode('list')}
            aria-label="Widok listy"
          >
            <ListIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {/* Urgent/Overdue Section - Always visible if there are urgent items */}
          {(categorizedExpenses.urgent.length > 0 || categorizedExpenses.overdue.length > 0) && (
            <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  Pilne - Wymaga natychmiastowej uwagi!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...categorizedExpenses.overdue, ...categorizedExpenses.urgent].map((expense) => {
                  const dueDate = expense.dueDate ? new Date(expense.dueDate) : null;
                  const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;
                  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                  
                  return (
                    <Card
                      key={expense.id}
                      className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-red-600"
                      onClick={() => navigate(getExpenseDetailPath(expense))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                              <span className="font-semibold text-lg">
                                {expense.description || 'Wydatek'}
                              </span>
                              {isOverdue ? (
                                <Badge className="bg-red-600 text-white">
                                  Przeterminowane {Math.abs(daysUntilDue!)} dni
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-500 text-white">
                                  Termin za {daysUntilDue} dni
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {expense.customerName || (expense as any).counterpartyName || 'Brak kontrahenta'}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-bold text-lg text-red-600">
                                {formatCurrency(expense.amount || expense.totalGrossValue || 0)}
                              </span>
                              {dueDate && (
                                <span className="text-muted-foreground">
                                  Termin: {format(dueDate, 'dd MMM yyyy', { locale: pl })}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            Zapłać teraz
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Needs Review Section - Incoming invoices */}
          {categorizedExpenses.needsReview.length > 0 && (
            <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <MessageSquare className="h-5 w-5" />
                  Nowe faktury otrzymane - Wymaga przeglądu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categorizedExpenses.needsReview.map((expense) => (
                  <Card
                    key={expense.id}
                    className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-600"
                    onClick={() => navigate(getExpenseDetailPath(expense))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-lg">
                              {expense.description || 'Wydatek'}
                            </span>
                            <Badge className="bg-blue-600 text-white">
                              Nowa faktura
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            od: {expense.customerName || (expense as any).counterpartyName || 'Brak kontrahenta'}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-bold text-lg">
                              {formatCurrency(expense.amount || expense.totalGrossValue || 0)}
                            </span>
                            <span className="text-muted-foreground">
                              {format(new Date(expense.issueDate), 'dd MMM yyyy', {
                                locale: pl,
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            Zatwierdź
                          </Button>
                          <Button size="sm" variant="outline">
                            Dyskusja
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Main expense list */}
          {filteredExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Brak zarejestrowanych wydatków</h3>
                <p className="text-muted-foreground mb-4">
                  Dodaj swój pierwszy wydatek
                </p>
                <Link
                  to="/expense/new"
                  className="inline-flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nowy wydatek
                </Link>
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <ExpenseListView
              expenses={activeTab === 'all' ? filteredExpenses : 
                activeTab === 'pending' ? filteredExpenses.filter(e => !(e as any).isPaid) :
                categorizedExpenses.upcoming}
              selectedExpenses={selectedExpenses}
              isMultiSelectMode={isMultiSelectMode}
              onToggleSelection={toggleExpenseSelection}
              onMarkAsPaid={handleMarkAsPaid}
              onMarkAsUnpaid={handleMarkAsUnpaid}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(activeTab === 'all' ? filteredExpenses : 
                activeTab === 'pending' ? filteredExpenses.filter(e => !(e as any).isPaid) :
                categorizedExpenses.upcoming).map(exp => (
                <ExpenseCard
                  key={exp.id}
                  expense={{
                    id: exp.id,
                    issueDate: exp.issueDate,
                    amount: exp.amount || exp.totalGrossValue || 0,
                    description: exp.description,
                    customerName: exp.customerName || (exp as any).buyer?.name,
                    transactionType: exp.transactionType as InvoiceType | any,
                    linkedInvoiceId:
                      (exp as any).linkedInvoiceId ||
                      (exp as any).invoiceId ||
                      null,
                    isShared: isSharedExpense(exp),
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}