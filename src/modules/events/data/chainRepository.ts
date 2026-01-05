/**
 * Chain Repository
 * 
 * Data access layer for the Event Chains system
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Chain,
  ChainSummary,
  ChainDetail,
  CreateChainInput,
  UpdateChainStateInput,
  AddObjectToChainInput,
  LinkChainsInput,
  CreateInvoiceVersionInput,
  InvoiceVersion,
  ChainObject,
  ChainLink,
} from '../types/chain';

/**
 * Create a new chain
 */
export async function createChain(input: CreateChainInput): Promise<Chain> {
  const { data, error } = await supabase.rpc('create_chain', {
    p_business_profile_id: input.business_profile_id,
    p_chain_type: input.chain_type,
    p_primary_object_type: input.primary_object_type,
    p_primary_object_id: input.primary_object_id,
    p_title: input.title,
    p_initial_state: input.initial_state || 'draft',
    p_metadata: input.metadata || {},
  });

  if (error) throw error;

  // Fetch the created chain
  const { data: chain, error: fetchError } = await supabase
    .from('chains')
    .select('*')
    .eq('id', data)
    .single();

  if (fetchError) throw fetchError;
  return chain as Chain;
}

/**
 * Get chain by ID
 */
export async function getChain(chainId: string): Promise<Chain | null> {
  const { data, error } = await supabase
    .from('chains')
    .select('*')
    .eq('id', chainId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as Chain;
}

/**
 * Get chain by primary object
 */
export async function getChainByObject(
  objectType: string,
  objectId: string
): Promise<Chain | null> {
  const { data, error } = await supabase
    .from('chains')
    .select('*')
    .eq('primary_object_type', objectType)
    .eq('primary_object_id', objectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as Chain;
}

/**
 * Get all chains for a business profile
 */
export async function getChains(
  businessProfileId: string,
  filters?: {
    chain_type?: string;
    state?: string;
    requires_verification?: boolean;
    needs_attention?: boolean;
  }
): Promise<ChainSummary[]> {
  let query = supabase
    .from('chain_summary')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('updated_at', { ascending: false });

  if (filters?.chain_type) {
    query = query.eq('chain_type', filters.chain_type);
  }

  if (filters?.state) {
    query = query.eq('state', filters.state);
  }

  if (filters?.requires_verification !== undefined) {
    query = query.eq('requires_verification', filters.requires_verification);
  }

  if (filters?.needs_attention !== undefined) {
    query = query.eq('needs_attention', filters.needs_attention);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as ChainSummary[];
}

/**
 * Get chain detail with full timeline
 */
export async function getChainDetail(chainId: string): Promise<ChainDetail> {
  const { data, error } = await supabase.rpc('get_chain_detail', {
    p_chain_id: chainId,
  });

  if (error) throw error;
  return data as ChainDetail;
}

/**
 * Get chain timeline (all events)
 */
export async function getChainTimeline(chainId: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_chain_timeline', {
    p_chain_id: chainId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Update chain state
 */
export async function updateChainState(
  input: UpdateChainStateInput
): Promise<void> {
  const { error } = await supabase.rpc('update_chain_state', {
    p_chain_id: input.chain_id,
    p_new_state: input.new_state,
    p_metadata: input.metadata || null,
  });

  if (error) throw error;
}

/**
 * Update chain metadata
 */
export async function updateChain(
  chainId: string,
  updates: Partial<Chain>
): Promise<Chain> {
  const { data, error } = await supabase
    .from('chains')
    .update(updates)
    .eq('id', chainId)
    .select()
    .single();

  if (error) throw error;
  return data as Chain;
}

/**
 * Add object to chain
 */
export async function addObjectToChain(
  input: AddObjectToChainInput
): Promise<string> {
  const { data, error } = await supabase.rpc('add_object_to_chain', {
    p_chain_id: input.chain_id,
    p_object_type: input.object_type,
    p_object_id: input.object_id,
    p_role: input.role,
    p_link_type: input.link_type || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Get objects in a chain
 */
export async function getChainObjects(chainId: string): Promise<ChainObject[]> {
  const { data, error } = await supabase
    .from('chain_objects')
    .select('*')
    .eq('chain_id', chainId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ChainObject[];
}

/**
 * Link two chains
 */
export async function linkChains(input: LinkChainsInput): Promise<string> {
  const { data, error } = await supabase.rpc('link_chains', {
    p_from_chain_id: input.from_chain_id,
    p_to_chain_id: input.to_chain_id,
    p_link_type: input.link_type,
    p_amount: input.amount || null,
    p_currency: input.currency || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Get chain links
 */
export async function getChainLinks(chainId: string): Promise<ChainLink[]> {
  const { data, error } = await supabase
    .from('chain_links')
    .select('*')
    .or(`from_chain_id.eq.${chainId},to_chain_id.eq.${chainId}`);

  if (error) throw error;
  return data as ChainLink[];
}

/**
 * Create invoice version
 */
export async function createInvoiceVersion(
  input: CreateInvoiceVersionInput
): Promise<string> {
  const { data, error } = await supabase.rpc('create_invoice_version', {
    p_invoice_id: input.invoice_id,
    p_snapshot_json: input.snapshot_json,
    p_changed_fields: input.changed_fields,
    p_change_reason: input.change_reason || null,
    p_change_summary: input.change_summary || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Get invoice versions
 */
export async function getInvoiceVersions(
  invoiceId: string
): Promise<InvoiceVersion[]> {
  const { data, error } = await supabase
    .from('invoice_versions')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('version_no', { ascending: true });

  if (error) throw error;
  return data as InvoiceVersion[];
}

/**
 * Get latest invoice version
 */
export async function getLatestInvoiceVersion(
  invoiceId: string
): Promise<InvoiceVersion | null> {
  const { data, error } = await supabase
    .from('invoice_versions')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('version_no', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as InvoiceVersion;
}

/**
 * Close chain
 */
export async function closeChain(chainId: string): Promise<void> {
  await updateChainState({
    chain_id: chainId,
    new_state: 'closed',
    metadata: { closed_at: new Date().toISOString() },
  });

  await supabase
    .from('chains')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', chainId);
}

/**
 * Verify chain
 */
export async function verifyChain(
  chainId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('chains')
    .update({
      verified_at: new Date().toISOString(),
      verified_by: userId,
      requires_verification: false,
    })
    .eq('id', chainId);

  if (error) throw error;
}

/**
 * Get or create chain for object
 * Helper function that gets existing chain or creates new one
 */
export async function getOrCreateChainForObject(
  businessProfileId: string,
  objectType: string,
  objectId: string,
  title: string,
  chainType?: string
): Promise<Chain> {
  // Try to get existing chain
  let chain = await getChainByObject(objectType, objectId);

  if (!chain) {
    // Create new chain
    chain = await createChain({
      business_profile_id: businessProfileId,
      chain_type: (chainType || objectType) as any,
      primary_object_type: objectType,
      primary_object_id: objectId,
      title,
    });
  }

  return chain;
}
