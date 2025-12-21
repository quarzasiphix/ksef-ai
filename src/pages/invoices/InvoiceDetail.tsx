import React, { useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/invoice-utils";
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
import { useGlobalData } from "@/hooks/use-global-data";
import { TransactionType } from "@/types/common";
import InvoicePDFViewer from "@/components/invoices/InvoicePDFViewer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ShareInvoiceDialog from "@/components/invoices/ShareInvoiceDialog";
import { calculateItemValues, getInvoiceValueInPLN, calculateInvoiceTotals } from "@/lib/invoice-utils";
import ContractorCard from "@/components/invoices/detail/ContractorCard";
import { BusinessProfile, Customer, Invoice } from "@/types";
import { generateInvoicePdf, getInvoiceFileName } from "@/lib/pdf-utils";
import { getInvoiceById } from "@/integrations/supabase/repositories/invoiceRepository";
import InvoiceItemsCard from "@/components/invoices/detail/InvoiceItemsCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLinksForInvoice } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import { getContract } from "@/integrations/supabase/repositories/contractRepository";
import { getBankAccountsForProfile } from '@/integrations/supabase/repositories/bankAccountRepository';
import { useEffect, useRef } from 'react';
import { BankAccount } from '@/types/bank';
import { DiscussionPanel } from "@/components/invoices/discussion/DiscussionPanel";

interface InvoiceDetailProps {
  type: "income" | "expense";
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { invoices: { data: invoices, isLoading }, refreshAllData } = useGlobalData();
  const [showPDF, setShowPDF] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isUpdatingPaid, setIsUpdatingPaid] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
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
    if (invoice?.bankAccountId && invoice.businessProfileId) {
      getBankAccountsForProfile(invoice.businessProfileId).then(accs => {
        setSelectedBankAccount(accs.find(a => a.id === invoice.bankAccountId) || null);
      });
    } else {
      setSelectedBankAccount(null);
    }
  }, [invoice?.bankAccountId, invoice?.businessProfileId]);

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

  return (
    <div id="invoice-detail-print" className="space-y-6 max-w-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={isIncome ? "/income" : "/expense"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{invoice.number}</h1>
              {!isOwner && (
                <Badge variant="secondary" className="text-sm">
                  <ArrowDownCircle className="h-3 w-3 mr-1" />
                  Otrzymana
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {getInvoiceTypeLabel(invoice.type)} • {format(new Date(invoice.issueDate), "dd.MM.yyyy", { locale: pl })}
            </p>
          </div>
        </div>
        {/* Preview & Edit buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPDF(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            <span>Podgląd</span>
          </Button>
          {isOwner && (
            <Button asChild>
              <Link to={editPath}>
                <Edit className="h-4 w-4 mr-2" />
                <span>Edytuj</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Status and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-wrap">
        {/* Actions */}
        <div className="flex flex-wrap gap-2 order-1">
          {isIncome && isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              <span>Udostępnij</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
          >
            <Download className="h-4 w-4 mr-2" />
            <span>PDF</span>
          </Button>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const base = isIncome ? "/income/new" : "/expense/new";
                navigate(`${base}?duplicateId=${invoice.id}`);
              }}
            >
              <FilePlus className="h-4 w-4 mr-2" />
              <span>Duplikuj</span>
            </Button>
          )}
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePaid}
              disabled={isUpdatingPaid}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              <span>{invoice.isPaid ? "Nieopłacona" : "Opłacona"}</span>
            </Button>
          )}
          {isOwner && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span>Usuń</span>
            </Button>
          )}
        </div>

        {/* Status badges */}
        <div className="flex items-center space-x-4 order-2 sm:order-1">
          <Badge variant={invoice.isPaid ? "default" : "secondary"}>
            {invoice.isPaid ? "Opłacone" : "Nieopłacone"}
          </Badge>
          <Badge variant="outline">
            {isIncome ? "Przychód" : "Wydatek"}
          </Badge>
          {invoice.decisionId && (
            <Link to={`/decisions/${invoice.decisionId}`} className="inline-flex">
              <Badge variant="outline">
                {invoice.decisionReference ? `Decyzja ${invoice.decisionReference}` : "Decyzja"}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Invoice Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContractorCard
          title={isIncome ? "Sprzedawca" : "Nabywca"}
          contractor={{
            id: sellerData?.id,
            name: sellerData?.name || (isIncomeDocument ? invoice.businessName : invoice.customerName) || "",
            taxId: (sellerData as any)?.taxId,
            regon: (sellerData as any)?.regon,
            address: (sellerData as any)?.address,
            postalCode: (sellerData as any)?.postalCode,
            city: (sellerData as any)?.city,
            email: (sellerData as any)?.email,
            phone: (sellerData as any)?.phone,
            bankAccount: isIncome ? (selectedBankAccount?.accountNumber || (sellerData as any)?.bankAccount) : undefined,
          }}
        />

        <ContractorCard
          title={isIncome ? "Nabywca" : "Sprzedawca"}
          contractor={{
            id: buyerData?.id,
            name: buyerData?.name || (isIncomeDocument ? invoice.customerName : invoice.businessName) || "",
            taxId: (buyerData as any)?.taxId,
            regon: (buyerData as any)?.regon,
            address: (buyerData as any)?.address,
            postalCode: (buyerData as any)?.postalCode,
            city: (buyerData as any)?.city,
            email: (buyerData as any)?.email,
            phone: (buyerData as any)?.phone,
          }}
        />

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły faktury</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Typ:</span>
              <span>{getInvoiceTypeLabel(invoice.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data wystawienia:</span>
              <span>{format(new Date(invoice.issueDate), "dd.MM.yyyy", { locale: pl })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data sprzedaży:</span>
              <span>{format(new Date(invoice.sellDate), "dd.MM.yyyy", { locale: pl })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Termin płatności:</span>
              <span>{format(new Date(invoice.dueDate), "dd.MM.yyyy", { locale: pl })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sposób płatności:</span>
              <span>
                {invoice.paymentMethod === 'transfer' ? 'Przelew' :
                 invoice.paymentMethod === 'cash' ? 'Gotówka' :
                 invoice.paymentMethod === 'card' ? 'Karta' : 'Inne'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Waluta:</span>
              <span>{currency}</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie finansowe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wartość netto:</span>
              <span>{formatCurrency(totals.net, currency)}</span>
            </div>
            {!fakturaBezVAT && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Podatek VAT:</span>
                <span>{formatCurrency(totals.vat, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-3">
              <span>Wartość brutto:</span>
              <span className="text-green-600">{formatCurrency(totals.gross, currency)}</span>
            </div>
            {invoice.currency !== 'PLN' && invoice.exchangeRate && (
              <div className="flex justify-between font-semibold text-lg">
                <span>Wartość brutto (PLN):</span>
                <span className="text-green-600">{formatCurrency(getInvoiceValueInPLN(invoice), 'PLN')} PLN</span>
              </div>
            )}
            {invoice.currency !== 'PLN' && invoice.exchangeRate && (
              <div className="text-sm text-muted-foreground">
                Kurs wymiany: 1 {invoice.currency} = {invoice.exchangeRate} PLN
                {invoice.exchangeRateDate && (
                  <span> (z dnia: {invoice.exchangeRateDate})</span>
                )}
                {invoice.exchangeRateSource && (
                  <span> [źródło: {invoice.exchangeRateSource === 'NBP' ? 'NBP' : 'ręcznie'}]</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* Discussion Panel */}
      <div ref={discussionRef} className="scroll-mt-24">
        <DiscussionPanel 
          invoiceId={invoice.id} 
          invoiceNumber={invoice.number} 
        />
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
        />
      )}

      {/* Share Invoice Dialog */}
      {showShareDialog && (
        <ShareInvoiceDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
          defaultReceiverTaxId={buyerData?.taxId}
          defaultCustomerId={buyerData?.id}
        />
      )}
    </div>
  );
};


export default InvoiceDetail;
