import { Invoice, Expense, BusinessProfile } from "@/types/index";
// Import other necessary types if needed

// Placeholder interfaces for JPK_V7 structure
// NOTE: These are simplified placeholders and need to be aligned with the official JPK_V7 schema.

interface JpckHeader {
  KodFormularza: string;
  WariantFormularza: string;
  CelZlozenia: string;
  DataWytworzeniaJPK: string;
  NazwaSystemu?: string;
}

interface Podmiot1 {
  OsobaFizyczna?: { // For individuals
    NIP: string;
    ImiePierwsze: string;
    Nazwisko: string;
    DataUrodzenia: string; // Or other identifier
  };
  OsobaNiefizyczna?: { // For companies
    NIP: string;
    PelnaNazwa: string;
    REGON?: string;
  };
}

interface SprzedazWiersz {
  LpSprzedazy: number;
  KodKrajuNadaniaTIN?: string; // If applicable
  NrKontrahenta: string; // Customer VAT ID/NIP or other identifier
  NazwaKontrahenta: string; // Customer Name
  DowodSprzedazy: string; // Invoice number
  DataSprzedazy?: string; // Sell Date
  DataWystawienia: string; // Issue Date
  TypDokumentu?: 'FA' | 'KOREKTA' | 'ZAL'; // Document Type
  // Net and VAT values for different rates
  K_15?: number; // Net 5%
  K_16?: number; // VAT 5%
  K_17?: number; // Net 8%
  K_18?: number; // VAT 8%
  K_19?: number; // Net 23%
  K_20?: number; // VAT 23%
  K_21?: number; // Net 0% (delivery of goods, provision of services outside the country)
  K_22?: number; // Net 0% (intra-community supply of goods)
  K_23?: number; // Net ZW (VAT exempt)
  K_24?: number; // VAT for import of services
  K_25?: number; // Net for import of services
  K_26?: number; // VAT for intra-community acquisition of goods
  K_27?: number; // Net for intra-community acquisition of goods
  K_28?: number; // Net for supply of goods where the taxpayer is the buyer
  K_29?: number; // VAT for supply of goods where the taxpayer is the buyer
  K_30?: number; // Net for provision of services where the taxpayer is the buyer
  K_31?: number; // VAT for provision of services where the taxpayer is the buyer
  K_P_VAT?: number; // Sum of Net values (calculated)
  K_H_VAT?: number; // Sum of VAT values (calculated)
  // JPK_V7 Markers (Simplified - need specific logic based on transaction type/items)
  GTU_01?: number; // Goods and Services Grouping
  GTU_02?: number;
  // ... GTU_13
  SW?: number; // Intra-community supply of goods
  EE?: number; // Export of goods
  TP?: number; // Related party transactions
  TT_WNT?: number; // Intra-community acquisition of goods
  TT_D?: number; // Domestic supply of goods where the taxpayer is the buyer
  MR_T?: number; // Tourist services
  MR_UZ?: number; // Used goods, works of art, collector's items, antiques
  I_42?: number; // Import of services
  I_63?: number; // Import of goods on which VAT is accounted for under art. 33a of the VAT Act
  B_SPV?: number; // Supply of new means of transport
  B_TO?: number; // Supply of goods and services covered by art. 108a ust. 1a of the VAT Act
  MPP?: number; // Split payment mechanism
  VatMarza_TP?: number; // Supply of goods/services under margin scheme
  VatMarza_UZ?: number; // Supply of used goods under margin scheme
}

interface SprzedazCtrl {
  LiczbaWierszySprzedazy: number;
  PodatekNalezny?: number; // Total output VAT
}

