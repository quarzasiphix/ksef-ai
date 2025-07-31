import { Invoice, InvoiceItem, InvoiceType, PaymentMethod, PaymentMethodDb, VatExemptionReason } from "@/types";
import { TransactionType } from "@/types/common";
import { BankAccount } from "@/types/bank";
import * as z from "zod";

// Get document title based on invoice type
export const getDocumentTitle = (type?: InvoiceType): string => {
  switch (type) {
    case InvoiceType.SALES:
      return 'Faktura';
    case InvoiceType.PROFORMA:
      return 'Faktura Pro Forma';
    case InvoiceType.RECEIPT:
      return 'Rachunek';
    case InvoiceType.CORRECTION:
      return 'Faktura korygująca';
    default:
      return 'Dokument';
  }
};

// Format number to currency (dynamic)
export const formatCurrency = (amount: number, currency: string = 'PLN'): string => {
  return new Intl.NumberFormat(currency === 'PLN' ? 'pl-PL' : 'en-US', {
    style: 'currency',
    currency,
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

  // Create a new object with all original properties and update only the calculated fields
  const updatedItem: InvoiceItem = {
    ...item,
    // Ensure we have required fields with defaults
    id: item.id || '',
    name: item.name || '',
    description, // Use the processed description
    quantity,
    unitPrice,
    vatRate: isVatExempt ? -1 : vatRate, // Preserve -1 for VAT-exempt items
    unit: item.unit || 'szt.',
    totalNetValue,
    totalVatValue,
    totalGrossValue,
    // Preserve optional fields
    productId: item.productId,
    vatExempt: item.vatExempt
  };
  
  return updatedItem;
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
  
  // Brutto = Netto + VAT (proste dodawanie)
  const totalGrossValue = totalNetValue + totalVatValue;

  return {
    items: itemsWithValues,
    totalNetValue,
    totalVatValue,
    totalGrossValue,
  };
};

// Generate invoice number based on pattern, date, and sequence
export const generateInvoiceNumber = (
  date: Date,
  sequence: number,
  prefix: string = "FV",
  pattern: 'incremental' | 'yearly' | 'monthly' = 'monthly'
): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const seq = sequence.toString().padStart(3, "0");
  
  switch (pattern) {
    case 'incremental':
      return `${prefix}/${seq}`;
    case 'yearly':
      return `${prefix}/${year}/${seq}`;
    case 'monthly':
    default:
      return `${prefix}/${year}/${month}/${seq}`;
  }
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
    'transfer': 'przelew',
    'cash': 'gotówka',
    'card': 'karta',
    'online': 'płatność online',
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
  if (!method) return PaymentMethodDb.TRANSFER;
  
  const methodStr = typeof method === 'string' ? method.toLowerCase() : method;
  const dbValue = paymentMethodMappings.dbValues[methodStr] || 'transfer';
  
  // Ensure we return a valid PaymentMethodDb value
  if (['transfer', 'cash', 'card', 'other'].includes(dbValue)) {
    return dbValue as PaymentMethodDb;
  }
  return PaymentMethodDb.TRANSFER;
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

// Pobierz kurs NBP dla danej waluty i daty (YYYY-MM-DD)
export async function getNbpExchangeRate(currency: string, date: string): Promise<{ rate: number, rateDate: string }> {
  if (currency === 'PLN') return { rate: 1, rateDate: date };
  let tryDate = new Date(date);
  for (let i = 0; i < 7; i++) {
    const tryDateStr = tryDate.toISOString().split('T')[0];
    const url = `https://api.nbp.pl/api/exchangerates/rates/A/${currency}/${tryDateStr}/?format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return { rate: data.rates[0].mid, rateDate: data.rates[0].effectiveDate };
    }
    // cofnij o jeden dzień
    tryDate.setDate(tryDate.getDate() - 1);
  }
  throw new Error('Brak kursu NBP w ostatnich dniach');
}

export function getInvoiceValueInPLN(invoice: Invoice): number {
  if (invoice.currency === 'PLN' || !invoice.exchangeRate) {
    return invoice.totalGrossValue;
  }
  
  return invoice.totalGrossValue * invoice.exchangeRate;
}

export interface PaymentSplit {
  mainAccount: {
    amount: number;
    accountNumber: string;
    accountName?: string;
  };
  vatAccount?: {
    amount: number;
    accountNumber: string;
    accountName?: string;
  };
  totalAmount: number;
  hasVatAccount: boolean;
}

/**
 * Oblicza podział płatności na konto główne i VAT
 */
export function calculatePaymentSplit(
  invoice: Invoice,
  bankAccounts: BankAccount[],
  selectedBankAccountId?: string
): PaymentSplit {
  const totals = calculateInvoiceTotals(invoice.items || []);
  const totalAmount = totals.totalGrossValue;
  const vatAmount = totals.totalVatValue;
  const netAmount = totals.totalNetValue;

  // Znajdź wybrane konto bankowe (tylko główne konta)
  const selectedAccount = selectedBankAccountId 
    ? bankAccounts.find(acc => acc.id === selectedBankAccountId && acc.type !== 'vat')
    : bankAccounts.find(acc => acc.type === 'main');

  // Znajdź konto VAT
  const vatAccount = bankAccounts.find(acc => acc.type === 'vat');

  if (!selectedAccount) {
    // Brak konta - wszystko na domyślne
    return {
      mainAccount: {
        amount: totalAmount,
        accountNumber: 'Brak konta',
        accountName: 'Brak konta'
      },
      totalAmount,
      hasVatAccount: false
    };
  }

  // Automatyczny podział: jeśli VAT > 0 i ma konto VAT, dziel płatność
  if (vatAccount && vatAmount > 0) {
    return {
      mainAccount: {
        amount: netAmount,
        accountNumber: selectedAccount.accountNumber,
        accountName: selectedAccount.accountName || selectedAccount.bankName
      },
      vatAccount: {
        amount: vatAmount,
        accountNumber: vatAccount.accountNumber,
        accountName: vatAccount.accountName || vatAccount.bankName
      },
      totalAmount,
      hasVatAccount: true
    };
  }

  // Wszystko na główne konto
  return {
    mainAccount: {
      amount: totalAmount,
      accountNumber: selectedAccount.accountNumber,
      accountName: selectedAccount.accountName || selectedAccount.bankName
    },
    totalAmount,
    hasVatAccount: false
  };
}
