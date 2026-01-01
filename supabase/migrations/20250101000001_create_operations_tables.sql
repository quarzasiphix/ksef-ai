-- ============================================================================
-- OPERATIONS MODULE - Database Schema
-- ============================================================================
-- Creates tables for operational execution:
-- - vehicles (assets)
-- - drivers (personnel)
-- - operational_jobs (execution units)
-- - job_documents (job-scoped documents)
--
-- Key principle: No job without department authorization and required contracts
-- ============================================================================

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Basic info
  registration_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT,
  
  -- Operational
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'out_of_service')),
  vehicle_type TEXT,
  capacity NUMERIC,
  allowed_usage TEXT[],
  
  -- Legal requirements
  insurance_contract_id UUID REFERENCES contracts(id),
  insurance_expiry DATE,
  inspection_expiry DATE,
  license_expiry DATE,
  
  -- Ownership
  ownership_type TEXT CHECK (ownership_type IN ('owned', 'leased', 'borrowed')),
  vehicle_contract_id UUID REFERENCES contracts(id),
  
  -- Tracking
  current_job_id UUID,
  last_service_date DATE,
  next_service_date DATE,
  odometer INTEGER,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(department_id, registration_number)
);

CREATE INDEX idx_vehicles_department ON vehicles(department_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_current_job ON vehicles(current_job_id);
CREATE INDEX idx_vehicles_insurance_expiry ON vehicles(insurance_expiry) WHERE insurance_expiry IS NOT NULL;

-- ============================================================================
-- DRIVERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Employment
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'off_duty', 'blocked')),
  employment_type TEXT CHECK (employment_type IN ('employee', 'b2b', 'external')),
  driver_contract_id UUID REFERENCES contracts(id),
  
  -- Qualifications
  license_type TEXT,
  license_number TEXT,
  license_expiry DATE,
  certifications TEXT[],
  
  -- Operational constraints
  max_hours_per_day INTEGER,
  allowed_regions TEXT[],
  allowed_vehicle_types TEXT[],
  
  -- Tracking
  current_job_id UUID,
  assigned_vehicles UUID[],
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_drivers_department ON drivers(department_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_current_job ON drivers(current_job_id);
CREATE INDEX idx_drivers_license_expiry ON drivers(license_expiry) WHERE license_expiry IS NOT NULL;

-- ============================================================================
-- OPERATIONAL JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS operational_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Job identity
  job_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  job_type TEXT,
  
  -- Status and timeline
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'in_progress', 'completed', 'cancelled', 'blocked')),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Legal foundation (REQUIRED)
  department_decision_id UUID REFERENCES decisions(id),
  job_decision_id UUID REFERENCES decisions(id),
  
  -- Resource assignment
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  assigned_driver_id UUID REFERENCES drivers(id),
  
  -- Contracts (REQUIRED for execution)
  vehicle_contract_id UUID REFERENCES contracts(id),
  driver_contract_id UUID REFERENCES contracts(id),
  client_contract_id UUID REFERENCES contracts(id),
  
  -- Client info
  client_id UUID REFERENCES customers(id),
  client_name TEXT,
  client_contact TEXT,
  
  -- Transport-specific
  origin TEXT,
  destination TEXT,
  distance_km NUMERIC,
  cargo_description TEXT,
  special_requirements TEXT[],
  
  -- Financial
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  client_price NUMERIC,
  currency TEXT DEFAULT 'PLN',
  
  -- Blocking issues (JSONB for flexibility)
  blocking_issues JSONB,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(department_id, job_number)
);

CREATE INDEX idx_jobs_department ON operational_jobs(department_id);
CREATE INDEX idx_jobs_status ON operational_jobs(status);
CREATE INDEX idx_jobs_scheduled_start ON operational_jobs(scheduled_start);
CREATE INDEX idx_jobs_assigned_vehicle ON operational_jobs(assigned_vehicle_id);
CREATE INDEX idx_jobs_assigned_driver ON operational_jobs(assigned_driver_id);
CREATE INDEX idx_jobs_client ON operational_jobs(client_id);

