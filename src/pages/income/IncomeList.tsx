import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Invoice, InvoiceType } from "@/types";
import { Plus, Search, Filter, Trash2, CheckSquare, Square, FileDown, Eye, CreditCard, LayoutGrid, List } from "lucide-react";
import InvoiceCard from "@/components/invoices/InvoiceCard";
import InvoicePDFViewer from "@/components/invoices/InvoicePDFViewer";
import { useGlobalData } from "@/hooks/use-global-data";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { deleteInvoice, saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { useQueryClient } from "@tanstack/react-query";
import { generateInvoicePdf, getInvoiceFileName } from "@/lib/pdf-utils";
import { useQuery } from "@tanstack/react-query";
import { getBankAccountsForProfile } from "@/integrations/supabase/repositories/bankAccountRepository";
import { getBusinessProfileById } from "@/integrations/supabase/repositories/businessProfileRepository";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

const IncomeList = () => {
  const { invoices: { data: invoices, isLoading } } = useGlobalData();
  const { selectedProfileId } = useBusinessProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
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

        return matchesSearch && matchesType;
      }
    );
  }, [invoices, searchTerm, activeTab, selectedProfileId]); // Include all dependencies

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
  
  return (
    <div className="space-y-6 pb-20 md:pb-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Przychód</h1>
          <p className="text-muted-foreground">
            Zarządzaj fakturami i rachunkami
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nowy dokument
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=sales">
                  Faktura VAT
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=receipt">
                  Rachunek
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=proforma">
                  Faktura proforma
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=correction">
                  Faktura korygująca
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Dokumenty przychodowe</CardTitle>
              <CardDescription>
                {activeTab !== "all" ? getDocumentTypeName(activeTab) : "Wszystkie dokumenty"}: {filteredInvoices.length}
                {selectedInvoices.size > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    • Wybrano: {selectedInvoices.size}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
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
                  placeholder="Szukaj dokumentów..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
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
            <div className="text-center py-8">
              {searchTerm.length > 0 || activeTab !== "all" ? "Brak wyników wyszukiwania" : "Brak dokumentów"}
            </div>
          ) : (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredInvoices.map(invoice => (
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
                          onChange={() => {}} // Controlled by the onClick above
                        />
                      </div>
                    )}
                    <div className={`${isMultiSelectMode && selectedInvoices.has(invoice.id) ? 'ring-2 ring-primary' : ''} transition-all rounded-lg`}>
                      <InvoiceCard invoice={invoice} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="divide-y">
                  {filteredInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`relative ${selectedInvoices.has(invoice.id) ? 'bg-accent/10' : ''}`}
                      onContextMenu={(e) => handleContextMenu(e, invoice.id)}
                      onClick={() => navigate(`/income/${invoice.id}`)}
                      onTouchStart={(e) => handleTouchStart(e, invoice.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
                        <div className="mr-2 w-8 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <div className="p-1 rounded-md hover:bg-muted/50 active:bg-muted/70">
                            <Checkbox
                              checked={selectedInvoices.has(invoice.id)}
                              onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                            />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{invoice.number}</span>
                            {invoice.isPaid && (
                              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Zapłacone</span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground truncate">
                            {invoice.customerName}
                          </div>
                          {/* Extra customer info line */}
                          <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            {(() => {
                              const customer = (customers as any[])?.find((c) => c.id === invoice.customerId);
                              if (!customer) return null;
                              return (
                                <>
                                  {customer.taxId && (
                                    <span className="truncate">NIP: {customer.taxId}</span>
                                  )}
                                  {(customer.address || customer.postalCode || customer.city) && (
                                    <span className="truncate">
                                      {customer.address}{customer.address && (customer.postalCode || customer.city) ? ", " : ""}
                                      {customer.postalCode} {customer.city}
                                    </span>
                                  )}
                                  {customer.phone && (
                                    <span className="truncate">{customer.phone}</span>
                                  )}
                                  {customer.email && (
                                    <span className="truncate">{customer.email}</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm whitespace-nowrap">
                          <span className="text-muted-foreground w-28">{new Date(invoice.issueDate).toLocaleDateString()}</span>
                          <span className="font-medium w-28 text-right">{(invoice.totalGrossValue ?? 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                          {/* Action group */}
                          <div className="flex items-center gap-2 ml-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate(`/income/${invoice.id}`); }}
                            >
                              Podgląd
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); openPreview(invoice); }}
                            >
                              PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate(`/income/${invoice.id}/edit`); }}
                            >
                              Edytuj
                            </Button>
                          </div>
                          {/* Payment toggle pinned at end with fixed width */}
                          <div className="ml-2">
                            {invoice.isPaid ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-36 justify-center"
                                onClick={async (e) => { e.stopPropagation(); await handleMarkAsUnpaid(invoice.id, invoice); }}
                              >
                                Niezapłacone
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                className="w-36 justify-center"
                                onClick={async (e) => { e.stopPropagation(); await handleMarkAsPaid(invoice.id, invoice); }}
                              >
                                Oznacz jako zapłacony
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePDFViewer
          invoice={previewInvoice}
          businessProfile={businessProfile as any}
          customer={customers?.find((c: any) => c.id === previewInvoice.customerId) as any}
          bankAccounts={bankAccounts}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
      
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
