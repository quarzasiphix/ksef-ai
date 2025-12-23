/**
 * ERP Integration Types
 * 
 * KsięgaI acts as a pre-KSeF agreement layer that sits between ERP systems and KSeF.
 * This module defines types for connecting to major Polish ERP systems.
 */

export enum ERPProvider {
  COMARCH = 'comarch',
  ENOVA365 = 'enova365',
  SYMFONIA = 'symfonia',
  INSERT = 'insert',
  ODOO = 'odoo',
  CUSTOM = 'custom'
}

export enum ERPConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  SYNCING = 'syncing'
}

export enum ERPSyncDirection {
  PUSH = 'push',           // KsięgaI → ERP (after agreement)
  PULL = 'pull',           // ERP → KsięgaI (for status updates)
  BIDIRECTIONAL = 'bidirectional'
}

export enum ERPConnectionMode {
  OBSERVER = 'observer',                 // ERP only receives final docs, no control
  ACCOUNTANT_LED = 'accountant-led',     // Accountant manually controls push
  AUTO_AFTER_AGREEMENT = 'auto-after-agreement'  // Default: auto-push after both parties agree
}

export interface ERPConnection {
  id: string;
  user_id: string;
  business_profile_id: string;
  provider: ERPProvider;
  status: ERPConnectionStatus;
  
  // Connection credentials (encrypted in database)
  api_endpoint?: string;
  api_key?: string;
  client_id?: string;
  client_secret?: string;
  
  // Configuration
  sync_direction: ERPSyncDirection;
  connection_mode: ERPConnectionMode;   // Who controls the push: observer, accountant, or auto
  auto_push_after_agreement: boolean;  // Push to ERP after both parties agree
  auto_pull_status: boolean;            // Pull payment/accounting status from ERP
  
  // Sync settings
  last_sync_at?: string;
  sync_frequency_minutes?: number;
  
  // Error tracking
  last_error?: string;
  error_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface ERPSyncLog {
  id: string;
  erp_connection_id: string;
  direction: ERPSyncDirection;
  entity_type: 'invoice' | 'payment' | 'customer' | 'product';
  entity_id: string;
  status: 'pending' | 'success' | 'failed';
  error_message?: string;
  request_payload?: any;
  response_payload?: any;
  synced_at: string;
}

/**
 * Webhook payload structure for ERP systems to notify KsięgaI
 * of status changes (e.g., payment received, invoice booked)
 */
export interface ERPWebhookPayload {
  provider: ERPProvider;
  event_type: 'invoice.booked' | 'payment.received' | 'invoice.cancelled' | 'status.updated';
  entity_id: string;           // ERP's internal ID
  ksiegai_invoice_id?: string; // KsięgaI's invoice ID (if known)
  timestamp: string;
  data: {
    status?: string;
    payment_date?: string;
    amount_paid?: number;
    accounting_entry_id?: string;
    [key: string]: any;
  };
  signature?: string; // HMAC signature for verification
}

/**
 * Invoice push payload from KsięgaI to ERP
 * Sent after both parties have agreed on the invoice
 */
export interface ERPInvoicePushPayload {
  ksiegai_invoice_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  seller: {
    name: string;
    tax_id: string;
    address: string;
  };
  buyer: {
    name: string;
    tax_id: string;
    address: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    total_net: number;
    total_gross: number;
  }>;
  total_net: number;
  total_vat: number;
  total_gross: number;
  currency: string;
  payment_method: string;
  
  // Agreement metadata
  agreed_at: string;
  agreement_status: 'approved' | 'ready_for_ksef';
  discussion_summary?: string;
  
  // KsięgaI-specific
  ksiegai_url: string; // Link back to KsięgaI for full audit trail
}

/**
 * ERP provider configuration
 * Defines capabilities and requirements for each ERP system
 */
export interface ERPProviderConfig {
  provider: ERPProvider;
  name: string;
  description: string;
  logo_url?: string;
  
  // Capabilities
  supports_push: boolean;
  supports_pull: boolean;
  supports_webhooks: boolean;
  
  // Authentication
  auth_type: 'api_key' | 'oauth2' | 'basic' | 'custom';
  
  // Documentation
  setup_guide_url?: string;
  api_docs_url?: string;
  
  // Availability
  is_available: boolean;
  coming_soon?: boolean;
}

export const ERP_PROVIDERS: Record<ERPProvider, ERPProviderConfig> = {
  [ERPProvider.COMARCH]: {
    provider: ERPProvider.COMARCH,
    name: 'Comarch ERP',
    description: 'Integracja z systemami Comarch (Optima, XL, XT)',
    supports_push: true,
    supports_pull: true,
    supports_webhooks: true,
    auth_type: 'api_key',
    is_available: true,
    api_docs_url: 'https://www.comarch.pl/erp/api-documentation'
  },
  [ERPProvider.ENOVA365]: {
    provider: ERPProvider.ENOVA365,
    name: 'enova365',
    description: 'Integracja z systemem enova365 (Soneta)',
    supports_push: true,
    supports_pull: true,
    supports_webhooks: true,
    auth_type: 'oauth2',
    is_available: true,
    api_docs_url: 'https://www.enova.pl/api'
  },
  [ERPProvider.SYMFONIA]: {
    provider: ERPProvider.SYMFONIA,
    name: 'Symfonia',
    description: 'Integracja z systemem Symfonia (Sage)',
    supports_push: true,
    supports_pull: true,
    supports_webhooks: false,
    auth_type: 'api_key',
    is_available: true,
    api_docs_url: 'https://www.symfonia.pl/integracje'
  },
  [ERPProvider.INSERT]: {
    provider: ERPProvider.INSERT,
    name: 'InsERT',
    description: 'Integracja z systemami InsERT (GT, Nexo, Subiekt)',
    supports_push: true,
    supports_pull: true,
    supports_webhooks: false,
    auth_type: 'api_key',
    is_available: true,
    api_docs_url: 'https://www.insert.com.pl/api'
  },
  [ERPProvider.ODOO]: {
    provider: ERPProvider.ODOO,
    name: 'Odoo',
    description: 'Integracja z systemem Odoo (open-source ERP)',
    supports_push: true,
    supports_pull: true,
    supports_webhooks: true,
    auth_type: 'api_key',
    is_available: false,
    coming_soon: true,
    api_docs_url: 'https://www.odoo.com/documentation/api'
  },
  [ERPProvider.CUSTOM]: {
    provider: ERPProvider.CUSTOM,
    name: 'Własna integracja',
    description: 'Niestandardowa integracja przez API KsięgaI',
    supports_push: true,
    supports_pull: true,
    supports_webhooks: true,
    auth_type: 'custom',
    is_available: true
  }
};
