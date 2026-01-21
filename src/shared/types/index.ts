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
  taxType?: "skala" | "liniowy" | "ryczalt" | "karta" | null; // Camel case alias
  tax_type?: "skala" | "liniowy" | "ryczalt" | "karta" | null; // Snake case (database)
  ryczaltRates?: Record<string, number>; // Ryczałt rates by activity type
  defaultRyczaltRate?: number; // Default ryczałt rate
  linearTaxRate?: number; // Linear tax rate (14% or 19%)
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
  client_group_id?: string; // Links to client group (administration/portfolio)
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

export type AccountingBehavior = 'przychod_operacyjny' | 'pozostale_przychody' | 'koszt_operacyjny' | 'srodek_trwaly';
export type VatBehavior = '23' | '8' | '5' | '0' | 'zw' | 'np' | 'ue';
export type ProductLifecycleState = 'active' | 'hidden' | 'archived';
export type ProductCategory = 'service' | 'good' | 'asset';

export interface Product {
  id: string;
  user_id: string; // Added for RLS
  business_profile_id?: string; // Links to specific business profile
  is_shared?: boolean; // If true, available for all user's business profiles
  name: string;
  unitPrice: number; // Netto price
  vatRate: number; // VAT percentage, e.g., 23 or -1 for VAT-exempt (legacy)
  unit: string; // e.g., "szt.", "godz.", etc. (legacy)
  description?: string;
  product_type: 'income' | 'expense'; // Legacy field
  track_stock: boolean;
  stock: number;
  business_profile_name?: string; // From view
  business_profile_entity_type?: string; // From view
  
  // New accounting-grade semantic fields
  accounting_behavior: AccountingBehavior; // Accounting classification
  vat_behavior: VatBehavior; // VAT rate behavior
  unit_behavior: string; // Unit of measurement (szt., godz., km, ryczalt, etc.)
  price_editable: boolean; // Can price be edited on documents?
  vat_overridable: boolean; // Can VAT be manually overridden?
  lifecycle_state: ProductLifecycleState; // Product lifecycle state
  usage_count: number; // Number of times used in documents
  last_used_at?: string; // Timestamp of last usage
  product_category: ProductCategory; // Service, good, or asset
  inventory_managed: boolean; // Whether inventory tracking is enabled
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
  decisionId?: string;
  // Expense acceptance workflow
  acceptanceStatus?: 'pending' | 'accepted' | 'rejected' | 'auto_accepted';
  acceptedAt?: string;
  acceptedBy?: string;
  // Payment tracking
  paymentDate?: string;
  paymentMethodUsed?: 'cash' | 'bank' | 'card' | 'other';
  paymentAccountId?: string;
  cashTransactionId?: string;
  accountMovementId?: string;
  // Accounting status
  accountingStatus?: 'unposted' | 'posted' | 'needs_review' | 'rejected';
  postedAt?: string;
  journalEntryId?: string;
  decisionReference?: string;
  // JDG register relation
  ryczalt_account_id?: string; // ID of the ryczalt account this invoice is linked to (accounted)
  accountingRegisterId?: string; // ID of the JDG register entry this invoice is linked to
  accountingRegisterDate?: string; // Date when posted to accounting register
  projectId?: string; // Project assignment
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
  dueDate?: string;
  amount: number;
  currency: string;
  description?: string;
  createdAt?: string;
  transactionType: TransactionType; // Assuming this comes from common-types
  date: string; // Alias for compatibility
  items?: InvoiceItem[];
  customerId?: string;
  customerName?: string;
  counterpartyName?: string;
  linkedInvoiceId?: string | null; // References original invoice when expense is derived from received share
  isShared?: boolean;
  shareId?: string | null;
  projectId?: string; // Project assignment
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
  decision_id?: string; // Link to authorizing decision
  decision_reference?: string; // Cached § reference (e.g., §1.2.3)
  projectId?: string; // Project assignment
  
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

export type ProjectStatus = 'active' | 'frozen' | 'closed' | 'archived';
export type DepartmentStatus = 'active' | 'frozen' | 'closed' | 'archived';
export type JobStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

export type DepartmentTemplate = 'general' | 'construction' | 'property_admin' | 'marketing' | 'saas' | 'sales' | 'operations' | 'funeral_home' | 'transport_operations';

// Department (formerly Project) - Level 1: Organizational unit
export interface Department {
  id: string;
  business_profile_id: string;
  name: string;
  description?: string;
  code?: string; // Short code for department (e.g., "SAAS", "CONSTRUCTION")
  color?: string; // UI color for visual distinction
  status: DepartmentStatus;
  template: DepartmentTemplate; // Department type defining enabled features
  
