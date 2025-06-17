
-- Add inventory tracking columns to the products table
ALTER TABLE public.products
ADD COLUMN track_stock BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.products
ADD COLUMN stock NUMERIC NOT NULL DEFAULT 0;
