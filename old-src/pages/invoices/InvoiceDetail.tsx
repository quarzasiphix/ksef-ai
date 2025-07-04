import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Invoice, InvoiceType, BusinessProfile, Customer, KsefInfo } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { updateInvoicePaymentStatus } from "@/integrations/supabase/repositories/invoiceRepository";
import { getBusinessProfileById } from "@/integrations/supabase/repositories/businessProfileRepository";
import { getCustomerById } from "@/integrations/supabase/repositories/customerRepository";
import { useToast } from "@/components/ui/use-toast";
import { InvoiceHeader } from "@/components/invoices/detail/InvoiceHeader";
import { InvoiceDetailsCard } from "@/components/invoices/detail/InvoiceDetailsCard";
import { InvoiceItemsCard } from "@/components/invoices/detail/InvoiceItemsCard";
import ContractorCard from "@/components/invoices/detail/ContractorCard";
import { InvoicePdfTemplate } from '@/components/invoices/pdf/InvoicePdfTemplate';
import TotalsSummary from "@/components/invoices/detail/TotalsSummary";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Plus, Printer, FilePlus, FileDown, Share2 } from "lucide-react";
import { generateElementPdf, getInvoiceFileName } from '@/lib/pdf-utils';
import { calculateInvoiceTotals } from '@/lib/invoice-utils';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/invoice-utils";

interface InvoiceDetailProps {
  type: 'income' | 'expense';
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // State hooks
  const [pdfLoading, setPdfLoading] = useState(false);
  const [canSharePdf, setCanSharePdf] = useState(false);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  // Fetch the invoice (with items) directly
  const { data: selectedInvoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id
  });

  console.log('InvoiceDetail - Fetched selectedInvoice.vat:', selectedInvoice?.vat as any);

  // Fetch the full business profile for the seller
  const { data: sellerProfile, isLoading: isLoadingSeller, error: sellerError } = useQuery({
    queryKey: ['businessProfile', selectedInvoice?.businessProfileId],
    queryFn: () => getBusinessProfileById(selectedInvoice!.businessProfileId),
    enabled: !!selectedInvoice?.businessProfileId,
  });

  // Fetch the full customer profile for the buyer
  const { data: buyerCustomer, isLoading: isLoadingBuyer, error: buyerError } = useQuery({
    queryKey: ['customer', selectedInvoice?.customerId],
    queryFn: () => {
      if (!selectedInvoice?.customerId) return null;
      return getCustomerById(selectedInvoice.customerId);
    },
    enabled: !!selectedInvoice?.customerId,
  });

  const isLoading = isLoadingInvoice || isLoadingSeller || isLoadingBuyer;
  const error = invoiceError || sellerError || buyerError;

  // PDF sharing capability check
  useEffect(() => {
    if (Capacitor.isNativePlatform() || (navigator as any).share) {
      setCanSharePdf(true);
    }
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

  // Early returns after all hooks
  if (!id) {
    return <div className="p-4">Brak ID faktury</div>;
  }
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Ładowanie danych faktury...</p>
      </div>
    );
  }
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
  if (!selectedInvoice) {
    return <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="max-w-md w-full bg-card p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-3">Nie znaleziono faktury</h2>
        <p className="text-muted-foreground mb-6">Faktura o podanym ID nie istnieje lub nie masz do niej dostępu.</p>
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
    </div>;
  }

  // Prepare seller and buyer data for contractor cards
  // Use data from the newly fetched sellerProfile and buyerCustomer
  const sellerCardData = sellerProfile ? {
    name: selectedInvoice.businessName || sellerProfile.name, // Prioritize name from invoice if exists
    ...sellerProfile,
    bankAccount: sellerProfile.bankAccount ?? '',
  } : {
    name: selectedInvoice.businessName || 'Brak danych sprzedawcy',
  } as any; // Cast as any for minimal data case

  const buyerCardData = buyerCustomer ? {
    name: selectedInvoice.customerName || buyerCustomer.name, // Prioritize name from invoice if exists
    ...buyerCustomer,
  } : {
    name: selectedInvoice.customerName || 'Brak danych nabywcy',
  } as any; // Cast as any for minimal data case

  const handleGeneratePdf = async (): Promise<string | null> => {
    if (!printRef.current) return null;
    
    setPdfLoading(true);
    try {
      const fileName = getInvoiceFileName(selectedInvoice);
      const success = await generateElementPdf(printRef.current, { filename: fileName });
      return success ? fileName : null;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSharePdf = async (): Promise<void> => {
    if (!printRef.current) return;
    
    setPdfLoading(true);
    try {
      const fileName = getInvoiceFileName(selectedInvoice);
      
      if (Capacitor.isNativePlatform()) {
        // For mobile platforms, generate PDF and share
        const success = await generateElementPdf(printRef.current, { filename: fileName });
        if (success) {
          // The PDF will be automatically shared on mobile platforms
          // No need to do anything else as the PDF is already in RAM
        }
      } else {
        // For desktop, just download
        await handleGeneratePdf();
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  // Handle marking invoice as paid
  const handleMarkAsPaid = async () => {
    if (!id || !selectedInvoice) return;
    
    try {
      await updateInvoicePaymentStatus(id, true);
      
      // Update the local state immediately for a better UX
      const updatedInvoice = { ...selectedInvoice, isPaid: true };
      queryClient.setQueryData(['invoice', id], updatedInvoice);
      
      toast({
        title: "Sukces",
        description: "Status faktury został zaktualizowany na 'Zapłacono'.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować statusu płatności. Spróbuj ponownie.",
        variant: "destructive",
      });
    }
  };

  // Calculate totals using the utility function
  const calculatedTotals = selectedInvoice ? calculateInvoiceTotals(selectedInvoice.items) : {
    totalNetValue: 0,
    totalVatValue: 0,
    totalGrossValue: 0
  };

  return (
    <div ref={containerRef} className="flex-1 space-y-3 lg:space-y-4 relative pt-16 md:pt-0">
      {/* Original Static header content */}
      {selectedInvoice && (
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
      )}

      <div className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card p-6 rounded-lg border">
              <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-lg">Szczegóły dokumentu</CardTitle>
                {!selectedInvoice.isPaid && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleMarkAsPaid}
                    className="ml-auto"
                  >
                    Oznacz jako zapłacone
                  </Button>
                )}
              </div>
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
                vat={selectedInvoice.vat}
              />
            </div>
            <div className="bg-card p-6 rounded-lg border">

              <InvoiceItemsCard
                items={Array.isArray(selectedInvoice.items) ? selectedInvoice.items : []}
                totalNetValue={calculatedTotals.totalNetValue}
                totalVatValue={calculatedTotals.totalVatValue}
                totalGrossValue={calculatedTotals.totalGrossValue}
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
            totalNetValue={calculatedTotals.totalNetValue}
            totalVatValue={calculatedTotals.totalVatValue}
            totalGrossValue={calculatedTotals.totalGrossValue}
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
          businessProfile={sellerProfile || {
            id: selectedInvoice.businessProfileId,
            name: selectedInvoice.businessName || '',
            taxId: '',
            address: '',
            postalCode: '',
            city: '',
            user_id: selectedInvoice.user_id
          }}
          customer={buyerCustomer || {
            id: selectedInvoice.customerId || '',
            name: selectedInvoice.customerName || '',
            address: '',
            postalCode: '',
            city: '',
            user_id: selectedInvoice.user_id
          }}
        />
      </div>
    </div>
  );
};

export default InvoiceDetail;
