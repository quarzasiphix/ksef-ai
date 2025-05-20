import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Invoice, InvoiceType } from "@/types";
import { useGlobalData } from "@/hooks/use-global-data";
import { InvoiceHeader } from "@/components/invoices/detail/InvoiceHeader";
import { InvoiceDetailsCard } from "@/components/invoices/detail/InvoiceDetailsCard";
import { InvoiceItemsCard } from "@/components/invoices/detail/InvoiceItemsCard";
import ContractorCard, { ContractorData } from "@/components/invoices/detail/ContractorCard";
import { InvoicePdfTemplate } from '@/components/invoices/pdf/InvoicePdfTemplate';
import TotalsSummary from "@/components/invoices/detail/TotalsSummary";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

interface InvoiceDetailProps {
  type?: 'income' | 'expense';
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { id } = useParams<{ id: string }>();
  const { invoices, businessProfiles, customers } = useGlobalData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [canSharePdf, setCanSharePdf] = useState(false);
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null);
  const navigate = useNavigate();
  const transactionType = type || 'income';

  const selectedInvoice = invoices.data.find(i => i.id === id);

  // Conditional returns for loading, error, and missing data
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Ładowanie...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!selectedInvoice) {
    return <div>Nie znaleziono faktury</div>;
  }

  if (!businessProfiles?.data?.length) {
    return <div>Błąd: Brak danych profilu firmy.</div>;
  }

  if (!customers?.data?.length) {
    return <div>Błąd: Brak danych klienta.</div>;
  }

  const generatePdf = async (): Promise<string | null> => {
    try {
      setPdfLoading(true);
      const canvas = await html2canvas(printRef.current!, {
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedPrintRef = clonedDoc.querySelector('#print-template');
          if (clonedPrintRef) {
            (clonedPrintRef as HTMLElement).style.display = 'block';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const pdfBlob = new Blob([doc.output('blob')], { type: 'application/pdf' });
      const pdfUri = await Filesystem.writeFile({
        path: 'faktura.pdf',
        data: pdfBlob,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      setSavedPdfUri(pdfUri.uri);
      setCanSharePdf(true);
      return pdfUri.uri;
    } catch (err) {
      console.error('Error generating PDF:', err);
      return null;
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSharePdf = async () => {
    if (!savedPdfUri) return;

    try {
      await Share.share({
        url: savedPdfUri,
        title: 'Podziel się fakturą'
      });
    } catch (err) {
      console.error('Error sharing PDF:', err);
    }
  };

  const handleGeneratePdf = async () => {
    const uri = await generatePdf();
    if (uri) {
      if (Capacitor.isNativePlatform()) {
        // On native platforms, show share sheet directly
        await handleSharePdf();
      } else {
        // On web, show success message
        alert('PDF został wygenerowany i zapisany w pamięci podręcznej.');
      }
    } else {
      alert('Wystąpił błąd podczas generowania pliku PDF.');
    }
  };

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!selectedInvoice) {
          setError('Nie znaleziono faktury');
          return;
        }
      } catch (err) {
        setError('Błąd podczas pobierania faktury');
        console.error('Error fetching invoice:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id, selectedInvoice]);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || (navigator as any).share) {
      setCanSharePdf(true);
    }
  }, []);

  const [isStickyVisible, setIsStickyVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const { top } = containerRef.current.getBoundingClientRect();
        setIsStickyVisible(top < -100); // Show sticky header when scrolled past 100px
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleBackButton = (e: BeforeUnloadEvent) => {
      // This will be handled by the mobile app if running in a WebView
      if (Capacitor.isNativePlatform()) {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('beforeunload', handleBackButton);
    return () => window.removeEventListener('beforeunload', handleBackButton);
  }, [navigate]);


  // Prepare data for ContractorCards
  let sellerCardData: ContractorData | undefined = undefined;
  let buyerCardData: ContractorData | undefined = undefined;

  if (selectedInvoice && businessProfiles?.data && customers?.data) {
    // SELLER DATA
    const sellerProfile = businessProfiles.data.find(bp => bp.id === selectedInvoice.businessProfileId);

    if (sellerProfile) {
      sellerCardData = {
        name: sellerProfile.name || selectedInvoice.businessName || 'Brak danych sprzedawcy',
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
        name: selectedInvoice.businessName || 'Brak danych sprzedawcy',
      };
    }

    // BUYER DATA
    const buyerProfile = customers.data.find(c => c.id === selectedInvoice.customerId);
    if (buyerProfile) {
      buyerCardData = {
        name: buyerProfile.name || selectedInvoice.customerName || 'Brak danych kupującego',
        nip: buyerProfile.taxId,
        street: buyerProfile.address,
        postalCode: buyerProfile.postalCode,
        city: buyerProfile.city,
        email: buyerProfile.email || undefined,
        phone: buyerProfile.phone || undefined,
      };
    } else {
      buyerCardData = {
        name: selectedInvoice.customerName || 'Brak danych kupującego',
      };
    }
  }

  return (
    <div ref={containerRef} className="flex-1 space-y-3 lg:space-y-4">
      <InvoiceHeader 
        id={selectedInvoice.id}
        number={selectedInvoice.number}
        type={selectedInvoice.type}
        pdfLoading={pdfLoading}
        handleGeneratePdf={handleGeneratePdf}
        handleSharePdf={handleSharePdf}
        canSharePdf={canSharePdf}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InvoiceDetailsCard
          number={selectedInvoice.number}
          issueDate={selectedInvoice.issueDate}
          dueDate={selectedInvoice.dueDate}
          sellDate={selectedInvoice.sellDate}
          paymentMethod={selectedInvoice.paymentMethod}
          isPaid={selectedInvoice.isPaid || false}
          ksef={selectedInvoice.ksef}
          comments={selectedInvoice.comments}
          type={selectedInvoice.type}
          bankAccount={sellerCardData?.bankAccount}
        />
        <InvoiceItemsCard
          items={selectedInvoice.items || []}
          totalNetValue={selectedInvoice.totalNetValue || 0}
          totalVatValue={selectedInvoice.totalVatValue || 0}
          totalGrossValue={selectedInvoice.totalGrossValue || 0}
          type={selectedInvoice.type}
        />
      </div>
      <div className="mt-8 p-4 bg-card rounded-lg border"> 
        <CardTitle className="text-base md:text-lg">Dane Kontrahentów</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ContractorCard title="Sprzedawca" contractor={sellerCardData} /> 
          <ContractorCard title="Nabywca" contractor={buyerCardData} />
        </div>
      </div>
      <TotalsSummary
        totalNetValue={selectedInvoice.totalNetValue || 0}
        totalVatValue={selectedInvoice.totalVatValue || 0}
        totalGrossValue={selectedInvoice.totalGrossValue || 0}
        type={selectedInvoice.type}
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
          invoice={selectedInvoice}
          businessProfile={businessProfiles.data.find(bp => bp.id === selectedInvoice.businessProfileId)}
          customer={customers.data.find(c => c.id === selectedInvoice.customerId)}
        />
      </div>
    </div>
  );
};

const InvoiceDetailComponent = InvoiceDetail;

export default InvoiceDetailComponent;
