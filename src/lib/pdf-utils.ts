
import { generatePdf } from 'react-to-pdf';
import { Invoice } from '@/types';
import { formatPolishDate, formatCurrency } from '@/lib/invoice-utils';

// Options for PDF generation
const defaultOptions = {
  filename: 'faktura.pdf',
  page: {
    margin: 20,
    format: 'a4',
  },
  canvas: {
    mimeType: 'image/png' as 'image/png', // Type assertion to ensure correct literal type
    qualityRatio: 1
  }
};

// Generate PDF from an element
export const generateElementPdf = async (
  element: HTMLElement, 
  options = {}
) => {
  try {
    await generatePdf(
      () => element, 
      { ...defaultOptions, ...options }
    );
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

// Generate PDF filename based on invoice
export const getInvoiceFileName = (invoice: Invoice): string => {
  const { number, type } = invoice;
  
  let prefix = '';
  switch (type) {
    case 'sales': prefix = 'Faktura_VAT'; break;
    case 'receipt': prefix = 'Rachunek'; break;
    case 'proforma': prefix = 'Proforma'; break;
    case 'correction': prefix = 'Korekta'; break;
    default: prefix = 'Dokument'; break;
  }
  
  // Replace any forbidden characters from filename
  const sanitizedNumber = number.replace(/[/\\?%*:|"<>]/g, '_');
  return `${prefix}_${sanitizedNumber}.pdf`;
};