interface ZakupWiersz {
  LpZakupu: number;
  KodKrajuNadaniaTIN?: string; // If applicable
  NrDostawcy: string; // Supplier VAT ID/NIP or other identifier
  NazwaDostawcy: string; // Supplier Name
  DowodZakupu: string; // Expense document number
  DataZakupu: string; // Expense Date
  DataWplywu?: string; // Date of Receipt (if different from DataZakupu)
  // Net and VAT values for different rates (simplified placeholders)
  K_40?: number; // Net for purchases (basic)
  K_41?: number; // VAT for purchases (basic)
  K_42?: number; // Net for intra-community acquisition of goods
  K_43?: number; // VAT for intra-community acquisition of goods
  K_44?: number; // Net for import of services
  K_45?: number; // VAT for import of services
  K_46?: number; // Net for import of goods (art. 33a)
  K_47?: number; // VAT for import of goods (art. 33a)
  K_P_VAT?: number; // Sum of Net values (calculated)
  K_H_VAT?: number; // Sum of VAT values (calculated)
  // JPK_V7 Markers (Simplified - need specific logic)
  MPP?: number; // Split payment mechanism
  IMP?: number; // Import of goods subject to customs procedure (excluding art. 33a)
}

interface ZakupCtrl {
  LiczbaWierszyZakupu: number;
  PodatekNaliczony?: number; // Total input VAT
}

// Simplified Deklaracja section (needs full schema details)
interface Deklaracja {
    CelZlozenia: string; // Same as Naglowek.CelZlozenia
    // ... other declaration fields based on schema
    P_33?: number; // Sum of K_15 to K_22 (Net Sales)
    P_34?: number; // Sum of K_24 to K_31 (Net Sales - special cases)
    P_35?: number; // Sum of K_16, K_18, K_20 (VAT Sales)
    P_36?: number; // Sum of K_24, K_26, K_28, K_30 (VAT Sales - special cases)
    P_37?: number; // Sum of K_40, K_42, K_44, K_46 (Net Purchases)
    P_38?: number; // Sum of K_40, K_42, K_44, K_46 (VAT Purchases)
    // ... many other fields
}

interface JPKV7 {
  Naglowek: JpckHeader;
  Podmiot1: Podmiot1;
  SprzedazWiersz: SprzedazWiersz[];
  SprzedazCtrl: SprzedazCtrl;
  ZakupWiersz: ZakupWiersz[];
  ZakupCtrl: ZakupCtrl;
  Deklaracja?: Deklaracja; // Add Declaration section
}

/**
 * Generates the data structure for JPK_V7 based on provided invoices, expenses, and business profile.
 * NOTE: This is a simplified implementation and needs significant refinement to match the official JPK_V7 schema (including specific markers, VAT breakdowns, and declaration fields).
 */