  // Governance integration
  charter_decision_id?: string; // Founding decision that created this department
  
  // Financial tracking
  budget_limit?: number;
  currency?: string;
  actual_cost?: number;
  actual_revenue?: number;
  
  // Metadata
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  
  // Lifecycle timestamps
  activated_at?: string;
  frozen_at?: string;
  frozen_by?: string;
  freeze_decision_id?: string;
  closed_at?: string;
  closed_by?: string;
  close_decision_id?: string;
  
  // Sorting and display
  sort_order?: number;
  is_default?: boolean; // Default department for new transactions
}

// Job/Project - Level 2: Time-bound execution unit inside a department
export interface Job {
  id: string;
  department_id: string; // Parent department
  business_profile_id: string;
  name: string;
  description?: string;
  code?: string; // Short code for job
  color?: string; // Inherits from department if not set
  status: JobStatus;
  
  // Timeline
  start_date?: string;
  end_date?: string;
  target_completion_date?: string;
  
  // Budget and financials
  budget_amount?: number;
  budget_currency?: string;
  actual_cost?: number;
  actual_revenue?: number;
  
  // Governance
  charter_decision_id?: string; // Decision authorizing this job
  
  // Metadata
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  
  // Display
  is_default?: boolean;
}

// Backward compatibility: Project is now an alias for Department
export interface Project {
  id: string;
  business_profile_id: string;
  name: string;
  description?: string;
  code?: string; // Short code for project (e.g., "SAAS", "TRANSPORT")
  color?: string; // UI color for visual distinction
  status: ProjectStatus;
  template: DepartmentTemplate; // Department type defining enabled features
  
  // Governance integration
  charter_decision_id?: string; // Founding decision that created this project
  parent_project_id?: string; // For hierarchical projects (optional)
  
  // Financial tracking
  budget_limit?: number;
  currency?: string;
  
  // Metadata
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  
  // Lifecycle timestamps
  activated_at?: string;
  frozen_at?: string;
  frozen_by?: string;
  freeze_decision_id?: string;
  closed_at?: string;
  closed_by?: string;
  close_decision_id?: string;
  
  // Sorting and display
  sort_order?: number;
  is_default?: boolean; // Default project for new transactions
}

export interface DepartmentStats {
  department_id: string;
  department_name: string;
  status: DepartmentStatus;
  budget_amount?: number;
  budget_currency?: string;
  total_jobs: number;
  active_jobs: number;
  total_invoices: number;
  total_expenses: number;
  total_contracts: number;
  total_revenue: number;
  total_costs: number;
  actual_cost?: number;
  actual_revenue?: number;
  profit_margin?: number;
}

export interface JobStats {
  job_id: string;
  department_id: string;
  job_name: string;
  status: JobStatus;
  budget_amount?: number;
  budget_currency?: string;
  total_invoices: number;
  total_expenses: number;
  total_contracts: number;
  total_revenue: number;
  total_costs: number;
  actual_cost?: number;
  actual_revenue?: number;
  profit_margin?: number;
}

// Backward compatibility alias
export interface ProjectStats {
  id: string;
  business_profile_id: string;
  name: string;
  code?: string;
  status: ProjectStatus;
  invoice_count: number;
  expense_count: number;
  contract_count: number;
  event_count: number;
  total_income: number;
  total_expenses: number;
  total_expense_amount: number;
  budget_limit?: number;
  currency?: string;
  created_at: string;
  updated_at: string;
}
