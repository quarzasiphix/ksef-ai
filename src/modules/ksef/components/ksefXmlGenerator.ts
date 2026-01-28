import { Invoice, BusinessProfile, Customer } from '@/shared/types';
import { create } from 'xmlbuilder2';
import { KsefConfig } from './types';
import { VAT_RATE_CODES } from './config';

export class KsefXmlGenerator {
  private config: KsefConfig;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  generateInvoiceXml(
    invoice: Invoice,
    businessProfile: BusinessProfile,
    customer: Customer
  ): string {
    try {
      console.log('🔧 Generating XML for invoice:', {
        invoiceNumber: invoice.number,
        businessProfile: businessProfile.name,
        customer: customer.name,
        itemsCount: invoice.items?.length || 0
      });

      const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('Faktura', {
          'xmlns': this.config.namespace,
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        });

      this.addHeader(root, invoice);
      this.addSeller(root, businessProfile);
      this.addBuyer(root, customer);
      this.addInvoiceDetails(root, invoice);
      this.addInvoiceItems(root, invoice);
      this.addSummary(root, invoice);

      const xml = root.end({ prettyPrint: true });
      console.log('✅ XML generated successfully, length:', xml.length);
      return xml;
    } catch (error) {
      console.error('❌ XML generation failed:', error);
      console.error('Invoice data:', invoice);
      console.error('Business profile:', businessProfile);
      console.error('Customer:', customer);
      throw new Error(`XML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addHeader(root: any, invoice: Invoice): void {
    const header = root.ele('Naglowek');
    
    header.ele('KodFormularza', {
      kodSystemowy: 'FA(3)',
      wersjaSchemy: this.config.schemaVersion
    }).txt('FA');
    
    header.ele('WariantFormularza').txt('3');
    
    const now = new Date().toISOString();
    header.ele('DataWytworzeniaFa').txt(now);
    
    header.ele('SystemInfo').txt(this.config.systemInfo);
  }

  private addSeller(root: any, businessProfile: BusinessProfile): void {
    const seller = root.ele('Podmiot1');
    
    const identification = seller.ele('DaneIdentyfikacyjne');
    identification.ele('NIP').txt(this.formatNIP(businessProfile.taxId));
    identification.ele('Nazwa').txt(this.sanitizeText(businessProfile.name, 240));
    
    if (businessProfile.regon) {
      identification.ele('REGON').txt(businessProfile.regon);
    }

    const address = seller.ele('Adres');
    address.ele('KodKraju').txt(businessProfile.country || 'PL');
    
    const addressLine1 = this.buildAddressLine1(businessProfile.address);
    if (addressLine1) {
      address.ele('AdresL1').txt(addressLine1);
    }
    
    const addressLine2 = this.buildAddressLine2(
      businessProfile.postalCode,
      businessProfile.city
    );
    if (addressLine2) {
      address.ele('AdresL2').txt(addressLine2);
    }
  }

  private addBuyer(root: any, customer: Customer): void {
    const buyer = root.ele('Podmiot2');
    
    const identification = buyer.ele('DaneIdentyfikacyjne');
    
    if (customer.taxId) {
      identification.ele('NIP').txt(this.formatNIP(customer.taxId));
    }
    
    identification.ele('Nazwa').txt(this.sanitizeText(customer.name, 240));

    if (customer.address || customer.city) {
      const address = buyer.ele('Adres');
      address.ele('KodKraju').txt(customer.country || 'PL');
      
      const addressLine1 = this.buildAddressLine1(customer.address);
      if (addressLine1) {
        address.ele('AdresL1').txt(addressLine1);
      }
      
      const addressLine2 = this.buildAddressLine2(
        customer.postalCode,
        customer.city
      );
      if (addressLine2) {
        address.ele('AdresL2').txt(addressLine2);
      }
    }
  }

  private addInvoiceDetails(root: any, invoice: Invoice): void {
    const fa = root.ele('Fa');
    
    fa.ele('KodWaluty').txt(invoice.currency || 'PLN');
    
    fa.ele('P_1').txt(this.formatDate(invoice.issueDate));
    
    fa.ele('P_2A').txt(this.sanitizeText(invoice.number, 256));
    
    if (invoice.dueDate) {
      fa.ele('P_6').txt(this.formatDate(invoice.dueDate));
    }
    
    if (invoice.sellDate) {
      fa.ele('P_1M').txt(this.formatDate(invoice.sellDate));
    }
  }

  private addInvoiceItems(root: any, invoice: Invoice): void {
    invoice.items.forEach((item, index) => {
      const faWiersz = root.ele('FaWiersz');
      
      faWiersz.ele('NrWierszaFa').txt(String(index + 1));
      
      const description = item.name || item.description || 'Pozycja';
      faWiersz.ele('P_7').txt(this.sanitizeText(description, 256));
      
      faWiersz.ele('P_8A').txt(this.formatCurrency(item.quantity || 1));
      
      const unit = item.unit || 'szt';
      faWiersz.ele('P_8B').txt(this.sanitizeText(unit, 30));
      
      faWiersz.ele('P_9A').txt(this.formatCurrency(item.unitPrice || 0));
      
      const netValue = item.totalNetValue !== undefined 
        ? item.totalNetValue 
        : (item.quantity || 0) * (item.unitPrice || 0);
      faWiersz.ele('P_11').txt(this.formatCurrency(netValue));
      
      const vatCode = this.mapVatRate(item.vatRate, item.vatExempt);
      faWiersz.ele('P_12').txt(vatCode);
      
      if (vatCode !== 'zw' && vatCode !== 'np' && vatCode !== 'oo') {
        const vatAmount = netValue * (parseFloat(vatCode) / 100);
        faWiersz.ele('P_12_XII').txt(this.formatCurrency(vatAmount));
      }
    });
  }

  private addSummary(root: any, invoice: Invoice): void {
    const summary = root.ele('Podsumowanie');
    
    summary.ele('P_13_1').txt(this.formatCurrency(invoice.totalNetValue || 0));
    
    if (invoice.totalVatValue !== undefined && invoice.totalVatValue > 0) {
      summary.ele('P_14_1').txt(this.formatCurrency(invoice.totalVatValue));
    }
    
    summary.ele('P_15').txt(this.formatCurrency(invoice.totalGrossValue || 0));
  }

  private formatNIP(nip?: string): string {
    if (!nip) return '';
    return nip.replace(/[-\s]/g, '');
  }

  private formatDate(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  private formatCurrency(amount: number): string {
    return amount.toFixed(2);
  }

  private sanitizeText(text: string, maxLength: number): string {
    if (text === undefined || text === null) {
      console.warn('⚠️ sanitizeText received undefined/null value');
      return '';
    }
    
    if (typeof text !== 'string') {
      console.warn('⚠️ sanitizeText received non-string value:', typeof text, text);
      text = String(text);
    }
    
    let sanitized = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  private buildAddressLine1(address?: string): string {
    if (!address) return '';
    return this.sanitizeText(address, 200);
  }

  private buildAddressLine2(postalCode?: string, city?: string): string {
    if (!city) return '';
    
    const parts: string[] = [];
    if (postalCode) {
      parts.push(postalCode);
    }
    parts.push(city);
    
    return this.sanitizeText(parts.join(' '), 200);
  }

  private mapVatRate(vatRate?: number | null, vatExempt?: boolean): string {
    if (vatExempt) {
      return 'zw';
    }
    
    if (vatRate === undefined || vatRate === null) {
      return '23';
    }
    
    const rateStr = String(vatRate);
    return VAT_RATE_CODES[rateStr] || rateStr;
  }
}
