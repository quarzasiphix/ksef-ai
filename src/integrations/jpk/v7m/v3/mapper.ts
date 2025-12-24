/**
 * JPK_V7M Version 3 Mapper
 * 
 * Transforms canonical accounting model to JPK_V7M XML structure.
 * This mapper is version-specific and isolated from UI concerns.
 */

import { 
  JpkGenerationRequest, 
  VatRegisterEntry, 
  CompanyProfile,
  VatAmount,
  ProcedureMarkers 
} from '../../types/accounting-model';
import { 
  JpkV7M, 
  SalesEntry, 
  PurchaseEntry,
  SalesControl,
  PurchaseControl,
  DeclarationDetails
} from './types';

/**
 * Main mapper function
 * Transforms accounting model to JPK_V7M structure
 */
export function mapToJpkV7M(request: JpkGenerationRequest): JpkV7M {
  // Validate request
  validateRequest(request);
  
  const { companyProfile, vatRegisterEntries = [], period, purpose } = request;
  
  // Split entries by type
  const salesEntries = vatRegisterEntries.filter(e => e.type === 'sales');
  const purchaseEntries = vatRegisterEntries.filter(e => e.type === 'purchase');
  
  // Parse period (YYYY-MM format)
  const [year, month] = period.split('-');
  const dateFrom = `${year}-${month}-01`;
  const dateToDate = new Date(parseInt(year), parseInt(month), 0);
  const dateTo = `${year}-${month}-${String(dateToDate.getDate()).padStart(2, '0')}`;
  
  // Build JPK structure
  const jpk: JpkV7M = {
    'JPK': {
      '@xmlns': 'http://jpk.mf.gov.pl/wzor/2022/02/17/02171/',
      '@xmlns:etd': 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eDeklaracja/',
      
      Naglowek: {
        KodFormularza: {
          '@kodSystemowy': 'JPK_V7M (3)',
          '@wersjaSchemy': '1-0',
          '#text': 'JPK_VAT'
        },
        WariantFormularza: '3',
        CelZlozenia: purpose === 1 ? '1' : '2',
        DataWytworzeniaJPK: new Date().toISOString(),
        DataOd: dateFrom,
        DataDo: dateTo,
        NazwaSystemu: request.systemName || 'KsiegAI',
        KodUrzedu: undefined, // Optional, can be added
      },
      
      Podmiot1: {
        NIP: companyProfile.nip,
        PelnaNazwa: companyProfile.fullName,
        REGON: companyProfile.regon,
        Email: undefined, // Optional
      },
      
      PozycjeSzczegolowe: {
        SprzedazWiersz: salesEntries.length > 0 
          ? salesEntries.map((entry, idx) => mapSalesEntry(entry, idx + 1))
          : undefined,
        SprzedazCtrl: calculateSalesControl(salesEntries),
        ZakupWiersz: purchaseEntries.length > 0
          ? purchaseEntries.map((entry, idx) => mapPurchaseEntry(entry, idx + 1))
          : undefined,
        ZakupCtrl: calculatePurchaseControl(purchaseEntries),
      },
      
      Deklaracja: {
        Naglowek: {
          KodFormularzaDekl: {
            '@kodSystemowy': 'VAT-7 (21)',
            '@kodPodatku': 'VAT',
            '@rodzajZobowiazania': 'Z',
            '@wersjaSchemy': '1-0E',
            '#text': 'VAT-7'
          },
          WariantFormularzaDekl: '21',
          CelZlozenia: purpose === 1 ? '1' : '2',
          DataWytworzeniaDeklaracji: new Date().toISOString(),
          DataOd: dateFrom,
          DataDo: dateTo,
          KodUrzedu: '0000', // Must be provided by user
        },
        PozycjeSzczegolowe: calculateDeclaration(salesEntries, purchaseEntries),
        Pouczenia: '1',
      }
    }
  };
  
  return jpk;
}

/**
 * Map VAT register entry to sales entry
 */
function mapSalesEntry(entry: VatRegisterEntry, lineNumber: number): SalesEntry {
  const salesEntry: SalesEntry = {
    LpSprzedazy: lineNumber,
    NrKontrahenta: entry.counterpartyNip,
    NazwaKontrahenta: entry.counterpartyName,
    DowodSprzedazy: entry.documentNumber,
    DataWystawienia: entry.issueDate,
    DataSprzedazy: entry.saleDate,
  };
  
  // Map document type
  if (entry.documentType === 'RO') salesEntry.TypDokumentu = 'RO';
  else if (entry.documentType === 'WEW') salesEntry.TypDokumentu = 'WEW';
  
  // Map GTU codes
  if (entry.gtuCodes) {
    entry.gtuCodes.forEach(code => {
      salesEntry[code] = '1';
    });
  }
  
  // Map procedure markers
  if (entry.procedures) {
    mapProcedureMarkers(entry.procedures, salesEntry);
  }
  
  // Map amounts by VAT rate
  entry.amounts.forEach(amount => {
    mapSalesAmount(amount, salesEntry);
  });
  
  return salesEntry;
}

