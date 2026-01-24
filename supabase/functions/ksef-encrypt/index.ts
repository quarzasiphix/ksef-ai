import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 Starting KSeF token encryption...')
    
    const body = await req.json();
    const { tokenWithTimestamp, certificatePem } = body;
    
    if (!tokenWithTimestamp || !certificatePem) {
      throw new Error('Missing required parameters: tokenWithTimestamp and certificatePem');
    }
    
    console.log('🔐 Token with timestamp format:', tokenWithTimestamp.substring(0, 50) + '...');
    console.log('🔐 Token length:', tokenWithTimestamp.length, 'bytes');
    
    // Validate token format (should be token|timestamp_milliseconds)
    if (!tokenWithTimestamp.includes('|')) {
      throw new Error('Invalid token format. Expected format: token|timestamp_milliseconds');
    }
    
    // Get KSeF public key certificates
    const certsResponse = await fetch('https://api-test.ksef.mf.gov.pl/v2/security/public-key-certificates', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'KsiegaI/1.0'
      }
    });
    
    if (!certsResponse.ok) {
      throw new Error(`Failed to fetch KSeF public key certificates: ${certsResponse.status} ${certsResponse.statusText}`);
    }

    const certificates = await certsResponse.json();
    console.log('🔑 Certificates count:', certificates.length);
    
    // Find certificate for token encryption
    const cert = certificates.find((c: any) =>
      c.usage?.includes('KsefTokenEncryption')
    );

    if (!cert) {
      throw new Error('No certificate found for KSeF token encryption');
    }
    
    console.log('🔑 Found certificate for encryption:', cert.usage);
    console.log('🔑 Full certificate object:', JSON.stringify(cert, null, 2));
    console.log('🔑 Certificate structure:', Object.keys(cert));
    
    // Parse the KSeF certificate properly
    let publicKey;
    try {
      console.log('🔑 Parsing KSeF certificate...');
      console.log('🔑 Certificate object keys:', Object.keys(cert));
      console.log('🔑 Certificate usage:', cert.usage);
      
      // The certificate from KSeF API is base64 encoded DER format
      const derBytes = Uint8Array.from(atob(cert.certificate), c => c.charCodeAt(0));
      console.log('🔑 Certificate DER length:', derBytes.length);
      
      // Try multiple approaches to extract the public key
      let publicKeyData = null;
      
      // Approach 1: Try to use the certificate as-is (SPKI format)
      try {
        console.log('🔑 Trying direct SPKI import...');
        publicKey = await crypto.subtle.importKey(
          'spki',
          derBytes,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          false,
          ['encrypt']
        );
        console.log('🔑 Direct SPKI import successful!');
        publicKeyData = derBytes;
      } catch (spkiError) {
        console.log('🔑 Direct SPKI import failed, trying manual parsing...');
        
        // Approach 2: Manual parsing to find SubjectPublicKeyInfo
        for (let i = 50; i < derBytes.length - 100; i++) {
          if (derBytes[i] === 0x30) { // SEQUENCE tag
            const lengthByte = derBytes[i + 1];
            let length = lengthByte;
            let offset = 2;
            
            // Handle long form length
            if (lengthByte & 0x80) {
              const lengthBytes = lengthByte & 0x7f;
              length = 0;
              for (let j = 0; j < lengthBytes; j++) {
                length = (length << 8) | derBytes[i + offset + j];
              }
              offset += lengthBytes;
            }
            
            // Check if this could be a SubjectPublicKeyInfo
            const sequenceEnd = i + offset + length;
            if (sequenceEnd < derBytes.length && length > 50 && length < 1000) {
              const candidate = derBytes.slice(i, sequenceEnd);
              
              // Look for RSA algorithm identifier (1.2.840.113549.1.1.1)
              for (let j = 0; j < candidate.length - 15; j++) {
                if (candidate[j] === 0x06 && // OBJECT IDENTIFIER
                    candidate[j + 1] === 0x09 && // Length 9
                    candidate[j + 2] === 0x2A && // 1.2
                    candidate[j + 3] === 0x86 && // .840
                    candidate[j + 4] === 0x48 && // .113549
                    candidate[j + 5] === 0x86 && // .1
                    candidate[j + 6] === 0xF7 && // .1
                    candidate[j + 7] === 0x0D && // 
                    candidate[j + 8] === 0x01 && // .1
                    candidate[j + 9] === 0x01 && // .1
                    candidate[j + 10] === 0x01) { // .1
                  
                  console.log('🔑 Found RSA algorithm identifier at offset', j);
                  
                  try {
                    publicKey = await crypto.subtle.importKey(
                      'spki',
                      candidate,
                      { name: 'RSA-OAEP', hash: 'SHA-256' },
                      false,
                      ['encrypt']
                    );
                    console.log('🔑 Successfully extracted RSA public key');
                    publicKeyData = candidate;
                    break;
                  } catch (importError) {
                    console.log('❌ Failed to import candidate at offset', i, importError.message);
                  }
                }
              }
              
              if (publicKey) break;
            }
          }
        }
        
        // Approach 3: Try EC algorithm if RSA failed
        if (!publicKey) {
          console.log('🔑 Trying EC algorithm...');
          for (let i = 50; i < derBytes.length - 100; i++) {
            if (derBytes[i] === 0x30) {
              const lengthByte = derBytes[i + 1];
              let length = lengthByte;
              let offset = 2;
              
              if (lengthByte & 0x80) {
                const lengthBytes = lengthByte & 0x7f;
                length = 0;
                for (let j = 0; j < lengthBytes; j++) {
                  length = (length << 8) | derBytes[i + offset + j];
                }
                offset += lengthBytes;
              }
              
              const sequenceEnd = i + offset + length;
              if (sequenceEnd < derBytes.length && length > 50 && length < 1000) {
                const candidate = derBytes.slice(i, sequenceEnd);
                
                for (let j = 0; j < candidate.length - 15; j++) {
                  if (candidate[j] === 0x06 && // OBJECT IDENTIFIER
                      candidate[j + 1] === 0x07 && // Length 7
                      candidate[j + 2] === 0x2A && // 1.2
                      candidate[j + 3] === 0x86 && // .840
                      candidate[j + 4] === 0xCE && // .10045
                      candidate[j + 5] === 0x3D && // .2
                      candidate[j + 6] === 0x02 && // .1
                      candidate[j + 7] === 0x01) { // .1
                    
                    console.log('🔑 Found EC algorithm identifier at offset', j);
                    
                    try {
                      publicKey = await crypto.subtle.importKey(
                        'spki',
                        candidate,
                        { name: 'ECDH' },
                        false,
                        ['encrypt']
                      );
                      console.log('🔑 Successfully extracted EC public key');
                      publicKeyData = candidate;
                      break;
                    } catch (importError) {
                      console.log('❌ Failed to import EC candidate at offset', i, importError.message);
                    }
                  }
                }
                
                if (publicKey) break;
              }
            }
          }
        }
      }
      
      if (!publicKey) {
        throw new Error('Could not extract public key from X.509 certificate. Tried direct SPKI import, RSA parsing, and EC parsing.');
      }
      
    } catch (parseError: any) {
      console.error('❌ Certificate parsing failed:', parseError.message);
      console.error('❌ Full error:', parseError);
      throw new Error(`Failed to parse certificate: ${parseError.message}`);
    }
    
    // Determine the key algorithm based on successful import
    let keyType = 'rsa'; // default
    
    // Since we can't easily test the algorithm without knowing the exact format,
    // we'll assume RSA for now as it's most common for KSeF token encryption
    // The actual algorithm detection would require more complex certificate parsing
    console.log('🔑 Using algorithm: RSA-OAEP (assumed for KSeF token encryption)');
    
    // Encode token data
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenWithTimestamp);
    
    let encryptedBase64: string;
    
    // Use appropriate encryption based on key type
    if (keyType === 'rsa') {
      console.log('🔐 Using RSA-OAEP encryption with Web Crypto API...');
      
      // Check if data is too long for RSA encryption
      const maxDataLength = 190; // RSA-OAEP with 2048-bit key can encrypt up to 190 bytes
      if (data.length > maxDataLength) {
        console.error('❌ Token data too long for RSA encryption:', data.length, 'bytes (max:', maxDataLength, 'bytes)');
        throw new Error(`Token data too long for RSA encryption: ${data.length} bytes (max: ${maxDataLength} bytes). The token with timestamp might be too long.`);
      }
      
      try {
        const encrypted = await crypto.subtle.encrypt(
          {
            name: 'RSA-OAEP'
          },
          publicKey,
          data
        );
        
        encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        
        console.log('🔐 Token encrypted successfully with RSA-OAEP');
        console.log('🔐 Original data length:', data.length, 'bytes');
        console.log('🔐 Encrypted token length:', encryptedBase64.length);
        
      } catch (rsaError: any) {
        console.error('❌ RSA encryption failed:', rsaError);
        console.error('❌ Public key algorithm details:', publicKey.algorithm);
        console.error('❌ Data length:', data.length, 'bytes');
        throw new Error(`RSA encryption failed: ${rsaError instanceof Error ? rsaError.message : 'Unknown error'}`);
      }
      
    } else {
      throw new Error(`Unsupported key algorithm: ${keyType}. Only RSA is supported.`);
    }
    
    return new Response(
      JSON.stringify({
        encryptedToken: encryptedBase64,
        algorithm: keyType
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
    
  } catch (error) {
    console.error('❌ KSeF token encryption error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to encrypt KSeF token',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 500
      }
    )
  }
})
