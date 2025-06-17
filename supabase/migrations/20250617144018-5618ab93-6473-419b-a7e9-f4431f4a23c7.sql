
-- Create employees table with all legal requirements for Polish employees
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  pesel TEXT NOT NULL, -- Polish national identification number
  nip TEXT, -- Tax identification number (optional for employees)
  start_date DATE NOT NULL,
  end_date DATE, -- For when employee leaves
  salary NUMERIC(10,2) NOT NULL, -- Monthly salary in PLN
  position TEXT NOT NULL,
  department TEXT,
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  bank_account TEXT, -- For salary transfers
  contract_type TEXT NOT NULL DEFAULT 'umowa_o_prace', -- umowa_o_prace, umowa_zlecenie, etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, pesel) -- Ensure no duplicate PESEL numbers per user
);

-- Create labour_hours table to track working hours
CREATE TABLE public.labour_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_worked NUMERIC(4,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
  overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
  break_time NUMERIC(4,2) NOT NULL DEFAULT 0, -- Break time in hours
  start_time TIME,
  end_time TIME,
  description TEXT, -- Optional description of work performed
  hourly_rate NUMERIC(8,2), -- Override default hourly rate if needed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, employee_id, work_date) -- One entry per employee per day
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees table
CREATE POLICY "Users can view their own employees" 
  ON public.employees 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own employees" 
  ON public.employees 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own employees" 
  ON public.employees 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own employees" 
  ON public.employees 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for labour_hours table
CREATE POLICY "Users can view their own labour hours" 
  ON public.labour_hours 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own labour hours" 
  ON public.labour_hours 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labour hours" 
  ON public.labour_hours 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labour hours" 
  ON public.labour_hours 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_pesel ON public.employees(pesel);
CREATE INDEX idx_labour_hours_user_id ON public.labour_hours(user_id);
CREATE INDEX idx_labour_hours_employee_id ON public.labour_hours(employee_id);
CREATE INDEX idx_labour_hours_work_date ON public.labour_hours(work_date);
