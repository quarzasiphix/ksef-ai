import { supabase } from '@/integrations/supabase/client';

/**
 * Debug KSeF authentication to identify the exact source of the "Cannot read properties of undefined (reading 'from')" error
 */
export async function debugKsefAuthentication() {
  console.log('🔍 Starting KSeF authentication debug...');
  
  try {
    // Step 1: Get the stored token
    console.log('📋 Step 1: Getting stored token...');
    const { data: credential, error: credError } = await supabase
      .from('ksef_credentials')
      .select('*')
      .eq('provider_nip', '7322228540')
      .eq('is_active', true)
      .single();
    
    if (credError || !credential) {
      console.error('❌ Failed to get credentials:', credError);
      return { success: false, error: 'No credentials found' };
    }
    
    console.log('✅ Credentials found:', credential.id);
    console.log('🔐 Token preview:', credential.secret_ref.substring(0, 50) + '...');
    
    // Step 2: Decode the token
    console.log('📋 Step 2: Decoding token...');
    const encryptedToken = credential.secret_ref;
    let decodedToken;
    
    try {
      decodedToken = atob(encryptedToken);
      console.log('✅ Token decoded successfully');
      console.log('📋 Decoded token length:', decodedToken.length);
      console.log('📋 Decoded token preview:', decodedToken.substring(0, 100) + '...');
    } catch (decodeError) {
      console.error('❌ Token decode failed:', decodeError);
      return { success: false, error: 'Token decode failed' };
    }
    
    // Step 3: Parse token parts
    console.log('📋 Step 3: Parsing token parts...');
    let tokenParts;
    
    try {
      tokenParts = decodedToken.split('|');
      console.log('✅ Token parts parsed:', tokenParts.length, 'parts');
      console.log('📋 Part 0 (challenge):', tokenParts[0]);
      console.log('📋 Part 1 (NIP):', tokenParts[1]);
      console.log('📋 Part 2 (signature):', tokenParts[2] ? tokenParts[2].substring(0, 50) + '...' : 'null');
    } catch (parseError) {
      console.error('❌ Token parse failed:', parseError);
      return { success: false, error: 'Token parse failed' };
    }
    
    // Step 4: Extract the actual KSeF token
    console.log('📋 Step 4: Extracting KSeF token...');
    const ksefToken = tokenParts[0];
    const nip = tokenParts[1];
    const signature = tokenParts[2];
    
    console.log('✅ KSeF token extracted:', ksefToken.substring(0, 50) + '...');
    console.log('✅ NIP extracted:', nip);
    console.log('✅ Signature length:', signature ? signature.length : 0);
    
    // Step 5: Test basic KSeF API calls
    console.log('📋 Step 5: Testing KSeF API...');
    
    try {
      // Test challenge endpoint
      const challengeResponse = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!challengeResponse.ok) {
        console.error('❌ Challenge failed:', challengeResponse.status);
        return { success: false, error: 'Challenge failed' };
      }
      
      const challengeData = await challengeResponse.json();
      console.log('✅ Challenge successful:', challengeData);
      
      // Test certificates endpoint
      const certResponse = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge/security/public-key-certificates', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!certResponse.ok) {
        console.error('❌ Certificates failed:', certResponse.status);
        return { success: false, error: 'Certificates failed' };
      }
      
      const certData = await certResponse.json();
      console.log('✅ Certificates successful:', certData.length, 'certificates');
      
    } catch (apiError) {
      console.error('❌ API test failed:', apiError);
      return { success: false, error: 'API test failed' };
    }
    
    // Step 6: Test authentication flow (this is where the error likely occurs)
    console.log('📋 Step 6: Testing authentication flow...');
    
    try {
      // Import the proper auth service
      const { KsefProperAuth } = await import('../components/ksefProperAuth');
      const config = {
        environment: 'test',
        baseUrl: 'https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge',
        apiUrl: 'https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge',
        systemInfo: 'KsięgaI v1.0',
        namespace: 'http://crd.gov.pl/wzor/2023/06/29/12648/',
        schemaVersion: '1-0E',
      };
      
      const properAuth = new KsefProperAuth(config);
      
      console.log('🔐 Starting authentication with token...');
      const result = await properAuth.authenticateWithKsefToken(ksefToken, nip, 5, 1000);
      
      console.log('✅ Authentication successful:', result);
      return { success: true, result };
      
    } catch (authError) {
      console.error('❌ Authentication failed:', authError);
      console.error('❌ Error stack:', authError.stack);
      return { success: false, error: authError.message, stack: authError.stack };
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { success: false, error: error.message, stack: error.stack };
  }
}

/**
 * Test token decryption specifically
 */
export async function testTokenDecryption() {
  console.log('🔍 Testing token decryption...');
  
  try {
    const { data: credential } = await supabase
      .from('ksef_credentials')
      .select('*')
      .eq('provider_nip', '7322228540')
      .eq('is_active', true)
      .single();
    
    if (!credential) {
      throw new Error('No credentials found');
    }
    
    const encryptedToken = credential.secret_ref;
    console.log('🔐 Encrypted token:', encryptedToken);
    
    const decodedToken = atob(encryptedToken);
    console.log('🔓 Decoded token:', decodedToken);
    
    const parts = decodedToken.split('|');
    console.log('📋 Token parts:', parts);
    
    // Check each part for potential issues
    parts.forEach((part, index) => {
      console.log(`📋 Part ${index}:`, part);
      console.log(`📋 Part ${index} length:`, part.length);
      console.log(`📋 Part ${index} type:`, typeof part);
      
      // Try to parse if it looks like JSON
      if (part.startsWith('{') || part.startsWith('[')) {
        try {
          const parsed = JSON.parse(part);
          console.log(`📋 Part ${index} parsed:`, parsed);
        } catch (e) {
          console.log(`📋 Part ${index} is not valid JSON:`, e.message);
        }
      }
    });
    
    return { success: true, parts };
    
  } catch (error) {
    console.error('❌ Token decryption test failed:', error);
    return { success: false, error: error.message };
  }
}
