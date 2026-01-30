import React, { useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle,
  Share2,
  DollarSign,
  FilePlus,
  ArrowDownCircle,
  AlertCircle,
  Clock,
  BookOpen,
  Lock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { TransactionType } from "@/shared/types/common";
import InvoicePDFViewer from "@/modules/invoices/components/InvoicePDFViewer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import ShareInvoiceDialog from "@/modules/invoices/components/ShareInvoiceDialog";
import { calculateItemValues, getInvoiceValueInPLN, calculateInvoiceTotals } from "@/shared/lib/invoice-utils";
import ContractorCard from "@/modules/invoices/components/detail/ContractorCard";
import { BusinessProfile, Customer, Invoice, InvoiceType, InvoiceStatus } from "@/shared/types";
import { generateInvoicePdf, getInvoiceFileName } from "@/shared/lib/pdf-utils";
import { getInvoiceById } from "@/modules/invoices/data/invoiceRepository";
import InvoiceItemsCard from "@/modules/invoices/components/detail/InvoiceItemsCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLinksForInvoice } from "@/modules/contracts/data/contractInvoiceLinkRepository";
import { getContract } from "@/modules/contracts/data/contractRepository";
import { getBankAccountsForProfile } from '@/modules/banking/data/bankAccountRepository';
import { getCashAccounts } from '@/modules/accounting/data/kasaRepository';
import { useEffect, useRef } from 'react';
import { BankAccount } from '@/modules/banking/bank';
import type { CashAccount } from '@/modules/accounting/kasa';
import { DiscussionPanel } from "@/modules/invoices/components/discussion/DiscussionPanel";
import { Wallet } from 'lucide-react';
import LinkedAccountingEntries from '@/modules/invoices/components/LinkedAccountingEntries';
import { InvoiceHistoryDialog } from '@/modules/invoices/components/history/InvoiceHistoryDialog';
import InvoiceLifecycleStatus from '@/modules/invoices/components/InvoiceLifecycleStatus';
import DecisionStateCard from '@/modules/invoices/components/DecisionStateCard';
import FinancialImpactSummary from '@/modules/invoices/components/FinancialImpactSummary';
import EventHistoryTimeline from '@/modules/invoices/components/EventHistoryTimeline';
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import InvoiceControlHeader from '@/modules/invoices/components/detail/InvoiceControlHeader';
import { PostInvoiceDialog } from '@/modules/invoices/components/PostInvoiceDialog';
import FinancialSummaryStrip from '@/modules/invoices/components/detail/FinancialSummaryStrip';
import PartyRelationshipCard from '@/modules/invoices/components/detail/PartyRelationshipCard';
import ActionBar from '@/modules/invoices/components/detail/ActionBar';
import StickyFinancialTotals from '@/modules/invoices/components/detail/StickyFinancialTotals';
import CompactDecisionBadge from '@/modules/invoices/components/CompactDecisionBadge';
import CollapsibleEventHistory from '@/modules/invoices/components/CollapsibleEventHistory';
import FinancialThreadsPanel from '@/components/financial/FinancialThreadsPanel';
import MiniLedger from '@/modules/accounting/components/MiniLedger';
import { getMockLedgerEventsForInvoice } from '@/modules/accounting/data/mockLedgerData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface InvoiceDetailProps {
  type: "income" | "expense";
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isPremium, openPremiumDialog } = useAuth();
  const { profiles: businessProfiles, selectedProfileId } = useBusinessProfile();
  const { invoices: { data: invoices, isLoading }, refreshAllData } = useGlobalData();
  const [showPDF, setShowPDF] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Debug handler for history
  const handleHistory = () => {
    console.log('History button clicked, invoice:', { id: invoice.id, number: invoice.number, businessProfileId: invoice.businessProfileId });
    setShowHistory(true);
  };
  const [isUpdatingPaid, setIsUpdatingPaid] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [showAccountingDetails, setShowAccountingDetails] = useState(false);
  const queryClient = useQueryClient();
  const discussionRef = useRef<HTMLDivElement>(null);

  // Use cached invoice from global data (sync system)
  const baseInvoice = invoices.find(inv => inv.id === id) || null;
  
  // Debug: Check if invoice is in cache
  console.log('InvoiceDetail - Looking for invoice:', id);
  console.log('InvoiceDetail - Available invoices in cache:', invoices.map(inv => ({ id: inv.id, number: inv.number })));
  console.log('InvoiceDetail - Found in cache:', !!baseInvoice);
  
  // Debug: Log the actual invoice structure
  if (baseInvoice) {
    console.log('InvoiceDetail - Base invoice structure:', Object.keys(baseInvoice));
    console.log('InvoiceDetail - Full base invoice:', baseInvoice);
  }
  
  // Only fetch from database if not in cache (fallback)
  const {
    data: invoice,
    isLoading: isLoadingInvoice,
    isFetching: isFetchingInvoice,
  } = useQuery<Invoice | null>({
    queryKey: ["invoice", id, invoices.length], // Include invoices length to force re-run when cache changes
    queryFn: async () => {
      if (!id) return null;
      
      // Debug: Check items specifically
      console.log('Items check:', { 
        hasBaseInvoice: !!baseInvoice,
        hasItems: !!baseInvoice?.items,
        itemsLength: baseInvoice?.items?.length,
        itemsValue: baseInvoice?.items,
        itemsType: typeof baseInvoice?.items
      });
      
      // If we have the invoice in cache but it lacks items, fetch full data
      if (baseInvoice && (!baseInvoice.items || baseInvoice.items.length === 0)) {
        console.log('Invoice found in cache but missing items, fetching full data...');
        // Fall through to database fetch
      } else if (baseInvoice) {
        console.log('Using cached invoice from sync system:', baseInvoice);
        return baseInvoice;
      }
      
      // Fallback: fetch from database only if not in cache
      console.log('Invoice not in cache, fetching from database...');
      try {
        const { data: fetchedInvoice, error } = await supabase
          .from('invoices')
          .select(`
            *,
            business_profiles!inner(
              id,
              name,
              user_id,
              tax_id,
              address,
              city,
              postal_code
            ),
            customers!inner(
              id,
              name,
              user_id,
              tax_id,
              address,
              city,
              postal_code
            ),
            invoice_items (
              id,
              product_id,
              name,
              quantity,
              unit_price,
              vat_rate,
              unit,
              total_net_value,
              total_gross_value,
              total_vat_value,
              vat_exempt
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (fetchedInvoice) {
          console.log('Fetched invoice from database (fallback):', fetchedInvoice);
          
          // Transform database response to match Invoice interface
          const transformedInvoice = {
            ...fetchedInvoice,
            items: fetchedInvoice.invoice_items || [],
            issueDate: fetchedInvoice.issue_date,
            dueDate: fetchedInvoice.due_date,
            sellDate: fetchedInvoice.sell_date,
            businessProfileId: fetchedInvoice.business_profile_id,
            customerId: fetchedInvoice.customer_id,
            totalNetValue: fetchedInvoice.total_net_value,
            totalGrossValue: fetchedInvoice.total_gross_value,
            totalVatValue: fetchedInvoice.total_vat_value,
            paymentMethod: fetchedInvoice.payment_method,
            isPaid: fetchedInvoice.is_paid,
            ksefStatus: fetchedInvoice.ksef_status,
            ksefReferenceNumber: fetchedInvoice.ksef_reference_number,
            userId: fetchedInvoice.user_id,
            transactionType: fetchedInvoice.transaction_type,
            vatExemptionReason: fetchedInvoice.vat_exemption_reason,
            fakturaBezVAT: fetchedInvoice.vat === false,
            seller: fetchedInvoice.business_profiles || {},
            buyer: fetchedInvoice.customers || {},
          };
          
          return transformedInvoice;
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
      }

      return null;
    },
    enabled: !!id,
    initialData: baseInvoice,
    staleTime: Infinity, // Use cached data indefinitely, sync system handles updates
    refetchOnMount: false, // Don't refetch, use sync system
  });

  // Check if invoice has register lines (posted to accounting) - moved to top
  const { data: registerLines } = useQuery({
    queryKey: ['invoice-register-lines', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('jdg_revenue_register_lines')
        .select('*')
        .eq('invoice_id', id);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'discussion' && discussionRef.current && !isLoadingInvoice) {
      setTimeout(() => {
        discussionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [location.search, isLoadingInvoice]);

  // Auto-scroll to top when invoice loads
  useEffect(() => {
    if (!isLoadingInvoice && invoice) {
      // Scroll to top of page when invoice loads
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [isLoadingInvoice, invoice]);

  useEffect(() => {
    if (invoice?.businessProfileId) {
      // Load cash accounts for cash payment invoices
      if (invoice.paymentMethod === 'cash') {
        getCashAccounts(invoice.businessProfileId).then(accs => {
          setCashAccounts(accs);
        }).catch(console.error);
      }
      
      // Load bank accounts for bank transfer invoices
      if (invoice.paymentMethod === 'transfer') {
        getBankAccountsForProfile(invoice.businessProfileId).then(accs => {
          setBankAccounts(accs);
        }).catch(console.error);
      }
    }
  }, [invoice?.businessProfileId, invoice?.paymentMethod]);

  useEffect(() => {
    if (invoice?.businessProfileId) {
      getBankAccountsForProfile(invoice.businessProfileId).then(setBankAccounts);
    } else {
      setBankAccounts([]);
    }
  }, [invoice?.businessProfileId]);

  // Preprocess items to ensure correct VAT values using calculateInvoiceTotals
  const invoiceItems = (invoice as any)?.invoice_items || invoice?.items || [];
  const { items: processedItems, totalNetValue, totalVatValue, totalGrossValue } = calculateInvoiceTotals(invoiceItems);
  
  // Debug logging
  console.log('Processed items:', processedItems);
  console.log('Raw invoice items:', invoiceItems);
  console.log('Invoice fields:', { has_items: !!invoice?.items, has_invoice_items: !!(invoice as any)?.invoice_items });
  const fakturaBezVAT = invoice?.fakturaBezVAT || invoice?.vat === false;
  
  const totals = {
    net: totalNetValue,
    vat: totalVatValue,
    gross: totalGrossValue
  };

  // 1. Pobierz currency z invoice
  const currency = invoice?.currency || 'PLN';

  // Fetch full contractor info if available
  const { businessProfiles: { data: profiles }, customers: { data: customersList } } = useGlobalData();

  // Determine if current user is the owner of this invoice
  const isOwner = invoice?.user_id === user?.id;
  const isIncomeDocument = invoice?.transactionType === TransactionType.INCOME;

  // Use invoice embedded data as primary source
  // For received invoices, invoice.seller/buyer are the only source of truth
  const sellerData = invoice?.seller;
  const buyerData = invoice?.buyer;

  // Fetch linked contracts
  const { data: contractLinks = [] } = useQuery({
    queryKey: ["invoiceLinks", id],
    queryFn: () => (id ? getLinksForInvoice(id) : Promise.resolve([])),
    enabled: !!id,
  });

  const { data: linkedContracts = [] } = useQuery({
    queryKey: ["linkedContracts", contractLinks.map((l:any)=>l.contractId).join("|")],
    queryFn: async () => {
      if (!contractLinks.length) return [] as any[];
      const arr = await Promise.all(contractLinks.map((l:any)=> getContract(l.contractId)));
      return arr.filter(Boolean);
    },
    enabled: contractLinks.length>0,
  });

  if (isLoading || isLoadingInvoice || isFetchingInvoice) {
    return <div className="text-center py-8">Ładowanie...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-8">Faktura nie została znaleziona</div>;
  }

  const isIncome = invoice.transactionType === TransactionType.INCOME;
  const editPath = isIncome ? `/income/edit/${invoice.id}` : `/expense/${invoice.id}/edit`;
  
  // Accounting status calculations - moved after invoice check
  const hasRegisterLines = registerLines && registerLines.length > 0;
  const isPosted = hasRegisterLines || ((invoice as any).accounting_status === 'posted');
  
  // Accounting status information
  const accountingStatus = isPosted ? 'posted' : ((invoice as any).accounting_status || 'unposted');
  const isBooked = (invoice as any).booked_to_ledger || false;
  const accountingLockedAt = (invoice as any).accounting_locked_at;
  const accountingLockedBy = (invoice as any).accounting_locked_by;
  const accountingErrorReason = (invoice as any).accounting_error_reason;

  const handleDownloadPdf = async () => {
    const recalculatedInvoice = {
      ...invoice,
      items: processedItems,
      totalNetValue,
      totalVatValue,
      totalGrossValue,
    };

    await generateInvoicePdf({
      invoice: recalculatedInvoice,
      businessProfile: sellerData as any,
      customer: buyerData as any,
      filename: getInvoiceFileName(recalculatedInvoice),
      bankAccounts,
    });
  };

  const handleTogglePaid = async () => {
    if (!invoice || !user?.id) return;
    
    setIsUpdatingPaid(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ is_paid: !invoice.isPaid })
        .eq('id', invoice.id)
        .eq('user_id', user.id); // Security check: must match user_id

      if (error) throw error;

      await refreshAllData();
      queryClient.setQueryData<Invoice | null>(["invoice", invoice.id], (prev) => {
        if (!prev) return prev;
        return { ...prev, isPaid: !prev.isPaid };
      });
      await queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(
        invoice.isPaid 
          ? "Faktura oznaczona jako nieopłacona" 
          : "Faktura oznaczona jako opłacona"
      );
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Nie udało się zaktualizować statusu płatności");
    } finally {
      setIsUpdatingPaid(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice || !user?.id) return;
    
    if (!confirm("Czy na pewno chcesz usunąć tę fakturę?")) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id)
        .eq('user_id', user.id); // Security check

      if (error) throw error;

      await refreshAllData();
      queryClient.removeQueries({ queryKey: ["invoice", invoice.id] });
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Faktura została usunięta");
      navigate(type === "income" ? "/income" : "/expense");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Nie udało się usunąć faktury");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Ładowanie...</div>;
  }

  const getInvoiceTypeLabel = (invoiceType: string) => {
    switch (invoiceType) {
      case 'sales':
        return fakturaBezVAT ? 'Faktura' : 'Faktura VAT';
      case 'receipt':
        return 'Rachunek';
      default:
        return invoiceType;
    }
  };

  const selectedProfile = businessProfiles.find((profile) => profile.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';
  const isJDG = selectedProfile?.entityType === 'dzialalnosc';
  const isOverdue = invoice.dueDate && !invoice.isPaid && new Date(invoice.dueDate) < new Date();

  // Mock related entities for Financial Threads Panel
  // TODO: Replace with actual data from backend
  const relatedEntities = [
    // Related contracts from existing query
    ...linkedContracts.map((contract: any) => ({
      id: contract.id,
      type: 'contract' as const,
      title: contract.number || 'Umowa',
      subtitle: contract.title,
      status: 'completed' as const,
    })),
    // TODO: Add related expenses query
    // TODO: Add related bank transactions query
  ];

  // Get ledger events for this invoice
  // TODO: Replace with actual backend query
  const ledgerEvents = getMockLedgerEventsForInvoice(invoice.id);

  return (
    <div id="invoice-detail-print" className="flex gap-6 max-w-full pb-20">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
      {/* Back Button */}
      <div>
        <Button variant="ghost" size="icon" asChild>
          <Link to={isIncome ? "/income" : "/expense"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* New Financial Control Header - Identity & State */}
      <InvoiceControlHeader
        invoiceNumber={invoice.number}
        sellerName={sellerData?.name || invoice.businessName || ''}
        buyerName={buyerData?.name || invoice.customerName || ''}
        totalGross={totals.gross}
        currency={currency}
        dueDate={invoice.dueDate}
        isPaid={invoice.isPaid}
        isOverdue={isOverdue}
        isBooked={isBooked}
        lifecycleStatus={(invoice as any).lifecycle_status}
        onEdit={() => navigate(editPath)}
        onDownload={handleDownloadPdf}
        onPreview={() => setShowPDF(true)}
        onShare={isIncome ? () => setShowShareDialog(true) : undefined}
        onDuplicate={() => {
          const base = isIncome ? "/income/new" : "/expense/new";
          navigate(`${base}?duplicateId=${invoice.id}`);
        }}
        onDelete={handleDelete}
        onTogglePaid={handleTogglePaid}
        onPost={() => setShowPostDialog(true)}
        onHistory={handleHistory}
        isOwner={isOwner}
      />

      {/* Contextual Action Bar - Small, secondary - Only show for unpaid invoices */}
      {isOwner && !invoice.isPaid && (
        <ActionBar
          primaryAction={{
            label: 'Oznacz jako opłaconą',
            onClick: handleTogglePaid,
            disabled: isUpdatingPaid,
            variant: isOverdue ? 'danger' : 'success',
            shortcut: '⌘P',
          }}
        />
      )}

      {/* Accounting Details - Collapsible for Accountants */}
      <div className="border border-white/5 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAccountingDetails(!showAccountingDetails)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Informacje księgowe</span>
            {isPosted && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                Zaksięgowana
              </Badge>
            )}
            {!isPosted && accountingErrorReason && (
              <Badge variant="outline" className="text-xs text-red-600 border-red-600/30">
                Wymaga uwagi
              </Badge>
            )}
          </div>
          {showAccountingDetails ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        
        {showAccountingDetails && (
          <div className="p-4 pt-0 space-y-4 border-t border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status dokumentu */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Status dokumentu</div>
                <div className="flex items-center gap-2">
                  {isPosted ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Zaksięgowana</span>
                    </>
                  ) : accountingErrorReason ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Błąd księgowania</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-sm">Do zaksięgowania</span>
                    </>
                  )}
                </div>
                {accountingErrorReason && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {accountingErrorReason === 'MISSING_CATEGORY' ? 'Brak kategorii ryczałtu' :
                     accountingErrorReason === 'LOCKED_PERIOD' ? 'Okres zamknięty' :
                     accountingErrorReason === 'PENDING_ACCEPTANCE' ? 'Oczekuje na akceptację' :
                     accountingErrorReason}
                  </div>
                )}
              </div>

              {/* Księga główna */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Księga główna</div>
                <div className="flex items-center gap-2">
                  {isBooked ? (
                    <>
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Zaksięgowana w KPiR</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Nie zaksięgowana</span>
                    </>
                  )}
                </div>
              </div>

              {/* Blokada księgowa */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Blokada księgowa</div>
                <div className="flex items-center gap-2">
                  {accountingLockedAt ? (
                    <>
                      <Lock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Zablokowana</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Odblokowana</span>
                    </>
                  )}
                </div>
                {accountingLockedAt && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {accountingLockedAt && !isNaN(new Date(accountingLockedAt).getTime()) ? format(new Date(accountingLockedAt), 'dd.MM.yyyy HH:mm') : 'Brak daty'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary Strip - Soft cards, no white inputs */}
      <FinancialSummaryStrip
        cashflowStatus={invoice.isPaid ? 'received' : isOverdue ? 'overdue' : 'expected'}
        vatStatus={fakturaBezVAT ? 'exempt' : 'applicable'}
        accountingPeriod={invoice.issueDate && !isNaN(new Date(invoice.issueDate).getTime()) ? format(new Date(invoice.issueDate), 'MM/yyyy') : 'Brak daty'}
        paymentMethod={invoice.paymentMethod}
        isBooked={isBooked}
        transactionType={invoice.transactionType as 'income' | 'expense'}
      />

      {/* Compact Decision Badge - Only for Spółka, Expandable */}
      <CompactDecisionBadge
        decisionId={invoice.decisionId}
        decisionReference={invoice.decisionReference}
        isSpoolka={isSpoolka}
        hasRequiredDecision={!!invoice.decisionId}
        transactionType={invoice.transactionType as 'income' | 'expense'}
        amount={totals.gross}
        currency={currency}
      />

      {/* Parties Section - Relationship cards with minimal borders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PartyRelationshipCard
          title={isIncome ? "Sprzedawca" : "Nabywca"}
          name={sellerData?.name || invoice.businessName || ''}
          taxId={(sellerData as any)?.taxId}
          address={(sellerData as any)?.address}
          postalCode={(sellerData as any)?.postalCode}
          city={(sellerData as any)?.city}
          email={(sellerData as any)?.email}
          phone={(sellerData as any)?.phone}
          profileId={sellerData?.id}
          isCompany={true}
        />

        <PartyRelationshipCard
          title={isIncome ? "Nabywca" : "Sprzedawca"}
          name={buyerData?.name || invoice.customerName || ''}
          taxId={(buyerData as any)?.taxId}
          address={(buyerData as any)?.address}
          postalCode={(buyerData as any)?.postalCode}
          city={(buyerData as any)?.city}
          email={(buyerData as any)?.email}
          phone={(buyerData as any)?.phone}
          profileId={buyerData?.id}
          onViewProfile={invoice.customerId ? () => navigate(`/customers/${invoice.customerId}`) : undefined}
          isCompany={true}
        />
      </div>

      {/* Invoice Details & Calculation - Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Line items and metadata (2 columns) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Invoice metadata - no borders, just spacing */}
          <div className="space-y-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Szczegóły dokumentu
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4 space-y-3 border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Typ</span>
                <span>{getInvoiceTypeLabel(invoice.type)}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Wystawienie</span>
                <span>{invoice.issueDate && !isNaN(new Date(invoice.issueDate).getTime()) ? format(new Date(invoice.issueDate), "dd.MM.yyyy", { locale: pl }) : 'Brak daty'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sprzedaż</span>
                <span>{invoice.sellDate && !isNaN(new Date(invoice.sellDate).getTime()) ? format(new Date(invoice.sellDate), "dd.MM.yyyy", { locale: pl }) : 'Brak daty'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Termin</span>
                <span>{invoice.dueDate && !isNaN(new Date(invoice.dueDate).getTime()) ? format(new Date(invoice.dueDate), "dd.MM.yyyy", { locale: pl }) : 'Brak daty'}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Płatność</span>
                <span>
                  {invoice.paymentMethod === 'transfer' ? 'Przelew' :
                   invoice.paymentMethod === 'cash' ? 'Gotówka' :
                   invoice.paymentMethod === 'card' ? 'Karta' : 'Inne'}
                </span>
              </div>
              {invoice.paymentMethod === 'cash' && (invoice as any).cashAccountId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Kasa</span>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-blue-400" />
                    <span>{cashAccounts.find(acc => acc.id === (invoice as any).cashAccountId)?.name || 'Ładowanie...'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sticky financial totals (1 column) */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <StickyFinancialTotals
              totalNet={totals.net}
              totalVat={totals.vat}
              totalGross={totals.gross}
              currency={currency}
              isPaid={invoice.isPaid}
              isOverdue={isOverdue}
              isVatExempt={fakturaBezVAT}
            />
            {invoice.currency !== 'PLN' && invoice.exchangeRate && (
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                <div>Kurs: 1 {invoice.currency} = {invoice.exchangeRate} PLN</div>
                {invoice.exchangeRateDate && (
                  <div>Data: {invoice.exchangeRateDate}</div>
                )}
                <div className="text-sm font-medium text-foreground mt-2">
                  Wartość w PLN: {formatCurrency(getInvoiceValueInPLN(invoice), 'PLN')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <InvoiceItemsCard
        items={processedItems as any}
        totalNetValue={totals.net}
        totalVatValue={totals.vat}
        totalGrossValue={totals.gross}
        type={invoice.type as any}
        currency={currency}
        fakturaBezVAT={fakturaBezVAT}
      />

      {/* Mini Ledger - Financial Timeline */}
      <MiniLedger
        events={ledgerEvents}
        documentId={invoice.id}
        documentType="invoice"
        title="Historia finansowa"
      />

      {/* Linked Accounting Entries */}
      {invoice.businessProfileId && (
        <LinkedAccountingEntries
          invoiceId={invoice.id}
          businessProfileId={invoice.businessProfileId}
        />
      )}

      {/* Linked contracts */}
      {linkedContracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Powiązane umowy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedContracts.map((c:any)=>(
              <Link key={c.id} to={`/contracts/${c.id}`} className="underline block">
                {c.number}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      {invoice.comments && (
        <Card>
          <CardHeader>
            <CardTitle>Uwagi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{invoice.comments}</p>
          </CardContent>
        </Card>
      )}

      {/* Collapsible Event History */}
      <CollapsibleEventHistory
        invoiceId={invoice.id}
        invoiceNumber={invoice.number}
        businessProfileId={invoice.businessProfileId}
      />

      {/* Discussion Panel */}
      <div ref={discussionRef} className="scroll-mt-24">
        <DiscussionPanel 
          invoiceId={invoice.id} 
          invoiceNumber={invoice.number} 
        />
      </div>
      </div>

      {/* Right sidebar - Financial Threads Panel */}
      <div className="hidden xl:block w-80 flex-shrink-0">
        <div className="sticky top-20 space-y-4">
          <FinancialThreadsPanel
            entityId={invoice.id}
            entityType="invoice"
            relatedEntities={relatedEntities}
          />
        </div>
      </div>

      {/* PDF Viewer Dialog */}
      {showPDF && (
        <InvoicePDFViewer 
          invoice={invoice}
          businessProfile={sellerData as any}
          customer={buyerData as any}
          bankAccounts={bankAccounts}
          isOpen={showPDF}
          onClose={() => setShowPDF(false)}
          onShare={() => setShowShareDialog(true)}
        />
      )}

      {/* Share Invoice Dialog */}
      {showShareDialog && isIncome && (
        <ShareInvoiceDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
        />
      )}

      {/* Post Invoice Dialog */}
      {showPostDialog && (() => {
        const businessProfile = businessProfiles.find(p => p.id === invoice.businessProfileId);
        return (
          <PostInvoiceDialog
            open={showPostDialog}
            onOpenChange={setShowPostDialog}
            invoice={invoice}
            businessProfile={{
              id: invoice.businessProfileId || '',
              entityType: businessProfile?.entityType || 'dzialalnosc',
              tax_type: businessProfile?.tax_type
            }}
            onSuccess={async () => {
              await refreshAllData();
              await queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
              await queryClient.invalidateQueries({ queryKey: ["invoices"] });
            }}
          />
        );
      })()}

      {/* Invoice History Dialog */}
      <InvoiceHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        invoiceId={invoice.id}
        invoiceNumber={invoice.number}
        businessProfileId={invoice.businessProfileId || ''}
      />
    </div>
  );
};


export default InvoiceDetail;
