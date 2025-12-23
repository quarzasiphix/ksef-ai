import { supabase } from "../../../integrations/supabase/client";

export interface CompanyInvitation {
  id: string;
  business_profile_id: string;
  email: string;
  role: 'admin' | 'accountant' | 'pelnomocnik' | 'viewer';
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  token: string;
  expires_at: string;
  invited_by: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  business_profile?: {
    id: string;
    name: string;
    tax_id: string;
  };
  inviter?: {
    full_name?: string;
    email?: string;
  };
}

export interface CompanyMember {
  id: string;
  business_profile_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'accountant' | 'pelnomocnik' | 'viewer';
  can_manage_invoices: boolean;
  can_manage_expenses: boolean;
  can_manage_documents: boolean;
  can_manage_bank_accounts: boolean;
  can_manage_team: boolean;
  can_view_reports: boolean;
  can_manage_settings: boolean;
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    email?: string;
  };
  profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

/**
 * Get pending invitations for the current user's email
 */
export async function getPendingInvitations(): Promise<CompanyInvitation[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) return [];

  const { data, error } = await supabase
    .from('company_invitations')
    .select(`
      *,
      business_profiles:business_profile_id (id, name, tax_id)
    `)
    .eq('email', userData.user.email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending invitations:', error);
    return [];
  }

  return (data || []).map((inv: any) => ({
    ...inv,
    business_profile: inv.business_profiles,
  }));
}

/**
 * Accept an invitation by token
 */
export async function acceptInvitation(token: string): Promise<{ success: boolean; error?: string; business_profile_id?: string }> {
  const { data, error } = await supabase.rpc('accept_invitation', { invitation_token: token });

  if (error) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string; business_profile_id?: string };
}

/**
 * Decline an invitation
 */
export async function declineInvitation(invitationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('company_invitations')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (error) {
    console.error('Error declining invitation:', error);
    return false;
  }

  return true;
}

/**
 * Send an invitation to join a company
 */
export async function sendInvitation(
  businessProfileId: string,
  email: string,
  role: 'admin' | 'accountant' | 'pelnomocnik' | 'viewer',
  message?: string
): Promise<{ success: boolean; error?: string; invitation?: CompanyInvitation }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('company_invitations')
    .insert({
      business_profile_id: businessProfileId,
      email: email.toLowerCase().trim(),
      role,
      message,
      invited_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending invitation:', error);
    if (error.code === '23505') {
      return { success: false, error: 'An invitation has already been sent to this email' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, invitation: data };
}

/**
 * Get all invitations for a business profile (for admins/owners)
 */
export async function getInvitationsForProfile(businessProfileId: string): Promise<CompanyInvitation[]> {
  const { data, error } = await supabase
    .from('company_invitations')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return data || [];
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(invitationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('company_invitations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error cancelling invitation:', error);
    return false;
  }

  return true;
}

/**
 * Get all members of a business profile
 */
export async function getCompanyMembers(businessProfileId: string): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from('company_members')
    .select(`
      *,
      profiles:user_id (full_name, avatar_url)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching company members:', error);
    return [];
  }

  return (data || []).map((member: any) => ({
    ...member,
    profile: member.profiles,
  }));
}

/**
 * Update a member's role or permissions
 */
export async function updateMember(
  memberId: string,
  updates: Partial<Pick<CompanyMember, 'role' | 'can_manage_invoices' | 'can_manage_expenses' | 'can_manage_documents' | 'can_manage_bank_accounts' | 'can_manage_team' | 'can_view_reports' | 'can_manage_settings'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('company_members')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) {
    console.error('Error updating member:', error);
    return false;
  }

  return true;
}

/**
 * Remove a member from a company
 */
export async function removeMember(memberId: string): Promise<boolean> {
  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('id', memberId)
    .neq('role', 'owner'); // Cannot remove owners

  if (error) {
    console.error('Error removing member:', error);
    return false;
  }

  return true;
}

/**
 * Get companies the current user is a member of (not owner)
 */
export async function getJoinedCompanies(): Promise<{ business_profile_id: string; role: string; business_profile: { id: string; name: string; tax_id: string } }[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('company_members')
    .select(`
      business_profile_id,
      role,
      business_profiles:business_profile_id (id, name, tax_id)
    `)
    .eq('user_id', userData.user.id)
    .neq('role', 'owner');

  if (error) {
    console.error('Error fetching joined companies:', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    business_profile_id: m.business_profile_id,
    role: m.role,
    business_profile: m.business_profiles,
  }));
}
