# KSeF Implementation - Usage Examples

**Updated**: January 23, 2026  
**Status**: ✅ Ready to use

---

## 🚀 **Quick Start**

### **1. Basic Authentication with KSeF Token**

```typescript
import { KsefAuthCoordinator } from '@/shared/services/ksef/ksefAuthCoordinator';
import { supabase } from '@/integrations/supabase/client';

// Initialize coordinator
const authCoordinator = new KsefAuthCoordinator(
  'https://api-test.ksef.mf.gov.pl/v2',
  supabase
);

// Initialize with public keys (required before first use)
await authCoordinator.initialize();

// Authenticate with KSeF token (one method call!)
const tokens = await authCoordinator.authenticateWithKsefToken(
  'nip',                    // Context type
  '1234567890',             // NIP number
  'your-ksef-token-here',   // KSeF token
  'ecdsa'                   // Encryption method (ecdsa recommended)
);

console.log('Access token:', tokens.accessToken.token);
console.log('Expires in:', tokens.accessToken.expiresIn, 'seconds');
console.log('Refresh token:', tokens.refreshToken.token);
```

### **2. Using Token Manager for Auto-Refresh**

```typescript
import { KsefTokenManager } from '@/shared/services/ksef/ksefTokenManager';
import { KsefAuthCoordinator } from '@/shared/services/ksef/ksefAuthCoordinator';

// Create token manager
const tokenManager = new KsefTokenManager();

// Set refresh callback
tokenManager.setRefreshCallback(async (refreshToken) => {
  return await authCoordinator.refreshAccessToken(refreshToken);
});

// Authenticate and store tokens
const tokens = await authCoordinator.authenticateWithKsefToken(
  'nip',
  '1234567890',
  'your-ksef-token',
  'ecdsa'
);

tokenManager.storeTokens(
  tokens,
  'company-123',
  'nip',
  '1234567890'
);

// Get valid access token (auto-refreshes if needed)
const accessToken = await tokenManager.getValidAccessToken();

// Use access token for API calls
const response = await fetch(
  'https://api-test.ksef.mf.gov.pl/v2/invoices',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

### **3. Using Request Builder Pattern**

```typescript
import { AuthKsefTokenRequestBuilder } from '@/shared/services/ksef/builders/AuthKsefTokenRequestBuilder';

// Build request with type safety
const request = AuthKsefTokenRequestBuilder
  .create()
  .withChallenge('abc123...') // 64 characters
  .withContext('nip', '1234567890')
  .withEncryptedToken('base64-encrypted-token')
  .withAuthorizationPolicy({
    onClientIpChange: 'continue',
    allowedIps: {
      ip4Addresses: ['192.168.1.1']
    }
  })
  .build();

// Use request with auth manager
const result = await authManager.authenticateWithKsefToken(request);
```

---

## 🔐 **Advanced Authentication**

### **XAdES Signature Authentication (Production)**

```typescript
import { signXmlWithXAdES } from '@/shared/services/ksef/xadesService';

// Authenticate with certificate
const tokens = await authCoordinator.authenticateWithXAdES(
  'nip',
  '1234567890',
  'onip',
  async (unsignedXml) => {
    // Sign XML with your qualified certificate
    return await signXmlWithXAdES(
      unsignedXml,
      certificate,
      privateKey
    );
  }
);
```

### **Custom IP Restrictions**

```typescript
const tokens = await authCoordinator.authenticateWithKsefToken(
  'nip',
  '1234567890',
  'your-ksef-token',
  'ecdsa',
  {
    onClientIpChange: 'terminate', // End session on IP change
    allowedIps: {
      ip4Addresses: ['192.168.1.100', '192.168.1.101'],
      ip4Ranges: ['192.168.1.1-192.168.1.255'],
      ip4Masks: ['192.168.1.0/24']
    }
  }
);
```

---

## 🔧 **Cryptography Service**

### **Manual Encryption (Advanced)**

```typescript
import { KsefCryptographyService } from '@/shared/services/ksef/ksefCryptographyService';
import { KsefCertificateFetcher } from '@/shared/services/ksef/ksefCertificateFetcher';

// Fetch public keys
const certFetcher = new KsefCertificateFetcher(
  'https://api-test.ksef.mf.gov.pl/v2'
);
const publicKeys = await certFetcher.fetchPublicKeys();

