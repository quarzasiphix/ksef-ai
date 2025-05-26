import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useAuth } from "@/App";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Invoice, InvoiceType, InvoiceItem, VatType, VatExemptionReason, Company } from "@/types";
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
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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
  transactionType: z.nativeEnum(TransactionType),
  fakturaBezVAT: z.boolean().optional().default(false),
  vatExemptionReason: z.nativeEnum(VatExemptionReason).optional(),
});
type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface NewInvoiceProps {
  initialData?: Invoice;
  type?: TransactionType;
  showFormActions?: boolean;
  onSave?: (formData: InvoiceFormValues) => Promise<void>;
}

const NewInvoice: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NewInvoiceProps> &
  React.RefAttributes<{
    handleSubmit: (onValid: (data: any) => Promise<void>) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  }>
> = React.forwardRef(
  ({ initialData, type = TransactionType.EXPENSE, showFormActions = true, onSave }, ref) => {
    const { state } = useSidebar()

    // All hooks at the top, always called in the same order
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const isIncomeRoute = location.pathname === "/income/new" || location.pathname.startsWith("/income/edit/");
    const isExpenseRoute = location.pathname === "/expense/new" || location.pathname.startsWith("/expense/edit/");
    const hideTransactionButtons = isIncomeRoute || isExpenseRoute || location.pathname === "/invoices/new";

    const [transactionType, setTransactionType] = useState<TransactionType>(() => {
      if (initialData?.transactionType) return initialData.transactionType;
      // For new invoices on the generic route, default to INCOME
      if (!initialData && location.pathname === "/invoices/new") return TransactionType.INCOME;
      if (isIncomeRoute) return TransactionType.INCOME;
      if (isExpenseRoute) return TransactionType.EXPENSE;
      return type; // Fallback to default prop (should not be reached for new invoices on dedicated routes)
    });
    const [documentType, setDocumentType] = useState<InvoiceType>(
      initialData?.type || InvoiceType.SALES
    );
    const [documentSettings, setDocumentSettings] = useState<any[]>([]);
    const [documentSettingsLoaded, setDocumentSettingsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [items, setItems] = useState<InvoiceItem[]>(() => {
      console.log('Initializing items state with:', initialData?.items);
      return initialData?.items || [];
    });

    // Update items when initialData changes
    useEffect(() => {
      if (initialData?.items) {
        console.log('Updating items from initialData:', initialData.items);
        setItems(initialData.items);
      }
    }, [initialData]);

    // Log items when they change
    useEffect(() => {
      console.log('Items state updated:', items);
    }, [items]);

    const [businessName, setBusinessName] = useState<string>(
      initialData?.businessName || ""
    );
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
        transactionType: transactionType,
        customerId: initialData?.customerId || "",
        businessProfileId: initialData?.businessProfileId || "",
        fakturaBezVAT: (initialData as any)?.vat === false,
        vatExemptionReason: initialData?.vatExemptionReason,
      },
    });
    
    console.log('NewInvoice - Initial Data VAT:', (initialData as any)?.vat);
    console.log('NewInvoice - Initial Data VAT Exemption Reason:', initialData?.vatExemptionReason);
    console.log('NewInvoice - Form Default FakturaBezVAT:', (initialData as any)?.vat === false);

    // Get form values
    const businessProfileId = form.watch('businessProfileId');
    const customerId = form.watch('customerId');

    // Watch for fakturaBezVAT changes
    const fakturaBezVAT = form.watch('fakturaBezVAT');

    // Update all items to 'zw' when fakturaBezVAT is checked
    useEffect(() => {
      if (fakturaBezVAT) {
        const updatedItems = items.map(item => ({
          ...item,
          vatRate: -1 // Set to 'zw'
        }));
        setItems(updatedItems);
      }
    }, [fakturaBezVAT]);

    // Sync transactionType state with form value
    useEffect(() => {
      form.setValue('transactionType', transactionType, { shouldValidate: true });
      console.log('NewInvoice useEffect - transactionType state changed, setting form value:', transactionType);
    }, [transactionType, form]);

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

    // Update items and form when initialData changes
    useEffect(() => {
      if (initialData) {
        console.log('NewInvoice useEffect - initialData changed:', initialData);
        console.log('NewInvoice useEffect - initialData.vat:', (initialData as any).vat);
        console.log('NewInvoice useEffect - initialData.vatExemptionReason:', initialData.vatExemptionReason);
        
        setItems(initialData.items || []); // Ensure items are updated when initialData changes

        // Explicitly reset form values based on initialData
        form.reset({
          ...form.getValues(), // Keep current form values not from initialData
          number: initialData.number,
          issueDate: initialData.issueDate,
          sellDate: initialData.sellDate,
          dueDate: initialData.dueDate,
          paymentMethod: initialData.paymentMethod ? toPaymentMethodUi(initialData.paymentMethod as PaymentMethodDb) : "TRANSFER",
          comments: initialData.comments || "",
          transactionType: initialData.transactionType || type,
          customerId: initialData.customerId || "",
          businessProfileId: initialData.businessProfileId || "",
          fakturaBezVAT: (initialData as any).vat === false, // Explicitly set checkbox
          vatExemptionReason: initialData.vatExemptionReason, // Explicitly set reason
        });
      }
    }, [initialData, type, form]); // Depend on initialData, type, and form instance

    // Log items when they change
    useEffect(() => {
      console.log('Items state updated:', items);
      console.log('Form fakturaBezVAT value:', form.getValues().fakturaBezVAT);
      console.log('Form vatExemptionReason value:', form.getValues().vatExemptionReason);
      console.log('Form transactionType value:', form.getValues().transactionType); // Added log
    }, [items, form.getValues().fakturaBezVAT, form.getValues().vatExemptionReason, form.getValues().transactionType]); // Depend on items and form values

    useImperativeHandle(ref, () => ({
      handleSubmit: form.handleSubmit,
    }));

    // --- EARLY RETURN after all hooks ---
    if (!documentSettingsLoaded) {
      return <div className="text-center py-8">Ładowanie ustawień...</div>;
    }

    // Submit handler
    const onSubmit = async (formData: InvoiceFormValues) => {
      console.log('onSubmit called with formData:', formData);
      console.log('Current items state:', items);
      console.log('initialData exists:', !!initialData);
      console.log('onSave prop provided:', !!onSave);

      if (!user) {
        const error = "Nie jesteś zalogowany";
        console.error(error);
        toast.error(error);
        return;
      }

      if (items.length === 0) {
        const error = "Dodaj co najmniej jedną pozycję do faktury";
        console.error(error);
        toast.error(error);
        return;
      }

      try {
        console.log('Starting form submission...');
        setIsLoading(true);
        
        // Calculate invoice totals
        const calculatedItems = items.map(item => {
          console.log('Processing item:', item);
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          // Handle VAT rate conversion
          let vatRate: number;
          if (typeof item.vatRate === 'string' && item.vatRate === 'zw') {
            vatRate = -1;
          } else {
            vatRate = Number(item.vatRate);
            if (isNaN(vatRate)) vatRate = 0;
          }
          
          const totalNetValue = quantity * unitPrice;
          const totalVatValue = documentType === InvoiceType.RECEIPT || vatRate === -1
            ? 0 
            : (totalNetValue * vatRate) / 100;
          const totalGrossValue = documentType === InvoiceType.RECEIPT || vatRate === -1
            ? totalNetValue
            : totalNetValue * (1 + vatRate / 100);
          
          const calculatedItem = {
            ...item,
            vatRate,
            totalNetValue: Number(totalNetValue.toFixed(2)),
            totalVatValue: Number(totalVatValue.toFixed(2)),
            totalGrossValue: Number(totalGrossValue.toFixed(2))
          };
          
          console.log('Calculated item:', calculatedItem);
          return calculatedItem;
        });
        
        console.log('All calculated items:', calculatedItems);
        
        const totalNetValue = Number(calculatedItems
          .reduce((sum, item) => sum + (item.totalNetValue || 0), 0)
          .toFixed(2));
        const totalVatValue = Number(calculatedItems
          .reduce((sum, item) => sum + (item.totalVatValue || 0), 0)
          .toFixed(2));
        const totalGrossValue = Number(calculatedItems
          .reduce((sum, item) => sum + (item.totalGrossValue || 0), 0)
          .toFixed(2));
        
        // Create seller and buyer objects
        const seller: Company = {
          name: businessName || '',
          taxId: '',
          address: '',
          city: '',
          postalCode: ''
        };

        const buyer: Company = {
          name: customerName || '',
          taxId: '',
          address: '',
          city: '',
          postalCode: ''
        };

        // Create the invoice data
        const invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at'> = {
          ...formData,
          number: formData.number.trim(),
          type: documentType,
          transactionType,
          items: calculatedItems,
          paymentMethod: toPaymentMethodDb(formData.paymentMethod as any),
          totalNetValue,
          totalVatValue,
          totalGrossValue,
          totalAmount: totalGrossValue,
          user_id: user.id,
          businessProfileId: formData.businessProfileId,
          customerId: formData.customerId || '',
          isPaid: initialData?.isPaid || false,
          paid: initialData?.paid || false,
          status: initialData?.status || 'draft',
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          sellDate: formData.sellDate || formData.issueDate,
          date: formData.issueDate,
          seller,
          buyer,
          comments: formData.comments || '',
          businessName: businessName || '',
          customerName: customerName || '',
          vat: !(formData.fakturaBezVAT),
          vatExemptionReason: formData.fakturaBezVAT ? formData.vatExemptionReason : undefined
        } as any;

        console.log('Saving invoice with data:', invoiceData);
        
        if (initialData && onSave) {
          await onSave(invoiceData);
        } else {
          const savedInvoice = await saveInvoice(invoiceData);
          console.log('Invoice saved successfully:', savedInvoice);
          await queryClient.invalidateQueries({ queryKey: ['invoices'] });
          // Navigate to the correct details page based on transaction type
          const basePath = savedInvoice.transactionType === TransactionType.INCOME ? '/income' : '/expense';
          navigate(`${basePath}/${savedInvoice.id}`);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error saving invoice:', error);
        toast.error('Wystąpił błąd podczas zapisywania faktury');
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

    const documentTitle = getDocumentTitle();
    const isEditing = Boolean(initialData);

    // Handle form submission
    const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Form submission started');
      
      // Log current form state
      console.log('Current form state:', form.getValues());
      console.log('Form errors:', form.formState.errors);
      console.log('Current items:', items);
      
      // Manually trigger form validation
      const isValid = await form.trigger();
      console.log('Form validation result:', isValid);
      
      if (!isValid) {
        console.error('Form validation failed');
        const errors = form.formState.errors;
        console.error('Form errors:', errors);
        
        // Show first error to user
        const firstError = Object.values(errors)[0];
        if (firstError?.message) {
          toast.error(firstError.message as string);
        } else {
          toast.error('Proszę wypełnić wszystkie wymagane pola');
        }
        return;
      }
      
      try {
        setIsLoading(true);
        const formValues = form.getValues();
        console.log('Form is valid, submitting with values:', formValues);
        console.log('Items to be saved:', items);
        
        // Ensure business profile is set
        if (!formValues.businessProfileId) {
          toast.error('Proszę wybrać profil biznesowy');
          return;
        }
        
        // Ensure we have items
        if (items.length === 0) {
          toast.error('Dodaj co najmniej jedną pozycję do faktury');
          return;
        }
        
        // Call the original onSubmit with form values
        await onSubmit(formValues);
      } catch (error) {
        console.error('Error during form submission:', error);
        toast.error(`Błąd podczas zapisywania: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Handle business profile change
    const handleBusinessProfileChange = (id: string, name?: string) => {
      form.setValue('businessProfileId', id, { shouldValidate: true });
      if (name) {
        setBusinessName(name);
      }
    };
    
    // Handle customer change
    const handleCustomerChange = (id: string, name?: string) => {
      form.setValue('customerId', id, { shouldValidate: true });
      if (name) {
        setCustomerName(name);
      }
    };

    return (
      <div className="space-y-4 pb-24 md:pb-4">
        <Form {...form}>
          <form 
            onSubmit={(e) => {
              console.log('Form submit event triggered');
              handleFormSubmit(e);
            }} 
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <InvoiceFormHeader
                  title={documentTitle}
                  documentType={documentType}
                  isEditing={isEditing}
                />
                {/* Transaction Type Toggle - Desktop */}
                {/* Show only on /invoices/new */}
                {location.pathname === "/invoices/new" && (
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
              {/* Transaction Type Toggle - Mobile */}
              {/* Show only on /invoices/new */}
              {location.pathname === "/invoices/new" && (
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

            {/* Form sections */}
            <div className="space-y-6">
              <InvoiceBasicInfoForm 
                form={form}
                documentTitle={documentTitle}
              />
              
              {/* Log values being passed to InvoiceBasicInfoForm */}
              {/* console.log('NewInvoice - Passing to InvoiceBasicInfoForm - fakturaBezVAT:', form.watch('fakturaBezVAT')) */}
              {/* console.log('NewInvoice - Passing to InvoiceBasicInfoForm - vatExemptionReason:', form.watch('vatExemptionReason')) */}

              <InvoicePartiesForm 
                transactionType={transactionType}
                businessProfileId={businessProfileId}
                customerId={customerId}
                onBusinessProfileChange={handleBusinessProfileChange}
                onCustomerChange={handleCustomerChange}
              />
              
              <div>
                {/* <div style={{ display: 'none' }}>
                  Debug Info - Items: {JSON.stringify(items, null, 2)}
                </div> */}
                <InvoiceItemsForm 
                  items={items}
                  documentType={documentType}
                  transactionType={transactionType}
                  onItemsChange={setItems}
                  userId={user?.id || ''}
                  fakturaBezVAT={form.watch('fakturaBezVAT')}
                  vatExemptionReason={form.watch('vatExemptionReason')}
                />
              </div>
            </div>

            {/* Sticky form actions */}
            {/* Fixed on mobile, static at the bottom on non-mobile */}
            {showFormActions && (
              <div className={cn(
                  "bg-background border-t z-50", // Base styles
                  "bottom-0 left-0 right-0 w-full", // These apply on all screen sizes unless overridden
                  "md:static md:bottom-auto md:left-auto md:right-auto md:w-auto md:border-t-0", // Override to static on medium+
                  "md:mt-6 md:border-none lg:max-h-12" // Non-mobile specific styles
                )}>
                <div className="container py-2 lg:py-2"> {/* Keep container with standard padding */}
                  <InvoiceFormActions
                    isLoading={isLoading}
                    isEditing={isEditing}
                    onSubmit={handleFormSubmit}
                    transactionType={transactionType}
                  />
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>
    );
  }
);

export default NewInvoice;
