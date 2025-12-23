import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Download, X } from "lucide-react";
import { Invoice, BusinessProfile, Customer } from "@/shared/types";
import { BankAccount } from '@/modules/banking/bank';
import { InvoicePdfTemplate } from "@/modules/invoices/components/pdf/InvoicePdfTemplate";
import { generateInvoicePdf, getInvoiceFileName } from "@/shared/lib/pdf-utils";

interface InvoicePDFViewerProps {
  invoice: Invoice;
  businessProfile?: BusinessProfile;
  customer?: Customer;
  isOpen: boolean;
  onClose: () => void;
  bankAccounts?: BankAccount[];
}

const InvoicePDFViewer: React.FC<InvoicePDFViewerProps> = ({
  invoice,
  businessProfile,
  customer,
  isOpen,
  onClose,
  bankAccounts = [],
}) => {
  const htmlRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    try {
      const success = await generateInvoicePdf({
        invoice,
        businessProfile,
        customer,
        filename: getInvoiceFileName(invoice),
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
    const htmlContent = `<!DOCTYPE html><html lang=\"pl\"><head><meta charset=\"UTF-8\"><title>Faktura ${invoice.number}</title></head><body>${htmlRef.current.innerHTML}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faktura_${invoice.number}.html`;
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
            <DialogTitle>Podgląd faktury {invoice.number}</DialogTitle>
            <div className="flex space-x-2 mr-8">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz PDF
              </Button>
              <Button variant="outline" onClick={handleDownloadHtml}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz HTML
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div ref={htmlRef} className="mt-4 p-4 bg-white border rounded-lg overflow-auto max-h-[70vh] min-h-[60vh]">
          <InvoicePdfTemplate
            invoice={invoice}
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
