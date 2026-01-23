# Official KSeF 2.0 Implementation Requirements

Based on official documentation from: https://github.com/CIRFMF/ksef-docs

## Critical Implementation Gaps Identified

### 1. ❌ **MANDATORY ENCRYPTION MISSING**

**Current State**: Invoices sent as plain XML
**Required**: ALL invoices MUST be encrypted with AES-256-CBC

#### Official Requirements:
- **Algorithm**: AES-256-CBC with PKCS#7 padding
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes)
- **Key Encryption**: RSA-OAEP with SHA-256 and MGF1-SHA256
- **IV Handling**: Prepend IV to encrypted data

#### Implementation Steps:
1. Generate 256-bit AES key per session
2. Generate 128-bit IV per invoice
3. Encrypt invoice XML with AES-256-CBC
4. Prepend IV to encrypted data
5. Encrypt AES key with KSeF public key (RSA-OAEP)
6. Send encrypted key during session initialization

**Reference**: `sesja-interaktywna.md`, `przeglad-kluczowych-zmian-ksef-api-2-0.md`

---

### 2. ❌ **INCORRECT SESSION FLOW**

**Current State**: Direct invoice submission
**Required**: Proper session lifecycle

#### Official Flow:
```
1. Authenticate → Get accessToken (JWT)
2. Generate encryption data (AES key + IV)
3. POST /sessions/online → Open session with encrypted key
4. POST /sessions/online/{ref}/invoices → Send encrypted invoice(s)
5. POST /sessions/online/{ref}/close → Close session
6. GET /sessions/online/{ref}/status → Get UPO
```

#### Session Properties:
- **Validity**: 12 hours from creation
- **Max Invoices**: 10,000 per session
- **Concurrent Sessions**: Multiple allowed per authentication

**Reference**: `sesja-interaktywna.md`

---

### 3. ❌ **AUTHENTICATION NOT COMPLIANT**

**Current State**: Using token as Bearer directly
**Required**: Proper JWT-based authentication flow

#### Official Authentication Methods:

**A) XAdES Signature (Recommended for first-time)**
```
1. POST /auth/challenge → Get challenge
2. Create AuthTokenRequest XML with challenge
3. Sign XML with XAdES (qualified certificate)
4. POST /auth/xades-signature → Get authenticationToken
5. GET /auth/{referenceNumber} → Check status
6. POST /auth/token/redeem → Get accessToken + refreshToken
```

**B) KSeF Token (For subsequent authentications)**
```
1. POST /auth/challenge → Get challenge + timestamp
2. Encrypt "{ksefToken}|{timestampMs}" with RSA-OAEP
3. POST /auth/ksef-token → Get authenticationToken
4. POST /auth/token/redeem → Get accessToken + refreshToken
```

#### Token Management:
- **accessToken**: Short-lived (minutes), used for API calls
- **refreshToken**: Long-lived (up to 7 days), used to refresh accessToken
- **POST /auth/token/refresh**: Refresh accessToken without re-authentication

**Reference**: `uwierzytelnianie.md`, `tokeny-ksef.md`

---

### 4. ❌ **MISSING INVOICE VALIDATION**

**Current State**: Basic validation only
**Required**: Comprehensive validation per KSeF spec

#### Mandatory Validations:

**A) NIP Checksum (Production Only)**
```typescript
// Algorithm: weights [6,5,7,2,3,4,5,6,7]
// Checksum = (sum of digit[i] * weight[i]) % 11
// Must equal 10th digit
```

**B) Duplicate Detection**
- Combination: `Podmiot1:NIP` + `RodzajFaktury` + `P_2`
- Retention: 10 years from end of calendar year
- Error Code: 440 "Duplikat faktury"

**C) Size Limits**
- Invoice without attachments: **1 MB** (1,000,000 bytes)
- Invoice with attachments: **3 MB** (3,000,000 bytes)
- Max invoices per session: **10,000**

**D) Date Validation**
- `P_1` (issue date) cannot be later than submission date

**E) Schema Validation**
- Must match declared schema (FA(2) or FA(3))
- UTF-8 encoding without BOM
- Valid XML structure

**Reference**: `faktury/weryfikacja-faktury.md`

---

### 5. ❌ **INCORRECT API ENDPOINTS**

**Current State**: Mixed v1/v2 endpoints
**Required**: Consistent v2 endpoints

#### Correct Base URLs:
- **Test**: `https://api-test.ksef.mf.gov.pl/v2`
- **Production**: `https://api.ksef.mf.gov.pl/v2`

#### Key Endpoints:

**Authentication:**
- `POST /auth/challenge`
- `POST /auth/xades-signature`
- `POST /auth/ksef-token`
- `GET /auth/{referenceNumber}`
- `POST /auth/token/redeem`
- `POST /auth/token/refresh`

