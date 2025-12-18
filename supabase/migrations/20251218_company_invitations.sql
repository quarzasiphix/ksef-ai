-- Company Invitations & Team Members System
-- Allows company owners to invite accountants, pełnomocnicy, and other team members

-- ============================================
-- COMPANY MEMBERS TABLE
-- ============================================
-- Tracks who has access to which business profiles and their role
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role within the company
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'accountant', 'pelnomocnik', 'viewer')),
  
  -- Permissions (can be customized per member)
  can_manage_invoices BOOLEAN DEFAULT true,
  can_manage_expenses BOOLEAN DEFAULT true,
  can_manage_documents BOOLEAN DEFAULT true,
  can_manage_bank_accounts BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT true,
  can_manage_settings BOOLEAN DEFAULT false,
  
  -- Metadata
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique membership per user per company
  UNIQUE(business_profile_id, user_id)
);

-- ============================================
-- COMPANY INVITATIONS TABLE
-- ============================================
-- Pending invitations that haven't been accepted yet
CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Invitation details
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'pelnomocnik', 'viewer')),
  
  -- Optional message from inviter
  message TEXT,
  
  -- Invitation status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  
  -- Token for secure invitation link
  token UUID DEFAULT gen_random_uuid() UNIQUE,
  
  -- Expiration (default 7 days)
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  
  -- Who sent the invitation
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- When was it accepted/declined
  responded_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate pending invitations
  UNIQUE(business_profile_id, email, status) WHERE status = 'pending'
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_business ON company_members(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_status ON company_invitations(status) WHERE status = 'pending';

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- Company members: users can see members of companies they belong to
CREATE POLICY "Users can view members of their companies"
  ON company_members
  FOR SELECT
  USING (
    business_profile_id IN (
      SELECT business_profile_id FROM company_members WHERE user_id = auth.uid()
    )
    OR
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Company members: only owners/admins can manage members
CREATE POLICY "Owners and admins can manage members"
  ON company_members
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT business_profile_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Invitations: users can see invitations sent to their email
CREATE POLICY "Users can view invitations sent to them"
  ON company_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    invited_by = auth.uid()
    OR
    business_profile_id IN (
      SELECT business_profile_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Invitations: owners/admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
  ON company_invitations
  FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT business_profile_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Invitations: users can update invitations sent to them (accept/decline)
CREATE POLICY "Users can respond to their invitations"
  ON company_invitations
  FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    invited_by = auth.uid()
    OR
    business_profile_id IN (
      SELECT business_profile_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- HELPER FUNCTION: Auto-create owner membership when business profile is created
-- ============================================
CREATE OR REPLACE FUNCTION create_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_members (business_profile_id, user_id, role, can_manage_team, can_manage_settings, can_manage_bank_accounts)
  VALUES (NEW.id, NEW.user_id, 'owner', true, true, true)
  ON CONFLICT (business_profile_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create owner membership
DROP TRIGGER IF EXISTS trigger_create_owner_membership ON business_profiles;
CREATE TRIGGER trigger_create_owner_membership
  AFTER INSERT ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_owner_membership();

-- ============================================
-- HELPER FUNCTION: Accept invitation
-- ============================================
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token UUID)
RETURNS JSON AS $$
DECLARE
  inv RECORD;
  current_user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO current_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Find the invitation
  SELECT * INTO inv FROM company_invitations 
  WHERE token = invitation_token 
    AND status = 'pending'
    AND expires_at > now();
  
  IF inv IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found, expired, or already used');
  END IF;
  
  -- Verify email matches
  IF inv.email != current_user_email THEN
    RETURN json_build_object('success', false, 'error', 'This invitation was sent to a different email address');
  END IF;
  
  -- Create membership
  INSERT INTO company_members (business_profile_id, user_id, role, invited_by)
  VALUES (inv.business_profile_id, auth.uid(), inv.role, inv.invited_by)
  ON CONFLICT (business_profile_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  
  -- Update invitation status
  UPDATE company_invitations 
  SET status = 'accepted', responded_at = now(), updated_at = now()
  WHERE id = inv.id;
  
  RETURN json_build_object('success', true, 'business_profile_id', inv.business_profile_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE company_members IS 'Tracks team members and their roles within each business profile';
COMMENT ON TABLE company_invitations IS 'Pending invitations for users to join a company';
COMMENT ON COLUMN company_members.role IS 'owner: full access, admin: manage team, accountant: financial access, pelnomocnik: legal representative, viewer: read-only';
COMMENT ON COLUMN company_invitations.token IS 'Secure token for invitation link';
