-- Enable Row Level Security if not already enabled
ALTER TABLE public.shared ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to delete only their own shared links
CREATE POLICY "Users can delete their own shared links"
  ON public.shared
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create an index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_shared_user_id ON public.shared(user_id);
