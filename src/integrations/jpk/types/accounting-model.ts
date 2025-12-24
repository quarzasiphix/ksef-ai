/**
 * Canonical Accounting Model for JPK Generation
 * 
 * This is the normalized ledger model that JPK files are generated FROM.
 * Do NOT generate JPK directly from UI invoice objects.
 */

/**
 * Company Profile with VAT Status
 * Determines which JPK files are required
 */
export interface CompanyProfile {
  nip: string;
  regon?: string;
  fullName: string;
  shortName?: string;
  
  // Address
  address: {
    street: string;
    buildingNumber: string;
    apartmentNumber?: string;
    postalCode: string;
    city: string;
    country: string; // ISO code
  };
  
  // VAT Status - CRITICAL for JPK logic
  vatStatus: 'active' | 'exempt' | 'small_taxpayer';
  vatExemptionReason?: string; // If exempt
  
  // Company type affects JPK requirements
  companyType: 'jdg' | 'spolka' | 'other';
  
  // Accounting method
  accountingMethod: 'full' | 'pkpir' | 'tax_card';
  
  // Period rules
  vatPeriod?: 'monthly' | 'quarterly'; // Only if VAT active
  fiscalYearStart: string; // ISO date
}

/**
 * Counterparty (Customer or Supplier)
 */
export interface Counterparty {
  id: string;
  type: 'customer' | 'supplier' | 'both';
  
  // Identification
  nip?: string;
  regon?: string;
  fullName: string;
  shortName?: string;
  
  // Address
  address?: {
    street?: string;
    buildingNumber?: string;
    apartmentNumber?: string;
    postalCode?: string;
    city?: string;
    country: string; // ISO code, default 'PL'
  };
  
  // Tax classification
  isEuCompany: boolean;
  isNonEuCompany: boolean;
  countryCode?: string; // ISO 2-letter code
}

/**
 * Document Types
 */
export type DocumentType = 
  | 'FA'        // Faktura VAT
  | 'KOREKTA'   // Faktura korygująca
  | 'ZAL'       // Faktura zaliczkowa
  | 'RO'        // Rachunek
  | 'WEW'       // Dokument wewnętrzny
  | 'IMPORT'    // Import usług/towarów
  | 'WNT';      // Wewnątrzwspólnotowe nabycie towarów

/**
 * VAT Rate Codes
 */
export type VatRateCode = 
  | '23'   // Standard rate
  | '8'    // Reduced rate
  | '5'    // Reduced rate
  | '0'    // Zero rate
  | 'zw'   // Exempt (zwolniona)
  | 'np'   // Not subject to VAT (nie podlega)
  | 'oo';  // Reverse charge (odwrotne obciążenie)

/**
 * GTU (Goods and Services Grouping) Codes
 * Required for specific types of goods/services
 */
export type GtuCode = 
  | 'GTU_01'  // Alcoholic beverages
  | 'GTU_02'  // Goods referred to in Article 103(5aa)
  | 'GTU_03'  // Heating oils, lubricating oils
  | 'GTU_04'  // Tobacco products
  | 'GTU_05'  // Waste
  | 'GTU_06'  // Electronic devices, parts
  | 'GTU_07'  // Vehicles and parts
  | 'GTU_08'  // Precious metals and base metals
  | 'GTU_09'  // Pharmaceuticals and medical devices
  | 'GTU_10'  // Buildings, structures, land
  | 'GTU_11'  // Provision of services in construction
  | 'GTU_12'  // Transport services and warehouse management
  | 'GTU_13'; // Fuels

/**
 * Procedure Markers (Procedury)
 * Special transaction types that must be marked
 */
export interface ProcedureMarkers {
  SW?: boolean;      // Intra-community supply of goods
  EE?: boolean;      // Export of goods
  TP?: boolean;      // Related party transactions
  TT_WNT?: boolean;  // Intra-community acquisition of goods
  TT_D?: boolean;    // Domestic reverse charge
  MR_T?: boolean;    // Tourist services (margin scheme)
  MR_UZ?: boolean;   // Used goods (margin scheme)
  I_42?: boolean;    // Import of services (art. 42)
  I_63?: boolean;    // Import of goods (art. 63)
  B_SPV?: boolean;   // New means of transport
  B_SPV_DOSTAWA?: boolean;
  B_MPV_PROWIZJA?: boolean;
  MPP?: boolean;     // Split payment mechanism
}

