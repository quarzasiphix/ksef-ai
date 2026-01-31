import { supabase } from '@/integrations/supabase/client';
import type { 
  JournalEntry, 
  JournalLine, 
  CreateJournalEntryInput,
  CreateJournalLineInput,
  plnToGrosze,
  groszeToPln,
  validateJournalBalance
} from '../types/journal';

// Import helper functions
import { plnToGrosze as convertToGrosze, groszeToPln as convertToPln, validateJournalBalance as validate } from '../types/journal';

/**
 * Create a new journal entry with lines
 */
export async function createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
  // Validate balance first
  const validation = validate(input.lines);
  if (!validation.valid) {
    throw new Error(`Invalid journal entry: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // Create journal entry header
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      business_profile_id: input.business_profile_id,
      source_type: input.source_type,
      source_id: input.source_id,
      entry_date: input.entry_date,
      description: input.description,
      reference_number: input.reference_number,
      notes: input.notes,
      entry_status: 'draft',
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (entryError) throw entryError;
  if (!entry) throw new Error('Failed to create journal entry');

  // Create journal lines
  const linesData = input.lines.map(line => ({
    journal_entry_id: entry.id,
    account_id: line.account_id,
    side: line.side,
    amount_minor: convertToGrosze(line.amount),
    description: line.description,
    line_number: line.line_number,
  }));

  const { error: linesError } = await supabase
    .from('journal_lines')
    .insert(linesData);

  if (linesError) {
    // Rollback: delete the entry if lines failed
    await supabase.from('journal_entries').delete().eq('id', entry.id);
    throw linesError;
  }

  // Fetch complete entry with lines
  return getJournalEntry(entry.id);
}

/**
 * Get journal entry by ID with lines
 */
export async function getJournalEntry(id: string): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries_with_lines')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Journal entry not found');

  return data as JournalEntry;
}

/**
 * Get journal entries for a business profile
 */
export async function getJournalEntries(
  businessProfileId: string,
  options?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    sourceType?: string;
    limit?: number;
  }
): Promise<JournalEntry[]> {
  let query = supabase
    .from('journal_entries_with_lines')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('entry_date', { ascending: false });

  if (options?.status) {
    query = query.eq('entry_status', options.status);
  }

  if (options?.startDate) {
    query = query.gte('entry_date', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('entry_date', options.endDate);
  }

  if (options?.sourceType) {
    query = query.eq('source_type', options.sourceType);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as JournalEntry[];
}

/**
 * Post a journal entry (change status from draft to posted)
 */
export async function postJournalEntry(id: string): Promise<JournalEntry> {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  const { error } = await supabase
    .from('journal_entries')
    .update({
      entry_status: 'posted',
      posted_at: new Date().toISOString(),
      posted_by: userId,
    })
    .eq('id', id)
    .eq('entry_status', 'draft'); // Only post drafts

  if (error) throw error;

  return getJournalEntry(id);
}

/**
 * Update journal entry lines (only for drafts)
 */
export async function updateJournalLines(
  journalEntryId: string,
  lines: CreateJournalLineInput[]
): Promise<void> {
  // Validate balance
  const validation = validate(lines);
  if (!validation.valid) {
    throw new Error(`Invalid journal entry: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // Check if entry is draft
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .select('entry_status')
    .eq('id', journalEntryId)
    .single();

  if (entryError) throw entryError;
  if (entry.entry_status !== 'draft') {
    throw new Error('Can only update draft journal entries');
  }

  // Delete existing lines
  const { error: deleteError } = await supabase
    .from('journal_lines')
    .delete()
    .eq('journal_entry_id', journalEntryId);

  if (deleteError) throw deleteError;

  // Insert new lines
  const linesData = lines.map(line => ({
    journal_entry_id: journalEntryId,
    account_id: line.account_id,
    side: line.side,
    amount_minor: convertToGrosze(line.amount),
    description: line.description,
    line_number: line.line_number,
  }));

  const { error: insertError } = await supabase
    .from('journal_lines')
    .insert(linesData);

  if (insertError) throw insertError;
}

/**
 * Delete a journal entry (only drafts)
 */
export async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('entry_status', 'draft'); // Only delete drafts

  if (error) throw error;
}

/**
 * Reverse a posted journal entry
 */
export async function reverseJournalEntry(
  id: string,
  reason: string
): Promise<JournalEntry> {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  // Get original entry
  const original = await getJournalEntry(id);

  if (original.entry_status !== 'posted') {
    throw new Error('Can only reverse posted journal entries');
  }

  // Create reversing entry
  const reversingLines: CreateJournalLineInput[] = (original.lines || []).map(line => ({
    account_id: line.account_id,
    side: line.side === 'debit' ? 'credit' : 'debit', // Flip sides
    amount: line.amount || 0,
    description: `Reversal: ${line.description || ''}`,
    line_number: line.line_number,
  }));

  const reversingEntry = await createJournalEntry({
    business_profile_id: original.business_profile_id,
    source_type: original.source_type,
    source_id: original.source_id,
    entry_date: new Date().toISOString().split('T')[0],
    description: `Reversal of: ${original.description}`,
    reference_number: original.reference_number,
    notes: `Reversal reason: ${reason}`,
    lines: reversingLines,
  });

  // Post the reversing entry
  await postJournalEntry(reversingEntry.id);

  // Mark original as reversed
  await supabase
    .from('journal_entries')
    .update({
      entry_status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversed_by: userId,
      reversal_reason: reason,
    })
    .eq('id', id);

  // Link reversing entry to original
  await supabase
    .from('journal_entries')
    .update({
      reversal_of: id,
    })
    .eq('id', reversingEntry.id);

  return getJournalEntry(id);
}

/**
 * Get journal entries for an invoice
 */
export async function getInvoiceJournalEntries(invoiceId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries_with_lines')
    .select('*')
    .eq('source_type', 'invoice')
    .eq('source_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as JournalEntry[];
}

/**
 * Create journal entry from invoice
 */
export async function createJournalFromInvoice(
  invoiceId: string,
  lines: CreateJournalLineInput[]
): Promise<JournalEntry> {
  // Get invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('business_profile_id, number, issue_date, transaction_type, total_gross_value')
    .eq('id', invoiceId)
    .single();

  if (invoiceError) throw invoiceError;
  if (!invoice) throw new Error('Invoice not found');

  // Create journal entry
  const entry = await createJournalEntry({
    business_profile_id: invoice.business_profile_id,
    source_type: 'invoice',
    source_id: invoiceId,
    entry_date: invoice.issue_date,
    description: `${invoice.transaction_type === 'income' ? 'Sprzedaż' : 'Zakup'} - ${invoice.number}`,
    reference_number: invoice.number,
    lines,
  });

  // Update invoice posting status
  await supabase
    .from('invoices')
    .update({
      posting_status: 'draft',
      journal_entry_id: entry.id,
    })
    .eq('id', invoiceId);

  return entry;
}

/**
 * Post invoice journal entry and update invoice status
 */
export async function postInvoiceJournal(journalEntryId: string): Promise<void> {
  // Post the journal entry
  await postJournalEntry(journalEntryId);

  // Get the journal entry to find the invoice
  const entry = await getJournalEntry(journalEntryId);

  if (entry.source_type === 'invoice' && entry.source_id) {
    // Update invoice status
    await supabase
      .from('invoices')
      .update({
        posting_status: 'posted',
        accounting_status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq('id', entry.source_id);
  }
}