-- ============================================================================
-- JOB DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES operational_jobs(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL CHECK (document_type IN (
    'delivery_confirmation',
    'veterinary_certificate',
    'handover_protocol',
    'invoice',
    'receipt',
    'other'
  )),
  title TEXT NOT NULL,
  file_url TEXT,
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_job_documents_job ON job_documents(job_id);
CREATE INDEX idx_job_documents_type ON job_documents(document_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_operations_updated_at();

CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_operations_updated_at();

CREATE TRIGGER operational_jobs_updated_at BEFORE UPDATE ON operational_jobs
  FOR EACH ROW EXECUTE FUNCTION update_operations_updated_at();

-- Auto-update vehicle/driver status when assigned to job
CREATE OR REPLACE FUNCTION update_resource_status_on_job_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vehicle status
  IF NEW.assigned_vehicle_id IS NOT NULL AND NEW.status = 'in_progress' THEN
    UPDATE vehicles 
    SET status = 'in_use', current_job_id = NEW.id
    WHERE id = NEW.assigned_vehicle_id;
  END IF;
  
  -- Update driver status
  IF NEW.assigned_driver_id IS NOT NULL AND NEW.status = 'in_progress' THEN
    UPDATE drivers 
    SET status = 'busy', current_job_id = NEW.id
    WHERE id = NEW.assigned_driver_id;
  END IF;
  
  -- Free resources when job completes
  IF NEW.status IN ('completed', 'cancelled') THEN
    IF NEW.assigned_vehicle_id IS NOT NULL THEN
      UPDATE vehicles 
      SET status = 'available', current_job_id = NULL
      WHERE id = NEW.assigned_vehicle_id;
    END IF;
    
    IF NEW.assigned_driver_id IS NOT NULL THEN
      UPDATE drivers 
      SET status = 'available', current_job_id = NULL
      WHERE id = NEW.assigned_driver_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_resource_status_update 
  AFTER INSERT OR UPDATE OF status, assigned_vehicle_id, assigned_driver_id 
  ON operational_jobs
  FOR EACH ROW 
  EXECUTE FUNCTION update_resource_status_on_job_assignment();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_documents ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "Users can view vehicles in their business profiles"
  ON vehicles FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage vehicles in their business profiles"
  ON vehicles FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Drivers policies
CREATE POLICY "Users can view drivers in their business profiles"
  ON drivers FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage drivers in their business profiles"
  ON drivers FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Operational jobs policies
CREATE POLICY "Users can view jobs in their business profiles"
  ON operational_jobs FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage jobs in their business profiles"
  ON operational_jobs FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Job documents policies
CREATE POLICY "Users can view job documents"
  ON job_documents FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM operational_jobs
      WHERE business_profile_id IN (
        SELECT id FROM business_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage job documents"
  ON job_documents FOR ALL
  USING (
    job_id IN (
      SELECT id FROM operational_jobs
      WHERE business_profile_id IN (
        SELECT id FROM business_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE vehicles IS 'Assets (vehicles) used for operational execution';
COMMENT ON TABLE drivers IS 'Personnel authorized to execute jobs';
COMMENT ON TABLE operational_jobs IS 'Execution units (trips, deliveries, services) - must have department authorization and required contracts';
COMMENT ON TABLE job_documents IS 'Documents scoped to specific jobs (delivery confirmations, protocols, etc.)';

COMMENT ON COLUMN operational_jobs.department_decision_id IS 'REQUIRED: Department authorization to operate';
COMMENT ON COLUMN operational_jobs.vehicle_contract_id IS 'REQUIRED: Lease/ownership contract for vehicle';
COMMENT ON COLUMN operational_jobs.driver_contract_id IS 'REQUIRED: Employment/B2B contract for driver';
COMMENT ON COLUMN operational_jobs.client_contract_id IS 'Service agreement with client (optional for some job types)';
COMMENT ON COLUMN operational_jobs.blocking_issues IS 'JSONB array of issues preventing job execution';
