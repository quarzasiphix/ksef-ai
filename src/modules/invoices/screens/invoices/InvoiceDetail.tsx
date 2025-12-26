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
  ArrowDownCircle
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
import InvoiceLifecycleStatus from '@/modules/invoices/components/InvoiceLifecycleStatus';
import DecisionStateCard from '@/modules/invoices/components/DecisionStateCard';
import FinancialImpactSummary from '@/modules/invoices/components/FinancialImpactSummary';
import EventHistoryTimeline from '@/modules/invoices/components/EventHistoryTimeline';
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import InvoiceControlHeader from '@/modules/invoices/components/detail/InvoiceControlHeader';
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
  const [isUpdatingPaid, setIsUpdatingPaid] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const queryClient = useQueryClient();
  const discussionRef = useRef<HTMLDivElement>(null);

  const baseInvoice = invoices.find(inv => inv.id === id) || null;

  const {
    data: invoice,
    isLoading: isLoadingInvoice,
    isFetching: isFetchingInvoice,
  } = useQuery<Invoice | null>({
    queryKey: ["invoice", id],
    queryFn: async () => {
      if (!id) return null;
      
      // Try to fetch as regular invoice first (owner/team access)
      try {
        const fetchedInvoice = await getInvoiceById(id);
        if (fetchedInvoice) {
          console.log('Fetched invoice from database:', fetchedInvoice);
          return fetchedInvoice;
        }
      } catch (error) {
        // If RLS blocks access or not found, try as received invoice
        console.log('Invoice not found via standard access, trying as received invoice...');
      }

      // If regular fetch fails (e.g. RLS) or returns null, try fetching as received invoice
      const receivedInvoiceData = await getReceivedInvoiceWithSender(id);
      
      if (receivedInvoiceData) {
        console.log('Fetched received invoice:', receivedInvoiceData);
        // Map to Invoice type - we only have partial data but enough for display
        return {
          id: receivedInvoiceData.invoice_id,
          number: receivedInvoiceData.invoice_number,
          issueDate: receivedInvoiceData.issue_date,
          dueDate: receivedInvoiceData.due_date,
          sellDate: receivedInvoiceData.issue_date, // Fallback
          isPaid: receivedInvoiceData.is_paid,
          totalGrossValue: receivedInvoiceData.total_gross_value,
          // Partial data for display
          type: 'sales' as InvoiceType, // Assumed
          transactionType: TransactionType.EXPENSE, // It's an expense for the receiver
          user_id: '', // Unknown/Hidden
          businessProfileId: receivedInvoiceData.sender_id,
          customerId: '', // Current user's company
          items: [], // Details might not be fully available in summary view
          paymentMethod: 'transfer',
          paid: receivedInvoiceData.is_paid,
          status: 'issued' as InvoiceStatus,
          comments: '',
          totalNetValue: 0, // Not exposed in summary RPC
          totalVatValue: 0, // Not exposed in summary RPC
          totalAmount: receivedInvoiceData.total_gross_value,
          ksef: { status: 'none', referenceNumber: null },
          seller: {
            id: receivedInvoiceData.sender_id,
            name: receivedInvoiceData.sender_name,
            taxId: receivedInvoiceData.sender_tax_id,
            address: receivedInvoiceData.sender_address,
            city: receivedInvoiceData.sender_city,
            postalCode: receivedInvoiceData.sender_postal_code,
          },
          buyer: { id: '', name: 'Ty (Nabywca)', taxId: '', address: '', city: '', postalCode: '' }, // Placeholder
          businessName: receivedInvoiceData.sender_name,
          customerName: 'Ty',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vat: true,
          currency: 'PLN',
        } as Invoice;
      }

      return null;
    },
    enabled: !!id,
    initialData: baseInvoice,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Auto-scroll to discussion if requested via query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'discussion' && discussionRef.current && !isLoadingInvoice) {
      setTimeout(() => {
        discussionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [location.search, isLoadingInvoice]);

  useEffect(() => {
    if (invoice?.businessProfileId) {
      // Load cash accounts for cash payment invoices
      if (invoice.paymentMethod === 'cash') {
        getCashAccounts(invoice.businessProfileId).then(accs => {
          setCashAccounts(accs);
        }).catch(console.error);
      }
      
      // Load bank accounts for bank payment invoices
      if (invoice.bankAccountId) {
        getBankAccountsForProfile(invoice.businessProfileId).then(accs => {
          setSelectedBankAccount(accs.find(a => a.id === invoice.bankAccountId) || null);
        });
      } else {
        setSelectedBankAccount(null);
      }
    }
  }, [invoice?.bankAccountId, invoice?.businessProfileId, invoice?.paymentMethod]);

  useEffect(() => {
    if (invoice?.businessProfileId) {
      getBankAccountsForProfile(invoice.businessProfileId).then(setBankAccounts);
    } else {
      setBankAccounts([]);
    }
  }, [invoice?.businessProfileId]);

  // Preprocess items to ensure correct VAT values using calculateInvoiceTotals
  const { items: processedItems, totalNetValue, totalVatValue, totalGrossValue } = calculateInvoiceTotals(invoice?.items || []);
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
        isBooked={(invoice as any).booked_to_ledger || false}
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
        isOwner={isOwner}
      />

      {/* Contextual Action Bar - Small, secondary */}
      {isOwner && (
        <ActionBar
          primaryAction={(() => {
            if (isJDG) {
              return {
                label: invoice.isPaid ? 'Oznacz jako nieopłaconą' : 'Oznacz jako opłaconą',
                onClick: handleTogglePaid,
                disabled: isUpdatingPaid,
                variant: invoice.isPaid ? 'warning' : (isOverdue ? 'danger' : 'success'),
              };
            }

            if (!invoice.isPaid) {
              return {
                label: 'Przypisz płatność',
                onClick: handleTogglePaid,
                disabled: isUpdatingPaid,
                variant: isOverdue ? 'danger' : 'success',
                shortcut: '⌘P',
              };
            }
            if (invoice.isPaid && !(invoice as any).booked_to_ledger) {
              return {
                label: 'Zaksięguj',
                onClick: () => toast.info('Funkcja księgowania w przygotowaniu'),
                disabled: false,
                variant: 'default',
              };
            }
            return undefined;
          })()}
          secondaryActions={(() => {
            const actions = [
              {
                label: 'Edytuj',
                onClick: () => navigate(editPath),
              },
            ];

            if (isJDG) {
              actions.unshift(
                isPremium
                  ? {
                      label: 'Przypisz płatność',
                      onClick: () => {
                        const destination = invoice.paymentMethod === 'cash' ? '/accounting/kasa' : '/accounting/bank';
                        navigate(`${destination}?linkInvoice=${invoice.id}`);
                      },
                    }
                  : {
                      label: 'Przypisz płatność (Premium)',
                      onClick: () => openPremiumDialog('accounting'),
                    }
              );
            }

            return actions;
          })()}
        />
      )}

      {/* Financial Summary Strip - Soft cards, no white inputs */}
      <FinancialSummaryStrip
        cashflowStatus={invoice.isPaid ? 'received' : isOverdue ? 'overdue' : 'expected'}
        vatStatus={fakturaBezVAT ? 'exempt' : 'applicable'}
        accountingPeriod={format(new Date(invoice.issueDate), 'MM/yyyy')}
        paymentMethod={invoice.paymentMethod}
        isBooked={(invoice as any).booked_to_ledger || false}
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
                <span>{format(new Date(invoice.issueDate), "dd.MM.yyyy", { locale: pl })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sprzedaż</span>
                <span>{format(new Date(invoice.sellDate), "dd.MM.yyyy", { locale: pl })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Termin</span>
                <span>{format(new Date(invoice.dueDate), "dd.MM.yyyy", { locale: pl })}</span>
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
      {showShareDialog && (
        <ShareInvoiceDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
        />
      )}
    </div>
  );
};


export default InvoiceDetail;
