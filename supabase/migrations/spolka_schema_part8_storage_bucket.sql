-- Part 8: Create Storage Bucket for Company Documents
-- Note: Storage bucket creation is typically done via Supabase Dashboard or CLI
-- This migration sets up the storage policies

-- Storage policies for company-documents bucket
-- These will be applied once the bucket exists

-- Policy: Allow authenticated users to upload to their own business profile folders
-- Path pattern: {business_profile_id}/{category}/{filename}

-- Note: Run this in Supabase Dashboard SQL Editor after creating the bucket:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('company-documents', 'company-documents', false);

-- RLS Policies for storage (these work once bucket exists)
-- Uncomment and run after bucket creation:

/*
CREATE POLICY "Users can upload company documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their company documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
  )
);
*/

-- For now, we'll handle authorization at the application level
-- The bucket should be created with public: false for security


-- ============================================
-- CREATE BUCKET (IDEMPOTENT)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'company-documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('company-documents', 'company-documents', false);
  END IF;
END $$;


-- ============================================
-- STORAGE RLS POLICIES (IDEMPOTENT)
-- Path pattern: {business_profile_id}/{category}/{filename}
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload company documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can upload company documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'company-documents' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
        )
      )
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can view their company documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view their company documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'company-documents' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
        )
      )
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete their company documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can delete their company documents"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'company-documents' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
        )
      )
    $$;
  END IF;
END $$;
