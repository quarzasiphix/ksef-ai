import React from "react";
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
  const handleDownload = () => {
    // Placeholder for PDF download functionality
    console.log("Download PDF for invoice:", invoice.number);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Podgląd faktury {invoice.number}</DialogTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-4 p-4 bg-white border rounded-lg overflow-auto max-h-[70vh] min-h-[60vh]">
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
