/**
 * JPK_V7M Schema Version 3 Types
 * 
 * Official schema for monthly VAT register (JPK_V7M)
 * Based on: http://crd.gov.pl/wzor/2021/12/13/11149/
 * 
 * This file contains TypeScript types matching the official XSD schema.
 */

/**
 * Root JPK_V7M structure
 */
export interface JpkV7M {
  'JPK': {
    '@xmlns': 'http://jpk.mf.gov.pl/wzor/2022/02/17/02171/';
    '@xmlns:etd': 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eDeklaracja/';
    
    Naglowek: JpkHeader;
    Podmiot1: JpkSubject;
    PozycjeSzczegolowe?: JpkDetailedEntries;
    Deklaracja: JpkDeclaration;
  };
}

/**
 * Header (Nagłówek)
 */
export interface JpkHeader {
  KodFormularza: {
    '@kodSystemowy': 'JPK_V7M (3)';
    '@wersjaSchemy': '1-0';
    '#text': 'JPK_VAT';
  };
  WariantFormularza: '3'; // Version 3
  CelZlozenia: '1' | '2'; // 1 = złożenie, 2 = korekta
  DataWytworzeniaJPK: string; // ISO datetime
  DataOd: string; // YYYY-MM-DD
  DataDo: string; // YYYY-MM-DD
  NazwaSystemu?: string;
  KodUrzedu?: string; // Tax office code
}

/**
 * Subject (Podmiot1) - Company/Taxpayer
 */
export interface JpkSubject {
  NIP: string;
  PelnaNazwa: string;
  REGON?: string;
  Email?: string;
}

/**
 * Detailed Entries (PozycjeSzczegolowe)
 * Contains sales and purchase registers
 */
export interface JpkDetailedEntries {
  SprzedazWiersz?: SalesEntry[];
  SprzedazCtrl: SalesControl;
  ZakupWiersz?: PurchaseEntry[];
  ZakupCtrl: PurchaseControl;
}

/**
 * Sales Register Entry (SprzedazWiersz)
 */
export interface SalesEntry {
  LpSprzedazy: number; // Sequential number
  NrKontrahenta?: string; // Customer NIP/VAT ID
  NazwaKontrahenta?: string; // Customer name
  AdresKontrahenta?: string; // Customer address
  DowodSprzedazy: string; // Invoice number
  DataWystawienia: string; // YYYY-MM-DD
  DataSprzedazy?: string; // YYYY-MM-DD
  TypDokumentu?: 'RO' | 'WEW' | 'FP'; // Document type
  
  // GTU codes (Grouping of goods and services)
  GTU_01?: '1';
  GTU_02?: '1';
  GTU_03?: '1';
  GTU_04?: '1';
  GTU_05?: '1';
  GTU_06?: '1';
  GTU_07?: '1';
  GTU_08?: '1';
  GTU_09?: '1';
  GTU_10?: '1';
  GTU_11?: '1';
  GTU_12?: '1';
  GTU_13?: '1';
  
  // Procedure markers
  SW?: '1';      // Intra-community supply
  EE?: '1';      // Export
  TP?: '1';      // Related party
  TT_WNT?: '1';  // Intra-community acquisition
  TT_D?: '1';    // Domestic reverse charge
  MR_T?: '1';    // Tourist margin scheme
  MR_UZ?: '1';   // Used goods margin scheme
  I_42?: '1';    // Import of services
  I_63?: '1';    // Import of goods
  B_SPV?: '1';   // New means of transport
  B_SPV_DOSTAWA?: '1';
  B_MPV_PROWIZJA?: '1';
  MPP?: '1';     // Split payment
  
  // Amounts by VAT rate (all optional, use only applicable ones)
  K_10?: string; // Net 23%
  K_11?: string; // VAT 23%
  K_12?: string; // Net 8%
  K_13?: string; // VAT 8%
  K_14?: string; // Net 5%
  K_15?: string; // VAT 5%
  K_16?: string; // Net 0% (export, intra-community)
  K_17?: string; // Net 0% (other)
  K_18?: string; // Net exempt (zwolniona)
  K_19?: string; // Net not subject (nie podlega)
  K_20?: string; // Net reverse charge (odwrotne obciążenie)
  K_21?: string; // Net margin scheme - tourist services
  K_22?: string; // Net margin scheme - used goods
  K_23?: string; // Net margin scheme - works of art
  K_24?: string; // Net margin scheme - collector's items
  K_25?: string; // Net margin scheme - antiques
  K_26?: string; // Net special procedures
  K_27?: string; // Net intra-community acquisition
  K_28?: string; // VAT intra-community acquisition
  K_29?: string; // Net import of services
  K_30?: string; // VAT import of services
  K_31?: string; // Net domestic reverse charge
  K_32?: string; // VAT domestic reverse charge
  K_33?: string; // Net import of goods (art. 33a)
  K_34?: string; // VAT import of goods (art. 33a)
  K_35?: string; // Net new means of transport
  K_36?: string; // VAT new means of transport
  K_37?: string; // Net delivery of buildings
  K_38?: string; // VAT delivery of buildings
  K_39?: string; // Net other
}

/**
 * Sales Control (SprzedazCtrl)
 * Summary of sales register
 */
