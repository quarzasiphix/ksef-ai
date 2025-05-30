import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Invoice, InvoiceType, VatExemptionReason } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { getInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { getBusinessProfileById } from "@/integrations/supabase/repositories/businessProfileRepository";
import { getCustomerById } from "@/integrations/supabase/repositories/customerRepository";
import { InvoiceHeader } from "@/components/invoices/detail/InvoiceHeader";
import { InvoiceDetailsCard } from "@/components/invoices/detail/InvoiceDetailsCard";
import { InvoiceItemsCard } from "@/components/invoices/detail/InvoiceItemsCard";
import ContractorCard from "@/components/invoices/detail/ContractorCard";
import { InvoicePdfTemplate } from '@/components/invoices/pdf/InvoicePdfTemplate';
import TotalsSummary from "@/components/invoices/detail/TotalsSummary";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Plus, Printer, FilePlus, FileDown, Share2, Check } from "lucide-react";
import { generateElementPdf, getInvoiceFileName } from '@/lib/pdf-utils';
import { calculateInvoiceTotals } from '@/lib/invoice-utils';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/invoice-utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import type { InvoiceDetailsCardProps } from "@/components/invoices/detail/InvoiceDetailsCard";
import type { InvoiceItemsCardProps } from "@/components/invoices/detail/InvoiceItemsCard";

interface InvoiceDetailProps {
  type: 'income' | 'expense';
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  // const initialHeaderRef = useRef<HTMLDivElement>(null); // Ref for the initial full header (disabled)
  // const stickyHeaderRef = useRef<HTMLDivElement>(null); // Ref for the minimal sticky header (disabled)

  const isMobile = useIsMobile();

