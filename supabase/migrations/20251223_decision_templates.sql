-- ============================================
-- DECISION TEMPLATES SYSTEM
-- ============================================
-- Create a public table for decision templates that users can browse
-- and apply to their business profiles. This enables:
-- 1. Standardized decision templates for common operations
-- 2. User selection during business profile creation
-- 3. Future CMS admin panel for template management

-- Create decision_templates table
CREATE TABLE IF NOT EXISTS decision_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('strategic_shareholders', 'operational_board', 'supervisory_board')),
  category TEXT NOT NULL CHECK (category IN (
    'operational_activity',
    'company_financing',
    'compensation',
    'sales_services',
    'operational_costs',
    'b2b_contracts',
    'cash_management',
    'custom_projects',
    'other'
  )),
  scope_description TEXT,
  
  -- Template metadata
  is_foundational BOOLEAN DEFAULT false, -- True for core templates that should be suggested by default
  is_active BOOLEAN DEFAULT true, -- Can be disabled by admin
  industry_tags TEXT[], -- e.g., ['tech', 'retail', 'services']
  entity_types TEXT[], -- e.g., ['sp_zoo', 'sa', 'jdg'] - which entity types this applies to
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('polish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('polish', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('polish', coalesce(scope_description, '')), 'C')
  ) STORED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_decision_templates_category ON decision_templates(category);
CREATE INDEX IF NOT EXISTS idx_decision_templates_type ON decision_templates(decision_type);
CREATE INDEX IF NOT EXISTS idx_decision_templates_foundational ON decision_templates(is_foundational) WHERE is_foundational = true;
CREATE INDEX IF NOT EXISTS idx_decision_templates_active ON decision_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_decision_templates_search ON decision_templates USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_decision_templates_entity_types ON decision_templates USING gin(entity_types);

-- Enable RLS
ALTER TABLE decision_templates ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view templates)
CREATE POLICY "Anyone can view active decision templates"
  ON decision_templates
  FOR SELECT
  USING (is_active = true);

-- Only authenticated users can see inactive templates (for admin preview)
CREATE POLICY "Authenticated users can view all templates"
  ON decision_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete templates (will be refined with admin role later)
CREATE POLICY "Service role can manage templates"
  ON decision_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_decision_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decision_templates_updated_at
  BEFORE UPDATE ON decision_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_decision_templates_updated_at();

-- ============================================
-- POPULATE WITH EXISTING FOUNDATIONAL DECISIONS
-- ============================================

