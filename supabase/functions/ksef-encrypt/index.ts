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
    
    console.log('🔐 Token length:', tokenWithTimestamp.length);
    
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
    
    // Import Node.js crypto
    const crypto = await import('crypto');
    
    // Convert to certificate PEM format
    const certPem = `-----BEGIN CERTIFICATE-----\n${cert.certificate}\n-----END CERTIFICATE-----`;
    
    console.log('🔑 Parsing certificate...');
    console.log('🔑 Certificate PEM preview:', certPem.substring(0, 100) + '...');
    
    try {
      const publicKey = crypto.createPublicKey({
        key: certPem,
        format: 'pem'
      });
      
      const keyType = publicKey.asymmetricKeyType;
      console.log('🔑 Algorithm detected:', keyType);
      console.log('🔑 Public key details:', {
        type: publicKey.type,
        encoding: publicKey.encoding,
        asymmetricKeyType: publicKey.asymmetricKeyType
      });
    
    // Encode token data
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenWithTimestamp);
    
    let encryptedBase64: string;
    
    // Use appropriate encryption based on key type
    if (keyType === 'rsa') {
      console.log('🔐 Using RSA-OAEP encryption...');
      
      try {
        const encrypted = crypto.publicEncrypt(
          {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          data
        );
        
        const encryptedArray = new Uint8Array(encrypted);
        encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
        
        console.log('🔐 Token encrypted successfully with RSA-OAEP');
        console.log('🔐 Encrypted token length:', encryptedBase64.length);
        
      } catch (rsaError) {
        console.error('❌ RSA encryption failed:', rsaError);
        throw new Error(`RSA encryption failed: ${rsaError instanceof Error ? rsaError.message : 'Unknown error'}`);
      }
      
    } else if (keyType === 'ec') {
      console.log('🔐 Using ECDH + AES-GCM encryption...');
      
      try {
        // Generate ephemeral EC key pair
        const ecdh = crypto.createECDH('prime256v1');
        ecdh.generateKeys();
        
        // Get the public key from certificate
        const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
        
        // Perform ECDH to get shared secret
        const sharedSecret = ecdh.computeSecret(publicKeyDer.slice(-65)); // Last 65 bytes is the EC public key
        
        // Derive AES key from shared secret (first 32 bytes)
        const aesKey = sharedSecret.slice(0, 32);
        
        // Generate random nonce (12 bytes for GCM)
        const nonce = new Uint8Array(12);
        crypto.randomFillSync(nonce);
        
        // Encrypt with AES-GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, nonce);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const authTag = cipher.getAuthTag();
        
        // Get ephemeral public key
        const ephemeralPublicKey = ecdh.getPublicKey();
        
        // Combine: ephemeralPublicKey + nonce + encrypted + authTag
        const combined = Buffer.concat([
          ephemeralPublicKey,
          Buffer.from(nonce),
          encrypted,
          authTag
        ]);
        
        encryptedBase64 = combined.toString('base64');
        
        console.log('🔐 Token encrypted successfully with ECDH + AES-GCM');
        console.log('🔐 Encrypted token length:', encryptedBase64.length);
        
      } catch (ecError) {
        console.error('❌ ECDH encryption failed:', ecError);
        throw new Error(`ECDH encryption failed: ${ecError instanceof Error ? ecError.message : 'Unknown error'}`);
      }
      
    } else {
      throw new Error(`Unsupported key algorithm: ${keyType}`);
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
    
  } catch (parseError) {
      console.error('❌ Certificate parsing failed:', parseError);
      console.error('❌ Parse error details:', parseError instanceof Error ? parseError.message : 'Unknown error');
      throw new Error(`Certificate parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    // Encode token data
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenWithTimestamp);
    
    let encryptedBase64: string;
    
    // Use appropriate encryption based on key type
    if (keyType === 'rsa') {
      console.log('🔐 Using RSA-OAEP encryption...');
      
      try {
        const encrypted = crypto.publicEncrypt(
          {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          data
        );
        
        const encryptedArray = new Uint8Array(encrypted);
        encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
        
        console.log('🔐 Token encrypted successfully with RSA-OAEP');
        console.log('🔐 Encrypted token length:', encryptedBase64.length);
        
      } catch (rsaError) {
        console.error('❌ RSA encryption failed:', rsaError);
        throw new Error(`RSA encryption failed: ${rsaError instanceof Error ? rsaError.message : 'Unknown error'}`);
      }
      
    } else if (keyType === 'ec') {
      console.log('🔐 Using ECDH + AES-GCM encryption...');
      
      try {
        // Generate ephemeral EC key pair
        const ecdh = crypto.createECDH('prime256v1');
        ecdh.generateKeys();
        
        // Get the public key from certificate
        const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
        
        // Perform ECDH to get shared secret
        const sharedSecret = ecdh.computeSecret(publicKeyDer.slice(-65)); // Last 65 bytes is the EC public key
        
        // Derive AES key from shared secret (first 32 bytes)
        const aesKey = sharedSecret.slice(0, 32);
        
        // Generate random nonce (12 bytes for GCM)
        const nonce = new Uint8Array(12);
        crypto.randomFillSync(nonce);
        
        // Encrypt with AES-GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, nonce);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const authTag = cipher.getAuthTag();
        
        // Get ephemeral public key
        const ephemeralPublicKey = ecdh.getPublicKey();
        
        // Combine: ephemeralPublicKey + nonce + encrypted + authTag
        const combined = Buffer.concat([
          ephemeralPublicKey,
          Buffer.from(nonce),
          encrypted,
          authTag
        ]);
        
        encryptedBase64 = combined.toString('base64');
        
        console.log('🔐 Token encrypted successfully with ECDH + AES-GCM');
        console.log('🔐 Encrypted token length:', encryptedBase64.length);
        
      } catch (ecError) {
        console.error('❌ ECDH encryption failed:', ecError);
        throw new Error(`ECDH encryption failed: ${ecError instanceof Error ? ecError.message : 'Unknown error'}`);
      }
      
    } else {
      throw new Error(`Unsupported key algorithm: ${keyType}`);
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
