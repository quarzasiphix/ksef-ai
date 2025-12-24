/**
 * JPK_V7M Version 3 XML Generator
 * 
 * Generates XML from JPK_V7M structure using xmlbuilder2
 */

import { create } from 'xmlbuilder2';
import { JpkV7M } from './types';

/**
 * Generate XML string from JPK_V7M structure
 */
export function generateXml(jpk: JpkV7M): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele(jpk.JPK);
  
  const xml = doc.end({ 
    prettyPrint: true,
    headless: false,
  });
  
  return xml;
}

/**
 * Generate XML with proper namespace declarations
 * This ensures the XML is valid according to MF schemas
 */
export function generateValidatedXml(jpk: JpkV7M): string {
  // Create root element with namespaces
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('JPK', {
      'xmlns': jpk.JPK['@xmlns'],
      'xmlns:etd': jpk.JPK['@xmlns:etd'],
    });
  
  // Add Naglowek (Header)
  const naglowek = root.ele('Naglowek');
  const kodFormularza = naglowek.ele('KodFormularza', {
    'kodSystemowy': jpk.JPK.Naglowek.KodFormularza['@kodSystemowy'],
    'wersjaSchemy': jpk.JPK.Naglowek.KodFormularza['@wersjaSchemy'],
  });
  kodFormularza.txt(jpk.JPK.Naglowek.KodFormularza['#text']);
  
  naglowek.ele('WariantFormularza').txt(jpk.JPK.Naglowek.WariantFormularza);
  naglowek.ele('CelZlozenia').txt(jpk.JPK.Naglowek.CelZlozenia);
  naglowek.ele('DataWytworzeniaJPK').txt(jpk.JPK.Naglowek.DataWytworzeniaJPK);
  naglowek.ele('DataOd').txt(jpk.JPK.Naglowek.DataOd);
  naglowek.ele('DataDo').txt(jpk.JPK.Naglowek.DataDo);
  
  if (jpk.JPK.Naglowek.NazwaSystemu) {
    naglowek.ele('NazwaSystemu').txt(jpk.JPK.Naglowek.NazwaSystemu);
  }
  if (jpk.JPK.Naglowek.KodUrzedu) {
    naglowek.ele('KodUrzedu').txt(jpk.JPK.Naglowek.KodUrzedu);
  }
  
  // Add Podmiot1 (Subject)
  const podmiot = root.ele('Podmiot1');
  podmiot.ele('NIP').txt(jpk.JPK.Podmiot1.NIP);
  podmiot.ele('PelnaNazwa').txt(jpk.JPK.Podmiot1.PelnaNazwa);
  if (jpk.JPK.Podmiot1.REGON) {
    podmiot.ele('REGON').txt(jpk.JPK.Podmiot1.REGON);
  }
  if (jpk.JPK.Podmiot1.Email) {
    podmiot.ele('Email').txt(jpk.JPK.Podmiot1.Email);
  }
  
  // Add PozycjeSzczegolowe (Detailed Entries)
  if (jpk.JPK.PozycjeSzczegolowe) {
    // Sales entries
    if (jpk.JPK.PozycjeSzczegolowe.SprzedazWiersz) {
      jpk.JPK.PozycjeSzczegolowe.SprzedazWiersz.forEach(entry => {
        const wiersz = root.ele('SprzedazWiersz');
        addSalesEntry(wiersz, entry);
      });
    }
    
    // Sales control
    const sprzedazCtrl = root.ele('SprzedazCtrl');
    sprzedazCtrl.ele('LiczbaWierszySprzedazy').txt(
      String(jpk.JPK.PozycjeSzczegolowe.SprzedazCtrl.LiczbaWierszySprzedazy)
    );
    sprzedazCtrl.ele('PodatekNalezny').txt(
      jpk.JPK.PozycjeSzczegolowe.SprzedazCtrl.PodatekNalezny
    );
    
    // Purchase entries
    if (jpk.JPK.PozycjeSzczegolowe.ZakupWiersz) {
      jpk.JPK.PozycjeSzczegolowe.ZakupWiersz.forEach(entry => {
        const wiersz = root.ele('ZakupWiersz');
        addPurchaseEntry(wiersz, entry);
      });
    }
    
    // Purchase control
    const zakupCtrl = root.ele('ZakupCtrl');
    zakupCtrl.ele('LiczbaWierszyZakupow').txt(
      String(jpk.JPK.PozycjeSzczegolowe.ZakupCtrl.LiczbaWierszyZakupow)
    );
    zakupCtrl.ele('PodatekNaliczony').txt(
      jpk.JPK.PozycjeSzczegolowe.ZakupCtrl.PodatekNaliczony
    );
  }
  
  // Add Deklaracja (Declaration)
  const deklaracja = root.ele('Deklaracja');
  
  // Declaration header
  const naglowekDekl = deklaracja.ele('Naglowek');
  const kodFormularzaDekl = naglowekDekl.ele('KodFormularzaDekl', {
    'kodSystemowy': jpk.JPK.Deklaracja.Naglowek.KodFormularzaDekl['@kodSystemowy'],
    'kodPodatku': jpk.JPK.Deklaracja.Naglowek.KodFormularzaDekl['@kodPodatku'],
    'rodzajZobowiazania': jpk.JPK.Deklaracja.Naglowek.KodFormularzaDekl['@rodzajZobowiazania'],
    'wersjaSchemy': jpk.JPK.Deklaracja.Naglowek.KodFormularzaDekl['@wersjaSchemy'],
  });
  kodFormularzaDekl.txt(jpk.JPK.Deklaracja.Naglowek.KodFormularzaDekl['#text']);
  
  naglowekDekl.ele('WariantFormularzaDekl').txt(jpk.JPK.Deklaracja.Naglowek.WariantFormularzaDekl);
  naglowekDekl.ele('CelZlozenia').txt(jpk.JPK.Deklaracja.Naglowek.CelZlozenia);
  naglowekDekl.ele('DataWytworzeniaDeklaracji').txt(jpk.JPK.Deklaracja.Naglowek.DataWytworzeniaDeklaracji);
  naglowekDekl.ele('DataOd').txt(jpk.JPK.Deklaracja.Naglowek.DataOd);
  naglowekDekl.ele('DataDo').txt(jpk.JPK.Deklaracja.Naglowek.DataDo);
  naglowekDekl.ele('KodUrzedu').txt(jpk.JPK.Deklaracja.Naglowek.KodUrzedu);
  
  // Declaration details
  const pozycje = deklaracja.ele('PozycjeSzczegolowe');
  addDeclarationFields(pozycje, jpk.JPK.Deklaracja.PozycjeSzczegolowe);
  
  // Pouczenia
  deklaracja.ele('Pouczenia').txt(jpk.JPK.Deklaracja.Pouczenia);
  
  return root.end({ 
    prettyPrint: true,
    headless: false,
  });
}

