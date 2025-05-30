
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InvoiceType } from "@/types";

interface InvoiceFormHeaderProps {
  title: string;
  documentType: InvoiceType;
  isEditing: boolean;
  className?: string;
}

export const InvoiceFormHeader: React.FC<InvoiceFormHeaderProps> = ({
  title,
  documentType,
  isEditing,
  className = ''
}) => {
  const navigate = useNavigate();

  // Get the document type title
  const getDocumentTitle = () => {
    switch(documentType) {
      case InvoiceType.SALES: return "Faktura VAT";
      case InvoiceType.RECEIPT: return "Rachunek";
      case InvoiceType.PROFORMA: return "Faktura proforma";
      case InvoiceType.CORRECTION: return "Faktura korygująca";
      default: return "Dokument";
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`.trim()}>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} type="button">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">
          {isEditing ? "Edytuj dokument" : `Nowy ${getDocumentTitle().toLowerCase()}`}
        </h1>
      </div>
    </div>
  );
};
