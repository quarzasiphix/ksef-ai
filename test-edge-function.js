// Test script to verify edge function accessibility
async function testEdgeFunction() {
  const fileId = 'b61ef48e-5344-48d0-b770-5d876e7807cf';
  const url = `https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/get-document-url?fileId=${fileId}&action=view`;
  
  console.log('Testing edge function at:', url);
  
  try {
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type',
        'Origin': 'http://localhost:8080'
      }
    });
    
    console.log('OPTIONS Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (response.ok) {
      console.log('✅ Edge function is accessible');
    } else {
      console.log('❌ Edge function returned error:', response.status);
    }
  } catch (error) {
    console.error('❌ Failed to reach edge function:', error);
  }
}

// Run the test
testEdgeFunction();