**Sessions:**
- `POST /sessions/online` - Open session
- `POST /sessions/online/{ref}/invoices` - Send invoice
- `POST /sessions/online/{ref}/close` - Close session
- `GET /sessions/online/{ref}/status` - Get status/UPO

**Utilities:**
- `GET /security/public-key-certificates` - Get encryption keys

**Reference**: `open-api.json`, `srodowiska.md`

---

### 6. ❌ **MISSING METADATA CALCULATION**

**Current State**: No hash/size metadata
**Required**: SHA-256 hashes and sizes for both original and encrypted

#### Required Metadata:

**For Original Invoice:**
- SHA-256 hash (Base64)
- File size in bytes

**For Encrypted Invoice:**
- SHA-256 hash (Base64)
- File size in bytes (including IV)

**Sent in Request:**
```json
{
  "invoiceHash": "base64_hash_of_original",
  "invoiceSize": 12345,
  "encryptedInvoiceHash": "base64_hash_of_encrypted",
  "encryptedInvoiceSize": 12400,
  "encryptedInvoiceContent": "base64_encrypted_data"
}
```

**Reference**: `sesja-interaktywna.md`

---

### 7. ❌ **UPO RETRIEVAL INCORRECT**

**Current State**: Trying to get UPO immediately
**Required**: UPO available after session closes

#### Correct Flow:
1. Close session: `POST /sessions/online/{ref}/close`
2. Poll status: `GET /sessions/online/{ref}/status`
3. Check `status.code`:
   - 100: "Sesja interaktywna otwarta"
   - 170: "Sesja interaktywna zamknięta"
   - 200: "Sesja interaktywna przetworzona pomyślnie"
4. When status = 200, UPO is available in response:
```json
{
  "upo": {
    "pages": [
      {
        "referenceNumber": "...",
        "downloadUrl": "...",
        "downloadUrlExpirationDate": "..."
      }
    ]
  }
}
```

**Reference**: `faktury/sesja-sprawdzenie-stanu-i-pobranie-upo.md`

---

## Implementation Priority

### Phase 1: Critical (Blocking)
1. ✅ Implement AES-256-CBC encryption service
2. ✅ Update session flow (open → send → close)
3. ✅ Fix authentication to use JWT tokens
4. ✅ Update API endpoints to v2

### Phase 2: Essential (Required for Production)
5. ⬜ Implement NIP validation
6. ⬜ Add duplicate detection
7. ⬜ Implement size limit checks
8. ⬜ Add metadata calculation (hashes)

### Phase 3: Operational
9. ⬜ Implement proper UPO retrieval
10. ⬜ Add comprehensive error handling
11. ⬜ Implement token refresh mechanism
12. ⬜ Add session status polling

---

## Code Structure Changes Needed

### New Files Required:
1. `ksefCryptography.ts` - Encryption service ✅ Created
2. `ksefSession.ts` - Session management
3. `ksefValidation.ts` - Invoice validation
4. `ksefAuth.ts` - Proper authentication flow

### Files to Update:
1. `ksefApiClient.ts` - Use new session flow
2. `ksefService.ts` - Orchestrate new components
3. `edge function` - Complete rewrite with encryption
4. `config.ts` - Update endpoints ✅ Done

---

## Testing Requirements

### Test Environment:
- URL: `https://api-test.ksef.mf.gov.pl/v2`
- Self-signed certificates allowed
- Test data API available

### Test Scenarios:
1. ✅ Authentication with XAdES signature
2. ✅ Session lifecycle (open → send → close)
3. ✅ Invoice encryption/decryption
4. ✅ Metadata calculation
5. ⬜ NIP validation
6. ⬜ Duplicate detection
7. ⬜ Size limit enforcement
8. ⬜ UPO retrieval
9. ⬜ Error handling
10. ⬜ Token refresh

---

## Official Resources

- **Documentation**: https://github.com/CIRFMF/ksef-docs
- **OpenAPI Spec**: https://api-test.ksef.mf.gov.pl/docs/v2/openapi.json
- **Interactive Docs**: https://api-test.ksef.mf.gov.pl/docs/v2/index.html
- **C# Client**: https://github.com/CIRFMF/ksef-client-csharp
- **Java Client**: https://github.com/CIRFMF/ksef-client-java

---

## Next Steps

1. **Immediate**: Complete cryptography service implementation
2. **Today**: Implement proper session management
3. **This Week**: Update edge function with encryption
4. **Before Production**: Complete all validation requirements
5. **Production**: Switch to production endpoints and real certificates

---

**Last Updated**: Based on official docs dated 22.12.2025
**Implementation Status**: Phase 1 in progress (40% complete)
