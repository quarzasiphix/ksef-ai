import { supabase } from '../client';

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
  }
): Promise<CompanyDocument> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Generate unique file path
  const folder = DOCUMENT_FOLDER_STRUCTURE[category];
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${businessProfileId}/${folder}/${timestamp}_${safeFileName}`;
  
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
