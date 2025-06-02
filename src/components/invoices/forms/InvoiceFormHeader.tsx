
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InvoiceType } from "@/types";
import { TransactionType } from "@/types/common";

interface InvoiceFormHeaderProps {
  title: string;
  documentType: InvoiceType;
  isEditing: boolean;
  transactionType?: TransactionType;
}

export const InvoiceFormHeader: React.FC<InvoiceFormHeaderProps> = ({
  title,
  documentType,
  isEditing,
  transactionType
}) => {
  const navigate = useNavigate();

  const getDisplayTitle = () => {
    if (transactionType === TransactionType.EXPENSE) {
      return "Wydatek faktura";
    }
    return title;
  };

  return (
    <div className="flex items-center gap-4">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => navigate(-1)}
        className="shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h1 className="text-xl font-semibold">
          {isEditing ? `Edytuj: ${getDisplayTitle()}` : `Nowa: ${getDisplayTitle()}`}
        </h1>
      </div>
    </div>
  );
};
