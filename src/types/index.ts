export interface BusinessProfile {
  id: string;
  user_id?: string; // Added for RLS, making optional for compatibility
  name: string;
  taxId: string; // NIP
  address: string;
  postalCode: string;
  city: string;
  country?: string; // Added optional country property
  regon?: string;
  bankAccount?: string;
  email?: string;
  phone?: string;
  logo?: string;
  isDefault?: boolean;
  tax_type?: "skala" | "liniowy" | "ryczalt" | null;
  monthlySocialSecurity?: number; // Monthly social security contribution amount
  monthlyHealthInsurance?: number; // Monthly health insurance contribution amount
  accountant_email?: string; // Email for accountant
}

export interface Customer {
  id: string;
  name: string;
  taxId?: string; // NIP
  address: string;
  postalCode: string;
  city: string;
  country?: string; // Added optional country property
  email?: string;
  phone?: string;
  user_id: string; // Added for RLS
  customerType: 'odbiorca' | 'sprzedawca' | 'both';
  linkedBusinessProfile?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    user_id: string;
  } | null;
}

export interface Product {
  id: string;
  user_id: string; // Added for RLS
  name: string;
  unitPrice: number; // Netto price
  vatRate: number; // VAT percentage, e.g., 23 or -1 for VAT-exempt
  unit: string; // e.g., "szt.", "godz.", etc.
  description?: string; // Added optional description
  product_type: 'income' | 'expense';
  track_stock: boolean;
  stock: number;
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum InvoiceType {
  SALES = "sales", // Faktura sprzedaży
  RECEIPT = "receipt", // Rachunek
  PROFORMA = "proforma", // Faktura proforma
  CORRECTION = "correction", // Faktura korygująca
}

// For database storage
export enum PaymentMethodDb {
  TRANSFER = 'transfer',
  CASH = 'cash',
  CARD = 'card',
  OTHER = 'other',
}

// For UI display
export enum PaymentMethod {
  TRANSFER = "przelew",
  CASH = "gotówka",
  CARD = "karta",
  OTHER = "inny",
}

// Convert UI payment method to database format
export function toPaymentMethodDb(method: PaymentMethod): PaymentMethodDb {
  return paymentMethodToEnglish[method] as PaymentMethodDb;
}

// Convert database payment method to UI format
export function toPaymentMethodUi(method: PaymentMethodDb | string): PaymentMethod {
  const reverseMap: Record<string, PaymentMethod> = {
    'transfer': PaymentMethod.TRANSFER,
    'cash': PaymentMethod.CASH,
    'card': PaymentMethod.CARD,
    'other': PaymentMethod.OTHER,
  };
  return reverseMap[method] || PaymentMethod.TRANSFER; // Default to transfer if not found
}

// Payment method display mapping
export const paymentMethodToPolish: Record<string, string> = {
  transfer: 'Przelew',
  cash: 'Gotówka',
  card: 'Karta',
  other: 'Inna',
  przelew: 'Przelew',
  'gotówka': 'Gotówka',
  karta: 'Karta',
  inny: 'Inna',
};

export const paymentMethodToEnglish: Record<string, string> = {
  przelew: 'transfer',
  'gotówka': 'cash',
  karta: 'card',
  inny: 'other',
  transfer: 'transfer',
  cash: 'cash',
  card: 'card',
  other: 'other',
};

export function getPolishPaymentMethod(method: string | undefined): string {
  if (!method) return '';
  return paymentMethodToPolish[method] || method;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string; // Made optional to fix type conflicts
  quantity: number;
  unitPrice: number; // Netto price
  vatRate: number;
  unit: string;
  totalNetValue: number;
  totalGrossValue: number;
  totalVatValue: number;
  vatExempt?: boolean; // Added vatExempt property
}

export enum VatExemptionReason {
  // Zwolnienie podmiotowe (limit 200 tys. zł) – art. 113 ust. 1 ustawy o VAT
  ART_113_UST_1 = '113_1',
  // Zwolnienie przedmiotowe (rodzaj działalności) – art. 43 ust. 1 ustawy o VAT
  ART_43_UST_1 = '43_1',
  // Eksport towarów – art. 41 ust. 4 ustawy o VAT
  ART_41_UST_4 = '41_4',
  // Wewnątrzwspólnotowa dostawa towarów – art. 42 ustawy o VAT
  ART_42 = '42',
  // Usługi zagraniczne (reverse charge) – art. 28b ustawy o VAT
  ART_28B = '28b',
  // Odwrotne obciążenie – art. 17 ust. 1 pkt 7 i 8 ustawy o VAT
  ART_17 = '17',
  // Inna podstawa prawna (wpisz ręcznie)
  OTHER = 'other',
}

export enum VatType {
  // 0%
  RATE_0 = 0,
  // 5%
  RATE_5 = 5,
  // 8%
  RATE_8 = 8,
  // 23%
  RATE_23 = 23,
  // Zwolniony z VAT
  ZW = -1,
}

export interface KsefInfo {
  status: 'pending' | 'sent' | 'error' | 'none';
  referenceNumber?: string | null;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Company {
  id?: string;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  number: string;
  type: InvoiceType;
  transactionType: TransactionType;
  issueDate: string;
  dueDate: string;
  sellDate: string;
  date: string;
  businessProfileId: string;
  customerId: string;
  items: InvoiceItem[];
  paymentMethod: PaymentMethodDb;
  isPaid: boolean;
  paid: boolean;
  status: InvoiceStatus;
  comments?: string;
  totalNetValue: number;
  totalGrossValue: number;
  totalVatValue: number;
  totalAmount: number;
  ksef?: KsefInfo;
  seller: Company;
  buyer: Company;
  businessName?: string;
  customerName?: string;
  bankAccountId?: string;
  bankAccountNumber?: string;
  created_at?: string;
  updated_at?: string;
  vat?: boolean;
  vatExemptionReason?: VatExemptionReason;
  fakturaBezVAT?: boolean;
}

// For Analytics Panel
export interface MonthlyInvoiceSummary {
  month: string; // e.g., "2023-01"
  count: number;
  totalNetValue: number;
  totalGrossValue: number;
  totalVatValue: number;
}

export interface Expense {
  id: string;
  userId: string;
  businessProfileId: string;
  issueDate: string;
  amount: number;
  currency: string;
  description?: string;
  createdAt?: string;
  transactionType: TransactionType; // Assuming this comes from common-types
  date: string; // Alias for compatibility
  items?: InvoiceItem[];
  customerId?: string;
}
