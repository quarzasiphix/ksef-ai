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
import { Download, Moon, Sun } from "lucide-react";
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
import { toast } from "sonner";

// Define the signDocument function
const signDocument = async (contractId: string, signature: string): Promise<string> => {
  // Implement your document signing logic here
  // This is a placeholder - replace with your actual implementation
  console.log(`Signing contract ${contractId} with signature`, signature);
  return `https://example.com/signed/${contractId}`;
};

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
  const [state, setState] = useState({
    invoice: null as any | null,
    contract: null as any | null,
    shareMeta: null as any | null,
    loading: true,
    allowed: false,
    signOpen: false,
    signedUrl: null as string | null,
    darkMode: false,
  });
  
  const { user } = useAuth();
  
  // Helper function to update state
  const updateState = (updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  };
  
  // Helper function to update state with functional updates
  const updateStateFn = (updater: (prev: typeof state) => Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updater(prev) }));
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setState(prev => {
      const newDarkMode = !prev.darkMode;
      document.documentElement.classList.toggle('dark', newDarkMode);
      return { ...prev, darkMode: newDarkMode };
    });
  };

  // Set initial dark mode based on system preference
  useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setState(prev => {
      document.documentElement.classList.toggle('dark', isDarkMode);
      return { ...prev, darkMode: isDarkMode };
    });
  }, []);

  // Helper to fetch invoice details with relational data
  const fetchInvoice = async (invoiceId: string) => {
    try {
      // First, fetch the invoice with all necessary relations
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select(
          `*,
          invoice_items(*),
          business_profiles:business_profile_id (*),
          customers:customer_id (*)`
        )
        .eq("id", invoiceId)
        .single();

      if (!invoiceData) {
        updateState({ invoice: null, loading: false });
        return;
      }

      // If business_profiles or customers are null, fetch them separately
      let businessProfile = invoiceData.business_profiles;
      let customer = invoiceData.customers;

      if (!businessProfile && invoiceData.business_profile_id) {
        const { data: profileData } = await supabase
          .from("business_profiles")
          .select("*")
          .eq("id", invoiceData.business_profile_id)
          .single();
        businessProfile = profileData || null;
      }

      if (!customer && invoiceData.customer_id) {
        const { data: customerData } = await supabase
          .from("customers")
          .select("*")
          .eq("id", invoiceData.customer_id)
          .single();
        customer = customerData || null;
      }

      // Convert snake_case item fields to camelCase expected by UI
      const items = (invoiceData.invoice_items || []).map((it: any) => ({
        ...it,
        unitPrice: it.unit_price ?? it.unitPrice,
        totalNetValue: it.total_net_value ?? it.totalNetValue,
        totalVatValue: it.total_vat_value ?? it.totalVatValue,
        totalGrossValue: it.total_gross_value ?? it.totalGrossValue,
        vatRate: it.vat_rate ?? it.vatRate,
      }));

      const updatedInvoice = {
        ...invoiceData,
        invoice_items: items,
        issueDate: invoiceData.issue_date,
        dueDate: invoiceData.due_date,
        sellDate: invoiceData.sell_date,
        paymentMethod: invoiceData.payment_method,
        transactionType: invoiceData.transaction_type,
        business_profiles: businessProfile,
        customers: customer,
      };

      updateState({ invoice: updatedInvoice, loading: false });
      return updatedInvoice;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      updateState({ invoice: null, loading: false });
      return null;
    }
  };

  // Fetch contract
  const fetchContract = async (contractId: string) => {
    const { data } = await (supabase as any)
      .from("contracts")
      .select(`*, customers:customer_id(*), business_profiles:business_profile_id(*)`)
      .eq("id", contractId)
      .single();
    updateState({ contract: data });
  };

  useEffect(() => {
    const fetchMetaAndMaybeInvoice = async () => {
      if (!slug) return;
      updateState({ loading: true });
      try {
        const share = await getPublicShare(slug);
        updateState({ shareMeta: share });

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
        updateState({ allowed: canAutoShow });

        if (canAutoShow) {
          if (share.invoice_id) await fetchInvoice(share.invoice_id);
          if (share.contract_id) await fetchContract(share.contract_id);
        }
      } finally {
        updateState({ loading: false });
      }
    };

    fetchMetaAndMaybeInvoice();
  }, [slug]);

  const processedItems = useMemo(() => {
    if (!state.invoice?.invoice_items) return [];
    return state.invoice.invoice_items.map((itm: any) => calculateItemValues(itm));
  }, [state.invoice]);

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
    if (!state.invoice) return;
    await generateInvoicePdf({
      invoice: { ...state.invoice, items: processedItems } as any,
      businessProfile: state.invoice.business_profiles as any,
      customer: state.invoice.customers as any,
      filename: getInvoiceFileName(state.invoice as any),
    });
  };

  const handleAllowView = async () => {
    if (!slug || !state.shareMeta) return;
    localStorage.setItem(`share_${slug}_viewed`, "1");
    updateState({ allowed: true });
    // Mark as viewed in DB (best-effort)
    if (state.shareMeta.view_once) {
      markShareViewed(slug);
    }
    if (state.shareMeta.invoice_id) {
      await fetchInvoice(state.shareMeta.invoice_id);
    }
  };

  const handleSignClick = () => {
    updateState({ signOpen: true });
  };

  const handleSignSuccess = async (signature: string) => {
    try {
      updateState({ signOpen: false });
      
      if (state.contract?.id) {
        // Save the signed document URL
        const signedUrl = await signDocument(state.contract.id, signature);
        updateState({ signedUrl });
        
        toast.success('Dokument został podpisany pomyślnie');
      }
    } catch (error) {
      console.error('Error signing document:', error);
      toast.error('Wystąpił błąd podczas podpisywania dokumentu');
    }
  };

  if (!state.loading && state.shareMeta && state.shareMeta.view_once && !state.allowed) {
    const alreadyViewedAny = !!state.shareMeta.viewed_at;
    const alreadyViewedThisDevice = localStorage.getItem(`share_${slug}_viewed`) === "1";
    if (alreadyViewedAny && !alreadyViewedThisDevice) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
          <p className="mb-4 text-lg">Ten dokument został już wyświetlony na innym urządzeniu.</p>
        </div>
      );
    }
  }

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg ${state.darkMode ? 'text-white' : 'text-gray-800'}`}>Ładowanie dokumentu...</p>
        </div>
      </div>
    );
  }

  if (!state.invoice && !state.contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Nie znaleziono dokumentu</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Dokument mógł zostać usunięty lub wygasł link.</p>
          <Link to="/" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Przejdź do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  if (state.contract && !state.invoice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Umowa {state.contract.number}</h1>
          {!state.contract.is_signed && user && (
            <Button variant="outline" onClick={handleSignClick}>Podpisz</Button>
          )}
        </div>
        {/* Contract content here */}
      </div>
    );
  }

  // Determine if this is an income or expense invoice
  const isIncome = state.invoice?.transaction_type === TransactionType.INCOME;
  
  // Get seller and buyer data based on transaction type
  const sellerData = isIncome 
    ? (state.invoice?.business_profiles || {}) 
    : (state.invoice?.customers || {});
    
  const buyerData = isIncome 
    ? (state.invoice?.customers || {}) 
    : (state.invoice?.business_profiles || {});

// Debug log to check the data (commented out in production)
// console.log('Seller data:', sellerData);
// console.log('Buyer data:', buyerData);
// console.log('Invoice data:', state.invoice);

return (
  <div className={`min-h-screen transition-colors duration-200 ${state.darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header with dark mode toggle */}
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={state.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {state.darkMode ? (
            <Sun className="h-5 w-5 text-yellow-300" />
          ) : (
            <Moon className="h-5 w-5 text-gray-700" />
          )}
        </button>
      </div>
      
      {/* Invoice Container */}
      <div className={`rounded-xl shadow-lg overflow-hidden border ${state.darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        {/* Header */}
        <div className={`p-6 ${state.darkMode ? 'bg-gray-800' : 'bg-gray-50'} border-b ${state.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${state.darkMode ? 'text-white' : 'text-gray-900'}`}>
                {state.invoice?.number}
              </h1>
              <p className={`${state.darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                {translateInvoiceType(state.invoice?.type)} • {state.invoice?.issue_date && format(new Date(state.invoice.issue_date), "dd.MM.yyyy", { locale: pl })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={state.darkMode ? "secondary" : "outline"} 
                onClick={handleDownloadPdf}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span>Pobierz PDF</span>
              </Button>
            </div>
          </div>
          
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant={state.invoice?.is_paid ? "default" : "secondary"}>
              {state.invoice?.is_paid ? "Opłacone" : "Nieopłacone"}
            </Badge>
            <Badge variant="outline">{isIncome ? "Przychód" : "Wydatek"}</Badge>
          </div>
        </div>
    </div>

    {/* Main Content */}
    <div className="p-6">
      {/* Parties & Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ContractorCard
          title={isIncome ? "Sprzedawca" : "Nabywca"}
          contractor={{
            id: sellerData?.id,
            name: sellerData?.full_name || sellerData?.name || "Brak nazwy",
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
          name: buyerData?.full_name || buyerData?.name || "Brak nazwy",
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
          paymentMethod={state.invoice.payment_method}
          totalNetValue={totals.net}
          totalVatValue={totals.vat}
          totalGrossValue={totals.gross}
          type={state.invoice.type as InvoiceType}
        />
      </div>
    </div>

    </div>
    
    {/* Financial summary 
    <div className={`p-6 border-t ${state.darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <Card className={`${state.darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
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
          <span className="text-green-700 dark:text-green-500">{formatCurrency(totals.gross)}</span>
        </div>
        </CardContent>
      </Card>
    </div>
*/}
    {/* Items list */}
    <InvoiceItemsCard
      items={processedItems as any}
      totalNetValue={totals.net}
      totalVatValue={totals.vat}
      totalGrossValue={totals.gross}
      type={state.invoice.type as InvoiceType}
    />

    </div>
    
    {/* Attached contract display */}
    {state.contract && (
      <div className="mt-10 space-y-6">
        <h2 className="text-2xl font-bold">Powiązana umowa</h2>
        <Card>
          <CardHeader>
            <CardTitle>Umowa {state.contract.number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>Data: {format(new Date(state.contract.issue_date), "dd.MM.yyyy")}</div>
            {state.contract.valid_from && <div>Obowiązuje od: {format(new Date(state.contract.valid_from), "dd.MM.yyyy")}</div>}
            {state.contract.valid_to && <div>Obowiązuje do: {format(new Date(state.contract.valid_to), "dd.MM.yyyy")}</div>}
            {state.contract.subject && <div>Temat: {state.contract.subject}</div>}
            {state.contract.content && (
              <p className="whitespace-pre-line text-sm text-gray-700 dark:text-muted-foreground border p-3 rounded bg-gray-50 dark:bg-muted/30 mt-2">{state.contract.content}</p>
            )}
          </CardContent>
        </Card>
      </div>
    )}

    
    {/* Footer */}
    <div className="mt-12 text-center">
      <Card className={`inline-block ${state.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
        <CardContent className="py-6 px-8 space-y-4">
          <p className={`text-xl font-semibold ${state.darkMode ? 'text-white' : 'text-gray-900'}`}>
            Zarejestruj się w najlepszym systemie fakturowania!
          </p>
          <p className={`${state.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Dołącz do tysięcy zadowolonych użytkowników
          </p>
          <Link to="/auth/register">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
              Załóż darmowe konto
            </Button>
          </Link>
        </CardContent>
      </Card>
      
      <div className={`mt-8 text-sm ${state.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p>Dokument udostępniony przez KSeF AI</p>
      </div>
    </div>
  </div>
);
};

export default ShareDocuments;
