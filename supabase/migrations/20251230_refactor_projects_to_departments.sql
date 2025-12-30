-- Migration: Refactor Projects to Departments with nested Jobs
-- This migration renames the projects system to departments and adds a jobs table for nested project execution units
-- Following the hierarchy: Company → Department → Job/Project

-- Step 1: Rename projects table to departments
ALTER TABLE IF EXISTS projects RENAME TO departments;

-- Step 2: Rename sequences and constraints
ALTER SEQUENCE IF EXISTS projects_id_seq RENAME TO departments_id_seq;
ALTER INDEX IF EXISTS projects_pkey RENAME TO departments_pkey;
ALTER INDEX IF EXISTS projects_business_profile_id_idx RENAME TO departments_business_profile_id_idx;
ALTER INDEX IF EXISTS projects_code_idx RENAME TO departments_code_idx;

-- Step 3: Update RLS policies
DROP POLICY IF EXISTS "Users can view projects for their business profiles" ON departments;
DROP POLICY IF EXISTS "Users can create projects for their business profiles" ON departments;
DROP POLICY IF EXISTS "Users can update projects for their business profiles" ON departments;
DROP POLICY IF EXISTS "Users can delete projects for their business profiles" ON departments;

CREATE POLICY "Users can view departments for their business profiles"
  ON departments FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE business_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create departments for their business profiles"
  ON departments FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE business_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update departments for their business profiles"
  ON departments FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE business_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete departments for their business profiles"
  ON departments FOR DELETE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE business_profiles.user_id = auth.uid()
    )
  );

-- Step 4: Rename foreign key columns in related tables
-- Note: We keep project_id for backward compatibility but it now refers to department_id

-- Update column comments to reflect new meaning
COMMENT ON COLUMN invoices.project_id IS 'References departments.id - the department this invoice belongs to';
COMMENT ON COLUMN expenses.project_id IS 'References departments.id - the department this expense belongs to';
COMMENT ON COLUMN contracts.project_id IS 'References departments.id - the department this contract belongs to';
COMMENT ON COLUMN decisions.project_id IS 'References departments.id - the department this decision belongs to';
COMMENT ON COLUMN events.project_id IS 'References departments.id - the department this event belongs to';

-- Step 5: Create jobs table (nested projects inside departments)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  color TEXT DEFAULT '#0ea5e9',
  
  -- Job lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  target_completion_date DATE,
  
  -- Budget and financials
  budget_amount NUMERIC(15, 2),
  budget_currency TEXT DEFAULT 'PLN',
  actual_cost NUMERIC(15, 2) DEFAULT 0,
  actual_revenue NUMERIC(15, 2) DEFAULT 0,
  
  -- Governance
  charter_decision_id UUID REFERENCES decisions(id),
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(department_id, code),
  UNIQUE(department_id, name)
);

-- Indexes for jobs
CREATE INDEX jobs_department_id_idx ON jobs(department_id);
CREATE INDEX jobs_business_profile_id_idx ON jobs(business_profile_id);
CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_charter_decision_id_idx ON jobs(charter_decision_id);

-- Enable RLS on jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for jobs
CREATE POLICY "Users can view jobs for their business profiles"
  ON jobs FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE business_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create jobs for their business profiles"
  ON jobs FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE business_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update jobs for their business profiles"
  ON jobs FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE business_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete jobs for their business profiles"
  ON jobs FOR DELETE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE business_profiles.user_id = auth.uid()
    )
  );

-- Step 6: Add job_id to related tables (optional linking)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- Indexes for job_id foreign keys
CREATE INDEX IF NOT EXISTS invoices_job_id_idx ON invoices(job_id);
CREATE INDEX IF NOT EXISTS expenses_job_id_idx ON expenses(job_id);
CREATE INDEX IF NOT EXISTS contracts_job_id_idx ON contracts(job_id);
CREATE INDEX IF NOT EXISTS decisions_job_id_idx ON decisions(job_id);
CREATE INDEX IF NOT EXISTS events_job_id_idx ON events(job_id);

