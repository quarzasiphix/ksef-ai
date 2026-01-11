import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

// Virtual folder categories for accounting documents
const ACCOUNTING_CATEGORIES = {
  CAPITAL: {
    id: 'capital',
    name: 'Kapitał',
    description: 'Dokumenty kapitałowe i wkłady',
    sections: ['audytowe_dokumenty', 'finansowe'],
    keywords: ['kapita', 'wniesienie', 'wkład', 'udział', 'kapital'],
    icon: 'DollarSign'
  },
  TAX: {
    id: 'tax',
    name: 'Podatki',
    description: 'Deklaracje i dokumenty podatkowe',
    sections: ['audytowe_dokumenty', 'finansowe'],
    keywords: ['podat', 'cit', 'vat', 'pit', 'zus', 'deklaracja'],
    icon: 'FileText'
  },
  FINANCIAL: {
    id: 'financial',
    name: 'Finanse',
    description: 'Raporty finansowe i bilanse',
    sections: ['finansowe'],
    keywords: ['bilans', 'rachunek', 'zysk', 'strata', 'raport'],
    icon: 'TrendingUp'
  }
} as const;

/**
 * Categorize accounting document based on filename and document type
 */
function categorizeAccountingDocument(doc: any): string | null {
  const filename = (doc.file_name || '').toLowerCase();
  const documentType = (doc.document_type || '').toLowerCase();
  
  // Check each category for matching keywords
  for (const [key, category] of Object.entries(ACCOUNTING_CATEGORIES)) {
    if (category.keywords.some(keyword => 
      filename.includes(keyword) || 
      documentType.includes(keyword)
    )) {
      return category.id;
    }
  }
  
  return null;
}

/**
 * Get virtual folders for accounting documents
 */
export function getAccountingVirtualFolders() {
  return Object.values(ACCOUNTING_CATEGORIES).map(category => ({
    id: `virtual-${category.id}`,
    name: category.name,
    description: category.description,
    path: `/${category.name}`,
    is_virtual: true,
    category_id: category.id,
    sections: category.sections,
    icon: category.icon,
    // Add properties to match StorageFolderTreeNode interface
    department_id: null,
    parent_id: null,
    children: [],
    level: 0,
    has_children: false,
    file_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}

/**
 * Hook to fetch all documents for the business profile
 * Combines both storage files and accounting documents with virtual categorization
 */
export const useAllDocuments = (folderId?: string) => {
  const { selectedProfileId } = useBusinessProfile();

  return useQuery({
    queryKey: ['all-documents', selectedProfileId, folderId],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      // Fetch storage files (existing system)
      const storageQuery = supabase
        .from('storage_files_with_attachment_count')
        .select('*')
        .eq('business_profile_id', selectedProfileId);

      if (folderId && !folderId.startsWith('virtual-')) {
        storageQuery.eq('storage_folder_id', folderId);
      }

      const { data: storageFiles, error: storageError } = await storageQuery.order('uploaded_at', { ascending: false });

      // Fetch accounting documents (new system)
      const { data: accountingDocuments, error: accountingError } = await supabase
        .from('documents')
        .select('*')
        .eq('business_profile_id', selectedProfileId)
        .order('created_at', { ascending: false });

      if (storageError) console.error('Storage files error:', storageError);
      if (accountingError) console.error('Accounting documents error:', accountingError);

      // Process accounting documents with categorization
      const processedAccountingDocs = (accountingDocuments || []).map(doc => {
        const category = categorizeAccountingDocument(doc);
        return {
          ...doc,
          source: 'accounting',
          id: doc.id,
          file_name: doc.file_name,
          uploaded_at: doc.created_at,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          file_extension: doc.file_name?.split('.').pop() || '',
          // Virtual folder assignment
          storage_folder_id: category ? `virtual-${category}` : null,
          virtual_category: category,
          // Map to expected structure for FileBrowser
          attachment_count: 0,
          is_public: true,
        };
      });

      // Filter accounting docs by virtual folder if needed
      let filteredAccountingDocs = processedAccountingDocs;
      if (folderId && folderId.startsWith('virtual-')) {
        const categoryId = folderId.replace('virtual-', '');
        filteredAccountingDocs = processedAccountingDocs.filter(doc => doc.virtual_category === categoryId);
      }

      // Combine and format results
      const combinedFiles = [
        ...(storageFiles || []).map(file => ({
          ...file,
          source: 'storage',
          file_name: file.file_name || file.name,
          uploaded_at: file.uploaded_at || file.created_at,
          file_size: file.file_size || file.size,
          mime_type: file.mime_type || file.type,
        })),
        ...filteredAccountingDocs
      ];

      return combinedFiles;
    },
    enabled: !!selectedProfileId,
  });
};
