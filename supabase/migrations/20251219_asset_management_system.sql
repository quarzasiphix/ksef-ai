-- Asset Management System - Decision-First Governance Model
-- Core principle: Assets exist because decisions bind capital, not because they were bought

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Universal Asset Table (single abstract object for all asset types)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Core identification
  asset_class TEXT NOT NULL CHECK (asset_class IN (
    'real_estate',
    'vehicle', 
    'ip',
    'equipment',
    'financial_asset'
  )),
  
  -- Legal basis (decision-first principle)
  legal_basis_type TEXT NOT NULL CHECK (legal_basis_type IN ('uchwala', 'contract', 'decision')),
  legal_basis_id UUID NOT NULL, -- References resolutions.id, contracts.id, or decisions.id
  
  -- Ownership
  ownership_type TEXT NOT NULL CHECK (ownership_type IN (
    'owned',
    'leased',
    'licensed',
    'right_of_use'
  )),
  
  -- Governance
  entry_date DATE NOT NULL,
  responsible_person_id UUID REFERENCES users(id), -- zarząd member or proxy
  
  -- Accounting
  accounting_classification TEXT NOT NULL CHECK (accounting_classification IN (
    'fixed_asset',
    'investment',
    'intangible',
    'current_asset'
  )),
  
  -- Lifecycle (forced state machine)
  status TEXT NOT NULL DEFAULT 'authorized' CHECK (status IN (
    'authorized',      -- Uchwała exists
    'acquired',        -- Acquired/Bound
    'operational',     -- Active use
    'modified',        -- Improvements/changes
    'impaired',        -- Suspended/impaired
    'disposed'         -- Sale/liquidation/end
  )),
  
  -- Metadata
  internal_name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_asset_per_profile UNIQUE (business_profile_id, internal_name)
);

-- Valuation Events (Asset ≠ value - store valuation events instead)
CREATE TABLE IF NOT EXISTS asset_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Valuation type
  valuation_type TEXT NOT NULL CHECK (valuation_type IN (
    'purchase_price',
    'book_value',
    'appraisal',
    'market_estimate',
    'impairment',
    'revaluation'
  )),
  
  -- Value
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  -- Source and authority
  method_source TEXT, -- e.g., "External appraisal by XYZ", "Accounting calculation"
  authority_level TEXT NOT NULL CHECK (authority_level IN (
    'accounting',
    'informational',
    'external_expert',
    'regulatory'
  )),
  
  -- Timing
  effective_date DATE NOT NULL,
  valid_until DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Obligations (Expenses attach to obligations, not assets)
CREATE TABLE IF NOT EXISTS asset_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Legal basis
  based_on_type TEXT NOT NULL CHECK (based_on_type IN ('uchwala', 'contract', 'decision')),
  based_on_id UUID NOT NULL,
  
  -- Purpose
  purpose TEXT NOT NULL CHECK (purpose IN (
    'acquire',
    'maintain',
    'improve',
    'dispose',
    'insure',
    'license'
  )),
  
  -- Asset linkage (optional - some obligations don't affect specific assets)
  affects_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  
  -- Accounting effect (decided BEFORE booking)
  accounting_effect TEXT NOT NULL CHECK (accounting_effect IN (
    'capitalized',  -- Increases asset value
    'expense',      -- Operating cost
    'deferred'      -- Prepaid/accrued
  )),
  
  -- Financial
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  -- Timing
  obligation_date DATE NOT NULL,
  due_date DATE,
  fulfilled_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'fulfilled',
    'cancelled'
  )),
  
  -- Metadata
  description TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================================================
-- ASSET CLASS SPECIFIC OVERLAYS (only add fields, not logic)
-- ============================================================================