/**
 * Map VAT amount to sales entry fields
 */
function mapSalesAmount(amount: VatAmount, entry: SalesEntry): void {
  const net = formatAmount(amount.netAmount);
  const vat = formatAmount(amount.vatAmount);
  
  switch (amount.vatRate) {
    case '23':
      entry.K_10 = net;
      entry.K_11 = vat;
      break;
    case '8':
      entry.K_12 = net;
      entry.K_13 = vat;
      break;
    case '5':
      entry.K_14 = net;
      entry.K_15 = vat;
      break;
    case '0':
      if (amount.isIntraCommunity) {
        entry.K_16 = net;
      } else {
        entry.K_17 = net;
      }
      break;
    case 'zw':
      entry.K_18 = net;
      break;
    case 'np':
      entry.K_19 = net;
      break;
    case 'oo':
      entry.K_20 = net;
      break;
  }
  
  // Special cases for intra-community, import, etc.
  if (amount.isIntraCommunity) {
    entry.K_27 = net;
    entry.K_28 = vat;
  }
  
  if (amount.isImport) {
    entry.K_29 = net;
    entry.K_30 = vat;
  }
  
  if (amount.isReverseCharge) {
    entry.K_31 = net;
    entry.K_32 = vat;
  }
}

/**
 * Map procedure markers to entry
 */
function mapProcedureMarkers(markers: ProcedureMarkers, entry: SalesEntry | PurchaseEntry): void {
  if (markers.SW) entry.SW = '1';
  if (markers.EE) entry.EE = '1';
  if (markers.TP) entry.TP = '1';
  if (markers.TT_WNT) entry.TT_WNT = '1';
  if (markers.TT_D) entry.TT_D = '1';
  if (markers.MR_T) entry.MR_T = '1';
  if (markers.MR_UZ) entry.MR_UZ = '1';
  if (markers.I_42) entry.I_42 = '1';
  if (markers.I_63) entry.I_63 = '1';
  if (markers.B_SPV) entry.B_SPV = '1';
  if (markers.B_SPV_DOSTAWA && 'B_SPV_DOSTAWA' in entry) entry.B_SPV_DOSTAWA = '1';
  if (markers.B_MPV_PROWIZJA && 'B_MPV_PROWIZJA' in entry) entry.B_MPV_PROWIZJA = '1';
  if (markers.MPP) entry.MPP = '1';
}

/**
 * Map VAT register entry to purchase entry
 */
function mapPurchaseEntry(entry: VatRegisterEntry, lineNumber: number): PurchaseEntry {
  const purchaseEntry: PurchaseEntry = {
    LpZakupu: lineNumber,
    NrDostawcy: entry.counterpartyNip,
    NazwaDostawcy: entry.counterpartyName,
    DowodZakupu: entry.documentNumber,
    DataZakupu: entry.issueDate,
    DataWplywu: entry.receiptDate,
  };
  
  // Map document type
  if (entry.documentType === 'RO') purchaseEntry.TypDokumentu = 'RO';
  else if (entry.documentType === 'WEW') purchaseEntry.TypDokumentu = 'WEW';
  
  // Map amounts by VAT rate
  entry.amounts.forEach(amount => {
    mapPurchaseAmount(amount, purchaseEntry);
  });
  
  return purchaseEntry;
}

/**
 * Map VAT amount to purchase entry fields
 */
function mapPurchaseAmount(amount: VatAmount, entry: PurchaseEntry): void {
  const net = formatAmount(amount.netAmount);
  const vat = formatAmount(amount.vatAmount);
  
  switch (amount.vatRate) {
    case '23':
      entry.K_40 = net;
      entry.K_41 = vat;
      break;
    case '8':
      entry.K_42 = net;
      entry.K_43 = vat;
      break;
    case '5':
      entry.K_44 = net;
      entry.K_45 = vat;
      break;
    case '0':
      entry.K_46 = net;
      break;
    case 'zw':
      entry.K_47 = net;
      break;
    case 'np':
      entry.K_48 = net;
      break;
  }
  
  // Intra-community acquisition
  if (amount.isIntraCommunity) {
    entry.K_49 = net;
    entry.K_50 = vat;
  }
}

/**
 * Calculate sales control totals
 */
