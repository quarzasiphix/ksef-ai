-- =====================================================
-- STORAGE FILES WITH ATTACHMENT STATS VIEW
-- Provides real-time attachment counts and status for files
-- =====================================================

-- Create view for storage files with attachment statistics
CREATE OR REPLACE VIEW public.storage_files_with_attachment_count AS
SELECT 
  sf.*,
  -- Attachment counts
  COALESCE(att_stats.attachment_count, 0) as attachment_count,
  COALESCE(att_stats.linked_entities_count, 0) as linked_entities_count,
  
  -- Status flags
  CASE 
    WHEN COALESCE(att_stats.attachment_count, 0) = 0 THEN 'unlinked'
    WHEN COALESCE(att_stats.attachment_count, 0) > 0 THEN 'in_use'
    ELSE 'unknown'
  END as link_status,
  
  -- Requires attention flag
  CASE
    -- Unlinked file older than 30 days
    WHEN COALESCE(att_stats.attachment_count, 0) = 0 
      AND sf.uploaded_at < NOW() - INTERVAL '30 days' THEN true
    -- File has attachments but might have issues (extensible)
    ELSE false
  END as requires_attention,
  
  -- Department info
  d.name as department_name,
  d.color as department_color,
  
  -- Folder info
  folder.name as folder_name,
  folder.path as folder_path

FROM public.storage_files sf

-- Left join attachment statistics
LEFT JOIN (
  SELECT 
    storage_file_id,
    COUNT(*) as attachment_count,
    COUNT(DISTINCT (entity_type, entity_id)) as linked_entities_count
  FROM public.attachments
  GROUP BY storage_file_id
) att_stats ON sf.id = att_stats.storage_file_id

-- Left join department
LEFT JOIN public.departments d ON sf.department_id = d.id

-- Left join folder
LEFT JOIN public.storage_folders folder ON sf.storage_folder_id = folder.id;

-- Grant permissions
GRANT SELECT ON public.storage_files_with_attachment_count TO authenticated;

-- Create helper view for unlinked files (cleanup queue)
CREATE OR REPLACE VIEW public.storage_files_unlinked AS
SELECT *
FROM public.storage_files_with_attachment_count
WHERE attachment_count = 0
ORDER BY uploaded_at DESC;

-- Grant permissions
GRANT SELECT ON public.storage_files_unlinked TO authenticated;

-- Create helper view for files requiring attention
CREATE OR REPLACE VIEW public.storage_files_requiring_attention AS
SELECT *
FROM public.storage_files_with_attachment_count
WHERE requires_attention = true
ORDER BY uploaded_at ASC;

-- Grant permissions
GRANT SELECT ON public.storage_files_requiring_attention TO authenticated;

-- Create view for attachment details with entity info
CREATE OR REPLACE VIEW public.attachment_links_detailed AS
SELECT 
  a.id as attachment_id,
  a.storage_file_id,
  a.entity_type,
  a.entity_id,
  a.role,
  a.note,
  a.created_at as linked_at,
  sf.file_name,
  sf.file_size,
  sf.mime_type,
  
  -- Try to get entity display name (extensible)
  CASE a.entity_type
    WHEN 'decision' THEN (
      SELECT title FROM public.decisions WHERE id = a.entity_id
    )
    WHEN 'contract' THEN (
      SELECT subject FROM public.contracts WHERE id = a.entity_id
    )
    ELSE a.entity_id::text
  END as entity_display_name,
  
  -- Entity status for attention rules
  CASE a.entity_type
    WHEN 'decision' THEN (
      SELECT status FROM public.decisions WHERE id = a.entity_id
    )
    ELSE NULL
  END as entity_status

FROM public.attachments a
JOIN public.storage_files sf ON a.storage_file_id = sf.id;

-- Grant permissions
GRANT SELECT ON public.attachment_links_detailed TO authenticated;

-- Create function to check if decision requires signed PDF
CREATE OR REPLACE FUNCTION public.decision_requires_signed_pdf(decision_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  decision_status TEXT;
  has_signed_pdf BOOLEAN;
BEGIN
  -- Get decision status
  SELECT status INTO decision_status
  FROM public.decisions
  WHERE id = decision_id;
  
  -- Check if decision is in a state requiring signed PDF
  IF decision_status NOT IN ('ZATWIERDZONA', 'AKTYWNA', 'active', 'approved') THEN
    RETURN false;
  END IF;
  
  -- Check if signed PDF exists
  SELECT EXISTS(
    SELECT 1 FROM public.attachments
    WHERE entity_type = 'decision'
      AND entity_id = decision_id
      AND role = 'DECISION_SIGNED_PDF'
  ) INTO has_signed_pdf;
  
  RETURN NOT has_signed_pdf;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.decision_requires_signed_pdf TO authenticated;

-- Create view for decisions requiring attention (missing signed PDF)
CREATE OR REPLACE VIEW public.decisions_requiring_attention AS
SELECT 
  d.*,
  public.decision_requires_signed_pdf(d.id) as missing_signed_pdf
FROM public.decisions d
WHERE public.decision_requires_signed_pdf(d.id) = true;

-- Grant permissions
GRANT SELECT ON public.decisions_requiring_attention TO authenticated;
