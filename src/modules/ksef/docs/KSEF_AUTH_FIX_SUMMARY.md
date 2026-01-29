# KSEF Authentication Fix Summary

## Issue
KSEF 2.0 token authentication failing with error 450 "Invalid token encoding"

## Root Cause
RSA-OAEP encryption was using default SHA-1 hash algorithm instead of SHA-256 required by KSEF.

## Fix Applied

### Edge Function Updated: `ksef-encrypt` (Version 56)

**File**: `supabase/functions/ksef-encrypt/index.ts`

**Changes**:
1. Updated `importKey()` to explicitly specify SHA-256:
```typescript
publicKey = await crypto.subtle.importKey(
  'spki',
  derBytes,
  { 
    name: 'RSA-OAEP', 
    hash: { name: 'SHA-256' }  // ✅ Explicitly specify SHA-256
  },
  false,
  ['encrypt']
);
```

2. Applied to all key import locations (lines 82-90, 136-145)

## Testing Steps

### 1. Clear Browser Cache
The browser may have cached the old edge function. Clear cache and hard reload:
- Chrome/Edge: `Ctrl + Shift + R` or `Ctrl + F5`
- Or clear site data in DevTools

### 2. Clear Token Cache in Application
Add this to browser console to clear the token cache:
```javascript
// Clear localStorage
localStorage.clear();

// Or specifically clear KSEF-related items
Object.keys(localStorage).forEach(key => {
  if (key.includes('ksef') || key.includes('KSEF')) {
    localStorage.removeItem(key);
  }
});
```

### 3. Test Authentication
1. Navigate to KSEF settings
2. Click "Test Connection"
3. Monitor console logs for:
   - ✅ Token extraction: `🔑 Using KSEF token identifier: 20260129-EC-398D2D8000-AECC6044CB-97`
   - ✅ Encryption: `🔐 Token encrypted successfully`
   - ✅ Auth status: Should show 200 instead of 450

## Expected Behavior

### Before Fix
```json
{
  "status": {
    "code": 450,
    "description": "Uwierzytelnianie zakończone niepowodzeniem z powodu błędnego tokenu",
    "details": ["Invalid token encoding."]
  }
}
```

### After Fix
```json
{
  "status": {
    "code": 200,
    "description": "Authentication successful"
  }
}
```

## Verification

Check `ksef_audit_log` table:
```sql
SELECT 
  created_at,
  operation,
  response_status,
  error_message
FROM ksef_audit_log 
WHERE provider_nip = '7322228540'
ORDER BY created_at DESC 
LIMIT 5;
```

Should see `response_status = 200` for recent attempts.

## Token Format Verified

From database:
- **Stored**: Base64-encoded `secret_ref`
- **Decoded**: `20260129-EC-398D2D8000-AECC6044CB-97|nip-7322228540|9b5120575a7b4de1a930b5c25b7bedee2efba21f45624570bc3af05a2d67aa9d`
- **Extracted**: `20260129-EC-398D2D8000-AECC6044CB-97` (first part)
- **Format**: Correct KSEF token format

## Next Steps if Still Failing

1. **Check Edge Function Logs** (via Supabase Dashboard):
   - Go to Edge Functions → ksef-encrypt → Logs
   - Look for encryption attempts and any errors

2. **Verify Certificate**:
   - The edge function fetches certificates from KSEF API
   - Ensure `KsefTokenEncryption` certificate is being used

3. **Test Direct API Call**:
   ```javascript
   // Test encryption directly
   const response = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-encrypt', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer YOUR_ANON_KEY'
     },
     body: JSON.stringify({
       tokenWithTimestamp: '20260129-EC-398D2D8000-AECC6044CB-97|1769709766086',
       certificatePem: 'CERT_FROM_KSEF_API'
     })
   });
   ```

## Technical Details

### Java Reference Implementation
```java
OAEPParameterSpec oaepParams = new OAEPParameterSpec(
    "SHA-256",        // Hash algorithm
    "MGF1",           // Mask generation function
    MGF1ParameterSpec.SHA256,
    PSource.PSpecified.DEFAULT
);
```

### Web Crypto API Implementation
```typescript
// Hash algorithm specified during key import
const publicKey = await crypto.subtle.importKey(
  'spki',
  keyData,
  { name: 'RSA-OAEP', hash: { name: 'SHA-256' } },
  false,
  ['encrypt']
);

// Encryption uses the hash from the key
const encrypted = await crypto.subtle.encrypt(
  { name: 'RSA-OAEP' },
  publicKey,
  data
);
```

## Deployment Info

- **Edge Function**: `ksef-encrypt`
- **Version**: 56
- **Status**: ACTIVE
- **Deployed**: 2026-01-29 18:01:30 UTC
- **Project**: rncrzxjyffxmfbnxlqtm
