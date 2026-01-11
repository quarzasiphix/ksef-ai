/**
 * Storage Layer - Physical Directory Management
 * 
 * Separates "what a document is" (business objects) from "where files are stored" (directories)
 * This layer handles the physical file system structure independent of document sections
 */

/**
 * Storage Folder - Physical directory in the file system
 */
export interface StorageFolder {
  id: string;
  business_profile_id: string;
  parent_folder_id?: string | null;
  department_id?: string | null;
  
  // Directory info
  name: string;
  description?: string;
  path: string; // Computed path from root
  
  // Visual
  icon?: string;
  color?: string;
  
  // Tags for categorization (section-agnostic)
  tags: string[]; // e.g., 'krs', 'e-doreczenia', 'signed', 'xml', 'pdf'
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  
  // Computed
  children?: StorageFolder[];
  file_count?: number;
  total_size?: number;
}

/**
 * Storage File - Physical file in a directory
 */
export interface StorageFile {
  id: string;
  storage_folder_id: string;
  business_profile_id: string;
  department_id?: string | null;
  
  // File info
  file_name: string;
  file_path: string; // Full path in storage (deprecated, use storage_path)
  storage_path: string; // Path in Supabase storage bucket
  file_size: number;
  mime_type: string;
  file_extension: string;
  
  // Optional document link (if this file is part of a document object)
  document_id?: string;
  attachment_id?: string;
  
  // Metadata
  description?: string;
  tags: string[];
  
  // Versioning
  version: number;
  is_latest: boolean;
  parent_file_id?: string;
  
  // Upload info
  uploaded_by: string;
  uploaded_at: string;
  
  // OCR and search
  ocr_text?: string;
  ocr_processed: boolean;
  
  // Computed
  folder?: StorageFolder;
}

/**
 * File Preview Info - For rendering file previews
 */
export interface FilePreview {
  file_id: string;
  preview_type: 'pdf' | 'xml' | 'image' | 'text' | 'json' | 'unsupported';
  preview_url?: string;
  thumbnail_url?: string;
  page_count?: number; // For PDFs
  can_download: boolean;
  can_view_inline: boolean;
}

/**
 * Storage Folder Tree Node - For rendering directory trees
 */
export interface StorageFolderTreeNode extends StorageFolder {
  children: StorageFolderTreeNode[];
  level: number;
  is_expanded?: boolean;
  is_selected?: boolean;
}

/**
 * Create Storage Folder Input
 */
export interface CreateStorageFolderInput {
  business_profile_id: string;
  parent_folder_id?: string;
  department_id?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  tags?: string[];
}

/**
 * Upload File Input
 */
export interface UploadFileInput {
  storage_folder_id: string;
  business_profile_id: string;
  department_id?: string;
  file: File;
  description?: string;
  tags?: string[];
  document_id?: string; // Optional link to document object
}

/**
 * Storage Statistics
 */
export interface StorageStats {
  total_files: number;
  total_size: number;
  total_folders: number;
  by_mime_type: Record<string, { count: number; size: number }>;
  by_tag: Record<string, number>;
  recent_uploads: StorageFile[];
}

/**
 * Common storage tags
 */
export const STORAGE_TAGS = {
  KRS: 'krs',
  E_DORECZENIA: 'e-doreczenia',
  SIGNED: 'signed',
  UNSIGNED: 'unsigned',
  XML: 'xml',
  PDF: 'pdf',
  SCAN: 'scan',
  ORIGINAL: 'original',
  COPY: 'copy',
  ARCHIVE: 'archive',
  TEMP: 'temp',
} as const;

/**
 * Storage folder icons
 */
export const STORAGE_FOLDER_ICONS = {
  DEFAULT: 'Folder',
  KRS: 'Building',
  E_DORECZENIA: 'Mail',
  SIGNED: 'FileCheck',
  XML: 'Code',
  PDF: 'FileText',
  ARCHIVE: 'Archive',
  SCAN: 'Scan',
} as const;

/**
 * File type categories for filtering
 */
export const FILE_TYPE_CATEGORIES = {
  DOCUMENTS: ['pdf', 'doc', 'docx', 'odt'],
  SPREADSHEETS: ['xls', 'xlsx', 'ods', 'csv'],
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
  DATA: ['xml', 'json', 'yaml', 'yml'],
  ARCHIVES: ['zip', 'rar', '7z', 'tar', 'gz'],
  TEXT: ['txt', 'md', 'log'],
} as const;

/**
 * Get file category from extension
 */
export function getFileCategory(extension: string): string {
  const ext = extension.toLowerCase().replace('.', '');
  
  for (const [category, extensions] of Object.entries(FILE_TYPE_CATEGORIES)) {
    if ((extensions as readonly string[]).includes(ext)) {
      return category;
    }
  }
  
  return 'OTHER';
}

/**
 * Get icon for file type
 */
export function getFileIcon(mimeType?: string, extension?: string): string {
  // Handle undefined values
  if (!mimeType && !extension) return 'File';
  
  const ext = extension?.toLowerCase().replace('.', '') || '';
  const mime = mimeType?.toLowerCase() || '';
  
  if (mime.startsWith('image/')) return 'Image';
  if (mime === 'application/pdf') return 'FileText';
  if (mime.includes('xml') || ext === 'xml') return 'Code';
  if (mime.includes('json') || ext === 'json') return 'Braces';
  if (mime.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'Table';
  if (mime.includes('zip') || mime.includes('archive')) return 'Archive';
  if (mime.includes('text')) return 'FileText';
  
  return 'File';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if file can be previewed inline
 */
export function canPreviewInline(mimeType: string): boolean {
  return (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('image/') ||
    mimeType.includes('xml') ||
    mimeType.includes('json') ||
    mimeType.includes('text/')
  );
}
