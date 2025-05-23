import React, { useState, useEffect, useCallback } from "react";
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
  // All hooks at the top, always called in the same order
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isIncomeRoute = location.pathname === "/income/new";
  const isExpenseRoute = location.pathname === "/expense/new";
  const hideTransactionButtons = isIncomeRoute || isExpenseRoute || location.pathname === "/invoices/new";

  const [transactionType, setTransactionType] = useState<TransactionType>(
    initialData?.transactionType || type
  );
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
      transactionType: initialData?.transactionType || type,
      customerId: initialData?.customerId || "",
      businessProfileId: initialData?.businessProfileId || "",
      fakturaBezVAT: initialData?.fakturaBezVAT || false,
      vatExemptionReason: initialData?.vatExemptionReason,
    },
  });
  
  // Get form values
  const businessProfileId = form.watch('businessProfileId');
  const customerId = form.watch('customerId');

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

  // --- EARLY RETURN after all hooks ---
  if (!documentSettingsLoaded) {
    return <div className="text-center py-8">Ładowanie ustawień...</div>;
  }

  // Submit handler
  const onSubmit = async (formData: InvoiceFormValues) => {
    console.log('onSubmit called with formData:', formData);
    console.log('Current items state:', items);
    
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
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const vatRate = Number(item.vatRate) || 0;
        
        const totalNetValue = quantity * unitPrice;
        const totalVatValue = documentType === InvoiceType.RECEIPT 
          ? 0 
          : (totalNetValue * vatRate) / 100;
        const totalGrossValue = documentType === InvoiceType.RECEIPT
          ? totalNetValue
          : totalNetValue * (1 + vatRate / 100);
          
        return {
          ...item,
          totalNetValue: Number(totalNetValue.toFixed(2)),
          totalVatValue: Number(totalVatValue.toFixed(2)),
          totalGrossValue: Number(totalGrossValue.toFixed(2))
        };
      });
      
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
        isPaid: false,
        paid: false,
        status: 'draft',
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        sellDate: formData.sellDate || formData.issueDate,
        date: formData.issueDate,
        seller,
        buyer,
        comments: formData.fakturaBezVAT && formData.vatExemptionReason 
          ? `${formData.comments || ''}\n\nPowód zwolnienia z VAT: ${formData.vatExemptionReason}`.trim()
          : formData.comments || '',
        businessName: businessName || '',
        customerName: customerName || '',
        vat: !formData.fakturaBezVAT,
        vatExemptionReason: formData.vatExemptionReason || undefined
      };

      console.log('Saving invoice:', invoiceData);
      
      // Save the invoice
      const savedInvoice = await saveInvoice(invoiceData as any);
      
      // Invalidate the invoices query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast.success("Dokument został zapisany pomyślnie");
      
      // Determine the correct redirect path based on the transaction type
      const redirectPath = transactionType === TransactionType.EXPENSE 
        ? `/expense/${savedInvoice.id}`
        : `/income/${savedInvoice.id}`;
      
      // Redirect to the invoice detail page
      navigate(redirectPath, { replace: true });
      
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error(`Wystąpił błąd podczas zapisywania dokumentu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
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

  const documentTitle = getDocumentTitle();
  const isEditing = Boolean(initialData);

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started');
    
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
      
      // Ensure business profile is set
      if (!formValues.businessProfileId) {
        toast.error('Proszę wybrać profil biznesowy');
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
    <div className="space-y-4">
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
            {/* Transaction Type Toggle - Mobile */}
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

          {/* Form sections */}
          <div className="space-y-6">
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
              <div style={{ display: 'none' }}>
                Debug Info - Items: {JSON.stringify(items, null, 2)}
              </div>
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

          {/* Form actions */}
          <InvoiceFormActions 
            isLoading={isLoading} 
            isEditing={isEditing} 
            onSubmit={handleFormSubmit}
            transactionType={transactionType}
          />
        </form>
      </Form>
    </div>
  );
};

export default NewInvoice;
