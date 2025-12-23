import { supabase } from '../client';
import type {
  CapitalEvent,
  Resolution,
  ExpenseBatch,
  ExpenseBatchItem,
  Contract,
  ContractMilestone,
  TaxObligation,
  TaxObligationAttachment,
  PkdCode,
} from '@/shared/types/spolka';

// ============================================
// PKD CODES
// ============================================

export async function getPkdCodes(businessProfileId: string): Promise<PkdCode[]> {
  const { data, error } = await supabase
    .from('business_profile_pkd_codes')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('is_main', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function savePkdCode(code: Omit<PkdCode, 'id' | 'created_at'>): Promise<PkdCode> {
  const { data, error } = await supabase
    .from('business_profile_pkd_codes')
    .upsert(code, { onConflict: 'business_profile_id,pkd_code' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePkdCode(id: string): Promise<void> {
  const { error } = await supabase
    .from('business_profile_pkd_codes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// CAPITAL EVENTS
// ============================================

export async function getCapitalEvents(businessProfileId: string): Promise<CapitalEvent[]> {
  const { data, error } = await supabase
    .from('capital_events')
    .select(`
      *,
      shareholders(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('event_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(event => ({
    ...event,
    shareholder_name: event.shareholders?.name,
  }));
}

export async function saveCapitalEvent(
  event: Omit<CapitalEvent, 'id' | 'created_at' | 'updated_at' | 'shareholder_name'>
): Promise<CapitalEvent> {
  const { data, error } = await supabase
    .from('capital_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCapitalEvent(
  id: string,
  event: Partial<CapitalEvent>
): Promise<CapitalEvent> {
  const { data, error } = await supabase
    .from('capital_events')
    .update({ ...event, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCapitalEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('capital_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// RESOLUTIONS
// ============================================

export async function getResolutions(businessProfileId: string): Promise<Resolution[]> {
  const { data, error } = await supabase
    .from('resolutions')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('resolution_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getResolutionsByYear(
  businessProfileId: string,
  fiscalYear: number
): Promise<Resolution[]> {
  const { data, error } = await supabase
    .from('resolutions')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('fiscal_year', fiscalYear)
    .order('resolution_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveResolution(
  resolution: Omit<Resolution, 'id' | 'created_at' | 'updated_at'>
): Promise<Resolution> {
  const { data, error } = await supabase
    .from('resolutions')
    .insert(resolution)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateResolution(
  id: string,
  resolution: Partial<Resolution>
): Promise<Resolution> {
  const { data, error } = await supabase
    .from('resolutions')
    .update({ ...resolution, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteResolution(id: string): Promise<void> {
  const { error } = await supabase
    .from('resolutions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// EXPENSE BATCHES
// ============================================

export async function getExpenseBatches(businessProfileId: string): Promise<ExpenseBatch[]> {
  const { data, error } = await supabase
    .from('expense_batches')
    .select(`
      *,
      expense_batch_items(*)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(batch => ({
    ...batch,
    items: batch.expense_batch_items || [],
  }));
}

export async function saveExpenseBatch(
  batch: Omit<ExpenseBatch, 'id' | 'created_at' | 'updated_at' | 'items'>
): Promise<ExpenseBatch> {
  const { data, error } = await supabase
    .from('expense_batches')
    .insert(batch)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExpenseBatch(
  id: string,
  batch: Partial<ExpenseBatch>
): Promise<ExpenseBatch> {
  const { items, ...updateData } = batch;
  const { data, error } = await supabase
    .from('expense_batches')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpenseBatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('expense_batches')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function addExpenseBatchItem(
  item: Omit<ExpenseBatchItem, 'id' | 'created_at'>
): Promise<ExpenseBatchItem> {
  const { data, error } = await supabase
    .from('expense_batch_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpenseBatchItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('expense_batch_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// CONTRACTS
// ============================================

export async function getContracts(businessProfileId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      customers(name),
      contract_milestones(*),
      invoices(id, invoice_number, total_gross_value, issue_date)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(contract => ({
    ...contract,
    customer_name: contract.customers?.name,
    milestones: contract.contract_milestones || [],
    invoices: contract.invoices || [],
  }));
}

export async function getContractById(id: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      customers(name),
      contract_milestones(*),
      invoices(id, invoice_number, total_gross_value, issue_date)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return {
    ...data,
    customer_name: data.customers?.name,
    milestones: data.contract_milestones || [],
    invoices: data.invoices || [],
  };
}

export async function saveContract(
  contract: Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'customer_name' | 'milestones' | 'invoices'>
): Promise<Contract> {
  const { data, error } = await supabase
    .from('contracts')
    .insert(contract)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateContract(
  id: string,
  contract: Partial<Contract>
): Promise<Contract> {
  const { customer_name, milestones, invoices, ...updateData } = contract;
  const { data, error } = await supabase
    .from('contracts')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Contract Milestones
export async function saveContractMilestone(
  milestone: Omit<ContractMilestone, 'id' | 'created_at'>
): Promise<ContractMilestone> {
  const { data, error } = await supabase
    .from('contract_milestones')
    .insert(milestone)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateContractMilestone(
  id: string,
  milestone: Partial<ContractMilestone>
): Promise<ContractMilestone> {
  const { data, error } = await supabase
    .from('contract_milestones')
    .update(milestone)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContractMilestone(id: string): Promise<void> {
  const { error } = await supabase
    .from('contract_milestones')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// TAX OBLIGATIONS
// ============================================

export async function getTaxObligations(businessProfileId: string): Promise<TaxObligation[]> {
  const { data, error } = await supabase
    .from('tax_obligations')
    .select(`
      *,
      tax_obligation_attachments(*)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(obligation => ({
    ...obligation,
    attachments: obligation.tax_obligation_attachments || [],
  }));
}

export async function getTaxObligationsByStatus(
  businessProfileId: string,
  status: string
): Promise<TaxObligation[]> {
  const { data, error } = await supabase
    .from('tax_obligations')
    .select(`
      *,
      tax_obligation_attachments(*)
    `)
    .eq('business_profile_id', businessProfileId)
    .eq('status', status)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(obligation => ({
    ...obligation,
    attachments: obligation.tax_obligation_attachments || [],
  }));
}

export async function saveTaxObligation(
  obligation: Omit<TaxObligation, 'id' | 'created_at' | 'updated_at' | 'attachments'>
): Promise<TaxObligation> {
  const { data, error } = await supabase
    .from('tax_obligations')
    .insert(obligation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTaxObligation(
  id: string,
  obligation: Partial<TaxObligation>
): Promise<TaxObligation> {
  const { attachments, ...updateData } = obligation;
  const { data, error } = await supabase
    .from('tax_obligations')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTaxObligation(id: string): Promise<void> {
  const { error } = await supabase
    .from('tax_obligations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Tax Obligation State Transitions
export async function markTaxObligationSubmitted(
  id: string,
  confirmationNumber?: string
): Promise<TaxObligation> {
  return updateTaxObligation(id, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    confirmation_number: confirmationNumber,
  });
}

export async function markTaxObligationPaid(
  id: string,
  amountPaid: number
): Promise<TaxObligation> {
  return updateTaxObligation(id, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    amount_paid: amountPaid,
  });
}

// Tax Obligation Attachments
export async function addTaxObligationAttachment(
  attachment: Omit<TaxObligationAttachment, 'id' | 'uploaded_at'>
): Promise<TaxObligationAttachment> {
  const { data, error } = await supabase
    .from('tax_obligation_attachments')
    .insert(attachment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTaxObligationAttachment(id: string): Promise<void> {
  const { error } = await supabase
    .from('tax_obligation_attachments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// HELPER: Generate Annual Tax Obligations for Sp. z o.o.
// ============================================

export async function generateSpZooAnnualObligations(
  businessProfileId: string,
  fiscalYear: number
): Promise<TaxObligation[]> {
  const obligations: Omit<TaxObligation, 'id' | 'created_at' | 'updated_at' | 'attachments'>[] = [
    {
      business_profile_id: businessProfileId,
      obligation_type: 'cit_8',
      period_type: 'yearly',
      period_year: fiscalYear,
      due_date: `${fiscalYear + 1}-03-31`, // CIT-8 due by end of March
      status: 'upcoming',
    },
  ];

  const results: TaxObligation[] = [];
  for (const obligation of obligations) {
    const saved = await saveTaxObligation(obligation);
    results.push(saved);
  }

  return results;
}
