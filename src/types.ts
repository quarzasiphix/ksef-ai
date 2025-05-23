export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export type KsefStatus = 'sent' | 'error' | 'pending' | 'none';

export interface KsefInfo {
  status: KsefStatus;
  referenceNumber?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date?: string;
  dueDate: string;
  issueDate: string;
  sellDate: string;
  seller?: Company;
  buyer?: Company;
  items: InvoiceItem[];
  totalAmount?: number;
  paid?: boolean;
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
  user_id?: string;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: VatExemptionReason;
  vat?: boolean;
  ksef?: KsefInfo;
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
  description: string;
  quantity: number;
  unitPrice: number;
  vatType?: VatType;
  vatExemptionReason?: VatExemptionReason;
  vatRate?: number | VatType;
  totalNetValue?: number;
  totalVatValue?: number;
  totalGrossValue?: number;
  unit?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  vatRate: number; // VAT rate as number (e.g., 23, 8, 5, 0) or -1 for VAT-exempt
  unit: string;
  user_id: string;
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

export enum InvoiceType {
  SALES = 'sales',
  RECEIPT = 'receipt',
  PROFORMA = 'proforma',
  CORRECTION = 'correction'
}
