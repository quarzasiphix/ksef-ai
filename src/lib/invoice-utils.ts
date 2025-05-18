
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
  // Clamp VAT rate to [0, 100] and ensure it's a number
  let vatRate = Number.isFinite(item.vatRate) ? Math.max(0, Math.min(100, item.vatRate)) : 0;
  // Defensive: Clamp quantity and unitPrice to at least 0
  let quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0;
  let unitPrice = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0;

  const totalNetValue = unitPrice * quantity;
  let totalVatValue = totalNetValue * (vatRate / 100);

  // Defensive: Prevent negative or NaN VAT value
  if (!Number.isFinite(totalVatValue) || totalVatValue < 0) totalVatValue = 0;
  let totalGrossValue = totalNetValue + totalVatValue;
  if (!Number.isFinite(totalGrossValue) || totalGrossValue < 0) totalGrossValue = 0;

  return {
    ...item,
    vatRate, // Ensure the corrected VAT rate is used
    quantity,
    unitPrice,
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
