/**
 * Orphaned Events Types
 * 
 * Backwards compatibility for events without chain_id
 */

export interface OrphanedEvent {
  event_id: string;
  event_type: string;
  event_number: string;
  action_summary: string;
  occurred_at: string;
  entity_type?: string;
  entity_id?: string;
  entity_reference?: string;
  object_type?: string;
  object_id?: string;
  metadata: Record<string, any>;
  suggested_chain_id?: string;
  suggested_chain_title?: string;
  confidence: number;
}

export interface AttachEventResult {
  success: boolean;
  error?: string;
  event_id?: string;
  chain_id?: string;
  causation_event_id?: string;
  method?: 'manual' | 'object_ref' | 'entity_ref' | 'metadata_invoice' | 'metadata_cash' | 'new_chain';
  confidence?: number;
  created_new_chain?: boolean;
}

export interface OrphanedEventsSummary {
  business_profile_id: string;
  orphaned_count: number;
  with_object_ref: number;
  with_entity_ref: number;
  without_ref: number;
  oldest_orphan?: string;
  newest_orphan?: string;
}

export interface ChainSearchResult {
  chain_id: string;
  chain_number: string;
  title: string;
  chain_type: string;
  state: string;
  event_count: number;
  last_activity_at?: string;
  relevance_score: number;
}

export interface BulkAttachResult {
  success: boolean;
  processed: number;
  attached: number;
  failed: number;
  results: AttachEventResult[];
}

export interface AttachEventToChainInput {
  event_id: string;
  chain_id: string;
  causation_event_id?: string;
}

export interface SearchChainsInput {
  business_profile_id: string;
  search_query?: string;
  event_id?: string;
  limit?: number;
}

/**
 * Auto-attach strategies (in order of preference)
 */
export const AUTO_ATTACH_STRATEGIES = {
  OBJECT_REF: 'object_ref',        // Highest confidence (1.0)
  ENTITY_REF: 'entity_ref',        // High confidence (0.9)
  METADATA_INVOICE: 'metadata_invoice', // Medium confidence (0.8)
  METADATA_CASH: 'metadata_cash',  // Medium confidence (0.8)
  NEW_CHAIN: 'new_chain',          // Low confidence (0.5)
} as const;

/**
 * Confidence thresholds for UI display
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
} as const;

/**
 * Helper to get confidence level
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

/**
 * Helper to get confidence color for UI
 */
export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high': return 'green';
    case 'medium': return 'yellow';
    case 'low': return 'orange';
  }
}

/**
 * Helper to get method description in Polish
 */
export function getMethodDescription(method: string): string {
  switch (method) {
    case 'object_ref':
      return 'Znaleziono łańcuch na podstawie referencji obiektu';
    case 'entity_ref':
      return 'Znaleziono łańcuch na podstawie referencji encji';
    case 'metadata_invoice':
      return 'Znaleziono łańcuch na podstawie ID faktury w metadanych';
    case 'metadata_cash':
      return 'Znaleziono łańcuch na podstawie ID płatności w metadanych';
    case 'new_chain':
      return 'Utworzono nowy łańcuch dla tego zdarzenia';
    case 'manual':
      return 'Przypisano ręcznie';
    default:
      return 'Nieznana metoda';
  }
}
