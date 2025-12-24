/**
 * JPK_V7M Version 3 Validator
 * 
 * Two-stage validation:
 * 1. XSD validation (structure)
 * 2. Business rules validation (MF logic)
 */

import { JpkV7M } from './types';
import { JpkValidationError, JpkValidationWarning } from '../../types/accounting-model';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: JpkValidationError[];
  warnings: JpkValidationWarning[];
}

/**
 * Validate JPK_V7M structure and business rules
 */
export function validateJpkV7M(jpk: JpkV7M): ValidationResult {
  const errors: JpkValidationError[] = [];
  const warnings: JpkValidationWarning[] = [];
  
  // Structure validation
  validateStructure(jpk, errors);
  
  // Business rules validation
  validateBusinessRules(jpk, errors, warnings);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate basic structure requirements
 */
function validateStructure(jpk: JpkV7M, errors: JpkValidationError[]): void {
  // Header validation
  if (!jpk.JPK.Naglowek) {
    errors.push({
      code: 'MISSING_HEADER',
      message: 'Brak nagłówka JPK',
      severity: 'error',
    });
    return;
  }
  
  // NIP validation
  if (!jpk.JPK.Podmiot1?.NIP) {
    errors.push({
      code: 'MISSING_NIP',
      message: 'Brak numeru NIP',
      field: 'Podmiot1.NIP',
      severity: 'error',
    });
  } else if (!isValidNip(jpk.JPK.Podmiot1.NIP)) {
    errors.push({
      code: 'INVALID_NIP',
      message: 'Nieprawidłowy format NIP',
      field: 'Podmiot1.NIP',
      severity: 'error',
    });
  }
  
  // Full name validation
  if (!jpk.JPK.Podmiot1?.PelnaNazwa) {
    errors.push({
      code: 'MISSING_COMPANY_NAME',
      message: 'Brak pełnej nazwy podmiotu',
      field: 'Podmiot1.PelnaNazwa',
      severity: 'error',
    });
  }
  
  // Date validation
  if (!jpk.JPK.Naglowek.DataOd || !jpk.JPK.Naglowek.DataDo) {
    errors.push({
      code: 'MISSING_DATES',
      message: 'Brak dat okresu rozliczeniowego',
      severity: 'error',
    });
  }
  
  // Declaration validation
  if (!jpk.JPK.Deklaracja) {
    errors.push({
      code: 'MISSING_DECLARATION',
      message: 'Brak deklaracji VAT-7',
      severity: 'error',
    });
  }
}

/**
 * Validate business rules
 */
function validateBusinessRules(
  jpk: JpkV7M, 
  errors: JpkValidationError[], 
  warnings: JpkValidationWarning[]
): void {
  if (!jpk.JPK.PozycjeSzczegolowe) return;
  
  // Sales register validation
  if (jpk.JPK.PozycjeSzczegolowe.SprzedazWiersz) {
    validateSalesEntries(jpk.JPK.PozycjeSzczegolowe.SprzedazWiersz, errors, warnings);
  }
  
  // Purchase register validation
  if (jpk.JPK.PozycjeSzczegolowe.ZakupWiersz) {
    validatePurchaseEntries(jpk.JPK.PozycjeSzczegolowe.ZakupWiersz, errors, warnings);
  }
  
  // Control totals validation
  validateControlTotals(jpk, errors);
  
  // Declaration consistency validation
  validateDeclarationConsistency(jpk, errors, warnings);
}

/**
 * Validate sales entries
 */
function validateSalesEntries(
  entries: any[], 
  errors: JpkValidationError[], 
  warnings: JpkValidationWarning[]
): void {
  entries.forEach((entry, index) => {
    const lineNumber = entry.LpSprzedazy;
    
    // Required fields
    if (!entry.DowodSprzedazy) {
      errors.push({
        code: 'MISSING_INVOICE_NUMBER',
        message: `Brak numeru dokumentu sprzedaży w wierszu ${lineNumber}`,
        field: `SprzedazWiersz[${index}].DowodSprzedazy`,
        severity: 'error',
      });
    }
    
    if (!entry.DataWystawienia) {
      errors.push({
        code: 'MISSING_ISSUE_DATE',
        message: `Brak daty wystawienia w wierszu ${lineNumber}`,
        field: `SprzedazWiersz[${index}].DataWystawienia`,
        severity: 'error',
      });
    }
    
    // At least one amount field must be filled
    const hasAmounts = hasAnyAmountField(entry, 10, 39);
    if (!hasAmounts) {
      errors.push({
        code: 'MISSING_AMOUNTS',
        message: `Brak kwot w wierszu sprzedaży ${lineNumber}`,
        field: `SprzedazWiersz[${index}]`,
        severity: 'error',
      });
    }
    
    // NIP validation for domestic transactions
    if (entry.NrKontrahenta && !isValidNip(entry.NrKontrahenta) && !entry.SW && !entry.EE) {
      warnings.push({
        code: 'INVALID_CUSTOMER_NIP',
        message: `Nieprawidłowy NIP kontrahenta w wierszu ${lineNumber}: ${entry.NrKontrahenta}`,
        field: `SprzedazWiersz[${index}].NrKontrahenta`,
        severity: 'warning',
      });
    }
    
    // GTU validation
    validateGtuCodes(entry, lineNumber, warnings);
    
    // Procedure markers validation
    validateProcedureMarkers(entry, lineNumber, warnings);
  });
}

/**
 * Validate purchase entries
 */
function validatePurchaseEntries(
  entries: any[], 
  errors: JpkValidationError[], 
  warnings: JpkValidationWarning[]
): void {
  entries.forEach((entry, index) => {
    const lineNumber = entry.LpZakupu;
    
    // Required fields
    if (!entry.DowodZakupu) {
      errors.push({
        code: 'MISSING_PURCHASE_NUMBER',
        message: `Brak numeru dokumentu zakupu w wierszu ${lineNumber}`,
        field: `ZakupWiersz[${index}].DowodZakupu`,
        severity: 'error',
      });
    }
    
    if (!entry.DataZakupu) {
      errors.push({
        code: 'MISSING_PURCHASE_DATE',
        message: `Brak daty zakupu w wierszu ${lineNumber}`,
        field: `ZakupWiersz[${index}].DataZakupu`,
        severity: 'error',
      });
    }
    
    // At least one amount field must be filled
    const hasAmounts = hasAnyAmountField(entry, 40, 50);
    if (!hasAmounts) {
      errors.push({
        code: 'MISSING_AMOUNTS',
        message: `Brak kwot w wierszu zakupu ${lineNumber}`,
        field: `ZakupWiersz[${index}]`,
        severity: 'error',
      });
    }
  });
}

/**
 * Validate control totals match entries
 */
function validateControlTotals(jpk: JpkV7M, errors: JpkValidationError[]): void {
  if (!jpk.JPK.PozycjeSzczegolowe) return;
  
  // Sales control
  const salesCount = jpk.JPK.PozycjeSzczegolowe.SprzedazWiersz?.length || 0;
  const salesCtrlCount = jpk.JPK.PozycjeSzczegolowe.SprzedazCtrl.LiczbaWierszySprzedazy;
  
  if (salesCount !== salesCtrlCount) {
    errors.push({
      code: 'SALES_COUNT_MISMATCH',
      message: `Niezgodność liczby wierszy sprzedaży: ${salesCount} vs ${salesCtrlCount}`,
      field: 'SprzedazCtrl.LiczbaWierszySprzedazy',
      severity: 'error',
    });
  }
  
  // Purchase control
  const purchaseCount = jpk.JPK.PozycjeSzczegolowe.ZakupWiersz?.length || 0;
  const purchaseCtrlCount = jpk.JPK.PozycjeSzczegolowe.ZakupCtrl.LiczbaWierszyZakupow;
  
  if (purchaseCount !== purchaseCtrlCount) {
    errors.push({
      code: 'PURCHASE_COUNT_MISMATCH',
      message: `Niezgodność liczby wierszy zakupu: ${purchaseCount} vs ${purchaseCtrlCount}`,
      field: 'ZakupCtrl.LiczbaWierszyZakupow',
      severity: 'error',
    });
  }
}

/**
 * Validate declaration consistency with registers
 */
function validateDeclarationConsistency(
  jpk: JpkV7M, 
  errors: JpkValidationError[], 
  warnings: JpkValidationWarning[]
): void {
  if (!jpk.JPK.PozycjeSzczegolowe || !jpk.JPK.Deklaracja) return;
  
  const ctrl = jpk.JPK.PozycjeSzczegolowe.SprzedazCtrl;
  const decl = jpk.JPK.Deklaracja.PozycjeSzczegolowe;
  
  // Output VAT should match
  const ctrlOutputVat = parseFloat(ctrl.PodatekNalezny || '0');
  const declOutputVat = parseFloat(decl.P_40 || '0');
  
  if (Math.abs(ctrlOutputVat - declOutputVat) > 0.01) {
    warnings.push({
      code: 'OUTPUT_VAT_MISMATCH',
      message: `Niezgodność VAT należnego: rejestr ${ctrlOutputVat.toFixed(2)} vs deklaracja ${declOutputVat.toFixed(2)}`,
      severity: 'warning',
    });
  }
  
  // Input VAT should match
  const ctrlInputVat = parseFloat(jpk.JPK.PozycjeSzczegolowe.ZakupCtrl.PodatekNaliczony || '0');
  const declInputVat = parseFloat(decl.P_54 || '0');
  
  if (Math.abs(ctrlInputVat - declInputVat) > 0.01) {
    warnings.push({
      code: 'INPUT_VAT_MISMATCH',
      message: `Niezgodność VAT naliczonego: rejestr ${ctrlInputVat.toFixed(2)} vs deklaracja ${declInputVat.toFixed(2)}`,
      severity: 'warning',
    });
  }
  
  // Settlement validation
  const vatDifference = ctrlOutputVat - ctrlInputVat;
  const declPayable = parseFloat(decl.P_60 || '0');
  const declRefund = parseFloat(decl.P_61 || '0');
  
  if (vatDifference > 0 && Math.abs(vatDifference - declPayable) > 0.01) {
    errors.push({
      code: 'SETTLEMENT_MISMATCH',
      message: `Niezgodność rozliczenia VAT do zapłaty: ${vatDifference.toFixed(2)} vs ${declPayable.toFixed(2)}`,
      field: 'Deklaracja.PozycjeSzczegolowe.P_60',
      severity: 'error',
    });
  }
  
  if (vatDifference < 0 && Math.abs(Math.abs(vatDifference) - declRefund) > 0.01) {
    errors.push({
      code: 'SETTLEMENT_MISMATCH',
      message: `Niezgodność rozliczenia VAT do zwrotu: ${Math.abs(vatDifference).toFixed(2)} vs ${declRefund.toFixed(2)}`,
      field: 'Deklaracja.PozycjeSzczegolowe.P_61',
      severity: 'error',
    });
  }
}

/**
 * Check if entry has any amount fields in range
 */
function hasAnyAmountField(entry: any, from: number, to: number): boolean {
  for (let i = from; i <= to; i++) {
    if (entry[`K_${i}`]) return true;
  }
  return false;
}

/**
 * Validate GTU codes
 */
function validateGtuCodes(entry: any, lineNumber: number, warnings: JpkValidationWarning[]): void {
  const gtuCodes = [];
  for (let i = 1; i <= 13; i++) {
    const key = `GTU_${String(i).padStart(2, '0')}`;
    if (entry[key]) gtuCodes.push(key);
  }
  
  // Multiple GTU codes can be set, but warn if many
  if (gtuCodes.length > 3) {
    warnings.push({
      code: 'MULTIPLE_GTU_CODES',
      message: `Wiele kodów GTU w wierszu ${lineNumber}: ${gtuCodes.join(', ')}`,
      severity: 'warning',
    });
  }
}

/**
 * Validate procedure markers
 */
function validateProcedureMarkers(entry: any, lineNumber: number, warnings: JpkValidationWarning[]): void {
  // SW and EE are mutually exclusive
  if (entry.SW && entry.EE) {
    warnings.push({
      code: 'CONFLICTING_MARKERS',
      message: `Konflikt znaczników SW i EE w wierszu ${lineNumber}`,
      severity: 'warning',
    });
  }
  
  // If SW or EE, should have K_16 (0% export/intra-community)
  if ((entry.SW || entry.EE) && !entry.K_16) {
    warnings.push({
      code: 'MISSING_EXPORT_AMOUNT',
      message: `Brak kwoty K_16 dla eksportu/WDT w wierszu ${lineNumber}`,
      severity: 'warning',
    });
  }
}

/**
 * Validate NIP format
 */
function isValidNip(nip: string): boolean {
  // Remove any non-digit characters
  const cleaned = nip.replace(/\D/g, '');
  
  // NIP must be exactly 10 digits
  if (cleaned.length !== 10) return false;
  
  // Checksum validation
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  
  const checksum = sum % 11;
  const lastDigit = parseInt(cleaned[9]);
  
  return checksum === lastDigit;
}

/**
 * XSD validation (placeholder - requires external XSD validator)
 * In production, use a library like libxmljs or xmllint
 */
export async function validateAgainstXsd(xml: string, xsdPath: string): Promise<ValidationResult> {
  // TODO: Implement XSD validation using external library
  // For now, return placeholder
  return {
    isValid: true,
    errors: [],
    warnings: [{
      code: 'XSD_VALIDATION_NOT_IMPLEMENTED',
      message: 'Walidacja XSD nie jest jeszcze zaimplementowana',
      severity: 'warning',
    }],
  };
}
