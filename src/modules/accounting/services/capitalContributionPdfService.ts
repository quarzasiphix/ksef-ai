import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

// Helper function to convert Polish characters to ASCII equivalents for PDF
function normalizePolishChars(text: string): string {
  const charMap: { [key: string]: string } = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  
  return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (match) => charMap[match] || match);
}

interface CashContributionDeclarationData {
  companyName: string;
  companyAddress: string;
  companyNIP: string;
  companyKRS?: string;
  shareholderName: string;
  shareholderAddress?: string;
  shareholderPESEL?: string;
  amount: number;
  currency: string;
  contributionDate: string;
  cashRegisterName: string;
  boardMembers: string[];
  paymentMethod: 'cash' | 'bank';
  bankAccount?: string;
  transferReference?: string;
}

export async function generateCashContributionDeclaration(
  data: CashContributionDeclarationData
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = 20;

  // Generate document number: KWK/YYYY/MM/####
  const now = new Date();
  const docNumber = `KWK/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  // Helper function to add text with automatic line wrapping and Polish character support
  const addText = (text: string, fontSize: number = 11, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const normalizedText = normalizePolishChars(text);
    const lines = doc.splitTextToSize(normalizedText, contentWidth);
    
    if (align === 'center') {
      lines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth / 2, yPosition + (index * fontSize * 0.4), { align: 'center' });
      });
    } else {
      doc.text(lines, margin, yPosition);
    }
    yPosition += lines.length * (fontSize * 0.4) + 5;
  };

  // === HEADER ===
  addText('OSWIADCZENIE O WNIESIENIU WKLADU', 14, true, 'center');
  addText('NA KAPITAL ZAKLADOWY', 14, true, 'center');
  yPosition += 3;
  addText(`Numer dokumentu: ${docNumber}`, 9, false, 'center');
  yPosition += 8;

  // Company details
  addText(`Spolka: ${data.companyName}`, 11, true);
  addText(`Adres siedziby: ${data.companyAddress}`);
  addText(`NIP: ${data.companyNIP}${data.companyKRS ? `  KRS: ${data.companyKRS}` : ''}`);
  yPosition += 8;

  // Place and date
  const city = data.companyAddress.split(',')[0];
  addText(`Miejscowosc, data: ${city}, dnia ${format(new Date(data.contributionDate), 'dd.MM.yyyy')}`, 10);
  yPosition += 10;

  // === SECTION A: SHAREHOLDER STATEMENT ===
  addText('OSWIADCZENIE WSPOLNIKA', 12, true);
  yPosition += 3;
  
  addText('Ja, nizej podpisany/a:', 10);
  addText(`Imie i nazwisko: ${data.shareholderName}`, 10, true);
  if (data.shareholderAddress) {
    addText(`Adres: ${data.shareholderAddress}`, 10);
  }
  if (data.shareholderPESEL) {
    addText(`Identyfikator: PESEL ${data.shareholderPESEL}`, 10);
  }
  yPosition += 5;

  addText(
    `Oswiadczam, ze w dniu ${format(new Date(data.contributionDate), 'dd.MM.yyyy')} wnioslem/wnioslam wklad pieniezny na pokrycie kapitalu zakladowego spolki w kwocie:`,
    10
  );
  yPosition += 5;

  // Amount box
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, contentWidth, 15, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `${data.amount.toFixed(2)} ${data.currency}`,
    pageWidth / 2,
    yPosition + 10,
    { align: 'center' }
  );
  yPosition += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  addText('Tytul: "Wklad pieniezny na kapital zakladowy"', 10);
  addText('Podstawa: zobowiazanie wynikajace z umowy spolki / uchwaly wspolnikow', 10);
  yPosition += 5;

  // === PAYMENT METHOD ===
  addText('Sposob wniesienia wkladu:', 10, true);
  yPosition += 3;
  
  if (data.paymentMethod === 'cash') {
    addText('[X] Gotowka do kasy spolki', 10);
    addText(`    Kasa / rejestr kasowy: ${data.cashRegisterName}`, 10);
    addText('    Dowod KP nr: [do uzupelnienia po zaksiegowaniu]', 10);
    yPosition += 3;
    addText('[ ] Przelew bankowy', 10);
  } else {
    addText('[ ] Gotowka do kasy spolki', 10);
    yPosition += 3;
    addText('[X] Przelew bankowy', 10);
    if (data.bankAccount) {
      addText(`    Rachunek (IBAN): ${data.bankAccount}`, 10);
    }
    addText(`    Data przelewu: ${format(new Date(data.contributionDate), 'dd.MM.yyyy')}`, 10);
    if (data.transferReference) {
      addText(`    Tytul przelewu: ${data.transferReference}`, 10);
    }
  }
  yPosition += 8;

  addText(
    'Wklad zostaje przeznaczony na pokrycie objetych udzialow zgodnie z umowa spolki.',
    10
  );
  yPosition += 10;

  // === SECTION B: MANAGEMENT CONFIRMATION ===
  addText('POTWIERDZENIE ZARZADU', 12, true);
  yPosition += 3;

  const paymentMethodText = data.paymentMethod === 'cash' ? 'rejestr kasowy' : 'wyciag bankowy';
  addText(
    `Zarzad spolki potwierdza otrzymanie od wspolnika ${data.shareholderName} w dniu ${format(new Date(data.contributionDate), 'dd.MM.yyyy')} kwoty ${data.amount.toFixed(2)} ${data.currency} tytulem wkladu na kapital zakladowy.`,
    10
  );
  yPosition += 5;

  addText(
    `Oswiadczamy, ze wplata zostala ujeta w dokumentacji spolki (${paymentMethodText}) oraz w ewidencji ksiegowej.`,
    10
  );
  yPosition += 10;

  // === ATTACHMENTS ===
  addText('Zalaczniki:', 10, true);
  if (data.paymentMethod === 'cash') {
    addText('- Potwierdzenie KP (do dolaczenia)', 9);
  } else {
    addText('- Potwierdzenie przelewu', 9);
  }
  yPosition += 10;

  // === SIGNATURES ===
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  // Shareholder signature
  addText('Podpis wspolnika', 10, true);
  yPosition += 3;
  addText('Podpis: ___________________________', 9);
  addText('Data i czas podpisu: _______________', 9);
  addText('Metoda podpisu: kwalifikowany / zaufany / inna', 9);
  addText(`Id dokumentu: ${docNumber}`, 9);
  yPosition += 10;

  // Board signature
  if (data.boardMembers && data.boardMembers.length > 0) {
    addText('Podpis czlonkow zarzadu', 10, true);
    yPosition += 3;
    data.boardMembers.forEach((member) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      addText(normalizePolishChars(member), 9);
      addText('Podpis: ___________________________', 9);
      addText('Data i czas podpisu: _______________', 9);
      yPosition += 5;
    });
  } else {
    addText('Podpis czlonka zarzadu', 10, true);
    yPosition += 3;
    addText('Podpis: ___________________________', 9);
    addText('Data i czas podpisu: _______________', 9);
  }
  addText('Metoda podpisu: kwalifikowany / zaufany / inna', 9);
  addText(`Id dokumentu: ${docNumber}`, 9);
  yPosition += 10;

  // === FOOTER ===
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  yPosition = 280;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Dokument wygenerowany przez system KsiegaI - ${format(now, 'dd.MM.yyyy HH:mm:ss')} - ${docNumber}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  return doc.output('blob');
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
