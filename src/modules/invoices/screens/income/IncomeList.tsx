import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Invoice, InvoiceType } from "@/shared/types";
import { Plus, Search, Filter, Trash2, CheckSquare, Square, FileDown, Eye, CreditCard, LayoutGrid, List, Share2, Pen, AlertCircle } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import MonthlySummaryBar, { MonthlySummaryFilter } from '@/modules/invoices/components/MonthlySummaryBar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import InvoiceCard from "@/modules/invoices/components/InvoiceCard";
import ProfessionalInvoiceRow from '@/modules/invoices/components/ProfessionalInvoiceRow';
import ProfessionalInvoiceRowMobile from '@/modules/invoices/components/ProfessionalInvoiceRowMobile';
import InvoicePDFViewer from "@/modules/invoices/components/InvoicePDFViewer";
import ShareInvoiceDialog from "@/modules/invoices/components/ShareInvoiceDialog";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { toast } from "sonner";
import { deleteInvoice, saveInvoice } from "@/modules/invoices/data/invoiceRepository";
import { useQueryClient } from "@tanstack/react-query";
import { generateInvoicePdf, getInvoiceFileName } from "@/shared/lib/pdf-utils";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { useQuery } from "@tanstack/react-query";
import { getBankAccountsForProfile } from "@/modules/banking/data/bankAccountRepository";
import { getBusinessProfileById } from "@/modules/settings/data/businessProfileRepository";
import { Checkbox } from "@/shared/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

type SmartFilter = 'all' | 'unpaid_issued' | 'paid_not_booked' | 'booked_not_reconciled' | 'overdue';

