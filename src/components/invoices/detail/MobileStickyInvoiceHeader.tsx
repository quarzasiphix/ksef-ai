import React, { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Pencil, Share2 } from "lucide-react";

interface MobileStickyInvoiceHeaderProps {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: import("@/types").InvoiceType;
  pdfLoading: boolean;
  onEdit: () => void;
  onShare: () => void;
  onDownload: () => void;
}

import { InvoiceType } from "@/types";

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

const MobileStickyInvoiceHeader: React.FC<MobileStickyInvoiceHeaderProps> = ({
  invoiceId,
  invoiceNumber,
  invoiceType,
  pdfLoading,
  onEdit,
  onShare,
  onDownload,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const header = document.getElementById("invoice-header");
    const handleScroll = () => {
      if (!header) return;
      const { bottom } = header.getBoundingClientRect();
      setShowSticky(bottom <= 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  if (!isMobile) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-background border-b border-border flex items-center justify-between px-4 py-3 shadow-md transition-transform duration-200 ease-in-out${showSticky ? ' translate-y-0' : ' -translate-y-full'}`}
      style={{ marginTop: 0, transform: showSticky ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      {/* Left: Back, Number, Type */}
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm truncate" style={{ maxWidth: 120 }}>{invoiceNumber}</span>
          <span className="text-xs text-muted-foreground truncate" style={{ maxWidth: 120 }}>{getInvoiceTypeTitle(invoiceType)}</span>
        </div>
      </div>
      {/* Right: 4 Buttons */}
      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onShare} disabled={pdfLoading}>
          <Share2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onDownload} disabled={pdfLoading}>
          <FileDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MobileStickyInvoiceHeader;
