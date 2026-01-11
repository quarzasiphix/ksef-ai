import { supabase } from '@/integrations/supabase/client';

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

      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-document-url?${params}`;

      const response = await fetch(edgeFunctionUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get document URL');
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('Error getting secure document URL:', error);
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
