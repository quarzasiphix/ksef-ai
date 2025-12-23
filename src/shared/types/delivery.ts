// ============================================================================
// BUSINESS DELIVERY AND AGREEMENT LAYER - TypeScript Types
// ============================================================================
//
// Core Philosophy:
// "KSeF rejestruje fakty. KsięgaI pomaga firmom dojść do faktów, zanim staną się publiczne."
// (KSeF registers facts. KsięgaI helps companies arrive at facts before they become public.)
//
// This is a PRE-KSEF AGREEMENT LAYER:
// - Companies negotiate and agree on invoices privately
// - Corrections happen BEFORE KSeF submission, not after
// - KSeF receives the final truth, not the negotiation noise
// - This is process hygiene, not tax evasion
//
// State Flow:
// Draft → Discussed → Agreed → [Submitted to KSeF] → Paid → Settled
//
// ============================================================================

export type DocumentType = 'invoice' | 'contract' | 'offer' | 'receipt';

export type DeliveryMethod = 'in_app' | 'public_link' | 'email';

// CRITICAL: Legal state separation
// These statuses apply to DRAFT/PROPOSAL documents ONLY
// Once 'issued', the document becomes a legal invoice and goes to KSeF
export type DeliveryStatus =
  | 'sent'        // Draft delivered
  | 'viewed'      // Recipient opened draft
  | 'accepted'    // Recipient accepted terms (ready for issuance)
  | 'disputed'    // Recipient raised dispute on draft
  | 'rejected'    // Recipient rejected draft
  | 'corrected'   // Sender issued corrected draft version
  | 'withdrawn'   // Sender withdrew draft
  | 'issued';     // Document was issued (becomes tax document, goes to KSeF)

export type KSeFStatus = 'pending' | 'submitted' | 'accepted' | 'rejected';

export type DeliveryEventType =
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'disputed'
  | 'rejected'
  | 'corrected'
  | 'paid'
  | 'settled'
  | 'cancelled'
  | 'link_generated'
  | 'link_accessed'
  | 'reminder_sent';

export type DisputeReason =
  | 'incorrect_amount'
  | 'incorrect_items'
  | 'incorrect_recipient'
  | 'not_ordered'
  | 'already_paid'
  | 'duplicate'
  | 'missing_details'
  | 'other';

export type DisputeResolutionStatus =
  | 'open'
  | 'acknowledged'
  | 'corrected'
  | 'rejected_by_sender'
  | 'withdrawn'
  | 'resolved';

export type MessageType =
  | 'comment'
  | 'dispute_reason'
  | 'correction_note'
  | 'payment_confirmation'
  | 'system_notification';

export type PaymentMethod = 'stripe' | 'bank_transfer' | 'cash' | 'card' | 'other';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'disputed';

export type ConnectionType = 'client' | 'supplier' | 'both';

export type TrustLevel = 'new' | 'verified' | 'trusted' | 'preferred' | 'blocked';

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface DocumentDelivery {
  id: string;
  document_type: DocumentType;
  document_id: string;
  
  // CRITICAL: Legal state separation
  is_draft: boolean; // true = draft/proposal, false = issued invoice
  
  // Sender
  sender_business_profile_id: string;
  sender_user_id?: string;
  
  // Recipient
  recipient_business_profile_id?: string;
  recipient_nip?: string;
  recipient_email?: string;
  recipient_name?: string;
  
  // Delivery
  delivery_method: DeliveryMethod;
  delivery_status: DeliveryStatus;
  
  // Issuance tracking (when draft becomes legal invoice)
  issued_at?: string;
  issued_by_user_id?: string;
  ksef_submission_id?: string;
  ksef_status?: KSeFStatus;
  
  // Public link
  public_link_token?: string;
  public_link_expires_at?: string;
  public_link_requires_verification: boolean;
  
  // Tracking
  sent_at: string;
  first_viewed_at?: string;
  view_count: number;
  last_viewed_at?: string;
  
  // Response
  responded_at?: string;
  responded_by_user_id?: string;
  
  created_at: string;
  updated_at: string;
}

export interface DeliveryEvent {
  id: string;
  delivery_id: string;
  event_type: DeliveryEventType;
  
