# KSeF Required Dependencies

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "qrcode": "^1.5.3",
    "adm-zip": "^0.5.10",
    "fast-xml-parser": "^4.3.4"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5",
    "@types/adm-zip": "^0.5.5"
  }
}
```

## Installation Command

```bash
npm install qrcode adm-zip fast-xml-parser
npm install -D @types/qrcode @types/adm-zip
```

## Purpose

- **qrcode**: Generate QR codes for invoice verification (CODE I and CODE II)
- **adm-zip**: Unzip invoice export packages from KSeF
- **fast-xml-parser**: Parse invoice XML to extract metadata