export interface SalesControl {
  LiczbaWierszySprzedazy: number; // Number of sales entries
  PodatekNalezny: string; // Total output VAT
}

/**
 * Purchase Register Entry (ZakupWiersz)
 */
export interface PurchaseEntry {
  LpZakupu: number; // Sequential number
  NrDostawcy?: string; // Supplier NIP/VAT ID
  NazwaDostawcy?: string; // Supplier name
  AdresDostawcy?: string; // Supplier address
  DowodZakupu: string; // Purchase document number
  DataZakupu: string; // YYYY-MM-DD
  DataWplywu?: string; // YYYY-MM-DD (receipt date)
  TypDokumentu?: 'RO' | 'WEW' | 'MK'; // Document type
  
  // Procedure markers (similar to sales)
  IMP?: '1';     // Import
  
  // Amounts by VAT rate
  K_40?: string; // Net 23%
  K_41?: string; // VAT 23%
  K_42?: string; // Net 8%
  K_43?: string; // VAT 8%
  K_44?: string; // Net 5%
  K_45?: string; // VAT 5%
  K_46?: string; // Net 0%
  K_47?: string; // Net exempt
  K_48?: string; // Net not subject
  K_49?: string; // Net intra-community acquisition
  K_50?: string; // VAT intra-community acquisition
}

/**
 * Purchase Control (ZakupCtrl)
 * Summary of purchase register
 */
export interface PurchaseControl {
  LiczbaWierszyZakupow: number; // Number of purchase entries
  PodatekNaliczony: string; // Total input VAT
}

/**
 * Declaration (Deklaracja)
 * VAT-7 declaration data
 */
export interface JpkDeclaration {
  Naglowek: DeclarationHeader;
  PozycjeSzczegolowe: DeclarationDetails;
  Pouczenia: '1'; // Always '1'
}

export interface DeclarationHeader {
  KodFormularzaDekl: {
    '@kodSystemowy': 'VAT-7 (21)';
    '@kodPodatku': 'VAT';
    '@rodzajZobowiazania': 'Z';
    '@wersjaSchemy': '1-0E';
    '#text': 'VAT-7';
  };
  WariantFormularzaDekl: '21';
  CelZlozenia: '1' | '2'; // 1 = złożenie, 2 = korekta
  DataWytworzeniaDeklaracji: string; // ISO datetime
  DataOd: string; // YYYY-MM-DD
  DataDo: string; // YYYY-MM-DD
  KodUrzedu: string; // Tax office code
}

export interface DeclarationDetails {
  // Part C - VAT calculation
  P_10?: string;  // Sales 23%
  P_11?: string;  // VAT 23%
  P_12?: string;  // Sales 8%
  P_13?: string;  // VAT 8%
  P_14?: string;  // Sales 5%
  P_15?: string;  // VAT 5%
  P_16?: string;  // Sales 0% (export, intra-community)
  P_17?: string;  // Sales 0% (other)
  P_18?: string;  // Sales exempt
  P_19?: string;  // Sales not subject
  P_20?: string;  // Sales reverse charge
  P_21?: string;  // Sales margin scheme - tourist
  P_22?: string;  // Sales margin scheme - used goods
  P_23?: string;  // Sales margin scheme - works of art
  P_24?: string;  // Sales margin scheme - collector's items
  P_25?: string;  // Sales margin scheme - antiques
  P_26?: string;  // Sales special procedures
  P_27?: string;  // Intra-community acquisition
  P_28?: string;  // VAT intra-community acquisition
  P_29?: string;  // Import of services
  P_30?: string;  // VAT import of services
  P_31?: string;  // Domestic reverse charge
  P_32?: string;  // VAT domestic reverse charge
  P_33?: string;  // Import of goods (art. 33a)
  P_34?: string;  // VAT import of goods (art. 33a)
  P_35?: string;  // New means of transport
  P_36?: string;  // VAT new means of transport
  P_37?: string;  // Delivery of buildings
  P_38?: string;  // VAT delivery of buildings
  P_39?: string;  // Other
  P_40?: string;  // Total output VAT (sum)
  
  // Part D - VAT deduction
  P_41?: string;  // Purchase 23%
  P_42?: string;  // VAT 23%
  P_43?: string;  // Purchase 8%
  P_44?: string;  // VAT 8%
  P_45?: string;  // Purchase 5%
  P_46?: string;  // VAT 5%
  P_47?: string;  // Purchase 0%
  P_48?: string;  // Purchase exempt
  P_49?: string;  // Purchase not subject
  P_50?: string;  // Intra-community acquisition
  P_51?: string;  // VAT intra-community acquisition
  P_52?: string;  // Import of services
  P_53?: string;  // VAT import of services
  P_54?: string;  // Total input VAT (sum)
  
  // Part E - Settlement
  P_60?: string;  // VAT payable (P_40 - P_54)
  P_61?: string;  // VAT refund (P_54 - P_40)
  
  // Part F - Additional information
  P_62?: string;  // Proportional deduction percentage
  P_ORDZU?: '1'; // Special procedures
  
  // Metadata
  P_68?: string;  // Taxpayer/representative
  P_69?: string;  // Date
}
