# KSeF Integration Fix Summary

## 🔍 Root Cause Analysis

After thorough investigation of the working Java and C# implementations, I identified several critical issues in our KSeF integration:

### 1. **Token Format Issue (FIXED)**
- **Problem**: We were modifying the token format with custom timestamp shortening logic
- **Correct Format**: `token|timestamp_in_milliseconds` (as per KSeF specification)
- **Fix**: Removed the token shortening logic in `ksefProperAuth.ts` (lines 190-199)
- **Reference**: Java implementation line 576: `(ksefToken + "|" + challengeTimestamp.toEpochMilli())`

### 2. **Edge Function Validation (FIXED)**
- **Problem**: Insufficient validation and error handling in the encryption edge function
- **Fix**: Added proper validation for:
  - Token format validation (must contain `|`)
  - Parameter presence checks
  - Better error messages for debugging
- **Deployed**: Version 44 of `ksef-encrypt` edge function

### 3. **Token Length Limitation**
- **Issue**: RSA-OAEP with 2048-bit key can only encrypt up to 190 bytes
- **Current Handling**: Edge function now validates token length and provides clear error messages
- **Note**: If KSeF tokens are longer than ~180 bytes (accounting for timestamp), this will fail
- **Solution**: The KSeF token itself should be short enough to fit within RSA limits

### 4. **Database Constraint Error (PENDING FIX)**
- **Error**: `duplicate key value violates unique constraint "idx_ksef_sync_state_profile_subject"`
- **Cause**: Attempting to insert duplicate sync state records
- **Location**: `supabase/migrations/20260123_ksef_received_invoices.sql:74-75`
- **Required Fix**: Use UPSERT (INSERT ... ON CONFLICT) instead of INSERT

### 5. **Authorization Header Error (PENDING FIX)**
- **Error**: `Missing authorization header`
- **Cause**: Some calls to `ksef-encrypt` are not including the JWT token
- **Fix**: Ensure all calls include `Authorization: Bearer <anon_key>`

## 📋 Files Modified

### 1. `ksef-ai/src/shared/services/ksef/ksefProperAuth.ts`
- ✅ Removed problematic token shortening logic
- ✅ Removed unused `generateTimestampedToken` method
- ✅ Token format now correctly follows: `token|timestamp_milliseconds`

### 2. `ksef-ai/supabase/functions/ksef-encrypt/index.ts`
- ✅ Added parameter validation
- ✅ Added token format validation
- ✅ Improved error messages
- ✅ Better logging for debugging
- ✅ Deployed as version 44

## 🔧 Remaining Issues to Fix

### Priority 1: Database Sync State Constraint
**Location**: Code that inserts into `ksef_sync_state` table

**Current Code Pattern**:
```typescript
await supabase.from('ksef_sync_state').insert({
  business_profile_id: profileId,
  subject_type: 'subject1',
  // ... other fields
});
```

**Required Fix**:
```typescript
await supabase.from('ksef_sync_state').upsert({
  business_profile_id: profileId,
  subject_type: 'subject1',
  // ... other fields
}, {
  onConflict: 'business_profile_id,subject_type'
});
```

### Priority 2: Missing Authorization Headers
**Issue**: Some calls to `ksef-encrypt` are missing the Authorization header

**Check These Files**:
- `ksef-ai/src/shared/services/ksef/ksefInvoiceRetrievalHelpersBrowser.ts`
- Any other files calling the `ksef-encrypt` endpoint

**Required Pattern**:
```typescript
const response = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-encrypt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({ tokenWithTimestamp, certificatePem })
});
```

## 📊 KSeF Authentication Flow (Correct Implementation)

Based on Java implementation analysis:

```
1. Get Challenge
   └─> POST /auth/challenge
       Returns: { challenge, timestamp }

2. Prepare Token
   └─> Format: token|timestamp_milliseconds
       Example: "ABC123DEF456|1769237287108"

3. Encrypt Token
   └─> Use KSeF public key (RSA-OAEP, SHA-256)
       Max length: 190 bytes
       Returns: Base64 encoded encrypted token

4. Submit Auth Request
   └─> POST /auth/ksef-token
       Body: {
         challenge,
         contextIdentifier: { type: 'NIP', value: nip },
         encryptedToken
       }
       Returns: { referenceNumber, authenticationToken }

5. Poll Auth Status
   └─> GET /auth/{referenceNumber}
       Wait until status === 'completed'

6. Redeem Tokens
   └─> POST /auth/token/redeem
       Returns: { accessToken, expiresIn }

7. Use Access Token
   └─> All subsequent API calls use:
       Authorization: Bearer {accessToken.token}
```

## 🧪 Testing Checklist

- [ ] Test token encryption with valid KSeF token
- [ ] Verify token length is under 190 bytes
- [ ] Test complete authentication flow
- [ ] Test invoice sending from queue
- [ ] Verify database sync state upsert works
- [ ] Check all authorization headers are present

## 📝 Next Steps

1. **Fix database sync state insertion** - Use upsert instead of insert
2. **Verify all authorization headers** - Check all calls to ksef-encrypt
3. **Test complete flow** - Send invoice from queue to KSeF
4. **Monitor logs** - Check for any remaining errors
5. **Document KSeF token requirements** - Ensure tokens are short enough for RSA

## 🔗 References

- Java Implementation: `full-ksef/ksef-client-java/ksef-client/src/main/java/pl/akmf/ksef/sdk/api/services/DefaultCryptographyService.java`
- KSeF API Specification: Lines 462-479 (RSA-OAEP encryption)
- Token Format: Line 576 (token|timestamp format)
