import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
    if (!printRef.current || !invoice) return;
    
    setPdfLoading(true);
    try {
      const pdfContainer = document.createElement('div');
      pdfContainer.style.width = '794px'; // A4 width in pixels
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      document.body.appendChild(pdfContainer);

      // Create temporary div for PDF content
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '100%';
      pdfContainer.appendChild(tempDiv);

      // Render PDF template
      const root = document.createElement('div');
      root.style.width = '100%';
      root.style.backgroundColor = 'white';
      root.innerHTML = printRef.current.innerHTML;
      tempDiv.appendChild(root);

      // Generate PDF
      const canvas = await html2canvas(root, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        height: 1123,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // Use px units for both jsPDF and addImage
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1123],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
      pdf.save(`faktura-${invoice.number}.pdf`);

      // Cleanup
      document.body.removeChild(pdfContainer);
    } catch (err) {
      console.error('Error generating PDF:', err);
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