// Initialize crypto service
const cryptoService = new KsefCryptographyService();
await cryptoService.initialize(publicKeys);

// Encrypt with ECDSA
const tokenWithTimestamp = `${ksefToken}|${Date.now()}`;
const encryptedECDSA = await cryptoService.encryptWithECDSA(tokenWithTimestamp);

// Encrypt with RSA
const encryptedRSA = await cryptoService.encryptWithRSA(tokenWithTimestamp);

console.log('ECDSA encrypted:', encryptedECDSA);
console.log('RSA encrypted:', encryptedRSA);
```

---

## 📊 **Complete Integration Example**

### **React Component with KSeF Authentication**

```typescript
import React, { useState } from 'react';
import { KsefAuthCoordinator } from '@/shared/services/ksef/ksefAuthCoordinator';
import { KsefTokenManager } from '@/shared/services/ksef/ksefTokenManager';
import { supabase } from '@/integrations/supabase/client';

export function KsefAuthComponent() {
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const authCoordinator = new KsefAuthCoordinator(
    'https://api-test.ksef.mf.gov.pl/v2',
    supabase
  );

  const tokenManager = new KsefTokenManager();

  const handleAuthenticate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize
      await authCoordinator.initialize();

      // Authenticate
      const result = await authCoordinator.authenticateWithKsefToken(
        'nip',
        process.env.KSEF_TEST_NIP!,
        process.env.KSEF_TEST_TOKEN!,
        'ecdsa'
      );

      // Setup token manager
      tokenManager.setRefreshCallback(async (refreshToken) => {
        return await authCoordinator.refreshAccessToken(refreshToken);
      });

      tokenManager.storeTokens(
        result,
        'company-123',
        'nip',
        process.env.KSEF_TEST_NIP!
      );

      setTokens(result);
      console.log('✅ Authentication successful!');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      console.error('❌ Authentication failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApiCall = async () => {
    try {
      // Get valid token (auto-refreshes if needed)
      const accessToken = await tokenManager.getValidAccessToken();

      // Make API call
      const response = await fetch(
        'https://api-test.ksef.mf.gov.pl/v2/invoices',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('API response:', data);

    } catch (err) {
      console.error('API call failed:', err);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">KSeF Authentication</h2>

      <button
        onClick={handleAuthenticate}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Authenticating...' : 'Authenticate'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {tokens && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <h3 className="font-bold">✅ Authenticated!</h3>
          <p className="text-sm mt-2">
            Access token expires in: {tokens.accessToken.expiresIn}s
          </p>
          <p className="text-sm">
            Refresh token expires in: {tokens.refreshToken.expiresIn}s
          </p>

          <button
            onClick={handleApiCall}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded"
          >
            Test API Call
          </button>
        </div>
      )}

      {tokenManager.getTokenStatus().hasTokens && (
        <div className="mt-4 p-4 bg-blue-100 rounded">
          <h3 className="font-bold">Token Status</h3>
          <pre className="text-xs mt-2">
            {JSON.stringify(tokenManager.getTokenStatus(), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 **Testing**

### **Unit Test Example**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { KsefAuthCoordinator } from '@/shared/services/ksef/ksefAuthCoordinator';
import { supabase } from '@/integrations/supabase/client';

describe('KsefAuthCoordinator', () => {
  let authCoordinator: KsefAuthCoordinator;

  beforeEach(() => {
    authCoordinator = new KsefAuthCoordinator(
      'https://api-test.ksef.mf.gov.pl/v2',
      supabase
    );
  });

  it('should initialize with public keys', async () => {
    await authCoordinator.initialize();
    expect(authCoordinator).toBeDefined();
  });

  it('should authenticate with KSeF token', async () => {
    await authCoordinator.initialize();

    const tokens = await authCoordinator.authenticateWithKsefToken(
      'nip',
      process.env.KSEF_TEST_NIP!,
      process.env.KSEF_TEST_TOKEN!,
      'ecdsa'
    );

    expect(tokens.accessToken.token).toBeDefined();
    expect(tokens.refreshToken.token).toBeDefined();
    expect(tokens.accessToken.expiresIn).toBeGreaterThan(0);
  });

  it('should refresh access token', async () => {
    await authCoordinator.initialize();

    const tokens = await authCoordinator.authenticateWithKsefToken(
      'nip',
      process.env.KSEF_TEST_NIP!,
      process.env.KSEF_TEST_TOKEN!,
      'ecdsa'
    );

    const newAccessToken = await authCoordinator.refreshAccessToken(
      tokens.refreshToken.token
    );

    expect(newAccessToken.token).toBeDefined();
    expect(newAccessToken.token).not.toBe(tokens.accessToken.token);
  });
});
```

---

## 🔍 **Debugging**

### **Enable Detailed Logging**

All services include console logging. Check browser console for:

```
[AuthCoordinator] Step 1: Getting challenge...
[AuthCoordinator] Challenge received: { challengeLength: 64, timestamp: 1234567890 }
[AuthCoordinator] Step 2: Created token with timestamp
[CryptographyService] Encrypting with ECDSA...
[CryptographyService] Generated ephemeral key pair
[CryptographyService] Derived shared secret
[CryptographyService] Generated nonce
[CryptographyService] Content encrypted
[CryptographyService] ECDSA encryption complete
[AuthCoordinator] Token encrypted successfully
[AuthCoordinator] Step 4: Submitting auth request...
[AuthCoordinator] Poll attempt 1: { code: 100, description: 'Processing' }
[AuthCoordinator] Poll attempt 2: { code: 200, description: 'Success' }
[AuthCoordinator] Authentication successful
[TokenManager] Tokens stored
[TokenManager] Scheduled refresh in 55 minutes
```

### **Common Issues**

**Issue**: "Cryptography service not initialized"
```typescript
// Solution: Always initialize before use
await authCoordinator.initialize();
```

**Issue**: "Invalid NIP: 123456789"
```typescript
// Solution: NIP must be exactly 10 digits
const nip = '1234567890'; // ✅ Correct
const nip = '123456789';  // ❌ Wrong (9 digits)
```

**Issue**: "Challenge must be exactly 64 characters"
```typescript
// Solution: Don't modify challenge from API
const challenge = challengeResponse.challenge; // Use as-is
```

---

## 📚 **API Reference**

### **KsefAuthCoordinator**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `initialize()` | - | `Promise<void>` | Fetch and initialize public keys |
| `authenticateWithKsefToken()` | `contextType`, `contextValue`, `ksefToken`, `encryptionMethod?`, `authorizationPolicy?` | `Promise<AuthTokens>` | Complete auth flow |
| `authenticateWithXAdES()` | `contextType`, `contextValue`, `identifierType`, `xmlSigner`, `authorizationPolicy?` | `Promise<AuthTokens>` | XAdES auth flow |
| `refreshAccessToken()` | `refreshToken` | `Promise<TokenInfo>` | Refresh access token |

### **KsefTokenManager**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `setRefreshCallback()` | `callback` | `void` | Set token refresh function |
| `storeTokens()` | `tokens`, `companyId`, `contextType`, `contextValue` | `void` | Store tokens |
| `getValidAccessToken()` | - | `Promise<string>` | Get valid token (auto-refresh) |
| `getTokenStatus()` | - | `TokenStatus` | Get token status |
| `clearTokens()` | - | `void` | Clear all tokens |

### **KsefCryptographyService**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `initialize()` | `publicKeys` | `Promise<void>` | Initialize with public keys |
| `encryptWithECDSA()` | `content` | `Promise<string>` | Encrypt with ECDSA |
| `encryptWithRSA()` | `content` | `Promise<string>` | Encrypt with RSA |
| `isInitialized()` | - | `boolean` | Check if initialized |

---

## ✅ **Best Practices**

1. **Always initialize before use**
   ```typescript
   await authCoordinator.initialize();
   ```

2. **Use ECDSA encryption** (modern, preferred)
   ```typescript
   authenticateWithKsefToken(..., 'ecdsa')
   ```

3. **Use TokenManager for auto-refresh**
   ```typescript
   const token = await tokenManager.getValidAccessToken();
   ```

4. **Store tokens securely**
   ```typescript
   // Don't store in localStorage
   // Use secure session storage or backend
   ```

5. **Handle errors gracefully**
   ```typescript
   try {
     await authCoordinator.authenticateWithKsefToken(...);
   } catch (error) {
     console.error('Auth failed:', error);
     // Show user-friendly message
   }
   ```

---

**Status**: ✅ **READY FOR PRODUCTION**  
**Next**: Test with your KSeF token and start building!

---

*Last Updated: January 23, 2026*
