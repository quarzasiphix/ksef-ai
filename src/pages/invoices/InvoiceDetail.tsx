
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Invoice, InvoiceType } from "@/types";
import { getInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { toast } from "sonner";
import { generateElementPdf, getInvoiceFileName } from "@/lib/pdf-utils";
import { InvoiceHeader } from "@/components/invoices/detail/InvoiceHeader";
import { InvoiceDetailsCard } from "@/components/invoices/detail/InvoiceDetailsCard";
import { InvoiceParties } from "@/components/invoices/detail/InvoiceParties";
import { InvoiceItemsCard } from "@/components/invoices/detail/InvoiceItemsCard";
import { InvoicePaymentCard } from "@/components/invoices/detail/InvoicePaymentCard";
import { ErrorView } from "@/components/invoices/detail/ErrorView";

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
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

  // Handle PDF generation
  const handleGeneratePdf = async () => {
    if (!invoice || !printRef.current) return;
    
    setPdfLoading(true);
    try {
      // Get PDF filename based on invoice details
      const filename = getInvoiceFileName(invoice);
      
      // Generate PDF from the print ref element
      const success = await generateElementPdf(printRef.current, { filename });
      
      if (success) {
        toast.success('PDF został wygenerowany pomyślnie');
      } else {
        toast.error('Nie udało się wygenerować PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Błąd podczas generowania PDF');
    } finally {
      setPdfLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Ładowanie...</p>
      </div>
    );
  }
  
  if (error || !invoice) {
    return <ErrorView error={error} />;
  }
  
  return (
    <div className="space-y-4 md:space-y-6 max-w-full px-0 sm:px-4">
      <InvoiceHeader 
        id={invoice.id}
        number={invoice.number}
        type={invoice.type}
        pdfLoading={pdfLoading}
        handleGeneratePdf={handleGeneratePdf}
      />
      
      {/* Printable content reference */}
      <div ref={printRef} className="space-y-4 md:space-y-6 print:p-8">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
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
          />
        </div>
        
        <InvoiceItemsCard
          items={invoice.items}
          totalNetValue={invoice.totalNetValue || 0}
          totalVatValue={invoice.totalVatValue || 0}
          totalGrossValue={invoice.totalGrossValue || 0}
          type={invoice.type}
        />
        
        <InvoicePaymentCard
          paymentMethod={invoice.paymentMethod}
          totalNetValue={invoice.totalNetValue || 0}
          totalVatValue={invoice.totalVatValue || 0}
          totalGrossValue={invoice.totalGrossValue || 0}
          type={invoice.type}
        />
      </div>
    </div>
  );
};

export default InvoiceDetail;
