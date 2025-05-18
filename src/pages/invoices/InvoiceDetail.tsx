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
import MobileStickyInvoiceHeader from "@/components/invoices/detail/MobileStickyInvoiceHeader";
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

  // Returns the PDF URI (base64 for Android, file URI for others)
  const generatePdf = async (): Promise<string | null> => {
    if (!printRef.current || !invoice) {
      console.error("PDF generation prerequisites not met: printRef or invoice missing.");
      alert("Nie można wygenerować PDF: brak danych.");
      return null;
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
        if (Capacitor.getPlatform() === 'android') {
          // Write PDF as base64 to the cache directory for sharing
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          try {
            const result = await Filesystem.writeFile({
              path: fileName,
              data: pdfBase64,
              directory: Directory.Cache, // Use cache directory, no permission needed
              recursive: true
            });
            setSavedPdfUri(result.uri);
            setPdfLoading(false);
            return result.uri;
          } catch (err) {
            setPdfLoading(false);
            setSavedPdfUri(null);
            console.error('Filesystem write error:', err);
            alert('Błąd podczas zapisu PDF do cache: ' + (err instanceof Error ? err.message : String(err)));
            return null;
          }
        } else {
          // Fallback for other native platforms (iOS, etc.)
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          const result = await Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: Directory.Documents, 
            recursive: true 
          });
          setSavedPdfUri(result.uri); 
          setPdfLoading(false);
          return result.uri;
        }
      } else {
        pdf.save(fileName);
        setSavedPdfUri('web_downloaded');
        setPdfLoading(false);
        return 'web_downloaded';
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
    // Always generate and get the PDF URI directly
    let pdfUri = savedPdfUri;
    if (!pdfUri || pdfUri === 'web_downloaded') {
      pdfUri = await generatePdf();
      if (!pdfUri || pdfUri === 'web_downloaded') {
        alert('Nie udało się wygenerować PDF do udostępnienia.');
        return;
      }
    }

    if (Capacitor.isNativePlatform()) {
      try {
        let shareUri = pdfUri;
        // On Android, always use the file URI for sharing
        if (Capacitor.getPlatform() === 'android') {
          shareUri = pdfUri; // pdfUri is now a file URI from Filesystem.writeFile
        }
        await Share.share({
          title: `Faktura ${invoice?.number || 'bez-numeru'}`,
          text: `Załącznik: Faktura ${invoice?.number || 'bez-numeru'}.pdf`,
          url: shareUri,
          dialogTitle: 'Udostępnij fakturę',
        });
      } catch (error) {
        // Only show alert if error is significant (not user cancel or empty)
        const errMsg = (error && typeof error === 'object' && 'message' in error) ? (error as any).message : String(error);
        console.error('Błąd podczas udostępniania PDF:', error);
        // Suppress alert for common harmless errors
        if (errMsg && !/cancel|aborted|no activity/i.test(errMsg)) {
          alert('Wystąpił błąd podczas udostępniania PDF.\n' + errMsg);
        }
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
    <div ref={containerRef} className="flex-1 space-y-3 lg:space-y-4">
      <InvoiceHeader 
        id={invoice.id}
        number={invoice.number}
        type={invoice.type}
        pdfLoading={pdfLoading}
        handleGeneratePdf={generatePdf}
        handleSharePdf={sharePdf}
        canSharePdf={!!(savedPdfUri && savedPdfUri !== 'web_downloaded')}
        // Add header id for sticky detection
        // @ts-ignore
        ref={undefined}
      />
      {/* Sticky mobile bar for actions */}
      <MobileStickyInvoiceHeader
        invoiceId={invoice.id}
        invoiceNumber={invoice.number}
        invoiceType={invoice.type}
        pdfLoading={pdfLoading}
        onEdit={() => window.location.href = `/invoices/edit/${invoice.id}`}
        onShare={sharePdf}
        onDownload={generatePdf}
      />
      <InvoiceDetailsCard
        number={invoice.number}
        issueDate={invoice.issueDate}
        dueDate={invoice.dueDate}
        sellDate={invoice.sellDate}
        paymentMethod={invoice.paymentMethod}
        isPaid={invoice.isPaid}
        ksef={invoice.ksef}
        comments={invoice.comments}
        type={invoice.type}
        bankAccount={sellerCardData?.bankAccount}
      />
      <div className="mt-8 p-4 bg-card rounded-lg border"> 
        <CardTitle className="text-base md:text-lg">Dane Kontrahentów</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ContractorCard title="Sprzedawca" contractor={sellerCardData} /> 
          <ContractorCard title="Nabywca" contractor={buyerCardData} />
        </div>
      </div>
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