/**
 * VAT Register Entry (Sales or Purchase)
 * This is the core data structure for JPK_V7
 */
export interface VatRegisterEntry {
  // Identification
  id: string;
  entryNumber: number; // Sequential number in register
  type: 'sales' | 'purchase';
  
  // Document
  documentType: DocumentType;
  documentNumber: string;
  issueDate: string;      // ISO date
  saleDate?: string;      // ISO date (data sprzedaży)
  receiptDate?: string;   // ISO date (for purchases)
  
  // Counterparty
  counterpartyId: string;
  counterpartyNip?: string;
  counterpartyName: string;
  counterpartyCountry: string; // ISO code
  
  // Amounts by VAT rate
  amounts: VatAmount[];
  
  // Total amounts (calculated)
  totalNet: number;
  totalVat: number;
  totalGross: number;
  
  // GTU codes (if applicable)
  gtuCodes?: GtuCode[];
  
  // Procedure markers
  procedures?: ProcedureMarkers;
  
  // Correction reference
  correctsDocumentId?: string;
  correctionReason?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  bookedAt?: string; // When entry was posted to ledger
  period: string;    // YYYY-MM format
}

/**
 * Amount breakdown by VAT rate
 */
export interface VatAmount {
  vatRate: VatRateCode;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  
  // For reverse charge, import, etc.
  isReverseCharge?: boolean;
  isImport?: boolean;
  isIntraCommunity?: boolean;
}

/**
 * Posting/Booking Entry
 * For JPK_KR (full accounting ledger)
 */
export interface LedgerEntry {
  id: string;
  entryNumber: number;
  journalType: 'sales' | 'purchase' | 'bank' | 'cash' | 'general';
  
  // Document reference
  documentId?: string;
  documentNumber?: string;
  documentDate: string;
  
  // Posting
  postingDate: string;
  description: string;
  
  // Lines (debit/credit)
  lines: LedgerLine[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  period: string; // YYYY-MM
}

export interface LedgerLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  
  // VAT tracking
  vatRegistryEntryId?: string;
  
  // Counterparty
  counterpartyId?: string;
}

/**
 * Chart of Accounts
 */
export interface AccountDefinition {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  isVatRelated: boolean;
  parentCode?: string;
}

/**
 * Period Summary
 * Aggregated data for a reporting period
 */
export interface PeriodSummary {
  period: string; // YYYY-MM or YYYY-QQ
  companyNip: string;
  
  // Sales register summary
  salesEntries: number;
  totalSalesNet: number;
  totalSalesVat: number;
  totalSalesGross: number;
  
  // Purchase register summary
  purchaseEntries: number;
  totalPurchaseNet: number;
  totalPurchaseVat: number;
  totalPurchaseGross: number;
  
  // VAT settlement
  vatPayable: number;    // VAT należny
  vatDeductible: number; // VAT naliczony
  vatToPay: number;      // Do zapłaty (or refund if negative)
  
  // Status
  isClosed: boolean;
  closedAt?: string;
  submittedAt?: string;
  jpkV7Generated?: boolean;
}

/**
 * JPK Generation Request
 * Input for JPK mapper
 */
export interface JpkGenerationRequest {
  // What to generate
  jpkType: 'V7M' | 'V7K' | 'FA' | 'KR' | 'PKPIR' | 'MAG';
  schemaVersion: string; // e.g., '3', '4'
  
  // Period
  period: string; // YYYY-MM for monthly, YYYY-QQ for quarterly
  
  // Company
  companyProfile: CompanyProfile;
  
  // Data
  vatRegisterEntries?: VatRegisterEntry[];
  ledgerEntries?: LedgerEntry[];
  
  // Options
  purpose: 1 | 2; // 1 = złożenie, 2 = korekta
  correctionNumber?: number;
  
  // Metadata
  generatedBy: string;
  systemName: string;
}

/**
 * JPK Generation Result
 */
export interface JpkGenerationResult {
  success: boolean;
  xml?: string;
  errors?: JpkValidationError[];
  warnings?: JpkValidationWarning[];
  
  // Metadata
  generatedAt: string;
  fileSize: number;
  entryCount: number;
}

export interface JpkValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error';
}

export interface JpkValidationWarning {
  code: string;
  message: string;
  field?: string;
  severity: 'warning';
}
