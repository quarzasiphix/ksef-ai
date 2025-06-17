
-- Add customer_id column to expenses table to store the supplier
ALTER TABLE public.expenses ADD COLUMN customer_id uuid;

-- Add a foreign key constraint to link to the customers table
ALTER TABLE public.expenses ADD CONSTRAINT expenses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
