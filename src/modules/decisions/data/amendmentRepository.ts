import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DecisionVersion {
  id: string;
  decision_id: string;
  version_number: number;
  title: string;
  description?: string;
  decision_type: string;
  category?: string;
  legal_basis?: string;
  decision_body: 'ZARZAD' | 'WSPOLNICY';
  approval_policy: string;
  data_snapshot: any;
  snapshot_hash: string;
  previous_version_hash?: string;
  created_by: string;
  created_at: string;
  superseded_at?: string;
  superseded_by?: string;
  amendment_id?: string;
}

export interface SignatureVerification {
  status: 'valid' | 'invalid' | 'indeterminate' | 'not_checked';
  checked_at: string;
  signers: Array<{
    cn: string;
    issuer: string;
    signing_time: string;
    certificate_valid: boolean;
    revocation_status?: 'good' | 'revoked' | 'unknown';
    has_timestamp: boolean;
  }>;
  certificate_issuer: string;
  has_timestamp: boolean;
  revocation_checked: boolean;
  report_blob?: any;
}

export interface AmendmentRequest {
  id: string;
  decision_id: string;
  business_profile_id: string;
  from_version_id: string;
  proposed_changes: any;
  changes_diff?: any;
  justification: string;
  requested_by: string;
  requested_at: string;
  required_approvers: string[];
  approvals: Array<{
    user_id: string;
    approved_at: string;
    signature: string;
  }>;
  document_url?: string;
  document_name?: string;
  document_uploaded_at?: string;
  signature_verification?: SignatureVerification;
  status: 'pending' | 'pending_verification' | 'verified' | 'approved' | 'rejected' | 'cancelled';
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_version_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAmendmentRequestInput {
  decision_id: string;
  business_profile_id: string;
  from_version_id: string;
  proposed_changes: any;
  justification: string;
  required_approvers: string[];
}

// ============================================================================
// DECISION VERSION FUNCTIONS
// ============================================================================

/**
 * Get all versions for a decision
 */
export async function getDecisionVersions(decisionId: string): Promise<DecisionVersion[]> {
  const { data, error } = await supabase
    .from('decision_versions')
    .select('*')
    .eq('decision_id', decisionId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get current (active) version for a decision
 */
export async function getCurrentVersion(decisionId: string): Promise<DecisionVersion | null> {
  const { data, error } = await supabase
    .from('decision_versions')
    .select('*')
    .eq('decision_id', decisionId)
    .is('superseded_at', null)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get specific version by ID
 */
export async function getVersionById(versionId: string): Promise<DecisionVersion | null> {
  const { data, error } = await supabase
    .from('decision_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create new decision version (called when amendment is approved)
 */
export async function createDecisionVersion(input: {
  decision_id: string;
  proposed_changes: any;
  amendment_id: string;
}): Promise<DecisionVersion> {
  // Get current version
  const { data: decision } = await supabase
    .from('decisions')
    .select('*, current_version:decision_versions!current_version_id(*)')
    .eq('id', input.decision_id)
    .single();

  if (!decision) throw new Error('Decision not found');

  const currentVersion = decision.current_version as DecisionVersion;
  const newVersionNumber = currentVersion.version_number + 1;

  // Compute hashes
  const beforeHash = currentVersion.snapshot_hash;
  const afterHash = await computeHash(input.proposed_changes);

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Create new version
  const { data: newVersion, error } = await supabase
    .from('decision_versions')
    .insert({
      decision_id: input.decision_id,
      version_number: newVersionNumber,
      ...input.proposed_changes,
      data_snapshot: input.proposed_changes,
      snapshot_hash: afterHash,
      previous_version_hash: beforeHash,
      amendment_id: input.amendment_id,
      created_by: user.user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Supersede old version
  await supabase
    .from('decision_versions')
    .update({
      superseded_at: new Date().toISOString(),
      superseded_by: newVersion.id,
    })
    .eq('id', currentVersion.id);

  // Update decision to point to new version
  await supabase
    .from('decisions')
    .update({
      ...input.proposed_changes,
      current_version_id: newVersion.id,
      version_count: newVersionNumber,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.decision_id);

  // Log event via unified events RPC
  await supabase.rpc('create_event', {
    p_business_profile_id: decision.business_profile_id,
    p_event_type: 'decision_created',
    p_actor_id: user.user.id,
    p_actor_name: user.user.email || 'Unknown',
    p_entity_type: 'decision',
    p_entity_id: input.decision_id,
    p_action_summary: `Opublikowano wersję ${newVersionNumber} uchwały`,
    p_metadata: {
      amendment_id: input.amendment_id,
      from_version: currentVersion.version_number,
      to_version: newVersionNumber,
      before_snapshot_hash: beforeHash,
      after_snapshot_hash: afterHash,
    },
  });

  return newVersion;
}

// ============================================================================
// AMENDMENT REQUEST FUNCTIONS
// ============================================================================

/**
 * Get amendment request by ID
 */
export async function getAmendmentRequest(amendmentId: string): Promise<AmendmentRequest | null> {
  const { data, error } = await supabase
    .from('amendment_requests')
    .select('*')
    .eq('id', amendmentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get all amendment requests for a decision
 */
export async function getAmendmentRequestsForDecision(
  decisionId: string
): Promise<AmendmentRequest[]> {
  const { data, error } = await supabase
    .from('amendment_requests')
    .select('*')
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get pending amendment request for a decision (if any)
 */
export async function getPendingAmendment(decisionId: string): Promise<AmendmentRequest | null> {
  const { data, error } = await supabase
    .from('amendment_requests')
    .select('*')
    .eq('decision_id', decisionId)
    .in('status', ['pending', 'pending_verification', 'verified'])
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create amendment request
 */
export async function createAmendmentRequest(
  input: CreateAmendmentRequestInput
): Promise<AmendmentRequest> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // Get current version to compute diff
  const { data: currentVersion } = await supabase
    .from('decision_versions')
    .select('data_snapshot')
    .eq('id', input.from_version_id)
    .single();

  if (!currentVersion) throw new Error('Version not found');

  // Compute diff (simplified - you can use a library like 'deep-diff' for better results)
  const diff = computeDiff(currentVersion.data_snapshot, input.proposed_changes);

  const { data, error } = await supabase
    .from('amendment_requests')
    .insert({
      ...input,
      changes_diff: diff,
      requested_by: user.user.id,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  // Update decision status to amendment_pending
  await supabase
    .from('decisions')
    .update({ status: 'amendment_pending' })
    .eq('id', input.decision_id);

  // Log event via unified events RPC
  await supabase.rpc('create_event', {
    p_business_profile_id: input.business_profile_id,
    p_event_type: 'decision_created',
    p_actor_id: user.user.id,
    actor_name: user.user.email || 'Unknown',
    entity_type: 'amendment_request',
    entity_id: data.id,
    action_summary: 'Złożono wniosek o zmianę uchwały',
    metadata: {
      amendment_id: data.id,
      decision_id: input.decision_id,
    },
  });

  return data;
}

/**
 * Upload amendment document
 */
export async function uploadAmendmentDocument(
  amendmentId: string,
  file: File
): Promise<string> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // Upload to storage
  const fileName = `amendment-${amendmentId}-${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  // Update amendment request
  await supabase
    .from('amendment_requests')
    .update({
      document_url: urlData.publicUrl,
      document_name: file.name,
      document_uploaded_at: new Date().toISOString(),
      status: 'pending_verification',
      updated_at: new Date().toISOString(),
    })
    .eq('id', amendmentId);

  // TODO: Trigger signature verification via Edge Function
  // await supabase.functions.invoke('verify-amendment-signature', {
  //   body: { amendmentId, documentUrl: fileName },
  // });

  // Log event
  const { data: amendment } = await supabase
    .from('amendment_requests')
    .select('business_profile_id')
    .eq('id', amendmentId)
    .single();

  if (amendment) {
    await supabase.rpc('create_event', {
      p_business_profile_id: amendment.business_profile_id,
      p_event_type: 'document_uploaded',
      p_actor_id: user.user.id,
      actor_name: user.user.email || 'Unknown',
      entity_type: 'amendment_request',
      entity_id: amendmentId,
      action_summary: 'Dodano podpisany dokument zmiany',
    });
  }

  return urlData.publicUrl;
}

/**
 * Store signature verification results
 */
export async function storeAmendmentSignatureVerification(
  amendmentId: string,
  verificationData: SignatureVerification
): Promise<AmendmentRequest> {
  const newStatus = verificationData.status === 'valid' ? 'verified' : 'pending';

  const { data, error } = await supabase
    .from('amendment_requests')
    .update({
      signature_verification: verificationData,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', amendmentId)
    .select()
    .single();

  if (error) throw error;

  // Log event via unified events RPC
  await supabase.rpc('create_event', {
    p_business_profile_id: data.business_profile_id,
    p_event_type: 'decision_created',
    p_entity_type: 'amendment_request',
    entity_id: amendmentId,
    action_summary:
      verificationData.status === 'valid'
        ? 'Podpis zweryfikowany pomyślnie'
        : 'Weryfikacja podpisu nie powiodła się',
    metadata: verificationData,
  });

  return data;
}

/**
 * Approve amendment request
 */
export async function approveAmendment(
  amendmentId: string,
  userId: string,
  signature: string
): Promise<AmendmentRequest> {
  const { data: amendment } = await supabase
    .from('amendment_requests')
    .select('*')
    .eq('id', amendmentId)
    .single();

  if (!amendment) throw new Error('Amendment not found');

  // Validate signature verified
  if (amendment.signature_verification?.status !== 'valid') {
    throw new Error('Nie można zatwierdzić bez zweryfikowanego podpisu na dokumencie');
  }

  // Check if user already approved
  if (amendment.approvals.some((a: any) => a.user_id === userId)) {
    throw new Error('Już zatwierdziłeś ten wniosek');
  }

  // Add approval
  const updatedApprovals = [
    ...amendment.approvals,
    {
      user_id: userId,
      approved_at: new Date().toISOString(),
      signature,
    },
  ];

  const allApproved = amendment.required_approvers.every((id) =>
    updatedApprovals.some((a) => a.user_id === id)
  );

  let updateData: any = {
    approvals: updatedApprovals,
    updated_at: new Date().toISOString(),
  };

  // If all approved, create new version
  if (allApproved) {
    const newVersion = await createDecisionVersion({
      decision_id: amendment.decision_id,
      proposed_changes: amendment.proposed_changes,
      amendment_id: amendmentId,
    });

    updateData.status = 'approved';
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = userId;
    updateData.created_version_id = newVersion.id;
  }

  const { data, error } = await supabase
    .from('amendment_requests')
    .update(updateData)
    .eq('id', amendmentId)
    .select()
    .single();

  if (error) throw error;

  // Log event via unified events RPC
  await supabase.rpc('create_event', {
    p_business_profile_id: amendment.business_profile_id,
    p_event_type: 'decision_approved',
    p_actor_id: userId,
    entity_type: 'amendment_request',
    entity_id: amendmentId,
    action_summary: allApproved
      ? 'Wniosek o zmianę zatwierdzony - utworzono nową wersję'
      : 'Dodano akceptację wniosku o zmianę',
    metadata: {
      approver_id: userId,
      approval_count: updatedApprovals.length,
      required_count: amendment.required_approvers.length,
      all_approved: allApproved,
    },
  });

  return data;
}

/**
 * Reject amendment request
 */
export async function rejectAmendment(
  amendmentId: string,
  userId: string,
  notes: string
): Promise<AmendmentRequest> {
  const { data: amendment } = await supabase
    .from('amendment_requests')
    .select('*')
    .eq('id', amendmentId)
    .single();

  if (!amendment) throw new Error('Amendment not found');

  const { data, error } = await supabase
    .from('amendment_requests')
    .update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolution_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', amendmentId)
    .select()
    .single();

  if (error) throw error;

  // Revert decision status to active
  await supabase
    .from('decisions')
    .update({ status: 'active' })
    .eq('id', amendment.decision_id);

  // Log event via unified events RPC
  await supabase.rpc('create_event', {
    p_business_profile_id: amendment.business_profile_id,
    p_event_type: 'decision_rejected',
    p_actor_id: userId,
    entity_type: 'amendment_request',
    entity_id: amendmentId,
    action_summary: 'Wniosek o zmianę odrzucony',
    metadata: { reason: notes },
  });

  return data;
}

/**
 * Cancel amendment request
 */
export async function cancelAmendment(
  amendmentId: string,
  userId: string
): Promise<AmendmentRequest> {
  const { data: amendment } = await supabase
    .from('amendment_requests')
    .select('*')
    .eq('id', amendmentId)
    .single();

  if (!amendment) throw new Error('Amendment not found');

  if (amendment.requested_by !== userId) {
    throw new Error('Tylko osoba składająca wniosek może go anulować');
  }

  const { data, error } = await supabase
    .from('amendment_requests')
    .update({
      status: 'cancelled',
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', amendmentId)
    .select()
    .single();

  if (error) throw error;

  // Revert decision status to active
  await supabase
    .from('decisions')
    .update({ status: 'active' })
    .eq('id', amendment.decision_id);

  // Log event via unified events RPC
  await supabase.rpc('create_event', {
    p_business_profile_id: amendment.business_profile_id,
    p_event_type: 'decision_cancelled',
    p_actor_id: userId,
    entity_type: 'amendment_request',
    entity_id: amendmentId,
    action_summary: 'Wniosek o zmianę anulowany',
  });

  return data;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compute SHA-256 hash of data
 */
async function computeHash(data: any): Promise<string> {
  const str = JSON.stringify(data, Object.keys(data).sort());
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Compute diff between two objects (simplified)
 */
function computeDiff(before: any, after: any): any {
  const diff: any = {};

  // Simple field-by-field comparison
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  allKeys.forEach((key) => {
    const beforeValue = before[key];
    const afterValue = after[key];

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      diff[key] = {
        before: beforeValue,
        after: afterValue,
      };
    }
  });

  return diff;
}
