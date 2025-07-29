import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useAuth } from "@/context/AuthContext";
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
  toPaymentMethodUi,
  toPaymentMethodDb,
  getNbpExchangeRate,
  formatCurrency,
  getDocumentTitle
} from "@/lib/invoice-utils";
import { saveInvoice, getInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { saveExpense } from "@/integrations/supabase/repositories/expenseRepository";
import { InvoiceFormHeader } from "@/components/invoices/forms/InvoiceFormHeader";
import { InvoiceBasicInfoForm } from "@/components/invoices/forms/InvoiceBasicInfoForm";
import { InvoicePartiesForm } from "@/components/invoices/forms/InvoicePartiesForm";
import { InvoiceItemsForm } from "@/components/invoices/forms/InvoiceItemsForm";
import { InvoiceFormActions } from "@/components/invoices/forms/InvoiceFormActions";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { PaymentMethod } from "@/types";
import ContractsPicker from "@/components/contracts/ContractsPicker";
import { addLink as addContractLink } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import { getBankAccountsForProfile, addBankAccount } from "@/integrations/supabase/repositories/bankAccountRepository";
import { BankAccount } from "@/types/bank";
import { BankAccountEditDialog } from "@/components/bank/BankAccountEditDialog";

// Schema
const invoiceFormSchema = z.object({
  // Required fields
  number: z.string().min(1, 'Numer faktury jest wymagany'),
  issueDate: z.string().min(1, 'Data wystawienia jest wymagana'),
  dueDate: z.string().min(1, 'Termin płatności jest wymagany'),
  sellDate: z.string().min(1, 'Data sprzedaży jest wymagana'),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Sposób płatności jest wymagany' })
  }),
  customerId: z.string().min(1, 'Kontrahent jest wymagany'),
  businessProfileId: z.string().min(1, 'Profil biznesowy jest wymagany'),
  transactionType: z.nativeEnum(TransactionType),
  
  // Optional fields with defaults
  comments: z.string().default(''),
  status: z.string().default('draft'),
  type: z.nativeEnum(InvoiceType).default(InvoiceType.SALES),
  vat: z.boolean().default(true),
  vatExemptionReason: z.nativeEnum(VatExemptionReason).nullable().default(null),
  currency: z.string().default('PLN'),
  exchangeRate: z.number().min(0.0001, 'Kurs musi być większy od zera').default(1),
  exchangeRateDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  exchangeRateSource: z.enum(['NBP', 'manual']).default('NBP'),
  bankAccountId: z.string().optional(),
  
  // Calculated fields (will be set programmatically)
  totalNetValue: z.number().default(0),
  totalVatValue: z.number().default(0),
  totalGrossValue: z.number().default(0),
  isPaid: z.boolean().default(false),
  fakturaBezVAT: z.boolean().default(false)
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface NewInvoiceProps {
  initialData?: Invoice;
  type?: TransactionType;
  showFormActions?: boolean;
  onSave?: (formData: InvoiceFormValues & { items: InvoiceItem[] }) => Promise<void>;
  hideHeader?: boolean;
  bankAccounts?: BankAccount[];
  items?: InvoiceItem[];
  onItemsChange?: (items: InvoiceItem[]) => void;
}

const NewInvoice = React.forwardRef<{
  handleSubmit: (onValid: (data: any) => Promise<void>) => (e?: React.BaseSyntheticEvent) => Promise<void>;
}, NewInvoiceProps>(({ 
  initialData, 
  type = TransactionType.EXPENSE, 
  showFormActions = true, 
  onSave, 
  hideHeader = false, 
  bankAccounts: propsBankAccounts,
  items: propItems,
  onItemsChange
}, ref) => {
    const { state } = useSidebar()

    // All hooks at the top, always called in the same order
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();




    // Helpers to determine if current path is for income or expense invoice creation/edit
    const isIncomeRoute = location.pathname === "/income/new" || location.pathname.startsWith("/income/edit/");
    const isExpenseRoute = location.pathname === "/expense/new" || location.pathname.startsWith("/expense/edit/");
    const hideTransactionButtons = isIncomeRoute || isExpenseRoute || location.pathname === "/invoices/new";

    // --- NEW: Prefill customer/product logic ---
    const urlCustomerId = searchParams.get("customerId") || "";
    const urlProductId = searchParams.get("productId") || "";
    const duplicateId = searchParams.get("duplicateId") || "";
    const [prefilled, setPrefilled] = useState(false);
    const [isDuplicate, setIsDuplicate] = useState(false);

    // --- Transaction type state ---
    const [transactionType, setTransactionType] = useState<TransactionType | undefined>(() => {
      if (initialData?.transactionType) return initialData.transactionType;
      if (location.pathname === "/income/new" || location.pathname.startsWith("/income/edit/")) return TransactionType.INCOME;
      if (location.pathname === "/expense/new" || location.pathname.startsWith("/expense/edit/")) return TransactionType.EXPENSE;
      return undefined;
    });
    const [documentType, setDocumentType] = useState<InvoiceType>(
      initialData?.type || InvoiceType.SALES
    );
    const [documentSettings, setDocumentSettings] = useState<any[]>([]);
    const [documentSettingsLoaded, setDocumentSettingsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // Use items from props if provided, otherwise use local state
    const [localItems, setLocalItems] = useState<InvoiceItem[]>(initialData?.items || []);
    const items = propItems !== undefined ? propItems : localItems;
    const setItems = onItemsChange || setLocalItems;

    // --- linking contracts prior to save ---
    const [contractsToLink, setContractsToLink] = useState<string[]>([]);
    const [exchangeRate, setExchangeRate] = useState<number>(initialData?.exchangeRate || 1);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(propsBankAccounts || []);
    const [showVatAccountDialog, setShowVatAccountDialog] = useState(false);

    const handleAddContract = (id: string) => {
      setContractsToLink((prev) => [...prev, id]);
    };
    const handleRemoveContract = (id: string) => {
      setContractsToLink((prev) => prev.filter((c) => c !== id));
    };

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
    
    // Today and default due date (+7 days)
    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const dueIn7 = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const form = useForm<InvoiceFormValues>({
      resolver: zodResolver(invoiceFormSchema),
      mode: "onChange",
      defaultValues: {
        number: initialData?.number || generateInvoiceNumber(new Date(), 1),
        issueDate: initialData?.issueDate || today,
        sellDate: initialData?.sellDate || today,
        dueDate: initialData?.dueDate || dueIn7,
        paymentMethod: initialData?.paymentMethod
          ? toPaymentMethodUi(initialData.paymentMethod as PaymentMethodDb)
          : PaymentMethod.TRANSFER,
        comments: initialData?.comments || "",
        transactionType: transactionType || TransactionType.INCOME,
        customerId: initialData?.customerId || "",
        businessProfileId: initialData?.businessProfileId || "",
        vat: initialData?.vat ?? true,
        vatExemptionReason: initialData?.vatExemptionReason || null,
        fakturaBezVAT: (initialData as any)?.vat === false,
        currency: initialData?.currency || 'PLN',
        bankAccountId: initialData?.bankAccountId || "",
        exchangeRate: initialData?.exchangeRate || 1,
        exchangeRateDate: initialData?.exchangeRateDate || today,
        exchangeRateSource: (initialData?.exchangeRateSource as 'NBP' | 'manual' | undefined) || 'NBP',
        status: initialData?.status || 'draft',
        type: initialData?.type || InvoiceType.SALES,
        totalNetValue: initialData?.totalNetValue || 0,
        totalVatValue: initialData?.totalVatValue || 0,
        totalGrossValue: initialData?.totalGrossValue || 0,
        isPaid: initialData?.isPaid || false
      },
    });

    // Automatyczne pobieranie kursu NBP - po deklaracji form
    useEffect(() => {
      const currency = form.watch('currency');
      const issueDate = form.watch('issueDate');
      if (currency && currency !== 'PLN' && issueDate) {
        const prevDate = new Date(issueDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        getNbpExchangeRate(currency, prevDateStr)
          .then(({ rate, rateDate }) => {
            setExchangeRate(rate);
            form.setValue('exchangeRate', rate);
            form.setValue('exchangeRateDate', rateDate);
            form.setValue('exchangeRateSource', 'NBP');
          })
          .catch(() => {
            setExchangeRate(1);
            form.setValue('exchangeRate', 1);
            form.setValue('exchangeRateDate', prevDateStr);
            form.setValue('exchangeRateSource', 'NBP');
          });
      } else {
        setExchangeRate(1);
        form.setValue('exchangeRate', 1);
        form.setValue('exchangeRateDate', '');
        form.setValue('exchangeRateSource', 'NBP');
      }
    }, [form.watch('currency'), form.watch('issueDate')]);

    // Pobieranie kont bankowych (tylko jeśli nie przekazano z props)
    useEffect(() => {
      if (propsBankAccounts) {
        setBankAccounts(propsBankAccounts);
        return;
      }
      
      const businessProfileId = form.watch('businessProfileId');
      if (businessProfileId) {
        getBankAccountsForProfile(businessProfileId)
          .then(setBankAccounts)
          .catch(console.error);
      } else {
        setBankAccounts([]);
      }
    }, [form.watch('businessProfileId'), propsBankAccounts]);
    
    console.log('NewInvoice - Initial Data VAT:', (initialData as any)?.vat);
    console.log('NewInvoice - Initial Data VAT Exemption Reason:', initialData?.vatExemptionReason);
    console.log('NewInvoice - Form Default FakturaBezVAT:', (initialData as any)?.vat === false);

    /* ---------- Unsaved changes tracking (must run every render) ---------- */
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Form dirty state
    useEffect(() => {
      if (form.formState.isDirty) {
        setHasUnsavedChanges(true);
      }
    }, [form.formState.isDirty]);

    // Items modifications
    const initialItemsRef = React.useRef<string>(JSON.stringify(initialData?.items || []));
    useEffect(() => {
      if (JSON.stringify(items) !== initialItemsRef.current) {
        setHasUnsavedChanges(true);
      }
    }, [items]);

    // Warn on unload
    useEffect(() => {
      const handler = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?";
        }
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsavedChanges]);

    // Get form values
    const businessProfileId = form.watch('businessProfileId');
    const customerId = form.watch('customerId');
    const bankAccountId = form.watch('bankAccountId');

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
        setItems(initialData.items || []); // Ensure items are updated when initialData changes

        // Explicitly reset form values based on initialData
        const { paymentMethod: _pm, ...restValues } = form.getValues();
        form.reset({
          ...restValues, // Keep current form values not from initialData, except paymentMethod
          number: initialData.number,
          issueDate: initialData.issueDate,
          sellDate: initialData.sellDate,
          dueDate: initialData.dueDate,
          paymentMethod: initialData.paymentMethod ? toPaymentMethodUi(initialData.paymentMethod as PaymentMethodDb) : "przelew",
          comments: initialData.comments || "",
          transactionType: initialData.transactionType || type,
          customerId: initialData.customerId || "",
          businessProfileId: initialData.businessProfileId || "",
          fakturaBezVAT: (initialData as any).vat === false, // Explicitly set checkbox
          vatExemptionReason: initialData.vatExemptionReason, // Explicitly set reason
          bankAccountId: initialData.bankAccountId || "",
          exchangeRate: initialData.exchangeRate || 1,
          exchangeRateDate: initialData.exchangeRateDate || '',
          exchangeRateSource: initialData.exchangeRateSource || 'NBP',
        });
      }
    }, [initialData, type, form]);

    // Log items when they change
    useEffect(() => {
      // Debug logging removed for production
    }, [items, form.getValues().fakturaBezVAT, form.getValues().vatExemptionReason, form.getValues().transactionType]); // Depend on items and form values

    // Prefill customer/product on mount (only once)
    useEffect(() => {
      if (prefilled) return;
      let changed = false;
      // Prefill customer
      if (urlCustomerId && !form.getValues().customerId) {
        form.setValue('customerId', urlCustomerId);
        changed = true;
      }
      // Prefill product (fetch product and add as item)
      if (urlProductId && items.length === 0 && user?.id) {
        import('@/integrations/supabase/repositories/productRepository').then(async mod => {
          const allProducts = await mod.getProducts(user.id);
          const found = allProducts.find(p => p.id === urlProductId);
          if (found) {
            setItems([{
              id: crypto.randomUUID(),
              productId: found.id,
              name: found.name,
              description: found.name,
              quantity: 1,
              unitPrice: found.unitPrice,
              vatRate: found.vatRate,
              unit: found.unit,
              totalNetValue: found.unitPrice,
              totalVatValue: found.vatRate === -1 ? 0 : found.unitPrice * (found.vatRate / 100),
              totalGrossValue: found.vatRate === -1 ? found.unitPrice : found.unitPrice * (1 + found.vatRate / 100)
            }]);
          }
        });
        changed = true;
      }

      // Duplicate existing invoice
      if (duplicateId && !changed) {
        (async () => {
          try {
            const dup = await getInvoice(duplicateId);
            if (dup) {
              console.log("Prefilling duplicate invoice", dup);
              // Reset form with duplicated values but new number
              form.reset({
                ...form.getValues(),
                number: `${dup.number}-DUP`,
                issueDate: today,
                sellDate: today,
                dueDate: today,
                paymentMethod: toPaymentMethodUi(dup.paymentMethod as PaymentMethodDb),
                comments: dup.comments || "",
                transactionType: dup.transactionType,
                customerId: dup.customerId || "",
                businessProfileId: dup.businessProfileId || "",
                fakturaBezVAT: (dup as any).vat === false,
                vatExemptionReason: dup.vatExemptionReason,
                bankAccountId: dup.bankAccountId || "",
                exchangeRate: dup.exchangeRate || 1,
                exchangeRateDate: dup.exchangeRateDate || '',
                exchangeRateSource: dup.exchangeRateSource || 'NBP',
              });
              import("@/lib/invoice-utils").then(({ calculateItemValues }) => {
                setItems((dup.items || []).map(calculateItemValues));
              });
              setTransactionType(dup.transactionType as any);
              setIsDuplicate(true);
              changed = true;
            }
          } catch (err) {
            console.error("Error duplicating invoice", err);
          } finally {
            setPrefilled(true);
          }
        })();
      }

      if (changed && !duplicateId) setPrefilled(true);
    }, [urlCustomerId, urlProductId, form, items.length, user, prefilled]);

    useImperativeHandle(ref, () => ({
      handleSubmit: form.handleSubmit,
    }));

    // Handle form submission
    const onSubmit = async (formData: InvoiceFormValues) => {
      console.log('=== onSubmit started ===');
      console.log('Form data:', JSON.stringify(formData, null, 2));
      console.log('Items:', JSON.stringify(items, null, 2));

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

      // Validate required fields
      if (!formData.customerId || !formData.businessProfileId) {
        const error = 'Proszę wypełnić wszystkie wymagane pola';
        console.error(error);
        toast.error(error);
        return;
      }

      try {
        setIsLoading(true);
        
        // Convert UI payment method to database format
        const paymentMethodDb = toPaymentMethodDb(formData.paymentMethod);
        
        // Prepare the data to be saved with all required fields
        const saveData = {
          ...formData,
          // Ensure all required Invoice fields are included with proper types
          status: (formData.status || 'draft') as 'draft' | 'sent' | 'paid' | 'overdue',
          type: (formData.type || 'vat') as InvoiceType,
          number: formData.number || '',
          issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
          sellDate: formData.sellDate || formData.issueDate || new Date().toISOString().split('T')[0],
          dueDate: formData.dueDate || '',
          paymentMethod: paymentMethodDb, // Use the converted payment method
          transactionType: formData.transactionType as TransactionType,
          currency: formData.currency || 'PLN',
          exchangeRate: formData.exchangeRate || 1,
          exchangeRateDate: formData.exchangeRateDate || new Date().toISOString().split('T')[0],
          exchangeRateSource: (formData.exchangeRateSource || 'NBP') as 'NBP' | 'manual',
          vat: formData.vat !== undefined ? formData.vat : true,
          vatExemptionReason: formData.vatExemptionReason as VatExemptionReason | null,
          
          // Process items
          items: items.map(item => ({
            ...item,
            // Ensure all required item fields are present
            id: item.id || undefined, // Let the server generate new IDs if needed
            productId: item.productId || null,
            name: item.name || '',
            description: item.description || '',
            quantity: Number(item.quantity) || 0,
            unit: item.unit || 'szt',
            unitPrice: Number(item.unitPrice) || 0,
            vatRate: item.vatExempt ? 0 : (Number(item.vatRate) || 0),
            vatExempt: item.vatExempt || false,
            totalNetValue: Number(item.totalNetValue) || (Number(item.quantity) * Number(item.unitPrice)) || 0,
            totalVatValue: Number(item.totalVatValue) || 0,
            totalGrossValue: Number(item.totalGrossValue) || 0,
          })),
          
          // Calculate totals if not provided
          totalNetValue: formData.totalNetValue || items.reduce((sum, item) => sum + (Number(item.totalNetValue) || 0), 0),
          totalVatValue: formData.totalVatValue || items.reduce((sum, item) => sum + (Number(item.totalVatValue) || 0), 0),
          totalGrossValue: formData.totalGrossValue || items.reduce((sum, item) => sum + (Number(item.totalGrossValue) || 0), 0),
          
          // Ensure user ID is set
          user_id: user.id,
        };

        console.log('Saving invoice with data:', JSON.stringify(saveData, null, 2));
        
        // If onSave prop is provided, use it (for edit mode)
        if (onSave) {
          console.log('Using onSave callback');
          await onSave(saveData);
        } else {
          // Otherwise, this is a new invoice
          console.log('Creating new invoice');
          await saveInvoice(saveData);
          toast.success('Faktura została zapisana');
          // Navigate to invoices list
          navigate('/invoices');
        }
      } catch (error) {
        console.error('Error saving invoice:', error);
        toast.error(`Wystąpił błąd podczas zapisywania faktury: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
        throw error; // Re-throw to be caught by handleFormSubmit
      } finally {
        setIsLoading(false);
      }
};

const handleFormSubmit = form.handleSubmit(async (formData) => {
  try {
    setIsLoading(true);
    const formValues = form.getValues();
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
  } catch (error: any) {
    console.error('Error during form submission:', error);
    if (error?.message) {
      toast.error(`Błąd podczas zapisywania: ${error.message}`);
    } else if (typeof error === 'string') {
      toast.error(`Błąd podczas zapisywania: ${error}`);
    } else {
      toast.error('Błąd podczas zapisywania: Nieznany błąd');
    }
  } finally {
    setIsLoading(false);
  }
});

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

    const handleAddVatAccount = () => {
      setShowVatAccountDialog(true);
    };

    const handleVatAccountSaved = async (data: any) => {
      if (!form.watch('businessProfileId')) return;
      
      try {
        const newAccount = await addBankAccount({
          ...data,
          businessProfileId: form.watch('businessProfileId'),
          connectedAt: new Date().toISOString(),
        });
        setBankAccounts(prev => [...prev, newAccount]);
        setShowVatAccountDialog(false);
        toast.success('Dodano konto VAT');
      } catch (error) {
        console.error('Error adding VAT account:', error);
        toast.error('Błąd dodawania konta VAT');
      }
    };

    // --- Transaction type prompt modal ---
    const [showTransactionTypePrompt, setShowTransactionTypePrompt] = useState(() => {
      // Only skip prompt if on /income/new or /expense/new or initialData has transactionType
      return !(
        location.pathname === "/income/new" ||
        location.pathname === "/expense/new" ||
        (initialData && initialData.transactionType)
      );
    });

    if (showTransactionTypePrompt && !transactionType) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-8">
          <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full text-center border">
            <h2 className="text-xl font-bold mb-4">Jaki rodzaj faktury chcesz wystawić?</h2>
            <div className="flex flex-col gap-4">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white text-lg py-3"
                onClick={() => {
                  setTransactionType(TransactionType.INCOME);
                  setShowTransactionTypePrompt(false);
                }}
              >
                Przychód
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
                onClick={() => {
                  setTransactionType(TransactionType.EXPENSE);
                  setShowTransactionTypePrompt(false);
                }}
              >
                Wydatek
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (!documentSettingsLoaded) {
      return <div className="text-center py-8">Ładowanie ustawień...</div>;
    }

    const documentTitle = getDocumentTitle();
    const isEditing = Boolean(initialData);

    return (
      <div className="space-y-4 pb-24 md:pb-4">
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="space-y-4"
          >
            {/* Duplicate Banner */}
            {isDuplicate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                Tworzysz duplikat dokumentu
              </div>
            )}

            {/* Header */}
            {!hideHeader && (
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
            )}

            {/* Form sections - Wrapped in a flex-1, overflow-y-auto div */}
            <div className="flex-1 overflow-y-auto space-y-6">
              <InvoiceBasicInfoForm 
                form={form}
                documentTitle={documentTitle}
                businessProfileId={businessProfileId}
                exchangeRate={exchangeRate}
                exchangeRateDate={form.watch('exchangeRateDate')}
                exchangeRateSource={form.watch('exchangeRateSource')}
                onExchangeRateChange={(val) => {
                  setExchangeRate(val);
                  form.setValue('exchangeRate', val);
                  form.setValue('exchangeRateSource', 'manual');
                }}
                items={items}
                bankAccounts={bankAccounts}
                onAddVatAccount={handleAddVatAccount}
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
                  currency={form.watch('currency') || 'PLN'}
                />
              </div>

              {/* Contracts linking section (only on create) */}
              {!isEditing && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Powiąż umowę</h3>
                  {contractsToLink.map((cid) => (
                    <div key={cid} className="flex items-center gap-2 text-sm">
                      <span>{cid}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveContract(cid)}>×</Button>
                    </div>
                  ))}
                  <ContractsPicker selected={contractsToLink} onAdd={handleAddContract} />
                </div>
              )}

              {/* Summary with PLN values */}
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Wartość brutto ({form.watch('currency') || 'PLN'}):</span>
                  <span className="font-semibold">{formatCurrency(calculateInvoiceTotals(items).totalGrossValue, form.watch('currency') || 'PLN')}</span>
                </div>
                {form.watch('currency') !== 'PLN' && exchangeRate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Wartość brutto (PLN):</span>
                    <span className="font-semibold text-green-600">{formatCurrency(calculateInvoiceTotals(items).totalGrossValue * exchangeRate, 'PLN')}</span>
                  </div>
                )}
                {form.watch('currency') !== 'PLN' && (
                  <div className="text-xs text-muted-foreground">
                    Kurs: 1 {form.watch('currency')} = {exchangeRate} PLN
                  </div>
                )}
              </div>
            </div>

            {/* Przeniesiony InvoiceFormActions do wnętrza <form> */}
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
                  transactionType={transactionType}
                />
              </div>
            )}
          </form>
        </Form>

        {/* Dialog do dodawania konta VAT */}
        {showVatAccountDialog && (
          <BankAccountEditDialog
            onSave={handleVatAccountSaved}
            trigger={null}
            initial={{ type: 'vat', currency: form.watch('currency') || 'PLN' }}
          />
        )}
      </div>
    );
  }
);

export default NewInvoice;
