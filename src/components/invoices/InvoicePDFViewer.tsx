import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { Invoice, BusinessProfile, Customer } from "@/types";
import { InvoicePdfTemplate } from "@/components/invoices/pdf/InvoicePdfTemplate";

interface InvoicePDFViewerProps {
  invoice: Invoice;
  businessProfile?: BusinessProfile;
  customer?: Customer;
  isOpen: boolean;
  onClose: () => void;
}

const InvoicePDFViewer: React.FC<InvoicePDFViewerProps> = ({
  invoice,
  businessProfile,
  customer,
  isOpen,
  onClose
}) => {
  const htmlRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    // Placeholder for PDF download functionality
    console.log("Download PDF for invoice:", invoice.number);
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
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePDFViewer;