const IncomeList = () => {
  const { invoices: { data: invoices, isLoading } } = useGlobalData();
  const { selectedProfileId } = useBusinessProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>("list");
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, invoiceId: string | null}>({visible: false, x: 0, y: 0, invoiceId: null});
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartTime = useRef<number | null>(null);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [shareInvoiceId, setShareInvoiceId] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const isMobileView = useIsMobile();

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

  // Persist view mode per business profile in localStorage
  useEffect(() => {
    const key = selectedProfileId ? `ui:income:viewMode:${selectedProfileId}` : 'ui:income:viewMode:default';
    const saved = localStorage.getItem(key) as 'grid' | 'list' | null;
    if (saved === 'grid' || saved === 'list') {
      setViewMode(saved);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    const key = selectedProfileId ? `ui:income:viewMode:${selectedProfileId}` : 'ui:income:viewMode:default';
    localStorage.setItem(key, viewMode);
  }, [viewMode, selectedProfileId]);

  // Load additional data needed for bulk operations
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      // Get all customers with their profiles - simplified query for now
      const { data, error } = await supabase
        .from('customers')
        .select('*');
      
      if (error) throw error;
      return data || [];
    },
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

  console.log('IncomeList - Raw invoices from useGlobalData:', invoices);
  console.log('IncomeList - Selected Profile ID:', selectedProfileId);

  // Get only document types that exist in the data
  const availableTypes = useMemo(() => {
    const typeMap = new Map<string, boolean>();
    typeMap.set('all', true); // Always include "all"
    
    invoices.forEach(invoice => {
      if (invoice.type === InvoiceType.SALES) typeMap.set('invoice', true);
      else if (invoice.type === InvoiceType.RECEIPT) typeMap.set('receipt', true);
      else if (invoice.type === InvoiceType.PROFORMA) typeMap.set('proforma', true);
      else if (invoice.type === InvoiceType.CORRECTION) typeMap.set('correction', true);
    });
    
    return Array.from(typeMap.keys());
  }, [invoices]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteInvoice(invoiceId);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Dokument został usunięty");
      setContextMenu({...contextMenu, visible: false});
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Wystąpił błąd podczas usuwania dokumentu");
    }
  };

  const handleBulkDelete = async () => {
    const invoicesToDelete = getSelectedInvoicesData();
    if (invoicesToDelete.length === 0) {
      toast.info("Nie wybrano żadnych dokumentów do usunięcia");
      return;
    }
    try {
      const promises = invoicesToDelete.map(inv => deleteInvoice(inv.id));
      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Usunięto ${invoicesToDelete.length} dokumentów`);
      clearSelection();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Wystąpił błąd podczas usuwania dokumentów");
    }
  };

  const openPreview = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleMarkAsUnpaid = async (invoiceId: string, currentInvoice: Invoice) => {
    try {
      const updatedInvoice = { ...currentInvoice, isPaid: false };
      await saveInvoice(updatedInvoice);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      toast.success("Dokument oznaczono jako niezapłacony");
      setContextMenu({...contextMenu, visible: false});
    } catch (error) {
      console.error("Error marking invoice as unpaid:", error);
      toast.error("Wystąpił błąd podczas oznaczania dokumentu jako niezapłacony");
    }
  };

  const handleMarkAsPaid = async (invoiceId: string, currentInvoice: Invoice) => {
    try {
      // Update the invoice with isPaid set to true
      const updatedInvoice = { ...currentInvoice, isPaid: true };
      await saveInvoice(updatedInvoice);
      
      // Invalidate the queries to refetch the updated data
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }); // Also invalidate the single invoice query
      
      toast.success("Dokument oznaczono jako zapłacony");
      setContextMenu({...contextMenu, visible: false});
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast.error("Wystąpił błąd podczas oznaczania dokumentu jako zapłacony");
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu({...contextMenu, visible: false});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, invoiceId: string) => {
    e.preventDefault();
    
    let clientX, clientY;
    if ('touches' in e) { // Check if it's a touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else { // Otherwise assume it's a mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setContextMenu({
      visible: true,
      x: clientX,
      y: clientY,
      invoiceId
    });
  };
  
  const LONG_PRESS_THRESHOLD = 500; // milliseconds
  const MOVE_THRESHOLD = 10; // pixels

  const handleTouchStart = (e: React.TouchEvent, invoiceId: string) => {
    touchStartTime.current = Date.now();
    touchStartPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchTimer.current = setTimeout(() => {
      handleContextMenu(e, invoiceId);
    }, LONG_PRESS_THRESHOLD);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPosition.current) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartPosition.current.x);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartPosition.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > MOVE_THRESHOLD && touchTimer.current) {
        clearTimeout(touchTimer.current);
        touchTimer.current = null;
        touchStartPosition.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
    touchStartPosition.current = null; // Reset on touch end
  };

  // Filter invoices based on search term, document type, transaction type (income only), AND business profile
  const filteredInvoices = useMemo(() => {
    // Ensure invoices data is available before filtering
    if (!invoices) return [];

    console.log('IncomeList - Filtering invoices with selectedProfileId:', selectedProfileId);

    return invoices.filter(
      (invoice) => {
        // Only show income transactions
        if (invoice.transactionType !== 'income') return false;

        // If a business profile is selected, include only matching invoices; otherwise include all
        if (selectedProfileId && invoice.businessProfileId !== selectedProfileId) return false;

        const matchesSearch =
          invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (invoice.customerName || "").toLowerCase().includes(searchTerm.toLowerCase());

        // Filter by document type tab
        const matchesType =
          activeTab === "all" ||
          (activeTab === "invoice" && invoice.type === InvoiceType.SALES) ||
          (activeTab === "receipt" && invoice.type === InvoiceType.RECEIPT) ||
          (activeTab === "proforma" && invoice.type === InvoiceType.PROFORMA) ||
          (activeTab === "correction" && invoice.type === InvoiceType.CORRECTION);

        // Smart filter logic
        let matchesSmartFilter = true;
        const invoiceAny = invoice as any;
        const isPaid = invoice.isPaid || invoice.paid;
        const isBooked = invoiceAny.booked_to_ledger;
        const isOverdue = new Date(invoice.dueDate) < new Date() && !isPaid;
        
        switch (smartFilter) {
          case 'unpaid_issued':
            matchesSmartFilter = !isPaid;
            break;
          case 'paid_not_booked':
            matchesSmartFilter = isPaid && !isBooked;
            break;
          case 'booked_not_reconciled':
            matchesSmartFilter = isBooked;
            break;
          case 'overdue':
            matchesSmartFilter = isOverdue;
            break;
          case 'all':
          default:
            matchesSmartFilter = true;
        }

        return matchesSearch && matchesType && matchesSmartFilter;
      }
    );
  }, [invoices, searchTerm, activeTab, selectedProfileId, smartFilter]); // Include all dependencies

  // Multi-select functions
  const toggleInvoiceSelection = (invoiceId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const selectAllInvoices = () => {
    setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
  };

  const clearSelection = () => {
    setSelectedInvoices(new Set());
    setIsMultiSelectMode(false);
  };

  const getSelectedInvoicesData = () => {
    return filteredInvoices.filter(inv => selectedInvoices.has(inv.id));
  };

  // Bulk operations
  const handleBulkMarkAsPaid = async () => {
    const invoicesToUpdate = getSelectedInvoicesData().filter(inv => !inv.isPaid);
    
    if (invoicesToUpdate.length === 0) {
      toast.info("Wszystkie wybrane faktury są już oznaczone jako zapłacone");
      return;
    }

    try {
      const promises = invoicesToUpdate.map(invoice => 
        saveInvoice({ ...invoice, isPaid: true })
      );
      
      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast.success(`Oznaczono ${invoicesToUpdate.length} faktur jako zapłacone`);
      clearSelection();
    } catch (error) {
      console.error("Error bulk marking as paid:", error);
      toast.error("Wystąpił błąd podczas oznaczania faktur jako zapłacone");
    }
  };

  const handleBulkDownloadPdf = async () => {
    const invoicesToDownload = getSelectedInvoicesData();
    
    if (invoicesToDownload.length === 0) {
      toast.info("Nie wybrano żadnych faktur do pobrania");
      return;
    }

    toast.info(`Rozpoczynam pobieranie ${invoicesToDownload.length} faktur...`);

    let successCount = 0;
    let errorCount = 0;

    for (const invoice of invoicesToDownload) {
      try {
        const customer = customers?.find((c: any) => c.id === invoice.customerId);
        
        const success = await generateInvoicePdf({
          invoice,
          businessProfile,
          customer,
          filename: getInvoiceFileName(invoice),
          bankAccounts,
        });
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error downloading PDF for invoice ${invoice.number}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Pobrano ${successCount} faktur`);
    }
    if (errorCount > 0) {
      toast.error(`Nie udało się pobrać ${errorCount} faktur`);
    }
    
    clearSelection();
  };

  const getDocumentTypeName = (type: string) => {
    switch(type) {
      case "all": return "Wszystkie";
      case "invoice": return "Faktury VAT";
      case "receipt": return "Rachunki";
      case "proforma": return "Faktury proforma";
      case "correction": return "Faktury korygujące";
      default: return "Dokumenty";
    }
  };

  const formatInvoiceAmount = (invoice: Invoice) => {
    const currency = invoice.currency || 'PLN';
    const isVatDisabled = invoice.vat === false || (invoice as any).fakturaBezVat === true;
    const baseAmount = (isVatDisabled ? invoice.totalNetValue : invoice.totalGrossValue) ?? invoice.totalNetValue ?? 0;
    return formatCurrency(baseAmount, currency).replace(/^\u00A0/, '');
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredInvoices.map((invoice) => (
        <div
          key={invoice.id}
          className="relative"
          onContextMenu={isMultiSelectMode ? undefined : (e) => handleContextMenu(e, invoice.id)}
          onClick={isMultiSelectMode ? (e) => toggleInvoiceSelection(invoice.id, e) : () => navigate(`/income/${invoice.id}`)}
          onTouchStart={isMultiSelectMode ? undefined : (e) => handleTouchStart(e, invoice.id)}
          onTouchMove={isMultiSelectMode ? undefined : handleTouchMove}
          onTouchEnd={isMultiSelectMode ? undefined : handleTouchEnd}
        >
          {isMultiSelectMode && (
            <div
              className="absolute top-2 left-2 z-10 bg-white rounded-md p-1 shadow-md"
              onClick={(e) => toggleInvoiceSelection(invoice.id, e)}
            >
              <Checkbox
                checked={selectedInvoices.has(invoice.id)}
                onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
              />
            </div>
          )}
          <div className={`${isMultiSelectMode && selectedInvoices.has(invoice.id) ? 'ring-2 ring-primary' : ''} transition-all rounded-lg`}>
            <InvoiceCard invoice={invoice} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => {
    return (
      <div className="space-y-0">
        <div className="divide-y-0">
          {filteredInvoices.map((invoice) => {
            const customer = (customers as any[])?.find((c) => c.id === invoice.customerId);
            const RowComponent = isMobileView ? ProfessionalInvoiceRowMobile : ProfessionalInvoiceRow;
            
            return (
              <RowComponent
                key={invoice.id}
                invoice={invoice}
                isIncome={true}
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
                onTogglePaid={async (id, inv) => {
                  if (inv.isPaid) {
                    await handleMarkAsUnpaid(id, inv);
                  } else {
                    await handleMarkAsPaid(id, inv);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };
  
  const handleSummaryFilter = (filter: MonthlySummaryFilter) => {
    if (filter === 'unpaid_issued') {
      setSmartFilter('unpaid_issued');
      return;
    }
    if (filter === 'overdue') {
      setSmartFilter('overdue');
      return;
    }
    setSmartFilter('all');
  };

  const handleFilterButton = () => {
    if (isMobileView) {
      setIsFilterSheetOpen(true);
    } else {
      setIsFilterPanelOpen((prev) => !prev);
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
    <div className="space-y-6 pb-20 md:pb-6 relative">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Centrum kontroli przychodów</h1>
          <p className="text-muted-foreground">
            Realny wpływ pieniędzy do firmy — faktury, płatności, rozliczenia
          </p>
        </div>

        <MonthlySummaryBar
          invoices={invoices}
          transactionType="income"
          cta={summaryCTA}
          onFilter={handleSummaryFilter}
        />
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Zdarzenia przychodowe</CardTitle>
              <CardDescription>
                {activeTab !== "all" ? getDocumentTypeName(activeTab) : "Dokumenty ujęte w systemie"}: {filteredInvoices.length}
                {selectedInvoices.size > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    • Wybrano: {selectedInvoices.size}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              {/* Filtry Button */}
              <Button
                variant={isFilterPanelOpen && !isMobileView ? 'default' : 'outline'}
                size="sm"
                onClick={handleFilterButton}
                className="gap-1.5"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtry</span>
              </Button>
              {/* View Toggle */}
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  className={`px-2 py-1 text-sm flex items-center gap-1 ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Widok siatki"
                  title="Widok siatki"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Siatka</span>
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 text-sm flex items-center gap-1 border-l ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setViewMode('list')}
                  aria-label="Widok listy"
                  title="Widok listy"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj: kontrahent, kwota, status, NIP..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Desktop Collapsible Filter Panel */}
        {!isMobileView && isFilterPanelOpen && (
          <div className="px-6 pb-4 border-b">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={smartFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSmartFilter('all')}
              >
                Wszystkie
              </Button>
              <Button
                variant={smartFilter === 'unpaid_issued' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSmartFilter('unpaid_issued')}
                className="gap-1 flex-col items-start h-auto py-2"
                title="Dokument istnieje, ale nie ma wpływu na cashflow"
              >
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">⏳</Badge>
                  <span>Wystawione, nieopłacone</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">Dokument istnieje, ale nie ma wpływu na cashflow</span>
              </Button>
              <Button
                variant={smartFilter === 'paid_not_booked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSmartFilter('paid_not_booked')}
                className="gap-1 flex-col items-start h-auto py-2"
                title="Pieniądze są, ale księgowość nie jest domknięta"
              >
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">⚠️</Badge>
                  <span>Opłacone, niezaksięgowane</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">Pieniądze są, ale księgowość nie jest domknięta</span>
              </Button>
              <Button
                variant={smartFilter === 'booked_not_reconciled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSmartFilter('booked_not_reconciled')}
                className="gap-1 flex-col items-start h-auto py-2"
                title="Dokument zamknięty, bezpieczny podatkowo"
              >
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">📘</Badge>
                  <span>Zaksięgowane</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">Dokument zamknięty, bezpieczny podatkowo</span>
              </Button>
              <Button
                variant={smartFilter === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSmartFilter('overdue')}
                className="gap-1"
              >
                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">🔴</Badge>
                Zaległe
              </Button>
            </div>
          </div>
        )}
        
        <div className="px-6 pb-2">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 overflow-x-auto">
              {availableTypes.map(type => (
                <TabsTrigger key={type} value={type}>
                  {getDocumentTypeName(type)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {isMultiSelectMode && filteredInvoices.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectedInvoices.size === filteredInvoices.length ? clearSelection : selectAllInvoices}
              >
                {selectedInvoices.size === filteredInvoices.length ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
              </Button>
            </div>
          )}
        </div>
        
        <CardContent>
          {selectedInvoices.size > 0 && (
            <div className="mb-3">
              <Card className="bg-background/95 border shadow-sm">
                <CardContent className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium mr-2">
                      Wybrano {selectedInvoices.size} dokumentów
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Usuń
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDownloadPdf}
                    >
                      <FileDown className="h-4 w-4 mr-2" /> Pobierz PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkMarkAsPaid}
                      disabled={getSelectedInvoicesData().every(inv => inv.isPaid)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" /> Oznacz jako zapłacone
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Odznacz wszystkie
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-8">
              Ładowanie...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto space-y-3">
                <div className="text-lg font-medium">
                  {smartFilter !== 'all' ? 'Brak dokumentów w tym stanie' : 
                   searchTerm.length > 0 ? 'Brak wyników wyszukiwania' : 
                   'Brak dokumentów'}
                </div>
                {smartFilter !== 'all' && (
                  <p className="text-sm text-muted-foreground">
                    To znaczy, że wszystkie przychody są pod kontrolą w tym obszarze.
                  </p>
                )}
                {searchTerm.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Spróbuj wyszukać po numerze faktury, nazwie kontrahenta lub NIP.
                  </p>
                )}
                {smartFilter === 'all' && searchTerm.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Rozpocznij od utworzenia pierwszego zdarzenia przychodowego.
                  </p>
                )}
              </div>
            </div>
          ) : (
            viewMode === 'grid' ? renderGridView() : renderListView()
          )}
        </CardContent>
      </Card>
      {/* Invoice Preview Modal */}
      {isPreviewOpen && previewInvoice && (
        <InvoicePDFViewer 
          invoice={previewInvoice} 
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          businessProfile={businessProfile}
          customer={customers.find(c => c.id === previewInvoice.customerId)}
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
      
      {/* Mobile Filter Sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Filtry</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={smartFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSmartFilter('all');
                  setIsFilterSheetOpen(false);
                }}
              >
                Wszystkie
              </Button>
              <Button
                variant={smartFilter === 'unpaid_issued' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSmartFilter('unpaid_issued');
                  setIsFilterSheetOpen(false);
                }}
                className="gap-1 flex-col items-start h-auto py-2"
                title="Dokument istnieje, ale nie ma wpływu na cashflow"
              >
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">⏳</Badge>
                  <span>Wystawione, nieopłacone</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">Dokument istnieje, ale nie ma wpływu na cashflow</span>
              </Button>
              <Button
                variant={smartFilter === 'paid_not_booked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSmartFilter('paid_not_booked');
                  setIsFilterSheetOpen(false);
                }}
                className="gap-1 flex-col items-start h-auto py-2"
                title="Pieniądze są, ale księgowość nie jest domknięta"
              >
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">⚠️</Badge>
                  <span>Opłacone, niezaksięgowane</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">Pieniądze są, ale księgowość nie jest domknięta</span>
              </Button>
              <Button
                variant={smartFilter === 'booked_not_reconciled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSmartFilter('booked_not_reconciled');
                  setIsFilterSheetOpen(false);
                }}
                className="gap-1 flex-col items-start h-auto py-2"
                title="Dokument zamknięty, bezpieczny podatkowo"
              >
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">📘</Badge>
                  <span>Zaksięgowane</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">Dokument zamknięty, bezpieczny podatkowo</span>
              </Button>
              <Button
                variant={smartFilter === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSmartFilter('overdue');
                  setIsFilterSheetOpen(false);
                }}
                className="gap-1"
              >
                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">🔴</Badge>
                Zaległe
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Context Menu - Rendered at the root level */}
      {contextMenu.visible && (
        <div 
          ref={menuRef}
          className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-50 py-1 w-48"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Find the invoice based on contextMenu.invoiceId */}
          {contextMenu.invoiceId && filteredInvoices.find(inv => inv.id === contextMenu.invoiceId) && (
            <>
              {/* "Mark as Paid" option - Show only if not already paid */}
              {!filteredInvoices.find(inv => inv.id === contextMenu.invoiceId)?.isPaid && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    const invoiceToUpdate = filteredInvoices.find(inv => inv.id === contextMenu.invoiceId);
                    if (invoiceToUpdate) {
                      handleMarkAsPaid(invoiceToUpdate.id, invoiceToUpdate);
                    }
                  }}
                >
                  Oznacz jako zapłacony
                </button>
              )}

              {/* Edit option (optional, can be added later if needed in context menu) */}
              {/* <button
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                onClick={() => {
                  if (contextMenu.invoiceId) {
                    navigate(`/income/${contextMenu.invoiceId}/edit`);
                    setContextMenu({...contextMenu, visible: false});
                  }
                }}
              >
                Edytuj dokument
              </button> */}

              {/* Delete option */}
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                onClick={() => contextMenu.invoiceId && handleDeleteInvoice(contextMenu.invoiceId)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń dokument
              </button>
            </>
          )}
        </div>
      )}

      {/* In-flow banner rendered above in CardContent */}
    </div>
  );
};

export default IncomeList;
