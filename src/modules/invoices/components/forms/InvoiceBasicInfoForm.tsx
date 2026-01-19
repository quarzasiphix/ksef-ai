import React, { useState, useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { CardHeader, CardTitle, CardContent, Card } from "@/shared/ui/card";
import { UseFormReturn } from "react-hook-form";
import { PaymentMethod, VatExemptionReason } from "@/shared/types";
import { Checkbox } from "@/shared/ui/checkbox";
import { BankAccountSelector } from "@/modules/invoices/components/selectors/BankAccountSelector";
import { CashAccountSelector } from "@/modules/invoices/components/selectors/CashAccountSelector";
import { AlertCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { Button } from "@/shared/ui/button";
import { BankAccount } from "@/modules/banking/bank";
import { InvoiceItem } from "@/shared/types";
import type { CashAccount } from "@/modules/accounting/kasa";
import { cn } from "@/shared/lib/utils";
import { listRyczaltRevenueCategories, type RyczaltRevenueCategory } from "@/modules/accounting/data/ryczaltCategoriesRepository";
import { TransactionType } from "@/shared/types/common";

interface InvoiceBasicInfoFormProps {
  form: UseFormReturn<any, any>;
  documentTitle: string;
  businessProfileId?: string;
  exchangeRate?: number;
  exchangeRateDate?: string;
  exchangeRateSource?: 'NBP' | 'manual';
  onExchangeRateChange?: (rate: number) => void;
  items?: InvoiceItem[];
  bankAccounts?: BankAccount[];
  cashAccounts?: CashAccount[];
  isSpoolka?: boolean;
  onAddVatAccount?: () => void;
  onNumberChange?: (value: string) => void;
  transactionType?: TransactionType;
  profileTaxType?: string;
  profileEntityType?: string;
}

export const InvoiceBasicInfoForm: React.FC<InvoiceBasicInfoFormProps> = ({
  form,
  documentTitle,
  businessProfileId,
  exchangeRate,
  exchangeRateDate,
  exchangeRateSource,
  onExchangeRateChange,
  items = [],
  bankAccounts = [],
  cashAccounts = [],
  isSpoolka = false,
  onAddVatAccount,
  onNumberChange,
  transactionType,
  profileTaxType,
  profileEntityType
}) => {
  const currency = form.watch('currency') || 'PLN';
  const paymentMethod = form.watch('paymentMethod');
  const [ryczaltCategories, setRyczaltCategories] = useState<RyczaltRevenueCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Determine if ryczałt category is required
  const isJdgRyczaltIncome = 
    profileEntityType === 'dzialalnosc' && 
    profileTaxType === 'ryczalt' && 
    transactionType === TransactionType.INCOME;

  // Fetch ryczałt categories when needed
  useEffect(() => {
    async function fetchCategories() {
      if (!isJdgRyczaltIncome || !businessProfileId) return;
      
      setIsLoadingCategories(true);
      try {
        const categories = await listRyczaltRevenueCategories(businessProfileId);
        setRyczaltCategories(categories);
      } catch (error) {
        console.error('Failed to load ryczałt categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    
    fetchCategories();
  }, [isJdgRyczaltIncome, businessProfileId]);

  return (
    <Card className="md:col-span-1">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">{documentTitle} - dane podstawowe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numer dokumentu</FormLabel>
              <FormControl>
                <Input
                  placeholder="np. FV/2023/05/001"
                  {...field}
                  onChange={(event) => {
                    field.onChange(event);
                    onNumberChange?.(event.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data wystawienia</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data sprzedaży</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Termin płatności</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metoda płatności</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz metodę płatności" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(PaymentMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("paymentMethod") === PaymentMethod.TRANSFER && (
          <FormField
            control={form.control}
            name="bankAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Konto bankowe</FormLabel>
                <BankAccountSelector
                  businessProfileId={businessProfileId || ''}
                  value={field.value}
                  onChange={field.onChange}
                  currency={currency}
                  onAddVatAccount={onAddVatAccount}
                  showVatRecommendation={true}
                />
                <FormMessage />
                {bankAccounts && bankAccounts.length === 0 && (
                  <div className="mt-3 p-3 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-100">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div className="space-y-2">
                        <div>
                          Nie masz jeszcze podłączonego konta bankowego. Metoda płatności została automatycznie ustawiona na <span className="font-semibold">gotówkę</span>.
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={onAddVatAccount}
                        >
                          Dodaj konto bankowe
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />
        )}

        {paymentMethod === PaymentMethod.CASH && isSpoolka && (
          <FormField
            control={form.control}
            name="cashAccountId"
            rules={{ required: 'Kasa fiskalna jest wymagana dla płatności gotówką' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  className={cn(
                    "transition-colors",
                    field.value ? "text-white" : "text-red-600"
                  )}
                >
                  {field.value ? "Kasa fiskalna" : "Kasa fiskalna *"}
                </FormLabel>
                <CashAccountSelector
                  value={field.value}
                  onChange={field.onChange}
                  cashAccounts={cashAccounts}
                />
                <FormMessage />
                {!field.value && (
                  <p className="text-sm text-red-600 mt-1">
                    Musisz wybrać kasę fiskalną dla płatności gotówką
                  </p>
                )}
                {cashAccounts && cashAccounts.length === 0 && (
                  <div className="mt-3 p-3 border border-red-200 bg-red-50 rounded-lg text-sm text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <strong>Brak aktywnych kas!</strong> Nie możesz utworzyć faktury gotówkowej bez kasy. Przejdź do sekcji Księgowość → Kasa, aby utworzyć kasę.
                      </div>
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Waluta</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'PLN'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz walutę" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PLN">PLN</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Exchange Rate Field */}
        {currency !== 'PLN' && (
          <FormField
            control={form.control}
            name="exchangeRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kurs wymiany (1 {currency} = ? PLN)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 align-middle cursor-pointer"><Info size={14} /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {exchangeRateSource === 'NBP'
                          ? 'Kurs automatycznie pobrany z NBP na dzień poprzedzający datę wystawienia.'
                          : 'Kurs wpisany ręcznie przez użytkownika.'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="np. 4.25"
                    value={exchangeRate || field.value || 1}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      field.onChange(value);
                      onExchangeRateChange?.(value);
                    }}
                  />
                </FormControl>
                {exchangeRateDate && (
                  <div className="text-xs text-muted-foreground mt-1">Kurs z dnia: {exchangeRateDate}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Źródło: {exchangeRateSource === 'NBP' ? 'NBP' : 'ręcznie wpisany'}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Uwagi</FormLabel>
              <FormControl>
                <Input placeholder="Opcjonalne uwagi do dokumentu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fakturaBezVAT"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Faktura bez VAT</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("fakturaBezVAT") && (
          <FormField
            control={form.control}
            name="vatExemptionReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Powód zwolnienia z VAT</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz powód zwolnienia" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(VatExemptionReason).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {key.replace(/_/g, ' ').toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Ryczałt Category Selection - Only for JDG + ryczałt + income */}
        {isJdgRyczaltIncome && (
          <FormField
            control={form.control}
            name="ryczalt_category_id"
            rules={{ required: 'W ryczałcie musisz wybrać kategorię przychodu' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Kategoria ryczałtu *
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-pointer"><Info size={14} /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Stawka zależy od rodzaju przychodu (usługi/produktu), nie od firmy.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                {isLoadingCategories ? (
                  <div className="text-sm text-muted-foreground">Ładowanie kategorii...</div>
                ) : ryczaltCategories.length === 0 ? (
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                      <div className="space-y-2">
                        <p className="text-sm text-amber-800 dark:text-amber-100">
                          Nie masz jeszcze żadnych kategorii ryczałtu. Musisz dodać przynajmniej jedną kategorię, aby wystawić fakturę przychodową.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: Open manage categories modal/page
                            alert('Funkcja zarządzania kategoriami ryczałtu w przygotowaniu');
                          }}
                        >
                          Dodaj kategorię ryczałtu
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn(!field.value && "border-red-500")}>
                          <SelectValue placeholder="Wybierz kategorię przychodu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ryczaltCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name} ({category.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Stawka jest przypisana do rodzaju przychodu, nie do firmy.
                    </p>
                  </>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
};