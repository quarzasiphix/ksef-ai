/**
 * Timeline Ledger Types
 * Normalized event structure for vertical timeline display
 */

export type LedgerDirection = 'in' | 'out' | 'neutral';
export type LedgerSource = 'bank' | 'cash' | 'invoice' | 'expense' | 'contract' | 'payment' | 'adjustment';
export type LedgerStatus = 'posted' | 'pending' | 'failed' | 'cancelled';

export interface TimelineLedgerEvent {
  id: string;
  occurredAt: string; // ISO 8601
  title: string; // e.g., "Faktura wystawiona"
  subtitle: string; // e.g., "F/29 · WSPÓLNOTA MIESZKANIOWA..."
  amount: {
    value: number;
    currency: string;
  };
  direction: LedgerDirection;
  source: LedgerSource;
  icon?: string;
  status?: LedgerStatus;
  meta?: {
    counterpartyName?: string;
    docNo?: string;
    accountName?: string;
    decisionId?: string;
    decisionReference?: string;
  };
  linkedDocuments?: Array<{
    id: string;
    type: string;
    number: string;
    relationship: string;
  }>;
  documentId: string;
  documentType: string;
}

export interface TimelineDateGroup {
  dateLabel: string;
  dateKey: string; // YYYY-MM-DD for grouping
  items: TimelineLedgerEvent[];
}

export interface TimelineRowProps {
  event: TimelineLedgerEvent;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onClick?: (event: TimelineLedgerEvent) => void;
  onShowAudit?: () => void;
  auditHint?: {
    recordedAt: string;
    actorName: string;
    isDelayed?: boolean;
    isBackdated?: boolean;
  };
}
