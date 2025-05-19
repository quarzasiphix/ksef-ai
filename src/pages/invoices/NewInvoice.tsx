import React, { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
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
  number: z.string().min(1, "Numer faktury jest wymagany"),
  issueDate: z.string().min(1, "Data wystawienia jest wymagana"),
  dueDate: z.string().min(1, "Termin płatności jest wymagany"),
  sellDate: z.string(),
  paymentMethod: z.string().min(1, "Metoda płatności jest wymagana"),
  comments: z.string().optional().default(""),
  customerId: z.string().optional(),
  businessProfileId: z.string().min(1, "Profil biznesowy jest wymagany"),
  transactionType: z.nativeEnum(TransactionType).default(TransactionType.EXPENSE)
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
  const location = useLocation();
  const isIncomeRoute = location.pathname === '/income/new';
  const isExpenseRoute = location.pathname === '/expense/new';
  const hideTransactionButtons = isIncomeRoute || isExpenseRoute;

  const [transactionType, setTransactionType] = useState<TransactionType>(type);
  const [documentType, setDocumentType] = useState<InvoiceType>(InvoiceType.SALES);
  const [documentSettings, setDocumentSettings] = useState<any[]>([]);
  const [documentSettingsLoaded, setDocumentSettingsLoaded] = useState(false);
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
    form.setValue('businessProfileId', id, { shouldValidate: true });
  };

  // Handle customer change
  const handleCustomerChange = (id: string, name?: string) => {
    setCustomerId(id);
    setCustomerName(name || "");
    form.setValue('customerId', id, { shouldValidate: true });
  };
  
  // Handle payment method change
  const handlePaymentMethodChange = (value: string) => {
    // Convert UI payment method to database format
    const dbMethod = toPaymentMethodDb(value);
    form.setValue("paymentMethod", dbMethod, { shouldValidate: true });
  };

  // Toggle transaction type
  const toggleTransactionType = () => {
    const newType = transactionType === TransactionType.INCOME 
      ? TransactionType.EXPENSE 
      : TransactionType.INCOME;
    setTransactionType(newType);
    form.setValue('transactionType', newType, { shouldValidate: true });
    
    // Reset customer when switching to expense type
    if (newType === TransactionType.EXPENSE) {
      setCustomerId('');
      setCustomerName('');
      form.setValue('customerId', '', { shouldValidate: true });
    }
  };

  // Handle transaction type change
  const handleTransactionTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    form.setValue('transactionType', type, { shouldValidate: true });
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
    mode: 'onChange', // Validate on change
    defaultValues: {
      number: initialData?.number || generateInvoiceNumber(new Date(), 1),
      issueDate: initialData?.issueDate || today,
      sellDate: initialData?.sellDate || today,
      dueDate: initialData?.dueDate || today,
      paymentMethod: normalizedPaymentMethod as unknown as PaymentMethod,
      comments: initialData?.comments || "",
      transactionType: type || (isIncomeRoute ? TransactionType.INCOME : (isExpenseRoute ? TransactionType.EXPENSE : TransactionType.INCOME)),
      customerId: initialData?.customerId || "",
      businessProfileId: initialData?.businessProfileId || "",
    }
  });
  
  // Log form errors
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (form.formState.errors) {
        console.log('Form errors:', form.formState.errors);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form.formState.errors]);

  // Remove this line as we'll use form.setValue directly
  // to ensure form state is properly updated

  // Load document type settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("documentTypeSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setDocumentSettings(parsed);
      } catch (e) {
        console.error("Error parsing saved document settings:", e);
      } finally {
        setDocumentSettingsLoaded(true);
      }
    } else {
      setDocumentSettingsLoaded(true); // Also set to true if no settings are found
    }
  }, []);

  // Set document type from URL parameter or initialData
  useEffect(() => {
    console.log('useEffect [initialData, searchParams] running');
    console.log('initialData:', initialData);
    console.log('searchParams:', searchParams.toString());

    if (initialData) {
      // If we're editing an existing invoice, use its type
      console.log('Setting document type from initialData:', initialData.type);
      setDocumentType(initialData.type);
    } else {
      // If creating a new invoice, check URL parameter
      const typeFromUrl = searchParams.get("type");
      if (typeFromUrl && Object.values(InvoiceType).includes(typeFromUrl as InvoiceType)) {
        const newDocumentType = typeFromUrl as InvoiceType;
        setDocumentType(newDocumentType);
        // Set transaction type based on document type for new invoices
        if (newDocumentType === InvoiceType.RECEIPT) {
          setTransactionType(TransactionType.INCOME);
        }
      }
    }
  }, [initialData, searchParams, documentSettings]); // Added documentSettings here

  // Check if the selected document type is enabled in settings
  useEffect(() => {
    console.log("NewInvoice - useEffect - checking document type enablement - START");
    console.log("NewInvoice - useEffect - checking document type enablement - documentType:", documentType);
    console.log("NewInvoice - useEffect - checking document type enablement - documentSettings:", documentSettings);

    if (documentSettings.length > 0) {
      const selectedTypeSetting = documentSettings.find(type => type.id === documentType);
      console.log("NewInvoice - useEffect - checking document type enablement - selectedTypeSetting:", selectedTypeSetting);
      console.log("NewInvoice - useEffect - checking document type enablement - selectedTypeSetting?.enabled:", selectedTypeSetting?.enabled);

      if (selectedTypeSetting && !selectedTypeSetting.enabled) {
        console.warn(`NewInvoice - useEffect - Document type ${documentType} is disabled. Navigating to /income.`);
        navigate("/income");
      }
    } else {
      console.warn('documentSettings is empty or not loaded. Cannot verify if document type is enabled.');
    }
    console.log("NewInvoice - useEffect - checking document type enablement - END");
  }, [documentType, documentSettings, navigate]);

  // Log documentType and documentSettings after they are updated
  useEffect(() => {
    console.log('documentType state after update:', documentType);
    console.log('documentSettings state after update:', documentSettings);
  }, [documentType, documentSettings]);

  // Form submission handler
  const onSubmit = async (data: InvoiceFormValues & { transactionType: TransactionType }) => {
    console.log('Form submitted with data:', data);
    
    // The form data already includes transactionType
    const formData = {
      ...data,
      transactionType: data.transactionType || transactionType
    };
    
    // Log current state for debugging
    console.log('Current state:', {
      businessProfileId,
      customerId,
      items,
      formData
    });
    
    if (!businessProfileId) {
      const errorMsg = 'Business profile not selected';
      console.error(errorMsg);
      toast.error("Wybierz profil biznesowy");
      return;
    }
    
    if (!customerId) {
      const errorMsg = 'Customer not selected';
      console.error(errorMsg);
      toast.error("Wybierz klienta");
      return;
    }
    
    if (items.length === 0) {
      const errorMsg = 'No items added to the invoice';
      console.error(errorMsg);
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
      
      // Convert payment method to database format if it's not already
      const paymentMethod = (typeof data.paymentMethod === 'string' 
        ? toPaymentMethodDb(data.paymentMethod)
        : 'transfer') as PaymentMethodDb;
      
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
        paymentMethod: paymentMethod,
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

  if (!documentSettingsLoaded) {
    return <div className="text-center py-8">Ładowanie ustawień dokumentów...</div>;
  }

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
          {!hideTransactionButtons && (
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
          )}
        </div>
        {!hideTransactionButtons && (
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
        )}
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
        </form>
      </Form>
    </div>
  );
};

export default NewInvoice;
