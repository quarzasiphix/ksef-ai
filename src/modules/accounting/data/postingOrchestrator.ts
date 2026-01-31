import { supabase } from '@/integrations/supabase/client';
import type { PostingFacts } from '../types/postingFacts';
import { invoiceToPostingFacts, validatePostingFacts } from '../types/postingFacts';
import { autoPostInvoiceWithJournal } from './autoPostingRules';

export type PostingTrigger = 
  | 'invoice_issued'
  | 'ksef_submitted'
  | 'upo_available'
  | 'payment_registered'
  | 'manual_request';

export interface OrchestratorResult {
  success: boolean;
  action: 'noop' | 'skipped' | 'deferred' | 'queued' | 'auto_post' | 'manual_post' | 'rejected';
  reason: string;
  journal_entry_id?: string;
  policy?: string;
  trigger?: string;
  error?: string;
}

/**
 * Orchestrate posting for an invoice (idempotent)
 * 
 * This is the central entry point for all posting operations.
 * It evaluates business profile policy and current state to determine
 * if posting should proceed.
 */
export async function orchestratePostingForInvoice(
  invoiceId: string,
  trigger: PostingTrigger
): Promise<OrchestratorResult> {
  try {
    // Call database orchestrator function
    const { data, error } = await supabase.rpc('orchestrate_posting_for_invoice', {
      p_invoice_id: invoiceId,
      p_trigger: trigger,
    });

    if (error) throw error;

    const result = data as OrchestratorResult;

    // If orchestrator says to post, execute posting
    if (result.action === 'auto_post' || result.action === 'manual_post') {
      const postingResult = await executePosting(invoiceId, trigger);
      return postingResult;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      action: 'rejected',
      reason: 'Orchestration failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute actual posting logic
 */
async function executePosting(
  invoiceId: string,
  trigger: PostingTrigger
): Promise<OrchestratorResult> {
  try {
    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error('Invoice not found');

    // Convert to posting facts
    const facts = invoiceToPostingFacts(invoice);

    // Validate facts
    const validation = validatePostingFacts(facts);
    if (!validation.valid) {
      // Mark as needs review
      await supabase
        .from('invoices')
        .update({
          posting_status: 'needs_review',
          accounting_error_reason: validation.errors.join('; '),
        })
        .eq('id', invoiceId);

      return {
        success: false,
        action: 'rejected',
        reason: 'Validation failed',
        error: validation.errors.join('; '),
      };
    }

    // Execute auto-posting with journal
    const postingResult = await autoPostInvoiceWithJournal(invoiceId);

    if (postingResult.success && postingResult.posted) {
      // Update journal with KSeF references if available
      if (postingResult.journal_entry_id && facts.ksef_reference_number) {
        await supabase
          .from('journal_entries')
          .update({
            ksef_reference_number: facts.ksef_reference_number,
            ksef_session_reference_number: facts.ksef_session_reference_number,
            ksef_upo_url: facts.ksef_upo_url,
          })
          .eq('id', postingResult.journal_entry_id);
      }

      return {
        success: true,
        action: trigger === 'manual_request' ? 'manual_post' : 'auto_post',
        reason: 'Posted successfully',
        journal_entry_id: postingResult.journal_entry_id,
      };
    } else if (postingResult.needs_review) {
      return {
        success: true,
        action: 'queued',
        reason: postingResult.reason || 'Needs manual review',
      };
    } else {
      return {
        success: false,
        action: 'rejected',
        reason: postingResult.reason || 'Posting failed',
        error: postingResult.reason,
      };
    }
  } catch (error) {
    return {
      success: false,
      action: 'rejected',
      reason: 'Posting execution failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Hook for KSeF submission success
 * Call this when KSeF submission succeeds
 */
export async function onKsefSubmissionSuccess(invoiceId: string): Promise<void> {
  const result = await orchestratePostingForInvoice(invoiceId, 'ksef_submitted');
  
  if (!result.success && result.error) {
    console.error('Failed to orchestrate posting after KSeF submission:', result.error);
  }
}

/**
 * Hook for UPO receipt
 * Call this when UPO is received from KSeF
 */
export async function onKsefUpoReceived(invoiceId: string): Promise<void> {
  const result = await orchestratePostingForInvoice(invoiceId, 'upo_available');
  
  if (!result.success && result.error) {
    console.error('Failed to orchestrate posting after UPO receipt:', result.error);
  }
}

/**
 * Hook for payment registration
 * Call this when payment is matched to invoice
 */
export async function onPaymentRegistered(invoiceId: string): Promise<void> {
  const result = await orchestratePostingForInvoice(invoiceId, 'payment_registered');
  
  if (!result.success && result.error) {
    console.error('Failed to orchestrate posting after payment:', result.error);
  }
}

/**
 * Manual posting request from UI
 */
export async function requestManualPosting(invoiceId: string): Promise<OrchestratorResult> {
  return orchestratePostingForInvoice(invoiceId, 'manual_request');
}

/**
 * Batch orchestration for multiple invoices
 */
export async function orchestrateBatchPosting(
  invoiceIds: string[],
  trigger: PostingTrigger
): Promise<{
  success: number;
  failed: number;
  skipped: number;
  results: Array<{ invoice_id: string; result: OrchestratorResult }>;
}> {
  const results: Array<{ invoice_id: string; result: OrchestratorResult }> = [];
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const invoiceId of invoiceIds) {
    const result = await orchestratePostingForInvoice(invoiceId, trigger);
    results.push({ invoice_id: invoiceId, result });

    if (result.success) {
      if (result.action === 'auto_post' || result.action === 'manual_post') {
        success++;
      } else {
        skipped++;
      }
    } else {
      failed++;
    }
  }

  return { success, failed, skipped, results };
}
