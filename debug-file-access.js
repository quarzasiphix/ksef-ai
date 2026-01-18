// Debug script to check file access
// This can be run in the browser console when on the repository page

async function debugFileAccess(fileId) {
  console.log('Debugging file access for:', fileId);
  
  try {
    // Get the file from the database
    const { data: file, error } = await supabase
      .from('storage_files')
      .select('*')
      .eq('id', fileId)
      .single();
    
    console.log('File from database:', file);
    console.log('Database error:', error);
    
    if (file) {
      // Try to get signed URL directly
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 3600);
      
      console.log('Signed URL result:', signedUrl);
      console.log('Signed URL error:', urlError);
      
      // Try the edge function
      const { session } = await supabase.auth.getSession();
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-document-url?fileId=${fileId}`;
      
      const response = await fetch(edgeFunctionUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Edge function response:', response);
      console.log('Edge function data:', await response.json());
    }
  } catch (err) {
    console.error('Debug error:', err);
  }
}

// Usage: debugFileAccess('b61ef48e-5344-48d0-b770-5d876e7807cf')
console.log('Debug function available. Use debugFileAccess(fileId) in console');
