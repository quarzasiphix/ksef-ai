
import generatePdf from 'react-to-pdf';
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

// Check if we're running in React Native
const isReactNative = () => {
  try {
    // Check for the existence of navigator.product
    return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  } catch (e) {
    return false;
  }
};

// Generate PDF from an element
export const generateElementPdf = async (
  element: HTMLElement, 
  options = {}
) => {
  try {
    if (isReactNative()) {
      // For React Native, we need to use a different approach
      return await generatePdfForReactNative(element, options);
    } else {
      // Web browser implementation
      await generatePdf(
        () => element, 
        { ...defaultOptions, ...options }
      );
      return true;
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

// React Native specific PDF generation
async function generatePdfForReactNative(element: HTMLElement, options: any) {
  try {
    // Import the necessary modules only in React Native environment
    const { PermissionsAndroid, Platform } = require('react-native');
    const RNHTMLtoPDF = require('react-native-html-to-pdf');
    const FileViewer = require('react-native-file-viewer');
    const RNFS = require('react-native-fs');
    
    // Request write permissions on Android
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Uprawnienia zapisu',
          message: 'Aplikacja potrzebuje dostępu do pamięci urządzenia, aby zapisać plik PDF.',
          buttonNeutral: 'Zapytaj później',
          buttonNegative: 'Anuluj',
          buttonPositive: 'OK',
        },
      );
      
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Brak uprawnień do zapisu pliku');
        return false;
      }
    }
    
    // Get HTML content from the element
    const htmlContent = element.outerHTML;
    
    // Generate PDF
    const fileName = options.filename || defaultOptions.filename;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    
    const result = await RNHTMLtoPDF.convert({
      html: htmlContent,
      fileName: fileName.replace('.pdf', ''),
      directory: 'Documents',
    });
    
    // Open the generated PDF
    if (result.filePath) {
      await FileViewer.open(result.filePath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error generating PDF in React Native:', error);
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
