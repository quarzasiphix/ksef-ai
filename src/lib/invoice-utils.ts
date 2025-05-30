import { InvoiceItem, PaymentMethod } from "@/types";
import { PaymentMethodDb } from "@/types/common";
import * as z from "zod";

// Format number to Polish currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
};

// Format number with specified decimal places
export const formatNumber = (
  num: number, 
  decimalPlaces: number = 2
): string => {
  return num.toFixed(decimalPlaces);
};

export const calculateItemValues = (item: Partial<InvoiceItem> & { name?: string }): InvoiceItem => {
  // Ensure we have a description, defaulting to name if not provided
  const description = item.description || item.name || '';

  // Safely convert vatRate to number
  let vatRate: number;
  if (typeof item.vatRate === 'number') {
    vatRate = item.vatRate;
  } else if (typeof item.vatRate === 'string') {
    vatRate = item.vatRate === 'zw' ? -1 : parseFloat(item.vatRate) || 0;
  } else {
    vatRate = Number(item.vatRate) || 0;
  }
  
  // Handle VAT-exempt items (vatRate = -1)
  const isVatExempt = vatRate === -1;
  
  // For non-VAT-exempt items, ensure the rate is between 0 and 100
  if (!isVatExempt) {
    vatRate = Math.max(0, Math.min(100, Number.isFinite(vatRate) ? vatRate : 0));
  }
  
  // Defensive: Clamp quantity and unitPrice to at least 0
  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0;
  const unitPrice = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0;

  const totalNetValue = unitPrice * quantity;
  
  // Calculate VAT value based on the rate (0 for VAT-exempt items)
  let totalVatValue = isVatExempt ? 0 : totalNetValue * (vatRate / 100);
  
  // Ensure we don't have negative or invalid VAT values
  totalVatValue = Math.max(0, Number.isFinite(totalVatValue) ? totalVatValue : 0);
  
  // Calculate gross value (net + VAT, or just net for VAT-exempt items)
  // For VAT-exempt items, gross value should equal net value
  let totalGrossValue = totalNetValue + (isVatExempt ? 0 : totalVatValue);
  totalGrossValue = Math.max(0, Number.isFinite(totalGrossValue) ? totalGrossValue : 0);

  return {
    ...item,
    description, // Ensure description is always set
    vatRate: isVatExempt ? -1 : vatRate, // Preserve -1 for VAT-exempt items
    quantity,
    unitPrice,
    totalNetValue,
    totalVatValue,
    totalGrossValue,
  } as InvoiceItem;
};

// Calculate totals for all invoice items
export const calculateInvoiceTotals = (items: InvoiceItem[]) => {
  // Calculate values for each item first
  const itemsWithValues = items.map(calculateItemValues);
  
  // Calculate invoice totals
  const totalNetValue = itemsWithValues.reduce(
    (sum, item) => sum + (item.totalNetValue || 0), 
    0
  );
  
  const totalVatValue = itemsWithValues.reduce(
    (sum, item) => sum + (item.vatRate === -1 ? 0 : (item.totalVatValue || 0)), 
    0
  );
  
  const totalGrossValue = itemsWithValues.reduce(
    (sum, item) => {
      // For VAT-exempt items, gross value equals net value
      // For other items, use the calculated gross value
      const itemGrossValue = item.vatRate === -1 
        ? item.totalNetValue 
        : (item.totalGrossValue || 0);
      return sum + (Number.isFinite(itemGrossValue) ? itemGrossValue : 0);
    }, 
    0
  );

  return {
    items: itemsWithValues,
    totalNetValue,
    totalVatValue,
    totalGrossValue,
  };
};

// Generate invoice number based on date and sequence
export const generateInvoiceNumber = (
  date: Date,
  sequence: number,
  prefix: string = "FV"
): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const seq = sequence.toString().padStart(3, "0");
  
  return `${prefix}/${year}/${month}/${seq}`;
};

// Convert ISO date string to Polish format (DD.MM.YYYY)
export const formatPolishDate = (isoDateString: string): string => {
  const date = new Date(isoDateString);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Payment method mappings
const paymentMethodMappings = {
  // UI/DB values (English) to Polish display
  displayNames: {
    'transfer': 'Przelew',
    'przelew': 'Przelew',
    'cash': 'Gotówka',
    'gotówka': 'Gotówka',
    'card': 'Karta',
    'karta': 'Karta',
    'online': 'Płatność online',
    'płatność online': 'Płatność online',
    'blik': 'BLIK'
  },
  
  // UI/DB values (English) to database values
  dbValues: {
    'transfer': 'transfer',
    'przelew': 'transfer',
    'cash': 'cash',
    'gotówka': 'cash',
    'card': 'card',
    'karta': 'card',
    'online': 'online',
    'płatność online': 'online',
    'blik': 'blik'
  },
  
  // Database values to UI values
  uiValues: {
    'transfer': 'transfer',
    'cash': 'cash',
    'card': 'card',
    'online': 'online',
    'blik': 'blik'
  }
};

// Get Polish translation for payment method
export const getPolishPaymentMethod = (method: string | PaymentMethod | undefined): string => {
  if (!method) return 'Nie określono';
  
  const methodStr = typeof method === 'string' ? method.toLowerCase() : method;
  return paymentMethodMappings.displayNames[methodStr] || String(method);
};

// Convert any payment method format to UI format
export const toPaymentMethodUi = (method: string | PaymentMethod): string => {
  if (!method) return PaymentMethod.TRANSFER;
  
  const methodStr = typeof method === 'string' ? method.toLowerCase() : method;
  return paymentMethodMappings.uiValues[methodStr] || PaymentMethod.TRANSFER;
};

// Convert any payment method format to database format
export const toPaymentMethodDb = (method: string | PaymentMethod): PaymentMethodDb => {
  if (!method) return 'transfer';
  
  const methodStr = typeof method === 'string' ? method.toLowerCase() : method;
  const dbValue = paymentMethodMappings.dbValues[methodStr] || 'transfer';
  
  // Ensure we return a valid PaymentMethodDb value
  return (['transfer', 'cash', 'card', 'other'].includes(dbValue) 
    ? dbValue 
    : 'transfer') as PaymentMethodDb;
};

export const invoiceItemSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  name: z.string().min(1, "Nazwa produktu jest wymagana"),
  quantity: z.number().min(1, "Ilość musi być większa od 0"),
  unitPrice: z.number().min(0, "Cena netto musi być większa lub równa 0"),
  vatRate: z.number().refine(val => val === -1 || (val >= 0 && val <= 100), {
    message: "Stawka VAT musi być liczbą od 0 do 100 lub -1 dla zwolnionych",
  }),
  unit: z.string().min(1, "Jednostka jest wymagana"),
  totalNetValue: z.number().optional(),
  totalGrossValue: z.number().optional(),
  totalVatValue: z.number().optional(),
});
