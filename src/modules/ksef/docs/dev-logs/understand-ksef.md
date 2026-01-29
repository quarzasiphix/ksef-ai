# Understanding KSeF (Krajowy System e-Faktur)

## What is KSeF?

KSeF (National e-Invoice System) is Poland's mandatory electronic invoicing system operated by the Ministry of Finance. Starting from **July 1, 2024**, all VAT taxpayers in Poland are required to issue invoices through KSeF (with transition periods for different business types).

## Core Concepts

### 1. **Structured Invoices (FA Schema)**
- Invoices must be submitted as **structured XML** documents
- Schema: **FA(3)** - Faktura version 3
- Based on JPK (Jednolity Plik Kontrolny) standards
- XML must validate against official XSD schemas

### 2. **Invoice Flow**
```
Seller → Generate FA(3) XML → Submit to KSeF → Validation → Reference Number (KSeF ID)
                                                    ↓
Buyer ← Retrieve Invoice ← Query KSeF ← Invoice Available in System
```

### 3. **UPO (Urzędowe Poświadczenie Odbioru)**
- Official acknowledgment of receipt from KSeF
- Proof that invoice was accepted by the tax authority
- Contains: timestamp, KSeF reference number, validation status
- Must be stored for audit purposes

## KSeF API Overview

### Base URLs

**Test Environment:**
```
https://api-test.ksef.mf.gov.pl/v2
```

**Production Environment:**
```
https://api.ksef.mf.gov.pl/v2
```

### Authentication Methods

#### 1. **Token-based Authentication** (Recommended for apps)
- User generates token in KSeF portal
- Token format: Long alphanumeric string
- Scopes: `read`, `write`, `full`
- Expiration: Configurable (30-365 days)
- Header: `SessionToken: {token}`

#### 2. **Certificate-based Authentication**
- Qualified electronic signature certificate
- More complex, typically for enterprise systems
- mTLS (mutual TLS) authentication

### Key API Endpoints

#### **Session Management**
```
POST /online/Session/InitToken
- Initialize session with token
- Returns: SessionToken for subsequent requests

POST /online/Session/Terminate
- End current session
```

#### **Invoice Submission (Sending)**
```
POST /online/Invoice/Send
Headers:
  - SessionToken: {session_token}
  - Content-Type: application/xml
Body: FA(3) XML document

Response:
{
  "elementReferenceNumber": "2024-01-15-ABC123...",
  "processingCode": 200,
  "processingDescription": "Faktura została przyjęta",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### **Invoice Status Check**
```
GET /online/Invoice/Status/{referenceNumber}
Returns: Current status (accepted, rejected, processing)
```

#### **UPO Retrieval**
```
GET /online/Invoice/Upo/{referenceNumber}
Returns: XML UPO document
```

#### **Invoice Retrieval (Receiving)**
```
POST /online/Query/Invoice/Sync
Body:
{
  "queryCriteria": {
    "subjectType": "subject2",
    "type": "incremental",
    "acquisitionTimestampThresholdFrom": "2024-01-01T00:00:00Z",
    "acquisitionTimestampThresholdTo": "2024-01-31T23:59:59Z"
  }
}

