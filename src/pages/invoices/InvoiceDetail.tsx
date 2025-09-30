import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  FilePlus
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
import { BusinessProfile, Customer } from "@/types";
import { generateInvoicePdf, getInvoiceFileName } from "@/lib/pdf-utils";
import InvoiceItemsCard from "@/components/invoices/detail/InvoiceItemsCard";
import { useQuery } from "@tanstack/react-query";
import { getLinksForInvoice } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import { getContract } from "@/integrations/supabase/repositories/contractRepository";
import { getBankAccountsForProfile } from '@/integrations/supabase/repositories/bankAccountRepository';
import { useEffect } from 'react';
import { BankAccount } from '@/types/bank';

interface InvoiceDetailProps {
  type: "income" | "expense";
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invoices: { data: invoices, isLoading }, refreshAllData } = useGlobalData();
  const [showPDF, setShowPDF] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isUpdatingPaid, setIsUpdatingPaid] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const invoice = invoices.find(inv => inv.id === id);

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

  const sellerProfile: BusinessProfile | undefined = profiles.find(p => p.id === invoice?.businessProfileId);
  const buyerCustomer: Customer | undefined = customersList.find(c => c.id === invoice?.customerId);

  const isIncomeDocument = invoice?.transactionType === TransactionType.INCOME;

  const sellerData = isIncomeDocument ? sellerProfile : buyerCustomer;
  const buyerData = isIncomeDocument ? buyerCustomer : sellerProfile;

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

  if (!invoice) {
    return <div className="text-center py-8">Faktura nie została znaleziona</div>;
  }

  const isIncome = invoice.transactionType === TransactionType.INCOME;
  const editPath = isIncome ? `/income/edit/${invoice.id}` : `/expense/${invoice.id}/edit`;

  const handleDownloadPdf = async () => {
    await generateInvoicePdf({
      invoice,
      businessProfile: sellerProfile,
      customer: buyerCustomer,
      filename: getInvoiceFileName(invoice),
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
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshAllData();
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
        .eq('user_id', user.id);

      if (error) throw error;

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
            <h1 className="text-3xl font-bold">{invoice.number}</h1>
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
          <Button asChild>
            <Link to={editPath}>
              <Edit className="h-4 w-4 mr-2" />
              <span>Edytuj</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Status and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-wrap">
        {/* Actions */}
        <div className="flex flex-wrap gap-2 order-1">
          {isIncome && (
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePaid}
            disabled={isUpdatingPaid}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            <span>{invoice.isPaid ? "Nieopłacona" : "Opłacona"}</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span>Usuń</span>
          </Button>
        </div>

        {/* Status badges */}
        <div className="flex items-center space-x-4 order-2 sm:order-1">
          <Badge variant={invoice.isPaid ? "default" : "secondary"}>
            {invoice.isPaid ? "Opłacone" : "Nieopłacone"}
          </Badge>
          <Badge variant="outline">
            {isIncome ? "Przychód" : "Wydatek"}
          </Badge>
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

      {/* PDF Viewer Dialog */}
      {showPDF && (
        <InvoicePDFViewer 
          invoice={invoice}
          businessProfile={sellerProfile as any}
          customer={buyerCustomer as any}
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
          defaultReceiverTaxId={buyerCustomer?.taxId}
          defaultCustomerId={buyerCustomer?.id}
        />
      )}
    </div>
  );
};

export default InvoiceDetail;
