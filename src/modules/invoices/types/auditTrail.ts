export interface InvoiceVersion {
  version_id: string;
  version_number: number;
  change_type: 'created' | 'draft_saved' | 'issued' | 'paid' | 'unpaid' | 'corrected' | 'modified' | 'cancelled';
  change_reason: string | null;
  changed_by: string;
  changed_at: string;
  snapshot_hash: string;
  chain_hash: string;
  snapshot_data: InvoiceSnapshot;
}

export interface InvoiceSnapshot {
  invoice_id: string;
  invoice_number: string;
  issue_date: string;
  sale_date: string;
  due_date: string;
  status: string;
  payment_status: string;
  business_profile_id: string;
  customer_id: string;
  total_amount: number;
  total_net: number;
  total_vat: number;
  currency: string;
  payment_method: string;
  notes: string | null;
  items: InvoiceItemSnapshot[];
}

export interface InvoiceItemSnapshot {
  name: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  unit: string;
}

export interface InvoiceEvent {
  event_id: string;
  event_type: string;
  actor_id: string;
  created_at: string;
  entity_version_id: string;
  payload: any;
  payload_hash: string;
}

export interface ChainVerification {
  valid: boolean;
  invoice_id: string;
  version_count: number;
  errors: ChainVerificationError[];
  verified_at: string;
  verified_by: string;
}

export interface ChainVerificationError {
  version_number: number;
  version_id: string;
  error_type: 'snapshot_hash_mismatch' | 'chain_hash_mismatch' | 'initial_chain_hash_invalid' | 'missing_prev_version_link';
  expected?: string;
  computed?: string;
  actual?: string;
  message: string;
}

export interface InvoiceAuditTrail {
  invoice_id: string;
  invoice_number: string;
  current_status: string;
  is_locked: boolean;
  current_version_number: number;
  versions: InvoiceVersion[];
  events: InvoiceEvent[];
  verification: ChainVerification;
  retrieved_at: string;
}

export interface AuditProof {
  proof_type: 'invoice_audit_chain';
  proof_version: string;
  generated_at: string;
  generated_by: string;
  invoice: {
    id: string;
    invoice_number: string;
    issue_date: string;
    total_amount: number;
    currency: string;
    status: string;
    is_locked: boolean;
  };
  audit_trail: InvoiceAuditTrail;
  instructions: string;
}

export interface InvoiceStateChangeResult {
  success: boolean;
  invoice_id: string;
  version_id: string;
  event_id: string;
  invoice_number?: string;
  payment_date?: string;
  change_type?: string;
}
