import { supabase } from '@/integrations/supabase/client';
import { createCashTransaction } from './kasaRepository';
import { createJournalEntry } from './accountingRepository';
import { logEvent } from './unifiedEventsRepository';
import type { CapitalEvent, CapitalEventWizardData } from '@/modules/accounting/types/capital';
import type { JournalEntryLine } from '@/modules/accounting/accounting';

export interface CreateCapitalEventInput {
  business_profile_id: string;
  event_type: CapitalEvent['event_type'];
  event_date: string;
  amount: number;
  shareholder_id?: string;
  shareholder_name: string;
  description?: string;
  
  // Payment details
  payment_method: 'cash' | 'bank' | 'none';
  cash_account_id?: string;
  bank_account_id?: string;
  
  // Decision link
  resolution_id?: string;
  
  // Accounting
  generate_ledger_entry?: boolean;
  debit_account?: string;
  credit_account?: string;
}

export async function getCapitalEvents(businessProfileId: string): Promise<CapitalEvent[]> {
  const { data, error } = await supabase
    .from('capital_events')
    .select(`
      *,
      shareholders(id, name, share_percentage),
      resolutions(id, resolution_number, title),
      kasa_documents(id, document_number, amount, payment_date),
      journal_entries(id, entry_date, description)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('event_date', { ascending: false });

  if (error) throw error;

  return (data || []).map(mapToCapitalEvent);
}

export async function getCapitalEvent(id: string): Promise<CapitalEvent | null> {
  const { data, error } = await supabase
    .from('capital_events')
    .select(`
      *,
      shareholders(id, name, share_percentage),
      resolutions(id, resolution_number, title),
      kasa_documents(id, document_number, amount, payment_date),
      journal_entries(id, entry_date, description)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return mapToCapitalEvent(data);
}

export async function createCapitalEvent(input: CreateCapitalEventInput): Promise<CapitalEvent> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  // Start transaction by creating the capital event first
  const { data: capitalEvent, error: eventError } = await supabase
    .from('capital_events')
    .insert({
      business_profile_id: input.business_profile_id,
      event_type: input.event_type,
      event_date: input.event_date,
      amount: input.amount,
      shareholder_id: input.shareholder_id || null,
      description: input.description || null,
      resolution_id: input.resolution_id || null,
      payment_method: input.payment_method,
      cash_account_id: input.cash_account_id || null,
      bank_account_id: input.bank_account_id || null,
      payment_status: input.payment_method === 'none' ? 'pending' : 'paid',
      ledger_status: input.generate_ledger_entry ? 'posted' : 'not_posted',
      affects_balance_sheet: true,
      balance_sheet_line: 'equity',
      created_by: user.id,
    })
    .select()
    .single();

  if (eventError) throw eventError;

  let kpDocumentId: string | undefined;
  let journalEntryId: string | undefined;

  try {
    // If payment is cash, create KP document
    if (input.payment_method === 'cash' && input.cash_account_id) {
      const kpDoc = await createCashTransaction({
        business_profile_id: input.business_profile_id,
        cash_account_id: input.cash_account_id,
        type: 'KP',
        amount: input.amount,
        date: input.event_date,
        description: `Wniesienie kapitału - ${input.shareholder_name}${input.description ? ': ' + input.description : ''}`,
        counterparty_name: input.shareholder_name,
        category: 'capital_contribution',
        linked_document_type: 'capital_event',
        linked_document_id: capitalEvent.id,
        is_tax_deductible: false,
        accounting_origin: 'manual',
      });

      kpDocumentId = kpDoc.id;

      // Update kasa_document with capital_event_id
      await supabase
        .from('kasa_documents')
        .update({ capital_event_id: capitalEvent.id })
        .eq('id', kpDoc.id);
    }

    // If generate ledger entry is requested
    if (input.generate_ledger_entry && input.debit_account && input.credit_account) {
      const lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id' | 'created_at'>[] = [
        {
          account_id: input.debit_account,
          description: `Wniesienie kapitału - ${input.shareholder_name}`,
          debit_amount: input.amount,
          credit_amount: 0,
        },
        {
          account_id: input.credit_account,
          description: `Wniesienie kapitału - ${input.shareholder_name}`,
          debit_amount: 0,
          credit_amount: input.amount,
        },
      ];

      const journalEntry = await createJournalEntry(
        {
          business_profile_id: input.business_profile_id,
          user_id: user.id,
          entry_date: input.event_date,
          description: `Zdarzenie kapitałowe: ${input.event_type} - ${input.shareholder_name}`,
          document_number: `CAP-${capitalEvent.id.substring(0, 8)}`,
          is_posted: true,
        },
        lines
      );

      journalEntryId = journalEntry.id;
    }

    // Update capital event with links
    const { data: updatedEvent, error: updateError } = await supabase
      .from('capital_events')
      .update({
        kp_document_id: kpDocumentId || null,
        journal_entry_id: journalEntryId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', capitalEvent.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log event
    await logEvent(
      input.business_profile_id,
      'capital_event',
      'capital_contribution',
      capitalEvent.id,
      `Zdarzenie kapitałowe: ${input.event_type} - ${input.shareholder_name} - ${input.amount} PLN`,
      {
        entityReference: `CAP-${capitalEvent.id.substring(0, 8)}`,
        amount: input.amount,
        currency: 'PLN',
        changes: {
          event_type: input.event_type,
          shareholder_name: input.shareholder_name,
          payment_method: input.payment_method,
          has_kp_document: !!kpDocumentId,
          has_journal_entry: !!journalEntryId,
        },
        metadata: {
          description: input.description,
          event_date: input.event_date,
          kp_document_id: kpDocumentId,
          journal_entry_id: journalEntryId,
        },
      }
    );

    return mapToCapitalEvent(updatedEvent);
  } catch (error) {
    // Rollback: delete the capital event if something failed
    await supabase.from('capital_events').delete().eq('id', capitalEvent.id);
    throw error;
  }
}

export async function createCapitalEventFromWizard(
  wizardData: CapitalEventWizardData,
  businessProfileId: string
): Promise<CapitalEvent[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const createdEvents: CapitalEvent[] = [];

  // Create capital event for each shareholder
  for (const shareholder of wizardData.shareholders) {
    if (!shareholder.shareholder_name || shareholder.amount <= 0) continue;

    const input: CreateCapitalEventInput = {
      business_profile_id: businessProfileId,
      event_type: wizardData.event_type,
      event_date: wizardData.event_date,
      amount: shareholder.amount,
      shareholder_id: shareholder.shareholder_id,
      shareholder_name: shareholder.shareholder_name,
      description: `Zdarzenie kapitałowe: ${wizardData.event_type}`,
      payment_method: wizardData.payment_option === 'to_be_paid' ? 'none' : 
                     (wizardData.payment_type === 'cash_document' ? 'cash' : 'bank'),
      cash_account_id: wizardData.cash_account_id,
      bank_account_id: wizardData.bank_account_id,
      resolution_id: wizardData.decision_id,
      generate_ledger_entry: wizardData.posting_option === 'generate_now',
      debit_account: wizardData.debit_account,
      credit_account: wizardData.credit_account,
    };

    const event = await createCapitalEvent(input);
    createdEvents.push(event);
  }

  return createdEvents;
}

export async function generateKPReportForCapitalEvent(capitalEventId: string): Promise<string> {
  const event = await getCapitalEvent(capitalEventId);
  if (!event) throw new Error('Capital event not found');

  const { data: kpDoc } = await supabase
    .from('kasa_documents')
    .select('*')
    .eq('id', event.links.payment_id!)
    .single();

  if (!kpDoc) throw new Error('KP document not found');

  // Generate KP report content
  const report = `
KASA PRZYJMIE (KP)
Dokument nr: ${kpDoc.document_number}
Data: ${new Date(kpDoc.payment_date).toLocaleDateString('pl-PL')}

WNIESIENIE KAPITAŁU DO SPÓŁKI

Przyjęto od: ${event.shareholder_name}
Kwota: ${event.amount.toFixed(2)} PLN
Słownie: ${numberToPolishWords(event.amount)} złotych

Tytuł wpłaty: ${event.description || 'Wniesienie kapitału zakładowego'}
Typ zdarzenia: ${getEventTypeLabel(event.event_type)}

Podstawa prawna: ${event.decision_reference?.decision_number || 'Brak powiązania z uchwałą'}

Data zdarzenia kapitałowego: ${new Date(event.event_date).toLocaleDateString('pl-PL')}

Przyjął: _______________________
Data: ${new Date().toLocaleDateString('pl-PL')}

---
Dokument wygenerowany automatycznie przez system KsięgaI
ID zdarzenia kapitałowego: ${capitalEventId}
  `.trim();

  return report;
}

function mapToCapitalEvent(data: any): CapitalEvent {
  return {
    id: data.id,
    business_profile_id: data.business_profile_id,
    event_type: data.event_type,
    event_date: data.event_date,
    amount: parseFloat(data.amount),
    currency: 'PLN',
    shareholder_id: data.shareholder_id,
    shareholder_name: data.shareholders?.name || 'Nieznany wspólnik',
    links: {
      decision_id: data.resolution_id,
      decision_reference: data.resolutions?.resolution_number,
      decision_type: 'shareholder_resolution',
      decision_date: data.resolutions?.resolution_date,
      payment_id: data.kp_document_id,
      payment_type: data.payment_method === 'cash' ? 'cash_document' : 'bank_transaction',
      payment_reference: data.kasa_documents?.document_number,
      payment_date: data.kasa_documents?.payment_date,
      cash_account_id: data.cash_account_id,
      bank_account_id: data.bank_account_id,
      ledger_entry_id: data.journal_entry_id,
      ledger_posting_date: data.journal_entries?.entry_date,
    },
    status: data.payment_status === 'paid' && data.ledger_status === 'posted' ? 'completed' : 
            data.payment_status === 'cancelled' ? 'cancelled' : 'pending',
    has_decision: !!data.resolution_id,
    has_payment: data.payment_status === 'paid',
    has_ledger_entry: data.ledger_status === 'posted',
    decision_reference: data.resolutions ? {
      decision_id: data.resolution_id,
      decision_title: data.resolutions.title,
      decision_number: data.resolutions.resolution_number,
      decision_status: 'active',
      is_valid: true,
    } : undefined,
    description: data.description,
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by: data.created_by,
  };
}

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    capital_contribution: 'Wniesienie kapitału',
    capital_withdrawal: 'Wypłata kapitału',
    dividend: 'Dywidenda',
    capital_increase: 'Podwyższenie kapitału',
    supplementary_payment: 'Dopłata (art. 177 KSH)',
    retained_earnings: 'Zyski zatrzymane',
    other: 'Inne',
  };
  return labels[type] || type;
}

function numberToPolishWords(num: number): string {
  // Simplified Polish number to words conversion
  const ones = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
  const teens = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
  const tens = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
  const hundreds = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];
  const thousands = ['', 'tysiąc', 'tysiące', 'tysięcy'];

  if (num === 0) return 'zero';
  if (num >= 1000000) return num.toFixed(2);

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let result = '';

  // Thousands
  const thou = Math.floor(intPart / 1000);
  if (thou > 0) {
    if (thou === 1) result += 'tysiąc ';
    else if (thou < 5) result += ones[thou] + ' tysiące ';
    else result += ones[thou] + ' tysięcy ';
  }

  // Hundreds, tens, ones
  const remainder = intPart % 1000;
  const hund = Math.floor(remainder / 100);
  const ten = Math.floor((remainder % 100) / 10);
  const one = remainder % 10;

  if (hund > 0) result += hundreds[hund] + ' ';
  if (ten === 1) result += teens[one] + ' ';
  else {
    if (ten > 1) result += tens[ten] + ' ';
    if (one > 0 && ten !== 1) result += ones[one] + ' ';
  }

  if (decPart > 0) {
    result += `i ${decPart}/100`;
  }

  return result.trim();
}
