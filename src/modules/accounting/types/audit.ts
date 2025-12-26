/**
 * Audit Timeline Types
 * Operational timeline showing who/when/how for ledger entries
 */

export type AuditEventType = 
  | 'created'
  | 'edited'
  | 'approved'
  | 'posted'
  | 'corrected'
  | 'cancelled'
  | 'decision_linked'
  | 'payment_linked';

export type AuditPanelState = 'closed' | 'open' | 'pinned';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  actionTimestamp: string; // ISO 8601
  actorId: string;
  actorName: string;
  actorRole?: string;
  actorAvatar?: string;
  
  // What changed
  changes?: {
    field: string;
    before: any;
    after: any;
  }[];
  
  // Context
  description: string;
  metadata?: {
    decisionId?: string;
    decisionReference?: string;
    approvalRequired?: boolean;
    delayDays?: number;
    backdated?: boolean;
  };
  
  // Links to impacted ledger entries
  linkedLedgerEntryIds?: string[];
}

export interface AuditPanelConfig {
  state: AuditPanelState;
  selectedLedgerEntryId: string | null;
  selectedAuditEventId?: string;
  panelWidth: number; // pixels
}

export interface DelayIndicator {
  isDelayed: boolean;
  isBackdated: boolean;
  delayDays: number;
  reason?: string;
}
