import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Invoice, InvoiceType } from "@/shared/types";
import { Plus, Search, Filter, ArrowUpDown, Calculator } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import MonthlySummaryBar, { MonthlySummaryFilter } from '@/modules/invoices/components/MonthlySummaryBar';
import InvoicePDFViewer from "@/modules/invoices/components/InvoicePDFViewer";
import ShareInvoiceDialog from "@/modules/invoices/components/ShareInvoiceDialog";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useProjectScope } from "@/shared/context/ProjectContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { toast } from "sonner";
import { deleteInvoice, saveInvoice } from "@/modules/invoices/data/invoiceRepository";
import { useQueryClient } from "@tanstack/react-query";
import { generateInvoicePdf, getInvoiceFileName } from "@/shared/lib/pdf-utils";
import { useQuery } from "@tanstack/react-query";
import { getBankAccountsForProfile } from "@/modules/banking/data/bankAccountRepository";
import { getBusinessProfileById } from "@/modules/settings/data/businessProfileRepository";
import { supabase } from "@/integrations/supabase/client";
import { LedgerView } from '@/modules/invoices/components/ledger/LedgerView';
import { PeriodSwitcherMobile } from '@/modules/invoices/components/ledger/PeriodSwitcherMobile';
import { FilterSheetMobile } from '@/modules/invoices/components/ledger/FilterSheetMobile';
import { SortSheet } from '@/modules/invoices/components/ledger/SortSheet';
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { getAvailableYears } from '@/shared/lib/ledger-utils';

type SmartFilter = 'all' | 'unpaid_issued' | 'paid_issued' | 'accounted' | 'overdue';
type DocumentTypeFilter = 'all' | 'invoice' | 'receipt' | 'proforma' | 'correction';
type SortType = 'date' | 'number' | 'customer';
type GroupingMode = 'month' | 'quarter' | 'year';
type SubGroupingMode = 'none' | 'month' | 'quarter';

