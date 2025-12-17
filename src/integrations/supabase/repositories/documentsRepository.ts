import { supabase } from '../client';
import type {
  DocumentFolder,
  DocumentTemplate,
  GeneratedDocument,
  CreateFolderInput,
  CreateTemplateInput,
  GenerateDocumentInput,
  FolderTreeNode,
} from '@/types/documents';

// Re-export types for convenience
export type {
  DocumentFolder,
  DocumentTemplate,
  GeneratedDocument,
  CreateFolderInput,
  CreateTemplateInput,
  GenerateDocumentInput,
  FolderTreeNode,
} from '@/types/documents';

export type DocumentCategory = 
  | 'contracts_vehicles'
  | 'contracts_infrastructure'
  | 'contracts_services'
  | 'contracts_other'
  | 'resolutions'
  | 'licenses'
  | 'financial_statements'
  | 'tax_filings'
  | 'other';

export interface CompanyDocument {
  id: string;
  business_profile_id: string;
  category: DocumentCategory;
  folder_id?: string | null;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  title: string;
  description?: string;
  document_date?: string;
  expiry_date?: string;
  reference_number?: string;
  linked_contract_id?: string;
  linked_resolution_id?: string;
  decision_id?: string | null;
  decision_reference?: string | null;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contracts_vehicles: 'Umowy - Pojazdy',
  contracts_infrastructure: 'Umowy - Infrastruktura',
  contracts_services: 'Umowy - Usługi',
  contracts_other: 'Umowy - Inne',
  resolutions: 'Uchwały',
  licenses: 'Licencje i zezwolenia',
  financial_statements: 'Sprawozdania finansowe',
  tax_filings: 'Dokumenty podatkowe',
  other: 'Inne dokumenty',
};

export const DOCUMENT_FOLDER_STRUCTURE: Record<DocumentCategory, string> = {
  contracts_vehicles: 'contracts/vehicles',
  contracts_infrastructure: 'contracts/infrastructure',
  contracts_services: 'contracts/services',
  contracts_other: 'contracts/other',
  resolutions: 'resolutions',
  licenses: 'licenses',
  financial_statements: 'financial_statements',
  tax_filings: 'tax_filings',
  other: 'other',
};

function buildCompanyDocumentPath(input: {
  businessProfileId: string;
  category: DocumentCategory;
  safeFileName: string;
  timestamp: number;
  folderId?: string | null;
}): string {
  if (input.folderId) {
    return `${input.businessProfileId}/folders/${input.folderId}/${input.category}/${input.timestamp}_${input.safeFileName}`;
  }

  const legacyFolder = DOCUMENT_FOLDER_STRUCTURE[input.category];
  return `${input.businessProfileId}/${legacyFolder}/${input.timestamp}_${input.safeFileName}`;
}

async function ensureStorageFolderPlaceholder(input: {
  businessProfileId: string;
  folderId: string;
}): Promise<void> {
  const keepPath = `${input.businessProfileId}/folders/${input.folderId}/.keep`;

  try {
    const { error } = await supabase.storage
      .from('company-documents')
      .upload(keepPath, new Blob(['']), { upsert: false, cacheControl: '3600' });

    // Ignore "already exists" errors
    if (error && (error as any)?.statusCode !== 409) {
      console.warn('Storage placeholder upload failed:', error);
    }
  } catch (e) {
    // Best-effort only
    console.warn('Storage placeholder upload failed:', e);
  }
}

// ============================================
// DOCUMENT CRUD OPERATIONS
// ============================================

