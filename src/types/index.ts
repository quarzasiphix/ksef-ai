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
  /**
   * @deprecated Używaj tabeli bank_accounts dla wielu kont bankowych.
   */
  bankAccount?: string;
  email?: string;
  phone?: string;
  logo?: string;
  isDefault?: boolean;
  entityType?: 'dzialalnosc' | 'sp_zoo' | 'sa'; // Forma prawna: DG (default), Sp. z o.o., S.A.
  tax_type?: "skala" | "liniowy" | "ryczalt" | null;
  monthlySocialSecurity?: number; // Monthly social security contribution amount
  monthlyHealthInsurance?: number; // Monthly health insurance contribution amount
  accountant_email?: string; // Email for accountant
  /**
   * Lista kodów PKD przypisanych do profilu firmy. Używane m.in. przy ryczałcie do wyliczania stawek podatkowych.
   */
  pkdCodes?: string[];
  is_vat_exempt?: boolean;
  vat_exemption_reason?: string | null;
  vat_threshold_pln?: number;
  vat_threshold_year?: number;
  // Spółka z o.o. specific fields
  share_capital?: number;
  krs_number?: string;
  court_registry?: string;
  establishment_date?: string;
  headquarters_address?: string;
  headquarters_postal_code?: string;
  headquarters_city?: string;
  correspondence_address?: string;
  correspondence_postal_code?: string;
  correspondence_city?: string;
  business_activity_address?: string;
  business_activity_postal_code?: string;
  business_activity_city?: string;
  pkd_main?: string;
  vat_status?: 'none' | 'vat' | 'vat_ue';
  accounting_method?: 'ksiegi_rachunkowe' | 'uproszczona';
  cit_rate?: 9 | 19;
  fiscal_year_end_month?: number;
  nip_8_filed?: boolean;
  nip_8_filed_date?: string;
  cit_advance_type?: 'monthly' | 'quarterly';
  is_small_taxpayer?: boolean;
}

export interface BoardMember {
  id: string;
  business_profile_id: string;
  first_name: string;
  last_name: string;
  position: 'prezes' | 'wiceprezes' | 'czlonek_zarzadu' | 'prokurent';
  pesel?: string;
  tax_id?: string;
  address?: string;
  email?: string;
  phone?: string;
  appointed_date?: string;
  term_end_date?: string;
  is_active: boolean;
  can_represent_alone: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
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
  business_profile_id?: string; // Links to specific business profile
  is_shared?: boolean; // If true, available for all user's business profiles
  customerType: 'odbiorca' | 'sprzedawca' | 'both';
  linkedBusinessProfile?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    user_id: string;
  } | null;
  business_profile_name?: string; // From view
  business_profile_entity_type?: string; // From view
}

export interface Product {
  id: string;
  user_id: string; // Added for RLS
  business_profile_id?: string; // Links to specific business profile
  is_shared?: boolean; // If true, available for all user's business profiles
  name: string;
  unitPrice: number; // Netto price
  vatRate: number; // VAT percentage, e.g., 23 or -1 for VAT-exempt
  unit: string; // e.g., "szt.", "godz.", etc.
  description?: string; // Added optional description
  product_type: 'income' | 'expense';
  track_stock: boolean;
  stock: number;
  business_profile_name?: string; // From view
  business_profile_entity_type?: string; // From view
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
  bankAccountId?: string | null;
  bankAccountNumber?: string;
  currency?: string;
  created_at?: string;
  updated_at?: string;
  vat?: boolean;
  vatExemptionReason?: VatExemptionReason;
  fakturaBezVAT?: boolean;
  exchangeRate?: number;
  exchangeRateDate?: string;
  exchangeRateSource?: 'NBP' | 'manual';
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

// Contract entity used for contract management
export interface Contract {
  id: string;
  user_id: string; // Owner user ID (RLS)
  businessProfileId: string; // Seller / our company
  customerId: string; // Counterparty
  number: string; // Contract number / identifier
  issueDate: string; // Date of signing / issue
  validFrom?: string; // Effective start date
  validTo?: string; // Effective end date
  subject?: string; // Brief subject/ title
  content?: string; // Long-form HTML / Markdown body stored in DB
  pdfUrl?: string; // Stored PDF reference if generated
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Document categorization (new fields)
  document_category?: 'transactional_payout' | 'transactional_payin' | 'informational';
  is_transactional?: boolean;
  contract_type?: 'general' | 'employment' | 'service' | 'lease' | 'purchase' | 'board_member' | 'management_board' | 'supervisory_board' | 'nda' | 'partnership' | 'other';
  is_template?: boolean;
  folder_id?: string;
  signing_parties?: any; // JSONB
  board_member_id?: string;
  
  // Transactional contract fields
  payment_account_id?: string;
  expected_amount?: number;
  payment_frequency?: 'one_time' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  next_payment_date?: string;
  auto_generate_invoices?: boolean;
  currency?: string;
}

export interface ContractInvoiceLink {
  id: string;
  user_id: string;
  contractId: string;
  invoiceId: string;
  created_at?: string;
}

export interface Employee {
  id: string;
  user_id: string;
  business_profile_id?: string;
  first_name: string;
  last_name: string;
  position: string;
  department?: string;
  salary: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  employment_type?: 'umowa_o_prace' | 'umowa_zlecenie' | 'umowa_o_dzielo' | 'b2b' | 'other';
  requires_pit?: boolean;
  requires_zus?: boolean;
  created_at: string;
  updated_at: string;
}
