# Multi-User Spółka System Design
## Electronic Signing & Member Management

### Overview
Enable spółka (sp. z o.o., S.A.) to add multiple users with different roles (zarząd, wspólnicy, rada nadzorcza) who can:
- Access the company's data based on their role
- View and approve uchwały (resolutions)
- Electronically sign documents
- Participate in decision-making processes

---

## Database Schema

### 1. Company Members Table
```sql
CREATE TABLE company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if not yet registered
  
  -- Member details
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  
  -- Role in company
  role TEXT NOT NULL CHECK (role IN (
    'shareholder',           -- Wspólnik
    'board_member',          -- Członek zarządu
    'supervisory_board',     -- Rada nadzorcza
    'proxy',                 -- Prokurent
    'accountant',            -- Księgowy (view-only)
    'observer'               -- Obserwator (read-only)
  )),
  
  -- Shareholding info (for wspólnicy)
  shares_count INTEGER DEFAULT 0,
  shares_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Board position (for zarząd)
  board_position TEXT, -- 'president', 'vice_president', 'member'
  
  -- Permissions
  can_sign_documents BOOLEAN DEFAULT false,
  can_approve_expenses BOOLEAN DEFAULT false,
  can_view_financials BOOLEAN DEFAULT true,
  expense_approval_limit DECIMAL(15,2), -- Max amount they can approve
  
  -- Status
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN (
    'invited',    -- Invitation sent, not yet accepted
    'active',     -- Active member with access
    'suspended',  -- Temporarily suspended
    'removed'     -- No longer with company
  )),
  
  -- Invitation
  invitation_token TEXT UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,
  
  -- Audit
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_profile_id, email)
);

CREATE INDEX idx_company_members_profile ON company_members(business_profile_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_status ON company_members(status) WHERE status = 'active';
CREATE INDEX idx_company_members_invitation ON company_members(invitation_token) WHERE invitation_token IS NOT NULL;
```

### 2. Document Signatures Table
```sql
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What is being signed
  document_type TEXT NOT NULL CHECK (document_type IN (
    'resolution',        -- Uchwała
    'contract',          -- Umowa
    'financial_report',  -- Sprawozdanie finansowe
    'decision',          -- Decyzja/mandat
    'other_document'     -- Inny dokument
  )),
  document_id UUID NOT NULL, -- ID of the document (resolution_id, contract_id, etc.)
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Who signed
  signer_member_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL, -- Cached for display
  signer_role TEXT NOT NULL, -- Role at time of signing
  
  -- Signature details
  signature_type TEXT NOT NULL CHECK (signature_type IN (
    'electronic',  -- Simple electronic signature (click to sign)
    'qualified',   -- Qualified electronic signature (future: Profil Zaufany)
    'biometric'    -- Future: biometric signature
  )),
  
  -- Signature data
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  signature_hash TEXT, -- Hash of document at time of signing
  
  -- Approval/rejection
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'abstained')),
  comment TEXT, -- Optional comment on signature
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_signatures_document ON document_signatures(document_type, document_id);
CREATE INDEX idx_signatures_member ON document_signatures(signer_member_id);
CREATE INDEX idx_signatures_profile ON document_signatures(business_profile_id);
CREATE INDEX idx_signatures_signed_at ON document_signatures(signed_at);
```

### 3. Resolution Approvals (Uchwały Workflow)
```sql
CREATE TABLE resolution_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id UUID NOT NULL REFERENCES resolutions(id) ON DELETE CASCADE,
  
  -- Approval requirements
  requires_shareholder_approval BOOLEAN DEFAULT true,
  requires_board_approval BOOLEAN DEFAULT false,
  required_votes_percentage DECIMAL(5,2) DEFAULT 50.00, -- % of shares needed
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Being prepared
    'pending',         -- Sent for approval
    'approved',        -- Fully approved
    'rejected',        -- Rejected
    'partially_approved' -- Some signed, waiting for others
  )),
  
  -- Deadlines
  voting_deadline TIMESTAMPTZ,
  
  -- Results (computed from signatures)
  total_votes_for INTEGER DEFAULT 0,
  total_votes_against INTEGER DEFAULT 0,
  total_abstentions INTEGER DEFAULT 0,
  votes_percentage DECIMAL(5,2) DEFAULT 0, -- % of shares that voted
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  
  UNIQUE(resolution_id)
);

CREATE INDEX idx_resolution_approvals_status ON resolution_approvals(status);
```

### 4. Update Resolutions Table
```sql
-- Add fields to existing resolutions table
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS requires_signatures BOOLEAN DEFAULT false;
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS signature_deadline TIMESTAMPTZ;
ALTER TABLE resolutions ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft' 
  CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));
```

---

## User Roles & Permissions

### Role Hierarchy

#### 1. **Wspólnik (Shareholder)**
- **Access:** Full financial visibility
- **Can:**
  - View all company data
  - Approve/reject strategic decisions (uchwały wspólników)
  - Sign resolutions requiring shareholder approval
  - View voting history and results
  - Propose new resolutions
- **Cannot:**
  - Modify operational data without board approval
  - Access day-to-day operations unless also board member

#### 2. **Członek Zarządu (Board Member)**
- **Access:** Full operational control
- **Can:**
  - Create and manage contracts, invoices, expenses
  - Approve operational decisions (uchwały zarządu)
  - Sign documents on behalf of company
  - Manage employees and contractors
  - View financial reports
