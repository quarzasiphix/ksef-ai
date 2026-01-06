import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Download, Share2, CheckCircle } from "lucide-react";
import { Invoice, BusinessProfile, Customer } from "@/shared/types";
import { BankAccount } from '@/modules/banking/bank';
import { InvoicePdfTemplate } from "@/modules/invoices/components/pdf/InvoicePdfTemplate";
import { generateInvoicePdf, getInvoiceFileName } from "@/shared/lib/pdf-utils";
import { updateInvoicePaymentStatus } from "@/modules/invoices/data/invoiceRepository";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface InvoicePDFViewerProps {
  invoice: Invoice;
  businessProfile?: BusinessProfile;
  customer?: Customer;
  isOpen: boolean;
  onClose: () => void;
  bankAccounts?: BankAccount[];
  onShare?: () => void;
  onInvoiceUpdate?: (updatedInvoice: Invoice) => void;
}

const InvoicePDFViewer: React.FC<InvoicePDFViewerProps> = ({
  invoice,
  businessProfile,
  customer,
  isOpen,
  onClose,
  bankAccounts = [],
  onShare,
  onInvoiceUpdate,
}) => {
  const htmlRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [currentInvoice, setCurrentInvoice] = useState(invoice);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Update local state when invoice prop changes
  React.useEffect(() => {
    setCurrentInvoice(invoice);
  }, [invoice]);
  
  // Debug logging
  console.log('InvoicePDFViewer - Customer data:', customer);
  console.log('InvoicePDFViewer - Invoice customerId:', invoice.customerId);

  const handleMarkAsPaid = async () => {
    if (currentInvoice.isPaid) {
      toast.info('Faktura jest już oznaczona jako opłacona');
      return;
    }

    setIsMarkingPaid(true);
    try {
      await updateInvoicePaymentStatus(currentInvoice.id, true);
      
      // Update local state
      const updatedInvoice = { ...currentInvoice, isPaid: true };
      setCurrentInvoice(updatedInvoice);
      
      // Notify parent component
      onInvoiceUpdate?.(updatedInvoice);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast.success('Faktura została oznaczona jako opłacona');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Nie udało się oznaczyć faktury jako opłaconej');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleDownload = async () => {
    try {
      const success = await generateInvoicePdf({
        invoice: currentInvoice,
        businessProfile,
        customer,
        filename: getInvoiceFileName(currentInvoice),
        bankAccounts,
      });
      if (!success) {
        // no-op; optionally show a toast in parent
      }
    } catch (e) {
      // swallow errors here; parent can handle toasts if needed
      console.error('PDF download error', e);
    }
  };

  const handleDownloadHtml = () => {
    if (!htmlRef.current) return;
    const htmlContent = `<!DOCTYPE html><html lang=\"pl\"><head><meta charset=\"UTF-8\"><title>Faktura ${currentInvoice.number}</title></head><body>${htmlRef.current.innerHTML}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faktura_${currentInvoice.number}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Podgląd faktury {currentInvoice.number}</DialogTitle>
            <div className="flex space-x-2 mr-8">
              {!currentInvoice.isPaid && (
                <Button 
                  variant="default" 
                  onClick={handleMarkAsPaid}
                  disabled={isMarkingPaid}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{isMarkingPaid ? 'Oznaczanie...' : 'Oznacz jako opłaconą'}</span>
                  <span className="sm:hidden">Opłacone</span>
                </Button>
              )}
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz PDF
              </Button>
              <Button variant="outline" onClick={handleDownloadHtml}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz HTML
              </Button>
              <Button variant="outline" onClick={() => onShare?.()}>
                <Share2 className="h-4 w-4 mr-2" />
                Udostępnij
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div ref={htmlRef} className="mt-4 p-4 bg-white border rounded-lg overflow-auto max-h-[70vh] min-h-[60vh]">
          <InvoicePdfTemplate
            invoice={currentInvoice}
            businessProfile={businessProfile as any}
            customer={customer as any}
            bankAccounts={bankAccounts}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePDFViewer;
