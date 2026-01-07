export type ClientGroupType = 
  | 'administration'  // Real estate administrations (e.g., Domikom)
  | 'direct_client'   // Direct clients (e.g., TOP-BUD)
  | 'country'         // Country-based grouping (e.g., Germany, Netherlands)
  | 'portfolio'       // Custom portfolio grouping
  | 'other';          // Other grouping

export interface ClientGroup {
  id: string;
  business_profile_id: string;
  user_id: string;
  
  // Basic information
  name: string;
  description?: string;
  type: ClientGroupType;
  
  // Invoice series configuration
  invoice_prefix?: string;  // e.g., 'DOM', 'TOP', 'DE', 'NL'
  invoice_sequence_current: number;
  invoice_sequence_month?: string; // YYYY-MM format
  
  // Default settings
  default_payment_terms: number; // days
  default_notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ClientGroupFormData {
  name: string;
  description?: string;
  type: ClientGroupType;
  invoice_prefix?: string;
  default_payment_terms: number;
  default_notes?: string;
}

export const CLIENT_GROUP_TYPE_LABELS: Record<ClientGroupType, string> = {
  administration: 'Administracja (zarządca nieruchomości)',
  direct_client: 'Klient bezpośredni',
  country: 'Kraj / Region',
  portfolio: 'Portfolio',
  other: 'Inne',
};
