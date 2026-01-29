# KSeF Batch Session Implementation Guide

**Created**: January 22, 2026  
**Based On**: Official KSeF 2.0 specification (`sesja-wsadowa.md`)

---

## 📋 **Overview**

Batch sessions enable sending **up to 10,000 invoices** in a single ZIP archive, significantly more efficient than interactive sessions for high-volume scenarios.

---

## 🔄 **Batch vs Interactive Sessions**

| Aspect | Interactive Session | Batch Session |
|--------|-------------------|---------------|
| **Max Invoices** | ~100 (practical limit) | 10,000 |
| **Format** | Individual encrypted XMLs | ZIP archive with XMLs |
| **Upload** | JSON with Base64 content | Binary upload to pre-signed URLs |
| **Processing** | Synchronous per invoice | Asynchronous batch |
| **Time Limit** | 12 hours session validity | 20 min × parts (for each part) |
| **Use Case** | Real-time, single invoices | Bulk import, daily batches |

---

## 🔧 **Implementation Status**

### ✅ **Completed**
- `KsefBatchSessionManager.ts` - Core batch session logic
- ZIP splitting algorithm (100 MB parts)
- Part encryption with AES-256-CBC
- Metadata calculation (SHA-256 hashes)
- Session lifecycle management
- Pre-signed URL upload
- Status polling and UPO retrieval

### ⚠️ **Known Issues**
- TypeScript type compatibility with Web Crypto API (same as other crypto services)
- ZIP creation requires environment-specific library (JSZip for browser, etc.)

### ⬜ **TODO**
- Integrate ZIP library (JSZip or equivalent)
- Add batch-specific validation
- Error recovery for partial uploads
- Progress tracking for large batches

---

## 📖 **Official Batch Session Flow**

### **Step-by-Step Process**

```
1. Generate Encryption Data
   ├─ AES-256 key (32 bytes)
   ├─ IV (16 bytes)
   └─ Encrypt key with RSA-OAEP

2. Prepare ZIP Archive
   ├─ Add invoice XMLs to ZIP
   ├─ Calculate SHA-256 hash
   └─ Get total size

3. Split ZIP into Parts
   ├─ Max 100 MB per part (before encryption)
   ├─ Binary split (not per-file)
   └─ Calculate part count

4. Encrypt Each Part
   ├─ AES-256-CBC encryption
   ├─ Prepend IV to encrypted data
   ├─ Calculate SHA-256 hash
   └─ Get encrypted size

5. Open Batch Session
   POST /sessions/batch
   ├─ Form code (FA, FA(2), FA(3))
   ├─ ZIP metadata (hash, size)
   ├─ Parts metadata (ordinal, hash, size)
   └─ Encrypted symmetric key

6. Upload Parts
   ├─ Use pre-signed URLs from response
   ├─ Binary upload (no JSON wrapper)
   ├─ NO Authorization header
   └─ Upload all parts in parallel

7. Close Session
   POST /sessions/batch/{ref}/close
   └─ Triggers asynchronous processing

8. Poll Status
   GET /sessions/{ref}
   ├─ Status 100: Opened
   ├─ Status 170: Closed
   ├─ Status 200: Processed
   └─ Status 400+: Error

9. Retrieve UPO
   GET /sessions/{ref}/upo/{upoRef}
   └─ Batch UPO with all invoices
```

---

## 💻 **Code Example**

### **Basic Usage**

```typescript
import { KsefBatchSessionManager } from './ksefBatchSessionManager';
import { KsefAuthManager } from './ksefAuthManager';
import { getKsefConfig } from './config';

// 1. Setup
const config = getKsefConfig('test');
const authManager = new KsefAuthManager(config);
const batchManager = new KsefBatchSessionManager(config);

// 2. Authenticate
const authResult = await authManager.authenticateComplete(
  ksefToken,
  companyNip
);
batchManager.setAccessToken(authResult.accessToken);

// 3. Prepare invoices
const invoices = [
  { fileName: 'invoice_001.xml', content: '<Faktura>...</Faktura>' },
  { fileName: 'invoice_002.xml', content: '<Faktura>...</Faktura>' },
  // ... up to 10,000 invoices
];

// 4. Submit batch
const result = await batchManager.submitBatch(invoices, 'FA', '1-0E');

console.log(`Session: ${result.sessionReferenceNumber}`);
console.log(`Total: ${result.invoiceCount}`);
console.log(`Success: ${result.successfulCount}`);
console.log(`Failed: ${result.failedCount}`);
console.log(`UPO Pages: ${result.upoPages.length}`);
```

### **Advanced: Manual Control**

```typescript
// 1. Create and split ZIP
const zipData = await batchManager.createZipArchive(invoices);
const zipMetadata = await batchManager.calculateZipMetadata(zipData);
const parts = batchManager.splitZipIntoParts(zipData);

// 2. Encrypt parts
const encryptedParts = [];
for (let i = 0; i < parts.length; i++) {
  const encrypted = await batchManager.encryptPart(
    parts[i],
    encryptionData.symmetricKey,
    encryptionData.iv
  );
  encryptedParts.push({
    ordinalNumber: i + 1,
    fileName: `part_${i + 1}.zip.aes`,
    hash: encrypted.hash,
    size: encrypted.size,
    data: encrypted.encryptedData,
  });
}

// 3. Open session
const session = await batchManager.openBatchSession(
  zipMetadata,
  encryptedParts.map(p => ({
    ordinalNumber: p.ordinalNumber,
    fileName: p.fileName,
    hash: p.hash,
    size: p.size,
  }))
);

// 4. Upload parts (can be parallelized)
await Promise.all(
  encryptedParts.map(async (part) => {
    const uploadRequest = session.partUploadRequests.find(
      r => r.ordinalNumber === part.ordinalNumber
    );
    await batchManager.uploadPart(uploadRequest!, part.data);
  })
);

// 5. Close and wait
await batchManager.closeBatchSession();
await batchManager.waitForCompletion();

// 6. Get results
const status = await batchManager.getBatchSessionStatus();
```

