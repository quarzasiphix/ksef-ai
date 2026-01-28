import { Invoice, BusinessProfile, Customer } from '@/shared/types';
import { ValidationResult, ValidationError, ValidationWarning } from './types';

export class KsefValidator {
  validateInvoiceForSubmission(
    invoice: Invoice,
    businessProfile: BusinessProfile,
    customer: Customer
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateBusinessProfile(businessProfile, errors, warnings);
    this.validateCustomer(customer, errors, warnings);
    this.validateInvoice(invoice, errors, warnings);
    this.validateInvoiceItems(invoice, errors, warnings);
    this.validateTotals(invoice, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateBusinessProfile(
    profile: BusinessProfile,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!profile.taxId || profile.taxId.trim() === '') {
      errors.push({
        field: 'businessProfile.taxId',
        message: 'NIP sprzedawcy jest wymagany',
        code: 'SELLER_NIP_REQUIRED',
      });
    } else if (!this.isValidNIP(profile.taxId)) {
      errors.push({
        field: 'businessProfile.taxId',
        message: 'Nieprawidłowy format NIP',
        code: 'INVALID_NIP_FORMAT',
      });
    }

    if (!profile.name || profile.name.trim() === '') {
      errors.push({
        field: 'businessProfile.name',
        message: 'Nazwa sprzedawcy jest wymagana',
        code: 'SELLER_NAME_REQUIRED',
      });
    }

    if (!profile.address || profile.address.trim() === '') {
      warnings.push({
        field: 'businessProfile.address',
        message: 'Brak adresu sprzedawcy',
      });
    }

    if (!profile.city || profile.city.trim() === '') {
      warnings.push({
        field: 'businessProfile.city',
        message: 'Brak miasta sprzedawcy',
      });
    }

    if (!profile.postalCode || profile.postalCode.trim() === '') {
      warnings.push({
        field: 'businessProfile.postalCode',
        message: 'Brak kodu pocztowego sprzedawcy',
      });
    }
  }

  private validateCustomer(
    customer: Customer,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!customer.name || customer.name.trim() === '') {
      errors.push({
        field: 'customer.name',
        message: 'Nazwa nabywcy jest wymagana',
        code: 'BUYER_NAME_REQUIRED',
      });
    }

    if (customer.taxId && !this.isValidNIP(customer.taxId)) {
      warnings.push({
        field: 'customer.taxId',
        message: 'Nieprawidłowy format NIP nabywcy',
      });
    }
  }

  private validateInvoice(
    invoice: Invoice,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!invoice.number || invoice.number.trim() === '') {
      errors.push({
        field: 'invoice.number',
        message: 'Numer faktury jest wymagany',
        code: 'INVOICE_NUMBER_REQUIRED',
      });
    }

    if (!invoice.issueDate) {
      errors.push({
        field: 'invoice.issueDate',
        message: 'Data wystawienia jest wymagana',
        code: 'ISSUE_DATE_REQUIRED',
      });
    }

    if (invoice.ksef?.referenceNumber) {
      errors.push({
        field: 'invoice.ksef.referenceNumber',
        message: 'Faktura została już wysłana do KSeF',
        code: 'ALREADY_SUBMITTED',
      });
    }
  }

  private validateInvoiceItems(
    invoice: Invoice,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!invoice.items || invoice.items.length === 0) {
      errors.push({
        field: 'invoice.items',
        message: 'Faktura musi zawierać przynajmniej jedną pozycję',
        code: 'NO_ITEMS',
      });
      return;
    }

    invoice.items.forEach((item, index) => {
      if (!item.name && !item.description) {
        errors.push({
          field: `invoice.items[${index}].name`,
          message: `Pozycja ${index + 1}: Brak nazwy/opisu`,
          code: 'ITEM_NAME_REQUIRED',
        });
      }

      if (item.quantity === undefined || item.quantity === null || item.quantity <= 0) {
        errors.push({
          field: `invoice.items[${index}].quantity`,
          message: `Pozycja ${index + 1}: Nieprawidłowa ilość`,
          code: 'INVALID_QUANTITY',
        });
      }

      if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
        errors.push({
          field: `invoice.items[${index}].unitPrice`,
          message: `Pozycja ${index + 1}: Nieprawidłowa cena jednostkowa`,
          code: 'INVALID_UNIT_PRICE',
        });
      }

      if (!item.unit || item.unit.trim() === '') {
        warnings.push({
          field: `invoice.items[${index}].unit`,
          message: `Pozycja ${index + 1}: Brak jednostki miary (zostanie użyte "szt")`,
        });
      }
    });
  }

  private validateTotals(
    invoice: Invoice,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (invoice.totalNetValue === undefined || invoice.totalNetValue === null) {
      errors.push({
        field: 'invoice.totalNetValue',
        message: 'Brak wartości netto',
        code: 'TOTAL_NET_REQUIRED',
      });
    }

    if (invoice.totalGrossValue === undefined || invoice.totalGrossValue === null) {
      errors.push({
        field: 'invoice.totalGrossValue',
        message: 'Brak wartości brutto',
        code: 'TOTAL_GROSS_REQUIRED',
      });
    }

    if (invoice.items && invoice.items.length > 0) {
      const calculatedNet = invoice.items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
        return sum + itemTotal;
      }, 0);

      const tolerance = 0.02;
      if (Math.abs(calculatedNet - (invoice.totalNetValue || 0)) > tolerance) {
        errors.push({
          field: 'invoice.totalNetValue',
          message: 'Suma pozycji nie zgadza się z wartością netto faktury',
          code: 'TOTALS_MISMATCH',
        });
      }
    }
  }

  private isValidNIP(nip: string): boolean {
    const cleaned = nip.replace(/[-\s]/g, '');
    
    if (!/^\d{10}$/.test(cleaned)) {
      return false;
    }

    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * weights[i];
    }

    const checksum = sum % 11;
    const lastDigit = parseInt(cleaned[9]);

    return checksum === lastDigit;
  }

  validateXmlStructure(xml: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!xml || xml.trim() === '') {
      errors.push({
        field: 'xml',
        message: 'XML jest pusty',
        code: 'EMPTY_XML',
      });
      return { valid: false, errors, warnings };
    }

    if (!xml.includes('<?xml')) {
      warnings.push({
        field: 'xml',
        message: 'Brak deklaracji XML',
      });
    }

    if (!xml.includes('<Faktura')) {
      errors.push({
        field: 'xml',
        message: 'Brak elementu głównego <Faktura>',
        code: 'MISSING_ROOT_ELEMENT',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
