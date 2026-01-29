# How to Get KSeF Test Token

**Updated**: January 23, 2026  
**Environment**: KSeF Test (api-test.ksef.mf.gov.pl)

---

## 🎯 **Quick Answer**

To test the KSeF integration, you need a **KSeF Token** from the test environment. Here's how to get one:

---

## 📋 **Prerequisites**

1. **Test NIP** - Polish tax ID for testing
2. **KSeF Test Account** - Register at test portal
3. **Access to KSeF Test Portal** - https://ksef-test.mf.gov.pl

---

## 🔧 **Method 1: Generate Token via KSeF Test Portal** (Easiest)

### **Step 1: Register Test Account**
1. Go to https://ksef-test.mf.gov.pl
2. Click "Rejestracja" (Register)
3. Fill in test data:
   - NIP: Use test NIP (e.g., `1234567890`)
   - Email: Your email
   - Password: Choose strong password

### **Step 2: Login to Portal**
1. Login with your credentials
2. Navigate to "Ustawienia" (Settings)
3. Go to "Tokeny" (Tokens) section

### **Step 3: Generate Token**
1. Click "Wygeneruj nowy token" (Generate new token)
2. Fill in token details:
   - **Description**: "Test token for development"
   - **Validity**: 30 days (maximum for test)
   - **Permissions**: Select all needed permissions
3. Click "Generuj" (Generate)
4. **IMPORTANT**: Copy the token immediately - it's shown only once!

### **Step 4: Use Token in Your App**
```typescript
const ksefToken = "your-generated-token-here";

// Use with AuthCoordinator
const tokens = await authCoordinator.authenticateWithKsefToken(
  'nip',
  '1234567890',
  ksefToken,
  'ecdsa'
);
```

---

## 🔧 **Method 2: Generate Token via API** (Advanced)

### **Prerequisites**
- Test certificate (qualified or test certificate)
- Private key for certificate
- XAdES signature capability

### **Step 1: Authenticate with Certificate**
```typescript
import { KsefAuthCoordinator } from '@/shared/services/ksef/ksefAuthCoordinator';

const authCoordinator = new KsefAuthCoordinator(
  'https://api-test.ksef.mf.gov.pl/v2',
  supabase
);

// Authenticate with XAdES signature
const tokens = await authCoordinator.authenticateWithXAdES(
  'nip',
  '1234567890',
  'onip',
  async (unsignedXml) => {
    // Sign XML with your certificate
    return await signXmlWithXAdES(unsignedXml, certificate, privateKey);
  }
);
```

### **Step 2: Generate KSeF Token**
```typescript
// Use access token to generate KSeF token
const response = await fetch(
  'https://api-test.ksef.mf.gov.pl/v2/token/generate',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.accessToken.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: 'Test token for development',
      validityDays: 30,
      permissions: ['invoice_send', 'invoice_read']
    })
  }
);

const tokenData = await response.json();
const ksefToken = tokenData.token;
```

---

## 🧪 **Method 3: Use Demo/Test Tokens** (For Quick Testing)

### **Official Test Tokens**
KSeF provides test tokens for development. Check the official documentation:
- https://github.com/CIRFMF/ksef-docs

### **Example Test Data**
```typescript
// Test NIP
const testNip = '1234567890';

// Test environment
const testBaseUrl = 'https://api-test.ksef.mf.gov.pl/v2';

// Note: You still need to generate your own token
// There are no publicly shared test tokens for security reasons
```

---

## 📊 **Token Types Comparison**

| Method | Difficulty | Duration | Use Case |
|--------|-----------|----------|----------|
| **Portal Generation** | ⭐ Easy | 5 minutes | Quick testing, development |
| **API Generation** | ⭐⭐⭐ Hard | 30 minutes | Production setup, automation |
| **Certificate Auth** | ⭐⭐⭐⭐ Very Hard | 1-2 hours | Production, qualified certificates |

---

## 🔐 **Token Security**

### **Best Practices**
1. **Never commit tokens** to git repositories
2. **Use environment variables** for tokens
3. **Rotate tokens regularly** (every 30 days)
4. **Limit token permissions** to minimum required
5. **Monitor token usage** in KSeF portal

### **Environment Variables**
```bash
# .env.local
KSEF_TEST_TOKEN=your-test-token-here
KSEF_TEST_NIP=1234567890
KSEF_ENVIRONMENT=test
```

### **Usage in Code**
```typescript
const ksefToken = process.env.KSEF_TEST_TOKEN;
const testNip = process.env.KSEF_TEST_NIP;

if (!ksefToken || !testNip) {
  throw new Error('KSeF credentials not configured');
}
```

---

## 🧪 **Testing Your Token**

### **Quick Test**
```typescript
import { KsefAuthCoordinator } from '@/shared/services/ksef/ksefAuthCoordinator';
import { supabase } from '@/integrations/supabase/client';

async function testKsefToken() {
  const authCoordinator = new KsefAuthCoordinator(
    'https://api-test.ksef.mf.gov.pl/v2',
    supabase
  );

  try {
    const tokens = await authCoordinator.authenticateWithKsefToken(
      'nip',
      process.env.KSEF_TEST_NIP!,
      process.env.KSEF_TEST_TOKEN!,
      'ecdsa'
    );

    console.log('✅ Token is valid!');
    console.log('Access token expires in:', tokens.accessToken.expiresIn, 'seconds');
    console.log('Refresh token expires in:', tokens.refreshToken.expiresIn, 'seconds');

    return true;
  } catch (error) {
    console.error('❌ Token test failed:', error);
    return false;
  }
}

// Run test
testKsefToken();
```

---

## 🚨 **Troubleshooting**

### **Error: "Invalid token"**
- Token may have expired
- Token may be for wrong environment (test vs production)
- Generate new token from portal

### **Error: "Invalid NIP"**
- NIP must be exactly 10 digits
- NIP must match the one used to generate token
- Use test NIP from your test account

### **Error: "Authentication failed"**
- Check if token is active in portal
- Verify token permissions
- Check if token hasn't been revoked

### **Error: "Challenge validation failed"**
- Encryption method mismatch
- Use 'ecdsa' (recommended) or 'rsa'
- Check timestamp is current

---

## 📚 **Additional Resources**

### **Official Documentation**
- KSeF API Docs: https://api-test.ksef.mf.gov.pl/docs/v2
- KSeF GitHub: https://github.com/CIRFMF/ksef-docs
- Test Portal: https://ksef-test.mf.gov.pl

### **Our Implementation**
- AuthCoordinator: `src/shared/services/ksef/ksefAuthCoordinator.ts`
- Usage Examples: `docs/ksef/OFFICIAL_KSEF_CLIENTS_ANALYSIS.md`
- Integration Guide: `docs/ksef/INTEGRATION_GUIDE.md`

---

## ✅ **Quick Start Checklist**

- [ ] Register test account at https://ksef-test.mf.gov.pl
- [ ] Generate KSeF token from portal
- [ ] Save token to `.env.local`
- [ ] Test token with our test function
- [ ] Start using KSeF features in app

---

**Status**: ✅ **READY TO TEST**  
**Next**: Generate your test token and start testing!

---

*Last Updated: January 23, 2026*
