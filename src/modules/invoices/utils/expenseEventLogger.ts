/**
 * Expense Event Logger
 * 
 * Centralized event logging for expense lifecycle operations.
 * Ensures no silent state changes - every expense CRUD operation creates an event.
 */

import { logEvent } from '@/modules/accounting/data/unifiedEventsRepository';

interface ExpenseEventMetadata {
  amount?: number;
  currency?: string;
  category?: string;
  supplier?: string;
  invoice_number?: string;
  payment_method?: string;
  bank_transaction_id?: string;
  [key: string]: any;
}

/**
 * Log expense created event
 */
export async function logExpenseCreated(
  businessProfileId: string,
  expenseId: string,
  expenseNumber: string,
  metadata: ExpenseEventMetadata = {}
): Promise<void> {
  await logEvent(
    businessProfileId,
    'expense_created',
    'expense',
    expenseId,
    `Wydatek utworzony: ${expenseNumber}`,
    {
      metadata: {
        amount: metadata.amount,
        currency: metadata.currency || 'PLN',
        category: metadata.category,
        supplier: metadata.supplier,
        invoice_number: metadata.invoice_number,
      }
    }
  );
}

/**
 * Log expense edited event
 */
export async function logExpenseEdited(
  businessProfileId: string,
  expenseId: string,
  expenseNumber: string,
  changes: Record<string, any> = {},
  metadata: ExpenseEventMetadata = {}
): Promise<void> {
  await logEvent(
    businessProfileId,
    'expense_edited',
    'expense',
    expenseId,
    `Wydatek zmodyfikowany: ${expenseNumber}`,
    {
      changes,
      metadata: {
        amount: metadata.amount,
        currency: metadata.currency || 'PLN',
      }
    }
  );
}

/**
 * Log expense paid event
 */
export async function logExpensePaid(
  businessProfileId: string,
  expenseId: string,
  expenseNumber: string,
  metadata: ExpenseEventMetadata = {}
): Promise<void> {
  await logEvent(
    businessProfileId,
    'expense_paid',
    'expense',
    expenseId,
    `Wydatek opłacony: ${expenseNumber}`,
    {
      metadata: {
        amount: metadata.amount,
        currency: metadata.currency || 'PLN',
        payment_method: metadata.payment_method || 'bank_transfer',
        bank_transaction_id: metadata.bank_transaction_id,
        paid_at: new Date().toISOString(),
      }
    }
  );
}

/**
 * Log expense cancelled event
 */
export async function logExpenseCancelled(
  businessProfileId: string,
  expenseId: string,
  expenseNumber: string,
  reason?: string
): Promise<void> {
  await logEvent(
    businessProfileId,
    'expense_cancelled',
    'expense',
    expenseId,
    `Wydatek anulowany: ${expenseNumber}`,
    {
      metadata: {
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      }
    }
  );
}

/**
 * Log expense deleted event
 */
export async function logExpenseDeleted(
  businessProfileId: string,
  expenseId: string,
  expenseNumber: string,
  reason?: string
): Promise<void> {
  await logEvent(
    businessProfileId,
    'expense_deleted',
    'expense',
    expenseId,
    `Wydatek usunięty: ${expenseNumber}`,
    {
      metadata: {
        deletion_reason: reason,
        deleted_at: new Date().toISOString(),
      }
    }
  );
}
