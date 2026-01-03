-- Storage Buckets for Document Repository
-- This migration creates the necessary storage infrastructure for the document repository system

-- Create storage bucket for document files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket, requires authentication
  52428800, -- 50MB file size limit
  ARRAY[
    'application/pdf',
    'application/xml',
    'text/xml',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/json',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage Folders Table (Virtual folder structure)
CREATE TABLE IF NOT EXISTS public.storage_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.storage_folders(id) ON DELETE CASCADE,
  
  -- Folder info
  name TEXT NOT NULL,
  description TEXT,
  path TEXT NOT NULL, -- Computed path like /krs/oswiadczenia
  
  -- Visual
  icon TEXT,
  color TEXT,
  
  -- Tags for categorization
  tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_folder_path_per_profile UNIQUE (business_profile_id, path),
  CONSTRAINT no_self_parent CHECK (id != parent_folder_id)
);

CREATE TABLE IF NOT EXISTS public.storage_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_folder_id UUID NOT NULL REFERENCES public.storage_folders(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  
  -- File info
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase storage bucket
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  
  -- Optional document links (foreign keys added once target tables exist)
  document_id UUID,
  attachment_id UUID,
  
  -- Metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  parent_file_id UUID REFERENCES public.storage_files(id) ON DELETE SET NULL,
  
  -- Upload info
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- OCR and search
  ocr_text TEXT,
  ocr_processed BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_storage_path UNIQUE (storage_path)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_folders_business_profile ON public.storage_folders(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_storage_folders_parent ON public.storage_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_storage_folders_path ON public.storage_folders(path);
CREATE INDEX IF NOT EXISTS idx_storage_folders_tags ON public.storage_folders USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_storage_files_folder ON public.storage_files(storage_folder_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_business_profile ON public.storage_files(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_document ON public.storage_files(document_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_tags ON public.storage_files USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_storage_files_ocr_text ON public.storage_files USING GIN(to_tsvector('english', ocr_text));

-- Enable RLS
ALTER TABLE public.storage_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders in their business profiles"
  ON public.storage_folders FOR SELECT
  USING (
    business_profile_id = auth.uid()
  );

CREATE POLICY "Users can create folders in their business profiles"
  ON public.storage_folders FOR INSERT
  WITH CHECK (
    business_profile_id = auth.uid()
  );

CREATE POLICY "Users can update folders in their business profiles"
  ON public.storage_folders FOR UPDATE
  USING (
    business_profile_id = auth.uid()
  );

CREATE POLICY "Users can delete folders in their business profiles"
  ON public.storage_folders FOR DELETE
  USING (
    business_profile_id = auth.uid()
  );

--- RLS Policies for storage_files
CREATE POLICY "Users can view files in their business profiles"
  ON public.storage_files FOR SELECT
  USING (
    business_profile_id = auth.uid()
  );

CREATE POLICY "Users can upload files to their business profiles"
  ON public.storage_files FOR INSERT
  WITH CHECK (
    business_profile_id = auth.uid()
  );

CREATE POLICY "Users can update files in their business profiles"
  ON public.storage_files FOR UPDATE
  USING (
    business_profile_id = auth.uid()
  );

CREATE POLICY "Users can delete files in their business profiles"
  ON public.storage_files FOR DELETE
  USING (
    business_profile_id = auth.uid()
  );

--- Storage bucket policies
CREATE POLICY "Users can view files in their business profile folders"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
  );

CREATE POLICY "Users can upload files to their business profile folders"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
  );

CREATE POLICY "Users can update files in their business profile folders"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
  );

CREATE POLICY "Users can delete files in their business profile folders"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_storage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_storage_folders_updated_at
  BEFORE UPDATE ON public.storage_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_updated_at();

CREATE TRIGGER update_storage_files_updated_at
  BEFORE UPDATE ON public.storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_updated_at();

-- Function to compute folder path
CREATE OR REPLACE FUNCTION compute_folder_path(folder_id UUID)
RETURNS TEXT AS $$
DECLARE
  current_id UUID := folder_id;
  current_name TEXT;
  parent_id UUID;
  path_parts TEXT[] := '{}';
BEGIN
  LOOP
    SELECT name, parent_folder_id INTO current_name, parent_id
    FROM public.storage_folders
    WHERE id = current_id;
    
    IF current_name IS NULL THEN
      EXIT;
    END IF;
    
    path_parts := array_prepend(current_name, path_parts);
    
    IF parent_id IS NULL THEN
      EXIT;
    END IF;
    
    current_id := parent_id;
  END LOOP;
  
  RETURN '/' || array_to_string(path_parts, '/');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update path on folder changes
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
BEGIN
  NEW.path := compute_folder_path(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_folder_path_trigger
  BEFORE INSERT OR UPDATE OF name, parent_folder_id ON public.storage_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_path();
