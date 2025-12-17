-- Enhanced Document Management System for Spółki
-- Adds virtual folders, zarząd templates, and improved contract management

-- ============================================
-- DOCUMENT FOLDERS (Virtual Organization)
-- ============================================
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  folder_type TEXT CHECK (folder_type IN (
    'contracts',
    'resolutions',
    'board_documents',
    'correspondence',
    'tax_documents',
    'financial_reports',
    'licenses',
    'custom'
  )),
  
  -- Display settings
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_profile_id, parent_folder_id, name)
);

CREATE INDEX idx_document_folders_profile ON document_folders(business_profile_id);
CREATE INDEX idx_document_folders_parent ON document_folders(parent_folder_id);

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their document folders"
  ON document_folders
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ENHANCE COMPANY_DOCUMENTS WITH FOLDERS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_documents' AND column_name = 'folder_id') THEN
    ALTER TABLE company_documents ADD COLUMN folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_documents' AND column_name = 'tags') THEN
    ALTER TABLE company_documents ADD COLUMN tags TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_documents' AND column_name = 'is_template') THEN
    ALTER TABLE company_documents ADD COLUMN is_template BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_documents' AND column_name = 'template_type') THEN
    ALTER TABLE company_documents ADD COLUMN template_type TEXT CHECK (template_type IN (
      'board_resolution',
      'shareholder_resolution',
      'employment_contract',
      'service_contract',
      'nda',
      'power_of_attorney',
      'board_minutes',
      'other'
    ));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_documents' AND column_name = 'version') THEN
    ALTER TABLE company_documents ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_documents' AND column_name = 'parent_document_id') THEN
    ALTER TABLE company_documents ADD COLUMN parent_document_id UUID REFERENCES company_documents(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_documents_folder ON company_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_template ON company_documents(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_company_documents_tags ON company_documents USING gin(tags);

-- ============================================
-- CONTRACTS TABLE ENHANCEMENTS
-- ============================================
DO $$
BEGIN
  -- Add contract_type for spółka-specific contracts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'contract_type') THEN
    ALTER TABLE contracts ADD COLUMN contract_type TEXT DEFAULT 'general' CHECK (contract_type IN (
      'general',
      'employment',
      'service',
      'lease',
      'purchase',
      'board_member',
      'management_board',
      'supervisory_board',
      'nda',
      'partnership',
      'other'
    ));
  END IF;
  
  -- Add template support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'is_template') THEN
    ALTER TABLE contracts ADD COLUMN is_template BOOLEAN DEFAULT false;
  END IF;
  
  -- Add folder organization
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'folder_id') THEN
    ALTER TABLE contracts ADD COLUMN folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;
  END IF;
  
  -- Add signing parties for board contracts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'signing_parties') THEN
    ALTER TABLE contracts ADD COLUMN signing_parties JSONB DEFAULT '[]';
  END IF;
  
  -- Add board member reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'board_member_id') THEN
    ALTER TABLE contracts ADD COLUMN board_member_id UUID REFERENCES board_members(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_template ON contracts(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_contracts_folder ON contracts(folder_id);

-- ============================================
-- DOCUMENT TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'board_resolution',
    'shareholder_resolution',
    'employment_contract',
    'service_contract',
    'board_member_contract',
    'nda',
    'power_of_attorney',
    'board_minutes',
    'correspondence',
    'invoice',
    'other'
  )),
  
  -- Template content (HTML or Markdown)
  content TEXT NOT NULL,
  
  -- Variables that can be filled in
  variables JSONB DEFAULT '[]', -- [{name: "company_name", label: "Nazwa firmy", type: "text"}]
  
  -- Styling
  css_styles TEXT,
  
  -- Metadata
  is_public BOOLEAN DEFAULT false, -- Available to all users
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  tags TEXT[],
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_document_templates_profile ON document_templates(business_profile_id);
CREATE INDEX idx_document_templates_type ON document_templates(template_type);
CREATE INDEX idx_document_templates_public ON document_templates(is_public) WHERE is_public = true;

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public templates"
  ON document_templates
  FOR SELECT
  USING (is_public = true OR business_profile_id IN (
    SELECT id FROM business_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their templates"
  ON document_templates
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    ) OR business_profile_id IS NULL
  );