INSERT INTO decision_templates (
  title,
  description,
  decision_type,
  category,
  scope_description,
  is_foundational,
  entity_types
) VALUES
  -- Strategic (Shareholders) Decisions
  (
    'Zgoda na prowadzenie działalności operacyjnej',
    'Uchwała wspólników zezwalająca na prowadzenie bieżącej działalności gospodarczej spółki',
    'strategic_shareholders',
    'operational_activity',
    'Zarząd jest upoważniony do prowadzenia bieżącej działalności operacyjnej spółki zgodnie z przedmiotem działalności',
    true,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na finansowanie spółki',
    'Uchwała wspólników dotycząca kapitału zakładowego i możliwości zaciągania pożyczek',
    'strategic_shareholders',
    'company_financing',
    'Zarząd może zaciągać zobowiązania finansowe w ramach prowadzonej działalności',
    true,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na wynagrodzenie zarządu',
    'Uchwała wspólników określająca zasady wynagradzania członków zarządu',
    'strategic_shareholders',
    'compensation',
    'Członkowie zarządu otrzymują wynagrodzenie zgodnie z umowami o zarządzanie',
    true,
    ARRAY['sp_zoo', 'sa']
  ),
  
  -- Operational (Board) Decisions
  (
    'Zgoda na sprzedaż produktów i usług',
    'Uchwała zarządu zezwalająca na prowadzenie sprzedaży w ramach działalności',
    'operational_board',
    'sales_services',
    'Spółka może zawierać umowy sprzedaży produktów i świadczenia usług zgodnie z przedmiotem działalności',
    true,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na ponoszenie kosztów operacyjnych',
    'Uchwała zarządu dotycząca wydatków operacyjnych',
    'operational_board',
    'operational_costs',
    'Zarząd może ponosić koszty niezbędne do prowadzenia działalności: wynagrodzenia, usługi, materiały, infrastruktura',
    true,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na zawieranie umów B2B',
    'Uchwała zarządu zezwalająca na zawieranie umów z kontrahentami',
    'operational_board',
    'b2b_contracts',
    'Spółka może zawierać umowy z dostawcami, usługodawcami i innymi kontrahentami',
    true,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na zarządzanie kasą',
    'Uchwała zarządu dotycząca prowadzenia kasy fiskalnej i zarządzania gotówką',
    'operational_board',
    'cash_management',
    'Zarząd może prowadzić kasę fiskalną, dokonywać wpłat i wypłat gotówkowych w ramach działalności spółki',
    true,
    ARRAY['sp_zoo', 'sa']
  ),
  
  -- Additional common templates
  (
    'Zgoda na najem nieruchomości',
    'Uchwała zarządu dotycząca wynajmu powierzchni biurowej lub magazynowej',
    'operational_board',
    'operational_costs',
    'Zarząd może zawierać umowy najmu nieruchomości niezbędnych do prowadzenia działalności',
    false,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na zakup środków trwałych',
    'Uchwała zarządu dotycząca zakupu sprzętu, maszyn i innych środków trwałych',
    'operational_board',
    'operational_costs',
    'Zarząd może nabywać środki trwałe niezbędne do prowadzenia działalności',
    false,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na zatrudnianie pracowników',
    'Uchwała zarządu dotycząca polityki zatrudnienia',
    'operational_board',
    'compensation',
    'Zarząd może zawierać umowy o pracę i zlecenia z pracownikami i współpracownikami',
    false,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na marketing i reklamę',
    'Uchwała zarządu dotycząca działań marketingowych i reklamowych',
    'operational_board',
    'operational_costs',
    'Zarząd może prowadzić działania marketingowe i reklamowe w celu promocji działalności spółki',
    false,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na usługi IT i oprogramowanie',
    'Uchwała zarządu dotycząca zakupu licencji i usług informatycznych',
    'operational_board',
    'operational_costs',
    'Zarząd może nabywać licencje oprogramowania i usługi IT niezbędne do działalności',
    false,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na ubezpieczenia',
    'Uchwała zarządu dotycząca zawierania umów ubezpieczeniowych',
    'operational_board',
    'operational_costs',
    'Zarząd może zawierać umowy ubezpieczenia majątkowego, OC i innych ubezpieczeń dla spółki',
    false,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na kredyty i pożyczki bankowe',
    'Uchwała wspólników dotycząca zaciągania zobowiązań kredytowych',
    'strategic_shareholders',
    'company_financing',
    'Zarząd może zaciągać kredyty bankowe i pożyczki do określonej kwoty',
    false,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na eksport i import',
    'Uchwała zarządu dotycząca handlu zagranicznego',
    'operational_board',
    'sales_services',
    'Spółka może prowadzić działalność eksportową i importową zgodnie z przepisami',
    false,
    ARRAY['sp_zoo', 'sa']
  ),
  (
    'Zgoda na współpracę z podwykonawcami',
    'Uchwała zarządu dotycząca outsourcingu i podwykonawstwa',
    'operational_board',
    'b2b_contracts',
    'Zarząd może zlecać wykonanie części prac podwykonawcom i współpracownikom zewnętrznym',
    false,
    ARRAY['sp_zoo', 'sa']
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get recommended templates for a business profile
CREATE OR REPLACE FUNCTION get_recommended_decision_templates(
  p_entity_type TEXT,
  p_foundational_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  decision_type TEXT,
  category TEXT,
  scope_description TEXT,
  is_foundational BOOLEAN,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dt.id,
    dt.title,
    dt.description,
    dt.decision_type,
    dt.category,
    dt.scope_description,
    dt.is_foundational,
    dt.usage_count
  FROM decision_templates dt
  WHERE dt.is_active = true
    AND (p_entity_type = ANY(dt.entity_types) OR dt.entity_types IS NULL)
    AND (NOT p_foundational_only OR dt.is_foundational = true)
  ORDER BY dt.is_foundational DESC, dt.usage_count DESC, dt.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage count when template is used
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE decision_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recommended_decision_templates(TEXT, BOOLEAN) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated;

-- ============================================
-- ADD TEMPLATE_ID TO DECISIONS TABLE
-- ============================================

-- Add template_id column to decisions table to track which template was used
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES decision_templates(id) ON DELETE SET NULL;

-- Create index for template tracking
CREATE INDEX IF NOT EXISTS idx_decisions_template_id ON decisions(template_id) WHERE template_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN decisions.template_id IS 'Reference to the decision template used to create this decision';
