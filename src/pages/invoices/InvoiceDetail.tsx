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
import { ArrowLeft, Pencil, Plus } from "lucide-react";

interface InvoiceDetailProps {
  type: 'income' | 'expense';
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  // All hooks must be called unconditionally at the top level
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  // State hooks - all state declarations at the top
  const [pdfLoading, setPdfLoading] = useState(false);
  const [canSharePdf, setCanSharePdf] = useState(false);
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  
  // Data hooks
  const { invoices, businessProfiles, customers } = useGlobalData();
  
  // Memoized values - calculate these first
  const selectedInvoice = React.useMemo(() => {
    if (!id || !invoices.data) return null;
    return invoices.data.find(invoice => 
      invoice.id === id && 
      (type === 'income' ? invoice.transactionType === 'income' : invoice.transactionType === 'expense')
    ) || null;
  }, [id, invoices.data, type]);

  // Derived state - use useMemo to prevent unnecessary recalculations
  const { isLoading, error } = React.useMemo(() => ({
    isLoading: invoices.isLoading || businessProfiles.isLoading || customers.isLoading,
    error: invoices.error || businessProfiles.error || customers.error
  }), [invoices, businessProfiles, customers]);

  // PDF sharing capability check
  useEffect(() => {
    if (Capacitor.isNativePlatform() || (navigator as any).share) {
      setCanSharePdf(true);
    }
  }, []);

