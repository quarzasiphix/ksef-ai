
import { InvoiceItem } from "@/types";

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

// Calculate net, VAT, and gross values for an invoice item
export const calculateItemValues = (item: InvoiceItem): InvoiceItem => {
  // Defensive: Clamp VAT rate to 0 if negative or NaN
  let vatRate = isNaN(item.vatRate) || item.vatRate < 0 ? 0 : item.vatRate;
  const totalNetValue = item.unitPrice * item.quantity;
  let totalVatValue = totalNetValue * (vatRate / 100);
  // Defensive: Prevent negative VAT value
  if (totalVatValue < 0) totalVatValue = 0;
  const totalGrossValue = totalNetValue + totalVatValue;

  return {
    ...item,
    vatRate, // Ensure the corrected VAT rate is used
    totalNetValue,
    totalVatValue,
    totalGrossValue,
  };
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
    (sum, item) => sum + (item.totalVatValue || 0), 
    0
  );
  
  const totalGrossValue = itemsWithValues.reduce(
    (sum, item) => sum + (item.totalGrossValue || 0), 
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
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  
  return `${day}.${month}.${year}`;
};