  // Actor
  actor_user_id?: string;
  actor_business_profile_id?: string;
  
  // Details
  from_status?: DeliveryStatus;
  to_status?: DeliveryStatus;
  metadata?: Record<string, any>;
  
  // Context
  ip_address?: string;
  user_agent?: string;
  
  created_at: string;
}

export interface DocumentDispute {
  id: string;
  delivery_id: string;
  
  // Dispute
  dispute_reason: DisputeReason;
  dispute_message?: string;
  disputed_by_user_id: string;
  disputed_by_business_profile_id: string;
  
  // Resolution
  resolution_status: DisputeResolutionStatus;
  resolved_at?: string;
  resolved_by_user_id?: string;
  resolution_note?: string;
  corrected_delivery_id?: string;
  
  created_at: string;
  updated_at: string;
}

export interface DocumentThread {
  id: string;
  delivery_id: string;
  
  message_type: MessageType;
  message_text: string;
  
  // Author
  author_user_id: string;
  author_business_profile_id: string;
  
  // Visibility
  is_internal: boolean;
  
  // Attachments
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  
  created_at: string;
}

export interface PaymentSettlement {
  id: string;
  delivery_id: string;
  
  // Payment
  payment_method: PaymentMethod;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  stripe_payout_id?: string;
  
  // Amounts
  amount_paid: number;
  currency: string;
  fee_amount: number;
  net_amount: number;
  
  // Status
  payment_status: PaymentStatus;
  
  // Timing
  paid_at?: string;
  settled_at?: string;
  
  // Accounting
  is_booked: boolean;
  booked_at?: string;
  accounting_entry_id?: string;
  
  metadata?: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export interface BusinessConnection {
  id: string;
  business_profile_id: string;
  connected_business_profile_id: string;
  
  connection_type: ConnectionType;
  trust_level: TrustLevel;
  
  // Stats
  total_documents_sent: number;
  total_documents_received: number;
  total_amount_sent: number;
  total_amount_received: number;
  
  // Timing
  first_interaction_at: string;
  last_interaction_at: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPOSITE TYPES (with relations)
// ============================================================================

export interface DeliveryWithContext extends DocumentDelivery {
  sender?: {
    id: string;
    name: string;
    tax_id: string;
  };
  recipient?: {
    id: string;
    name: string;
    tax_id: string;
  };
  dispute?: DocumentDispute;
  settlement?: PaymentSettlement;
  thread_count: number;
  unread_count: number;
}

export interface BusinessInboxItem {
  delivery: DeliveryWithContext;
  document: any; // Invoice | Contract | Offer
  requires_action: boolean;
  action_deadline?: string;
}

export interface InboxStats {
  pending_count: number;
  disputed_count: number;
  requires_action_count: number;
  total_value_pending: number;
}

// ============================================================================
// LABELS AND HELPERS
// ============================================================================

// SAFE LANGUAGE: Use "projekt" terminology for pre-issuance states
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  sent: 'Projekt wysłany',
  viewed: 'Projekt wyświetlony',
  accepted: 'Warunki zaakceptowane',
  disputed: 'Projekt zakwestionowany',
  rejected: 'Projekt odrzucony',
  corrected: 'Projekt poprawiony',
  withdrawn: 'Projekt wycofany',
  issued: 'Wystawiona (dokument podatkowy)',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  sent: 'blue',
  viewed: 'cyan',
  accepted: 'green',
  disputed: 'orange',
  rejected: 'red',
  corrected: 'purple',
  withdrawn: 'gray',
  issued: 'emerald',
};

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  incorrect_amount: 'Nieprawidłowa kwota',
  incorrect_items: 'Nieprawidłowe pozycje',
  incorrect_recipient: 'Nieprawidłowy odbiorca',
  not_ordered: 'Nie zamówiono',
  already_paid: 'Już opłacono',
  duplicate: 'Duplikat',
  missing_details: 'Brakujące szczegóły',
  other: 'Inne',
};

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeResolutionStatus, string> = {
  open: 'Otwarte',
  acknowledged: 'Potwierdzone',
  corrected: 'Poprawione',
  rejected_by_sender: 'Odrzucone przez nadawcę',
  withdrawn: 'Wycofane',
  resolved: 'Rozwiązane',
};

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  client: 'Klient',
  supplier: 'Dostawca',
  both: 'Klient i Dostawca',
};

