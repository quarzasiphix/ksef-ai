import { supabase } from '@/integrations/supabase/client';
import type { CreateJournalLineInput } from '../types/journal';
import { createJournalFromInvoice, postInvoiceJournal } from './journalRepository';

interface Invoice {
  id: string;
  number: string;
  issue_date: string;
  transaction_type: 'income' | 'expense';
  total_net_value: number;
  total_vat_value: number;
  total_gross_value: number;
  customer_id?: string;
  business_profile_id: string;
}

interface AccountMapping {
  confidence: 'high' | 'medium' | 'low';
  lines: CreateJournalLineInput[];
  reason?: string;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
}

/**
 * Get default accounts for a business profile
 */
async function getDefaultAccounts(businessProfileId: string): Promise<Map<string, ChartAccount>> {
  const { data: accounts, error } = await supabase
    .from('chart_accounts')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('is_active', true);

  if (error) throw error;

  const accountMap = new Map<string, ChartAccount>();
  
  // Map by code for easy lookup
  (accounts || []).forEach(account => {
    accountMap.set(account.code, account as ChartAccount);
  });

  return accountMap;
}

/**
 * Determine Chart of Accounts mapping for an invoice
 */
async function determineAccountMapping(invoice: Invoice): Promise<AccountMapping> {
  const accounts = await getDefaultAccounts(invoice.business_profile_id);

  // Helper to find account by code
  const findAccount = (code: string): ChartAccount | undefined => {
    return accounts.get(code);
  };

  // Income (Sales) Invoice
  if (invoice.transaction_type === 'income') {
    const receivables = findAccount('201'); // Należności z tytułu dostaw i usług
    const revenue = findAccount('700'); // Przychody ze sprzedaży produktów
    const vatPayable = findAccount('221'); // VAT należny

    if (!receivables || !revenue || !vatPayable) {
      return {
        confidence: 'low',
        lines: [],
        reason: 'Missing required accounts: 201 (Receivables), 700 (Revenue), or 221 (VAT Payable)',
      };
    }

    return {
      confidence: 'high',
      lines: [
        {
          account_id: receivables.id,
          side: 'debit',
          amount: invoice.total_gross_value,
          description: 'Należności od klienta',
          line_number: 1,
        },
        {
          account_id: revenue.id,
          side: 'credit',
          amount: invoice.total_net_value,
          description: 'Przychód ze sprzedaży',
          line_number: 2,
        },
        {
          account_id: vatPayable.id,
          side: 'credit',
          amount: invoice.total_vat_value,
          description: 'VAT należny',
          line_number: 3,
        },
      ],
    };
  }

  // Expense (Purchase) Invoice
  if (invoice.transaction_type === 'expense') {
    const payables = findAccount('202'); // Zobowiązania z tytułu dostaw i usług
    const expense = findAccount('400'); // Koszty według rodzajów
    const vatReceivable = findAccount('222'); // VAT naliczony

    if (!payables || !expense || !vatReceivable) {
      return {
        confidence: 'low',
        lines: [],
        reason: 'Missing required accounts: 202 (Payables), 400 (Expenses), or 222 (VAT Receivable)',
      };
    }

    return {
      confidence: 'high',
      lines: [
        {
          account_id: expense.id,
          side: 'debit',
          amount: invoice.total_net_value,
          description: 'Koszt zakupu',
          line_number: 1,
        },
        {
          account_id: vatReceivable.id,
          side: 'debit',
          amount: invoice.total_vat_value,
          description: 'VAT naliczony',
          line_number: 2,
        },
        {
          account_id: payables.id,
          side: 'credit',
          amount: invoice.total_gross_value,
          description: 'Zobowiązanie wobec dostawcy',
          line_number: 3,
        },
      ],
    };
  }

  return {
    confidence: 'low',
    lines: [],
    reason: 'Unknown transaction type',
  };
}

