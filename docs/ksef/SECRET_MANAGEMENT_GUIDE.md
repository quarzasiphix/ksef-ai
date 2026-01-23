# KSeF Secret Management Guide

**Complete guide for secure KSeF credential management with Supabase Vault**

---

## 🎯 **Overview**

The KSeF secret management system provides secure storage and retrieval of KSeF authentication tokens using Supabase Vault. This ensures:

- **Encrypted storage** - Secrets encrypted at rest
- **Access control** - Only authorized users/services can access
- **Audit trail** - All secret access is logged
- **Token caching** - Minimize vault queries
- **Credential rotation** - Seamless token updates

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────┐
│  Application Layer                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │  KsefContextManager                               │ │
│  │  - Token cache (55 min TTL)                       │ │
│  │  - Automatic refresh                              │ │
│  └───────────────────────────────────────────────────┘ │
│                         │                               │
│                         ▼                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │  KsefSecretManager                                │ │
│  │  - Cache layer (5 min TTL)                        │ │
│  │  - Vault integration                              │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Database Layer                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Supabase Vault (vault.secrets)                   │ │
│  │  - Encrypted storage                              │ │
│  │  - Access via RPC functions                       │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ksef_credentials table                           │ │
│  │  - Metadata only (no secrets)                     │ │
│  │  - References to vault secrets                    │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 **Prerequisites**

### **1. Enable Supabase Vault Extension**

```sql
-- Run as super admin
CREATE EXTENSION IF NOT EXISTS vault;
```

### **2. Verify Migrations Applied**

```bash
# Check if migrations are applied
psql -d your_database -c "SELECT * FROM ksef_credentials LIMIT 1;"
psql -d your_database -c "SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE 'get_ksef%';"
```

Expected functions:
- `get_ksef_secret`
- `store_ksef_secret`
- `rotate_ksef_credentials`
- `check_ksef_credential_expiry`
- `get_provider_credentials_for_integration`

---

## 🚀 **Setup Instructions**

### **Step 1: Store Tovernet KSeF Token in Vault**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Store the secret (super admin or service role only)
await supabase.rpc('store_ksef_secret', {
  secret_name: 'ksef_tovernet_token',
  secret_value: 'YOUR_ACTUAL_KSEF_TOKEN_HERE'
});
```

**Alternative: Direct SQL**

```sql
-- As super admin
SELECT store_ksef_secret(
  'ksef_tovernet_token',
  'YOUR_ACTUAL_KSEF_TOKEN_HERE'
);
```

### **Step 2: Update Tovernet Credentials Record**

```sql
-- Update the placeholder credential with actual Tovernet NIP
UPDATE ksef_credentials
SET 
  provider_nip = '1234567890',  -- Your actual Tovernet NIP
  is_active = true,
  issued_at = now(),
  expires_at = now() + INTERVAL '60 days',  -- Token expiry
  description = 'Tovernet KSeF production token'
WHERE secret_ref = 'ksef_tovernet_token';
```

### **Step 3: Verify Secret Storage**

```sql
-- Check credential record
SELECT 
  provider_nip,
  auth_type,
  secret_ref,
  is_active,
  expires_at
FROM ksef_credentials
WHERE is_active = true;

-- Test secret retrieval (super admin only)
SELECT get_ksef_secret('ksef_tovernet_token');
```

### **Step 4: Initialize Context Manager**

```typescript
import { KsefContextManager } from '@/shared/services/ksef';
import { createClient } from '@supabase/supabase-js';
import { getKsefConfig } from '@/shared/services/ksef/config';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ksefConfig = getKsefConfig('production'); // or 'test'

// Initialize with Vault enabled (default)
const contextManager = new KsefContextManager(
  ksefConfig,
  supabase,
  true  // useVault = true
);

// Test it works
const client = await contextManager.forCompany(businessProfileId);
const result = await client.testConnection();
console.log('Connection test:', result);
```

---

## 🔐 **Security Best Practices**

### **1. Access Control**

**Who can access secrets:**
- ✅ Super admins (via `auth.users.is_super_admin = true`)
- ✅ Service role (backend services)
- ❌ Regular users (cannot access vault directly)

**How users get KSeF access:**
- Users access KSeF through `KsefContextManager`
- Context manager retrieves secrets on their behalf
- Secrets never exposed to client-side

### **2. Token Rotation**

```typescript
// Rotate credentials when token expires or is compromised
await supabase.rpc('rotate_ksef_credentials', {
  p_provider_nip: '1234567890',
  p_new_secret_ref: 'ksef_tovernet_token_v2',
  p_new_secret_value: 'NEW_TOKEN_HERE'
});

// Clear cache after rotation
contextManager.clearTokenCache('1234567890');
```

### **3. Monitor Credential Expiry**

```sql
-- Check which credentials are expiring soon
SELECT * FROM ksef_credential_status;

-- Or use the function
SELECT * FROM check_ksef_credential_expiry();
```

**Expected output:**
```
credential_id | provider_nip | expires_at | days_until_expiry | status
--------------+--------------+------------+-------------------+--------------
uuid-here     | 1234567890   | 2026-03-15 | 45                | valid
```

### **4. Audit Trail**

All secret access is logged in `ksef_audit_log`:

```sql
-- View recent secret access
SELECT 
  operation,
  taxpayer_nip,
  provider_nip,
  response_status,
  created_at
FROM ksef_audit_log
WHERE operation LIKE '%secret%'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 💻 **Usage Examples**

### **Example 1: Basic Usage**

```typescript
import { KsefContextManager } from '@/shared/services/ksef';

// Initialize once (e.g., in app startup)
const contextManager = new KsefContextManager(config, supabase);

// Use for specific company
const client = await contextManager.forCompany(businessProfileId);

// All operations automatically use cached tokens
const invoices = await client.listInvoices({ from: '2026-01-01', to: '2026-01-31' });
```

