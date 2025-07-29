import { supabase } from "../client";

const BUCKET = "bank-logs";

/**
 * Test function to check if we can access the storage bucket
 */
export async function testStorageAccess(): Promise<boolean> {
  try {
    console.log('Testing storage access...');
    const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1 });
    console.log('Storage test result:', { data, error });
    return !error;
  } catch (e) {
    console.error('Storage test failed:', e);
    return false;
  }
}

/**
 * Uploads a bank log file to the user's folder in the private 'bank-logs' bucket.
 * Returns the storage path (not a signed URL).
 */
export async function uploadBankLog({ userId, file, filename }: { userId: string; file: Blob; filename: string; }): Promise<string> {
  const ext = filename.split('.').pop() || 'bin';
  const storagePath = `${userId}/${Date.now()}_${filename}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return storagePath;
}

/**
 * Lists all bank log files for the given user.
 */
export async function listBankLogs(userId: string): Promise<{ name: string; id: string; created_at: string; }[]> {
  console.log('listBankLogs called with userId:', userId);
  console.log('Listing files from path:', userId + "/");
  
  const { data, error } = await supabase.storage.from(BUCKET).list(userId + "/", { limit: 100, offset: 0 });
  
  console.log('Storage list result:', { data, error });
  
  if (error) {
    console.error('Error listing bank logs:', error);
    throw error;
  }
  
  const result = (data || []).map(f => ({ name: f.name, id: f.id, created_at: f.created_at }));
  console.log('Processed files:', result);
  return result;
}

/**
 * Generates a signed URL for a bank log file (default 1 hour).
 */
export async function getBankLogSignedUrl(storagePath: string, expiresInSeconds = 60 * 60): Promise<string> {
  console.log('getBankLogSignedUrl called with path:', storagePath);
  
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  
  console.log('Signed URL result:', { data, error });
  
  if (error || !data?.signedUrl) {
    console.error('Error creating signed URL:', error);
    throw error || new Error("Failed to create signed URL");
  }
  
  console.log('Generated signed URL:', data.signedUrl);
  return data.signedUrl;
}

/**
 * Deletes a bank log file from the storage bucket.
 */
export async function deleteBankLog(storagePath: string): Promise<void> {
  console.log('deleteBankLog called with path:', storagePath);
  
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  
  console.log('Delete result:', { error });
  
  if (error) {
    console.error('Error deleting bank log:', error);
    throw error;
  }
} 