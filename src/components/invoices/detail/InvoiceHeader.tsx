import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { ArrowLeft, Printer, FilePlus, FileDown, Pencil, SendHorizontal, Share2 } from "lucide-react";
import { InvoiceType } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from '@capacitor/core';

interface InvoiceHeaderProps {
  id: string;
  number: string;
  type: InvoiceType;
  transactionType?: 'income' | 'expense';
  pdfLoading: boolean;
  handleGeneratePdf: () => Promise<string | null>;
  handleSharePdf: () => Promise<void>;
  canSharePdf: boolean;
}

const getInvoiceTypeTitle = (type: InvoiceType) => {
  switch (type) {
    case InvoiceType.SALES:
      return "Faktura VAT";
    case InvoiceType.RECEIPT:
      return "Rachunek";
    case InvoiceType.PROFORMA:
      return "Faktura proforma";
    case InvoiceType.CORRECTION:
      return "Faktura korygująca";
    default:
      return "Dokument";
  }
};

export const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({
  id,
  number,
  type,
  pdfLoading,
  handleGeneratePdf,
  handleSharePdf,
  canSharePdf,
  transactionType
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  return (
    <div id="invoice-header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sticky top-0 bg-background z-10 pb-2 pt-1">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(transactionType === 'income' ? '/income' : '/expense')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{number}</h1>
          <p className="text-muted-foreground text-sm">
            {getInvoiceTypeTitle(type)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
        <Button variant="outline" className="flex items-center gap-1 text-xs" size={isMobile ? "sm" : "sm"}>
          <Printer className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Drukuj</span>
        </Button>
        <Button variant="outline" className="flex items-center gap-1 text-xs" size={isMobile ? "sm" : "sm"}>
          <FilePlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Duplikat</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex items-center gap-1 text-xs" 
          size={isMobile ? "sm" : "sm"}
          onClick={handleGeneratePdf}
          disabled={pdfLoading}
        >
          <FileDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
        {(canSharePdf || Capacitor.getPlatform() === 'android' || isMobile) && (
          <Button 
            variant="outline" 
            className="flex items-center gap-1 text-xs"
            size={isMobile ? "sm" : "sm"}
            onClick={handleSharePdf}
            disabled={pdfLoading}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Udostępnij</span>
          </Button>
        )}
        <Button variant="outline" className="flex items-center gap-1 text-xs" size={isMobile ? "sm" : "sm"} asChild>
          <Link to={`/invoices/edit/${id}`}>
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edytuj</span>
          </Link>
        </Button>
        {type !== InvoiceType.RECEIPT && (
          <Button className="flex items-center gap-1 text-xs" size={isMobile ? "sm" : "sm"}>
            <SendHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Wyślij do KSeF</span>
          </Button>
        )}
      </div>
    </div>
  );
};
