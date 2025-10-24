import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardHeader, CardTitle, CardContent, Card } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import { PaymentMethod, VatExemptionReason } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { BankAccountSelector } from "@/components/invoices/selectors/BankAccountSelector";
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BankAccount } from "@/types/bank";
import { InvoiceItem } from "@/types";

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
  onAddVatAccount?: () => void;
  onNumberChange?: (value: string) => void;
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
  onAddVatAccount,
  onNumberChange
}) => {
    const currency = form.watch('currency') || 'PLN';
  
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

      </CardContent>
    </Card>
  );
};