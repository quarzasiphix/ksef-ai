import generatePdf from 'react-to-pdf';
import { Invoice } from '@/types';
import { formatPolishDate, formatCurrency } from '@/lib/invoice-utils';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import html2canvas from 'html2canvas';

interface PdfOptions {
  filename?: string;
  [key: string]: any;
}

// Options for PDF generation
const defaultOptions = {
  filename: 'faktura.pdf',
  page: {
    margin: 0,
    format: 'a4',
    orientation: 'portrait',
  },
  canvas: {
    mimeType: 'image/jpeg' as 'image/jpeg',
    qualityRatio: 1,
    scale: 2,
    useCORS: true,
    logging: false,
  }
};

// Generate PDF from an element
export const generateElementPdf = async (
  element: HTMLElement, 
  options: PdfOptions = {}
) => {
  try {
    if (Capacitor.isNativePlatform()) {
      // For mobile platforms, generate PDF and share
      const htmlContent = element.outerHTML;
      const fileName = options.filename || defaultOptions.filename;
      
      // Convert HTML to PDF using html2canvas with better quality settings
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // Share the PDF
      await Share.share({
        title: fileName,
        text: 'Udostępniam dokument',
        files: [imgData],
        dialogTitle: 'Udostępnij dokument'
      });
      
      return true;
    } else {
      // Web browser implementation
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      // Create a new jsPDF instance
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      // Calculate dimensions to fit the page
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add the image to the PDF
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 1.0),
        'JPEG',
        0,
        0,
        imgWidth,
        imgHeight
      );

      // Save the PDF
      pdf.save(options.filename || defaultOptions.filename);
      return true;
    }
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