/**
 * Add sales entry fields to XML element
 */
function addSalesEntry(element: any, entry: any): void {
  element.ele('LpSprzedazy').txt(String(entry.LpSprzedazy));
  
  if (entry.NrKontrahenta) element.ele('NrKontrahenta').txt(entry.NrKontrahenta);
  if (entry.NazwaKontrahenta) element.ele('NazwaKontrahenta').txt(entry.NazwaKontrahenta);
  if (entry.AdresKontrahenta) element.ele('AdresKontrahenta').txt(entry.AdresKontrahenta);
  
  element.ele('DowodSprzedazy').txt(entry.DowodSprzedazy);
  element.ele('DataWystawienia').txt(entry.DataWystawienia);
  
  if (entry.DataSprzedazy) element.ele('DataSprzedazy').txt(entry.DataSprzedazy);
  if (entry.TypDokumentu) element.ele('TypDokumentu').txt(entry.TypDokumentu);
  
  // GTU codes
  for (let i = 1; i <= 13; i++) {
    const gtuKey = `GTU_${String(i).padStart(2, '0')}`;
    if (entry[gtuKey]) element.ele(gtuKey).txt('1');
  }
  
  // Procedure markers
  const markers = ['SW', 'EE', 'TP', 'TT_WNT', 'TT_D', 'MR_T', 'MR_UZ', 'I_42', 'I_63', 
                   'B_SPV', 'B_SPV_DOSTAWA', 'B_MPV_PROWIZJA', 'MPP'];
  markers.forEach(marker => {
    if (entry[marker]) element.ele(marker).txt('1');
  });
  
  // Amount fields (K_10 through K_39)
  for (let i = 10; i <= 39; i++) {
    const key = `K_${i}`;
    if (entry[key]) element.ele(key).txt(entry[key]);
  }
}

/**
 * Add purchase entry fields to XML element
 */
function addPurchaseEntry(element: any, entry: any): void {
  element.ele('LpZakupu').txt(String(entry.LpZakupu));
  
  if (entry.NrDostawcy) element.ele('NrDostawcy').txt(entry.NrDostawcy);
  if (entry.NazwaDostawcy) element.ele('NazwaDostawcy').txt(entry.NazwaDostawcy);
  if (entry.AdresDostawcy) element.ele('AdresDostawcy').txt(entry.AdresDostawcy);
  
  element.ele('DowodZakupu').txt(entry.DowodZakupu);
  element.ele('DataZakupu').txt(entry.DataZakupu);
  
  if (entry.DataWplywu) element.ele('DataWplywu').txt(entry.DataWplywu);
  if (entry.TypDokumentu) element.ele('TypDokumentu').txt(entry.TypDokumentu);
  
  if (entry.IMP) element.ele('IMP').txt('1');
  
  // Amount fields (K_40 through K_50)
  for (let i = 40; i <= 50; i++) {
    const key = `K_${i}`;
    if (entry[key]) element.ele(key).txt(entry[key]);
  }
}

/**
 * Add declaration fields to XML element
 */
function addDeclarationFields(element: any, details: any): void {
  // Add all P_XX fields
  for (let i = 10; i <= 69; i++) {
    const key = `P_${i}`;
    if (details[key]) element.ele(key).txt(details[key]);
  }
  
  // Special fields
  if (details.P_ORDZU) element.ele('P_ORDZU').txt(details.P_ORDZU);
}
