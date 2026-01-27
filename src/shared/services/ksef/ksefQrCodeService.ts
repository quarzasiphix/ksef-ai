import * as QRCode from 'qrcode';
import { calculateSha256Base64Url } from './ksefInvoiceRetrievalHelpersBrowser';

// Polyfill Buffer for browser compatibility
if (typeof Buffer === 'undefined') {
  (globalThis as any).Buffer = {
    from: (arrayBuffer: ArrayBuffer | Uint8Array) => {
      if (arrayBuffer instanceof ArrayBuffer) {
        return new Uint8Array(arrayBuffer);
      }
      return arrayBuffer;
    }
  };
}

export interface QrCodeResult {
  qrCodeDataUrl: string;
  qrCodeBuffer: Buffer;
  url: string;
  label: string;
}

export interface GenerateInvoiceQrParams {
  sellerNip: string;
  issueDate: Date;
  invoiceXml: string;
  ksefNumber?: string;
  environment: 'test' | 'demo' | 'prod';
}

export interface GenerateCertificateQrParams {
  contextType: 'Nip' | 'InternalId' | 'NipVatUe' | 'PeppolId';
  contextValue: string;
  sellerNip: string;
  certificateSerial: string;
  invoiceXml: string;
  privateKeyPem: string;
  environment: 'test' | 'demo' | 'prod';
}

export class KsefQrCodeService {
  private readonly QR_BASE_URLS = {
    test: 'https://qr-test.ksef.mf.gov.pl',
    demo: 'https://qr-demo.ksef.mf.gov.pl',
    prod: 'https://qr.ksef.mf.gov.pl',
  };

  private readonly QR_DOMAINS = {
    test: 'qr-test.ksef.mf.gov.pl',
    demo: 'qr-demo.ksef.mf.gov.pl',
    prod: 'qr.ksef.mf.gov.pl',
  };

  /**
   * Generate CODE I - Invoice verification QR code
   * Required for ALL invoices (online and offline)
   * 
   * Format: https://qr.ksef.mf.gov.pl/invoice/{NIP}/{DD-MM-YYYY}/{SHA256-Base64URL}
   * Label: KSeF number or "OFFLINE"
   */
  async generateInvoiceQr(params: GenerateInvoiceQrParams): Promise<QrCodeResult> {
    const hash = await calculateSha256Base64Url(params.invoiceXml);
    const dateStr = this.formatDate(params.issueDate);
    const baseUrl = this.QR_BASE_URLS[params.environment];
    const url = `${baseUrl}/invoice/${params.sellerNip}/${dateStr}/${hash}`;
    const label = params.ksefNumber || 'OFFLINE';

    const qrCodeBuffer = await this.generateQrCode(url);
    const qrCodeDataUrl = await this.generateQrCodeDataUrl(url);

    return {
      qrCodeDataUrl,
      qrCodeBuffer,
      url,
      label,
    };
  }

  /**
   * Generate CODE II - Certificate verification QR code
   * Required ONLY for OFFLINE invoices
   * 
   * Format: https://qr.ksef.mf.gov.pl/certificate/{ContextType}/{ContextValue}/{SellerNIP}/{CertSerial}/{InvoiceHash}/{Signature}
   * Label: "CERTYFIKAT"
   */
  async generateCertificateQr(params: GenerateCertificateQrParams): Promise<QrCodeResult> {
    const hash = await calculateSha256Base64Url(params.invoiceXml);
    const domain = this.QR_DOMAINS[params.environment];
    
    // Build path to sign (without https:// prefix and without trailing /)
    const pathToSign = `${domain}/certificate/${params.contextType}/${params.contextValue}/${params.sellerNip}/${params.certificateSerial}/${hash}`;
    
    // Sign the path using RSA-PSS
    const signature = await this.signRsaPss(pathToSign, params.privateKeyPem);
    
    // Build final URL
    const url = `https://${pathToSign}/${signature}`;
    const label = 'CERTYFIKAT';

    const qrCodeBuffer = await this.generateQrCode(url);
    const qrCodeDataUrl = await this.generateQrCodeDataUrl(url);

    return {
      qrCodeDataUrl,
      qrCodeBuffer,
      url,
      label,
    };
  }

  /**
   * Sign data using RSASSA-PSS with SHA-256
   * Algorithm: RSA-PSS with SHA-256, MGF1-SHA-256, salt length 32 bytes
   * Min key size: 2048 bits
   */
  private async signRsaPss(data: string, privateKeyPem: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Import private key from PEM
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      this.pemToArrayBuffer(privateKeyPem),
      { name: 'RSA-PSS', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the data
    const signature = await crypto.subtle.sign(
      {
        name: 'RSA-PSS',
        saltLength: 32, // 32 bytes as per KSeF spec
      },
      privateKey,
      dataBuffer
    );

    return this.base64UrlEncode(Buffer.from(signature));
  }

  /**
   * Convert PEM string to ArrayBuffer
   */
  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const lines = pem.split('\n');
    const base64 = lines
      .filter(line => !line.includes('-----BEGIN') && !line.includes('-----END'))
      .join('');
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  /**
   * Encode buffer to Base64URL format
   * Base64URL: Replace + with -, / with _, remove padding =
   */
  private base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Format date as DD-MM-YYYY for QR code URL
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Generate QR code as PNG buffer
   * Complies with ISO/IEC 18004:2024
   * Error correction level: M (15% recovery)
   */
  private async generateQrCode(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 300,
      margin: 1,
    });
  }

  /**
   * Generate QR code as data URL for embedding in HTML
   */
  private async generateQrCodeDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 1,
    });
  }

  /**
   * Add label text below QR code
   * Returns new image buffer with label
   */
  async addLabelToQrCode(qrCodeBuffer: Buffer, label: string): Promise<Buffer> {
    // For now, return the QR code as-is
    // In a full implementation, you would use a library like 'sharp' or 'canvas'
    // to add text below the QR code image
    // This is optional - the label can also be displayed separately in the UI
    return qrCodeBuffer;
  }

  /**
   * Get QR base URL for environment
   */
  getQrBaseUrl(environment: 'test' | 'demo' | 'prod'): string {
    return this.QR_BASE_URLS[environment];
  }
}

export const ksefQrCodeService = new KsefQrCodeService();
