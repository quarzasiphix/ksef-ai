
import React, { useState, useEffect, RefObject, forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import type { ButtonProps } from "@/shared/ui/button";
import { ArrowLeft, Printer, FilePlus, FileDown, Pencil, SendHorizontal, Share2, Star } from "lucide-react";
import { InvoiceType } from "@/shared/types";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Capacitor } from '@capacitor/core';
import { toast } from "sonner";

interface InvoiceHeaderProps {
  id: string;
  number: string;
  type: InvoiceType;
  transactionType?: 'income' | 'expense';
  pdfLoading: boolean;
  handleGeneratePdf: () => Promise<string | null>;
  handleSharePdf: () => Promise<void>;
  canSharePdf: boolean;
  isPaid?: boolean;
  isPremium: boolean;
  onRequirePremiumClick: () => void;
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

export const InvoiceHeader = forwardRef<HTMLDivElement, InvoiceHeaderProps>(({
  id,
  number,
  type,
  pdfLoading,
  handleGeneratePdf,
  handleSharePdf,
  canSharePdf,
  transactionType = 'income',
  isPaid,
  isPremium,
  onRequirePremiumClick
}, ref) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleKsefClick = () => {
    if (!isPremium) {
      onRequirePremiumClick();
      return;
    }
    
    if (type === InvoiceType.RECEIPT) {
      toast.error("Rachunki nie mogą być wysłane do KSeF");
      return;
    }
    
    toast.success("Funkcja KSeF będzie dostępna wkrótce");
  };

  return (
    <div 
      id="invoice-header" 
      ref={ref}
      className="flex flex-col gap-4 mb-4 bg-background"
    >
      {/* Header with title and back button */}
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(transactionType === 'income' ? '/income' : '/expense')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold truncate">{number}</h1>
          <p className="text-muted-foreground text-sm">
            {getInvoiceTypeTitle(type)}
            {isPaid && <span className="ml-2 text-green-600 font-medium">• Zapłacone</span>}
          </p>
        </div>
      </div>

      {/* Action buttons - organized in groups */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Document actions */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            {!isMobile && <span>Drukuj</span>}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGeneratePdf}
            disabled={pdfLoading}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            {!isMobile && <span>PDF</span>}
          </Button>
          {canSharePdf && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSharePdf}
              disabled={pdfLoading}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              {!isMobile && <span>Udostępnij</span>}
            </Button>
          )}
        </div>

        {/* Management actions */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <FilePlus className="h-4 w-4" />
            {!isMobile && <span>Duplikat</span>}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            asChild
            className="flex items-center gap-2"
          >
            <Link to={transactionType === 'income' ? `/income/${id}/edit` : `/expense/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              {!isMobile && <span>Edytuj</span>}
            </Link>
          </Button>
          {type !== InvoiceType.RECEIPT && (
            <Button 
              size="sm"
              onClick={handleKsefClick}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={pdfLoading}
            >
              {!isPremium && <Star className="h-4 w-4" />}
              <SendHorizontal className="h-4 w-4" />
              {!isMobile && <span>KSeF</span>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

InvoiceHeader.displayName = "InvoiceHeader";
