// Asset Management System Types - Decision-First Governance Model
// Core principle: Assets exist because decisions bind capital, not because they were bought

export type AssetClass = 
  | 'real_estate'
  | 'vehicle'
  | 'ip'
  | 'equipment'
  | 'financial_asset';

export type LegalBasisType = 'uchwala' | 'contract' | 'decision';

export type OwnershipType = 
  | 'owned'
  | 'leased'
  | 'licensed'
  | 'right_of_use';

export type AccountingClassification = 
  | 'fixed_asset'
  | 'investment'
  | 'intangible'
  | 'current_asset';

export type AssetStatus = 
  | 'authorized'      // Uchwała exists
  | 'acquired'        // Acquired/Bound
  | 'operational'     // Active use
  | 'modified'        // Improvements/changes
  | 'impaired'        // Suspended/impaired
  | 'disposed';       // Sale/liquidation/end

export type ValuationType = 
  | 'purchase_price'
  | 'book_value'
  | 'appraisal'
  | 'market_estimate'
  | 'impairment'
  | 'revaluation';

export type AuthorityLevel = 
  | 'accounting'
  | 'informational'
  | 'external_expert'
  | 'regulatory';

export type ObligationPurpose = 
  | 'acquire'
  | 'maintain'
  | 'improve'
  | 'dispose'
  | 'insure'
  | 'license';

export type AccountingEffect = 
  | 'capitalized'  // Increases asset value
  | 'expense'      // Operating cost
  | 'deferred';    // Prepaid/accrued