export function generateJpckV7Data(invoices: Invoice[], expenses: Expense[], businessProfile: BusinessProfile, period: { startDate: string, endDate: string }): JPKV7 | null {
  if (!businessProfile) {
    console.error("Business profile is required to generate JPK.");
    return null;
  }

  // Placeholder for JPK Header (needs proper data)
  const naglowek: JpckHeader = {
    KodFormularza: "JPK_V7", // Needs to be precise from schema
    WariantFormularza: "1", // Needs to be precise from schema (e.g., 1, 2)
    CelZlozenia: "1", // 1 for first submission, 2 for correction
    DataWytworzeniaJPK: new Date().toISOString(), // ISO 8601 including time and timezone if required by schema
    // NazwaSystemu: "Your System Name", // Optional, often recommended
  };

  // Placeholder for Podmiot1 (needs proper data from businessProfile)
  const podmiot1: Podmiot1 = {};
  if (businessProfile.taxId) { // Assuming NIP is always available for a business profile used for JPK
      podmiot1.OsobaNiefizyczna = { // Assuming non-individual entity
          NIP: businessProfile.taxId,
          PelnaNazwa: businessProfile.name,
          REGON: businessProfile.regon || undefined, // REGON is often required for companies
      };
      // Add logic for OsobaFizyczna if applicable to your users
  } else {
      console.error("Business profile is missing Tax ID (NIP), which is required for JPK.");
      return null; // NIP is mandatory for Podmiot1
  }

  // Process invoices for SprzedazWiersz
  const sprzedazWiersz: SprzedazWiersz[] = invoices.map((invoice, index) => {
    const row: SprzedazWiersz = {
      LpSprzedazy: index + 1,
      NrKontrahenta: invoice.buyer?.taxId || invoice.customerId || '', // Use buyer taxId or customerId, ensure string
      NazwaKontrahenta: invoice.buyer?.name || invoice.customerName || '', // Use buyer name or customerName, ensure string
      DowodSprzedazy: invoice.number || `invoice-${invoice.id}`, // Use invoice number, fall back to ID if missing
      DataSprzedazy: invoice.sellDate,
      DataWystawienia: invoice.issueDate,
      TypDokumentu: (invoice.type === 'sales' ? 'FA' : invoice.type === 'correction' ? 'KOREKTA' : undefined), // Map types
      // Initialize VAT breakdown fields
      K_15: 0, K_16: 0, K_17: 0, K_18: 0, K_19: 0, K_20: 0,
      K_21: 0, K_22: 0, K_23: 0,
      // K_24 to K_31 and corresponding VAT fields would need specific transaction type mapping

      K_P_VAT: 0, // Calculated sum of net values for this row
      K_H_VAT: 0, // Calculated sum of VAT values for this row
    };

    let rowTotalNet = 0;
    let rowTotalVat = 0;

    // Iterate through invoice items to break down by VAT rate
    invoice.items.forEach(item => {
        const netValue = item.totalNetValue || (item.unitPrice * item.quantity);
        const vatValue = item.totalVatValue || (netValue * (item.vatRate || 0) / 100);
        const vatRate = item.vatRate || 0; // Assuming vatRate is a number

        rowTotalNet += netValue;
        rowTotalVat += vatValue;

        // Map to appropriate K_ fields based on VAT rate
        switch (vatRate) {
            case 23:
                row.K_19 = (row.K_19 || 0) + netValue;
                row.K_20 = (row.K_20 || 0) + vatValue;
                break;
            case 8:
                row.K_17 = (row.K_17 || 0) + netValue;
                row.K_18 = (row.K_18 || 0) + vatValue;
                break;
            case 5:
                row.K_15 = (row.K_15 || 0) + netValue;
                row.K_16 = (row.K_16 || 0) + vatValue;
                break;
            case 0:
                // This K_ field is for specific cases like export/intra-community supply
                // Need specific logic to determine if K_21 or K_22 applies
                row.K_21 = (row.K_21 || 0) + netValue; // Placeholder, assuming K_21 for now
                break;
            case -1: // Assuming -1 indicates VAT exempt (ZW)
                row.K_23 = (row.K_23 || 0) + netValue;
                break;
            default:
                // Handle other VAT rates or errors, potentially log a warning
                console.warn("Unknown VAT rate encountered for invoice item:", item);
                row.K_21 = (row.K_21 || 0) + netValue; // Defaulting to K_21 for unknown rates without VAT
        }

        // *** JPK_V7 MARKERS PLACEHOLDER ***
        // This is crucial and needs to be implemented based on the type of goods/services (GTU) and transaction procedures (TP, SW, EE, etc.)
        // You would need to check invoice items or transaction details to apply these markers.
        // Example (Highly Simplified - needs real logic):
        // if (item.name.includes("electronics")) { row.GTU_06 = 1; }
        // if (invoice.buyer.country !== "PL") { row.SW = 1; } // Example for intra-community supply marker
        // ... implement logic for other markers based on your business needs and JPK schema ...

    });

    // Calculate total net and VAT for the row (should match invoice totals if items are correct)
    row.K_P_VAT = parseFloat(rowTotalNet.toFixed(2));
    row.K_H_VAT = parseFloat(rowTotalVat.toFixed(2));

    // Ensure calculated totals match invoice totals (basic check)
    if (Math.abs(row.K_P_VAT - invoice.totalNetValue) > 0.01 || Math.abs(row.K_H_VAT - invoice.totalVatValue) > 0.01) {
        console.warn("Calculated row totals do not match invoice totals for invoice:", invoice.number);
        // Decide how to handle discrepancies - maybe use invoice totals directly or log error
        // For now, sticking with calculated item totals for breakdown accuracy in rows
    }

    return row;
  });

  // Calculate SprzedazCtrl based on detailed row data
  const sprzedazCtrl: SprzedazCtrl = {
      LiczbaWierszySprzedazy: sprzedazWiersz.length,
      // Sum up the calculated VAT from each row for the total PodatekNalezny
      PodatekNalezny: parseFloat(sprzedazWiersz.reduce((sum, row) => sum + (row.K_H_VAT || 0), 0).toFixed(2)),
  };

  // Process expenses for ZakupWiersz
  const zakupWiersz: ZakupWiersz[] = expenses.map((expense, index) => {
      // Simplified mapping - the Expense type is basic and lacks VAT breakdown.
      // This section needs significant refinement if you have detailed expense data with VAT.
      return {
          LpZakupu: index + 1,
          NrDostawcy: '', // Supplier NIP often required - needs to be added to Expense type or fetched
          NazwaDostawcy: expense.description || `expense-${expense.id}`, // Using description as placeholder or a generic name
          DowodZakupu: `expense-${expense.id}`, // Using expense ID as document number placeholder
          DataZakupu: expense.issueDate,
          DataWplywu: expense.issueDate, // Assuming DataWplywu is the same as DataZakupu if not specified
          K_40: parseFloat(expense.amount.toFixed(2)), // Assuming amount is total/gross for now, needs clarification
          K_41: 0, // Placeholder for VAT, needs to be calculated/extracted if applicable
          K_P_VAT: parseFloat(expense.amount.toFixed(2)), // Simplified sum of net
          K_H_VAT: 0, // Simplified sum of VAT
          // *** JPK_V7 MARKERS PLACEHOLDER FOR PURCHASES ***
          // Implement logic for markers like MPP, IMP, etc. if applicable
      };
  });

  // Calculate ZakupCtrl (simplified)
  const zakupCtrl: ZakupCtrl = {
      LiczbaWierszyZakupu: zakupWiersz.length,
      // Sum up the placeholder VAT from each row for the total PodatekNaliczony
      PodatekNaliczony: parseFloat(zakupWiersz.reduce((sum, row) => sum + (row.K_H_VAT || 0), 0).toFixed(2)), // Simplified
  };

  // Simplified Deklaracja section calculation (needs full schema definition for all fields)
  const deklaracja: Deklaracja = {
      CelZlozenia: naglowek.CelZlozenia,
      P_33: parseFloat(sprzedazWiersz.reduce((sum, row) => sum + (row.K_15 || 0) + (row.K_17 || 0) + (row.K_19 || 0) + (row.K_21 || 0) + (row.K_22 || 0) + (row.K_23 || 0), 0).toFixed(2)), // Sum of Net Sales fields
      P_34: parseFloat(sprzedazWiersz.reduce((sum, row) => sum + (row.K_24 || 0) + (row.K_25 || 0) + (row.K_26 || 0) + (row.K_27 || 0) + (row.K_28 || 0) + (row.K_29 || 0) + (row.K_30 || 0) + (row.K_31 || 0), 0).toFixed(2)), // Sum of Net Sales - special cases (placeholder fields included)
      P_35: parseFloat(sprzedazWiersz.reduce((sum, row) => sum + (row.K_16 || 0) + (row.K_18 || 0) + (row.K_20 || 0), 0).toFixed(2)), // Sum of VAT Sales fields
      P_36: parseFloat(sprzedazWiersz.reduce((sum, row) => sum + (row.K_24 || 0) + (row.K_26 || 0) + (row.K_28 || 0) + (row.K_30 || 0), 0).toFixed(2)), // Sum of VAT Sales - special cases (placeholder fields included)
      P_37: parseFloat(zakupWiersz.reduce((sum, row) => sum + (row.K_40 || 0) + (row.K_42 || 0) + (row.K_44 || 0) + (row.K_46 || 0), 0).toFixed(2)), // Sum of Net Purchases fields
      P_38: parseFloat(zakupWiersz.reduce((sum, row) => sum + (row.K_40 || 0) + (row.K_42 || 0) + (row.K_44 || 0) + (row.K_46 || 0), 0).toFixed(2)), // Sum of VAT Purchases fields - NOTE: JPK has separate fields for VAT totals based on purchase type, this is a simplification
      // ... calculate other Deklaracja fields based on schema and data ...
  };

  // Construct the basic JPKV7 structure
  const jpkData: JPKV7 = {
      Naglowek: naglowek,
      Podmiot1: podmiot1,
      SprzedazWiersz: sprzedazWiersz,
      SprzedazCtrl: sprzedazCtrl,
      ZakupWiersz: zakupWiersz,
      ZakupCtrl: zakupCtrl,
      Deklaracja: deklaracja, // Include Deklaracja
  };

  console.log("Generated JPK V7 Data Structure (More Detailed Placeholder):", jpkData);

  return jpkData;
}