-- Real Estate
CREATE TABLE IF NOT EXISTS asset_real_estate (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  
  address TEXT NOT NULL,
  land_register_reference TEXT,
  usage_type TEXT CHECK (usage_type IN (
    'office',
    'warehouse',
    'production',
    'residential',
    'commercial',
    'land'
  )),
  
  -- Depreciation
  depreciation_group TEXT,
  depreciation_rate DECIMAL(5, 2),
  
  -- Details
  area_sqm DECIMAL(10, 2),
  building_year INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS asset_vehicles (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  
  vin TEXT,
  registration_number TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  
  -- Operational
  mileage INTEGER,
  operational_policy TEXT CHECK (operational_policy IN (
    'business_only',
    'private_use_allowed',
    'pool_vehicle'
  )),
  
  -- Insurance
  insurance_policy_number TEXT,
  insurance_expiry DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intellectual Property
CREATE TABLE IF NOT EXISTS asset_ip (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  
  ip_type TEXT NOT NULL CHECK (ip_type IN (
    'software',
    'trademark',
    'patent',
    'copyright',
    'domain',
    'know_how'
  )),
  
  jurisdiction TEXT, -- e.g., "PL", "EU", "US"
  registration_number TEXT,
  
  -- License
  license_scope TEXT,
  license_expiry DATE,
  
  -- Protection
  protection_start_date DATE,
  protection_end_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment
CREATE TABLE IF NOT EXISTS asset_equipment (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  
  equipment_type TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  
  -- Operational
  location TEXT,
  condition TEXT CHECK (condition IN (
    'new',
    'good',
    'fair',
    'poor',
    'non_operational'
  )),
  
  -- Maintenance
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Assets
CREATE TABLE IF NOT EXISTS asset_financial (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  
  instrument_type TEXT NOT NULL CHECK (instrument_type IN (
    'shares',
    'bonds',
    'investment_fund',
    'deposit',
    'loan_receivable',
    'other'
  )),
  
  counterparty TEXT,
  counterparty_id UUID, -- Could reference another business_profile or external entity
  
  -- Risk
  risk_classification TEXT CHECK (risk_classification IN (
    'low',
    'medium',
    'high'
  )),
  
  -- Details
  quantity DECIMAL(15, 4),
  isin TEXT,
  maturity_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LIFECYCLE TRACKING
-- ============================================================================

-- Asset State Transitions (audit trail for lifecycle)
CREATE TABLE IF NOT EXISTS asset_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  
  transition_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  
  -- Authority
  authorized_by_type TEXT CHECK (authorized_by_type IN ('uchwala', 'decision', 'user')),
  authorized_by_id UUID,
  
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT valid_transition CHECK (
    (from_status = 'authorized' AND to_status IN ('acquired', 'disposed')) OR
    (from_status = 'acquired' AND to_status IN ('operational', 'disposed')) OR
    (from_status = 'operational' AND to_status IN ('modified', 'impaired', 'disposed')) OR
    (from_status = 'modified' AND to_status IN ('operational', 'impaired', 'disposed')) OR
    (from_status = 'impaired' AND to_status IN ('operational', 'disposed'))
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_assets_business_profile ON assets(business_profile_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_class ON assets(asset_class);
CREATE INDEX idx_assets_legal_basis ON assets(legal_basis_type, legal_basis_id);

CREATE INDEX idx_valuations_asset ON asset_valuations(asset_id);
CREATE INDEX idx_valuations_effective_date ON asset_valuations(effective_date);

CREATE INDEX idx_obligations_business_profile ON asset_obligations(business_profile_id);
CREATE INDEX idx_obligations_asset ON asset_obligations(affects_asset_id);
CREATE INDEX idx_obligations_status ON asset_obligations(status);

CREATE INDEX idx_transitions_asset ON asset_state_transitions(asset_id);
CREATE INDEX idx_transitions_date ON asset_state_transitions(transition_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_real_estate ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_ip ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_financial ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_state_transitions ENABLE ROW LEVEL SECURITY;

-- Assets policies
CREATE POLICY "Users can view assets for their business profiles"
  ON assets FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assets for their business profiles"
  ON assets FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update assets for their business profiles"
  ON assets FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Valuations policies
CREATE POLICY "Users can view valuations for their assets"
  ON asset_valuations FOR SELECT
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create valuations for their assets"
  ON asset_valuations FOR INSERT
  WITH CHECK (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Obligations policies
CREATE POLICY "Users can view obligations for their business profiles"
  ON asset_obligations FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create obligations for their business profiles"
  ON asset_obligations FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update obligations for their business profiles"
  ON asset_obligations FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Asset class overlay policies (same pattern for all)
CREATE POLICY "Users can view real estate for their assets"
  ON asset_real_estate FOR SELECT
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage real estate for their assets"
  ON asset_real_estate FOR ALL
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Repeat for other asset class tables
CREATE POLICY "Users can view vehicles for their assets"
  ON asset_vehicles FOR ALL
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view IP for their assets"
  ON asset_ip FOR ALL
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view equipment for their assets"
  ON asset_equipment FOR ALL
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view financial assets for their assets"
  ON asset_financial FOR ALL
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- State transitions policies
CREATE POLICY "Users can view state transitions for their assets"
  ON asset_state_transitions FOR SELECT
  USING (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create state transitions for their assets"
  ON asset_state_transitions FOR INSERT
  WITH CHECK (
    asset_id IN (
      SELECT id FROM assets WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_asset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_updated_at();

CREATE TRIGGER obligations_updated_at
  BEFORE UPDATE ON asset_obligations
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_updated_at();

-- Automatic state transition logging
CREATE OR REPLACE FUNCTION log_asset_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO asset_state_transitions (
      asset_id,
      from_status,
      to_status,
      created_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asset_status_change_logger
  AFTER UPDATE ON assets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_asset_state_change();
