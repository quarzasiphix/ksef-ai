import React, { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Invoice,
  InvoiceType,
  InvoiceItem,
  VatType,
  VatExemptionReason,
} from "@/types";
import { TransactionType, PaymentMethodDb } from "@/types/common";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import {
  calculateInvoiceTotals,
  generateInvoiceNumber,
  toPaymentMethodDb,
  toPaymentMethodUi,
} from "@/lib/invoice-utils";
import { saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { InvoiceFormHeader } from "@/components/invoices/forms/InvoiceFormHeader";
import { InvoiceBasicInfoForm } from "@/components/invoices/forms/InvoiceBasicInfoForm";
import { InvoicePartiesForm } from "@/components/invoices/forms/InvoicePartiesForm";
import { InvoiceItemsForm } from "@/components/invoices/forms/InvoiceItemsForm";
import { InvoiceFormActions } from "@/components/invoices/forms/InvoiceFormActions";
import { Button } from "@/components/ui/button";

// Schema
const invoiceFormSchema = z.object({
  number: z.string().min(1, "Numer faktury jest wymagany"),
  issueDate: z.string().min(1, "Data wystawienia jest wymagana"),
  dueDate: z.string().min(1, "Termin płatności jest wymagany"),
  sellDate: z.string().optional(),
  paymentMethod: z.string().min(1, "Metoda płatności jest wymagana"),
  comments: z.string().optional().default(""),
  customerId: z.string().optional(),
  businessProfileId: z.string().min(1, "Profil biznesowy jest wymagany"),
  transactionType: z.nativeEnum(TransactionType).default(
    TransactionType.EXPENSE
  ),
  fakturaBezVAT: z.boolean().optional().default(false),
  vatExemptionReason: z.nativeEnum(VatExemptionReason).optional(),
});
type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const NewInvoice: React.FC<{ initialData?: Invoice; type?: TransactionType }> = ({
  initialData,
  type = TransactionType.EXPENSE,
}) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isIncomeRoute = location.pathname === "/income/new";
  const isExpenseRoute = location.pathname === "/expense/new";
  const hideTransactionButtons = isIncomeRoute || isExpenseRoute;

  const [transactionType, setTransactionType] = useState<TransactionType>(
    initialData?.transactionType || type
  );
  const [documentType, setDocumentType] = useState<InvoiceType>(
    initialData?.type || InvoiceType.SALES
  );
  const [documentSettings, setDocumentSettings] = useState<any[]>([]);
  const [documentSettingsLoaded, setDocumentSettingsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items || []);
  const [businessProfileId, setBusinessProfileId] = useState<string>(
    initialData?.businessProfileId || ""
  );
  const [businessName, setBusinessName] = useState<string>(
    initialData?.businessName || ""
  );
  const [customerId, setCustomerId] = useState<string>(initialData?.customerId || "");
  const [customerName, setCustomerName] = useState<string>(
    initialData?.customerName || ""
  );

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<InvoiceFormValues & { transactionType: TransactionType }>({
    resolver: zodResolver(invoiceFormSchema),
    mode: "onChange",
    defaultValues: {
      number:
        initialData?.number || generateInvoiceNumber(new Date(), 1),
      issueDate: initialData?.issueDate || today,
      sellDate: initialData?.sellDate || today,
      dueDate: initialData?.dueDate || today,
      paymentMethod: initialData?.paymentMethod
        ? toPaymentMethodUi(initialData.paymentMethod as PaymentMethodDb)
        : "TRANSFER",
      comments: initialData?.comments || "",
      transactionType: initialData?.transactionType || type,
      customerId: initialData?.customerId || "",
      businessProfileId: initialData?.businessProfileId || "",
      fakturaBezVAT: initialData?.fakturaBezVAT || false,
      vatExemptionReason: initialData?.vatExemptionReason,
    },
  });

  // Load settings
  useEffect(() => {
    const savedSettings = localStorage.getItem("documentTypeSettings");
    if (savedSettings) {
      try {
        setDocumentSettings(JSON.parse(savedSettings));
      } catch {
        // ignore
      }
    }
    setDocumentSettingsLoaded(true);
  }, []);

  // Redirect if type disabled
  useEffect(() => {
    if (documentSettings.length) {
      const setting = documentSettings.find((d) => d.id === documentType);
      if (setting && !setting.enabled) navigate("/income");
    }
  }, [documentType, documentSettings, navigate]);

  // Submit handler
  const onSubmit = async (data: InvoiceFormValues & { transactionType: TransactionType }) => {
    if (!user?.id) return toast.error("Zaloguj się ponownie");
    setIsLoading(true);
    try {
      const updatedItems = items.map(item => ({
        ...item,
        vatRate: data.fakturaBezVAT ? VatType.ZW : (typeof item.vatRate === 'number' ? item.vatRate : 0),
        totalVatValue: data.fakturaBezVAT ? 0 : item.unitPrice * item.quantity * (typeof item.vatRate === 'number' ? item.vatRate / 100 : 0),
        totalGrossValue: item.unitPrice * item.quantity * (1 + (typeof item.vatRate === 'number' ? item.vatRate / 100 : 0))
      }));
      const totals = calculateInvoiceTotals(updatedItems);
      const seller = {
        id: businessProfileId,
        name: businessName || '',
        taxId: '',
        address: '',
        city: '',
        postalCode: ''
      };
      const buyer = {
        id: customerId,
        name: customerName || '',
        taxId: '',
        address: '',
        city: '',
        postalCode: ''
      };
      const invoice: Invoice = {
        id: initialData?.id || "",
        user_id: user.id,
        number: data.number,
        date: data.issueDate,
        dueDate: data.dueDate,
        issueDate: data.issueDate,
        sellDate: data.sellDate,
        type: documentType,
        transactionType: data.transactionType,
        seller,
        buyer,
        items: updatedItems,
        totalAmount: totals.totalGrossValue,
        paid: false,
        isPaid: initialData?.isPaid || false,
        paymentMethod: toPaymentMethodDb(data.paymentMethod),
        comments: data.comments,
        totalNetValue: totals.totalNetValue,
        totalVatValue: totals.totalVatValue,
        totalGrossValue: totals.totalGrossValue,
        businessName,
        customerName,
      };
      const saved = await saveInvoice(invoice);
      toast.success(initialData ? "Zaktualizowano" : "Utworzono");
      navigate(`/invoices/${saved.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Błąd podczas zapisu");
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case InvoiceType.SALES:
        return "Faktura VAT";
      case InvoiceType.RECEIPT:
        return "Rachunek";
      case InvoiceType.PROFORMA:
        return "Faktura proforma";
      case InvoiceType.CORRECTION:
        return "Faktura korygująca";
      default:
        return "Dokument";
    }
  };

  if (!documentSettingsLoaded) {
    return <div className="text-center py-8">Ładowanie ustawień...</div>;
  }

  const documentTitle = getDocumentTitle();
  const isEditing = Boolean(initialData);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <InvoiceFormHeader
            title={documentTitle}
            documentType={documentType}
            isEditing={isEditing}
          />
          {!hideTransactionButtons && (
            <div className="hidden md:flex items-center space-x-2">
              <Button
                type="button"
                variant={transactionType === TransactionType.INCOME ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType(TransactionType.INCOME)}
              >
                Przychód
              </Button>
              <Button
                type="button"
                variant={transactionType === TransactionType.EXPENSE ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType(TransactionType.EXPENSE)}
              >
                Wydatek
              </Button>
            </div>
          )}
        </div>
        {!hideTransactionButtons && (
          <div className="md:hidden flex space-x-2">
            <Button
              type="button"
              variant={transactionType === TransactionType.INCOME ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTransactionType(TransactionType.INCOME)}
            >
              Przychód
            </Button>
            <Button
              type="button"
              variant={transactionType === TransactionType.EXPENSE ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTransactionType(TransactionType.EXPENSE)}
            >
              Wydatek
            </Button>
          </div>
        )}
      </div>
      {/* Items Form */}
      <InvoiceItemsForm
        items={items}
        documentType={documentType}
        transactionType={transactionType}
        onItemsChange={setItems}
        userId={user?.id || ''}
        fakturaBezVAT={form.watch('fakturaBezVAT')}
        vatExemptionReason={form.watch('vatExemptionReason')}
      />
      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <InvoiceBasicInfoForm form={form} documentTitle={documentTitle} />
            <InvoicePartiesForm
              businessProfileId={businessProfileId}
              customerId={customerId}
              transactionType={transactionType}
              onBusinessProfileChange={(id,name) => { setBusinessProfileId(id); setBusinessName(name||'') }}
              onCustomerChange={(id,name) => { setCustomerId(id); setCustomerName(name||'') }}
            />
          </div>
          <InvoiceFormActions
            isLoading={isLoading}
            isEditing={isEditing}
            onSubmit={form.handleSubmit(onSubmit)}
          />
        </form>
      </Form>
    </div>
  );
};

export default NewInvoice;