function calculateSalesControl(entries: VatRegisterEntry[]): SalesControl {
  const totalVat = entries.reduce((sum, entry) => sum + entry.totalVat, 0);
  
  return {
    LiczbaWierszySprzedazy: entries.length,
    PodatekNalezny: formatAmount(totalVat),
  };
}

/**
 * Calculate purchase control totals
 */
function calculatePurchaseControl(entries: VatRegisterEntry[]): PurchaseControl {
  const totalVat = entries.reduce((sum, entry) => sum + entry.totalVat, 0);
  
  return {
    LiczbaWierszyZakupow: entries.length,
    PodatekNaliczony: formatAmount(totalVat),
  };
}

/**
 * Calculate declaration (VAT-7) from register entries
 */
function calculateDeclaration(
  salesEntries: VatRegisterEntry[], 
  purchaseEntries: VatRegisterEntry[]
): DeclarationDetails {
  const declaration: DeclarationDetails = {};
  
  // Aggregate sales by VAT rate
  const salesByRate = aggregateByRate(salesEntries);
  const purchasesByRate = aggregateByRate(purchaseEntries);
  
  // Part C - Sales (output VAT)
  if (salesByRate['23']) {
    declaration.P_10 = formatAmount(salesByRate['23'].net);
    declaration.P_11 = formatAmount(salesByRate['23'].vat);
  }
  if (salesByRate['8']) {
    declaration.P_12 = formatAmount(salesByRate['8'].net);
    declaration.P_13 = formatAmount(salesByRate['8'].vat);
  }
  if (salesByRate['5']) {
    declaration.P_14 = formatAmount(salesByRate['5'].net);
    declaration.P_15 = formatAmount(salesByRate['5'].vat);
  }
  if (salesByRate['0']) {
    declaration.P_16 = formatAmount(salesByRate['0'].net);
  }
  if (salesByRate['zw']) {
    declaration.P_18 = formatAmount(salesByRate['zw'].net);
  }
  if (salesByRate['np']) {
    declaration.P_19 = formatAmount(salesByRate['np'].net);
  }
  
  // Calculate total output VAT (P_40)
  const totalOutputVat = salesEntries.reduce((sum, e) => sum + e.totalVat, 0);
  declaration.P_40 = formatAmount(totalOutputVat);
  
  // Part D - Purchases (input VAT)
  if (purchasesByRate['23']) {
    declaration.P_41 = formatAmount(purchasesByRate['23'].net);
    declaration.P_42 = formatAmount(purchasesByRate['23'].vat);
  }
  if (purchasesByRate['8']) {
    declaration.P_43 = formatAmount(purchasesByRate['8'].net);
    declaration.P_44 = formatAmount(purchasesByRate['8'].vat);
  }
  if (purchasesByRate['5']) {
    declaration.P_45 = formatAmount(purchasesByRate['5'].net);
    declaration.P_46 = formatAmount(purchasesByRate['5'].vat);
  }
  
  // Calculate total input VAT (P_54)
  const totalInputVat = purchaseEntries.reduce((sum, e) => sum + e.totalVat, 0);
  declaration.P_54 = formatAmount(totalInputVat);
  
  // Part E - Settlement
  const vatDifference = totalOutputVat - totalInputVat;
  if (vatDifference > 0) {
    declaration.P_60 = formatAmount(vatDifference); // VAT to pay
  } else if (vatDifference < 0) {
    declaration.P_61 = formatAmount(Math.abs(vatDifference)); // VAT refund
  }
  
  return declaration;
}

/**
 * Aggregate entries by VAT rate
 */
function aggregateByRate(entries: VatRegisterEntry[]): Record<string, { net: number; vat: number }> {
  const result: Record<string, { net: number; vat: number }> = {};
  
  entries.forEach(entry => {
    entry.amounts.forEach(amount => {
      if (!result[amount.vatRate]) {
        result[amount.vatRate] = { net: 0, vat: 0 };
      }
      result[amount.vatRate].net += amount.netAmount;
      result[amount.vatRate].vat += amount.vatAmount;
    });
  });
  
  return result;
}

/**
 * Format amount for JPK (2 decimal places)
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Validate generation request
 */
function validateRequest(request: JpkGenerationRequest): void {
  if (request.jpkType !== 'V7M') {
    throw new Error(`Invalid JPK type for V7M mapper: ${request.jpkType}`);
  }
  
  if (request.schemaVersion !== '3') {
    throw new Error(`Invalid schema version for V7M v3 mapper: ${request.schemaVersion}`);
  }
  
  if (request.companyProfile.vatStatus === 'exempt') {
    throw new Error('Cannot generate JPK_V7M for VAT-exempt company');
  }
  
  if (!request.period.match(/^\d{4}-\d{2}$/)) {
    throw new Error(`Invalid period format: ${request.period}. Expected YYYY-MM`);
  }
}
