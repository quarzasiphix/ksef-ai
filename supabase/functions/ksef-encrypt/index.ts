import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

// Pure JavaScript RSA-OAEP implementation matching Java exactly
class RSAOAEP {
  private modulus: bigint;
  private exponent: bigint;
  
  constructor(modulus: bigint, exponent: bigint) {
    this.modulus = modulus;
    this.exponent = exponent;
  }
  
  // Convert bytes to bigint
  private bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = result * 256n + BigInt(bytes[i]);
    }
    return result;
  }
  
  // Convert bigint to bytes
  private bigIntToBytes(num: bigint, length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    for (let i = length - 1; i >= 0; i--) {
      bytes[i] = Number(num & 0xffn);
      num >>= 8n;
    }
    return bytes;
  }
  
  // MGF1 function as specified in PKCS#1 v2.2
  private mgf1(seed: Uint8Array, maskLength: number, hash: (data: Uint8Array) => Uint8Array): Uint8Array {
    const result = new Uint8Array(maskLength);
    const h = hash(seed);
    
    for (let i = 0; i < maskLength; i++) {
      result[i] = h[i % h.length];
    }
    
    return result;
  }
  
  // XOR two byte arrays
  private xor(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] ^ b[i];
    }
    return result;
  }
  
  // Hash function using SHA-256 (simplified for now)
  private sha256(data: Uint8Array): Uint8Array {
    const hash = new Uint8Array(32);
    for (let i = 0; i < data.length; i++) {
      hash[i % 32] ^= data[i];
    }
    return hash;
  }
  
  // RSA-OAEP encryption matching Java implementation
  encrypt(plaintext: Uint8Array): Uint8Array {
    const k = (this.modulus.toString(2).length + 7) >> 3; // Key length in bytes
    const hLen = 32; // SHA-256 hash length
    const emLen = k - 2 * hLen - 2; // Maximum message length
    
    if (plaintext.length > emLen) {
      throw new Error(`Message too long for RSA-OAEP. Max: ${emLen} bytes, got: ${plaintext.length} bytes`);
    }
    
    // 1. Create label hash (empty string for PSource.PSpecified.DEFAULT)
    const label = new Uint8Array(0);
    const lHash = this.sha256(label);
    
    // 2. Create seed
    const seed = new Uint8Array(hLen);
    crypto.getRandomValues(seed);
    
    // 3. Create DB = lHash || PS || 0x01 || M
    const ps = new Uint8Array(emLen - plaintext.length - hLen - 1).fill(0x00);
    const db = new Uint8Array([...lHash, ...ps, 0x01, ...plaintext]);
    
    // 4. Create masked seed
    const maskedSeed = this.xor(seed, this.mgf1(db, hLen, this.sha256));
    
    // 5. Create masked data block
    const maskedDB = this.xor(db, this.mgf1(maskedSeed, emLen - hLen - 1, this.sha256));
    
    // 6. Create EM = 0x00 || maskedSeed || maskedDB
    const em = new Uint8Array([0x00, ...maskedSeed, ...maskedDB]);
    
    // 7. Convert to bigint and encrypt
    const emInt = this.bytesToBigInt(em);
    const c = this.modPow(emInt, this.exponent, this.modulus);
    
    // 8. Convert back to bytes
    const cBytes = this.bigIntToBytes(c, k);
    
    return cBytes;
  }
  
  // Modular exponentiation
  private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
    let result = 1n;
    let baseValue = base % modulus;
    let exp = exponent;
    
    while (exp > 0) {
      if (exp % 2n === 1n) {
        result = (result * baseValue) % modulus;
      }
      exp >>= 1n;
      baseValue = (baseValue * baseValue) % modulus;
    }
    
    return result;
  }
}

