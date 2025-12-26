/**
 * Event Enforcement Logic
 * 
 * Implements decision-based authority gates for event progression.
 * Core principle: Nothing happens without proper authority.
 */

import type { UnifiedEvent, Decision, EnforcementCheck, EventType } from '../types/unified-event';

/**
 * Check if an event can be posted to the ledger
 */
export async function canPostEvent(
  event: UnifiedEvent,
  decisions: Decision[]
): Promise<EnforcementCheck> {
  // 1. Check if event requires a decision
  const requiredDecisionType = getRequiredDecisionType(event.event_type);
  
  if (!requiredDecisionType) {
    // No decision required for this event type
    return { is_allowed: true };
  }
  
  // 2. Find active decision that covers this event
  const applicableDecision = findApplicableDecision(
    event,
    decisions,
    requiredDecisionType
  );
  
  if (!applicableDecision) {
    return {
      is_allowed: false,
      required_decision: requiredDecisionType,
      error_message: `Brak decyzji: ${getDecisionTypeLabel(requiredDecisionType)}. Wydarzenie zablokowane.`,
    };
  }
  
  // 3. Check if decision allows this specific action
  if (!applicableDecision.allows_actions.includes(event.event_type)) {
    return {
      is_allowed: false,
      blocked_by: applicableDecision.id,
      error_message: `Decyzja ${applicableDecision.decision_number} nie obejmuje tego typu działania.`,
    };
  }
  
  // 4. Check expense limits
  if (event.amount && applicableDecision.expense_limit) {
    if (event.amount > applicableDecision.expense_limit) {
      return {
        is_allowed: false,
        blocked_by: applicableDecision.id,
        error_message: `Kwota ${event.amount} PLN przekracza limit decyzji (${applicableDecision.expense_limit} PLN).`,
      };
    }
  }
  
  // 5. Check time period
  if (applicableDecision.time_period) {
    const eventDate = new Date(event.occurred_at);
    const periodStart = new Date(applicableDecision.time_period.start);
    const periodEnd = new Date(applicableDecision.time_period.end);
    
    if (eventDate < periodStart || eventDate > periodEnd) {
      return {
        is_allowed: false,
        blocked_by: applicableDecision.id,
        error_message: `Data zdarzenia poza okresem obowiązywania decyzji.`,
      };
    }
  }
  
  return { is_allowed: true };
}

/**
 * Determine which decision type is required for an event
 */
function getRequiredDecisionType(eventType: EventType): string | null {
  const requiresDecision: Record<string, EventType[]> = {
    budget_approval: [
      'expense_approved',
      'expense_posted',
    ],
    contract_authority: [
      'contract_signed',
    ],
    hiring_authority: [
      'employee_hired',
    ],
    capital_event: [
      'capital_contribution',
      'capital_withdrawal',
      'dividend_declared',
    ],
  };
  
  for (const [decisionType, eventTypes] of Object.entries(requiresDecision)) {
    if (eventTypes.includes(eventType)) {
      return decisionType;
    }
  }
  
  return null;
}

/**
 * Find an active decision that applies to this event
 */
function findApplicableDecision(
  event: UnifiedEvent,
  decisions: Decision[],
  requiredDecisionType: string
): Decision | null {
  const now = new Date();
  
  return decisions.find(decision => {
    // Must be active
    if (!decision.is_active) return false;
    
    // Must be the right type
    if (decision.decision_type !== requiredDecisionType) return false;
    
    // Must be within time period (if specified)
    if (decision.time_period) {
      const periodStart = new Date(decision.time_period.start);
      const periodEnd = new Date(decision.time_period.end);
      if (now < periodStart || now > periodEnd) return false;
    }
    
    return true;
  }) || null;
}

/**
 * Get Polish label for decision type
 */