-- Step 7: Update triggers
DROP TRIGGER IF EXISTS update_projects_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create views for backward compatibility
CREATE OR REPLACE VIEW projects AS
  SELECT * FROM departments;

-- Step 9: Add department template field
ALTER TABLE departments ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'general' 
  CHECK (template IN ('general', 'construction', 'property_admin', 'marketing', 'saas', 'sales', 'operations'));

COMMENT ON COLUMN departments.template IS 'Department template defining enabled features and workflows';

-- Step 10: Create job stats view
CREATE OR REPLACE VIEW job_stats AS
SELECT 
  j.id AS job_id,
  j.department_id,
  j.name AS job_name,
  j.status,
  j.budget_amount,
  j.budget_currency,
  COUNT(DISTINCT i.id) AS total_invoices,
  COUNT(DISTINCT e.id) AS total_expenses,
  COUNT(DISTINCT c.id) AS total_contracts,
  COALESCE(SUM(CASE WHEN i.transaction_type = 'income' THEN i.total_gross_value ELSE 0 END), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN i.transaction_type = 'expense' THEN i.total_gross_value ELSE 0 END), 0) AS total_costs,
  j.actual_cost,
  j.actual_revenue,
  (j.actual_revenue - j.actual_cost) AS profit_margin
FROM jobs j
LEFT JOIN invoices i ON i.job_id = j.id
LEFT JOIN expenses e ON e.job_id = j.id
LEFT JOIN contracts c ON c.job_id = j.id
GROUP BY j.id, j.department_id, j.name, j.status, j.budget_amount, j.budget_currency, j.actual_cost, j.actual_revenue;

-- Step 11: Update department_stats view to include job counts
DROP VIEW IF EXISTS project_stats;
CREATE OR REPLACE VIEW department_stats AS
SELECT 
  d.id AS department_id,
  d.name AS department_name,
  d.status,
  d.budget_limit AS budget_amount,
  d.currency AS budget_currency,
  COUNT(DISTINCT j.id) AS total_jobs,
  COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) AS active_jobs,
  COUNT(DISTINCT i.id) AS total_invoices,
  COUNT(DISTINCT e.id) AS total_expenses,
  COUNT(DISTINCT c.id) AS total_contracts,
  COALESCE(SUM(CASE WHEN i.transaction_type = 'income' THEN i.total_gross_value ELSE 0 END), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN i.transaction_type = 'expense' THEN i.total_gross_value ELSE 0 END), 0) AS total_costs,
  COALESCE(SUM(CASE WHEN inv.transaction_type = 'expense' THEN inv.total_gross_value ELSE 0 END), 0) AS actual_cost,
  COALESCE(SUM(CASE WHEN inv.transaction_type = 'income' THEN inv.total_gross_value ELSE 0 END), 0) AS actual_revenue,
  (
    COALESCE(SUM(CASE WHEN inv.transaction_type = 'income' THEN inv.total_gross_value ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN inv.transaction_type = 'expense' THEN inv.total_gross_value ELSE 0 END), 0)
  ) AS profit_margin
FROM departments d
LEFT JOIN jobs j ON j.department_id = d.id
LEFT JOIN invoices i ON i.project_id = d.id
LEFT JOIN expenses e ON e.project_id = d.id
LEFT JOIN contracts c ON c.project_id = d.id
LEFT JOIN invoices inv ON inv.project_id = d.id
GROUP BY d.id, d.name, d.status, d.budget_limit, d.currency;

-- Step 12: Add comments for documentation
COMMENT ON TABLE departments IS 'Departments (formerly projects) - organizational units representing lines of business';
COMMENT ON TABLE jobs IS 'Jobs/Projects - time-bound execution units inside departments';
COMMENT ON COLUMN departments.template IS 'Template defining department type and enabled features (construction, marketing, etc.)';
COMMENT ON COLUMN jobs.department_id IS 'Parent department this job belongs to';
COMMENT ON COLUMN jobs.charter_decision_id IS 'Decision authorizing this job/project';
