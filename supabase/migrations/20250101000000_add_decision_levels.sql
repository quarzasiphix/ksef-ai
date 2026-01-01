-- Migration: Add Decision Level System
-- Adds support for three-tier decision hierarchy: global, department, project

-- Add decision_level column
ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS decision_level TEXT 
CHECK (decision_level IN ('global', 'department', 'project'))
DEFAULT 'global';

-- Add parent_decision_id for hierarchy
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS parent_decision_id UUID
REFERENCES decisions(id) ON DELETE RESTRICT;

-- Add department_id for department-scoped decisions
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS department_id UUID
REFERENCES departments(id) ON DELETE CASCADE;

-- Add project_id for project-scoped decisions (if projects table exists)
-- Note: This assumes a projects table exists or will be created
-- ALTER TABLE decisions
-- ADD COLUMN IF NOT EXISTS project_id UUID
-- REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_decisions_level ON decisions(decision_level);
CREATE INDEX IF NOT EXISTS idx_decisions_parent ON decisions(parent_decision_id);
CREATE INDEX IF NOT EXISTS idx_decisions_department ON decisions(department_id);

-- Add comment explaining the hierarchy
COMMENT ON COLUMN decisions.decision_level IS 'Decision hierarchy level: global (company-wide), department (operational authority), project (execution-level)';
COMMENT ON COLUMN decisions.parent_decision_id IS 'Parent decision in hierarchy. Department decisions reference global decisions, project decisions reference department decisions.';
COMMENT ON COLUMN decisions.department_id IS 'Department this decision belongs to (for department and project level decisions)';

-- Create function to validate decision hierarchy
CREATE OR REPLACE FUNCTION validate_decision_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Global decisions cannot have parent or department
  IF NEW.decision_level = 'global' THEN
    IF NEW.parent_decision_id IS NOT NULL THEN
      RAISE EXCEPTION 'Global decisions cannot have a parent decision';
    END IF;
    IF NEW.department_id IS NOT NULL THEN
      RAISE EXCEPTION 'Global decisions cannot be linked to a department';
    END IF;
  END IF;

  -- Department decisions must have parent and department
  IF NEW.decision_level = 'department' THEN
    IF NEW.parent_decision_id IS NULL THEN
      RAISE EXCEPTION 'Department decisions must reference a parent global decision';
    END IF;
    IF NEW.department_id IS NULL THEN
      RAISE EXCEPTION 'Department decisions must be linked to a department';
    END IF;
    
    -- Verify parent is global level
    IF EXISTS (
      SELECT 1 FROM decisions 
      WHERE id = NEW.parent_decision_id 
      AND decision_level != 'global'
    ) THEN
      RAISE EXCEPTION 'Department decisions must reference a global decision as parent';
    END IF;
  END IF;

  -- Project decisions must have parent, department, and project
  IF NEW.decision_level = 'project' THEN
    IF NEW.parent_decision_id IS NULL THEN
      RAISE EXCEPTION 'Project decisions must reference a parent department decision';
    END IF;
    IF NEW.department_id IS NULL THEN
      RAISE EXCEPTION 'Project decisions must be linked to a department';
    END IF;
    
    -- Verify parent is department level
    IF EXISTS (
      SELECT 1 FROM decisions 
      WHERE id = NEW.parent_decision_id 
      AND decision_level != 'department'
    ) THEN
      RAISE EXCEPTION 'Project decisions must reference a department decision as parent';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce hierarchy validation
DROP TRIGGER IF EXISTS enforce_decision_hierarchy ON decisions;
CREATE TRIGGER enforce_decision_hierarchy
  BEFORE INSERT OR UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION validate_decision_hierarchy();

-- Create function to auto-create department decision
CREATE OR REPLACE FUNCTION auto_create_department_decision()
RETURNS TRIGGER AS $$
DECLARE
  v_global_decision_id UUID;
  v_decision_title TEXT;
  v_decision_description TEXT;
