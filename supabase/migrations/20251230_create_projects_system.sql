-- Projects table: logical grouping of business activities within a company
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    code TEXT, -- Short code for project (e.g., "SAAS", "TRANSPORT", "CONSTRUCTION")
    color TEXT DEFAULT '#3b82f6', -- UI color for visual distinction
    
    -- Lifecycle management
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed', 'archived')),
    
    -- Governance integration
    charter_decision_id UUID REFERENCES public.decisions(id), -- Founding decision that created this project
    parent_project_id UUID REFERENCES public.projects(id), -- For hierarchical projects (optional)
    
    -- Financial tracking
    budget_limit NUMERIC,
    currency TEXT DEFAULT 'PLN',
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Lifecycle timestamps
    activated_at TIMESTAMPTZ,
    frozen_at TIMESTAMPTZ,
    frozen_by UUID REFERENCES auth.users(id),
    freeze_decision_id UUID REFERENCES public.decisions(id),
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    close_decision_id UUID REFERENCES public.decisions(id),
    
    -- Sorting and display
    sort_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false, -- Default project for new transactions
    
    UNIQUE(business_profile_id, code)
);

-- Add project_id to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Add project_id to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Add project_id to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Add project_id to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Add project_id to decisions table (for project-scoped decisions)
ALTER TABLE public.decisions 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_business_profile ON public.projects(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_charter_decision ON public.projects(charter_decision_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_events_project ON public.events(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON public.contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON public.decisions(project_id);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects for their business profiles"
    ON public.projects FOR SELECT
    USING (
        business_profile_id IN (
            SELECT id FROM public.business_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create projects for their business profiles"
    ON public.projects FOR INSERT
    WITH CHECK (
        business_profile_id IN (
            SELECT id FROM public.business_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update projects for their business profiles"
    ON public.projects FOR UPDATE
    USING (
        business_profile_id IN (
            SELECT id FROM public.business_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete projects for their business profiles"
    ON public.projects FOR DELETE
    USING (
        business_profile_id IN (
            SELECT id FROM public.business_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Function to enforce freeze cascade rules
CREATE OR REPLACE FUNCTION check_project_freeze_rules()
RETURNS TRIGGER AS $$
DECLARE
    project_status TEXT;
BEGIN
    -- Check if the related project is frozen
    IF NEW.project_id IS NOT NULL THEN
        SELECT status INTO project_status
        FROM public.projects
        WHERE id = NEW.project_id;
        
        IF project_status = 'frozen' THEN
            RAISE EXCEPTION 'Cannot create new records for frozen project. Project must be active.';
        END IF;
        
        IF project_status = 'closed' THEN
            RAISE EXCEPTION 'Cannot create new records for closed project.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply freeze rules to invoices
CREATE TRIGGER enforce_project_freeze_on_invoices
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION check_project_freeze_rules();

-- Apply freeze rules to expenses
CREATE TRIGGER enforce_project_freeze_on_expenses
    BEFORE INSERT ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION check_project_freeze_rules();

-- Apply freeze rules to events
CREATE TRIGGER enforce_project_freeze_on_events
    BEFORE INSERT ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION check_project_freeze_rules();

-- Create view for project statistics
CREATE OR REPLACE VIEW public.project_stats AS
SELECT 
    p.id,
    p.business_profile_id,
    p.name,
    p.code,
    p.status,
    COUNT(DISTINCT i.id) as invoice_count,
    COUNT(DISTINCT e.id) as expense_count,
    COUNT(DISTINCT c.id) as contract_count,
    COUNT(DISTINCT ev.id) as event_count,
    COALESCE(SUM(CASE WHEN i.transaction_type = 'income' THEN i.total_gross_value ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN i.transaction_type = 'expense' THEN i.total_gross_value ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(e.amount), 0) as total_expense_amount,
    p.budget_limit,
    p.currency,
    p.created_at,
    p.updated_at
FROM public.projects p
LEFT JOIN public.invoices i ON i.project_id = p.id
LEFT JOIN public.expenses e ON e.project_id = p.id
LEFT JOIN public.contracts c ON c.project_id = p.id
LEFT JOIN public.events ev ON ev.project_id = p.id
GROUP BY p.id, p.business_profile_id, p.name, p.code, p.status, 
         p.budget_limit, p.currency, p.created_at, p.updated_at;

COMMENT ON TABLE public.projects IS 'Projects: logical grouping of business activities within a company profile. Used to separate different business lines (e.g., SaaS vs transport vs construction) for better organization and accounting.';
COMMENT ON COLUMN public.projects.status IS 'Lifecycle status: active (normal operations), frozen (no new transactions allowed), closed (completed), archived (historical)';
COMMENT ON COLUMN public.projects.charter_decision_id IS 'Optional link to the founding decision that authorized this project';
COMMENT ON COLUMN public.projects.code IS 'Short code for quick identification (e.g., SAAS, TRANSPORT)';
