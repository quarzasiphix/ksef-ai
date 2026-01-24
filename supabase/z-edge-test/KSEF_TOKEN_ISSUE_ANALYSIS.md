# KSeF Token Issue - Root Cause Analysis

## Problem
The stored credential is a **JWT access token** (859 bytes), not the raw KSeF token needed for authentication.

## Current Flow (BROKEN)
```
1. Database stores: JWT access token (859 bytes)
2. Code tries to: Encrypt JWT with RSA
3. RSA limit: 190 bytes
4. Result: ERROR - Token too long
```

## Correct Flow (SHOULD BE)
```
1. Database stores: Raw KSeF token (32-64 chars)
2. Code adds timestamp: token|1769237794006
3. Encrypt with RSA: ~80 bytes total
4. Result: SUCCESS
```

## Analysis of Stored Data

### Secret Name (base64 decoded):
```
20260123-EC-3A818CC000-88B2065248-D3|nip-7322228540|46fc146f425f4a3499fb565191f61d3265d497d8fdb2476c9382eb956b1fabce
```

This appears to be a composite string with:
- `20260123-EC-3A818CC000-88B2065248-D3` - Possible KSeF token reference
- `nip-7322228540` - NIP identifier
- `46fc146f425f4a3499fb565191f61d3265d497d8fdb2476c9382eb956b1fabce` - Hash/signature

### Secret Value (what's stored):
A JWT access token starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## The Real Issue

The system is storing the **wrong thing**:
- **Storing**: JWT access token (result of authentication)
- **Should store**: Raw KSeF token (input for authentication)

## Where is the Raw Token?

Looking at the secret_name, the raw KSeF token might be:
```
20260123-EC-3A818CC000-88B2065248-D3
```

This matches the KSeF token format from the test environment.

## Solution Options

### Option 1: Parse the secret_name
The raw token appears to be embedded in the `secret_name` field. Extract it:
```typescript
const secretNameDecoded = atob(credential.secret_ref);
const tokenPart = secretNameDecoded.split('|')[0]; // "20260123-EC-3A818CC000-88B2065248-D3"
```

### Option 2: Store the raw token separately
Update the database to store the actual raw KSeF token in the vault, not the JWT.

### Option 3: Check if there's a different credential type
The `ksef_credentials` table has `auth_type` which can be 'token' or 'certificate'. 
Maybe we need to look for a different record type.

## Recommended Fix

**Immediate**: Parse the secret_name to extract the raw token
**Long-term**: Update the credential storage to properly separate:
- Raw KSeF token (for authentication)
- JWT access token (cached result)