function getDecisionTypeLabel(decisionType: string): string {
  const labels: Record<string, string> = {
    budget_approval: 'Budżet operacyjny',
    contract_authority: 'Upoważnienie do podpisywania umów',
    hiring_authority: 'Upoważnienie do zatrudniania',
    capital_event: 'Zdarzenie kapitałowe',
    operational_policy: 'Polityka operacyjna',
  };
  return labels[decisionType] || decisionType;
}

/**
 * Check if event can progress to next status
 */
export function canProgressStatus(
  event: UnifiedEvent,
  targetStatus: string
): EnforcementCheck {
  const validProgressions: Record<string, string[]> = {
    captured: ['classified'],
    classified: ['approved'],
    approved: ['posted'],
    posted: ['settled'],
    settled: [],
  };
  
  const allowedNext = validProgressions[event.status];
  if (!allowedNext || !allowedNext.includes(targetStatus)) {
    return {
      is_allowed: false,
      error_message: `Nie można przejść ze statusu "${event.status}" do "${targetStatus}".`,
    };
  }
  
  // Check if event is blocked
  if (event.blocked_by) {
    return {
      is_allowed: false,
      blocked_by: event.blocked_by,
      error_message: event.blocked_reason || 'Zdarzenie zablokowane przez brak wymaganej decyzji.',
    };
  }
  
  return { is_allowed: true };
}

/**
 * Get reasons why an event is in inbox
 */
export function getInboxReasons(event: UnifiedEvent): string[] {
  const reasons: string[] = [];
  
  if (!event.classification) {
    reasons.push('Brak klasyfikacji (kategoria, VAT)');
  }
  
  if (!event.counterparty) {
    reasons.push('Brak kontrahenta');
  }
  
  if (event.blocked_by) {
    reasons.push(`Brak decyzji: ${event.blocked_reason || 'wymagana decyzja'}`);
  }
  
  if (event.status === 'captured') {
    reasons.push('Wymaga klasyfikacji');
  }
  
  if (event.status === 'classified') {
    reasons.push('Wymaga zatwierdzenia');
  }
  
  if (!event.amount) {
    reasons.push('Brak kwoty');
  }
  
  return reasons;
}

/**
 * Determine if event should appear in inbox
 */
export function shouldBeInInbox(event: UnifiedEvent): boolean {
  // Already posted → not in inbox
  if (event.posted) return false;
  
  // Doesn't need action → not in inbox
  if (!event.needs_action) return false;
  
  return true;
}

/**
 * Determine if event should appear in ledger
 */
export function shouldBeInLedger(event: UnifiedEvent): boolean {
  return event.posted === true;
}

/**
 * Get blocking message for UI display
 */
export function getBlockingMessage(event: UnifiedEvent): string | null {
  if (!event.blocked_by) return null;
  
  return event.blocked_reason || 'To zdarzenie jest zablokowane i wymaga decyzji do kontynuacji.';
}

/**
 * Check if user has authority to approve event
 */
export function canUserApprove(
  event: UnifiedEvent,
  userRole: string,
  decisions: Decision[]
): EnforcementCheck {
  const requiredDecisionType = getRequiredDecisionType(event.event_type);
  
  if (!requiredDecisionType) {
    // No decision required, any user can approve
    return { is_allowed: true };
  }
  
  const applicableDecision = findApplicableDecision(
    event,
    decisions,
    requiredDecisionType
  );
  
  if (!applicableDecision) {
    return {
      is_allowed: false,
      error_message: 'Brak odpowiedniej decyzji. Skontaktuj się z zarządem.',
    };
  }
  
  // Check if user's role matches decision authority level
  const roleHierarchy: Record<string, number> = {
    shareholder: 3,
    board: 2,
    manager: 1,
    employee: 0,
  };
  
  const requiredLevel = roleHierarchy[applicableDecision.authority_level] || 0;
  const userLevel = roleHierarchy[userRole] || 0;
  
  if (userLevel < requiredLevel) {
    return {
      is_allowed: false,
      error_message: `Wymagany poziom uprawnień: ${applicableDecision.authority_level}`,
    };
  }
  
  return { is_allowed: true };
}
