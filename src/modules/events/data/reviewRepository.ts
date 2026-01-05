/**
 * Review Repository
 * 
 * Data access layer for version-based acceptance/review system
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ReviewStatus,
  ChangeSeverity,
  AcceptChainInput,
  RejectChainInput,
  SubmitForReviewInput,
  CanEditResult,
  ChainWithReview,
  VersionWithSeverity,
  FieldClassification,
} from '../types/review';

/**
 * Accept a specific version of a chain
 */
export async function acceptChain(input: AcceptChainInput): Promise<any> {
  const { data, error } = await supabase.rpc('accept_chain', {
    p_chain_id: input.chain_id,
    p_version_id: input.version_id,
    p_comment: input.comment || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Reject a specific version of a chain
 */
export async function rejectChain(input: RejectChainInput): Promise<any> {
  const { data, error } = await supabase.rpc('reject_chain', {
    p_chain_id: input.chain_id,
    p_version_id: input.version_id,
    p_comment: input.comment,
  });

  if (error) throw error;
  return data;
}

/**
 * Submit chain for review
 */
export async function submitForReview(input: SubmitForReviewInput): Promise<any> {
  const { data, error } = await supabase.rpc('submit_for_review', {
    p_chain_id: input.chain_id,
    p_version_id: input.version_id,
  });

  if (error) throw error;
  return data;
}

/**
 * Check if invoice can be edited
 */
export async function canEditInvoice(invoiceId: string): Promise<CanEditResult> {
  const { data, error } = await supabase.rpc('can_edit_invoice', {
    p_invoice_id: invoiceId,
  });

  if (error) throw error;
  return data as CanEditResult;
}

/**
 * Get chains requiring review
 */
export async function getChainsRequiringReview(
  businessProfileId: string
): Promise<ChainWithReview[]> {
  const { data, error } = await supabase
    .from('chains_requiring_review')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as ChainWithReview[];
}

/**
 * Get chains by review status
 */
export async function getChainsByReviewStatus(
  businessProfileId: string,
  reviewStatus: ReviewStatus
): Promise<any[]> {
  const { data, error } = await supabase
    .from('chains')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('review_status', reviewStatus)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get invoice versions with severity
 */
export async function getInvoiceVersionsWithSeverity(
  invoiceId: string
): Promise<VersionWithSeverity[]> {
  const { data, error } = await supabase
    .from('invoice_versions')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('version_no', { ascending: true });

  if (error) throw error;
  return data as VersionWithSeverity[];
}

/**
 * Calculate change severity for fields
 */
export async function calculateChangeSeverity(
  objectType: string,
  changedFields: string[]
): Promise<ChangeSeverity> {
  const { data, error } = await supabase.rpc('calculate_change_severity', {
    p_object_type: objectType,
    p_changed_fields: changedFields,
  });

  if (error) throw error;
  return data as ChangeSeverity;
}

/**
 * Get field classifications
 */
export async function getFieldClassifications(
  objectType: string
): Promise<FieldClassification[]> {
  const { data, error } = await supabase
    .from('field_classifications')
    .select('*')
    .eq('object_type', objectType);

  if (error) throw error;
  return data as FieldClassification[];
}

/**
 * Get accounting-impacting fields for an object type
 */
export async function getAccountingFields(objectType: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('field_classifications')
    .select('field_name')
    .eq('object_type', objectType)
    .eq('classification', 'accounting');

  if (error) throw error;
  return data.map(row => row.field_name);
}

/**
 * Get non-accounting fields for an object type
 */
export async function getNonAccountingFields(objectType: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('field_classifications')
    .select('field_name')
    .eq('object_type', objectType)
    .eq('classification', 'non_accounting');

  if (error) throw error;
  return data.map(row => row.field_name);
}

/**
 * Check if chain has changes after acceptance
 */
export async function hasChangesAfterAcceptance(chainId: string): Promise<boolean> {
  const { data: chain, error: chainError } = await supabase
    .from('chains')
    .select('review_status, reviewed_at, primary_object_id')
    .eq('id', chainId)
    .single();

  if (chainError) throw chainError;

  if (chain.review_status !== 'accepted' && chain.review_status !== 'superseded') {
    return false;
  }

  // Check if there are versions created after acceptance
  const { data: versions, error: versionsError } = await supabase
    .from('invoice_versions')
    .select('id, change_severity')
    .eq('invoice_id', chain.primary_object_id)
    .gt('created_at', chain.reviewed_at)
    .eq('change_severity', 'accounting');

  if (versionsError) throw versionsError;

  return (versions?.length || 0) > 0;
}

/**
 * Get version comparison (diff between two versions)
 */
export async function getVersionDiff(
  versionId1: string,
  versionId2: string
): Promise<{
  version1: VersionWithSeverity;
  version2: VersionWithSeverity;
  changes: {
    field: string;
    old_value: any;
    new_value: any;
    is_accounting_impact: boolean;
  }[];
}> {
  // Get both versions
  const { data: versions, error } = await supabase
    .from('invoice_versions')
    .select('*')
    .in('id', [versionId1, versionId2]);

  if (error) throw error;
  if (!versions || versions.length !== 2) {
    throw new Error('Could not find both versions');
  }

  const v1 = versions.find(v => v.id === versionId1) as VersionWithSeverity;
  const v2 = versions.find(v => v.id === versionId2) as VersionWithSeverity;

  // Calculate diff
  const changes: any[] = [];
  const allFields = new Set([
    ...Object.keys(v1.snapshot_json),
    ...Object.keys(v2.snapshot_json),
  ]);

  const accountingFields = v2.accounting_impact_fields || [];

  for (const field of allFields) {
    const oldValue = v1.snapshot_json[field];
    const newValue = v2.snapshot_json[field];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        old_value: oldValue,
        new_value: newValue,
        is_accounting_impact: accountingFields.includes(field),
      });
    }
  }

  return {
    version1: v1,
    version2: v2,
    changes,
  };
}

/**
 * Revert to accepted version
 */
export async function revertToAcceptedVersion(chainId: string): Promise<string> {
  // Get the accepted version
  const { data: chain, error: chainError } = await supabase
    .from('chains')
    .select('reviewed_version_id, primary_object_id')
    .eq('id', chainId)
    .single();

  if (chainError) throw chainError;
  if (!chain.reviewed_version_id) {
    throw new Error('No accepted version found');
  }

  // Get the accepted version snapshot
  const { data: version, error: versionError } = await supabase
    .from('invoice_versions')
    .select('snapshot_json')
    .eq('id', chain.reviewed_version_id)
    .single();

  if (versionError) throw versionError;

  // Update the invoice with the accepted version data
  const { error: updateError } = await supabase
    .from('invoices')
    .update(version.snapshot_json)
    .eq('id', chain.primary_object_id);

  if (updateError) throw updateError;

  // Reset chain review status to accepted
  const { error: chainUpdateError } = await supabase
    .from('chains')
    .update({
      review_status: 'accepted',
      required_actions: [],
    })
    .eq('id', chainId);

  if (chainUpdateError) throw chainUpdateError;

  return chain.primary_object_id;
}

/**
 * Get review summary for dashboard
 */
export async function getReviewSummary(businessProfileId: string): Promise<{
  pending_review: number;
  superseded: number;
  accepted: number;
  rejected: number;
  total_requiring_attention: number;
}> {
  const { data, error } = await supabase
    .from('chains')
    .select('review_status')
    .eq('business_profile_id', businessProfileId);

  if (error) throw error;

  const summary = {
    pending_review: 0,
    superseded: 0,
    accepted: 0,
    rejected: 0,
    total_requiring_attention: 0,
  };

  data.forEach(chain => {
    const status = chain.review_status as ReviewStatus;
    if (status === 'pending_review') summary.pending_review++;
    if (status === 'superseded') summary.superseded++;
    if (status === 'accepted') summary.accepted++;
    if (status === 'rejected') summary.rejected++;
  });

  summary.total_requiring_attention = summary.pending_review + summary.superseded;

  return summary;
}
