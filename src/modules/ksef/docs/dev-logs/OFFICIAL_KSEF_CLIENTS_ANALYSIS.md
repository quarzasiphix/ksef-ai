# Official KSeF Clients - Comprehensive Analysis

**Analysis Date**: January 23, 2026  
**Sources**: Java Client, C# Client, PDF Generator (Official CIRFMF repositories)

---

## 🎯 **Executive Summary**

After thorough analysis of official KSeF client implementations (Java & C#), I've identified **critical patterns and best practices** that we must implement in our TypeScript/React application.

### **Key Findings**:
1. ✅ **Two-Phase Authentication** - Challenge → Encrypt → Submit → Poll → Redeem
2. ✅ **Dual Encryption Methods** - RSA-OAEP-SHA256 **AND** ECDSA (newer, preferred)
3. ✅ **AuthCoordinator Pattern** - High-level orchestration service
4. ✅ **Token Format** - `{token}|{timestampMs}` before encryption
5. ✅ **Polling Mechanism** - 1-second intervals with 2-minute timeout
6. ✅ **Builder Pattern** - Fluent API for request construction
7. ✅ **Certificate Fetching** - Dynamic public key retrieval from KSeF API

---

## 📚 **Table of Contents**

1. [Project Structures](#project-structures)
2. [Authentication Flow Deep Dive](#authentication-flow-deep-dive)
3. [Encryption Methods Comparison](#encryption-methods-comparison)
4. [Session Management Patterns](#session-management-patterns)
5. [Key Architectural Patterns](#key-architectural-patterns)
6. [Critical Implementation Details](#critical-implementation-details)
7. [What We're Missing](#what-were-missing)
8. [Implementation Roadmap](#implementation-roadmap)

---

## 1️⃣ **Project Structures**

### **Java Client Structure**
```
ksef-client-java/
├── ksef-client/              # SDK Library
│   ├── api/
│   │   ├── builders/         # Request builders (Auth, Sessions, etc.)
│   │   └── services/         # Business services
│   │       ├── DefaultCryptographyService.java
│   │       └── DefaultKsefClient.java
│   └── client/
│       ├── interfaces/       # IKSeFClient, ICryptographyService
│       └── model/            # Data models
│           ├── auth/
│           ├── session/
│           └── certificate/
└── demo-web-app/             # Spring Boot demo
    ├── api/                  # REST controllers
    └── integrationTest/      # E2E tests
```

**Technology**: Java 11+, Spring Boot 3.5.7, java.net.http.HttpClient

### **C# Client Structure**
```
ksef-client-csharp/
├── KSeF.Client/              # Main library
│   ├── Api/
│   │   ├── Builders/         # Fluent builders
│   │   │   └── Auth/
│   │   │       ├── AuthKsefTokenBuilder.cs
│   │   │       └── AuthTokenRequestBuilder.cs
│   │   └── Services/
│   │       ├── AuthCoordinator.cs      # ⭐ KEY SERVICE
│   │       ├── CryptographyService.cs
│   │       └── SignatureService.cs
│   ├── Clients/
│   │   ├── AuthorizationClient.cs
│   │   └── KSeFClient.cs
│   └── DI/                   # Dependency Injection
│       └── ServiceCollectionExtensions.cs
├── KSeF.Client.Core/         # Models & Interfaces
│   ├── Interfaces/
│   │   ├── IKSeFClient.cs
│   │   ├── IAuthCoordinator.cs
│   │   └── ICryptographyService.cs
│   └── Models/
│       ├── Authorization/
│       ├── Sessions/
│       └── Certificates/
└── KSeF.DemoWebApp/          # ASP.NET demo
    └── Controllers/
        └── AuthController.cs
```

**Technology**: .NET 8/9, RestClient, Microsoft.Extensions.DependencyInjection

### **PDF Generator Structure**
```
ksef-pdf-generator/
├── src/
│   ├── types/                # TypeScript interfaces
│   ├── generators/
│   │   ├── invoice-pdf.ts
│   │   └── upo-pdf.ts
│   └── parsers/
│       ├── invoice-xml.ts
│       └── upo-xml.ts
└── examples/
    ├── invoice.xml
    └── upo.xml
```

**Technology**: TypeScript, Vite, Vitest, Node.js 22.14.0

---

## 2️⃣ **Authentication Flow Deep Dive**

### **🔥 Critical Discovery: Two Authentication Methods**

Both Java and C# clients implement **TWO distinct authentication flows**:

#### **Method 1: KSeF Token Authentication** (Simpler, Recommended for Testing)
```
1. GET /auth/challenge
   ← { challenge: "abc123...", timestamp: 1234567890 }

2. Encrypt token
   tokenWithTimestamp = "{ksefToken}|{timestampMs}"
   encryptedToken = RSA-OAEP-SHA256(tokenWithTimestamp, ksefPublicKey)
   
3. POST /auth/ksef-token
   → {
       challenge: "abc123...",
       contextIdentifier: { type: "nip", value: "1234567890" },
       encryptedToken: "base64...",
       authorizationPolicy: { ... }
     }
   ← { referenceNumber: "ref123", authenticationToken: { token: "auth456" } }

4. Poll GET /auth/token/{referenceNumber}/status
   Authorization: Bearer {authenticationToken}
   ← { status: { code: 200, description: "Authentication success" } }

5. POST /auth/token/redeem
   Authorization: Bearer {authenticationToken}
   ← { accessToken: { token: "...", expiresIn: 3600 },
       refreshToken: { token: "...", expiresIn: 86400 } }
```

#### **Method 2: XAdES Signature Authentication** (Production, Certificate-based)
```
1. GET /auth/challenge
   ← { challenge: "abc123..." }

2. Build AuthenticationTokenRequest XML
   <AuthenticationTokenRequest>
     <Challenge>abc123...</Challenge>
     <ContextIdentifier type="nip">1234567890</ContextIdentifier>
     <SubjectIdentifierType>onip</SubjectIdentifierType>
   </AuthenticationTokenRequest>

3. Sign XML with XAdES (qualified certificate)
   signedXml = XAdESService.sign(xml, certificate, privateKey)

4. POST /auth/token/signature?verifyCertificateChain=false
   Content-Type: application/xml
   → {signedXml}
   ← { referenceNumber: "ref123", authenticationToken: { token: "auth456" } }

5. Poll & Redeem (same as Method 1, steps 4-5)
```

### **C# AuthCoordinator Implementation** (⭐ **GOLD STANDARD**)

```csharp
public async Task<AuthenticationOperationStatusResponse> AuthKsefTokenAsync(
    AuthenticationTokenContextIdentifierType contextIdentifierType,
    string contextIdentifierValue,
    string tokenKsef,
    ICryptographyService cryptographyService,
    EncryptionMethodEnum encryptionMethod = EncryptionMethodEnum.ECDsa,
    AuthenticationTokenAuthorizationPolicy authorizationPolicy = default,
    CancellationToken cancellationToken = default)
{
    // 1) Get challenge and timestamp
    AuthenticationChallengeResponse challengeResponse = await authorizationClient
        .GetAuthChallengeAsync(cancellationToken);

    string challenge = challengeResponse.Challenge;      
    long timestampMs = challengeResponse.Timestamp.ToUnixTimeMilliseconds();

    // 2) Create token|timestamp string
    string tokenWithTimestamp = $"{tokenKsef}|{timestampMs}";
    byte[] tokenBytes = Encoding.UTF8.GetBytes(tokenWithTimestamp);

    // 3) Encrypt with RSA-OAEP SHA-256 OR ECDSA
    byte[] tokenEncryptedBytes = encryptionMethod switch
    {
        EncryptionMethodEnum.Rsa => cryptographyService.EncryptKsefTokenWithRSAUsingPublicKey(tokenBytes),
        EncryptionMethodEnum.ECDsa => cryptographyService.EncryptWithECDSAUsingPublicKey(tokenBytes),
        _ => throw new ArgumentOutOfRangeException(nameof(encryptionMethod))
    };

    string encryptedToken = Convert.ToBase64String(tokenEncryptedBytes);

    // 4) Build request using fluent builder
    IAuthKsefTokenRequestBuilderWithEncryptedToken authKsefTokenRequest = AuthKsefTokenRequestBuilder
        .Create()
        .WithChallenge(challenge)
        .WithContext(contextIdentifierType, contextIdentifierValue)
        .WithEncryptedToken(encryptedToken);

    if (authorizationPolicy != null)
    {
        authKsefTokenRequest = authKsefTokenRequest.WithAuthorizationPolicy(authorizationPolicy);
    }

    // 5) Submit to KSeF
    SignatureResponse submissionResponse = await authorizationClient
        .SubmitKsefTokenAuthRequestAsync(authKsefTokenRequest.Build(), cancellationToken);

    // 6) Poll for completion (1 second intervals, 2 minute timeout)
    await WaitForAuthCompletionAsync(submissionResponse, cancellationToken);

    // 7) Redeem access token
    AuthenticationOperationStatusResponse accessTokenResponse = await authorizationClient
        .GetAccessTokenAsync(submissionResponse.AuthenticationToken.Token, cancellationToken);       

    // 8) Return tokens
    return accessTokenResponse;
}
```

### **Polling Implementation** (⭐ **CRITICAL PATTERN**)

```csharp
private async Task WaitForAuthCompletionAsync(
    SignatureResponse authOperationInfo,
    CancellationToken cancellationToken,
    TimeSpan? timeout = null)
{
    TimeSpan effectiveTimeout = timeout ?? TimeSpan.FromMinutes(2);
    DateTime startTime = DateTime.UtcNow;
    AuthStatus authStatus;

    do
    {
        authStatus = await authorizationClient.GetAuthStatusAsync(
            authOperationInfo.ReferenceNumber,
            authOperationInfo.AuthenticationToken.Token,
            cancellationToken);

        // Check for errors (4xx)
        if (authStatus.Status.Code >= 400 && authStatus.Status.Code < 500)
        {
            throw new InvalidOperationException(
                $"Auth error. Status: {authStatus.Status.Code}, " +
                $"Description: {authStatus.Status.Description}");
        }

        // Success - exit loop
        if (authStatus.Status.Code == 200) // AuthenticationSuccess
        {
            return;
        }

        // Status 100 (Processing) - wait before retry
        if (!cancellationToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
        }
    }
    while (authStatus.Status.Code != 200
        && !cancellationToken.IsCancellationRequested
        && (DateTime.UtcNow - startTime) < effectiveTimeout);

    // Timeout
    if (authStatus.Status.Code != 200)
    {
        throw new TimeoutException(
            $"Auth timeout after {effectiveTimeout.TotalSeconds}s. " +
            $"Status: {authStatus.Status.Code}");
    }
}
```

---

## 3️⃣ **Encryption Methods Comparison**

### **RSA-OAEP-SHA256** (Traditional)

**Java Implementation**:
```java
public byte[] encryptWithRSAUsingPublicKey(byte[] content) {
    PublicKey publicKey = parsePublicKeyFromCertificatePem(this.ksefTokenPem);
    Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
    cipher.init(Cipher.ENCRYPT_MODE, publicKey);
    return cipher.doFinal(content);
}
```

**C# Implementation**:
```csharp
public byte[] EncryptKsefTokenWithRSAUsingPublicKey(byte[] content)
{
    RSA rsa = RSA.Create();
    string publicKey = GetRSAPublicPem(KsefTokenPem);
    rsa.ImportFromPem(publicKey);
    return rsa.Encrypt(content, RSAEncryptionPadding.OaepSHA256);
}
```

### **ECDSA with ECDH-AES-GCM** (Modern, Preferred)

**Java Implementation**:
```java
public byte[] encryptWithECDsaUsingPublicKey(byte[] content) {
    ECPublicKey publicKey = (ECPublicKey) parsePublicKeyFromCertificatePem(this.ksefTokenPem);
    
    // Generate ephemeral key pair
    KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
    kpg.initialize(new ECGenParameterSpec("secp256r1"));
    KeyPair ephemeralKeyPair = kpg.generateKeyPair();
    
    // ECDH key agreement
    KeyAgreement keyAgreement = KeyAgreement.getInstance("ECDH");
    keyAgreement.init(ephemeralKeyPair.getPrivate());
    keyAgreement.doPhase(publicKey, true);
    byte[] sharedSecret = keyAgreement.generateSecret();
    
    // Use first 32 bytes as AES key
    SecretKey aesKey = new SecretKeySpec(sharedSecret, 0, 32, "AES");
    
    // Generate random nonce (12 bytes for GCM)
    byte[] nonce = new byte[12];
    SecureRandom random = new SecureRandom();
    random.nextBytes(nonce);
    
    // AES-GCM encryption
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    GCMParameterSpec gcmSpec = new GCMParameterSpec(128, nonce);
    cipher.init(Cipher.ENCRYPT_MODE, aesKey, gcmSpec);
    byte[] ciphertextWithTag = cipher.doFinal(content);
    
    // Combine: ephemeralPublicKey + nonce + ciphertext+tag
    byte[] ephemeralPubEncoded = ephemeralKeyPair.getPublic().getEncoded();
    ByteBuffer buffer = ByteBuffer.allocate(
        ephemeralPubEncoded.length + nonce.length + ciphertextWithTag.length);
    buffer.put(ephemeralPubEncoded);
    buffer.put(nonce);
    buffer.put(ciphertextWithTag);
    
    return buffer.array();
}
```

**C# Implementation**:
```csharp
public byte[] EncryptWithECDSAUsingPublicKey(byte[] content)
{
    // Import KSeF public key
    using ECDiffieHellman ecdhReceiver = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
    string publicKey = GetECDSAPublicPem(KsefTokenPem);
    ecdhReceiver.ImportFromPem(publicKey);

    // Generate ephemeral key pair
    using ECDiffieHellman ecdhEphemeral = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
    byte[] sharedSecret = ecdhEphemeral.DeriveKeyMaterial(ecdhReceiver.PublicKey);

    // AES-GCM encryption
    using AesGcm aes = new(sharedSecret, AesGcm.TagByteSizes.MaxSize);
    byte[] nonce = new byte[AesGcm.NonceByteSizes.MaxSize];
    RandomNumberGenerator.Fill(nonce);
    byte[] cipherText = new byte[content.Length];
    byte[] tag = new byte[AesGcm.TagByteSizes.MaxSize];
    aes.Encrypt(nonce, content, cipherText, tag);

    // Combine: ephemeralPublicKey + nonce + ciphertext + tag
    byte[] ephemeralPubEncoded = ecdhEphemeral.PublicKey.ExportSubjectPublicKeyInfo();
    byte[] result = new byte[ephemeralPubEncoded.Length + nonce.Length + cipherText.Length + tag.Length];
    Buffer.BlockCopy(ephemeralPubEncoded, 0, result, 0, ephemeralPubEncoded.Length);
    Buffer.BlockCopy(nonce, 0, result, ephemeralPubEncoded.Length, nonce.Length);
    Buffer.BlockCopy(cipherText, 0, result, ephemeralPubEncoded.Length + nonce.Length, cipherText.Length);
    Buffer.BlockCopy(tag, 0, result, ephemeralPubEncoded.Length + nonce.Length + cipherText.Length, tag.Length);
    
    return result;
}
```

**Key Differences**:
- **RSA**: Simple, widely supported, larger output (~256 bytes)
- **ECDSA**: Modern, smaller keys, better performance, preferred by KSeF 2.0

---

## 4️⃣ **Session Management Patterns**

### **Token Lifecycle**

```
┌─────────────────────────────────────────────────────────┐
│                    Token Lifecycle                       │
└─────────────────────────────────────────────────────────┘

1. Authentication
   ↓
2. Access Token (expires in 1 hour)
   ├─ Used for all API calls
   ├─ Header: Authorization: Bearer {accessToken}
   └─ Refresh before expiry
   
3. Refresh Token (expires in 24 hours)
   ├─ POST /auth/token/refresh
   ├─ Authorization: Bearer {refreshToken}
   └─ Returns new Access Token

4. Token Revocation
   └─ DELETE /token/{referenceNumber}
```

### **C# Token Management**:
```csharp
public Task<TokenInfo> RefreshAccessTokenAsync(
    string refreshToken, 
    CancellationToken cancellationToken = default)
    => authorizationClient.RefreshAccessTokenAsync(refreshToken, cancellationToken)
        .ContinueWith(t => t.Result.AccessToken, cancellationToken);
```

---

## 5️⃣ **Key Architectural Patterns**

### **1. Builder Pattern** (Fluent API)

**C# Example**:
```csharp
AuthenticationKsefTokenRequest request = AuthKsefTokenRequestBuilder
    .Create()
    .WithChallenge(challenge)
    .WithContext(AuthenticationTokenContextIdentifierType.Nip, "1234567890")
    .WithEncryptedToken(encryptedToken)
    .WithAuthorizationPolicy(new AuthenticationTokenAuthorizationPolicy
    {
        AllowedIps = new AuthenticationTokenAllowedIps
        {
            Ip4Addresses = new[] { "192.168.1.1" }
        }
    })
    .Build();
```

**Benefits**:
- Type-safe construction
- Compile-time validation
- Self-documenting code
- Prevents invalid states

### **2. Coordinator Pattern** (High-Level Orchestration)

**Purpose**: Simplify complex multi-step operations

**C# IAuthCoordinator Interface**:
```csharp
public interface IAuthCoordinator
{
    // KSeF Token authentication (simple)
    Task<AuthenticationOperationStatusResponse> AuthKsefTokenAsync(
        AuthenticationTokenContextIdentifierType contextIdentifierType,
        string contextIdentifierValue,
        string tokenKsef,
        ICryptographyService cryptographyService,
        EncryptionMethodEnum encryptionMethod = EncryptionMethodEnum.ECDsa,
        AuthenticationTokenAuthorizationPolicy authorizationPolicy = default,
        CancellationToken cancellationToken = default);

    // XAdES signature authentication (production)
    Task<AuthenticationOperationStatusResponse> AuthAsync(
        AuthenticationTokenContextIdentifierType contextIdentifierType,
        string contextIdentifierValue,
        AuthenticationTokenSubjectIdentifierTypeEnum identifierType,
        Func<string, Task<string>> xmlSigner,
        AuthenticationTokenAuthorizationPolicy authorizationPolicy = default,
        bool verifyCertificateChain = false,
        CancellationToken cancellationToken = default);

    // Token refresh
    Task<TokenInfo> RefreshAccessTokenAsync(
        string refreshToken, 
        CancellationToken cancellationToken = default);
}
```

**Usage**:
```csharp
// Instead of 7 separate API calls, just one:
var tokens = await authCoordinator.AuthKsefTokenAsync(
    AuthenticationTokenContextIdentifierType.Nip,
    "1234567890",
    "my-ksef-token",
    cryptographyService);

// Access token ready to use
string accessToken = tokens.AccessToken.Token;
```

### **3. Dependency Injection Pattern**

**C# Registration**:
```csharp
// Startup.cs or Program.cs
builder.Services.AddKSeFClient(options =>
{
    options.BaseUrl = "https://api-test.ksef.mf.gov.pl/v2";
});

builder.Services.AddCryptographyClient(
    CryptographyServiceWarmupMode.NonBlocking);

// Usage in controller/service
public class InvoiceService
{
    private readonly IKSeFClient _ksefClient;
    private readonly IAuthCoordinator _authCoordinator;
    private readonly ICryptographyService _cryptographyService;

    public InvoiceService(
        IKSeFClient ksefClient,
        IAuthCoordinator authCoordinator,
        ICryptographyService cryptographyService)
    {
        _ksefClient = ksefClient;
        _authCoordinator = authCoordinator;
        _cryptographyService = cryptographyService;
    }
}
```

### **4. Certificate Fetcher Pattern**

**C# Interface**:
```csharp
public interface ICertificateFetcher
{
    Task<ICollection<PemCertificateInfo>> FetchCertificatesAsync(
        CancellationToken cancellationToken = default);
}
```

**Implementation**:
```csharp
public class KsefCertificateFetcher : ICertificateFetcher
{
    public async Task<ICollection<PemCertificateInfo>> FetchCertificatesAsync(
        CancellationToken cancellationToken = default)
    {
        // GET /certificates/public-keys
        var response = await _httpClient.GetAsync(
            "https://api-test.ksef.mf.gov.pl/v2/certificates/public-keys",
            cancellationToken);
        
        var certificates = await response.Content.ReadAsAsync<CertificatesResponse>();
        
        return certificates.Items.Select(cert => new PemCertificateInfo
        {
            Type = cert.Type,
            Pem = cert.Certificate
        }).ToList();
    }
}
```

---

## 6️⃣ **Critical Implementation Details**

### **1. Challenge Length Validation**

**C#**:
```csharp
public static class ValidValues
{
    public const int RequiredChallengeLength = 64;
}

if (challenge.Length != ValidValues.RequiredChallengeLength)
{
    throw new ArgumentException(
        $"Challenge must be exactly {ValidValues.RequiredChallengeLength} characters");
}
```

### **2. Context Identifier Validation**

**Types**:
- `nip` - Polish tax ID (10 digits)
- `onip` - Organization NIP
- `pesel` - Personal ID (11 digits)
- `krs` - Court registration number

**C# Validation**:
```csharp
public static bool Validate(AuthenticationTokenContextIdentifier context)
{
    return context.Type switch
    {
        AuthenticationTokenContextIdentifierType.Nip => 
            Regex.IsMatch(context.Value, @"^\d{10}$"),
        AuthenticationTokenContextIdentifierType.Pesel => 
            Regex.IsMatch(context.Value, @"^\d{11}$"),
        AuthenticationTokenContextIdentifierType.Krs => 
            Regex.IsMatch(context.Value, @"^\d{10}$"),
        _ => false
    };
}
```

### **3. IP Address Policy**

**C# Model**:
```csharp
public class AuthenticationTokenAuthorizationPolicy
{
    public AuthenticationTokenIpChangePolicyEnum OnClientIpChange { get; set; }
    public AuthenticationTokenAllowedIps AllowedIps { get; set; }
}

public class AuthenticationTokenAllowedIps
{
    public string[] Ip4Addresses { get; set; }
    public string[] Ip4Ranges { get; set; }
    public string[] Ip4Masks { get; set; }
}

public enum AuthenticationTokenIpChangePolicyEnum
{
    Terminate,  // End session on IP change
    Continue    // Allow IP change
}
```

### **4. Error Handling**

**Status Codes**:
- `100` - Processing (keep polling)
- `200` - Success
- `400-499` - Client error (stop, throw exception)
- `500-599` - Server error (retry with backoff)

**C# Error Handling**:
```csharp
if (authStatus.Status.Code >= 400 && authStatus.Status.Code < 500)
{
    string details = authStatus.Status.Details != null && authStatus.Status.Details.Count > 0
        ? string.Join(", ", authStatus.Status.Details)
        : "no details";

    throw new InvalidOperationException(
        $"KSeF auth error. " +
        $"Status: {authStatus.Status.Code}, " +
        $"Description: {authStatus.Status.Description}, " +
        $"Details: {details}");
}
```

---

## 7️⃣ **What We're Missing**

### **❌ Critical Gaps in Our Implementation**

1. **AuthCoordinator Service** ❌
   - We have separate methods, not orchestrated
   - No single entry point for authentication
   - Complex for users to implement correctly

2. **ECDSA Encryption** ❌
   - We only support RSA
   - ECDSA is preferred by KSeF 2.0
   - Better performance and security

3. **Polling Mechanism** ❌
   - We don't poll for auth completion
   - Users must manually check status
   - No timeout handling

4. **Builder Pattern** ❌
   - We use plain objects
   - No compile-time validation
   - Easy to create invalid requests

5. **Certificate Fetcher** ❌
   - We hardcode public keys
   - Should fetch dynamically from API
   - No automatic updates

6. **Token Refresh Logic** ❌
   - No automatic refresh before expiry
   - No refresh token management
   - Manual implementation required

7. **Proper Error Handling** ❌
   - Basic error handling
   - No status code interpretation
   - No retry logic

8. **Context Validation** ❌
   - No NIP/PESEL/KRS validation
   - Can send invalid requests
   - Wastes API calls

---

## 8️⃣ **Implementation Roadmap**

### **Phase 1: Core Authentication (Week 1)**

#### **1.1 Create AuthCoordinator Service** ⭐ **PRIORITY 1**
```typescript
// src/shared/services/ksef/ksefAuthCoordinator.ts
export class KsefAuthCoordinator {
  constructor(
    private authClient: KsefAuthClient,
    private cryptoService: KsefCryptographyService
  ) {}

  async authenticateWithKsefToken(
    contextType: ContextIdentifierType,
    contextValue: string,
    ksefToken: string,
    encryptionMethod: 'rsa' | 'ecdsa' = 'ecdsa'
  ): Promise<AuthTokens> {
    // 1. Get challenge
    const challenge = await this.authClient.getChallenge();
    
    // 2. Encrypt token
    const tokenWithTimestamp = `${ksefToken}|${challenge.timestamp}`;
    const encrypted = encryptionMethod === 'ecdsa'
      ? await this.cryptoService.encryptWithECDSA(tokenWithTimestamp)
      : await this.cryptoService.encryptWithRSA(tokenWithTimestamp);
    
    // 3. Submit request
    const submission = await this.authClient.submitKsefToken({
      challenge: challenge.challenge,
      contextIdentifier: { type: contextType, value: contextValue },
      encryptedToken: encrypted
    });
    
    // 4. Poll for completion
    await this.pollForCompletion(
      submission.referenceNumber,
      submission.authenticationToken
    );
    
    // 5. Redeem tokens
    const tokens = await this.authClient.redeemToken(
      submission.authenticationToken
    );
    
    return tokens;
  }

  private async pollForCompletion(
    referenceNumber: string,
    authToken: string,
    timeoutMs: number = 120000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.authClient.getAuthStatus(
        referenceNumber,
        authToken
      );
      
      if (status.code === 200) {
        return; // Success
      }
      
      if (status.code >= 400 && status.code < 500) {
        throw new Error(`Auth failed: ${status.description}`);
      }
      
      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Authentication timeout');
  }
}
```

#### **1.2 Implement ECDSA Encryption** ⭐ **PRIORITY 2**
```typescript
// src/shared/services/ksef/ksefCryptographyService.ts
export class KsefCryptographyService {
  async encryptWithECDSA(content: string): Promise<string> {
    // 1. Import KSeF public key (P-256 curve)
    const ksefPublicKey = await this.getKsefPublicKey();
    
    // 2. Generate ephemeral key pair
    const ephemeralKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );
    
    // 3. Derive shared secret using ECDH
    const sharedSecret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: ksefPublicKey },
      ephemeralKeyPair.privateKey,
      256
    );
    
    // 4. Import shared secret as AES key
    const aesKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // 5. Generate random nonce (12 bytes)
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    
    // 6. Encrypt with AES-GCM
    const contentBytes = new TextEncoder().encode(content);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      aesKey,
      contentBytes
    );
    
    // 7. Export ephemeral public key
    const ephemeralPublicKey = await crypto.subtle.exportKey(
      'spki',
      ephemeralKeyPair.publicKey
    );
    
    // 8. Combine: ephemeralPubKey + nonce + ciphertext
    const result = new Uint8Array(
      ephemeralPublicKey.byteLength + nonce.length + ciphertext.byteLength
    );
    result.set(new Uint8Array(ephemeralPublicKey), 0);
    result.set(nonce, ephemeralPublicKey.byteLength);
    result.set(new Uint8Array(ciphertext), ephemeralPublicKey.byteLength + nonce.length);
    
    // 9. Return as Base64
    return btoa(String.fromCharCode(...result));
  }
}
```

#### **1.3 Create Request Builders** ⭐ **PRIORITY 3**
```typescript
// src/shared/services/ksef/builders/AuthKsefTokenRequestBuilder.ts
export class AuthKsefTokenRequestBuilder {
  private challenge?: string;
  private contextIdentifier?: ContextIdentifier;
  private encryptedToken?: string;
  private authorizationPolicy?: AuthorizationPolicy;

  static create(): AuthKsefTokenRequestBuilder {
    return new AuthKsefTokenRequestBuilder();
  }

  withChallenge(challenge: string): this {
    if (challenge.length !== 64) {
      throw new Error('Challenge must be exactly 64 characters');
    }
    this.challenge = challenge;
    return this;
  }

  withContext(type: ContextIdentifierType, value: string): this {
    this.validateContext(type, value);
    this.contextIdentifier = { type, value };
    return this;
  }

  withEncryptedToken(token: string): this {
    this.encryptedToken = token;
    return this;
  }

  withAuthorizationPolicy(policy: AuthorizationPolicy): this {
    this.authorizationPolicy = policy;
    return this;
  }

  build(): AuthKsefTokenRequest {
    if (!this.challenge || !this.contextIdentifier || !this.encryptedToken) {
      throw new Error('Missing required fields');
    }

    return {
      challenge: this.challenge,
      contextIdentifier: this.contextIdentifier,
      encryptedToken: this.encryptedToken,
      authorizationPolicy: this.authorizationPolicy
    };
  }

  private validateContext(type: ContextIdentifierType, value: string): void {
    const validators = {
      nip: /^\d{10}$/,
      pesel: /^\d{11}$/,
      krs: /^\d{10}$/
    };

    if (!validators[type]?.test(value)) {
      throw new Error(`Invalid ${type}: ${value}`);
    }
  }
}
```

### **Phase 2: Certificate Management (Week 2)**

#### **2.1 Dynamic Certificate Fetcher**
```typescript
export class KsefCertificateFetcher {
  async fetchPublicKeys(): Promise<KsefCertificates> {
    const response = await fetch(
      `${this.baseUrl}/certificates/public-keys`
    );
    
    const data = await response.json();
    
    return {
      ksefTokenPem: data.items.find(c => c.type === 'ksef_token')?.certificate,
      symmetricKeyPem: data.items.find(c => c.type === 'symmetric_key')?.certificate
    };
  }
}
```

### **Phase 3: Token Management (Week 3)**

#### **3.1 Automatic Token Refresh**
```typescript
export class KsefTokenManager {
  private accessToken?: TokenInfo;
  private refreshToken?: TokenInfo;
  private refreshTimer?: NodeJS.Timeout;

  async getValidAccessToken(): Promise<string> {
    if (!this.accessToken || this.isExpiringSoon(this.accessToken)) {
      await this.refreshAccessToken();
    }
    return this.accessToken!.token;
  }

  private isExpiringSoon(token: TokenInfo): boolean {
    const expiresAt = new Date(token.expiresAt);
    const now = new Date();
    const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 60000;
    return minutesUntilExpiry < 5; // Refresh 5 minutes before expiry
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.authClient.refreshToken(
      this.refreshToken.token
    );

    this.accessToken = response.accessToken;
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiresAt = new Date(this.accessToken!.expiresAt);
    const refreshAt = new Date(expiresAt.getTime() - 5 * 60 * 1000); // 5 min before
    const delay = refreshAt.getTime() - Date.now();

    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, delay);
  }
}
```

---

## 🎯 **Summary & Next Steps**

### **What We Learned**:
1. ✅ **AuthCoordinator pattern** simplifies complex flows
2. ✅ **ECDSA encryption** is preferred over RSA
3. ✅ **Polling mechanism** is critical for auth completion
4. ✅ **Builder pattern** ensures type-safe requests
5. ✅ **Dynamic certificate fetching** keeps keys up-to-date
6. ✅ **Token refresh** should be automatic
7. ✅ **Proper validation** prevents invalid API calls

### **Immediate Actions**:
1. **Implement AuthCoordinator** - Single entry point for auth
2. **Add ECDSA encryption** - Modern, preferred method
3. **Build polling mechanism** - Auto-wait for auth completion
4. **Create request builders** - Type-safe API
5. **Add certificate fetcher** - Dynamic key retrieval
6. **Implement token manager** - Auto-refresh logic

### **Testing Strategy**:
1. Unit tests for each component
2. Integration tests with KSeF test environment
3. E2E tests for complete flows
4. Performance tests for encryption methods

---

**Status**: ✅ **ANALYSIS COMPLETE**  
**Next**: **IMPLEMENTATION PHASE**

---

*Analysis completed: January 23, 2026*  
*Sources: Official CIRFMF repositories (Java, C#, PDF Generator)*
