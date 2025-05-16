
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FilePlus, FileDown, Pencil, SendHorizontal } from "lucide-react";
import { InvoiceType } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface InvoiceHeaderProps {
  id: string;
  number: string;
  type: InvoiceType;
  pdfLoading: boolean;
  handleGeneratePdf: () => Promise<void>;
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
}) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/income">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{number}</h1>
          <p className="text-muted-foreground">
            {getInvoiceTypeTitle(type)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="flex items-center gap-1" size={isMobile ? "sm" : "default"}>
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">Drukuj</span>
        </Button>
        <Button variant="outline" className="flex items-center gap-1" size={isMobile ? "sm" : "default"}>
          <FilePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Duplikat</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex items-center gap-1" 
          size={isMobile ? "sm" : "default"}
          onClick={handleGeneratePdf}
          disabled={pdfLoading}
        >
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
        <Button variant="outline" className="flex items-center gap-1" size={isMobile ? "sm" : "default"} asChild>
          <Link to={`/invoices/edit/${id}`}>
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Edytuj</span>
          </Link>
        </Button>
        {type !== InvoiceType.RECEIPT && (
          <Button className="flex items-center gap-1" size={isMobile ? "sm" : "default"}>
            <SendHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Wyślij do KSeF</span>
          </Button>
        )}
      </div>
    </div>
  );
};