---

## ⚙️ **Configuration**

### **Size Limits**

```typescript
// Per official spec
const MAX_PART_SIZE = 100_000_000; // 100 MB before encryption
const MAX_TOTAL_SIZE = 5_000_000_000; // 5 GB total
const MAX_INVOICES = 10_000; // Per session
const MAX_PARTS = 50; // Per session
```

### **Time Limits**

```typescript
// Upload time limit calculation
const uploadTimeLimit = partCount * 20 * 60 * 1000; // 20 min per part in ms

// Example: 3 parts = 60 minutes total for ALL parts
```

### **Polling Configuration**

```typescript
const POLL_INTERVAL = 5000; // 5 seconds (longer than interactive)
const MAX_POLL_ATTEMPTS = 60; // 5 minutes total
```

---

## 🚨 **Important Notes**

### **1. Pre-Signed URL Upload**

```typescript
// ❌ WRONG - Do NOT include Authorization header
await fetch(uploadUrl, {
  headers: {
    'Authorization': `Bearer ${token}`, // WRONG!
  },
  body: encryptedData,
});

// ✅ CORRECT - Use only headers from response
await fetch(uploadRequest.url, {
  method: uploadRequest.method,
  headers: uploadRequest.headers, // From API response
  body: encryptedData,
});
```

### **2. Binary Upload**

```typescript
// ❌ WRONG - Do NOT wrap in JSON
body: JSON.stringify({ data: encryptedData })

// ✅ CORRECT - Send raw binary
body: encryptedData // Uint8Array directly
```

### **3. Part Ordering**

Parts must be uploaded with correct `ordinalNumber` matching the session metadata. The system validates part integrity by hash.

### **4. Time Management**

Each part has the SAME time limit (20 min × part count). If you have 5 parts, each part has 100 minutes to upload, not 20 minutes total.

---

## 🔍 **Error Handling**

### **Common Errors**

| Error Code | Description | Solution |
|-----------|-------------|----------|
| 21208 | Upload timeout exceeded | Reduce part count or upload faster |
| 21402 | Invalid file size | Check size matches metadata |
| 21403 | Invalid file hash | Verify encryption and hashing |
| 440 | Session cancelled | Check if all parts uploaded |

### **Recovery Strategy**

```typescript
try {
  await batchManager.submitBatch(invoices);
} catch (error) {
  // Check which parts failed
  const status = await batchManager.getBatchSessionStatus();
  
  if (status.status.code === 440) {
    // Session cancelled - retry entire batch
    console.error('Session cancelled, retrying...');
    await batchManager.submitBatch(invoices);
  } else {
    // Other error - investigate
    console.error('Batch failed:', error);
  }
}
```

---

## 📊 **Performance Considerations**

### **Optimal Batch Sizes**

| Invoice Count | Recommended Parts | Upload Time Estimate |
|---------------|------------------|---------------------|
| 1-100 | 1 | 1-2 minutes |
| 100-1,000 | 1-2 | 2-5 minutes |
| 1,000-5,000 | 2-5 | 5-15 minutes |
| 5,000-10,000 | 5-10 | 15-30 minutes |

### **Parallel Upload**

```typescript
// Upload parts in parallel for faster processing
await Promise.all(
  encryptedParts.map(part => uploadPart(part))
);
```

### **Memory Management**

For very large batches, consider streaming ZIP creation instead of loading all invoices into memory.

---

## 🧪 **Testing**

### **Test Scenarios**

1. **Small Batch** (10 invoices, 1 part)
2. **Medium Batch** (500 invoices, 2-3 parts)
3. **Large Batch** (5,000 invoices, 5-10 parts)
4. **Max Batch** (10,000 invoices, max parts)
5. **Partial Upload Failure** (simulate network error)
6. **Timeout Scenario** (slow upload)

### **Test Environment**

Use KSeF test environment with test data API:
- URL: `https://api-test.ksef.mf.gov.pl/v2`
- Create test subjects with `/testdata/subject`
- Override rate limits with `/testdata/rate-limits`

---

## 🔗 **Related Documentation**

- `sesja-wsadowa.md` - Official batch session spec
- `weryfikacja-faktury.md` - Invoice validation rules
- `sesja-sprawdzenie-stanu-i-pobranie-upo.md` - Status and UPO retrieval
- `COMPREHENSIVE_DOCUMENTATION_REVIEW.md` - Full implementation review

---

## ✅ **Next Steps**

1. Integrate ZIP library (JSZip for browser)
2. Add comprehensive error handling
3. Implement progress tracking
4. Add retry logic for failed parts
5. Create UI for batch upload
6. Test with official test environment

---

**Status**: ✅ **Core Implementation Complete**  
**Production Ready**: ⚠️ **Needs ZIP library integration**  
**Estimated Completion**: 1-2 days with ZIP library