/**
 * Generates a basic XML string for JPK_V7 based on the provided data structure.
 * NOTE: This is a simplified XML generator and needs to be carefully reviewed and expanded
 * to precisely match the official JPK_V7 schema (element names, order, attributes, namespaces, etc.).
 * Using a dedicated XML building library is recommended for complex schemas.
 */
export function generateJpckV7Xml(jpkData: JPKV7): string | null {
    if (!jpkData) {
        console.error("No JPK data provided for XML generation.");
        return null;
    }

    console.log("Generating JPK V7 XML...");

    // Use the correct namespace and root element as per JPK_V7 schema
    let xmlString = '<JPK_V7 xmlns="http://crd.gov.pl/wzor/2021/11/12/11089/" xmlns:etd="http://crd.gov.pl/xml/ns/etd/2020/03/05/0745" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://crd.gov.pl/wzor/2021/11/12/11089/ http://crd.gov.pl/wzor/2021/11/12/11089/JPK_V7M_Wersja1_v1-0E.xsd">'; // Example schema location, verify with official schema

    // Header section
    xmlString += '<Naglowek>';
    xmlString += `<KodFormularza KodyURI="http://ksef.mf.gov.pl/schema/gtw/2021/01/01/schematglowny/" kodSystemowy="JPK_V7M (1)" wersjaSchemy="1-0E">${jpkData.Naglowek.KodFormularza}</KodFormularza>`; // Example attributes
    xmlString += `<WariantFormularza>${jpkData.Naglowek.WariantFormularza}</WariantFormularza>`;
    xmlString += `<CelZlozenia>${jpkData.Naglowek.CelZlozenia}</CelZlozenia>`;
    xmlString += `<DataWytworzeniaJPK>${jpkData.Naglowek.DataWytworzeniaJPK}</DataWytworzeniaJPK>`;
    if (jpkData.Naglowek.NazwaSystemu) {
        xmlString += `<NazwaSystemu>${escapeXml(jpkData.Naglowek.NazwaSystemu)}</NazwaSystemu>`;
    }
    // Add other required header fields from schema
    xmlString += '</Naglowek>';

    // Podmiot1 section
    xmlString += '<Podmiot1 rola="Podatnik">'; // Example role attribute
    if (jpkData.Podmiot1.OsobaNiefizyczna) {
        xmlString += '<OsobaNiefizyczna>';
        xmlString += `<NIP>${jpkData.Podmiot1.OsobaNiefizyczna.NIP}</NIP>`;
        xmlString += `<PelnaNazwa>${escapeXml(jpkData.Podmiot1.OsobaNiefizyczna.PelnaNazwa)}</PelnaNazwa>`;
        if (jpkData.Podmiot1.OsobaNiefizyczna.REGON) {
            xmlString += `<REGON>${jpkData.Podmiot1.OsobaNiefizyczna.REGON}</REGON>`;
        }
        xmlString += '</OsobaNiefizyczna>';
    } // Add OsobaFizyczna if needed
    xmlString += '</Podmiot1>';

    // SprzedazWiersz section
    xmlString += '<SprzedazWiersz>'; // This might need a different wrapping element based on schema (e.g., SprzedazWiersze)
    jpkData.SprzedazWiersz.forEach(row => {
        xmlString += '<SprzedazWiersz>'; // This element name might be singular or plural based on schema structure
        xmlString += `<LpSprzedazy>${row.LpSprzedazy}</LpSprzedazy>`;
        // Conditionally add KodKrajuNadaniaTIN if available and required by schema
        if (row.KodKrajuNadaniaTIN) {
            xmlString += `<KodKrajuNadaniaTIN>${escapeXml(row.KodKrajuNadaniaTIN)}</KodKrajuNadaniaTIN>`;
        }
        xmlString += `<NrKontrahenta>${escapeXml(row.NrKontrahenta)}</NrKontrahenta>`;
        xmlString += `<NazwaKontrahenta>${escapeXml(row.NazwaKontrahenta)}</NazwaKontrahenta>`;
        xmlString += `<DowodSprzedazy>${escapeXml(row.DowodSprzedazy)}</DowodSprzedazy>`;
        if (row.DataSprzedazy) {
             xmlString += `<DataSprzedazy>${row.DataSprzedazy}</DataSprzedazy>`;
        }
        xmlString += `<DataWystawienia>${row.DataWystawienia}</DataWystawienia>`;
        if (row.TypDokumentu) {
             xmlString += `<TypDokumentu>${row.TypDokumentu}</TypDokumentu>`;
        }

        // Add Net and VAT fields (only if value > 0 or required by schema even if zero)
        if (row.K_15 !== undefined && row.K_15 > 0) xmlString += `<K_15>${row.K_15.toFixed(2)}</K_15>`;
        if (row.K_16 !== undefined && row.K_16 > 0) xmlString += `<K_16>${row.K_16.toFixed(2)}</K_16>`;
        if (row.K_17 !== undefined && row.K_17 > 0) xmlString += `<K_17>${row.K_17.toFixed(2)}</K_17>`;
        if (row.K_18 !== undefined && row.K_18 > 0) xmlString += `<K_18>${row.K_18.toFixed(2)}</K_18>`;
        if (row.K_19 !== undefined && row.K_19 > 0) xmlString += `<K_19>${row.K_19.toFixed(2)}</K_19>`;
        if (row.K_20 !== undefined && row.K_20 > 0) xmlString += `<K_20>${row.K_20.toFixed(2)}</K_20>`;
        if (row.K_21 !== undefined && row.K_21 > 0) xmlString += `<K_21>${row.K_21.toFixed(2)}</K_21>`;
        if (row.K_22 !== undefined && row.K_22 > 0) xmlString += `<K_22>${row.K_22.toFixed(2)}</K_22>`;
        if (row.K_23 !== undefined && row.K_23 > 0) xmlString += `<K_23>${row.K_23.toFixed(2)}</K_23>`;
        // Add other K_ fields (K_24 to K_31) if they are mapped and have values

        // *** JPK_V7 MARKERS XML PLACEHOLDER ***
        // Add XML elements for markers here based on the row object and schema
        // Example:
        // if (row.GTU_06 === 1) { xmlString += '<GTU_06>1</GTU_06>'; }
        // if (row.SW === 1) { xmlString += '<SW>1</SW>'; }
        // ... add other markers ...

        xmlString += '</SprzedazWiersz>';
    });
     xmlString += '</SprzedazWiersz>'; // This closing tag might need adjustment based on schema (e.g., </SprzedazWiersze>)

    // SprzedazCtrl section
    xmlString += '<SprzedazCtrl>';
    xmlString += `<LiczbaWierszySprzedazy>${jpkData.SprzedazCtrl.LiczbaWierszySprzedazy}</LiczbaWierszySprzedazy>`;
    if (jpkData.SprzedazCtrl.PodatekNalezny !== undefined) {
        xmlString += `<PodatekNalezny>${jpkData.SprzedazCtrl.PodatekNalezny.toFixed(2)}</PodatekNalezny>`;
    }
    // Add other required SprzedazCtrl fields from schema
    xmlString += '</SprzedazCtrl>';

    // ZakupWiersz section
    xmlString += '<ZakupWiersz>'; // This might need a different wrapping element based on schema (e.g., ZakupWiersze)
     jpkData.ZakupWiersz.forEach(row => {
        xmlString += '<ZakupWiersz>'; // This element name might be singular or plural based on schema structure
        xmlString += `<LpZakupu>${row.LpZakupu}</LpZakupu>`;
         // Conditionally add KodKrajuNadaniaTIN if available and required by schema
        if (row.KodKrajuNadaniaTIN) {
            xmlString += `<KodKrajuNadaniaTIN>${escapeXml(row.KodKrajuNadaniaTIN)}</KodKrajuNadaniaTIN>`;
        }
        xmlString += `<NrDostawcy>${escapeXml(row.NrDostawcy)}</NrDostawcy>`;
        xmlString += `<NazwaDostawcy>${escapeXml(row.NazwaDostawcy)}</NazwaDostawcy>`;
        xmlString += `<DowodZakupu>${escapeXml(row.DowodZakupu)}</DowodZakupu>`;
        xmlString += `<DataZakupu>${row.DataZakupu}</DataZakupu>`;
         if (row.DataWplywu) {
            xmlString += `<DataWplywu>${row.DataWplywu}</DataWplywu>`;
        }

        // Add Net and VAT fields (only if value > 0 or required)
         if (row.K_40 !== undefined && row.K_40 > 0) xmlString += `<K_40>${row.K_40.toFixed(2)}</K_40>`;
         if (row.K_41 !== undefined && row.K_41 > 0) xmlString += `<K_41>${row.K_41.toFixed(2)}</K_41>`;
         // Add other K_ fields (K_42 to K_47) if they are mapped and have values

         // *** JPK_V7 MARKERS XML PLACEHOLDER FOR PURCHASES ***
        // Add XML elements for markers here based on the row object and schema
        // Example:
        // if (row.MPP === 1) { xmlString += '<MPP>1</MPP>'; }
        // ... add other markers ...

        xmlString += '</ZakupWiersz>';
    });
     xmlString += '</ZakupWiersz>'; // This closing tag might need adjustment based on schema (e.g., </ZakupWiersze>)

    // ZakupCtrl section
    xmlString += '<ZakupCtrl>';
    xmlString += `<LiczbaWierszyZakupu>${jpkData.ZakupCtrl.LiczbaWierszyZakupu}</LiczbaWierszyZakupu>`;
     if (jpkData.ZakupCtrl.PodatekNaliczony !== undefined) {
        xmlString += `<PodatekNaliczony>${jpkData.ZakupCtrl.PodatekNaliczony.toFixed(2)}</PodatekNaliczony>`;
    }
    // Add other required ZakupCtrl fields from schema
    xmlString += '</ZakupCtrl>';

    // Deklaracja section
     if (jpkData.Deklaracja) {
        xmlString += '<Deklaracja>'; // This might need a different wrapping element based on schema
        xmlString += `<CelZlozenia>${jpkData.Deklaracja.CelZlozenia}</CelZlozenia>`;
        // Add Deklaracja fields (P_33, P_34, etc.) if they exist and have values > 0 or are required even if 0
        if (jpkData.Deklaracja.P_33 !== undefined) xmlString += `<P_33>${jpkData.Deklaracja.P_33.toFixed(2)}</P_33>`; // Example
        if (jpkData.Deklaracja.P_35 !== undefined) xmlString += `<P_35>${jpkData.Deklaracja.P_35.toFixed(2)}</P_35>`; // Example
        // ... add all other Deklaracja fields as per schema ...

        xmlString += '</Deklaracja>'; // This closing tag might need adjustment based on schema
     }

    xmlString += '</JPK_V7>'; // Close the root element

    console.log("More Detailed Placeholder XML Generated:", xmlString);

    // Basic XML escaping function for attribute and element values
    function escapeXml(unsafe: string | number | undefined | null): string {
        if (unsafe === undefined || unsafe === null) return '';
        const safe = String(unsafe);
        return safe.replace(/[<>&\'\"/]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "'": return '&apos;';
                case '"': return '&quot;';
                case '/': return '/'; // Forward slash is generally safe in element content but good practice to escape in attributes
            }
            return c; // Should not happen
        });
    }

    return xmlString; // Return the generated XML string
} 