  // State hooks
  const [pdfLoading, setPdfLoading] = useState(false);
  const [canSharePdf, setCanSharePdf] = useState(false);
  // const [showStickyHeader, setShowStickyHeader] = useState(false); // State to control sticky header visibility (disabled)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Fetch data using useQuery - placed at the top
  const { data: selectedInvoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id // Only fetch if id is available
  });

  const { data: sellerProfile, isLoading: isLoadingSeller, error: sellerError } = useQuery({
    queryKey: ['businessProfile', selectedInvoice?.businessProfileId],
    queryFn: () => getBusinessProfileById(selectedInvoice!.businessProfileId!), // Use non-null assertion as enabled ensures selectedInvoice is available
    enabled: !!selectedInvoice?.businessProfileId, // Only fetch if selectedInvoice and businessProfileId are available
  });

  const { data: buyerCustomer, isLoading: isLoadingBuyer, error: buyerError } = useQuery({
    queryKey: ['customer', selectedInvoice?.customerId],
    queryFn: () => getCustomerById(selectedInvoice!.customerId!), // Use non-null assertion as enabled ensures selectedInvoice is available
    enabled: !!selectedInvoice?.customerId, // Only fetch if selectedInvoice and customerId are available
  });

  const isLoading = isLoadingInvoice || isLoadingSeller || isLoadingBuyer;
  const error = invoiceError || sellerError || buyerError;
  const queryClient = useQueryClient();

  // PDF sharing capability check
  useEffect(() => {
    if (Capacitor.isNativePlatform() || (navigator as any).share) {
      setCanSharePdf(true);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Back button handler for mobile (existing, already at top)
  useEffect(() => {
    const handleBackButton = (e: BeforeUnloadEvent) => {
      if (Capacitor.isNativePlatform()) {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('beforeunload', handleBackButton);
    return () => window.removeEventListener('beforeunload', handleBackButton);
  }, [navigate]); // Depend on navigate

  // Sticky header logic and padding effect disabled

  // Early returns (now placed after all hook calls)
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

  // Prepare seller and buyer data for contractor cards (now placed after hooks and loading checks)
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

  const handleMarkAsPaid = async () => {
    if (!selectedInvoice) return;

    setIsMarkingPaid(true);
    try {
      // Create updated invoice object with isPaid set to true
      const updatedInvoice = { ...selectedInvoice, isPaid: true };
      
      // Use the saveInvoice function to update the record
      await saveInvoice(updatedInvoice as any); // Cast to any as saveInvoice expects Invoice type
      
      // Manually update the cache for this specific invoice
      queryClient.setQueryData(['invoice', selectedInvoice.id], (oldData: Invoice | undefined) => {
        if (oldData) {
          return { ...oldData, isPaid: true };
        } else {
          // If old data doesn't exist in cache, just return the updated invoice object
          // This case is less likely since we just fetched it for the detail page
          return updatedInvoice as any; // Use updatedInvoice from handleMarkAsPaid scope
        }
      });
      
      // Manually update the cache for the list of invoices as well for immediate reflection
      queryClient.setQueryData(['invoices'], (oldData: Invoice[] | undefined) => {
        if (oldData) {
          return oldData.map(inv => 
            inv.id === selectedInvoice.id ? { ...inv, isPaid: true } : inv
          );
        } else {
          // Should not happen if IncomeList was viewed, but handle defensively
          return [updatedInvoice] as any[]; // Add the updated invoice if cache is empty
        }
      });
      
      // Invalidate still needed for background refetch to sync with DB
      await queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoice.id] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });

      toast.success("Dokument oznaczono jako zapłacony");
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast.error("Wystąpił błąd podczas oznaczania dokumentu jako zapłacony");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // Calculate totals using the utility function (now placed after hooks and loading checks)
  const totals = selectedInvoice ? calculateInvoiceTotals(selectedInvoice.items) : { // Pass only items
    totalNetValue: 0,
    totalVatValue: 0,
    totalGrossValue: 0
  };

  return (
    <div ref={containerRef} className="flex flex-col flex-1 relative p-4 md:p-6"> {/* Add padding to the main container */}
      {/* Original Static header content and Actions Row */}
      {selectedInvoice && (
        <div className="pb-2"> {/* Add bottom padding below header/actions */}
          <InvoiceHeader 
            id={selectedInvoice.id}
            number={selectedInvoice.number}
            type={selectedInvoice.type}
            pdfLoading={pdfLoading}
            handleGeneratePdf={handleGeneratePdf}
            handleSharePdf={handleSharePdf}
            canSharePdf={canSharePdf}
            transactionType={selectedInvoice.transactionType}
            isPaid={selectedInvoice.isPaid}
          />
          {/* Actions Row - Including Mark as Paid Button (kept with initial header) */}
          {(selectedInvoice.transactionType === 'income') && !selectedInvoice.isPaid && (
            <div className="flex justify-end gap-2 mt-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleMarkAsPaid}
                disabled={isMarkingPaid || pdfLoading} // Disable while marking paid or generating PDF
              >
                {isMarkingPaid ? "Oznaczanie..." : (<>Oznacz jako zapłacony <Check className="ml-2 h-4 w-4" /></>)}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Scrollable Content Area (with increased bottom padding) */}
      <div 
        ref={scrollableContentRef} 
        className="flex-1 overflow-y-auto space-y-3 lg:space-y-4 pb-24 md:pb-6" // Removed p-4 md-p-6, kept bottom padding
      >
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
                  comments={selectedInvoice.comments || ''}
                  type={selectedInvoice.type}
                  bankAccount={sellerProfile?.bankAccount || ''}
                  vat={!selectedInvoice.fakturaBezVAT}
                  vatExemptionReason={selectedInvoice.vatExemptionReason}
                />
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <CardTitle className="text-lg mb-4">Pozycje na dokumencie</CardTitle>

                <InvoiceItemsCard
                  items={Array.isArray(selectedInvoice.items) ? selectedInvoice.items : []}
                  totalNetValue={totals.totalNetValue}
                  totalVatValue={totals.totalVatValue}
                  totalGrossValue={totals.totalGrossValue}
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
              totalNetValue={totals.totalNetValue}
              totalVatValue={totals.totalVatValue}
              totalGrossValue={totals.totalGrossValue}
              type={selectedInvoice.type}
            />
          </div>
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
