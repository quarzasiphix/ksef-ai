/**
 * Version-Based Acceptance/Review System Types
 * 
 * "Acceptance is a signature over a specific version"
 */

export type ReviewStatus = 
  | 'draft'           // Not yet submitted for review
  | 'pending_review'  // Submitted, awaiting accountant review
  | 'accepted'        // Accepted by accountant (specific version)
  | 'rejected'        // Rejected by accountant
  | 'superseded';     // Was accepted, but changes made after acceptance

export type ChangeSeverity = 
  | 'none'            // No changes
  | 'non_accounting'  // Changes that don't affect accounting (notes, tags)
  | 'accounting';     // Changes that affect accounting (amounts, VAT, dates)

export interface ChainReview {
  review_status: ReviewStatus;
  reviewed_version_id?: string;  // The specific version that was accepted
  reviewed_at?: string;
  reviewed_by?: string;
  review_comment?: string;
}

export interface VersionWithSeverity {
  id: string;
  invoice_id: string;
  version_no: number;
  snapshot_json: Record<string, any>;
  changed_fields: string[];
  change_reason?: string;
  change_summary?: string;
  change_severity: ChangeSeverity;
  accounting_impact_fields?: string[];
  non_accounting_fields?: string[];
  created_at: string;
  created_by?: string;
}

export interface FieldClassification {
  id: string;
  object_type: string;
  field_name: string;
  classification: 'accounting' | 'non_accounting';
  description?: string;
}

export interface AcceptChainInput {
  chain_id: string;
  version_id: string;
  comment?: string;
}

export interface RejectChainInput {
  chain_id: string;
  version_id: string;
  comment: string;  // Required for rejection
}

export interface SubmitForReviewInput {
  chain_id: string;
  version_id: string;
}

export interface CanEditResult {
  can_edit: boolean;
  reason: string;
  requires_correction?: boolean;
  will_invalidate_acceptance?: boolean;
}

export interface ChainWithReview {
  id: string;
  review_status: ReviewStatus;
  reviewed_version_id?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_comment?: string;
  latest_version?: {
    version_id: string;
    version_no: number;
    change_severity: ChangeSeverity;
    changed_fields: string[];
    created_at: string;
  };
  accepted_version?: {
    version_id: string;
    version_no: number;
    reviewed_at: string;
    reviewed_by: string;
  };
  has_changes_after_acceptance: boolean;
}

// Accounting-impacting fields (for reference)
export const ACCOUNTING_FIELDS = [
  'total_net_value',
  'total_vat_value',
  'total_gross_value',
  'currency',
  'exchange_rate',
  'customer_id',
  'issue_date',
  'sell_date',
  'due_date',
  'payment_method',
  'vat',
  'vat_exemption_reason',
  'items',
  'bank_account_id',
  'cash_account_id',
] as const;

// Non-accounting fields (for reference)
export const NON_ACCOUNTING_FIELDS = [
  'comments',
  'notes',
  'project_id',
  'decision_id',
] as const;

/**
 * Business Rules (MVP Policy)
 * 
 * 1. Soft change with mandatory re-accept:
 *    - Allow edits if not posted
 *    - Acceptance is invalidated for accounting-impacting changes
 *    - Accountant must accept again
 * 
 * 2. Posted invoices:
 *    - Require correction workflow
 *    - Cannot edit directly
 * 
 * 3. Non-accounting changes:
 *    - Do NOT invalidate acceptance
 *    - Can be made freely
 */