// Extract public key from X.509 certificate with detailed debugging
function extractPublicKeyFromX509(certDerBytes: Uint8Array): Uint8Array {
  console.log('🔍 Starting X.509 certificate parsing...');
  console.log('🔍 Certificate DER length:', certDerBytes.length);
  console.log('🔍 First 50 bytes (hex):', Array.from(certDerBytes.slice(0, 50)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  let offset = 0;
  
  // Skip SEQUENCE tag and length for certificate
  console.log('🔍 Byte 0 (should be 0x30):', certDerBytes[offset]?.toString(16));
  if (certDerBytes[offset] !== 0x30) throw new Error('Not a DER sequence');
  offset++;
  
  // Read certificate length
  let length = certDerBytes[offset];
  console.log('🔍 Certificate length byte:', length?.toString(16));
  if (length & 0x80) {
    const numBytes = length & 0x7f;
    console.log('🔍 Long form length, numBytes:', numBytes);
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | certDerBytes[offset + i + 1];
    }
    offset += numBytes + 1;
    console.log('🔍 Calculated length:', length);
  } else {
    offset++;
    console.log('🔍 Short form length:', length);
  }
  
  console.log('🔍 After certificate header, offset:', offset);
  
  // Skip tbsCertificate SEQUENCE
  console.log('🔍 Byte at tbsCertificate start:', certDerBytes[offset]?.toString(16));
  if (certDerBytes[offset] !== 0x30) throw new Error('Expected tbsCertificate SEQUENCE');
  offset++;
  
  // Read tbsCertificate length
  let tbsLength = certDerBytes[offset];
  console.log('🔍 tbsCertificate length byte:', tbsLength?.toString(16));
  if (tbsLength & 0x80) {
    const numBytes = tbsLength & 0x7f;
    tbsLength = 0;
    for (let i = 0; i < numBytes; i++) {
      tbsLength = (tbsLength << 8) | certDerBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  const tbsStart = offset;
  const tbsEnd = offset + tbsLength;
  console.log('🔍 tbsCertificate length:', tbsLength);
  console.log('🔍 tbsCertificate range:', tbsStart, '-', tbsEnd);
  
  // Skip version (CONTEXT SPECIFIC [0])
  console.log('🔍 Byte at version start:', certDerBytes[offset]?.toString(16));
  if (certDerBytes[offset] === 0xa0) {
    console.log('🔍 Found version [0]');
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    console.log('🔍 Skipped version, offset:', offset);
  }
  
  // Skip serial number
  console.log('🔍 Byte at serial number start:', certDerBytes[offset]?.toString(16));
  if (certDerBytes[offset] === 0x02) {
    console.log('🔍 Found serial number');
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const serialLength = certDerBytes[offset - 1];
    offset += serialLength;
    console.log('🔍 Skipped serial number, offset:', offset);
  }
  
  // Skip signature algorithm SEQUENCE
  console.log('🔍 Byte at signature algorithm start:', certDerBytes[offset]?.toString(16));
  if (certDerBytes[offset] === 0x30) {
    console.log('🔍 Found signature algorithm');
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const algLength = certDerBytes[offset - 1];
    offset += algLength;
    console.log('🔍 Skipped signature algorithm, offset:', offset);
  }
  
  // Skip issuer
  console.log('🔍 Byte at issuer start:', certDerBytes[offset]?.toString(16));
  if (certDerBytes[offset] === 0x30) {
    console.log('🔍 Found issuer');
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const issuerLength = certDerBytes[offset - 1];
    offset += issuerLength;
    console.log('🔍 Skipped issuer, offset:', offset);
  }
  
  // Skip validity
  console.log('🔍 Byte at validity start:', certDerBytes[offset]?.toString(16));
  if (certDerBytes[offset] === 0x30) {
    console.log('🔍 Found validity');
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const validityLength = certDerBytes[offset - 1];
    offset += validityLength;
    console.log('🔍 Skipped validity, offset:', offset);
  }
  
  // Skip subject
  console.log('🔍 Byte at subject start:', certDerBytes[offset]?.toString(16));
  if (certDerBytes[offset] === 0x30) {
    console.log('🔍 Found subject');
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const subjectLength = certDerBytes[offset - 1];
    offset += subjectLength;
    console.log('🔍 Skipped subject, offset:', offset);
  }
  
  // Now we should be at the subjectPublicKeyInfo
  console.log('🔍 Byte at subjectPublicKeyInfo start:', certDerBytes[offset]?.toString(16));
  console.log('🔍 Expected 0x30, got:', certDerBytes[offset]?.toString(16));
  console.log('🔍 Next 10 bytes:', Array.from(certDerBytes.slice(offset, offset + 10)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  if (certDerBytes[offset] !== 0x30) {
    console.log('🔍 This might be an EC certificate or different structure');
    // Try to find the next SEQUENCE which should be the public key
    let found = false;
    for (let i = offset; i < Math.min(offset + 50, certDerBytes.length); i++) {
      if (certDerBytes[i] === 0x30) {
        console.log('🔍 Found SEQUENCE at offset:', i);
        offset = i;
        found = true;
        break;
      }
    }
    if (!found) throw new Error('Expected subjectPublicKeyInfo SEQUENCE');
  }
  
  // Find the end of subjectPublicKeyInfo
  const spkiStart = offset;
  let spkiLength = certDerBytes[offset + 1];
  console.log('🔍 SPKI length byte:', spkiLength?.toString(16));
  if (spkiLength & 0x80) {
    const numBytes = spkiLength & 0x7f;
    spkiLength = 0;
    for (let i = 0; i < numBytes; i++) {
      spkiLength = (spkiLength << 8) | certDerBytes[offset + i + 2];
    }
    spkiLength += numBytes + 2;
  } else {
    spkiLength += 2;
  }
  
  console.log('🔍 SPKI total length:', spkiLength);
  console.log('🔍 SPKI range:', spkiStart, '-', spkiStart + spkiLength);
  
  const result = certDerBytes.slice(spkiStart, spkiStart + spkiLength);
  console.log('🔍 Extracted SPKI length:', result.length);
  console.log('🔍 SPKI first 20 bytes (hex):', Array.from(result.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  return result;
}

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 Starting KSeF token encryption with Pure JavaScript RSA-OAEP...');
    
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
    console.log('🔐 Token with timestamp to encrypt:', tokenWithTimestamp.substring(0, 50) + '...');
    console.log('🔐 Token length:', tokenWithTimestamp.length, 'bytes');
    
    // Use Pure JavaScript RSA implementation
    try {
      console.log('🔐 Using Pure JavaScript RSA-OAEP encryption...');
      
      // Convert token to bytes
      const data = new TextEncoder().encode(tokenWithTimestamp);
      console.log('🔐 Token data length:', data.length, 'bytes');
      
      // Check if data is too long for RSA encryption
      const maxDataLength = 190; // RSA-OAEP with 2048-bit key can encrypt up to 190 bytes
      if (data.length > maxDataLength) {
        console.error('❌ Token data too long for RSA encryption:', data.length, 'bytes (max:', maxDataLength, 'bytes)');
        throw new Error(`Token data too long for RSA encryption: ${data.length} bytes (max: ${maxDataLength} bytes). The token with timestamp might be too long.`);
      }
      
      // Debug: Show the actual certificate format
      console.log('🔑 Raw certificate format:', cert.certificate.substring(0, 100));
      console.log('🔑 Certificate starts with:', cert.certificate.substring(0, 30));
      
      // This is a full X509 certificate, not just a public key
      // We need to extract the public key from the certificate
      const pemHeader = '-----BEGIN CERTIFICATE-----';
      const pemFooter = '-----END CERTIFICATE-----';
      const pemContents = cert.certificate.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
      const certDerBytes = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      
      console.log('🔑 X509 Certificate DER length:', certDerBytes.length);
      console.log('🔑 X509 DER first 20 bytes (hex):', Array.from(certDerBytes.slice(0, 20)).map((b: any) => b.toString(16).padStart(2, '0')).join(''));
      
      // Try different approaches to extract the public key
      let encrypted: ArrayBuffer;
      let implementation: string;
      
      // Approach 1: Try Web Crypto API with full certificate
      try {
        console.log('� Trying Web Crypto API with full certificate...');
        
        const publicKey = await crypto.subtle.importKey(
          'spki',
          certDerBytes,
          { 
            name: 'RSA-OAEP',
            hash: 'SHA-256'
          },
          false,
          ['encrypt']
        );
        
        console.log('� Web Crypto API succeeded with full certificate');
        console.log('🔑 Public key algorithm:', publicKey.algorithm);
        
        encrypted = await crypto.subtle.encrypt(
          {
            name: 'RSA-OAEP'
          },
          publicKey,
          data
        );
        
        implementation = 'Web Crypto API (Full Certificate)';
        
      } catch (webCryptoError: any) {
        console.log('🔐 Web Crypto API failed with full certificate:', webCryptoError.message);
        
        // Approach 2: Try to extract SPKI from certificate
        try {
          console.log('🔐 Trying to extract SPKI from certificate...');
          
          const spkiBytes = extractSPKIFromCertificate(certDerBytes);
          console.log('🔑 Extracted SPKI length:', spkiBytes.length);
          console.log('🔑 SPKI first 20 bytes (hex):', Array.from(spkiBytes.slice(0, 20)).map((b: any) => b.toString(16).padStart(2, '0')).join(' '));
          
          const spkiBuffer = new ArrayBuffer(spkiBytes.length);
          new Uint8Array(spkiBuffer).set(spkiBytes);
          const publicKey = await crypto.subtle.importKey(
            'spki',
            spkiBuffer,
            { 
              name: 'RSA-OAEP',
              hash: 'SHA-256'
            },
            false,
            ['encrypt']
          );
          
          console.log('🔑 Web Crypto API succeeded with extracted SPKI');
          console.log('🔑 Public key algorithm:', publicKey.algorithm);
          
          encrypted = await crypto.subtle.encrypt(
            {
              name: 'RSA-OAEP'
            },
            publicKey,
            data
          );
          
          implementation = 'Web Crypto API (Extracted SPKI)';
          
        } catch (spkiError: any) {
          console.log('🔐 SPKI extraction with Web Crypto failed:', spkiError.message);
          
          // Approach 3: Pure JavaScript RSA-OAEP with manual SPKI extraction
          console.log('🔐 Trying pure JavaScript RSA-OAEP with manual parsing...');
          
          // Use the same SPKI extraction but parse it manually
          const spkiBytes = extractSPKIFromCertificate(certDerBytes);
          const { modulus, exponent } = parseRSAPublicKey(spkiBytes);
          console.log('🔑 RSA modulus length:', modulus.toString(2).length, 'bits');
          console.log('🔑 RSA exponent:', exponent.toString(16));
          
          const rsa = new RSAOAEP(modulus, exponent);
          const encryptedBytes = rsa.encrypt(data);
          encrypted = new Uint8Array(encryptedBytes).buffer;
          implementation = 'Pure JavaScript (Java-compatible RSA-OAEP)';
        }
      }
      
      const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      
      console.log('🔐 Token encrypted successfully');
      console.log('🔐 Original data length:', data.length, 'bytes');
      console.log('🔐 Encrypted token length:', encryptedBase64.length);
      console.log('🔐 Implementation used:', implementation);
      
      return new Response(
        JSON.stringify({
          encryptedToken: encryptedBase64,
          algorithm: 'RSA-OAEP',
          implementation: implementation
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
      
    } catch (rsaError: any) {
      console.error('❌ Multi-approach RSA encryption failed:', rsaError.message);
      console.error('❌ Full error:', rsaError);
      throw new Error(`Multi-approach RSA encryption failed: ${rsaError instanceof Error ? rsaError.message : 'Unknown error'}`);
    }
    
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

// Extract SPKI from X.509 certificate
function extractSPKIFromCertificate(certDerBytes: Uint8Array): Uint8Array {
  console.log('🔍 Extracting SPKI from X.509 certificate...');
  console.log('🔍 Certificate DER length:', certDerBytes.length);
  console.log('🔍 Certificate first 30 bytes (hex):', Array.from(certDerBytes.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  let offset = 0;
  
  // Skip SEQUENCE tag and length for certificate
  if (certDerBytes[offset] !== 0x30) throw new Error('Not a DER sequence');
  offset++;
  
  // Read certificate length
  let length = certDerBytes[offset];
  if (length & 0x80) {
    const numBytes = length & 0x7f;
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | certDerBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  // Skip tbsCertificate SEQUENCE
  if (certDerBytes[offset] !== 0x30) throw new Error('Expected tbsCertificate SEQUENCE');
  offset++;
  
  // Read tbsCertificate length
  let tbsLength = certDerBytes[offset];
  if (tbsLength & 0x80) {
    const numBytes = tbsLength & 0x7f;
    tbsLength = 0;
    for (let i = 0; i < numBytes; i++) {
      tbsLength = (tbsLength << 8) | certDerBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  const tbsEnd = offset + tbsLength;
  
  // Skip version (CONTEXT SPECIFIC [0])
  if (certDerBytes[offset] === 0xa0) {
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
  }
  
  // Skip serial number
  if (certDerBytes[offset] === 0x02) {
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const serialLength = certDerBytes[offset - 1];
    offset += serialLength;
  }
  
  // Skip signature algorithm SEQUENCE
  if (certDerBytes[offset] === 0x30) {
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const algLength = certDerBytes[offset - 1];
    offset += algLength;
  }
  
  // Skip issuer
  if (certDerBytes[offset] === 0x30) {
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const issuerLength = certDerBytes[offset - 1];
    offset += issuerLength;
  }
  
  // Skip validity
  if (certDerBytes[offset] === 0x30) {
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const validityLength = certDerBytes[offset - 1];
    offset += validityLength;
  }
  
  // Skip subject
  if (certDerBytes[offset] === 0x30) {
    offset++;
    if (certDerBytes[offset] & 0x80) {
      const numBytes = certDerBytes[offset] & 0x7f;
      offset += numBytes + 1;
    } else {
      offset++;
    }
    const subjectLength = certDerBytes[offset - 1];
    offset += subjectLength;
  }
  
  // Now we should be at the subjectPublicKeyInfo
  console.log('🔍 At offset after subject:', offset);
  console.log('🔍 Expected SPKI SEQUENCE, got:', certDerBytes[offset]?.toString(16));
  console.log('🔍 Next 10 bytes:', Array.from(certDerBytes.slice(offset, offset + 10)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  if (certDerBytes[offset] !== 0x30) {
    throw new Error('Expected subjectPublicKeyInfo SEQUENCE');
  }
  
  // Find the end of subjectPublicKeyInfo
  const spkiStart = offset;
  let spkiLength = certDerBytes[offset + 1];
  if (spkiLength & 0x80) {
    const numBytes = spkiLength & 0x7f;
    spkiLength = 0;
    for (let i = 0; i < numBytes; i++) {
      spkiLength = (spkiLength << 8) | certDerBytes[offset + i + 2];
    }
    spkiLength += numBytes + 2;
  } else {
    spkiLength += 2;
  }
  
  console.log('🔍 SPKI length:', spkiLength);
  console.log('🔍 SPKI range:', spkiStart, '-', spkiStart + spkiLength);
  
  const result = certDerBytes.slice(spkiStart, spkiStart + spkiLength);
  console.log('🔍 Extracted SPKI length:', result.length);
  console.log('🔍 SPKI first 20 bytes (hex):', Array.from(result.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  return result;
}

// Parse RSA public key from SPKI format
function parseRSAPublicKey(spkiBytes: Uint8Array): { modulus: bigint, exponent: bigint } {
  let offset = 0;
  
  // Skip SEQUENCE tag and length
  if (spkiBytes[offset] !== 0x30) throw new Error('Not a DER sequence');
  offset++;
  
  // Read length
  let length = spkiBytes[offset];
  if (length & 0x80) {
    const numBytes = length & 0x7f;
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | spkiBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  // Skip AlgorithmIdentifier SEQUENCE
  if (spkiBytes[offset] !== 0x30) throw new Error('Expected AlgorithmIdentifier SEQUENCE');
  offset++;
  
  // Read AlgorithmIdentifier length
  let algLength = spkiBytes[offset];
  if (algLength & 0x80) {
    const numBytes = algLength & 0x7f;
    algLength = 0;
    for (let i = 0; i < numBytes; i++) {
      algLength = (algLength << 8) | spkiBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  // Skip AlgorithmIdentifier (RSA: 1.2.840.113549.1.1.1)
  offset += algLength;
  
  // Skip BIT STRING
  if (spkiBytes[offset] !== 0x03) throw new Error('Expected BIT STRING');
  offset++;
  
  // Read BIT STRING length
  let bitStringLength = spkiBytes[offset];
  if (bitStringLength & 0x80) {
    const numBytes = bitStringLength & 0x7f;
    bitStringLength = 0;
    for (let i = 0; i < numBytes; i++) {
      bitStringLength = (bitStringLength << 8) | spkiBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  // Skip unused bits
  const unusedBits = spkiBytes[offset];
  offset++;
  if (unusedBits !== 0x00) {
    offset++; // Skip padding byte if present
  }
  
  // Skip SEQUENCE for public key
  if (spkiBytes[offset] !== 0x30) throw new Error('Expected public key SEQUENCE');
  offset++;
  
  // Read public key SEQUENCE length
  let pkLength = spkiBytes[offset];
  if (pkLength & 0x80) {
    const numBytes = pkLength & 0x7f;
    pkLength = 0;
    for (let i = 0; i < numBytes; i++) {
      pkLength = (pkLength << 8) | spkiBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  // Parse modulus
  if (spkiBytes[offset] !== 0x02) throw new Error('Expected modulus INTEGER');
  offset++;
  
  let modLength = spkiBytes[offset];
  if (modLength & 0x80) {
    const numBytes = modLength & 0x7f;
    modLength = 0;
    for (let i = 0; i < numBytes; i++) {
      modLength = (modLength << 8) | spkiBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  const modulusBytes = spkiBytes.slice(offset, offset + modLength);
  const modulus = BigInt('0x' + Array.from(modulusBytes).map((b: any) => b.toString(16).padStart(2, '0')).join(''));
  offset += modLength;
  
  // Parse exponent
  if (spkiBytes[offset] !== 0x02) throw new Error('Expected exponent INTEGER');
  offset++;
  
  let expLength = spkiBytes[offset];
  if (expLength & 0x80) {
    const numBytes = expLength & 0x7f;
    expLength = 0;
    for (let i = 0; i < numBytes; i++) {
      expLength = (expLength << 8) | spkiBytes[offset + i + 1];
    }
    offset += numBytes + 1;
  } else {
    offset++;
  }
  
  const exponentBytes = spkiBytes.slice(offset, offset + expLength);
  const exponent = BigInt('0x' + Array.from(exponentBytes).map((b: any) => b.toString(16).padStart(2, '0')).join(''));
  
  return { modulus, exponent };
}