- **Cannot:**
  - Make strategic decisions without shareholder approval
  - Change company structure

#### 3. **Rada Nadzorcza (Supervisory Board)**
- **Access:** Oversight and monitoring
- **Can:**
  - View all financial reports
  - Approve/reject major decisions
  - Access audit trails
  - Review board decisions
- **Cannot:**
  - Make operational decisions
  - Sign contracts or invoices

#### 4. **Prokurent (Proxy)**
- **Access:** Limited signing authority
- **Can:**
  - Sign specific types of documents (defined in scope)
  - Create contracts within authority limits
  - View relevant operational data
- **Cannot:**
  - Make strategic decisions
  - Access all financial data

#### 5. **Księgowy (Accountant)**
- **Access:** Financial data (read-only)
- **Can:**
  - View all invoices, expenses, reports
  - Export financial data
  - Generate reports
- **Cannot:**
  - Modify any data
  - Approve or sign documents

---

## Electronic Signature Workflow

### Simple Electronic Signature (MVP)

#### For Uchwały (Resolutions):
1. **Creation:** Board member or shareholder creates resolution
2. **Review:** Draft status, can be edited
3. **Send for Approval:** 
   - System determines required signers based on resolution type
   - Sends email notifications to all required signers
   - Resolution status → "pending"
4. **Signing Process:**
   - Member logs in, sees pending resolution
   - Reviews document content
   - Clicks "Approve" or "Reject" with optional comment
   - System records: timestamp, IP, user agent, document hash
5. **Completion:**
   - When required % of votes reached → status "approved"
   - System creates linked Decision (if applicable)
   - Email notification to all members
   - Resolution becomes immutable (archived)

#### For Contracts:
1. **Creation:** Board member creates contract
2. **Internal Approval:** If required, board members sign internally
3. **External Signing:** Generate signing link for counterparty
4. **Completion:** All parties signed → contract active

---

## UI Components

### 1. Members Management Page (`/settings/members`)
```tsx
// Features:
- List all company members with roles
- Add new member (send invitation)
- Edit member permissions
- Suspend/remove members
- View member activity log
```

### 2. Pending Approvals Widget (Dashboard)
```tsx
// Shows:
- Number of pending resolutions awaiting signature
- Urgent items (approaching deadline)
- Quick approve/reject actions
```

### 3. Resolution Signing Modal
```tsx
// Features:
- Full resolution text display
- Signature requirements (who needs to sign)
- Current voting status (X of Y signed)
- Approve/Reject/Abstain buttons
- Comment field
- Legal disclaimer
- "By clicking Approve, I electronically sign this document"
```

### 4. Signature History View
```tsx
// Shows:
- All signatures on a document
- Signer name, role, timestamp
- IP address (for audit)
- Action taken (approved/rejected)
- Comments
```

---

## Implementation Phases

### Phase 1: Basic Multi-User (Week 1-2)
- [ ] Create database tables
- [ ] Member invitation system
- [ ] Role-based access control (RLS policies)
- [ ] Basic member management UI
- [ ] User can accept invitation and join company

### Phase 2: Electronic Signatures (Week 3-4)
- [ ] Document signatures table
- [ ] Simple electronic signature for resolutions
- [ ] Signature recording (IP, timestamp, hash)
- [ ] Resolution approval workflow
- [ ] Email notifications for pending signatures

### Phase 3: Advanced Features (Week 5-6)
- [ ] Signature deadlines and reminders
- [ ] Voting percentage calculations
- [ ] Signature history and audit trail
- [ ] Contract signing workflow
- [ ] Mobile-friendly signing interface

### Phase 4: Enhanced Security (Future)
- [ ] Integration with Profil Zaufany (qualified signatures)
- [ ] Two-factor authentication for signing
- [ ] Biometric signatures (mobile app)
- [ ] Document encryption at rest
- [ ] Blockchain-based signature verification

---

## RLS Policies

```sql
-- Company members can only see members of their companies
CREATE POLICY "Users can view company members"
  ON company_members FOR SELECT
  USING (
    business_profile_id IN (
      SELECT business_profile_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only active board members can add new members
CREATE POLICY "Board members can manage members"
  ON company_members FOR ALL
  USING (
    business_profile_id IN (
      SELECT business_profile_id FROM company_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('board_member', 'shareholder')
    )
  );

-- Members can view signatures on documents they have access to
CREATE POLICY "Members can view signatures"
  ON document_signatures FOR SELECT
  USING (
    business_profile_id IN (
      SELECT business_profile_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

---

## Security Considerations

1. **Signature Integrity:**
   - Store SHA-256 hash of document at signing time
   - Verify document hasn't changed after signing
   - Immutable signature records

2. **Audit Trail:**
   - Record IP address and user agent
   - Timestamp all actions
   - Never delete signature records (soft delete only)

3. **Access Control:**
   - Strict RLS policies per role
   - Invitation tokens expire after 7 days
   - Require re-authentication for sensitive actions

4. **Legal Validity:**
   - Electronic signatures valid under eIDAS regulation (EU)
   - Store consent text with each signature
   - Maintain complete audit trail for 10+ years

---

## Next Steps

1. **Immediate:** Create database migration for company_members and document_signatures tables
2. **UI:** Build member management page in settings
3. **Workflow:** Implement resolution approval workflow with simple electronic signatures
4. **Integration:** Connect signatures to existing Decyzje system
5. **Testing:** Test with multiple users signing same document
6. **Documentation:** User guide for members on how to sign documents
