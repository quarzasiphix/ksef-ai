import { supabase } from '@/integrations/supabase/client';

export interface UploadedDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  equity_transaction_id?: string;
  cash_transaction_id?: string;
}

/**
 * Upload a document to Supabase storage and create a database record
 */
export async function uploadCapitalContributionDocument(
  file: File,
  businessProfileId: string,
  metadata: {
    shareholderName: string;
    amount: number;
    contributionDate: string;
    documentType: 'cash_contribution_declaration';
  }
): Promise<UploadedDocument> {
  try {
    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `capital-contributions/${businessProfileId}/${timestamp}-${sanitizedFileName}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // Create database record
    const { data: docRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        business_profile_id: businessProfileId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        document_type: metadata.documentType,
        metadata: {
          shareholder_name: metadata.shareholderName,
          amount: metadata.amount,
          contribution_date: metadata.contributionDate,
        },
        public_url: urlData.publicUrl,
      })
      .select()
      .single();

    if (dbError) {
      // Try to clean up uploaded file
      await supabase.storage.from('documents').remove([storagePath]);
      throw new Error(`Database record creation failed: ${dbError.message}`);
    }

    return {
      id: docRecord.id,
      file_name: docRecord.file_name,
      file_path: docRecord.file_path,
      file_size: docRecord.file_size,
      mime_type: docRecord.mime_type,
      uploaded_at: docRecord.created_at,
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

/**
 * Get document by ID
 */
export async function getDocument(documentId: string): Promise<UploadedDocument | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    console.error('Error fetching document:', error);
    return null;
  }

  return {
    id: data.id,
    file_name: data.file_name,
    file_path: data.file_path,
    file_size: data.file_size,
    mime_type: data.mime_type,
    uploaded_at: data.created_at,
  };
}

/**
 * Get signed URL for document download
 */
export async function getDocumentDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Link document to equity transaction
 */
export async function linkDocumentToEquityTransaction(
  documentId: string,
  equityTransactionId: string,
  cashTransactionId?: string
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({
      equity_transaction_id: equityTransactionId,
      cash_transaction_id: cashTransactionId || null,
      document_category: 'capital',
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to link document: ${error.message}`);
  }
}

/**
 * Delete document
 */
export async function deleteDocument(documentId: string, filePath: string): Promise<void> {
  // Delete from storage
  await supabase.storage.from('documents').remove([filePath]);

  // Delete database record
  await supabase.from('documents').delete().eq('id', documentId);
}
