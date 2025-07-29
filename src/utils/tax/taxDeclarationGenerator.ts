import type { Invoice } from "@/types";

export interface TaxDeclarationData {
  month: string; // YYYY-MM
  businessProfileId: string;
  userId: string;
  invoices: Invoice[];
  totalIncome: number;
  totalExpenses: number;
  vatTotal: number;
}

export interface GeneratedDeclaration {
  xmlContent: string;
  fileName: string;
  declarationType: string;
}

export class TaxDeclarationGenerator {
  private data: TaxDeclarationData;

  constructor(data: TaxDeclarationData) {
    this.data = data;
  }

  /**
   * Generate JPK_V7M (monthly VAT declaration)
   */
  generateJPK_V7M(): GeneratedDeclaration {
    const { month, invoices, businessProfileId } = this.data;
    const [year, monthNum] = month.split('-');
    
    // Filter invoices for the month
    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.issueDate);
      return invDate.getFullYear() === parseInt(year) && 
             invDate.getMonth() === parseInt(monthNum) - 1;
    });

    const salesInvoices = monthInvoices.filter(inv => inv.transactionType === 'income');
    const purchaseInvoices = monthInvoices.filter(inv => inv.transactionType === 'expense');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<jpk:JPK xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2018/08/24/eD/DefinicjeTypy/"
         xmlns:jpk="http://jpk.mf.gov.pl/wzor/2019/09/27/09271/"
         xmlns:kck="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2016/01/25/eD/KodyCECHKRAJ/"
         xmlns:kol="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2013/05/28/eD/KodyCECHKRAJ/"
         xmlns:msForm="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2018/08/24/eD/DefinicjeTypy/"
         xmlns:os="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2009/01/21/eD/OsobyFizyczne/"
         xmlns:tns="http://jpk.mf.gov.pl/wzor/2019/09/27/09271/"
         xmlns:us="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2018/08/24/eD/DefinicjeTypy/"
         xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
         xsi:schemaLocation="http://jpk.mf.gov.pl/wzor/2019/09/27/09271/ http://jpk.mf.gov.pl/wzor/2019/09/27/09271/schemat.xsd"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <jpk:Naglowek>
    <jpk:KodFormularza kodSystemowy="JPK_V7M (1)" wersjaSchemy="1-0E">JPK_V7M</jpk:KodFormularza>
    <jpk:WariantFormularza>1</jpk:WariantFormularza>
    <jpk:DataWytworzeniaJPK>${new Date().toISOString()}</jpk:DataWytworzeniaJPK>
    <jpk:NazwaSystemu>KSEF-AI Tax System</jpk:NazwaSystemu>
    <jpk:CelZlozenia poz="P_7">1</jpk:CelZlozenia>
    <jpk:DataOd>${year}-${monthNum}-01</jpk:DataOd>
    <jpk:DataDo>${year}-${monthNum}-${new Date(parseInt(year), parseInt(monthNum), 0).getDate()}</jpk:DataDo>
    <jpk:DomyslnyKodWaluty>PLN</jpk:DomyslnyKodWaluty>
    <jpk:KodWaluty>PLN</jpk:KodWaluty>
    <jpk:P_1>${salesInvoices.length}</jpk:P_1>
    <jpk:P_2>${purchaseInvoices.length}</jpk:P_2>
  </jpk:Naglowek>
  
  <jpk:Podmiot1>
    <jpk:OsobaNiefizyczna>
      <jpk:NIP>1234567890</jpk:NIP>
      <jpk:PelnaNazwa>Nazwa Firmy</jpk:PelnaNazwa>
      <jpk:REGON>123456789</jpk:REGON>
    </jpk:OsobaNiefizyczna>
  </jpk:Podmiot1>
  
  <jpk:EwidencjaSprzedazy>
    ${salesInvoices.map(inv => `
    <jpk:SprzedazWiersz>
      <jpk:LpSprzedazy>${inv.id}</jpk:LpSprzedazy>
      <jpk:NrKontrahenta>${inv.customerId || 'BRAK'}</jpk:NrKontrahenta>
      <jpk:NazwaKontrahenta>${inv.buyer?.name || 'Kontrahent'}</jpk:NazwaKontrahenta>
      <jpk:AdresKontrahenta>
        <jpk:KodKraju>PL</jpk:KodKraju>
        <jpk:Wojewodztwo>MAZOWIECKIE</jpk:Wojewodztwo>
        <jpk:Powiat>WARSZAWA</jpk:Powiat>
        <jpk:Gmina>WARSZAWA</jpk:Gmina>
        <jpk:Ulica>ul. Przykładowa</jpk:Ulica>
        <jpk:NrDomu>1</jpk:NrDomu>
        <jpk:NrLokalu>1</jpk:NrLokalu>
        <jpk:Miejscowosc>Warszawa</jpk:Miejscowosc>
        <jpk:KodPocztowy>00-001</jpk:KodPocztowy>
        <jpk:Poczta>Warszawa</jpk:Poczta>
      </jpk:AdresKontrahenta>
      <jpk:DowodSprzedazy>${inv.number}</jpk:DowodSprzedazy>
      <jpk:DataWystawienia>${inv.issueDate}</jpk:DataWystawienia>
      <jpk:DataSprzedazy>${inv.sellDate || inv.issueDate}</jpk:DataSprzedazy>
      <jpk:K_10>${inv.totalNetValue}</jpk:K_10>
      <jpk:K_11>${inv.totalVatValue}</jpk:K_11>
      <jpk:K_12>${inv.totalGrossValue}</jpk:K_12>
      <jpk:K_13>${inv.totalNetValue}</jpk:K_13>
      <jpk:K_14>${inv.totalVatValue}</jpk:K_14>
      <jpk:K_15>${inv.totalGrossValue}</jpk:K_15>
      <jpk:K_16>0</jpk:K_16>
      <jpk:K_17>0</jpk:K_17>
      <jpk:K_18>0</jpk:K_18>
      <jpk:K_19>0</jpk:K_19>
      <jpk:K_20>0</jpk:K_20>
      <jpk:K_21>0</jpk:K_21>
      <jpk:K_22>0</jpk:K_22>
      <jpk:K_23>0</jpk:K_23>
      <jpk:K_24>0</jpk:K_24>
      <jpk:K_25>0</jpk:K_25>
      <jpk:K_26>0</jpk:K_26>
      <jpk:K_27>0</jpk:K_27>
      <jpk:K_28>0</jpk:K_28>
      <jpk:K_29>0</jpk:K_29>
      <jpk:K_30>0</jpk:K_30>
      <jpk:K_31>0</jpk:K_31>
      <jpk:K_32>0</jpk:K_32>
      <jpk:K_33>0</jpk:K_33>
      <jpk:K_34>0</jpk:K_34>
      <jpk:K_35>0</jpk:K_35>
      <jpk:K_36>0</jpk:K_36>
      <jpk:K_37>0</jpk:K_37>
      <jpk:K_38>0</jpk:K_38>
      <jpk:K_39>0</jpk:K_39>
      <jpk:LiczbaWierszySprzedazy>${inv.items?.length || 1}</jpk:LiczbaWierszySprzedazy>
      <jpk:PodatekInformacja>0</jpk:PodatekInformacja>
    </jpk:SprzedazWiersz>`).join('')}
  </jpk:EwidencjaSprzedazy>
  
  <jpk:EwidencjaZakupow>
    ${purchaseInvoices.map(inv => `
    <jpk:ZakupWiersz>
      <jpk:LpZakupu>${inv.id}</jpk:LpZakupu>
      <jpk:NrDostawcy>${inv.sellerId || 'BRAK'}</jpk:NrDostawcy>
      <jpk:NazwaDostawcy>${inv.seller?.name || 'Dostawca'}</jpk:NazwaDostawcy>
      <jpk:AdresDostawcy>
        <jpk:KodKraju>PL</jpk:KodKraju>
        <jpk:Wojewodztwo>MAZOWIECKIE</jpk:Wojewodztwo>
        <jpk:Powiat>WARSZAWA</jpk:Powiat>
        <jpk:Gmina>WARSZAWA</jpk:Gmina>
        <jpk:Ulica>ul. Przykładowa</jpk:Ulica>
        <jpk:NrDomu>1</jpk:NrDomu>
        <jpk:NrLokalu>1</jpk:NrLokalu>
        <jpk:Miejscowosc>Warszawa</jpk:Miejscowosc>
        <jpk:KodPocztowy>00-001</jpk:KodPocztowy>
        <jpk:Poczta>Warszawa</jpk:Poczta>
      </jpk:AdresDostawcy>
      <jpk:DowodZakupu>${inv.number}</jpk:DowodZakupu>
      <jpk:DataZakupu>${inv.issueDate}</jpk:DataZakupu>
      <jpk:DataWplywu>${inv.issueDate}</jpk:DataWplywu>
      <jpk:K_43>${inv.totalNetValue}</jpk:K_43>
      <jpk:K_44>${inv.totalVatValue}</jpk:K_44>
      <jpk:K_45>${inv.totalGrossValue}</jpk:K_45>
      <jpk:K_46>0</jpk:K_46>
      <jpk:K_47>0</jpk:K_47>
      <jpk:K_48>0</jpk:K_48>
      <jpk:K_49>0</jpk:K_49>
      <jpk:K_50>0</jpk:K_50>
      <jpk:LiczbaWierszyZakupow>${inv.items?.length || 1}</jpk:LiczbaWierszyZakupow>
      <jpk:PodatekNaliczony>0</jpk:PodatekNaliczony>
    </jpk:ZakupWiersz>`).join('')}
  </jpk:EwidencjaZakupow>