export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  new: 'Nowy',
  verified: 'Zweryfikowany',
  trusted: 'Zaufany',
  preferred: 'Preferowany',
  blocked: 'Zablokowany',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDeliveryStatusBadgeVariant(status: DeliveryStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'accepted':
    case 'issued':
      return 'default';
    case 'disputed':
    case 'rejected':
      return 'destructive';
    case 'viewed':
    case 'corrected':
      return 'secondary';
    case 'withdrawn':
      return 'outline';
    default:
      return 'outline';
  }
}

export function requiresRecipientAction(status: DeliveryStatus): boolean {
  return ['sent', 'viewed'].includes(status);
}

export function requiresSenderAction(status: DeliveryStatus): boolean {
  return ['disputed'].includes(status);
}

export function canAcceptDelivery(status: DeliveryStatus): boolean {
  return ['sent', 'viewed'].includes(status);
}

export function canDisputeDelivery(status: DeliveryStatus): boolean {
  return ['sent', 'viewed', 'accepted'].includes(status);
}

export function canRejectDelivery(status: DeliveryStatus): boolean {
  return ['sent', 'viewed'].includes(status);
}

export function isDeliveryFinal(status: DeliveryStatus): boolean {
  return ['issued', 'withdrawn', 'rejected'].includes(status);
}

export function canIssueInvoice(status: DeliveryStatus): boolean {
  // Can only issue invoice if accepted (terms agreed)
  return status === 'accepted';
}

export function isDraft(status: DeliveryStatus): boolean {
  // All statuses except 'issued' are draft states
  return status !== 'issued';
}

export function generatePublicLinkUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/public/delivery/${token}`;
}

export function formatDeliveryDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Przed chwilą';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;
  
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================================================
// FORM INPUT TYPES
// ============================================================================

export interface CreateDeliveryInput {
  document_type: DocumentType;
  document_id: string;
  sender_business_profile_id: string;
  
  // Recipient (either in-network or external)
  recipient_business_profile_id?: string;
  recipient_nip?: string;
  recipient_email?: string;
  recipient_name?: string;
  
  delivery_method: DeliveryMethod;
  
  // Public link options
  public_link_expires_in_days?: number;
  public_link_requires_verification?: boolean;
}

export interface CreateDisputeInput {
  delivery_id: string;
  dispute_reason: DisputeReason;
  dispute_message?: string;
  disputed_by_business_profile_id: string;
}

export interface ResolveDisputeInput {
  dispute_id: string;
  resolution_status: DisputeResolutionStatus;
  resolution_note?: string;
  corrected_delivery_id?: string;
}

export interface CreateThreadMessageInput {
  delivery_id: string;
  message_type: MessageType;
  message_text: string;
  author_business_profile_id: string;
  is_internal?: boolean;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
}

export interface RecordPaymentInput {
  delivery_id: string;
  payment_method: PaymentMethod;
  amount_paid: number;
  currency?: string;
  stripe_payment_intent_id?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateDeliveryRecipient(input: CreateDeliveryInput): { valid: boolean; error?: string } {
  // Must have either in-network recipient OR external recipient details
  const hasInNetworkRecipient = !!input.recipient_business_profile_id;
  const hasExternalRecipient = !!(input.recipient_nip || input.recipient_email);
  
  if (!hasInNetworkRecipient && !hasExternalRecipient) {
    return {
      valid: false,
      error: 'Musisz podać odbiorcę (firmę w sieci lub dane zewnętrzne)',
    };
  }
  
  if (input.delivery_method === 'in_app' && !hasInNetworkRecipient) {
    return {
      valid: false,
      error: 'Dostawa w aplikacji wymaga odbiorcy w sieci',
    };
  }
  
  return { valid: true };
}

export function validateDisputeMessage(reason: DisputeReason, message?: string): { valid: boolean; error?: string } {
  if (reason === 'other' && (!message || message.trim().length < 10)) {
    return {
      valid: false,
      error: 'Dla powodu "Inne" wymagany jest szczegółowy opis (min. 10 znaków)',
    };
  }
  
  return { valid: true };
}
