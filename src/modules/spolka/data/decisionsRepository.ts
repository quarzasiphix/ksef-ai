import { supabase } from '../../../integrations/supabase/client';
import type {
  Decision,
  DecisionWithUsage,
  CreateDecisionInput,
  UpdateDecisionInput,
  DecisionStatus,
} from '@/modules/decisions/decisions';

// ============================================
// DECISION CRUD OPERATIONS
// ============================================

export async function getDecisions(
  businessProfileId: string,
  status?: DecisionStatus
): Promise<Decision[]> {
  let query = supabase
    .from('decisions')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getDecision(id: string): Promise<Decision | null> {
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function getDecisionWithUsage(id: string): Promise<DecisionWithUsage | null> {
  const decision = await getDecision(id);
  if (!decision) return null;
  
  // Fetch related contracts
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, number, subject, issue_date')
    .eq('decision_id', id)
    .order('issue_date', { ascending: false });
  
  // Fetch related invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, number, total_gross_value, issue_date')
    .eq('decision_id', id)
    .order('issue_date', { ascending: false });
  
  // Fetch related expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, description, amount, issue_date')
    .eq('decision_id', id)
    .order('issue_date', { ascending: false });
  
  // Fetch related documents
  const { data: documents } = await supabase
    .from('company_documents')
    .select('id, title, file_name, created_at')
    .eq('decision_id', id)
    .order('created_at', { ascending: false });

  const mappedContracts = (contracts || []).map((c: any) => ({
    id: c.id,
    number: c.number,
    subject: c.subject ?? undefined,
    issueDate: c.issue_date,
  }));

  const mappedInvoices = (invoices || []).map((i: any) => ({
    id: i.id,
    number: i.number,
    totalGrossValue: Number(i.total_gross_value) || 0,
    issueDate: i.issue_date,
  }));

  const mappedExpenses = (expenses || []).map((e: any) => ({
    id: e.id,
    description: e.description ?? undefined,
    amount: Number(e.amount) || 0,
    date: e.issue_date,
  }));
  
  return {
    ...decision,
    contracts: mappedContracts,
    invoices: mappedInvoices,
    expenses: mappedExpenses,
    documents: documents || [],
  };
}

export async function createDecision(
  input: CreateDecisionInput
): Promise<Decision> {
  const { data, error } = await supabase
    .from('decisions')
    .insert({
      business_profile_id: input.business_profile_id,
      resolution_id: input.resolution_id || null,
      parent_decision_id: input.parent_decision_id || null,
      title: input.title,
      description: input.description || null,
      decision_type: input.decision_type,
      category: input.category,
      scope_description: input.scope_description || null,
      amount_limit: input.amount_limit || null,
      currency: input.currency || 'PLN',
      valid_from: input.valid_from || null,
      valid_to: input.valid_to || null,
      allowed_counterparties: input.allowed_counterparties || [],
      status: input.status || 'active',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateDecision(
  id: string,
  updates: UpdateDecisionInput
): Promise<void> {
  const { error } = await supabase
    .from('decisions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteDecision(id: string): Promise<void> {
  const { error } = await supabase
    .from('decisions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// FOUNDATIONAL DECISIONS INITIALIZATION
// ============================================

export async function initializeFoundationalDecisions(
  businessProfileId: string,
  options?: {
    selectedCategories?: string[];
    customDecisions?: Array<{
      title: string;
      description: string;
      decision_type: 'strategic_shareholders' | 'operational_board';
      category: string;
      scope_description: string;
    }>;
  }
): Promise<void> {
  // If custom options provided, create decisions manually
  if (options?.selectedCategories || options?.customDecisions) {
    const { FOUNDATIONAL_DECISIONS } = await import('@/modules/decisions/decisions');
    
    // Create selected foundational decisions
    if (options.selectedCategories && options.selectedCategories.length > 0) {
      for (const category of options.selectedCategories) {
        const template = FOUNDATIONAL_DECISIONS.find(d => d.category === category);
        if (template) {
          await createDecision({
            business_profile_id: businessProfileId,
            ...template,
          });
        }
      }
    }
    
    // Create custom decisions
    if (options.customDecisions && options.customDecisions.length > 0) {
      for (const customDecision of options.customDecisions) {
        await createDecision({
          business_profile_id: businessProfileId,
          title: customDecision.title,
          description: customDecision.description,
          decision_type: customDecision.decision_type,
          category: customDecision.category as any,
          scope_description: customDecision.scope_description,
          status: 'active',
        });
      }
    }
    
    return;
  }
  
  // Default behavior: call the database function that creates all foundational decisions
  const { error } = await supabase.rpc('initialize_foundational_decisions', {
    profile_id: businessProfileId,
  });
  
  if (error) {
    console.error('Error initializing foundational decisions:', error);
    throw error;
  }
}

// ============================================
// DECISION VALIDATION & HELPERS
// ============================================

export async function validateDecisionForOperation(
  decisionId: string,
  amount?: number
): Promise<{ valid: boolean; reason?: string }> {
  const decision = await getDecision(decisionId);
  
  if (!decision) {
    return { valid: false, reason: 'Decyzja nie istnieje' };
  }
  
  if (decision.status !== 'active') {
    return { valid: false, reason: `Decyzja jest ${decision.status}` };
  }
  
  // Check date validity
  const now = new Date();
  if (decision.valid_from && new Date(decision.valid_from) > now) {
    return { valid: false, reason: 'Decyzja jeszcze nie obowiązuje' };
  }
  
  if (decision.valid_to && new Date(decision.valid_to) < now) {
    return { valid: false, reason: 'Decyzja wygasła' };
  }
  
  // Check amount limit
  if (amount && decision.amount_limit) {
    const remainingLimit = decision.amount_limit - (decision.total_amount_used || 0);
    if (amount > remainingLimit) {
      return { 
        valid: false, 
        reason: `Przekroczony limit: pozostało ${remainingLimit.toFixed(2)} ${decision.currency}` 
      };
    }
  }
  
  return { valid: true };
}

export async function getActiveDecisionsByCategory(
  businessProfileId: string,
  category: string
): Promise<Decision[]> {
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('category', category)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// ============================================
// AUTO-EXPIRE DECISIONS
// ============================================

export async function autoExpireDecisions(): Promise<void> {
  const { error } = await supabase.rpc('auto_expire_decisions');
  
  if (error) {
    console.error('Error auto-expiring decisions:', error);
    throw error;
  }
}