-- ============================================
-- GENERATED DOCUMENTS (From Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  
  -- Filled content
  content_html TEXT NOT NULL,
  variables_filled JSONB, -- Actual values used
  
  -- PDF generation
  pdf_file_path TEXT, -- Path in storage bucket
  pdf_generated_at TIMESTAMPTZ,
  
  -- Metadata
  document_number TEXT,
  document_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'signed', 'archived')),
  
  -- Linking
  linked_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  linked_resolution_id UUID REFERENCES resolutions(id) ON DELETE SET NULL,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generated_documents_profile ON generated_documents(business_profile_id);
CREATE INDEX idx_generated_documents_template ON generated_documents(template_id);
CREATE INDEX idx_generated_documents_folder ON generated_documents(folder_id);
CREATE INDEX idx_generated_documents_status ON generated_documents(status);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their generated documents"
  ON generated_documents
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- DEFAULT FOLDERS FOR SPÓŁKI
-- ============================================
CREATE OR REPLACE FUNCTION create_default_document_folders(profile_id UUID)
RETURNS void AS $$
BEGIN
  -- Only create for spółki
  IF EXISTS (
    SELECT 1 FROM business_profiles 
    WHERE id = profile_id 
    AND entity_type IN ('sp_zoo', 'sa')
  ) THEN
    -- Contracts folder
    INSERT INTO document_folders (business_profile_id, name, folder_type, icon, sort_order)
    VALUES 
      (profile_id, 'Umowy', 'contracts', 'FileText', 1),
      (profile_id, 'Uchwały', 'resolutions', 'FileCheck', 2),
      (profile_id, 'Dokumenty Zarządu', 'board_documents', 'Briefcase', 3),
      (profile_id, 'Korespondencja urzędowa', 'correspondence', 'Mail', 4),
      (profile_id, 'Dokumenty podatkowe', 'tax_documents', 'Receipt', 5),
      (profile_id, 'Sprawozdania finansowe', 'financial_reports', 'BarChart', 6),
      (profile_id, 'Licencje i zezwolenia', 'licenses', 'Award', 7)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DEFAULT TEMPLATES FOR SPÓŁKI
