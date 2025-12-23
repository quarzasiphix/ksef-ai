/**
 * Event Logging Utility
 * 
 * Simple pattern for logging events across the app.
 * Use this in any creation/mutation flow to ensure full audit trail.
 * 
 * ONLY FOR SPÓŁKI (sp. z o.o. and S.A.)
 */

import { logEvent } from '@/integrations/supabase/repositories/eventsRepository';
import type { EventType } from '@/shared/types/events';

interface LogEventParams {
  businessProfileId: string;
  eventType: EventType;
  entityType: string;
  entityId: string;
  entityReference: string;
  actionSummary: string;
  decisionId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Simple wrapper for logging events
 * Call this after any successful creation/mutation
 * 
 * @example
 * await logCreationEvent({
 *   businessProfileId: selectedProfileId,
 *   eventType: 'invoice_created',
 *   entityType: 'invoice',
 *   entityId: invoice.id,
 *   entityReference: invoice.number,
 *   actionSummary: `Utworzono fakturę ${invoice.number}`,
 *   decisionId: formData.decision_id,
 * });
 */
export async function logCreationEvent(params: LogEventParams): Promise<void> {
  try {
    await logEvent(
      params.businessProfileId,
      params.eventType,
      params.entityType,
      params.entityId,
      params.actionSummary,
      {
        decisionId: params.decisionId,
        entityReference: params.entityReference,
        changes: params.changes,
        metadata: params.metadata,
      }
    );
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('Failed to log event:', error);
  }
}

/**
 * Check if event logging should be enabled for this profile
 * Only Spółki get event logging
 */
export function shouldLogEvents(entityType?: string): boolean {
  return entityType === 'sp_zoo' || entityType === 'sa';
}

// ============================================
// COPY-PASTE TEMPLATES FOR COMMON ACTIONS
// ============================================

/**
 * TEMPLATE: Invoice Creation
 * 
 * Add this after successful invoice creation:
 * 
 * if (shouldLogEvents(selectedProfile?.entityType)) {
 *   await logCreationEvent({
 *     businessProfileId: selectedProfileId!,
 *     eventType: 'invoice_created',
 *     entityType: 'invoice',
 *     entityId: invoice.id,
 *     entityReference: invoice.number,
 *     actionSummary: `Utworzono fakturę ${invoice.number}`,
 *     decisionId: formData.decision_id,
 *     changes: {
 *       total_amount: invoice.total_gross_value,
 *       customer_id: invoice.customer_id,
 *     },
 *   });
 * }
 */

/**
 * TEMPLATE: Expense Creation
 * 
 * if (shouldLogEvents(selectedProfile?.entityType)) {
 *   await logCreationEvent({
 *     businessProfileId: selectedProfileId!,
 *     eventType: 'expense_created',
 *     entityType: 'expense',
 *     entityId: expense.id,
 *     entityReference: expense.description || 'Wydatek',
 *     actionSummary: `Utworzono wydatek: ${expense.description}`,
 *     decisionId: formData.decision_id,
 *     changes: {
 *       amount: expense.amount,
 *       category: expense.category,
 *     },
 *   });
 * }
 */

/**
 * TEMPLATE: Contract Creation
 * 
 * if (shouldLogEvents(selectedProfile?.entityType)) {
 *   await logCreationEvent({
 *     businessProfileId: selectedProfileId!,
 *     eventType: 'contract_created',
 *     entityType: 'contract',
 *     entityId: contract.id,
 *     entityReference: contract.number,
 *     actionSummary: `Utworzono umowę ${contract.number}`,
 *     decisionId: formData.decision_id,
 *     changes: {
 *       subject: contract.subject,
 *       counterparty: contract.counterparty_name,
 *     },
 *   });
 * }
 */

/**
 * TEMPLATE: Employee Hiring
 * 
 * if (shouldLogEvents(selectedProfile?.entityType)) {
 *   await logCreationEvent({
 *     businessProfileId: selectedProfileId!,
 *     eventType: 'employee_hired',
 *     entityType: 'employee',
 *     entityId: employee.id,
 *     entityReference: `${employee.first_name} ${employee.last_name}`,
 *     actionSummary: `Zatrudniono pracownika: ${employee.first_name} ${employee.last_name}`,
 *     decisionId: formData.decision_id,
 *     changes: {
 *       position: employee.position,
 *       start_date: employee.start_date,
 *     },
 *   });
 * }
 */

/**
 * TEMPLATE: Bank Account Addition
 * 
 * if (shouldLogEvents(selectedProfile?.entityType)) {
 *   await logCreationEvent({
 *     businessProfileId: selectedProfileId!,
 *     eventType: 'bank_account_added',
 *     entityType: 'bank_account',
 *     entityId: account.id,
 *     entityReference: account.account_number,
 *     actionSummary: `Dodano konto bankowe: ${account.account_number}`,
 *     decisionId: formData.decision_id,
 *     changes: {
 *       bank_name: account.bank_name,
 *       currency: account.currency,
 *     },
 *   });
 * }
 */

/**
 * TEMPLATE: Customer Creation
 * 
 * if (shouldLogEvents(selectedProfile?.entityType)) {
 *   await logCreationEvent({
 *     businessProfileId: selectedProfileId!,
 *     eventType: 'document_uploaded', // or create custom event type
 *     entityType: 'customer',
 *     entityId: customer.id,
 *     entityReference: customer.name,
 *     actionSummary: `Dodano kontrahenta: ${customer.name}`,
 *     changes: {
 *       nip: customer.nip,
 *       type: customer.type,
 *     },
 *   });
 * }
 */

/**
 * TEMPLATE: Product Creation
 * 
 * if (shouldLogEvents(selectedProfile?.entityType)) {
 *   await logCreationEvent({
 *     businessProfileId: selectedProfileId!,
 *     eventType: 'document_uploaded', // or create custom event type
 *     entityType: 'product',
 *     entityId: product.id,
 *     entityReference: product.name,
 *     actionSummary: `Dodano produkt: ${product.name}`,
 *     changes: {
 *       price: product.price,
 *       unit: product.unit,
 *     },
 *   });
 * }
 */
