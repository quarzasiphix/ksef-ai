import React, { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Invoice, InvoiceType, InvoiceItem } from "@/types";
import { TransactionType, PaymentMethod, PaymentMethodDb } from "@/types/common";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { calculateInvoiceTotals, generateInvoiceNumber, toPaymentMethodDb, toPaymentMethodUi } from "@/lib/invoice-utils";
import { saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { InvoiceFormHeader } from "@/components/invoices/forms/InvoiceFormHeader";
import { InvoiceBasicInfoForm } from "@/components/invoices/forms/InvoiceBasicInfoForm";
import { InvoicePartiesForm } from "@/components/invoices/forms/InvoicePartiesForm";
import { InvoiceItemsForm } from "@/components/invoices/forms/InvoiceItemsForm";
import { InvoiceFormActions } from "@/components/invoices/forms/InvoiceFormActions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Create a basic invoice form schema
const invoiceFormSchema = z.object({
  number: z.string().min(1, "Numer dokumentu jest wymagany"),
  issueDate: z.string(),
  dueDate: z.string(),
  sellDate: z.string(),
  paymentMethod: z.string().min(1, "Metoda płatności jest wymagana"),
  comments: z.string().optional().default("")
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const NewInvoice: React.FC<{
  initialData?: Invoice;
  type?: TransactionType;
}> = ({ initialData, type = TransactionType.EXPENSE }) => {
  const { user } = useAuth();
  const userId = user?.id || ''; // Add this line to get the user ID
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [transactionType, setTransactionType] = useState<TransactionType>(type);
  const [documentType, setDocumentType] = useState<InvoiceType>(InvoiceType.SALES);
  const [documentSettings, setDocumentSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items || []);
  const [businessProfileId, setBusinessProfileId] = useState<string>(initialData?.businessProfileId || "");
  const [businessName, setBusinessName] = useState<string>(initialData?.businessName || "");
  const [customerId, setCustomerId] = useState<string>(initialData?.customerId || "");
  const [customerName, setCustomerName] = useState<string>(initialData?.customerName || "");
  
  const today = new Date().toISOString().split('T')[0];

  // Handle business profile change
  const handleBusinessProfileChange = (id: string, name?: string) => {
    setBusinessProfileId(id);
    setBusinessName(name || "");
  };

  // Handle customer change
  const handleCustomerChange = (id: string, name?: string) => {
    setCustomerId(id);
    setCustomerName(name || "");
  };
  
  // Handle payment method change
  const handlePaymentMethodChange = (value: string) => {
    // Convert UI payment method to database format
    const dbMethod = toPaymentMethodDb(value as PaymentMethod) as PaymentMethodDb;
    setValue("paymentMethod", dbMethod);
  };

  // Toggle transaction type
  const toggleTransactionType = () => {
    const newType = transactionType === TransactionType.INCOME 
      ? TransactionType.EXPENSE 
      : TransactionType.INCOME;
    setTransactionType(newType);
    setValue('transactionType', newType);
  };

  // Handle transaction type change
  const handleTransactionTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    setValue('transactionType', type);
  };

  // Setup form with default values
  // Normalize paymentMethod to ensure it's a valid enum value
  const validPaymentMethods = Object.values(PaymentMethod);
  // Convert payment method to UI format for the form
  const normalizedPaymentMethod = initialData?.paymentMethod 
    ? toPaymentMethodUi(initialData.paymentMethod as PaymentMethodDb)
    : PaymentMethod.TRANSFER;

  const form = useForm<InvoiceFormValues & { transactionType: TransactionType }>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: initialData?.number || generateInvoiceNumber(new Date(), 1),
      issueDate: initialData?.issueDate || today,
      sellDate: initialData?.sellDate || today,
      dueDate: initialData?.dueDate || today,
      paymentMethod: normalizedPaymentMethod as unknown as PaymentMethod,
      comments: initialData?.comments || "",
      transactionType: type || TransactionType.INCOME,
    }
  });

  const { setValue } = form;

  // Load document type settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("documentTypeSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDocumentSettings(parsed);
      } catch (e) {
        console.error("Error parsing saved document settings:", e);
      }
    }
  }, []);

  // Set document type from URL parameter or initialData
  useEffect(() => {
    if (initialData) {
      // If we're editing an existing invoice, use its type
      setDocumentType(initialData.type);
    } else {
      // If creating a new invoice, check URL parameter
      const typeFromUrl = searchParams.get("type");
      if (typeFromUrl && Object.values(InvoiceType).includes(typeFromUrl as InvoiceType)) {
        setDocumentType(typeFromUrl as InvoiceType);
      }
    }
  }, [initialData, searchParams]);

  // Check if the selected document type is enabled in settings
  useEffect(() => {
    if (documentSettings.length > 0) {
      const selectedTypeSetting = documentSettings.find(type => type.id === documentType);
      if (selectedTypeSetting && !selectedTypeSetting.enabled) {
        // Redirect to income page if the document type is disabled
        navigate("/income");
      }
    }
  }, [documentType, documentSettings, navigate]);

  // Form submission handler
  const onSubmit = async (data: InvoiceFormValues & { transactionType: TransactionType }) => {
    // The form data already includes transactionType
    const formData = {
      ...data,
      transactionType: data.transactionType || transactionType
    };
    if (!businessProfileId) {
      toast.error("Wybierz profil biznesowy");
      return;
    }
    
    if (!customerId) {
      toast.error("Wybierz klienta");
      return;
    }
    
    if (items.length === 0) {
      toast.error("Dodaj przynajmniej jedną pozycję do dokumentu");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Ensure user is authenticated
      if (!user?.id) {
        toast.error("Brak informacji o użytkowniku. Zaloguj się ponownie.");
        setIsLoading(false);
        return;
      }
      // Calculate totals
      const { totalNetValue, totalVatValue, totalGrossValue } = calculateInvoiceTotals(items);
      
      const invoice: Invoice = {
        id: initialData?.id || "",
        user_id: user.id, // Enforce RLS: always include user_id
        number: data.number,
        type: documentType,
        transactionType, // 'income' or 'expense'
        issueDate: data.issueDate,
        sellDate: data.sellDate,
        dueDate: data.dueDate,
        businessProfileId: businessProfileId,
        customerId: customerId,
        items: items,
        paymentMethod: data.paymentMethod ? toPaymentMethodDb(data.paymentMethod) : PaymentMethod.TRANSFER,
        isPaid: initialData?.isPaid || false,
        comments: data.comments,
        totalNetValue,
        totalVatValue,
        totalGrossValue,
        businessName,
        customerName
      };
      
      const savedInvoice = await saveInvoice(invoice);
      
      toast.success(initialData 
        ? "Dokument został zaktualizowany" 
        : "Dokument został utworzony"
      );
      
      navigate(`/invoices/${savedInvoice.id}`);
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Wystąpił błąd podczas zapisywania dokumentu");
    } finally {
      setIsLoading(false);
    }
  };

  // Get the document type title
  const getDocumentTitle = () => {
    switch(documentType) {
      case InvoiceType.SALES: return "Faktura VAT";
      case InvoiceType.RECEIPT: return "Rachunek";
      case InvoiceType.PROFORMA: return "Faktura proforma";
      case InvoiceType.CORRECTION: return "Faktura korygująca";
      default: return "Dokument";
    }
  };
  
  const isEditing = !!initialData;
  const documentTitle = getDocumentTitle();

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <InvoiceFormHeader 
            title={documentTitle} 
            documentType={documentType}
            isEditing={isEditing}
            className="mb-0"
          />
          <div className="hidden md:flex items-center space-x-2">
            <Button
              type="button"
              variant={transactionType === TransactionType.INCOME ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTransactionTypeChange(TransactionType.INCOME)}
              className="whitespace-nowrap"
            >
              Przychód
            </Button>
            <Button
              type="button"
              variant={transactionType === TransactionType.EXPENSE ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTransactionTypeChange(TransactionType.EXPENSE)}
              className="whitespace-nowrap"
            >
              Wydatek
            </Button>
          </div>
        </div>
        <div className="md:hidden flex space-x-2">
          <Button
            type="button"
            variant={transactionType === TransactionType.INCOME ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTransactionTypeChange(TransactionType.INCOME)}
            className="flex-1 md:flex-none"
          >
            Przychód
          </Button>
          <Button
            type="button"
            variant={transactionType === TransactionType.EXPENSE ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTransactionTypeChange(TransactionType.EXPENSE)}
            className="flex-1 md:flex-none"
          >
            Wydatek
          </Button>
        </div>
      </div>
      

      <div className="space-y-4">
        <InvoiceItemsForm 
          items={items}
          documentType={documentType}
          transactionType={transactionType as any}
          onItemsChange={setItems}
          userId={userId}
        />
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          <div className="grid md:grid-cols-2 gap-4">
            {/* Basic Invoice Info Card */}
            <InvoiceBasicInfoForm 
              form={form} 
              documentTitle={documentTitle} 
            />
            
            {/* Parties Card */}
            <InvoicePartiesForm 
              businessProfileId={businessProfileId}
              customerId={customerId}
              transactionType={transactionType}
              onBusinessProfileChange={handleBusinessProfileChange}
              onCustomerChange={handleCustomerChange}
            />
          </div>
          
          {/* Transaction Type */}
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">Typ transakcji</label>
            <select 
              className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as TransactionType)}
            >
              <option value={TransactionType.INCOME}>Przychód</option>
              <option value={TransactionType.EXPENSE}>Koszt</option>
            </select>
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md"
              onClick={() => navigate(-1)}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
              disabled={isLoading}
            >
              {isLoading ? 'Zapisywanie...' : 'Zapisz dokument'}
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewInvoice;