-- ============================================
INSERT INTO document_templates (name, description, template_type, content, variables, is_public, category)
VALUES 
  (
    'Uchwała Zarządu - Szablon podstawowy',
    'Podstawowy szablon uchwały zarządu spółki z o.o.',
    'board_resolution',
    '<div class="document">
      <h1 style="text-align: center;">UCHWAŁA ZARZĄDU</h1>
      <h2 style="text-align: center;">{{company_name}}</h2>
      <p style="text-align: center;">z dnia {{resolution_date}}</p>
      
      <p><strong>Numer uchwały:</strong> {{resolution_number}}</p>
      
      <h3>W sprawie: {{subject}}</h3>
      
      <p>Na podstawie {{legal_basis}} Zarząd {{company_name}} postanawia:</p>
      
      <div>{{resolution_content}}</div>
      
      <h3>Podpisy członków Zarządu:</h3>
      <div>{{board_signatures}}</div>
    </div>',
    '[
      {"name": "company_name", "label": "Nazwa spółki", "type": "text"},
      {"name": "resolution_date", "label": "Data uchwały", "type": "date"},
      {"name": "resolution_number", "label": "Numer uchwały", "type": "text"},
      {"name": "subject", "label": "Przedmiot uchwały", "type": "text"},
      {"name": "legal_basis", "label": "Podstawa prawna", "type": "text"},
      {"name": "resolution_content", "label": "Treść uchwały", "type": "textarea"},
      {"name": "board_signatures", "label": "Podpisy zarządu", "type": "textarea"}
    ]'::jsonb,
    true,
    'Zarząd'
  ),
  (
    'Protokół z posiedzenia Zarządu',
    'Szablon protokołu z posiedzenia zarządu',
    'board_minutes',
    '<div class="document">
      <h1 style="text-align: center;">PROTOKÓŁ Z POSIEDZENIA ZARZĄDU</h1>
      <h2 style="text-align: center;">{{company_name}}</h2>
      
      <p><strong>Data:</strong> {{meeting_date}}</p>
      <p><strong>Miejsce:</strong> {{meeting_place}}</p>
      <p><strong>Obecni:</strong> {{attendees}}</p>
      
      <h3>Porządek obrad:</h3>
      <div>{{agenda}}</div>
      
      <h3>Przebieg obrad:</h3>
      <div>{{meeting_content}}</div>
      
      <h3>Podjęte uchwały:</h3>
      <div>{{resolutions}}</div>
      
      <p>Protokół sporządził: {{prepared_by}}</p>
      <p>Data: {{prepared_date}}</p>
    </div>',
    '[
      {"name": "company_name", "label": "Nazwa spółki", "type": "text"},
      {"name": "meeting_date", "label": "Data posiedzenia", "type": "date"},
      {"name": "meeting_place", "label": "Miejsce", "type": "text"},
      {"name": "attendees", "label": "Lista obecnych", "type": "textarea"},
      {"name": "agenda", "label": "Porządek obrad", "type": "textarea"},
      {"name": "meeting_content", "label": "Przebieg obrad", "type": "textarea"},
      {"name": "resolutions", "label": "Podjęte uchwały", "type": "textarea"},
      {"name": "prepared_by", "label": "Sporządził", "type": "text"},
      {"name": "prepared_date", "label": "Data sporządzenia", "type": "date"}
    ]'::jsonb,
    true,
    'Zarząd'
  ),
  (
    'Umowa o pracę członka Zarządu',
    'Szablon umowy o pracę dla członka zarządu',
    'board_member_contract',
    '<div class="document">
      <h1 style="text-align: center;">UMOWA O PRACĘ</h1>
      
      <p>zawarta w dniu {{contract_date}} w {{contract_place}}</p>
      
      <p>pomiędzy:</p>
      <p><strong>{{company_name}}</strong><br/>
      z siedzibą w {{company_address}}<br/>
      NIP: {{company_nip}}, KRS: {{company_krs}}</p>
      
      <p>reprezentowaną przez: {{represented_by}}</p>
      
      <p>zwaną dalej "Pracodawcą"</p>
      
      <p>a</p>
      
      <p><strong>{{employee_name}}</strong><br/>
      zamieszkałym/ą: {{employee_address}}<br/>
      PESEL: {{employee_pesel}}</p>
      
      <p>zwanym/ą dalej "Pracownikiem"</p>
      
      <h3>§ 1. Przedmiot umowy</h3>
      <p>{{contract_content}}</p>
      
      <h3>§ 2. Wynagrodzenie</h3>
      <p>{{salary_terms}}</p>
      
      <div>{{additional_terms}}</div>
      
      <div style="margin-top: 50px;">
        <table width="100%">
          <tr>
            <td width="50%" style="text-align: center;">
              <p>_______________________</p>
              <p>Pracodawca</p>
            </td>
            <td width="50%" style="text-align: center;">
              <p>_______________________</p>
              <p>Pracownik</p>
            </td>
          </tr>
        </table>
      </div>
    </div>',
    '[
      {"name": "contract_date", "label": "Data umowy", "type": "date"},
      {"name": "contract_place", "label": "Miejsce zawarcia", "type": "text"},
      {"name": "company_name", "label": "Nazwa spółki", "type": "text"},
      {"name": "company_address", "label": "Adres spółki", "type": "text"},
      {"name": "company_nip", "label": "NIP", "type": "text"},
      {"name": "company_krs", "label": "KRS", "type": "text"},
      {"name": "represented_by", "label": "Reprezentowana przez", "type": "text"},
      {"name": "employee_name", "label": "Imię i nazwisko pracownika", "type": "text"},
      {"name": "employee_address", "label": "Adres pracownika", "type": "text"},
      {"name": "employee_pesel", "label": "PESEL", "type": "text"},
      {"name": "contract_content", "label": "Treść umowy", "type": "textarea"},
      {"name": "salary_terms", "label": "Warunki wynagrodzenia", "type": "textarea"},
      {"name": "additional_terms", "label": "Dodatkowe postanowienia", "type": "textarea"}
    ]'::jsonb,
    true,
    'Zarząd'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get folder tree for a business profile
CREATE OR REPLACE FUNCTION get_folder_tree(profile_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  folder_type TEXT,
  parent_folder_id UUID,
  level INTEGER,
  path TEXT
) AS $$
WITH RECURSIVE folder_tree AS (
  -- Root folders
  SELECT 
    f.id,
    f.name,
    f.folder_type,
    f.parent_folder_id,
    0 as level,
    f.name as path
  FROM document_folders f
  WHERE f.business_profile_id = profile_id
    AND f.parent_folder_id IS NULL
  
  UNION ALL
  
  -- Child folders
  SELECT 
    f.id,
    f.name,
    f.folder_type,
    f.parent_folder_id,
    ft.level + 1,
    ft.path || ' / ' || f.name
  FROM document_folders f
  INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
  WHERE f.business_profile_id = profile_id
)
SELECT * FROM folder_tree
ORDER BY path;
$$ LANGUAGE sql STABLE;
