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
  onSave?: (formData: InvoiceFormValues & { items: InvoiceItem[] }) => Promise<void>;
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
    }, [initialData, type, form]);

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
        
        const invoicePayload = { // Prepare payload for saveInvoice
          ...formData,
          user_id: user.id,
          transactionType: formData.transactionType, // Ensure transactionType is included
          // Map items to ensure correct database format for product_id and calculate totals
          items: items.map(item => {
            const quantity = Number(item.quantity) || 0; // Ensure quantity is a number
            const unitPrice = Number(item.unitPrice) || 0; // Ensure unitPrice is a number
            const vatRate = Number(item.vatRate) || 0; // Ensure vatRate is a number

            const totalNetValue = quantity * unitPrice;
            const totalVatValue = (totalNetValue * vatRate) / 100;
            const totalGrossValue = totalNetValue + totalVatValue;

            return {
              ...item,
              // Explicitly set product_id to null if productId is not a non-empty string
              product_id: item.productId && item.productId !== '' ? item.productId : null,
              // Ensure values are numbers and use snake_case for database
              quantity: quantity,
              unit_price: unitPrice,
              vat_rate: vatRate,
              total_net_value: Number(totalNetValue.toFixed(2)),
              total_vat_value: Number(totalVatValue.toFixed(2)),
              total_gross_value: Number(totalGrossValue.toFixed(2)),
              vat_exempt: item.vatExempt || false,
            };
          }),
          // Ensure total values are numbers
           totalNetValue: calculateInvoiceTotals(items).totalNetValue,
           totalGrossValue: calculateInvoiceTotals(items).totalGrossValue,
           totalVatValue: calculateInvoiceTotals(items).totalVatValue,
          isPaid: (initialData as any)?.isPaid || false, // Preserve or default isPaid
           // Handle vat and vatExemptionReason based on fakturaBezVAT
          vat: !formData.fakturaBezVAT, // If fakturaBezVAT is true, vat is false
          vatExemptionReason: formData.fakturaBezVAT ? formData.vatExemptionReason : null, // Include reason only if fakturaBezVAT
           paid: (initialData as any)?.paid || false, // Preserve or default paid
           // Convert paymentMethod string to PaymentMethodDb enum
           paymentMethod: toPaymentMethodDb(formData.paymentMethod as any),
           // Add other required fields expected by saveInvoice based on its Omit type
           number: formData.number,
           type: documentType,
           issueDate: formData.issueDate,
           dueDate: formData.dueDate,
           sellDate: formData.sellDate || formData.issueDate,
           comments: formData.comments || null, // Ensure comments is null if empty string
           businessProfileId: formData.businessProfileId,
           customerId: formData.customerId || null, // Ensure customerId is null if empty string
        };

        console.log('Invoice Payload being sent to saveInvoice:', invoicePayload);

        // Use onSave prop if provided (for use in other components like EditInvoice)
        if (onSave) {
           console.log('Using provided onSave prop.');
          // When using onSave, we pass the original form data and items, as the parent component handles the final save structure
          await onSave({...formData, items: items});
        } else {
           console.log('Using internal saveInvoice function.');
          // Call the saveInvoice function from the repository
          // Cast the payload to match the expected type of saveInvoice more closely
          const savedInvoice = await saveInvoice(invoicePayload as any);
           console.log('Invoice saved successfully:', savedInvoice);

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['invoice', savedInvoice.id] });

          // Redirect to the detail page of the newly created/updated invoice
          const detailRoute = savedInvoice.transactionType === TransactionType.EXPENSE ? '/expense' : '/income';
          navigate(`${detailRoute}/${savedInvoice.id}`);

          toast.success(`Dokument ${savedInvoice.number} zapisany pomyślnie`);
        }
        
        setIsLoading(false);
      } catch (error: any) {
        console.error('Error saving invoice:', error);
        toast.error('Wystąpił błąd podczas zapisywania faktury');
        setIsLoading(false);
      }
    };

    const getDocumentTitle = () => {
      if (transactionType === TransactionType.EXPENSE) {
        return "Wydatek faktura";
      }
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
                  transactionType={transactionType}
                />
                {/* Transaction Type Toggle - Desktop */}
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

            {/* Form sections - Wrapped in a flex-1, overflow-y-auto div */}
            <div className="flex-1 overflow-y-auto space-y-6">
              <InvoiceBasicInfoForm 
                form={form}
                documentTitle={documentTitle}
              />

              <InvoicePartiesForm 
                transactionType={transactionType}
                businessProfileId={businessProfileId}
                customerId={customerId}
                onBusinessProfileChange={handleBusinessProfileChange}
                onCustomerChange={handleCustomerChange}
              />
              
              <div>
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

            {/* InvoiceFormActions component and its positioning div - Moved outside the scrollable div */}
            {showFormActions && ( 
              <div className={cn(
                  "fixed bottom-0 left-0 right-0 w-full border-t bg-background z-[9999]", // Fixed at bottom on mobile with high z-index
                  "md:static md:bottom-auto md:left-auto md:right-auto md:w-auto md:border-t-0 md:bg-transparent md:z-auto", // Static on medium+ screens
                  "py-2 lg:py-2", // Padding
                  "container" // Apply container padding
                )}>
                <InvoiceFormActions
                  isLoading={isLoading}
                  isEditing={Boolean(initialData)} 
                  onSubmit={handleFormSubmit}
                  transactionType={transactionType}
                />
              </div>
            )}
          </form>
        </Form>
      </div>
    );
  }
);

export default NewInvoice;
