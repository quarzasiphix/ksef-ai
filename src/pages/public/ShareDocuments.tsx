import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicShare, markShareViewed } from "@/integrations/supabase/repositories/publicShareRepository";
import {
  calculateItemValues,
  formatCurrency,
} from "@/lib/invoice-utils";
import {
  generateInvoicePdf,
  getInvoiceFileName,
} from "@/lib/pdf-utils";
import InvoiceItemsCard from "@/components/invoices/detail/InvoiceItemsCard";
import ContractorCard from "@/components/invoices/detail/ContractorCard";
import { InvoicePaymentCard } from "@/components/invoices/detail/InvoicePaymentCard";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { InvoiceType } from "@/types";
import { TransactionType } from "@/types/common";
import SignaturePadModal from "@/components/contracts/SignaturePadModal";
import { useAuth } from "@/hooks/useAuth";

// Translate invoice type to Polish label
const translateInvoiceType = (type?: string) => {
  switch (type) {
    case "sales":
      return "Faktura VAT";
    case "receipt":
      return "Rachunek";
    case "proforma":
      return "Proforma";
    case "correction":
      return "Korekta";
    default:
      return type || "Dokument";
  }
};

const ShareDocuments: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [contract, setContract] = useState<any | null>(null);
  const [shareMeta, setShareMeta] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [signOpen, setSignOpen] = React.useState(false);
  const { user } = useAuth();
  const [signedUrl, setSignedUrl] = React.useState(contract?.signature_url as string | null);

  // Helper to fetch invoice details with relational data
  const fetchInvoice = async (invoiceId: string) => {
    const { data } = await supabase
      .from("invoices")
      .select(
        `*,
        invoice_items(*),
        business_profiles:business_profile_id (*),
        customers:customer_id (*)`
      )
      .eq("id", invoiceId)
      .single();

    // Convert snake_case item fields to camelCase expected by UI
    if (data) {
      const items = (data.invoice_items || []).map((it: any) => ({
        ...it,
        unitPrice: it.unit_price ?? it.unitPrice,
        totalNetValue: it.total_net_value ?? it.totalNetValue,
        totalVatValue: it.total_vat_value ?? it.totalVatValue,
        totalGrossValue: it.total_gross_value ?? it.totalGrossValue,
        vatRate: it.vat_rate ?? it.vatRate,
      }));

      setInvoice({
        ...data,
        invoice_items: items,
        issueDate: data.issue_date,
        dueDate: data.due_date,
        sellDate: data.sell_date,
        paymentMethod: data.payment_method,
        transactionType: data.transaction_type,
      });
    } else {
      setInvoice(null);
    }
  };

  // Fetch contract
  const fetchContract = async (contractId: string) => {
    const { data } = await (supabase as any)
      .from("contracts")
      .select(`*, customers:customer_id(*), business_profiles:business_profile_id(*)`)
      .eq("id", contractId)
      .single();
    setContract(data);
  };

  useEffect(() => {
    const fetchMetaAndMaybeInvoice = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const share = await getPublicShare(slug);
        setShareMeta(share);

        if (!share) return; // Not found

        const VIEW_KEY = `share_${slug}_viewed`;
        const alreadyViewedThisDevice = localStorage.getItem(VIEW_KEY) === "1";
        const alreadyViewedAny = !!share.viewed_at;

        let canAutoShow = false;
        if (!share.view_once) {
          canAutoShow = true;
        } else if (alreadyViewedAny && alreadyViewedThisDevice) {
          canAutoShow = true;
        } else if (!alreadyViewedAny) {
          canAutoShow = false;
        } else {
          canAutoShow = false;
        }
        setAllowed(canAutoShow);

        if (canAutoShow) {
          if (share.invoice_id) await fetchInvoice(share.invoice_id);
          if (share.contract_id) await fetchContract(share.contract_id);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetaAndMaybeInvoice();
  }, [slug]);

  const processedItems = useMemo(() => {
    if (!invoice?.invoice_items) return [];
    return invoice.invoice_items.map((itm: any) => calculateItemValues(itm));
  }, [invoice]);

  const totals = useMemo(() => {
    return processedItems.reduce(
      (acc, itm: any) => {
        acc.net += itm.totalNetValue || 0;
        acc.vat += itm.totalVatValue || 0;
        acc.gross += itm.totalGrossValue || 0;
        return acc;
      },
      { net: 0, vat: 0, gross: 0 }
    );
  }, [processedItems]);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    await generateInvoicePdf({
      invoice: { ...invoice, items: processedItems } as any,
      businessProfile: invoice.business_profiles as any,
      customer: invoice.customers as any,
      filename: getInvoiceFileName(invoice as any),
    });
  };

  const handleAllowView = async () => {
    if (!slug || !shareMeta) return;
    localStorage.setItem(`share_${slug}_viewed`, "1");
    setAllowed(true);
    // Mark as viewed in DB (best-effort)
    if (shareMeta.view_once) {
      markShareViewed(slug);
    }
    if (shareMeta.invoice_id) {
      await fetchInvoice(shareMeta.invoice_id);
    }
  };

  if (!loading && shareMeta && shareMeta.view_once && !allowed) {
    const alreadyViewedAny = !!shareMeta.viewed_at;
    const alreadyViewedThisDevice = localStorage.getItem(`share_${slug}_viewed`) === "1";
    if (alreadyViewedAny && !alreadyViewedThisDevice) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
          <p className="mb-4 text-lg">Ten dokument został już wyświetlony na innym urządzeniu.</p>
        </div>
      );
    }
  }

  if (loading) {
    return <div className="text-center py-10">Ładowanie...</div>;
  }

  if (!invoice && !contract) {
    return <div className="text-center py-10">Nie znaleziono dokumentu</div>;
  }

  if (contract && !invoice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Umowa {contract.number}</h1>
          {!contract.is_signed && user && (
            <Button variant="outline" onClick={() => setSignOpen(true)}>Podpisz</Button>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>Data: {format(new Date(contract.issue_date), "dd.MM.yyyy")}</div>
            {contract.valid_from && <div>Obowiązuje od: {format(new Date(contract.valid_from), "dd.MM.yyyy")}</div>}
            {contract.valid_to && <div>Obowiązuje do: {format(new Date(contract.valid_to), "dd.MM.yyyy")}</div>}
            {contract.subject && <div>Temat: {contract.subject}</div>}
          </CardContent>
        </Card>
        {contract.content && (
          <Card>
            <CardHeader>
              <CardTitle>Treść</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{contract.content}</p>
            </CardContent>
          </Card>
        )}

        {signedUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Podpis</CardTitle>
            </CardHeader>
            <CardContent>
              <img src={signedUrl} alt="Podpis" className="max-w-xs" />
            </CardContent>
          </Card>
        )}

        <SignaturePadModal
          open={signOpen}
          onClose={() => setSignOpen(false)}
          contractId={contract.id}
          onSigned={(url) => setSignedUrl(url)}
        />
      </div>
    );
  }

  const isIncome = invoice.transaction_type === TransactionType.INCOME;

  // Determine seller / buyer info for contractor cards
  const sellerData = isIncome ? invoice.business_profiles : invoice.customers;
  const buyerData = isIncome ? invoice.customers : invoice.business_profiles;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{invoice.number}</h1>
          <p className="text-muted-foreground">
            {translateInvoiceType(invoice.type)} • {format(new Date(invoice.issue_date), "dd.MM.yyyy", { locale: pl })}
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadPdf}>
          <Download className="h-4 w-4 mr-2" /> Pobierz PDF
        </Button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4">
        <Badge variant={invoice.is_paid ? "default" : "secondary"}>
          {invoice.is_paid ? "Opłacone" : "Nieopłacone"}
        </Badge>
        <Badge variant="outline">{isIncome ? "Przychód" : "Wydatek"}</Badge>
      </div>

      {/* Parties & Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ContractorCard
          title={isIncome ? "Sprzedawca" : "Nabywca"}
          contractor={{
            id: sellerData?.id,
            name: sellerData?.name || "",
            taxId: sellerData?.tax_id,
            regon: sellerData?.regon,
            address: sellerData?.address,
            postalCode: sellerData?.postal_code,
            city: sellerData?.city,
            email: sellerData?.email,
            phone: sellerData?.phone,
            bankAccount: sellerData?.bank_account,
          }}
        />
        <ContractorCard
          title={isIncome ? "Nabywca" : "Sprzedawca"}
          contractor={{
            id: buyerData?.id,
            name: buyerData?.name || "",
            taxId: buyerData?.tax_id,
            regon: buyerData?.regon,
            address: buyerData?.address,
            postalCode: buyerData?.postal_code,
            city: buyerData?.city,
            email: buyerData?.email,
            phone: buyerData?.phone,
          }}
        />

        {/* Payment card spans full width on small screens */}
        <div className="md:col-span-2">
          <InvoicePaymentCard
            paymentMethod={invoice.payment_method}
            totalNetValue={totals.net}
            totalVatValue={totals.vat}
            totalGrossValue={totals.gross}
            type={invoice.type as InvoiceType}
          />
        </div>
      </div>

      {/* Financial summary */}
      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie finansowe</CardTitle>
          <CardDescription>Wartości dokumentu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wartość netto:</span>
            <span>{formatCurrency(totals.net)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Podatek VAT:</span>
            <span>{formatCurrency(totals.vat)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t pt-3">
            <span>Wartość brutto:</span>
            <span className="text-green-600">{formatCurrency(totals.gross)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Items list */}
      <InvoiceItemsCard
        items={processedItems as any}
        totalNetValue={totals.net}
        totalVatValue={totals.vat}
        totalGrossValue={totals.gross}
        type={invoice.type as InvoiceType}
      />

      {/* Attached contract display */}
      {contract && (
        <div className="mt-10 space-y-6">
          <h2 className="text-2xl font-bold">Powiązana umowa</h2>
          <Card>
            <CardHeader>
              <CardTitle>Umowa {contract.number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>Data: {format(new Date(contract.issue_date), "dd.MM.yyyy")}</div>
              {contract.valid_from && <div>Obowiązuje od: {format(new Date(contract.valid_from), "dd.MM.yyyy")}</div>}
              {contract.valid_to && <div>Obowiązuje do: {format(new Date(contract.valid_to), "dd.MM.yyyy")}</div>}
              {contract.subject && <div>Temat: {contract.subject}</div>}
              {contract.content && (
                <p className="whitespace-pre-line text-sm text-muted-foreground border p-3 rounded bg-muted/30 mt-2">{contract.content}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advertisement banner */}
      <Card className="mt-10 text-center">
        <CardContent className="py-8 space-y-4">
          <p className="text-xl font-semibold">Zarejestruj się w najlepszym systemie fakturowania!</p>
          <Link to="/auth/register">
            <Button>Załóż darmowe konto</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareDocuments;