</jpk:JPK>`;

    return {
      xmlContent,
      fileName: `JPK_V7M_${month}.xml`,
      declarationType: 'JPK_V7M'
    };
  }

  /**
   * Generate PIT advance payment declaration
   */
  generatePITAdvance(): GeneratedDeclaration {
    const { month, totalIncome, totalExpenses } = this.data;
    const [year, monthNum] = month.split('-');
    
    const netIncome = totalIncome - totalExpenses;
    const taxRate = 0.19; // 19% PIT rate
    const monthlyTax = netIncome * taxRate;

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<PIT-4 xmlns="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2016/01/25/eD/PIT4/">
  <Naglowek>
    <KodFormularza kodSystemowy="PIT-4 (21)" wersjaSchemy="1-0E">PIT-4</KodFormularza>
    <WariantFormularza>21</WariantFormularza>
    <DataWytworzeniaJPK>${new Date().toISOString()}</DataWytworzeniaJPK>
    <NazwaSystemu>KSEF-AI Tax System</NazwaSystemu>
    <CelZlozenia poz="P_7">1</CelZlozenia>
    <DataOd>${year}-${monthNum}-01</DataOd>
    <DataDo>${year}-${monthNum}-${new Date(parseInt(year), parseInt(monthNum), 0).getDate()}</DataDo>
  </Naglowek>
  
  <Podmiot1>
    <OsobaFizyczna>
      <PESEL>12345678901</PESEL>
      <ImiePierwsze>Jan</ImiePierwsze>
      <Nazwisko>Kowalski</Nazwisko>
      <DataUrodzenia>1990-01-01</DataUrodzenia>
      <KodKraju>PL</KodKraju>
      <Wojewodztwo>MAZOWIECKIE</Wojewodztwo>
      <Powiat>WARSZAWA</Powiat>
      <Gmina>WARSZAWA</Gmina>
      <Ulica>ul. Przykładowa</Ulica>
      <NrDomu>1</NrDomu>
      <NrLokalu>1</NrLokalu>
      <Miejscowosc>Warszawa</Miejscowosc>
      <KodPocztowy>00-001</KodPocztowy>
      <Poczta>Warszawa</Poczta>
    </OsobaFizyczna>
  </Podmiot1>
  
  <PIT4>
    <P_1>${totalIncome.toFixed(2)}</P_1>
    <P_2>${totalExpenses.toFixed(2)}</P_2>
    <P_3>${netIncome.toFixed(2)}</P_3>
    <P_4>${monthlyTax.toFixed(2)}</P_4>
    <P_5>0.00</P_5>
    <P_6>${monthlyTax.toFixed(2)}</P_6>
  </PIT4>
</PIT-4>`;

    return {
      xmlContent,
      fileName: `PIT_zaliczka_${month}.xml`,
      declarationType: 'PIT_zaliczka'
    };
  }

  /**
   * Generate ZUS DRA declaration
   */
  generateZUSDRA(): GeneratedDeclaration {
    const { month, totalIncome } = this.data;
    const [year, monthNum] = month.split('-');
    
    // Simplified ZUS calculation (in real scenario, this would be more complex)
    const socialInsurance = totalIncome * 0.0976; // 9.76% social insurance
    const healthInsurance = totalIncome * 0.09; // 9% health insurance

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<DRA xmlns="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2016/01/25/eD/DRA/">
  <Naglowek>
    <KodFormularza kodSystemowy="DRA (1)" wersjaSchemy="1-0E">DRA</KodFormularza>
    <WariantFormularza>1</WariantFormularza>
    <DataWytworzeniaJPK>${new Date().toISOString()}</DataWytworzeniaJPK>
    <NazwaSystemu>KSEF-AI Tax System</NazwaSystemu>
    <CelZlozenia poz="P_7">1</CelZlozenia>
    <DataOd>${year}-${monthNum}-01</DataOd>
    <DataDo>${year}-${monthNum}-${new Date(parseInt(year), parseInt(monthNum), 0).getDate()}</DataDo>
  </Naglowek>
  
  <Podmiot1>
    <OsobaFizyczna>
      <PESEL>12345678901</PESEL>
      <ImiePierwsze>Jan</ImiePierwsze>
      <Nazwisko>Kowalski</Nazwisko>
      <DataUrodzenia>1990-01-01</DataUrodzenia>
      <KodKraju>PL</KodKraju>
      <Wojewodztwo>MAZOWIECKIE</Wojewodztwo>
      <Powiat>WARSZAWA</Powiat>
      <Gmina>WARSZAWA</Gmina>
      <Ulica>ul. Przykładowa</Ulica>
      <NrDomu>1</NrDomu>
      <NrLokalu>1</NrLokalu>
      <Miejscowosc>Warszawa</Miejscowosc>
      <KodPocztowy>00-001</KodPocztowy>
      <Poczta>Warszawa</Poczta>
    </OsobaFizyczna>
  </Podmiot1>
  
  <DRA>
    <P_1>${totalIncome.toFixed(2)}</P_1>
    <P_2>${socialInsurance.toFixed(2)}</P_2>
    <P_3>${healthInsurance.toFixed(2)}</P_3>
    <P_4>${(socialInsurance + healthInsurance).toFixed(2)}</P_4>
  </DRA>
</DRA>`;

    return {
      xmlContent,
      fileName: `ZUS_DRA_${month}.xml`,
      declarationType: 'ZUS_DRA'
    };
  }

  /**
   * Generate declaration based on type
   */
  generateDeclaration(type: string): GeneratedDeclaration {
    switch (type) {
      case 'JPK_V7M':
        return this.generateJPK_V7M();
      case 'PIT zaliczka':
        return this.generatePITAdvance();
      case 'Deklaracja ZUS (DRA)':
        return this.generateZUSDRA();
      default:
        throw new Error(`Unsupported declaration type: ${type}`);
    }
  }
}

/**
 * Helper function to create a tax declaration generator
 */
export function createTaxDeclarationGenerator(data: TaxDeclarationData): TaxDeclarationGenerator {
  return new TaxDeclarationGenerator(data);
} 