  // Scroll handler for sticky header
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    
    const headerHeight = header.offsetHeight;
    
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollPosition = window.scrollY;
        setIsStickyVisible(scrollPosition > headerHeight + 10);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Back button handler for mobile
  useEffect(() => {
    const handleBackButton = (e: BeforeUnloadEvent) => {
      if (Capacitor.isNativePlatform()) {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('beforeunload', handleBackButton);
    return () => window.removeEventListener('beforeunload', handleBackButton);
  }, [navigate]);

  // Debug effect - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (selectedInvoice) {
        console.log('Selected Invoice:', selectedInvoice);
        console.log('All Invoices:', invoices.data);
      }
      console.log('Loading States:', { 
        invoices: invoices.isLoading, 
        businessProfiles: businessProfiles.isLoading, 
        customers: customers.isLoading 
      });
      console.log('Errors:', { 
        invoices: invoices.error, 
        businessProfiles: businessProfiles.error, 
        customers: customers.error 
      });
    }
  }, [selectedInvoice, invoices, businessProfiles, customers]);

  // Early returns after all hooks
  if (!id) {
    return <div className="p-4">Brak ID faktury</div>;
  }
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Ładowanie danych faktury...</p>
      </div>
    );
  }

  // Handle errors from any of the data sources
  if (error) {
    console.error('Error loading invoice data:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg max-w-md w-full">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Wystąpił błąd</h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error instanceof Error ? error.message : 'Nie udało się załadować danych faktury.'}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  // Handle missing invoice
  if (!selectedInvoice) {
    const hasInvoices = invoices.data && invoices.data.length > 0;
    const invoiceTypeText = type === 'income' ? 'przychodowa' : 'kosztowa';
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="max-w-md w-full bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-3">
            {hasInvoices ? 'Nie znaleziono faktury' : 'Brak faktur'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {hasInvoices 
              ? `Faktura ${invoiceTypeText} o podanym ID nie istnieje lub nie masz do niej dostępu.`
              : `Nie znaleziono żadnych faktur ${invoiceTypeText} w systemie.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate(type === 'income' ? '/income' : '/expense')}
              className="flex-1 sm:flex-none"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do listy {type === 'income' ? 'przychodów' : 'kosztów'}
            </Button>
            <Button 
              onClick={() => navigate(`/${type}/new`)}
              className="flex-1 sm:flex-none"
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj nową fakturę
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle missing business profiles - moved after all hooks
  if (!businessProfiles?.data?.length) {
    return <div>Błąd: Brak danych profilu firmy.</div>;
  }

  // Handle missing customers - moved after all hooks
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

  const handleGeneratePdf = async (): Promise<string> => {
    const uri = await generatePdf();
    if (uri) {
      if (Capacitor.isNativePlatform()) {
        // On native platforms, show share sheet directly
        await handleSharePdf();
      } else {
        // On web, show success message
        alert('PDF został wygenerowany i zapisany w pamięci podręcznej.');
      }
      return uri;
    } else {
      const errorMsg = 'Wystąpił błąd podczas generowania pliku PDF.';
      alert(errorMsg);
      throw new Error(errorMsg);
    }
  };




  // Prepare data for ContractorCards
  const sellerProfile = businessProfiles.data.find(bp => bp.id === selectedInvoice.businessProfileId);
  const buyerProfile = customers.data.find(c => c.id === selectedInvoice.customerId);

  const sellerCardData: ContractorData = sellerProfile ? {
    name: sellerProfile.name || selectedInvoice.businessName || 'Brak danych sprzedawcy',
    nip: sellerProfile.taxId,
    street: sellerProfile.address, 
    postalCode: sellerProfile.postalCode,
    city: sellerProfile.city,
    email: sellerProfile.email || undefined,
    phone: sellerProfile.phone || undefined,
    bankAccount: sellerProfile.bankAccount || undefined,
  } : { 
    name: selectedInvoice.businessName || 'Brak danych sprzedawcy',
  };

  const buyerCardData: ContractorData = buyerProfile ? {
    name: buyerProfile.name || selectedInvoice.customerName || 'Brak danych kupującego',
    nip: buyerProfile.taxId,
    street: buyerProfile.address,
    postalCode: buyerProfile.postalCode,
    city: buyerProfile.city,
    email: buyerProfile.email || undefined,
    phone: buyerProfile.phone || undefined,
  } : {
    name: selectedInvoice.customerName || 'Brak danych kupującego',
  };

  // Function to get the correct back URL based on the invoice type
  const getBackUrl = () => {
    return type === 'income' ? '/income' : '/expense';
  };

  // Function to get the correct edit URL based on the invoice type
  const getEditUrl = () => {
    return `/${type}/${id}/edit`;
  };

  return (
    <div ref={containerRef} className="flex-1 space-y-3 lg:space-y-4 relative pt-16 md:pt-0">
      {/* Sticky header - only shown when scrolled past main header */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 border-b transition-all duration-200 transform ${isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getBackUrl())}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Wróć</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(getEditUrl())}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Edytuj</span>
            </Button>
          </div>
        </div>
      </div>
      <InvoiceHeader 
        id={selectedInvoice.id}
        number={selectedInvoice.number}
        type={selectedInvoice.type}
        pdfLoading={pdfLoading}
        handleGeneratePdf={handleGeneratePdf}
        handleSharePdf={handleSharePdf}
        canSharePdf={canSharePdf}
        transactionType={selectedInvoice.transactionType}
      />
      <div className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card p-6 rounded-lg border">
              <CardTitle className="text-lg mb-4">Szczegóły dokumentu</CardTitle>
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
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <CardTitle className="text-lg mb-4">Pozycje na dokumencie</CardTitle>
              <div className="mb-4">
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify({
                    hasItems: !!selectedInvoice.items,
                    itemsCount: Array.isArray(selectedInvoice.items) ? selectedInvoice.items.length : 'not an array',
                    itemsType: typeof selectedInvoice.items,
                    itemsSample: Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 
                      ? selectedInvoice.items[0] 
                      : 'no items'
                  }, null, 2)}
                </pre>
              </div>
              <InvoiceItemsCard
                items={Array.isArray(selectedInvoice.items) ? selectedInvoice.items : []}
                totalNetValue={selectedInvoice.totalNetValue || 0}
                totalVatValue={selectedInvoice.totalVatValue || 0}
                totalGrossValue={selectedInvoice.totalGrossValue || 0}
                type={selectedInvoice.type}
              />
            </div>
          </div>

          <div className="xl:block hidden">
            <div className="bg-card p-6 rounded-lg border">
              <CardTitle className="text-lg mb-4">Dane Kontrahentów</CardTitle>
              <div className="space-y-6">
                <ContractorCard title="Sprzedawca" contractor={sellerCardData} />
                <ContractorCard title="Nabywca" contractor={buyerCardData} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile and tablet view for Contractor Cards */}
        <div className="xl:hidden">
          <div className="bg-card p-6 rounded-lg border">
            <CardTitle className="text-lg mb-4">Dane Kontrahentów</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ContractorCard title="Sprzedawca" contractor={sellerCardData} />
              <ContractorCard title="Nabywca" contractor={buyerCardData} />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <TotalsSummary
            totalNetValue={selectedInvoice.totalNetValue || 0}
            totalVatValue={selectedInvoice.totalVatValue || 0}
            totalGrossValue={selectedInvoice.totalGrossValue || 0}
            type={selectedInvoice.type}
          />
        </div>
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
          invoice={selectedInvoice}
          businessProfile={businessProfiles.data.find(bp => bp.id === selectedInvoice.businessProfileId)}
          customer={customers.data.find(c => c.id === selectedInvoice.customerId)}
        />
      </div>
    </div>
  );
};

export default InvoiceDetail;
