
-- Add missing columns to labour_hours table if they don't exist
DO $$ 
BEGIN
    -- Check if columns exist before adding them
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labour_hours' AND column_name = 'is_paid') THEN
        ALTER TABLE public.labour_hours ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labour_hours' AND column_name = 'payment_date') THEN
        ALTER TABLE public.labour_hours ADD COLUMN payment_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labour_hours' AND column_name = 'notes') THEN
        ALTER TABLE public.labour_hours ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Create salary_payments table to track salary payments
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'salary', -- 'salary', 'hourly', 'bonus'
  labour_hours_ids UUID[], -- Array of labour_hours IDs included in this payment
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_payments table
CREATE POLICY "Users can view their own salary payments" 
  ON public.salary_payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own salary payments" 
  ON public.salary_payments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own salary payments" 
  ON public.salary_payments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own salary payments" 
  ON public.salary_payments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_salary_payments_user_id ON public.salary_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON public.salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_payment_date ON public.salary_payments(payment_date);
