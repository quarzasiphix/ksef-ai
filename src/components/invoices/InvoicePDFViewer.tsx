
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { Invoice } from "@/types";

interface InvoicePDFViewerProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

const InvoicePDFViewer: React.FC<InvoicePDFViewerProps> = ({
  invoice,
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
        <div className="mt-4 p-6 bg-white border rounded-lg overflow-auto max-h-[70vh]">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Podgląd PDF zostanie wkrótce zaimplementowany
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Faktura: {invoice.number}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePDFViewer;
