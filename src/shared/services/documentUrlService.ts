import { supabase } from '@/integrations/supabase/client';

// Use the same URL as the supabase client
const SUPABASE_URL = "https://rncrzxjyffxmfbnxlqtm.supabase.co";

export class DocumentUrlService {
  /**
   * Get a secure signed URL for viewing or downloading a document
   * Works with both accounting documents and storage files
   */
  static async getSecureUrl(
    id: string,
    source: 'accounting' | 'storage',
    action: 'view' | 'download' = 'view'
  ): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams({
        [source === 'accounting' ? 'documentId' : 'fileId']: id,
        action,
      });

      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/get-document-url?${params}`;
      
      console.log('Requesting edge function URL:', edgeFunctionUrl);

      const response = await fetch(edgeFunctionUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        throw new Error(error.error || 'Failed to get document URL');
      }

      const responseText = await response.text();
      console.log('Edge function response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse edge function response:', parseError);
        throw new Error('Invalid response from edge function');
      }
      
      const { url } = result;
      return url;
    } catch (error) {
      console.error('Edge function failed, trying direct storage access:', error);
      
      // Fallback: Try direct storage access for storage files
      if (source === 'storage') {
        return this.getDirectStorageUrl(id);
      }
      
      throw error;
    }
  }

  /**
   * Fallback method to get direct storage URL (temporary workaround)
   */
  private static async getDirectStorageUrl(fileId: string): Promise<string> {
    try {
      // Get file metadata
      const { data: file, error } = await supabase
        .from('storage_files')
        .select('storage_path, file_name')
        .eq('id', fileId)
        .single();

      if (error || !file) {
        throw new Error('File not found');
      }

      console.log('Getting direct storage URL for:', file.storage_path);

      // Get signed URL directly from storage
      const { data, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 3600);

      if (urlError) {
        throw new Error(`Failed to get storage URL: ${urlError.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Direct storage access failed:', error);
      throw error;
    }
  }

  /**
   * Get URL for viewing a document
   */
  static async getViewUrl(id: string, source: 'accounting' | 'storage'): Promise<string> {
    return this.getSecureUrl(id, source, 'view');
  }

  /**
   * Get URL for downloading a document
   */
  static async getDownloadUrl(id: string, source: 'accounting' | 'storage'): Promise<string> {
    return this.getSecureUrl(id, source, 'download');
  }
}
