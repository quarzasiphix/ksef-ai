import { supabase } from '@/integrations/supabase/client';

/**
 * Simple KSeF API test that bypasses complex authentication
 */
export async function testKsefApiDirectly() {
  console.log('🧪 Testing KSeF API directly...');
  
  try {
    // Test 1: Get challenge (should work)
    console.log('📡 Testing KSeF challenge endpoint...');
    const challengeResponse = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!challengeResponse.ok) {
      throw new Error(`Challenge failed: ${challengeResponse.status}`);
    }
    
    const challengeData = await challengeResponse.json();
    console.log('✅ Challenge successful:', challengeData);
    
    // Test 2: Get public key certificates (should work)
    console.log('📡 Testing KSeF public key certificates...');
    const certResponse = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-challenge/security/public-key-certificates', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!certResponse.ok) {
      throw new Error(`Certificates failed: ${certResponse.status}`);
    }
    
    const certData = await certResponse.json();
    console.log('✅ Certificates successful:', certData.length, 'certificates');
    
    return {
      success: true,
      challenge: challengeData,
      certificates: certData.length
    };
    
  } catch (error) {
    console.error('❌ KSeF API test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test KSeF authentication with minimal flow
 */
export async function testKsefAuthMinimal() {
  console.log('🧪 Testing minimal KSeF authentication...');
  
  try {
    // Get the stored token for NIP 7322228540
    const { data: credential } = await supabase
      .from('ksef_credentials')
      .select('*')
      .eq('provider_nip', '7322228540')
      .eq('is_active', true)
      .single();
    
    if (!credential) {
      throw new Error('No credentials found for NIP 7322228540');
    }
    
    console.log('🔑 Found credentials:', credential.id);
    
    // Decode the token
    const encryptedToken = credential.secret_ref;
    const decodedToken = atob(encryptedToken);
    
    console.log('🔓 Decoded token length:', decodedToken.length);
    console.log('🔓 Token preview:', decodedToken.substring(0, 50) + '...');
    
    // Parse the token
    const tokenParts = decodedToken.split('|');
    console.log('📋 Token parts:', tokenParts.length);
    
    if (tokenParts.length >= 2) {
      const [challenge, nipPart, signature] = tokenParts;
      console.log('📋 Challenge:', challenge);
      console.log('📋 NIP:', nipPart);
      console.log('📋 Signature length:', signature.length);
      
      return {
        success: true,
        challenge,
        nip: nipPart,
        signatureLength: signature.length
      };
    } else {
      throw new Error('Invalid token format');
    }
    
  } catch (error) {
    console.error('❌ Minimal auth test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