### **Example 2: Manual Secret Retrieval (Admin Only)**

```typescript
import { KsefSecretManager } from '@/shared/services/ksef';

const secretManager = new KsefSecretManager(supabase);

// Retrieve secret (requires super admin or service role)
const token = await secretManager.getSecret('ksef_tovernet_token');

// Use the token
console.log('Token retrieved:', token.substring(0, 10) + '...');
```

### **Example 3: Credential Rotation**

```typescript
// 1. Generate new token from KSeF portal
const newToken = 'NEW_TOKEN_FROM_KSEF_PORTAL';

// 2. Rotate credentials
await supabase.rpc('rotate_ksef_credentials', {
  p_provider_nip: '1234567890',
  p_new_secret_ref: 'ksef_tovernet_token_v2',
  p_new_secret_value: newToken
});

// 3. Clear caches
contextManager.clearTokenCache('1234567890');

// 4. Verify new token works
const client = await contextManager.forCompany(businessProfileId);
const result = await client.testConnection();
console.log('New token status:', result.success ? '✅' : '❌');
```

### **Example 4: Monitoring Dashboard**

```typescript
// Get credential status for dashboard
const { data: credentials } = await supabase
  .from('ksef_credential_status')
  .select('*');

credentials.forEach(cred => {
  console.log(`Provider: ${cred.provider_nip}`);
  console.log(`Status: ${cred.expiry_status}`);
  console.log(`Days until expiry: ${cred.days_until_expiry}`);
  console.log(`Active integrations: ${cred.active_integrations_count}`);
  console.log('---');
});
```

---

## 🔧 **Troubleshooting**

### **Issue: "Vault extension not available"**

**Solution:**
```sql
-- Enable vault extension
CREATE EXTENSION IF NOT EXISTS vault;

-- Verify it's enabled
SELECT * FROM pg_extension WHERE extname = 'vault';
```

### **Issue: "Unauthorized: Only super admins can access KSeF secrets"**

**Cause:** User trying to access vault directly

**Solution:** Use `KsefContextManager` instead:
```typescript
// ❌ Don't do this (requires super admin)
const token = await supabase.rpc('get_ksef_secret', { secret_name: 'ksef_tovernet_token' });

// ✅ Do this (works for regular users)
const client = await contextManager.forCompany(businessProfileId);
```

### **Issue: "Secret not found: ksef_tovernet_token"**

**Solution:**
```sql
-- Check if secret exists in vault
SELECT name FROM vault.secrets WHERE name = 'ksef_tovernet_token';

-- If not, store it
SELECT store_ksef_secret('ksef_tovernet_token', 'YOUR_TOKEN');
```

### **Issue: Token expired errors**

**Solution:**
```sql
-- Check credential expiry
SELECT * FROM check_ksef_credential_expiry();

-- If expired, rotate credentials
SELECT rotate_ksef_credentials(
  '1234567890',
  'ksef_tovernet_token_new',
  'NEW_TOKEN_HERE'
);
```

### **Issue: Cache not clearing**

**Solution:**
```typescript
// Clear all caches
contextManager.clearTokenCache();

// Or clear specific provider
contextManager.clearTokenCache('1234567890');
```

---

## 📊 **Performance Considerations**

### **Caching Strategy**

1. **Secret Manager Cache** - 5 minutes
   - Reduces vault queries
   - Automatic invalidation

2. **Token Cache** - 55 minutes
   - Reduces secret manager queries
   - Expires before KSeF token (60 min)

3. **Cache Invalidation**
   - Manual: `clearTokenCache()`
   - Automatic: On expiry
   - On rotation: Must clear manually

### **Best Practices**

```typescript
// ✅ Good: Reuse context manager
const contextManager = new KsefContextManager(config, supabase);
const client1 = await contextManager.forCompany(company1Id);
const client2 = await contextManager.forCompany(company2Id);
// Both use cached tokens

// ❌ Bad: Create new manager each time
const client1 = await new KsefContextManager(config, supabase).forCompany(company1Id);
const client2 = await new KsefContextManager(config, supabase).forCompany(company2Id);
// No cache benefit
```

---

## 🔄 **Credential Rotation Schedule**

### **Recommended Schedule**

| Event | Action | Frequency |
|-------|--------|-----------|
| Normal rotation | Rotate token | Every 30 days |
| Expiry check | Monitor dashboard | Daily |
| Security audit | Review access logs | Weekly |
| Emergency rotation | Immediate rotation | On compromise |

### **Rotation Checklist**

- [ ] Generate new token in KSeF portal
- [ ] Test new token in test environment
- [ ] Run `rotate_ksef_credentials` function
- [ ] Clear all caches
- [ ] Verify all integrations still work
- [ ] Update monitoring alerts
- [ ] Document rotation in audit log

---

## 📚 **Related Documentation**

- [Context Switching Architecture](./CONTEXT_SWITCHING_ARCHITECTURE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [KSeF Official Documentation](../../../ksef-docs/)

---

## ✅ **Verification Checklist**

Before going to production:

- [ ] Vault extension enabled
- [ ] Migrations applied successfully
- [ ] Tovernet token stored in vault
- [ ] Credential record updated with real NIP
- [ ] Secret retrieval tested
- [ ] Context manager initialized successfully
- [ ] Test connection passes
- [ ] Audit logging working
- [ ] Expiry monitoring configured
- [ ] Rotation procedure documented
- [ ] Emergency contacts identified

---

**Status**: ✅ **Production-Ready**  
**Last Updated**: January 23, 2026  
**Version**: 1.0.0
