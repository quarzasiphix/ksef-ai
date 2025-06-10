import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Invoice, InvoiceType, VatExemptionReason, Customer, BusinessProfile } from "@/types/index";
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
import { generateElementPdf, getInvoiceFileName, generateElementPdfBlob } from '@/lib/pdf-utils';
import { calculateInvoiceTotals, formatCurrency } from '@/lib/invoice-utils';
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";
import { saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { useAuth } from "@/context/AuthContext";
import PremiumCheckoutModal from '@/components/premium/PremiumCheckoutModal';
import NewInvoice from "@/pages/invoices/NewInvoice";
import { sendInvoiceEmail } from '@/components/mail/Mailing';

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

  // Handler to send invoice by mail
  const handleSendInvoiceByMail = async () => {
    if (!buyerCustomer?.email) {
      toast.error('Dodaj adres e-mail do klienta, aby wysłać fakturę.');
      return;
    }
    if (!printRef.current) {
      toast.error('Nie można wygenerować PDF.');
      return;
    }
    setPdfLoading(true);
    try {
      // Generate PDF as Blob
      const pdfBlob = await generateElementPdfBlob(printRef.current, { filename: getInvoiceFileName(selectedInvoice) });
      if (!pdfBlob) {
        toast.error('Nie udało się wygenerować PDF.');
        setPdfLoading(false);
        return;
      }
      // Subject: invoice name + first 2 words of business profile
      const businessName = (sellerProfile?.name || '').split(' ').slice(0, 2).join(' ');
      const fullBusinessName = sellerProfile?.name || '';
      const invoiceName = selectedInvoice.number;
      const subject = `${invoiceName} ${businessName}`;
      // Polish HTML message
      const totalGross = formatCurrency(selectedInvoice.totalGrossValue ?? 0);
      const businessEmail = sellerProfile?.email || '';
      const buyerName = buyerCustomer?.name || '';
      // Payment method info
      let paymentInfo = '';
      const paymentMethod = selectedInvoice.paymentMethod;
      const bankAccount = sellerProfile?.bankAccount || '';
      if ((paymentMethod === 'transfer' || paymentMethod === 'przelew') && bankAccount) {
        paymentInfo = `<p><strong>Numer rachunku bankowego:</strong> <span style='font-family:monospace;'>${bankAccount}</span></p>`;
      } else if (paymentMethod === 'cash' || paymentMethod === 'gotówka') {
        paymentInfo = `<p><strong>Płatność gotówkowa</strong></p>`;
      }
      const message = `
        <div style="font-family: Arial, sans-serif; color: #222; font-size: 16px;">
          <h2 style="color: #2563eb; margin-bottom: 0.5em;">Faktura: ${invoiceName}</h2>
          <p><strong>Wystawca (sprzedawca):</strong> ${fullBusinessName}${businessEmail ? ` (<a href='mailto:${businessEmail}' style='color:#2563eb;'>${businessEmail}</a>)` : ''}</p>
          <p><strong>Odbiorca (klient):</strong> ${buyerName}</p>
          <p><strong>Data wystawienia:</strong> ${selectedInvoice.issueDate}</p>
          <p><strong>Kwota do zapłaty:</strong> <span style="font-size:18px; color:#16a34a; font-weight:bold;">${totalGross}</span></p>
          ${paymentInfo}
          <hr style="margin: 2em 0; border: none; border-top: 1px solid #eee;" />
          <p>W załączniku znajdziesz fakturę w formacie PDF.</p>
          <div style="margin-top:2em; font-size:14px; color:#888;">
            Wygenerowano i wysłano automatycznie przez <a href="https://ksiegai.pl" style="color:#2563eb; text-decoration:none;">ksiegai.pl</a> – najlepszy polski system księgowy.
          </div>
        </div>
      `;
      // Use the reusable email sender
      const ok = await sendInvoiceEmail({
        mail: buyerCustomer.email,
        subject,
        message,
        pdfBlob,
        filename: getInvoiceFileName(selectedInvoice),
      });
      if (ok) {
        toast.success('Faktura została wysłana e-mailem!');
      } else {
        toast.error('Nie udało się wysłać faktury e-mailem.');
      }
    } catch (error) {
      console.error('Error sending invoice by mail:', error);
      toast.error('Wystąpił błąd podczas wysyłania faktury e-mailem.');
    } finally {
      setPdfLoading(false);
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
      {/* Send by Mail Button */}
      <div className="mb-6">
        <Button
          onClick={handleSendInvoiceByMail}
          disabled={pdfLoading}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium"
          size={isMobile ? "default" : "lg"}
        >
          {pdfLoading ? 'Wysyłanie...' : 'Wyślij fakturę e-mailem'}
        </Button>
      </div>

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
          invoice={{
            ...(selectedInvoice as any),
            totalGrossValue: (selectedInvoice as any).totalGrossValue ?? 0,
          } as any}
          businessProfile={sellerProfile || {
            id: selectedInvoice.businessProfileId,
            name: selectedInvoice.businessName || '',
            taxId: '',
            address: '',
            postalCode: '',
            city: '',
            user_id: selectedInvoice.user_id
          } as any}
          customer={buyerCustomer || {
            id: selectedInvoice.customerId || '',
            name: selectedInvoice.customerName || '',
            address: '',
            postalCode: '',
            city: '',
            user_id: selectedInvoice.user_id,
            customerType: 'odbiorca',
          } as any}
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
