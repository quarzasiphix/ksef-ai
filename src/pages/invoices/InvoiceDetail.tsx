import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Invoice } from "@/types";
import { getInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { useGlobalData } from "@/hooks/use-global-data";
import { InvoiceHeader } from "@/components/invoices/detail/InvoiceHeader";
import { InvoiceDetailsCard } from "@/components/invoices/detail/InvoiceDetailsCard";
import { InvoiceItemsCard } from "@/components/invoices/detail/InvoiceItemsCard";
import ContractorCard, { ContractorData } from "@/components/invoices/detail/ContractorCard";
import { InvoicePdfTemplate } from '@/components/invoices/pdf/InvoicePdfTemplate';
import TotalsSummary from "@/components/invoices/detail/TotalsSummary";
import { CardTitle } from "@/components/ui/card";

const InvoiceDetailComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null);
  const { businessProfiles, customers } = useGlobalData();
  const printRef = useRef<HTMLDivElement>(null);

  // Debug: Log savedPdfUri whenever it changes
  useEffect(() => {
    console.log('savedPdfUri changed (useEffect):', savedPdfUri);
  }, [savedPdfUri]);

  // Prepare data for ContractorCards
  let sellerCardData: ContractorData | undefined = undefined;
  let buyerCardData: ContractorData | undefined = undefined;

  if (invoice && businessProfiles?.data && customers?.data) {
    // SELLER DATA
    const sellerProfile = businessProfiles.data.find(bp => bp.id === invoice.businessProfileId);

    if (sellerProfile) {
      sellerCardData = {
        name: sellerProfile.name || invoice.businessName || 'Brak danych sprzedawcy',
        nip: sellerProfile.taxId,
        street: sellerProfile.address, 
        postalCode: sellerProfile.postalCode,
        city: sellerProfile.city,
        email: sellerProfile.email || undefined,
        phone: sellerProfile.phone || undefined,
        bankAccount: sellerProfile.bankAccount || undefined,
      };
    } else {
      sellerCardData = { 
        name: invoice.businessName || 'Brak danych sprzedawcy',
      };
    }

    // BUYER DATA
    const buyerProfile = customers.data.find(c => c.id === invoice.customerId);
    if (buyerProfile) {
      buyerCardData = {
        name: buyerProfile.name || invoice.customerName || 'Brak danych nabywcy',
        nip: buyerProfile.taxId || undefined,
        street: buyerProfile.address, 
        postalCode: buyerProfile.postalCode,
        city: buyerProfile.city,
        email: buyerProfile.email || undefined,
        phone: buyerProfile.phone || undefined,
      };
    } else {
      buyerCardData = { 
        name: invoice.customerName || 'Brak danych nabywcy',
      };
    }
  }

  const generatePdf = async () => {
    if (!printRef.current || !invoice) {
      console.error("PDF generation prerequisites not met: printRef or invoice missing.");
      alert("Nie można wygenerować PDF: brak danych.");
      return;
    }

    setPdfLoading(true);
    setSavedPdfUri(null); 

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2, 
        useCORS: true,
        logging: false, 
        backgroundColor: '#ffffff', 
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9); 
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1123], 
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
      
      const safeInvoiceNumber = (invoice.number || 'bez-numeru').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileName = `faktura-${safeInvoiceNumber}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Documents, 
          recursive: true 
        });

        console.log('PDF writeFile result:', result);
        console.log('PDF saved to URI:', result.uri);
        setSavedPdfUri(result.uri); 
        console.log('Saved URI state after set:', savedPdfUri); 
        // Log the state here again to see it after the entire try/catch/finally block
        // This will run after the current execution context of generatePdf, so state should be updated for subsequent renders
        if (Capacitor.isNativePlatform()) {
          // Add a slight delay to log savedPdfUri to allow state update to propagate for logging purposes
          setTimeout(() => {
             console.log('Final savedPdfUri state in generatePdf (after timeout):', savedPdfUri);
          }, 100); 
        }
      } else {
        pdf.save(fileName);
        setSavedPdfUri('web_downloaded');
      }
    } catch (e) {
      console.error('Błąd podczas generowania PDF:', e);
      alert('Wystąpił błąd podczas generowania PDF. ' + (e instanceof Error ? e.message : String(e)));
      setSavedPdfUri(null);
    } finally {
      setPdfLoading(false);
    }
  };

  const sharePdf = async () => {
    console.log('sharePdf called. savedPdfUri:', savedPdfUri, 'isNative:', Capacitor.isNativePlatform());
    if (!savedPdfUri || savedPdfUri === 'web_downloaded') {
      alert('Najpierw zapisz PDF, aby go udostępnić, lub udostępnianie nie jest obsługiwane w przeglądarce w ten sposób.');
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: `Faktura ${invoice?.number || 'bez-numeru'}`, 
          text: `Załącznik: Faktura ${invoice?.number || 'bez-numeru'}.pdf`, 
          url: savedPdfUri, 
          dialogTitle: 'Udostępnij fakturę'
        });
      } catch (error) {
        console.error('Błąd podczas udostępniania PDF:', error);
        alert('Wystąpił błąd podczas udostępniania PDF.');
      }
    } else {
      alert('Udostępnianie plików nie jest obsługiwane bezpośrednio w przeglądarce w ten sposób.');
    }
  };

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        setError("Brak identyfikatora faktury");
        setLoading(false);
        return;
      }

      try {
        const invoiceData = await getInvoice(id);
        setInvoice(invoiceData);
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError("Nie udało się pobrać danych faktury");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Ładowanie...</p>
      </div>
    );
  }

  console.log('Invoice:', invoice);
  console.log('BusinessProfiles:', businessProfiles);
  console.log('Customers:', customers);

  if (error || !invoice) {
    return <div>Error: {error || 'Brak danych faktury.'}</div>;
  }
  if (!businessProfiles || !Array.isArray(businessProfiles.data) || businessProfiles.data.length === 0) {
    return <div>Error: Brak danych profilu firmy.</div>;
  }
  if (!customers || !Array.isArray(customers.data) || customers.data.length === 0) {
    return <div>Error: Brak danych klienta.</div>;
  }

  return (
    <div ref={containerRef} className="flex-1 space-y-3 p-2 sm:p-4 md:p-6 lg:space-y-4">
      <InvoiceHeader 
        id={invoice.id}
        number={invoice.number}
        type={invoice.type}
        pdfLoading={pdfLoading}
        handleGeneratePdf={generatePdf}
        handleSharePdf={sharePdf}
        canSharePdf={!!savedPdfUri && savedPdfUri !== 'web_downloaded' && Capacitor.isNativePlatform()}
      />
      
      {/* Main content */}
      <div className="space-y-6 p-1 sm:p-2 md:p-4">
        <InvoiceDetailsCard
          number={invoice.number}
          issueDate={invoice.issueDate}
          dueDate={invoice.dueDate}
          sellDate={invoice.sellDate}
          isPaid={invoice.isPaid}
          ksef={invoice.ksef}
          comments={invoice.comments}
          type={invoice.type}
          paymentMethod={invoice.paymentMethod}
          bankAccount={sellerCardData?.bankAccount}
        />
          
        {invoice && (
          <div className="mt-8 p-4 bg-card rounded-lg border"> 
            <CardTitle className="text-base md:text-lg">Dane Kontrahentów</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Use the prepared card data */}
              <ContractorCard title="Sprzedawca" contractor={sellerCardData} /> 
              <ContractorCard title="Nabywca" contractor={buyerCardData} />
            </div>
          </div>
        )}

        <InvoiceItemsCard
          items={invoice.items}
          totalNetValue={invoice.totalNetValue || 0}
          totalVatValue={invoice.totalVatValue || 0}
          totalGrossValue={invoice.totalGrossValue || 0}
          type={invoice.type}
        />
        <TotalsSummary
          totalNetValue={invoice.totalNetValue || 0}
          totalVatValue={invoice.totalVatValue || 0}
          totalGrossValue={invoice.totalGrossValue || 0}
          type={invoice.type}
        />
      </div>

      {/* Hidden PDF template */}
      <div 
        ref={printRef} 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          width: '794px',
          height: '1123px',
          backgroundColor: 'white',
          boxSizing: 'border-box',
          margin: 0,
          padding: 0
        }}
      >
        <InvoicePdfTemplate
          invoice={invoice}
          businessProfile={businessProfiles.data.find(bp => bp.id === invoice.businessProfileId)}
          customer={customers.data.find(c => c.id === invoice.customerId)}
        />
      </div>
    </div>
  );
};

export default InvoiceDetailComponent;
