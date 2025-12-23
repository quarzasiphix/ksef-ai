import { supabase } from '@/integrations/supabase/client';

export interface RevocationApproval {
  user_id: string;
  approved_at: string;
  signature: string;
}

export interface SignatureVerificationData {
  has_signature: boolean;
  crypto_valid: boolean;
  signer_subject: string | null;
  signing_time: string | null;
  notes: string[];
  verified_at: string;
}

export interface RevocationRequest {
  id: string;
  decision_id: string;
  business_profile_id: string;
  reason: string;
  requested_by: string;
  requested_at: string;
  required_approvers: string[];
  document_url?: string;
  document_name?: string;
  document_uploaded_at?: string;
  signature_verification?: SignatureVerificationData;
  approvals: RevocationApproval[];
  status: 'pending' | 'pending_verification' | 'verified' | 'approved' | 'rejected' | 'cancelled';
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRevocationRequestInput {
  decision_id: string;
  business_profile_id: string;
  reason: string;
  required_approvers: string[];
  document_url?: string;
  document_name?: string;
}

export async function getRevocationRequestByDecisionId(
  decisionId: string
): Promise<RevocationRequest | null> {
  const { data, error } = await supabase
    .from('revocation_requests')
    .select('*')
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getRevocationRequestsByBusinessProfile(
  businessProfileId: string
): Promise<RevocationRequest[]> {
  const { data, error } = await supabase
    .from('revocation_requests')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createRevocationRequest(
  input: CreateRevocationRequestInput
): Promise<RevocationRequest> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // Status logic:
  // - If document uploaded: 'pending_verification' (awaiting signature check)
  // - If no document: 'pending' (awaiting document upload)
  const initialStatus = input.document_url ? 'pending_verification' : 'pending';

  const { data, error } = await supabase
    .from('revocation_requests')
    .insert({
      decision_id: input.decision_id,
      business_profile_id: input.business_profile_id,
      reason: input.reason,
      requested_by: user.user.id,
      required_approvers: input.required_approvers,
      document_url: input.document_url,
      document_name: input.document_name,
      document_uploaded_at: input.document_url ? new Date().toISOString() : undefined,
      status: initialStatus,
      approvals: [],
    })
    .select()
    .single();

  if (error) throw error;

  // Update decision status to revoke_requested
  await supabase
    .from('decisions')
    .update({ status: 'revoke_requested' })
    .eq('id', input.decision_id);

  return data;
}

export async function addApprovalToRevocationRequest(
  revocationRequestId: string,
  userId: string,
  signature: string
): Promise<RevocationRequest> {
  // Get current request
  const { data: request, error: fetchError } = await supabase
    .from('revocation_requests')
    .select('*')
    .eq('id', revocationRequestId)
    .single();

  if (fetchError) throw fetchError;

  // Check if user already approved
  const approvals = (request.approvals || []) as RevocationApproval[];
  if (approvals.some((a) => a.user_id === userId)) {
    throw new Error('User has already approved this revocation');
  }

  // Add new approval
  const newApproval: RevocationApproval = {
    user_id: userId,
    approved_at: new Date().toISOString(),
    signature,
  };

  const updatedApprovals = [...approvals, newApproval];

  // Check if all required approvers have approved
  const allApproved = request.required_approvers.every((approverId) =>
    updatedApprovals.some((a) => a.user_id === approverId)
  );

  const updateData: any = {
    approvals: updatedApprovals,
    updated_at: new Date().toISOString(),
  };

  // If all approved AND document is verified, mark as approved and revoke the decision
  if (allApproved) {
    // Check if document is verified
    const hasVerifiedSignature = request.signature_verification?.has_signature && 
                                 request.signature_verification?.crypto_valid;
    
    if (!hasVerifiedSignature) {
      throw new Error('Nie można zatwierdzić unieważnienia bez zweryfikowanego podpisu na dokumencie');
    }

    updateData.status = 'approved';
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = userId;

    // Update decision status to revoked
    await supabase
      .from('decisions')
      .update({ status: 'revoked' })
      .eq('id', request.decision_id);
  }

  const { data, error } = await supabase
    .from('revocation_requests')
    .update(updateData)
    .eq('id', revocationRequestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectRevocationRequest(
  revocationRequestId: string,
  userId: string,
  notes?: string
): Promise<RevocationRequest> {
  const { data, error } = await supabase
    .from('revocation_requests')
    .update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolution_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', revocationRequestId)
    .select()
    .single();

  if (error) throw error;

  // Update decision status back to active
  const { data: request } = await supabase
    .from('revocation_requests')
    .select('decision_id')
    .eq('id', revocationRequestId)
    .single();

  if (request) {
    await supabase
      .from('decisions')
      .update({ status: 'revoke_rejected' })
      .eq('id', request.decision_id);
  }

  return data;
}

export async function cancelRevocationRequest(
  revocationRequestId: string,
  userId: string
): Promise<RevocationRequest> {
  const { data, error } = await supabase
    .from('revocation_requests')
    .update({
      status: 'cancelled',
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', revocationRequestId)
    .select()
    .single();

  if (error) throw error;

  // Update decision status back to active
  const { data: request } = await supabase
    .from('revocation_requests')
    .select('decision_id')
    .eq('id', revocationRequestId)
    .single();

  if (request) {
    await supabase
      .from('decisions')
      .update({ status: 'active' })
      .eq('id', request.decision_id);
  }

  return data;
}

export async function uploadRevocationDocument(
  revocationRequestId: string,
  file: File
): Promise<string> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // Upload file to Supabase Storage
  const fileName = `revocation-${revocationRequestId}-${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  const documentUrl = urlData.publicUrl;

  // Update revocation request with document info and set to pending_verification
  await supabase
    .from('revocation_requests')
    .update({
      document_url: documentUrl,
      document_name: file.name,
      document_uploaded_at: new Date().toISOString(),
      status: 'pending_verification',
      updated_at: new Date().toISOString(),
    })
    .eq('id', revocationRequestId);

  return documentUrl;
}

/**
 * Store signature verification results for a revocation request
 * This is called after verifying the uploaded document via podpis.gov.pl
 */
export async function storeSignatureVerification(
  revocationRequestId: string,
  verificationData: SignatureVerificationData
): Promise<RevocationRequest> {
  // Determine new status based on verification
  const newStatus = verificationData.has_signature && verificationData.crypto_valid 
    ? 'verified' 
    : 'pending';

  const { data, error } = await supabase
    .from('revocation_requests')
    .update({
      signature_verification: verificationData,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', revocationRequestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
