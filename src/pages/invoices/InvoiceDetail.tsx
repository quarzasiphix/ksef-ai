import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Invoice, InvoiceType } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, Plus, Check, CheckCircle } from "lucide-react";
import { generateElementPdf, getInvoiceFileName } from '@/lib/pdf-utils';
import { calculateInvoiceTotals } from '@/lib/invoice-utils';
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";
import { saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { useAuth } from "@/context/AuthContext";
import PremiumCheckoutModal from '@/components/premium/PremiumCheckoutModal';
import NewInvoice from "@/pages/invoices/NewInvoice";

interface InvoiceDetailProps {
  type: 'income' | 'expense';
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPremium } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // State
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [canSharePdf, setCanSharePdf] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Refs
  const printRef = useRef<HTMLDivElement>(null);

  // If id is 'new', render the NewInvoice form directly
  if (id === 'new') {
    return <NewInvoice />;
  }

  // Fetch data only if id is not 'new'
  const { data: selectedInvoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id && id !== 'new',
  });

  const { data: sellerProfile, isLoading: isLoadingSeller, error: sellerError } = useQuery({
    queryKey: ['businessProfile', (selectedInvoice as Invoice | undefined)?.businessProfileId],
    queryFn: () => getBusinessProfileById((selectedInvoice as Invoice).businessProfileId!),
    enabled: !!(selectedInvoice as Invoice | undefined)?.businessProfileId,
  });

  const { data: buyerCustomer, isLoading: isLoadingBuyer, error: buyerError } = useQuery({
    queryKey: ['customer', (selectedInvoice as Invoice | undefined)?.customerId],
    queryFn: () => getCustomerById((selectedInvoice as Invoice).customerId!),
    enabled: !!(selectedInvoice as Invoice | undefined)?.customerId,
  });

  const isLoading = isLoadingInvoice || isLoadingSeller || isLoadingBuyer;
  const error = invoiceError || sellerError || buyerError;

  // Effects
  useEffect(() => {
    if (Capacitor.isNativePlatform() || (navigator as any).share) {
      setCanSharePdf(true);
    }
  }, []);

  // Early returns
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
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
      </div>
    );
  }

  // Prepare contractor data
  const sellerCardData = sellerProfile ? {
    name: selectedInvoice.businessName || sellerProfile.name,
    ...sellerProfile,
    bankAccount: sellerProfile.bankAccount ?? '',
  } : {
    name: selectedInvoice.businessName || 'Brak danych sprzedawcy',
  } as any;

  const buyerCardData = buyerCustomer ? {
    name: selectedInvoice.customerName || buyerCustomer.name,
    ...buyerCustomer,
  } : {
    name: selectedInvoice.customerName || 'Brak danych nabywcy',
  } as any;

  // Handlers
  const handleGeneratePdf = async (): Promise<string | null> => {
    if (!printRef.current) return null;
    
    setPdfLoading(true);
    try {
      const fileName = getInvoiceFileName(selectedInvoice as Invoice);
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
      const fileName = getInvoiceFileName(selectedInvoice as Invoice);
      
      if (Capacitor.isNativePlatform()) {
        const success = await generateElementPdf(printRef.current, { filename: fileName });
        if (success) {
          // PDF will be automatically shared on mobile platforms
        }
      } else {
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
      const updatedInvoice = { ...selectedInvoice, isPaid: true };
      await saveInvoice(updatedInvoice as any);
      
      queryClient.setQueryData(['invoice', selectedInvoice.id], (oldData: Invoice | undefined) => {
        if (oldData) {
          return { ...oldData, isPaid: true };
        }
        return updatedInvoice as any;
      });
      
      queryClient.setQueryData(['invoices'], (oldData: Invoice[] | undefined) => {
        if (oldData) {
          return oldData.map(inv => 
            inv.id === selectedInvoice.id ? { ...inv, isPaid: true } : inv
          );
        }
        return [updatedInvoice] as any[];
      });
      
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

  // Calculate totals
  const totals = selectedInvoice ? calculateInvoiceTotals(selectedInvoice.items) : {
    totalNetValue: 0,
    totalVatValue: 0,
    totalGrossValue: 0
  };

  return (
    <div className="flex flex-col flex-1 relative p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
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
        isPremium={isPremium}
        onRequirePremiumClick={() => setIsPremiumModalOpen(true)}
      />

      {/* Mark as Paid Button - Prominent placement */}
      {selectedInvoice.transactionType === 'income' && !selectedInvoice.isPaid && (
        <div className="mb-6">
          <Button 
            onClick={handleMarkAsPaid}
            disabled={isMarkingPaid || pdfLoading}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium"
            size={isMobile ? "default" : "lg"}
          >
            {isMarkingPaid ? (
              <>Oznaczanie...</>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Oznacz jako zapłacone
              </>
            )}
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details */}
            <div className="bg-card p-4 md:p-6 rounded-lg border">
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

            {/* Invoice Items */}
            <div className="bg-card p-4 md:p-6 rounded-lg border">
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

          {/* Sidebar - Desktop only */}
          <div className="hidden lg:block">
            <div className="bg-card p-4 md:p-6 rounded-lg border sticky top-6">
              <CardTitle className="text-lg mb-4">Dane Kontrahentów</CardTitle>
              <div className="space-y-6">
                <ContractorCard title="Sprzedawca" contractor={sellerCardData} />
                <ContractorCard title="Nabywca" contractor={buyerCardData} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile contractor cards */}
        <div className="lg:hidden">
          <div className="bg-card p-4 md:p-6 rounded-lg border">
            <CardTitle className="text-lg mb-4">Dane Kontrahentów</CardTitle>
            <div className="grid grid-cols-1 gap-6">
              <ContractorCard title="Sprzedawca" contractor={sellerCardData} />
              <ContractorCard title="Nabywca" contractor={buyerCardData} />
            </div>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <TotalsSummary
            totalNetValue={totals.totalNetValue}
            totalVatValue={totals.totalVatValue}
            totalGrossValue={totals.totalGrossValue}
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
          invoice={selectedInvoice as Invoice}
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

      {/* Premium Checkout Modal */}
      <PremiumCheckoutModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </div>
  );
};

export default InvoiceDetail;