const IncomeList = () => {
  const { invoices: { data: invoices, isLoading } } = useGlobalData();
  const { selectedProfileId } = useBusinessProfile();
  const { selectedProjectId, selectedProject } = useProjectScope();
  const [searchTerm, setSearchTerm] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<DocumentTypeFilter>('all');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'number' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('month');
  const [subGroupingMode, setSubGroupingMode] = useState<SubGroupingMode>('none');
  const [showAccountingInfo, setShowAccountingInfo] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [shareInvoiceId, setShareInvoiceId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Handle share invoice event
  useEffect(() => {
    const handleShareInvoice = (e: Event) => {
      const customEvent = e as CustomEvent<{ invoiceId: string }>;
      setShareInvoiceId(customEvent.detail.invoiceId);
    };

    document.addEventListener('share-invoice', handleShareInvoice as EventListener);
    return () => {
      document.removeEventListener('share-invoice', handleShareInvoice as EventListener);
    };
  }, []);

  // Load additional data needed for operations
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`business_profile_id.eq.${selectedProfileId},is_shared.eq.true`);
      
      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!selectedProfileId,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', selectedProfileId],
    queryFn: () => selectedProfileId ? getBankAccountsForProfile(selectedProfileId) : Promise.resolve([]),
    enabled: !!selectedProfileId,
  });

  const { data: businessProfile } = useQuery({
    queryKey: ['business-profile', selectedProfileId],
    queryFn: () => selectedProfileId ? getBusinessProfileById(selectedProfileId, selectedProfileId) : Promise.resolve(null),
    enabled: !!selectedProfileId,
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    return invoices.filter((invoice) => {
      if (invoice.transactionType !== 'income') return false;
      if (selectedProfileId && invoice.businessProfileId !== selectedProfileId) return false;
      if (selectedProjectId && invoice.projectId !== selectedProjectId) return false;

      const matchesSearch =
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.customerName || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        documentTypeFilter === "all" ||
        (documentTypeFilter === "invoice" && invoice.type === InvoiceType.SALES) ||
        (documentTypeFilter === "receipt" && invoice.type === InvoiceType.RECEIPT) ||
        (documentTypeFilter === "proforma" && invoice.type === InvoiceType.PROFORMA) ||
        (documentTypeFilter === "correction" && invoice.type === InvoiceType.CORRECTION);

      let matchesSmartFilter = true;
      const isPaid = invoice.isPaid || invoice.paid;
      const accountingStatus = invoice.accountingStatus || 'unposted';
      const isPostedToRegister = !!invoice.ryczalt_account_id; // Check if linked to ryczalt account (accounted)
      const isOverdue = new Date(invoice.dueDate) < new Date() && !isPaid;
      
      switch (smartFilter) {
        case 'unpaid_issued':
          matchesSmartFilter = !isPaid;
          break;
        case 'paid_issued':
          matchesSmartFilter = isPaid;
          break;
        case 'accounted':
          matchesSmartFilter = isPostedToRegister;
          break;
        case 'overdue':
          matchesSmartFilter = isOverdue;
          break;
        default:
          matchesSmartFilter = true;
      }

      // Period filtering (mobile)
      let matchesPeriod = true;
      if (selectedYear !== null) {
        const invoiceDate = new Date(invoice.issueDate);
        const invoiceYear = invoiceDate.getFullYear();
        const invoiceMonth = invoiceDate.getMonth() + 1;
        
        if (selectedMonth !== null) {
          matchesPeriod = invoiceYear === selectedYear && invoiceMonth === selectedMonth;
        } else {
          matchesPeriod = invoiceYear === selectedYear;
        }
      }

      return matchesSearch && matchesType && matchesSmartFilter && matchesPeriod;
    });
  }, [invoices, searchTerm, documentTypeFilter, selectedProfileId, smartFilter, selectedProjectId, selectedYear, selectedMonth]);

  const availableYears = useMemo(() => {
    if (!invoices) return [];
    return getAvailableYears(invoices.filter(inv => inv.transactionType === 'income'));
  }, [invoices]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteInvoice(invoiceId);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Dokument został usunięty");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Wystąpił błąd podczas usuwania dokumentu");
    }
  };

  const openPreview = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleTogglePaid = async (id: string, expense: Invoice) => {
    try {
      const updatedInvoice = { ...expense, isPaid: !expense.isPaid };
      await saveInvoice(updatedInvoice);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(updatedInvoice.isPaid ? "Dokument oznaczono jako zapłacony" : "Dokument oznaczono jako niezapłacony");
    } catch (error) {
      console.error("Error toggling paid status:", error);
      toast.error("Wystąpił błąd podczas zmiany statusu płatności");
    }
  };

  const handleSummaryFilter = (filter: MonthlySummaryFilter) => {
    if (filter === 'unpaid_issued') {
      setSmartFilter('unpaid_issued');
    } else if (filter === 'overdue') {
      setSmartFilter('overdue');
    } else {
      setSmartFilter('all');
    }
  };

  const getDocumentTypeName = (type: DocumentTypeFilter) => {
    switch(type) {
      case "all": return "Wszystkie";
      case "invoice": return "Faktury VAT";
      case "receipt": return "Rachunki";
      case "proforma": return "Faktury proforma";
      case "correction": return "Faktury korygujące";
      default: return "Dokumenty";
    }
  };

  const summaryCTA = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="px-4 py-2 text-sm font-semibold">
          <Plus className="mr-2 h-4 w-4" />
          Nowe zdarzenie
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/income/new?type=sales">Faktura VAT</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/income/new?type=receipt">Rachunek</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/income/new?type=proforma">Faktura proforma</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/income/new?type=correction">Faktura korygująca</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Rejestr przychodów</h1>
          <p className="text-muted-foreground mb-6">Chronologiczny rejestr zdarzeń przychodowych z podsumowaniami okresowymi</p>
          {selectedProject && (
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: selectedProject.color || '#0ea5e9' }}
              />
              <div className="text-base font-semibold">
                {selectedProject.name}
              </div>
              {selectedProject.code && (
                <span className="text-xs font-medium bg-white/70 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  {selectedProject.code}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                Pokazujemy tylko zdarzenia przychodowe z tego projektu
              </span>
            </div>
          )}
        </div>
        
      {/*    
        <MonthlySummaryBar
          invoices={invoices}
          transactionType="income"
          cta={summaryCTA}
          onFilter={handleSummaryFilter}
        />
      */}
      </div>
      
      <Card className="md:block hidden md:rounded-lg md:border md:shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-3">
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
                Dokumenty ujęte w systemie: {filteredInvoices.length}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center flex-wrap w-full">
              {isMobile ? (
                <>
                  <Button
                    variant={smartFilter !== 'all' || documentTypeFilter !== 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsMobileFiltersOpen(true)}
                    className="gap-1.5"
                  >
                    <Filter className="h-4 w-4" />
                    {(smartFilter !== 'all' || documentTypeFilter !== 'all') && (
                      <Badge variant="secondary" className="ml-1">
                        {[smartFilter !== 'all' ? 1 : 0, documentTypeFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant={isSortOpen ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsSortOpen(true)}
                    className="gap-1.5"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    <span>Sortuj</span>
                  </Button>
                  <Button
                    variant={searchTerm ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsMobileSearchOpen(true)}
                    className="gap-1.5"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Button
                      variant={isFiltersOpen ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                      className="gap-1.5"
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filtry</span>
                      {(smartFilter !== 'all' || documentTypeFilter !== 'all') && (
                        <Badge variant="secondary" className="ml-1">
                          {[smartFilter !== 'all' ? 1 : 0, documentTypeFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant={isSortOpen ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsSortOpen(!isSortOpen)}
                      className="gap-1.5"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      <span>Sortuj</span>
                    </Button>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj: kontrahent, numer..."
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
        
        <div key="filters-wrapper">
        {isFiltersOpen && (
          <div key="filter-panel" className="border-b">
            <div className="px-6 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Typ dokumentu</label>
                  <Select value={documentTypeFilter} onValueChange={(value: DocumentTypeFilter) => setDocumentTypeFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie typy</SelectItem>
                      <SelectItem value="invoice">Faktury VAT</SelectItem>
                      <SelectItem value="receipt">Rachunki</SelectItem>
                      <SelectItem value="proforma">Faktury proforma</SelectItem>
                      <SelectItem value="correction">Faktury korygujące</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status księgowy</label>
                  <Select value={smartFilter} onValueChange={(value: SmartFilter) => setSmartFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="unpaid_issued">Wystawione, nieopłacone</SelectItem>
                      <SelectItem value="paid_issued">Opłacone</SelectItem>
                      <SelectItem value="accounted">Zaksięgowane</SelectItem>
                      <SelectItem value="overdue">Zaległe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Okres rozliczeniowy</label>
                  <PeriodSwitcherMobile
                    years={availableYears}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onPeriodSelect={(year, month) => {
                      setSelectedYear(year);
                      setSelectedMonth(month || null);
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Accounting Info Section */}
              {businessProfile?.taxType === 'ryczalt' && businessProfile?.entityType === 'JDG' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Podatki</label>
                  <Button
                    variant={showAccountingInfo ? "default" : "outline"}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => setShowAccountingInfo(!showAccountingInfo)}
                  >
                    <Calculator className="h-4 w-4" />
                    <span>Info podatkowe</span>
                    {showAccountingInfo && (
                      <Badge variant="secondary" className="ml-auto">
                        Aktywne
                      </Badge>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Accounting Info Section */}
        {showAccountingInfo && businessProfile?.taxType === 'ryczalt' && businessProfile?.entityType === 'JDG' && (
          <div key="accounting-panel" className="px-6 pb-4 border-b">
            <Card className="bg-blue-50 border-blue-200">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Podsumowanie podatkowe</span>
                  </div>
                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAccountingInfo(false)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Przychód:</span>
                    <span className="font-medium text-blue-900">
                      {filteredInvoices.reduce((sum, inv) => {
                        const isVatExempt = inv.fakturaBezVAT || inv.vat === false;
                        const baseAmount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
                        return inv.currency === 'PLN' || !inv.exchangeRate ? sum + baseAmount : sum + (baseAmount * (inv.exchangeRate || 1));
                      }, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Podatek:</span>
                    <span className="font-medium text-blue-900">
                      ~{(filteredInvoices.reduce((sum, inv) => sum + (inv.totalNetValue || 0), 0) * 0.12).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    * Szacunkowy podatek 12% - oblicz na podstawie formy opodatkowania
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
        </div>
        
        {/* Sort Sheet */}
        <SortSheet
          isOpen={isSortOpen}
          onOpenChange={setIsSortOpen}
          groupingMode={groupingMode}
          subGroupingMode={subGroupingMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onGroupingModeChange={(mode, subMode) => {
            setGroupingMode(mode);
            setSubGroupingMode(subMode);
          }}
          onSortByChange={setSortBy}
          onSortOrderChange={setSortOrder}
          onReset={() => {
            setGroupingMode('month');
            setSubGroupingMode('none');
            setSortBy('date');
            setSortOrder('desc');
          }}
        />
        
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto space-y-3">
                <div className="text-lg font-medium">
                  {smartFilter !== 'all' || documentTypeFilter !== 'all'
                    ? 'Brak dokumentów spełniających kryteria'
                    : searchTerm.length > 0
                    ? 'Brak wyników wyszukiwania'
                    : 'Brak dokumentów'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {searchTerm.length > 0
                    ? 'Spróbuj wyszukać po numerze faktury lub nazwie kontrahenta.'
                    : 'Rozpocznij od utworzenia pierwszego zdarzenia przychodowego.'}
                </p>
              </div>
            </div>
          ) : (
            <LedgerView
              invoices={filteredInvoices}
              isIncome={true}
              sortBy={sortBy}
              sortOrder={sortOrder}
              groupingMode={groupingMode}
              subGroupingMode={subGroupingMode}
              onView={(id) => navigate(`/income/${id}`)}
              onPreview={openPreview}
              onDownload={async (inv) => {
                const customer = customers?.find((c: any) => c.id === inv.customerId);
                await generateInvoicePdf({
                  invoice: inv,
                  businessProfile,
                  customer,
                  filename: getInvoiceFileName(inv),
                  bankAccounts,
                });
              }}
              onEdit={(id) => navigate(`/income/edit/${id}`)}
              onDelete={handleDeleteInvoice}
              onShare={(id) => setShareInvoiceId(id)}
              onDuplicate={(id) => navigate(`/income/new?duplicateId=${id}`)}
              onTogglePaid={handleTogglePaid}
            />
          )}
        </CardContent>
      </Card>

      {/* Mobile version - full width without Card */}
      <div className="md:hidden">
        <div className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold flex flex-wrap items-center gap-3">
                Zdarzenia przychodowe
                {selectedProject && (
                  <span className="text-xs font-semibold uppercase tracking-wide inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: selectedProject.color || '#0ea5e9' }}
                    />
                    Projekt: {selectedProject.name}
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                Dokumenty ujęte w systemie: {filteredInvoices.length}
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap w-full">
              <Button
                variant={smartFilter !== 'all' || documentTypeFilter !== 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsMobileFiltersOpen(true)}
                className="gap-1.5"
              >
                <Filter className="h-4 w-4" />
                {(smartFilter !== 'all' || documentTypeFilter !== 'all') && (
                  <Badge variant="secondary" className="ml-1">
                    {[smartFilter !== 'all' ? 1 : 0, documentTypeFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                  </Badge>
                )}
              </Button>
              <Button
                variant={searchTerm ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsMobileSearchOpen(true)}
                className="gap-1.5"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto space-y-3">
                <div className="text-lg font-medium">
                  {smartFilter !== 'all' || documentTypeFilter !== 'all'
                    ? 'Brak dokumentów spełniających kryteria'
                    : searchTerm.length > 0
                    ? 'Brak wyników wyszukiwania'
                    : 'Brak dokumentów'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {smartFilter !== 'all' || documentTypeFilter !== 'all'
                    ? 'Spróbuj zmienić filtry, aby zobaczyć więcej dokumentów.'
                    : searchTerm.length > 0
                    ? 'Spróbuj zmienić kryteria wyszukiwania.'
                    : 'Dodaj pierwszą fakturę, aby rozpocząć.'}
                </div>
                <div className="pt-4">
                  <Button asChild>
                    <Link to="/income/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj pierwszą fakturę
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <LedgerView
              invoices={filteredInvoices}
              isIncome={true}
              sortBy={sortBy}
              sortOrder={sortOrder}
              groupingMode={groupingMode}
              subGroupingMode={subGroupingMode}
              onView={(id) => navigate(`/income/${id}`)}
              onPreview={openPreview}
              onDownload={async (inv) => {
                const customer = customers?.find((c: any) => c.id === inv.customerId);
                await generateInvoicePdf({
                  invoice: inv,
                  businessProfile,
                  customer,
                  filename: getInvoiceFileName(inv),
                  bankAccounts,
                });
              }}
              onEdit={(id) => navigate(`/income/edit/${id}`)}
              onDelete={handleDeleteInvoice}
              onShare={(id) => setShareInvoiceId(id)}
              onDuplicate={(id) => navigate(`/income/new?duplicateId=${id}`)}
              onTogglePaid={handleTogglePaid}
            />
          )}
        </div>
      </div>

      {isPreviewOpen && previewInvoice && (
        <InvoicePDFViewer 
          invoice={previewInvoice} 
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          businessProfile={businessProfile}
          customer={customers?.find((c: any) => c.id === previewInvoice.customerId)}
          bankAccounts={bankAccounts}
          onShare={() => setShareInvoiceId(previewInvoice.id)}
        />
      )}
      
      {shareInvoiceId && (
        <ShareInvoiceDialog 
          isOpen={!!shareInvoiceId}
          onClose={() => setShareInvoiceId(null)}
          invoiceId={shareInvoiceId || ''}
          invoiceNumber={shareInvoiceId ? filteredInvoices.find(inv => inv.id === shareInvoiceId)?.number || '' : ''}
        />
      )}

      {isMobile && (
        <>
          <Dialog open={isMobileSearchOpen} onOpenChange={setIsMobileSearchOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Szukaj faktur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Kontrahent, numer faktury..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Znaleziono {filteredInvoices.length} faktur
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <FilterSheetMobile
            isOpen={isMobileFiltersOpen}
            onOpenChange={setIsMobileFiltersOpen}
            smartFilter={smartFilter}
            documentTypeFilter={documentTypeFilter}
            onSmartFilterChange={setSmartFilter}
            onDocumentTypeFilterChange={setDocumentTypeFilter}
            onReset={() => {
              setSmartFilter('all');
              setDocumentTypeFilter('all');
            }}
            isIncome={true}
          />
        </>
      )}
    </div>
  );
};

export default IncomeList;