export async function getCompanyDocuments(
  businessProfileId: string,
  category?: DocumentCategory
): Promise<CompanyDocument[]> {
  let query = supabase
    .from('company_documents')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getCompanyDocument(id: string): Promise<CompanyDocument | null> {
  const { data, error } = await supabase
    .from('company_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function saveCompanyDocument(
  document: Omit<CompanyDocument, 'id' | 'created_at' | 'updated_at'>
): Promise<CompanyDocument> {
  const { data, error } = await supabase
    .from('company_documents')
    .insert({
      ...document,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCompanyDocument(
  id: string,
  updates: Partial<CompanyDocument>
): Promise<void> {
  const { error } = await supabase
    .from('company_documents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteCompanyDocument(id: string): Promise<void> {
  // First get the document to find the file path
  const doc = await getCompanyDocument(id);
  
  if (doc?.file_path) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('company-documents')
      .remove([doc.file_path]);
    
    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }
  }
  
  // Delete metadata
  const { error } = await supabase
    .from('company_documents')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// FILE UPLOAD/DOWNLOAD
// ============================================

/**
 * Upload a file to Supabase Storage and create metadata record
 */
export async function uploadCompanyDocument(
  businessProfileId: string,
  category: DocumentCategory,
  file: File,
  metadata: {
    title: string;
    description?: string;
    document_date?: string;
    expiry_date?: string;
    reference_number?: string;
    linked_contract_id?: string;
    linked_resolution_id?: string;
    folder_id?: string;
  }
): Promise<CompanyDocument> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Generate unique file path
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = buildCompanyDocumentPath({
    businessProfileId,
    category,
    safeFileName,
    timestamp,
    folderId: metadata.folder_id ?? null,
  });
  
  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('company-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (uploadError) throw uploadError;
  
  // Create metadata record
  const document = await saveCompanyDocument({
    business_profile_id: businessProfileId,
    category,
    folder_id: metadata.folder_id ?? null,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type,
    title: metadata.title,
    description: metadata.description,
    document_date: metadata.document_date,
    expiry_date: metadata.expiry_date,
    reference_number: metadata.reference_number,
    linked_contract_id: metadata.linked_contract_id,
    linked_resolution_id: metadata.linked_resolution_id,
    uploaded_by: user?.id,
  });
  
  return document;
}

/**
 * Get a signed URL for downloading a document
 */
export async function getDocumentDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('company-documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry
  
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Get documents grouped by category for display
 */
export async function getDocumentsByCategory(
  businessProfileId: string
): Promise<Record<DocumentCategory, CompanyDocument[]>> {
  const documents = await getCompanyDocuments(businessProfileId);
  
  const grouped: Record<DocumentCategory, CompanyDocument[]> = {
    contracts_vehicles: [],
    contracts_infrastructure: [],
    contracts_services: [],
    contracts_other: [],
    resolutions: [],
    licenses: [],
    financial_statements: [],
    tax_filings: [],
    other: [],
  };
  
  documents.forEach(doc => {
    if (grouped[doc.category]) {
      grouped[doc.category].push(doc);
    }
  });
  
  return grouped;
}

/**
 * Get documents expiring soon
 */
export async function getExpiringDocuments(
  businessProfileId: string,
  daysAhead: number = 30
): Promise<CompanyDocument[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const { data, error } = await supabase
    .from('company_documents')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .gte('expiry_date', new Date().toISOString().split('T')[0])
    .order('expiry_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// ============================================
// FOLDER MANAGEMENT
// ============================================

export async function getDocumentFolders(
  businessProfileId: string
): Promise<DocumentFolder[]> {
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getFolderTree(
  businessProfileId: string
): Promise<FolderTreeNode[]> {
  const { data, error } = await supabase
    .rpc('get_folder_tree', { profile_id: businessProfileId });
  
  if (error) throw error;
  
  // Build tree structure
  const folders = data || [];
  const folderMap = new Map<string, FolderTreeNode>();
  const rootFolders: FolderTreeNode[] = [];
  
  // First pass: create all nodes
  folders.forEach((folder: any) => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
    });
  });
  
  // Second pass: build tree
  folders.forEach((folder: any) => {
    const node = folderMap.get(folder.id)!;
    if (folder.parent_folder_id) {
      const parent = folderMap.get(folder.parent_folder_id);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      rootFolders.push(node);
    }
  });
  
  return rootFolders;
}

export async function createFolder(
  input: CreateFolderInput
): Promise<DocumentFolder> {
  const { data, error } = await supabase
    .from('document_folders')
    .insert({
      business_profile_id: input.business_profile_id,
      parent_folder_id: input.parent_folder_id || null,
      name: input.name,
      description: input.description || null,
      folder_type: input.folder_type || null,
      icon: input.icon || null,
      color: input.color || null,
      sort_order: 0,
    })
    .select()
    .single();
  
  if (error) throw error;

  // Best-effort: create a placeholder object so the prefix shows in Storage UI
  if (data?.id) {
    await ensureStorageFolderPlaceholder({
      businessProfileId: data.business_profile_id,
      folderId: data.id,
    });
  }

  return data;
}

export async function updateFolder(
  id: string,
  updates: Partial<DocumentFolder>
): Promise<void> {
  const { error } = await supabase
    .from('document_folders')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase
    .from('document_folders')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function getDocumentsByFolder(
  folderId: string
): Promise<CompanyDocument[]> {
  const { data, error } = await supabase
    .from('company_documents')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// ============================================
// DOCUMENT TEMPLATES
// ============================================

export async function getDocumentTemplates(
  businessProfileId?: string,
  templateType?: string
): Promise<DocumentTemplate[]> {
  let query = supabase
    .from('document_templates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  
  if (businessProfileId) {
    query = query.or(`business_profile_id.eq.${businessProfileId},is_public.eq.true`);
  } else {
    query = query.eq('is_public', true);
  }
  
  if (templateType) {
    query = query.eq('template_type', templateType);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getDocumentTemplate(id: string): Promise<DocumentTemplate | null> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function createTemplate(
  input: CreateTemplateInput
): Promise<DocumentTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('document_templates')
    .insert({
      business_profile_id: input.business_profile_id || null,
      name: input.name,
      description: input.description || null,
      template_type: input.template_type,
      content: input.content,
      variables: input.variables,
      css_styles: input.css_styles || null,
      category: input.category || null,
      tags: input.tags || null,
      is_public: false,
      is_active: true,
      created_by: user?.id,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTemplate(
  id: string,
  updates: Partial<DocumentTemplate>
): Promise<void> {
  const { error } = await supabase
    .from('document_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('document_templates')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// GENERATED DOCUMENTS
// ============================================

export async function generateDocument(
  input: GenerateDocumentInput
): Promise<GeneratedDocument> {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get template
  const template = await getDocumentTemplate(input.template_id);
  if (!template) throw new Error('Template not found');
  
  // Replace variables in content
  let contentHtml = template.content;
  Object.entries(input.variables_filled).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    contentHtml = contentHtml.replace(regex, String(value || ''));
  });
  
  const { data, error } = await supabase
    .from('generated_documents')
    .insert({
      business_profile_id: input.business_profile_id,
      template_id: input.template_id,
      folder_id: input.folder_id || null,
      title: input.title,
      document_type: input.document_type,
      content_html: contentHtml,
      variables_filled: input.variables_filled,
      document_number: input.document_number || null,
      document_date: input.document_date || null,
      status: 'draft',
      linked_contract_id: input.linked_contract_id || null,
      linked_resolution_id: input.linked_resolution_id || null,
      created_by: user?.id,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getGeneratedDocuments(
  businessProfileId: string,
  folderId?: string
): Promise<GeneratedDocument[]> {
  let query = supabase
    .from('generated_documents')
    .select(`
      *,
      template:document_templates(*),
      folder:document_folders(*)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });
  
  if (folderId) {
    query = query.eq('folder_id', folderId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getGeneratedDocument(id: string): Promise<GeneratedDocument | null> {
  const { data, error } = await supabase
    .from('generated_documents')
    .select(`
      *,
      template:document_templates(*),
      folder:document_folders(*)
    `)
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateGeneratedDocument(
  id: string,
  updates: Partial<GeneratedDocument>
): Promise<void> {
  const { error } = await supabase
    .from('generated_documents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteGeneratedDocument(id: string): Promise<void> {
  // Get document to find PDF path
  const doc = await getGeneratedDocument(id);
  
  if (doc?.pdf_file_path) {
    // Delete PDF from storage
    await supabase.storage
      .from('company-documents')
      .remove([doc.pdf_file_path]);
  }
  
  const { error } = await supabase
    .from('generated_documents')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// INITIALIZE DEFAULT FOLDERS
// ============================================

export async function initializeDefaultFolders(
  businessProfileId: string
): Promise<void> {
  const { error } = await supabase
    .rpc('create_default_document_folders', { profile_id: businessProfileId });
  
  if (error) throw error;
}