export type ObligationStatus = 
  | 'pending'
  | 'approved'
  | 'fulfilled'
  | 'cancelled';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface Asset {
  id: string;
  business_profile_id: string;
  
  // Core identification
  asset_class: AssetClass;
  
  // Legal basis (decision-first principle)
  legal_basis_type: LegalBasisType;
  legal_basis_id: string; // References resolutions.id, contracts.id, or decisions.id
  
  // Ownership
  ownership_type: OwnershipType;
  
  // Governance
  entry_date: string; // ISO date
  responsible_person_id?: string;
  
  // Accounting
  accounting_classification: AccountingClassification;
  
  // Lifecycle
  status: AssetStatus;
  
  // Metadata
  internal_name: string;
  description?: string;
  notes?: string;
  
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface AssetValuation {
  id: string;
  asset_id: string;
  
  // Valuation type
  valuation_type: ValuationType;
  
  // Value
  amount: number;
  currency: string;
  
  // Source and authority
  method_source?: string;
  authority_level: AuthorityLevel;
  
  // Timing
  effective_date: string; // ISO date
  valid_until?: string; // ISO date
  
  // Metadata
  notes?: string;
  created_at?: string;
  created_by?: string;
}

export interface AssetObligation {
  id: string;
  business_profile_id: string;
  
  // Legal basis
  based_on_type: LegalBasisType;
  based_on_id: string;
  
  // Purpose
  purpose: ObligationPurpose;
  
  // Asset linkage (optional)
  affects_asset_id?: string;
  
  // Accounting effect (decided BEFORE booking)
  accounting_effect: AccountingEffect;
  
  // Financial
  amount: number;
  currency: string;
  
  // Timing
  obligation_date: string; // ISO date
  due_date?: string; // ISO date
  fulfilled_date?: string; // ISO date
  
  // Status
  status: ObligationStatus;
  
  // Metadata
  description: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface AssetStateTransition {
  id: string;
  asset_id: string;
  
  from_status: AssetStatus;
  to_status: AssetStatus;
  
  transition_date: string;
  reason?: string;
  
  // Authority
  authorized_by_type?: 'uchwala' | 'decision' | 'user';
  authorized_by_id?: string;
  
  created_by?: string;
}

// ============================================================================
// ASSET CLASS SPECIFIC OVERLAYS
// ============================================================================

export type RealEstateUsageType = 
  | 'office'
  | 'warehouse'
  | 'production'
  | 'residential'
  | 'commercial'
  | 'land';

export interface AssetRealEstate {
  asset_id: string;
  
  address: string;
  land_register_reference?: string;
  usage_type?: RealEstateUsageType;
  
  // Depreciation
  depreciation_group?: string;
  depreciation_rate?: number;
  
  // Details
  area_sqm?: number;
  building_year?: number;
  
  created_at?: string;
  updated_at?: string;
}

export type VehicleOperationalPolicy = 
  | 'business_only'
  | 'private_use_allowed'
  | 'pool_vehicle';

export interface AssetVehicle {
  asset_id: string;
  
  vin?: string;
  registration_number?: string;
  make?: string;
  model?: string;
  year?: number;
  
  // Operational
  mileage?: number;
  operational_policy?: VehicleOperationalPolicy;
  
  // Insurance
  insurance_policy_number?: string;
  insurance_expiry?: string; // ISO date
  
  created_at?: string;
  updated_at?: string;
}

export type IPType = 
  | 'software'
  | 'trademark'
  | 'patent'
  | 'copyright'
  | 'domain'
  | 'know_how';

export interface AssetIP {
  asset_id: string;
  
  ip_type: IPType;
  
  jurisdiction?: string; // e.g., "PL", "EU", "US"
  registration_number?: string;
  
  // License
  license_scope?: string;
  license_expiry?: string; // ISO date
  
  // Protection
  protection_start_date?: string; // ISO date
  protection_end_date?: string; // ISO date
  
  created_at?: string;
  updated_at?: string;
}

export type EquipmentCondition = 
  | 'new'
  | 'good'
  | 'fair'
  | 'poor'
  | 'non_operational';

export interface AssetEquipment {
  asset_id: string;
  
  equipment_type?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  
  // Operational
  location?: string;
  condition?: EquipmentCondition;
  
  // Maintenance
  last_maintenance_date?: string; // ISO date
  next_maintenance_date?: string; // ISO date
  
  created_at?: string;
  updated_at?: string;
}

export type FinancialInstrumentType = 
  | 'shares'
  | 'bonds'
  | 'investment_fund'
  | 'deposit'
  | 'loan_receivable'
  | 'other';

export type RiskClassification = 
  | 'low'
  | 'medium'
  | 'high';

export interface AssetFinancial {
  asset_id: string;
  
  instrument_type: FinancialInstrumentType;
  
  counterparty?: string;
  counterparty_id?: string;
  
  // Risk
  risk_classification?: RiskClassification;
  
  // Details
  quantity?: number;
  isin?: string;
  maturity_date?: string; // ISO date
  
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// COMPOSITE TYPES (for UI and business logic)
// ============================================================================

export interface AssetWithDetails extends Asset {
  // Current valuation (most recent book value)
  current_valuation?: AssetValuation;
  
  // All valuations
  valuations?: AssetValuation[];
  
  // Related obligations
  obligations?: AssetObligation[];
  
  // State history
  state_transitions?: AssetStateTransition[];
  
  // Class-specific details (only one will be populated based on asset_class)
  real_estate?: AssetRealEstate;
  vehicle?: AssetVehicle;
  ip?: AssetIP;
  equipment?: AssetEquipment;
  financial?: AssetFinancial;
}

export interface CapitalCommitment {
  // Decision/Uchwała that authorized the commitment
  decision_id: string;
  decision_title: string;
  decision_date: string;
  decision_type: 'strategic_shareholders' | 'operational_board';
  
  // Assets bound by this decision
  assets: AssetWithDetails[];
  
  // Total capital committed
  total_committed: number;
  total_deployed: number;
  
  // Obligations under this decision
  obligations: AssetObligation[];
}

// ============================================================================
// LABELS AND CONSTANTS
// ============================================================================

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  real_estate: 'Nieruchomości',
  vehicle: 'Pojazdy',
  ip: 'Własność intelektualna',
  equipment: 'Wyposażenie',
  financial_asset: 'Aktywa finansowe',
};

export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  owned: 'Własność',
  leased: 'Leasing',
  licensed: 'Licencja',
  right_of_use: 'Prawo użytkowania',
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  authorized: 'Autoryzowane',
  acquired: 'Nabyte',
  operational: 'Operacyjne',
  modified: 'Zmodyfikowane',
  impaired: 'Utrata wartości',
  disposed: 'Zbycie',
};

export const VALUATION_TYPE_LABELS: Record<ValuationType, string> = {
  purchase_price: 'Cena nabycia',
  book_value: 'Wartość księgowa',
  appraisal: 'Wycena rzeczoznawcy',
  market_estimate: 'Szacunek rynkowy',
  impairment: 'Odpis aktualizujący',
  revaluation: 'Przeszacowanie',
};

export const OBLIGATION_PURPOSE_LABELS: Record<ObligationPurpose, string> = {
  acquire: 'Nabycie',
  maintain: 'Utrzymanie',
  improve: 'Ulepszenie',
  dispose: 'Zbycie',
  insure: 'Ubezpieczenie',
  license: 'Licencja',
};

export const ACCOUNTING_EFFECT_LABELS: Record<AccountingEffect, string> = {
  capitalized: 'Kapitalizowane (zwiększa wartość)',
  expense: 'Koszt operacyjny',
  deferred: 'Rozliczenia międzyokresowe',
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const VALID_STATUS_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  authorized: ['acquired', 'disposed'],
  acquired: ['operational', 'disposed'],
  operational: ['modified', 'impaired', 'disposed'],
  modified: ['operational', 'impaired', 'disposed'],
  impaired: ['operational', 'disposed'],
  disposed: [], // Terminal state
};

export function isValidStatusTransition(from: AssetStatus, to: AssetStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextValidStatuses(currentStatus: AssetStatus): AssetStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface CreateAssetInput {
  business_profile_id: string;
  asset_class: AssetClass;
  legal_basis_type: LegalBasisType;
  legal_basis_id: string;
  ownership_type: OwnershipType;
  entry_date: string;
  responsible_person_id?: string;
  accounting_classification: AccountingClassification;
  internal_name: string;
  description?: string;
  notes?: string;
  
  // Initial valuation (optional)
  initial_valuation?: {
    amount: number;
    currency: string;
    valuation_type: ValuationType;
    method_source?: string;
    authority_level: AuthorityLevel;
  };
  
  // Class-specific data
  real_estate?: Partial<AssetRealEstate>;
  vehicle?: Partial<AssetVehicle>;
  ip?: Partial<AssetIP>;
  equipment?: Partial<AssetEquipment>;
  financial?: Partial<AssetFinancial>;
}

export interface UpdateAssetInput {
  internal_name?: string;
  description?: string;
  notes?: string;
  responsible_person_id?: string;
  status?: AssetStatus;
  
  // Class-specific updates
  real_estate?: Partial<AssetRealEstate>;
  vehicle?: Partial<AssetVehicle>;
  ip?: Partial<AssetIP>;
  equipment?: Partial<AssetEquipment>;
  financial?: Partial<AssetFinancial>;
}

export interface CreateObligationInput {
  business_profile_id: string;
  based_on_type: LegalBasisType;
  based_on_id: string;
  purpose: ObligationPurpose;
  affects_asset_id?: string;
  accounting_effect: AccountingEffect;
  amount: number;
  currency: string;
  obligation_date: string;
  due_date?: string;
  description: string;
  notes?: string;
}
