export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  issueDate: string; // Changed from optional to required
  seller: Company;
  buyer: Company;
  items: InvoiceItem[];
  totalAmount: number;
  paid: boolean;
  isPaid?: boolean; // For backward compatibility
  paymentMethod: PaymentMethod | string; // Allow string for backward compatibility
  type: InvoiceType;
  transactionType: TransactionType; // 'income' or 'expense'
  bankAccountId?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Additional fields for InvoiceCard
  totalVatValue?: number;
  totalGrossValue: number;
  // Customer and business info
  customerName?: string; // Optional, can use buyer.name as fallback
  customerId?: string;
  businessName?: string;
  businessProfileId?: string;
}

export interface Company {
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
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
