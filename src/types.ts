export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  issueDate: string;
  sellDate: string;
  seller: Company;
  buyer: Company;
  items: InvoiceItem[];
  totalAmount: number;
  paid: boolean;
  isPaid?: boolean;
  paymentMethod: PaymentMethod | string;
  type: InvoiceType;
  transactionType: TransactionType;
  bankAccountId?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
  totalNetValue?: number;
  totalVatValue?: number;
  totalGrossValue: number;
  customerName?: string;
  customerId?: string;
  businessName?: string;
  businessProfileId?: string;
  user_id: string;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: VatExemptionReason;
  vat?: boolean;
}

export interface Company {
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  vatType?: VatType;
  vatExemptionReason?: VatExemptionReason;
  vatRate?: number | VatType;
  totalNetValue?: number;
  totalVatValue?: number;
  totalGrossValue?: number;
  unit?: string;
  vatExempt?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  vatRate: number;
  unit: string;
  user_id: string;
  product_type: 'income' | 'expense';
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  taxId?: string;
  address: string;
  postalCode: string;
  city: string;
  country?: string;
  email?: string;
  phone?: string;
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
  transactionType: TransactionType;
  date: string;
  category?: string;
}

export enum VatType {
  STANDARD = 'standard',
  REDUCED = 'reduced',
  EXEMPT = 'exempt',
  ZW = 'zw'
}

export enum VatExemptionReason {
  ART_44_1_1 = 'art_44_1_1',
  ART_44_1_2 = 'art_44_1_2',
  ART_44_1_3 = 'art_44_1_3',
  ART_44_1_4 = 'art_44_1_4'
}

export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer'
}

export enum PaymentMethodDb {
  CASH = 'cash',
  TRANSFER = 'transfer'
}

export enum InvoiceType {
  SALES = 'sales',
  RECEIPT = 'receipt',
  PROFORMA = 'proforma',
  CORRECTION = 'correction'
}

export interface BusinessProfile {
  id: string;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  regon?: string | null;
  bankAccount?: string | null;
  email?: string | null;
  phone?: string | null;
  logo?: string | null;
  isDefault?: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  tax_type?: string | null;
}
