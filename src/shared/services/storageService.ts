import { supabase } from '@/integrations/supabase/client';
import type { 
  StorageFolder, 
  StorageFile, 
  StorageFolderTreeNode,
  CreateStorageFolderInput,
  UploadFileInput,
  StorageStats 
} from '@/modules/documents/types/storage';

/**
 * Storage Service - Manages Supabase storage buckets and file metadata
 */
export class StorageService {
  private static BUCKET_NAME = 'documents';

  /**
   * Get all folders for a business profile
   * @param businessProfileId - Business profile ID
   * @param departmentId - Optional department ID filter (null = company-wide view)
   */
  static async getFolders(businessProfileId: string, departmentId?: string | null): Promise<StorageFolder[]> {
    let query = supabase
      .from('storage_folders')
      .select('*')
      .eq('business_profile_id', businessProfileId);

    // Filter by department if specified, or show all if null (company-wide view)
    if (departmentId !== undefined && departmentId !== null) {
      query = query.eq('department_id', departmentId);
    }

    query = query.order('path', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get folder tree structure
   * @param businessProfileId - Business profile ID
   * @param departmentId - Optional department ID filter (null = company-wide view)
   */
  static async getFolderTree(businessProfileId: string, departmentId?: string | null): Promise<StorageFolderTreeNode[]> {
    const folders = await this.getFolders(businessProfileId, departmentId);
    return this.buildFolderTree(folders);
  }

  /**
   * Build hierarchical folder tree
   */
  private static buildFolderTree(folders: StorageFolder[], parentId: string | null = null, level: number = 0): StorageFolderTreeNode[] {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .map(folder => ({
        ...folder,
        level,
        children: this.buildFolderTree(folders, folder.id, level + 1),
      }));
  }

  /**
   * Create a new folder
   */
  static async createFolder(input: CreateStorageFolderInput): Promise<StorageFolder> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('storage_folders')
      .insert({
        ...input,
        created_by: user.id,
        path: '', // Will be computed by trigger
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update folder
   */
  static async updateFolder(folderId: string, updates: Partial<StorageFolder>): Promise<StorageFolder> {
    const { data, error } = await supabase
      .from('storage_folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete folder (and all contents)
   */
  static async deleteFolder(folderId: string): Promise<void> {
    // Get all files in folder and subfolders
    const files = await this.getFilesInFolderRecursive(folderId);
    
    // Delete files from storage bucket
    for (const file of files) {
      await this.deleteFileFromBucket(file.storage_path);
    }

    // Delete folder (cascade will handle files and subfolders in DB)
    const { error } = await supabase
      .from('storage_folders')
      .delete()
      .eq('id', folderId);

    if (error) throw error;
  }

  /**
   * Get files in a folder
   */
  static async getFilesInFolder(folderId: string): Promise<StorageFile[]> {
    const { data, error } = await supabase
      .from('storage_files')
      .select('*')
      .eq('storage_folder_id', folderId)
      .eq('is_latest', true)
      .order('file_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get files in folder and all subfolders (recursive)
   */
  private static async getFilesInFolderRecursive(folderId: string): Promise<StorageFile[]> {
    const { data: folders } = await supabase
      .from('storage_folders')
      .select('id')
      .or(`id.eq.${folderId},parent_folder_id.eq.${folderId}`);

    if (!folders) return [];

    const folderIds = folders.map(f => f.id);
    const { data: files } = await supabase
      .from('storage_files')
      .select('*')
      .in('storage_folder_id', folderIds);

    return files || [];
  }

  /**
   * Get file by ID
   */
  static async getFile(fileId: string): Promise<StorageFile | null> {
    const { data, error } = await supabase
      .from('storage_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  /**
   * Upload file
   */
  static async uploadFile(input: UploadFileInput): Promise<StorageFile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate storage path: {business_profile_id}/{folder_path}/{filename}
    const folder = await this.getFolder(input.storage_folder_id);
    if (!folder) throw new Error('Folder not found');

    const timestamp = Date.now();
    const sanitizedName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${input.business_profile_id}${folder.path}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, input.file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Create file metadata record
    const fileExtension = input.file.name.split('.').pop() || '';
    const { data, error } = await supabase
      .from('storage_files')
      .insert({
        storage_folder_id: input.storage_folder_id,
        business_profile_id: input.business_profile_id,
        department_id: input.department_id,
        file_name: input.file.name,
        storage_path: storagePath,
        file_size: input.file.size,
        mime_type: input.file.type,
        file_extension: fileExtension,
        description: input.description,
        tags: input.tags || [],
        document_id: input.document_id,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      // Rollback: delete uploaded file
      await this.deleteFileFromBucket(storagePath);
      throw error;
    }

    return data;
  }

  /**
   * Get folder by ID
   */
  private static async getFolder(folderId: string): Promise<StorageFolder | null> {
    const { data, error } = await supabase
      .from('storage_folders')
      .select('*')
      .eq('id', folderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string): Promise<void> {
    const file = await this.getFile(fileId);
    if (!file) throw new Error('File not found');

    // Delete from storage bucket
    await this.deleteFileFromBucket(file.storage_path);

    // Delete metadata
    const { error } = await supabase
      .from('storage_files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;
  }

  /**
   * Delete file from storage bucket
   */
  private static async deleteFileFromBucket(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([path]);

    if (error) throw error;
  }

  /**
   * Move file to different folder
   */
  static async moveFile(fileId: string, targetFolderId: string): Promise<StorageFile> {
    const file = await this.getFile(fileId);
    if (!file) throw new Error('File not found');

    const targetFolder = await this.getFolder(targetFolderId);
    if (!targetFolder) throw new Error('Target folder not found');

    // Generate new storage path
    const timestamp = Date.now();
    const newPath = `${file.business_profile_id}${targetFolder.path}/${timestamp}_${file.file_name}`;

    // Move file in storage
    const { error: moveError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .move(file.storage_path, newPath);

    if (moveError) throw moveError;

    // Update metadata
    const { data, error } = await supabase
      .from('storage_files')
      .update({
        storage_folder_id: targetFolderId,
        storage_path: newPath,
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get signed URL for file download/viewing
   */
  static async getFileUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  /**
   * Get public URL for file (if bucket is public) or signed URL
   */
  static async getFileViewUrl(fileId: string): Promise<string> {
    // Get file metadata
    const { data: file, error: fileError } = await supabase
      .from('storage_files')
      .select('storage_path')
      .eq('id', fileId)
      .single();

    if (fileError || !file) throw new Error('File not found');

    // Get signed URL for viewing (24 hour expiry)
    return this.getFileUrl(file.storage_path, 86400);
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(businessProfileId: string): Promise<any> {
    const { data: files } = await supabase
      .from('storage_files')
      .select('*')
      .eq('business_profile_id', businessProfileId)
      .eq('is_latest', true);

    if (!files) {
      return {
        total_files: 0,
        total_size: 0,
        total_folders: 0,
        by_mime_type: {},
        by_tag: {},
        recent_uploads: [],
      };
    }

    const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);
    const byMimeType: Record<string, { count: number; size: number }> = {};
    const byTag: Record<string, number> = {};

    files.forEach(file => {
      // Group by MIME type
      if (!byMimeType[file.mime_type]) {
        byMimeType[file.mime_type] = { count: 0, size: 0 };
      }
      byMimeType[file.mime_type].count++;
      byMimeType[file.mime_type].size += file.file_size;

      // Count tags
      file.tags.forEach(tag => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });
    });

    const { count: folderCount } = await supabase
      .from('storage_folders')
      .select('*', { count: 'exact', head: true })
      .eq('business_profile_id', businessProfileId);

    const recentUploads = files
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 10);

    return {
      total_files: files.length,
      total_size: totalSize,
      total_folders: folderCount || 0,
      by_mime_type: byMimeType,
      by_tag: byTag,
      recent_uploads: recentUploads,
    };
  }

  /**
   * Search files
   */
  static async searchFiles(businessProfileId: string, query: string): Promise<StorageFile[]> {
    const { data, error } = await supabase
      .from('storage_files')
      .select('*')
      .eq('business_profile_id', businessProfileId)
      .eq('is_latest', true)
      .or(`file_name.ilike.%${query}%,description.ilike.%${query}%,ocr_text.ilike.%${query}%`)
      .order('uploaded_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }
}
