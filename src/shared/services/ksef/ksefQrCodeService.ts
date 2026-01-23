import crypto from 'crypto';
import QRCode from 'qrcode';

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
    const hash = this.calculateSha256Base64Url(params.invoiceXml);
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
    const hash = this.calculateSha256Base64Url(params.invoiceXml);
    const domain = this.QR_DOMAINS[params.environment];
    
    // Build path to sign (without https:// prefix and without trailing /)
    const pathToSign = `${domain}/certificate/${params.contextType}/${params.contextValue}/${params.sellerNip}/${params.certificateSerial}/${hash}`;
    
    // Sign the path using RSA-PSS
    const signature = this.signRsaPss(pathToSign, params.privateKeyPem);
    
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
   * Calculate SHA-256 hash and encode as Base64URL
   * Used for invoice file hash in QR codes
   */
  private calculateSha256Base64Url(data: string): string {
    const hash = crypto.createHash('sha256').update(data, 'utf8').digest();
    return this.base64UrlEncode(hash);
  }

  /**
   * Sign data using RSASSA-PSS with SHA-256
   * Algorithm: RSA-PSS with SHA-256, MGF1-SHA-256, salt length 32 bytes
   * Min key size: 2048 bits
   */
  private signRsaPss(data: string, privateKeyPem: string): string {
    const sign = crypto.createSign('sha256');
    sign.update(data, 'utf8');
    sign.end();

    const signature = sign.sign({
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32, // 32 bytes as per KSeF spec
    });

    return this.base64UrlEncode(signature);
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