/**
 * Auto-post a single invoice with journal entry
 */
export async function autoPostInvoiceWithJournal(invoiceId: string): Promise<{
  success: boolean;
  posted: boolean;
  needs_review: boolean;
  reason?: string;
  journal_entry_id?: string;
}> {
  try {
    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error('Invoice not found');

    // Check if already posted
    if (invoice.posting_status === 'posted') {
      return {
        success: true,
        posted: false,
        needs_review: false,
        reason: 'Invoice already posted',
      };
    }

    // Determine account mapping
    const mapping = await determineAccountMapping(invoice as Invoice);

    // High confidence - auto-post
    if (mapping.confidence === 'high' && mapping.lines.length > 0) {
      const journalEntry = await createJournalFromInvoice(invoiceId, mapping.lines);
      await postInvoiceJournal(journalEntry.id);

      return {
        success: true,
        posted: true,
        needs_review: false,
        journal_entry_id: journalEntry.id,
      };
    }

    // Low confidence - mark for review
    await supabase
      .from('invoices')
      .update({
        posting_status: 'needs_review',
        accounting_error_reason: mapping.reason || 'Unable to determine account mapping automatically',
      })
      .eq('id', invoiceId);

    return {
      success: true,
      posted: false,
      needs_review: true,
      reason: mapping.reason,
    };
  } catch (error) {
    // Mark as error
    await supabase
      .from('invoices')
      .update({
        posting_status: 'error',
        accounting_error_reason: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', invoiceId);

    return {
      success: false,
      posted: false,
      needs_review: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Auto-post multiple invoices in batch
 */
export async function autoPostPendingInvoices(
  businessProfileId: string,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{
  success: boolean;
  posted_count: number;
  review_count: number;
  error_count: number;
  errors: Array<{ invoice_id: string; invoice_number: string; error: string }>;
}> {
  const limit = options?.limit || 100;

  // Get unposted invoices
  let query = supabase
    .from('invoices')
    .select('id, number')
    .eq('business_profile_id', businessProfileId)
    .eq('posting_status', 'unposted')
    .eq('acceptance_status', 'accepted')
    .order('issue_date', { ascending: true })
    .limit(limit);

  if (options?.startDate) {
    query = query.gte('issue_date', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('issue_date', options.endDate);
  }

  const { data: invoices, error: queryError } = await query;

  if (queryError) throw queryError;

  let posted_count = 0;
  let review_count = 0;
  let error_count = 0;
  const errors: Array<{ invoice_id: string; invoice_number: string; error: string }> = [];

  // Process each invoice
  for (const invoice of invoices || []) {
    const result = await autoPostInvoiceWithJournal(invoice.id);

    if (result.posted) {
      posted_count++;
    } else if (result.needs_review) {
      review_count++;
    } else if (!result.success) {
      error_count++;
      errors.push({
        invoice_id: invoice.id,
        invoice_number: invoice.number,
        error: result.reason || 'Unknown error',
      });
    }
  }

  return {
    success: true,
    posted_count,
    review_count,
    error_count,
    errors,
  };
}

/**
 * Get posting statistics for a business profile
 */
export async function getPostingStats(businessProfileId: string): Promise<{
  total_invoices: number;
  posted: number;
  unposted: number;
  needs_review: number;
  error: number;
}> {
  const { data, error } = await supabase
    .from('invoices')
    .select('posting_status')
    .eq('business_profile_id', businessProfileId);

  if (error) throw error;

  const stats = {
    total_invoices: data?.length || 0,
    posted: 0,
    unposted: 0,
    needs_review: 0,
    error: 0,
  };

  (data || []).forEach(invoice => {
    const status = invoice.posting_status || 'unposted';
    if (status === 'posted') stats.posted++;
    else if (status === 'unposted') stats.unposted++;
    else if (status === 'needs_review') stats.needs_review++;
    else if (status === 'error') stats.error++;
  });

  return stats;
}
