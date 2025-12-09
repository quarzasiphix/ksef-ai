// React & Dependencies
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useGlobalData } from "@/hooks/use-global-data";
import { useQueryClient } from "@tanstack/react-query";

// Types
import { 
  Invoice, 
  InvoiceItem, 
  VatType, 
  VatExemptionReason, 
  Company, 
  PaymentMethod,
  PaymentMethodDb,
  InvoiceType 
} from "@/types";
import { TransactionType } from "@/types/common";
import { BankAccount } from "@/types/bank";

// Date & Formatting
import { format } from "date-fns";
import { pl } from "date-fns/locale";

// Form Handling
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Utils & Helpers
import { 
  calculateInvoiceTotals,
  generateInvoiceNumber,
  toPaymentMethodUi,
  toPaymentMethodDb,
  getNbpExchangeRate,
  formatCurrency,
  getDocumentTitle
} from "@/lib/invoice-utils";
import { cn } from "@/lib/utils";

// Supabase Repositories
import { getInvoiceNumberingSettings } from "@/integrations/supabase/repositories/invoiceNumberingSettingsRepository";
const invoiceRepository = { save: saveInvoice, get: getInvoice };
import { saveInvoice, getInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { saveExpense } from "@/integrations/supabase/repositories/expenseRepository";
import { addLink as addContractLink } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import { getBankAccountsForProfile, addBankAccount } from "@/integrations/supabase/repositories/bankAccountRepository";

// UI Components
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { InvoiceFormHeader } from "@/components/invoices/forms/InvoiceFormHeader";
import { InvoiceBasicInfoForm } from "@/components/invoices/forms/InvoiceBasicInfoForm";
import { InvoicePartiesForm } from "@/components/invoices/forms/InvoicePartiesForm";
import { InvoiceItemsForm } from "@/components/invoices/forms/InvoiceItemsForm";
import { InvoiceFormActions } from "@/components/invoices/forms/InvoiceFormActions";
import ContractsPicker from "@/components/contracts/ContractsPicker";
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
  // Removed duplicate items property that was causing TypeScript error
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
    const { profiles } = useBusinessProfile();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof invoiceFormSchema>>({
      resolver: zodResolver(invoiceFormSchema),
      defaultValues: {
        number: '',
        issueDate: new Date().toISOString().split('T')[0],
        sellDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
        paymentMethod: 'przelew' as unknown as PaymentMethod,
        status: 'draft',
        type: type === TransactionType.INCOME ? InvoiceType.SALES : InvoiceType.RECEIPT,
        customerId: '',
        businessProfileId: '',
        items: initialData?.items || [],
        comments: '',
        vat: initialData ? !initialData.fakturaBezVAT : true, // Set based on fakturaBezVAT from initialData
        vatExemptionReason: initialData?.vatExemptionReason || null,
        currency: 'PLN',
        exchangeRate: 1,
        exchangeRateDate: new Date().toISOString().split('T')[0],
        exchangeRateSource: 'NBP',
        isPaid: false,
        fakturaBezVAT: initialData?.fakturaBezVAT || false,
        ...(initialData ? {
          ...initialData,
          paymentMethod: toPaymentMethodUi(initialData.paymentMethod as PaymentMethodDb),
          issueDate: initialData.issueDate ? new Date(initialData.issueDate).toISOString().split('T')[0] : '',
          sellDate: initialData.sellDate ? new Date(initialData.sellDate).toISOString().split('T')[0] : '',
          dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
          vat: !initialData.fakturaBezVAT, // Ensure vat is set based on fakturaBezVAT
        } : {}),
      },
    });

    // Watch for fakturaBezVAT changes and update vat field accordingly
    const fakturaBezVAT = form.watch('fakturaBezVAT');
    useEffect(() => {
      // When fakturaBezVAT is true, vat should be false, and vice versa
      form.setValue('vat', !fakturaBezVAT, { shouldValidate: true });
      
      // Set default VAT exemption reason if fakturaBezVAT is true
      if (fakturaBezVAT) {
        form.setValue('vatExemptionReason', VatExemptionReason.ART_113_UST_1, { shouldValidate: true });
      } else {
        form.setValue('vatExemptionReason', null, { shouldValidate: true });
      }
      
      console.log('fakturaBezVAT changed:', fakturaBezVAT, 'VAT set to:', !fakturaBezVAT);
    }, [fakturaBezVAT, form]);

    const businessProfileId = form.watch("businessProfileId");
    
    // Helpers to determine if current path is for income or expense invoice creation/edit
    const isIncomeRoute = location.pathname === "/income/new" || location.pathname.startsWith("/income/edit/");
    const isExpenseRoute = location.pathname === "/expense/new" || location.pathname.startsWith("/expense/edit/");
    
    // Get selected profile to check VAT exemption status
    const selectedProfile = profiles.find(p => p.id === businessProfileId);
    const isProfileVatExempt = selectedProfile?.is_vat_exempt || false;

    // Auto-lock VAT settings when profile is VAT exempt (income invoices only)
    useEffect(() => {
      if (isIncomeRoute && isProfileVatExempt && businessProfileId) {
        form.setValue('fakturaBezVAT', true, { shouldValidate: true });
        form.setValue('vat', false, { shouldValidate: true });
        form.setValue('vatExemptionReason', selectedProfile?.vat_exemption_reason as VatExemptionReason || VatExemptionReason.ART_113_UST_1, { shouldValidate: true });
      }
    }, [businessProfileId, isProfileVatExempt, isIncomeRoute, form, selectedProfile]);
    const hideTransactionButtons = isIncomeRoute || isExpenseRoute || location.pathname === "/invoices/new";

    // --- NEW: Prefill customer/product logic ---
    const urlCustomerId = searchParams.get("customerId") || "";
    const urlProductId = searchParams.get("productId") || "";
    const duplicateId = searchParams.get("duplicateId") || "";
    const [prefilled, setPrefilled] = useState(false);
    const [isDuplicate, setIsDuplicate] = useState(false);

    // --- INVOICE NUMBERING SYSTEM ---
    const { invoices: { data: allInvoices = [] } = {} } = (typeof useGlobalData === 'function' ? useGlobalData() : { invoices: { data: [] } });
    const [invoiceNumber, setInvoiceNumber] = useState(initialData?.number || '');
    const [hasManualNumber, setHasManualNumber] = useState(Boolean(initialData?.number));
    
    // Current date for invoice numbering
    const now = new Date();
    
    // Helper to reload invoice numbering settings and update invoice number
    const reloadInvoiceNumberingSettings = useCallback(async (userId: string | undefined, profileId: string | undefined, allInvoicesList: any[], initialInvoiceData?: any) => {
      if (!form) return;

      if (hasManualNumber) {
        if (invoiceNumber) {
          form.setValue('number', invoiceNumber);
        }
        return;
      }

      // If we have an existing invoice number, use it and don't generate a new one
      if (initialInvoiceData?.number) {
        setInvoiceNumber(initialInvoiceData.number);
        form.setValue('number', initialInvoiceData.number);
        return;
      }
      
      // Default values
      let prefix = 'FV';
      let pattern: 'incremental' | 'yearly' | 'monthly' = 'monthly';
      
      try {
        // First try to get from Supabase if we have a user and business profile
        if (userId && profileId) {
          try {
            const settings = await getInvoiceNumberingSettings(userId, profileId);
            if (settings) {
              prefix = settings.prefix || 'FV';
              pattern = (settings.pattern as 'incremental' | 'yearly' | 'monthly') || 'monthly';
              // Cache in localStorage as fallback
              localStorage.setItem('invoiceNumberingSettings', JSON.stringify({ prefix, pattern }));
            }
          } catch (error) {
            console.error('Error loading invoice settings from Supabase:', error);
            // Fall through to localStorage on error
          }
        }
        
        // If no settings from Supabase, try localStorage
        if (prefix === 'FV' && pattern === 'monthly') {
          const saved = localStorage.getItem('invoiceNumberingSettings');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.prefix) prefix = parsed.prefix;
              if (parsed.pattern) pattern = parsed.pattern as 'incremental' | 'yearly' | 'monthly';
            } catch (e) {
              console.error('Error parsing saved invoice settings:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error in invoice settings handling:', error);
      }
      
      // Use current date for generating the invoice number
      const now = new Date();
      
      // Filter invoices by business profile if we have a business profile ID
      const filteredInvoices = businessProfileId 
        ? allInvoices.filter(inv => inv.businessProfileId === businessProfileId)
        : allInvoices;
      
      // Find the highest sequence number in existing invoices that match our pattern
      let maxSeq = 0;
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      filteredInvoices.forEach(inv => {
        if (!inv.number) return;
        
        // Create a regex pattern based on the current settings to match existing invoice numbers
        let patternRegex: RegExp;
        
        switch (pattern) {
          case 'incremental':
            patternRegex = new RegExp(`^${prefix}/(\\d+)$`);
            break;
          case 'yearly':
            patternRegex = new RegExp(`^${prefix}/${currentYear}/(\\d+)$`);
            break;
          case 'monthly':
          default:
            patternRegex = new RegExp(`^${prefix}/${currentYear}/${currentMonth.toString().padStart(2, '0')}/(\\d+)$`);
        }
        
        const match = inv.number.match(patternRegex);
        if (match && match[1]) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      });
      
      // The next sequence number is the max found + 1, or 1 if no invoices exist
      const nextSeq = maxSeq + 1;
      
      // Generate the new invoice number
      const nextNumber = generateInvoiceNumber(
        now, 
        nextSeq, 
        prefix, 
        pattern
      );
      
      // Update the state and form field
      setInvoiceNumber(nextNumber);
      form.setValue('number', nextNumber);
    }, [form, now, allInvoices, businessProfileId, initialData?.number, hasManualNumber, invoiceNumber]);

    // Initialize invoice numbering when component mounts or dependencies change
    useEffect(() => {
      if (user?.id && businessProfileId) {
        reloadInvoiceNumberingSettings(user.id, businessProfileId, allInvoices, initialData);
      }
    }, [user?.id, businessProfileId, allInvoices, initialData, reloadInvoiceNumberingSettings]);

    // Listen for settings update event and reload invoice number
    useEffect(() => {
      const handler = () => reloadInvoiceNumberingSettings();
      window.addEventListener('invoiceNumberingSettingsUpdated', handler);
      return () => window.removeEventListener('invoiceNumberingSettingsUpdated', handler);
    }, [allInvoices, businessProfileId, initialData?.number]);


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
    const customerId = form.watch("customerId");
    const bankAccountId = form.watch('bankAccountId');

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
              const duplicateNumber = `${dup.number}-DUP`;
              form.reset({
                ...form.getValues(),
                number: duplicateNumber,
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
              setInvoiceNumber(duplicateNumber);
              setHasManualNumber(true);
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
    const onSubmit = async (formValues: InvoiceFormValues) => {
      console.log('=== onSubmit started ===');
      console.log('Form data:', JSON.stringify(formValues, null, 2));
      console.log('Items:', JSON.stringify(items, null, 2));

      if (!user) {
        const error = "Nie jesteś zalogowany";
        console.error(error);
        toast.error(error);
        return;
      }

      if (items.length === 0) {
        toast.error('Dodaj co najmniej jedną pozycję do faktury');
        return;
      }

      // Validate required fields
      if (!formValues.customerId || !formValues.businessProfileId) {
        const error = 'Proszę wypełnić wszystkie wymagane pola';
        console.error(error);
        toast.error(error);
        return;
      }

      try {
        setIsLoading(true);

        const effectiveTransactionType: TransactionType =
          (formValues.transactionType as TransactionType | undefined) ??
          transactionType ??
          type;

        // Process items for VAT exemption if needed
        const processedItems = items.map(item => ({
          ...item,
          vatRate: formValues.fakturaBezVAT ? -1 : item.vatRate,
          totalVatValue: formValues.fakturaBezVAT ? 0 : item.totalVatValue,
          totalGrossValue: formValues.fakturaBezVAT ? item.totalNetValue : item.totalGrossValue,
          vatExempt: formValues.fakturaBezVAT
        }));

        // Calculate totals
        const totals = calculateInvoiceTotals(processedItems);

        // Prepare invoice data - using camelCase to match the expected type
        const invoiceData = {
          // Basic info
          number: formValues.number,
          issueDate: formValues.issueDate,
          dueDate: formValues.dueDate,
          sellDate: formValues.sellDate,
          paymentMethod: toPaymentMethodDb(formValues.paymentMethod as PaymentMethod),
          
          // Status and type
          status: 'draft' as const,
          type: formValues.type as InvoiceType,
          transactionType: effectiveTransactionType,
          
          // VAT settings
          vat: !formValues.fakturaBezVAT,
          vatExemptionReason: formValues.fakturaBezVAT ? (formValues.vatExemptionReason || VatExemptionReason.ART_113_UST_1) : null,
          
          // Currency and exchange rates
          currency: formValues.currency || 'PLN',
          exchangeRate: formValues.exchangeRate || 1,
          exchangeRateDate: formValues.exchangeRateDate || formValues.issueDate,
          exchangeRateSource: formValues.exchangeRateSource || 'NBP',
          
          // Payment info
          isPaid: false,
          paymentStatus: 'unpaid',
          
          // References - include both camelCase and snake_case for compatibility
          businessProfileId: formValues.businessProfileId,
          customerId: formValues.customerId,
          userId: user.id,
          user_id: user.id,
          
          // Items and totals
          items: processedItems.map(item => ({
            ...item,
            // Ensure all required item fields are present
            id: item.id || undefined,
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
          totalNetValue: totals.totalNetValue,
          totalVatValue: totals.totalVatValue,
          totalGrossValue: totals.totalGrossValue,
          
          // Additional fields with defaults
          comments: formValues.comments || '',
          notes: formValues.comments || '',
          isArchived: false,
          isDeleted: false,
          fakturaBezVat: !!formValues.fakturaBezVAT
        };

        console.log('Saving invoice with data:', invoiceData);

        let savedInvoice: Invoice | undefined;

        // Call the onSave prop if provided
        if (onSave) {
          await onSave(invoiceData as any);
        } else {
          // Default save behavior if no onSave prop provided
          if (initialData) {
            // Update existing invoice
            savedInvoice = await saveInvoice({ ...invoiceData, id: initialData.id });
            toast.success('Faktura została zaktualizowana');
            
            // Invalidate queries to refresh the data
            await queryClient.invalidateQueries({ queryKey: ["invoices"] });
            await queryClient.invalidateQueries({ queryKey: ["invoice", initialData.id] });
          } else {
            // Create new invoice
            savedInvoice = await saveInvoice(invoiceData);
            toast.success('Faktura została utworzona');
            
            // Invalidate queries to refresh the data
            await queryClient.invalidateQueries({ queryKey: ["invoices"] });
            
            // If we have the saved invoice, also set it in the cache for immediate access
            if (savedInvoice?.id) {
              queryClient.setQueryData(["invoice", savedInvoice.id], savedInvoice);
            }
          }

          if (!initialData) {
            const redirectInvoice = savedInvoice;
            const redirectType = redirectInvoice?.transactionType || effectiveTransactionType;
            const basePath = redirectType === TransactionType.EXPENSE ? '/expense' : '/income';

            if (redirectInvoice?.id) {
              navigate(`${basePath}/${redirectInvoice.id}`);
            } else {
              navigate(basePath);
            }
          } else if (savedInvoice?.transactionType) {
            const basePath = savedInvoice.transactionType === TransactionType.EXPENSE ? '/expense' : '/income';
            navigate(basePath);
          } else {
            navigate('/income');
          }
        }
      } catch (error) {
        console.error('Error saving invoice:', error);
        toast.error(`Wystąpił błąd podczas zapisywania faktury: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
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
                onNumberChange={(value) => {
                  setInvoiceNumber(value);
                  setHasManualNumber(value.trim().length > 0);
                }}
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
                  onSubmit={() => { void handleFormSubmit(); }}
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