BEGIN
  -- Find a suitable global decision to reference
  -- Prefer "business activity consent" type decisions
  SELECT id INTO v_global_decision_id
  FROM decisions
  WHERE business_profile_id = NEW.business_profile_id
    AND decision_level = 'global'
    AND status = 'active'
    AND category IN ('operational_activity', 'b2b_contracts')
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no global decision exists, skip auto-creation
  -- (User should create global decisions first)
  IF v_global_decision_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Generate decision title based on department template
  CASE NEW.template
    WHEN 'funeral_home' THEN
      v_decision_title := 'Zgoda na świadczenie usług pogrzebowych';
      v_decision_description := 'Podstawa prawna do prowadzenia działalności w zakresie usług pogrzebowych. Decyzja ta autoryzuje dział do zawierania umów, świadczenia usług i rozliczania ceremonii.';
    WHEN 'construction' THEN
      v_decision_title := 'Zgoda na prowadzenie działalności budowlanej';
      v_decision_description := 'Podstawa prawna do prowadzenia działalności budowlanej.';
    WHEN 'property_admin' THEN
      v_decision_title := 'Zgoda na świadczenie usług administracji nieruchomości';
      v_decision_description := 'Podstawa prawna do prowadzenia działalności w zakresie zarządzania nieruchomościami.';
    WHEN 'marketing' THEN
      v_decision_title := 'Zgoda na prowadzenie działań marketingowych';
      v_decision_description := 'Podstawa prawna do prowadzenia działalności marketingowej.';
    WHEN 'saas' THEN
      v_decision_title := 'Zgoda na rozwój i sprzedaż produktu SaaS';
      v_decision_description := 'Podstawa prawna do prowadzenia działalności w zakresie rozwoju i sprzedaży oprogramowania.';
    ELSE
      v_decision_title := 'Zgoda na prowadzenie działalności: ' || NEW.name;
      v_decision_description := 'Podstawa prawna do prowadzenia działalności w ramach działu ' || NEW.name || '.';
  END CASE;

  -- Create department decision
  INSERT INTO decisions (
    business_profile_id,
    title,
    description,
    decision_type,
    category,
    decision_level,
    parent_decision_id,
    department_id,
    scope_description,
    status,
    created_by,
    created_at
  ) VALUES (
    NEW.business_profile_id,
    v_decision_title,
    v_decision_description,
    'operational_board',
    'operational_activity',
    'department',
    v_global_decision_id,
    NEW.id,
    'Autoryzacja operacyjna działu',
    'active',
    NEW.created_by,
    NOW()
  );

  -- Store the decision ID in department record
  NEW.charter_decision_id := (
    SELECT id FROM decisions 
    WHERE department_id = NEW.id 
    AND decision_level = 'department'
    ORDER BY created_at DESC 
    LIMIT 1
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create department decision on department creation
DROP TRIGGER IF EXISTS auto_create_dept_decision ON departments;
CREATE TRIGGER auto_create_dept_decision
  AFTER INSERT ON departments
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_department_decision();

-- Update existing decisions to have proper level
-- All existing decisions default to 'global' level
UPDATE decisions 
SET decision_level = 'global'
WHERE decision_level IS NULL;

-- Backfill department decisions for existing departments that don't have one
-- This is a one-time operation to ensure all departments have a charter decision
DO $$
DECLARE
  dept RECORD;
  v_global_decision_id UUID;
BEGIN
  FOR dept IN 
    SELECT d.* 
    FROM departments d
    LEFT JOIN decisions dec ON dec.department_id = d.id AND dec.decision_level = 'department'
    WHERE dec.id IS NULL
  LOOP
    -- Find a global decision to reference
    SELECT id INTO v_global_decision_id
    FROM decisions
    WHERE business_profile_id = dept.business_profile_id
      AND decision_level = 'global'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Only create if we have a global decision to reference
    IF v_global_decision_id IS NOT NULL THEN
      INSERT INTO decisions (
        business_profile_id,
        title,
        description,
        decision_type,
        category,
        decision_level,
        parent_decision_id,
        department_id,
        scope_description,
        status,
        created_by,
        created_at
      ) VALUES (
        dept.business_profile_id,
        'Zgoda na prowadzenie działalności: ' || dept.name,
        'Podstawa prawna do prowadzenia działalności w ramach działu ' || dept.name || '.',
        'operational_board',
        'operational_activity',
        'department',
        v_global_decision_id,
        dept.id,
        'Autoryzacja operacyjna działu',
        'active',
        dept.created_by,
        dept.created_at
      );

      -- Update department with charter decision ID
      UPDATE departments
      SET charter_decision_id = (
        SELECT id FROM decisions 
        WHERE department_id = dept.id 
        AND decision_level = 'department'
        ORDER BY created_at DESC 
        LIMIT 1
      )
      WHERE id = dept.id;
    END IF;
  END LOOP;
END $$;
