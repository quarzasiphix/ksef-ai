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
import { InvoiceParties } from "@/components/invoices/detail/InvoiceParties";
import { InvoiceItemsCard } from "@/components/invoices/detail/InvoiceItemsCard";
import { InvoicePdfTemplate } from "@/components/invoices/pdf/InvoicePdfTemplate";
import TotalsSummary from "@/components/invoices/detail/TotalsSummary";

const InvoiceDetailComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { businessProfiles, customers } = useGlobalData();
  const printRef = useRef<HTMLDivElement>(null);

  const generatePdf = async () => {
    if (!printRef.current || !invoice) {
      console.error("PDF generation prerequisites not met: printRef or invoice missing.");
      alert("Nie można wygenerować PDF: brak danych.");
      return;
    }
    
    setPdfLoading(true);
    try {
      // Directly use printRef.current which is the styled, hidden div containing InvoicePdfTemplate
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Keep scale for better quality
        useCORS: true,
        logging: false, // Keep logging off for production
        backgroundColor: '#ffffff', // Ensure background is white
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9); // Use 0.9 for good compression
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1123], // A4 in pixels at 96 DPI
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
      
      const fileName = `faktura-${invoice.number || 'bez-numeru'}.pdf`;

      if (Capacitor.isNativePlatform()) {
        // Mobile (Capacitor)
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache, // Saves to app's sandboxed Cache directory
        });

        console.log('PDF saved to:', result.uri);
        // Consider using a more user-friendly notification like a Toast
        alert(`Faktura zapisana w Dokumentach: ${fileName}`);

        // Optional: Offer to share the file
        if (await Share.canShare()) {
           await Share.share({
             title: `Faktura ${invoice.number || ''}`,
             text: `Załączona faktura ${fileName}`,
             url: result.uri, // This is the file path which can be shared
             dialogTitle: 'Udostępnij fakturę',
           });
        } else {
          console.log("Sharing not available on this platform or URI.");
          // You could provide an alternative here, e.g., using @capacitor-community/file-opener
          // if (result.uri) { FileOpener.open({ filePath: result.uri, contentType: 'application/pdf' }) }
        }

      } else {
        // Web browser
        pdf.save(fileName);
      }

    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Błąd podczas generowania PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPdfLoading(false);
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

  // Debug logging
  console.log('Invoice:', invoice);
  console.log('BusinessProfiles:', businessProfiles);
  console.log('Customers:', customers);

  // Defensive checks for required data
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
    <div ref={containerRef}>
      <InvoiceHeader 
        id={invoice.id}
        number={invoice.number}
        type={invoice.type}
        pdfLoading={pdfLoading}
        handleGeneratePdf={generatePdf}
      />
      
      {/* Main content */}
      <div className="space-y-6 p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <InvoiceDetailsCard
            number={invoice.number}
            issueDate={invoice.issueDate}
            dueDate={invoice.dueDate}
            sellDate={invoice.sellDate}
            isPaid={invoice.isPaid}
            ksef={invoice.ksef}
            comments={invoice.comments}
            type={invoice.type}
          />
          
          <InvoiceParties
            businessName={invoice.businessName}
            customerName={invoice.customerName}
            businessProfileId={invoice.businessProfileId}
            customerId={invoice.customerId}
          />
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