Response:
{
  "invoiceHeaderList": [
    {
      "invoiceReferenceNumber": "2024-01-15-ABC123...",
      "ksefReferenceNumber": "1234567890-...",
      "acquisitionTimestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### **Download Invoice XML**
```
GET /online/Invoice/Get/{referenceNumber}
Returns: Full FA(3) XML of the invoice
```

## FA(3) XML Schema Structure

### Root Element
```xml
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
```

### Key Sections

#### 1. **Naglowek (Header)**
```xml
<Naglowek>
  <KodFormularza kodSystemowy="FA(3)" wersjaSchemy="1-0E">FA</KodFormularza>
  <WariantFormularza>3</WariantFormularza>
  <DataWytworzeniaFa>2024-01-15T10:30:00Z</DataWytworzeniaFa>
  <SystemInfo>KsięgaI v1.0</SystemInfo>
</Naglowek>
```

#### 2. **Podmiot1 (Seller)**
```xml
<Podmiot1>
  <DaneIdentyfikacyjne>
    <NIP>1234567890</NIP>
    <Nazwa>Example Sp. z o.o.</Nazwa>
  </DaneIdentyfikacyjne>
  <Adres>
    <KodKraju>PL</KodKraju>
    <AdresL1>ul. Przykładowa 1</AdresL1>
    <AdresL2>00-001 Warszawa</AdresL2>
  </Adres>
</Podmiot1>
```

#### 3. **Podmiot2 (Buyer)**
```xml
<Podmiot2>
  <DaneIdentyfikacyjne>
    <NIP>9876543210</NIP>
    <Nazwa>Buyer Company Ltd.</Nazwa>
  </DaneIdentyfikacyjne>
  <Adres>
    <KodKraju>PL</KodKraju>
    <AdresL1>ul. Testowa 5</AdresL1>
    <AdresL2>01-234 Kraków</AdresL2>
  </Adres>
</Podmiot2>
```

#### 4. **Fa (Invoice Details)**
```xml
<Fa>
  <KodWaluty>PLN</KodWaluty>
  <P_1>2024-01-15</P_1>
  <P_2A>FV/2024/01/001</P_2A>
  <P_6>2024-01-29</P_6>
</Fa>
```

#### 5. **FaWiersz (Invoice Lines)**
```xml
<FaWiersz>
  <NrWierszaFa>1</NrWierszaFa>
  <P_7>Usługa księgowa</P_7>
  <P_8A>1</P_8A>
  <P_8B>szt</P_8B>
  <P_9A>1000.00</P_9A>
  <P_11>1000.00</P_11>
  <P_12>23</P_12>
</FaWiersz>
```

#### 6. **Podsumowanie (Summary)**
```xml
<Podsumowanie>
  <P_13_1>1000.00</P_13_1>
  <P_14_1>230.00</P_14_1>
  <P_15>1230.00</P_15>
</Podsumowanie>
```

## Important Rules & Constraints

### Mandatory Fields
- **Seller NIP** (required)
- **Buyer name** (NIP optional for individuals)
- **Invoice number** (must be unique per seller)
- **Invoice date**
- **At least one invoice line**
- **Totals must match** (sum of lines = summary)

### VAT Rate Codes
- `23` - Standard rate 23%
- `8` - Reduced rate 8%
- `5` - Reduced rate 5%
- `0` - 0% rate
- `zw` - VAT exempt (zwolniona)
- `np` - Not subject to VAT (nie podlega)
- `oo` - Reverse charge (odwrotne obciążenie)

### Invoice Number Format
- Must be unique within seller's scope
- Recommended: `PREFIX/YYYY/MM/NUMBER`
- Example: `FV/2024/01/001`

### Date/Time Format
- ISO 8601: `YYYY-MM-DDTHH:MM:SSZ`
- Dates: `YYYY-MM-DD`

## Offline24 Mode

**Critical Feature**: If KSeF API is unavailable, invoices can be submitted within **24 hours** after the system comes back online without penalties.

**Implementation Strategy**:
1. Attempt to send invoice to KSeF
2. If network error or KSeF downtime → queue invoice locally
3. Retry periodically (exponential backoff)
4. Must succeed within 24h of original invoice date

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Store reference number |
| 400 | Invalid XML | Fix validation errors |
| 401 | Unauthorized | Refresh token |
| 403 | Forbidden | Check permissions |
| 409 | Duplicate invoice | Invoice already exists |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Queue for Offline24 |

### Validation Errors
- Schema validation failures
- Business rule violations (e.g., totals mismatch)
- Missing required fields
- Invalid NIP format

## Rate Limits

- **Test environment**: ~10 requests/second
- **Production**: ~100 requests/second (per token)
- Bulk operations recommended for large volumes

## Security Considerations

### Token Storage
- **Never** store tokens in client-side code
- Use Supabase secrets or encrypted database fields
- Rotate tokens regularly (every 90 days recommended)

### Data Privacy
- Invoices contain sensitive business data
- GDPR compliance required
- Audit logs for all KSeF operations

## Testing Strategy

### Test Environment Access
1. Register at https://ksef-test.mf.gov.pl
2. Create test business profile
3. Generate test token
4. Use test NIP: `1234567890` (example)

### Test Scenarios
- Valid invoice submission
- Duplicate invoice (should fail)
- Invalid XML (schema validation)
- Missing required fields
- Incorrect totals
- Token expiration
- Network timeout
- Retrieve incoming invoices

## Integration Checklist

- Obtain KSeF test environment access
- Generate test token
- Implement FA(3) XML generator
- Validate XML against XSD schema
- Implement session management
- Build invoice submission flow
- Handle UPO storage
- Implement error handling & retries
- Build invoice retrieval (polling)
- Add UI for KSeF status
- Test all error scenarios
- Implement Offline24 queue
- Production token setup
- Go live

## Useful Resources

- **Official Documentation**: https://www.gov.pl/web/kas/ksef
- **API Specification**: https://ksef.mf.gov.pl/api/swagger
- **XSD Schemas**: https://ksef.mf.gov.pl/schema/
- **Test Portal**: https://ksef-test.mf.gov.pl
- **Support**: ksef@mf.gov.pl

## Next Steps

1. Review `dev-send-ksef.md` for sending implementation
2. Review `dev-receive-ksef.md` for receiving implementation
3. Review `dev-view-ksef.md` for UI/UX design