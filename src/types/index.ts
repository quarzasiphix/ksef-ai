
export interface BusinessProfile {
  id: string;
  name: string;
  taxId: string; // NIP
  address: string;
  postalCode: string;
  city: string;
  regon?: string;
  bankAccount?: string;
  email?: string;
  phone?: string;
  logo?: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  taxId?: string; // NIP
  address: string;
  postalCode: string;
  city: string;
  email?: string;
  phone?: string;
}

export interface Product {
  id: string;
  name: string;
  unitPrice: number; // Netto price
  vatRate: number; // VAT percentage, e.g., 23
  unit: string; // e.g., "szt.", "godz.", etc.
}

export enum InvoiceType {
  SALES = "sales", // Faktura sprzedaży
  RECEIPT = "receipt", // Rachunek
  PROFORMA = "proforma", // Faktura proforma
  CORRECTION = "correction", // Faktura korygująca
}

export enum PaymentMethod {
  TRANSFER = "transfer",
  CASH = "cash",
  CARD = "card",
  OTHER = "other",
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number; // Netto price
  vatRate: number;
  unit: string;
  totalNetValue?: number; // Calculated: unitPrice * quantity
  totalGrossValue?: number; // Calculated: totalNetValue + VAT
  totalVatValue?: number; // Calculated: totalNetValue * (vatRate/100)
}

export interface Invoice {
  id: string;
  number: string;
  type: InvoiceType;
  issueDate: string; // ISO date string
  dueDate: string; // ISO date string
  sellDate: string; // ISO date string
  businessProfileId: string;
  customerId: string;
  items: InvoiceItem[];
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  comments?: string;
  totalNetValue?: number; // Sum of items' totalNetValue
  totalGrossValue?: number; // Sum of items' totalGrossValue
  totalVatValue?: number; // Sum of items' totalVatValue
  ksef?: {
    status: 'pending' | 'sent' | 'error' | 'none';
    referenceNumber?: string;
  };
  // Additional display properties not stored in the database
  businessName?: string;
  customerName?: string;
}

// For Analytics Panel
export interface MonthlyInvoiceSummary {
  month: string; // e.g., "2023-01"
  count: number;
  totalNetValue: number;
  totalGrossValue: number;
  totalVatValue: number;
}
