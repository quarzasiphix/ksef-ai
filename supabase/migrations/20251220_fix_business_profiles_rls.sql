-- Fix RLS policies for business_profiles table
-- The error "new row violates row-level security policy" means INSERT policy is missing or too restrictive

-- First, check if RLS is enabled (it should be)
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can update their own business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can delete their own business profiles" ON business_profiles;

-- Create comprehensive RLS policies

-- SELECT: Users can view their own business profiles
CREATE POLICY "Users can view their own business profiles"
  ON business_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can create business profiles for themselves
-- CRITICAL: This policy was likely missing or incorrect
CREATE POLICY "Users can insert their own business profiles"
  ON business_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own business profiles
CREATE POLICY "Users can update their own business profiles"
  ON business_profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own business profiles
CREATE POLICY "Users can delete their own business profiles"
  ON business_profiles
  FOR DELETE
  USING (user_id = auth.uid());

-- Verify the policies are created
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for business_profiles have been recreated';
END $$;
