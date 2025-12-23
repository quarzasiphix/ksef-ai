import React from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { Invoice, InvoiceType } from "@/shared/types";
import { Badge } from "@/shared/ui/badge";
import { Calendar, FileText, User, CreditCard, Share2, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type InvoiceCardProps = {
  invoice: Invoice;
  currency?: string;
};

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, currency = invoice.currency || 'PLN' }) => {
  // Check if invoice has discussion threads
  const { data: hasDiscussion } = useQuery({
    queryKey: ["invoice-discussion", invoice.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("discussion_threads")
        .select("*", { count: "exact", head: true })
        .eq("invoice_id", invoice.id);
      
      if (error) {
        console.error("Error checking discussion:", error);
        return false;
      }
      
      return (count || 0) > 0;
    },
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!invoice.id, // Only run if invoice ID exists
  });

  // Helper function to determine status badge color
  const getStatusBadge = () => {
    if (invoice.paid || invoice.isPaid) {
      return <Badge className="bg-green-500 text-xs">Zapłacono</Badge>;
    } else {
      if (new Date(invoice.dueDate) < new Date()) {
        return <Badge className="bg-red-500 text-xs">Zaległa</Badge>;
      } else {
        return <Badge className="bg-orange-500 text-xs">Oczekuje</Badge>;
      }
    }
  };

  // Helper function to get the document type title
  const getDocumentTypeTitle = () => {
    switch (invoice.type) {
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

  // Helper function to determine card color based on document type
  const getCardColorClass = () => {
    switch (invoice.type) {
      case InvoiceType.SALES:
        return "bg-[#1A1F2C]"; // Dark blue for invoices
      case InvoiceType.RECEIPT:
        return "bg-[#1E2A3B]"; // Dark blue-gray for receipts
      case InvoiceType.PROFORMA:
        return "bg-[#2C243B]"; // Dark purple for proforma
      case InvoiceType.CORRECTION:
        return "bg-[#2D2226]"; // Dark red for corrections
      default:
        return "bg-[#1A1F2C]";
    }
  };

  // Check if document type is a receipt (rachunek) - hide VAT info
  const isReceipt = invoice.type === InvoiceType.RECEIPT;

  // Determine the correct route based on transaction type (income/expense)
  const getInvoiceRoute = () => {
    const basePath = invoice.transactionType === 'expense' ? '/expense' : '/income';
    return `${basePath}/${invoice.id}`;
  };

  // Handle share button click
  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // This will be handled by the parent component
    const event = new CustomEvent('share-invoice', { 
      detail: { invoiceId: invoice.id },
      bubbles: true 
    });
    document.dispatchEvent(event);
  };

  return (
    <Link to={getInvoiceRoute()} className="block no-underline">
      <div className={`${getCardColorClass()} text-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all h-full`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">{invoice.number}</h3>
            {hasDiscussion && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border-blue-500/30">
                <MessageSquare className="h-3 w-3 mr-1" />
                Dyskusja
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleShareClick}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              title="Udostępnij"
            >
              <Share2 className="h-3.5 w-3.5 text-gray-300" />
            </button>
            {getStatusBadge()}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <Calendar className="h-3 w-3" />
            <span>Data: {new Date(invoice.issueDate).toLocaleDateString("pl-PL")}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <User className="h-3 w-3" />
            <span className="truncate">{invoice.customerName || invoice.buyer?.name || "Klient nieznany"}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <FileText className="h-3 w-3" />
            <span>{getDocumentTypeTitle()}</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <CreditCard className="h-3 w-3" />
            <span>{invoice.paymentMethod === "transfer" ? "Przelew" : 
                  invoice.paymentMethod === "cash" ? "Gotówka" : 
                  invoice.paymentMethod === "card" ? "Karta" : "Inna"}</span>
          </div>
          
          <div className="pt-1.5 border-t border-gray-700 mt-1">
            <div className="flex justify-between">
              {!isReceipt && invoice.totalVatValue !== undefined && (
                <span className="text-xs text-gray-300">
                  VAT: {formatCurrency(invoice.totalVatValue >= 0 ? invoice.totalVatValue : 0, currency)}
                </span>
              )}
              <span className="font-bold text-base">
                {formatCurrency(
                  // If VAT is 0 or less, use net value
                  // Otherwise use gross value if it's valid
                  invoice.totalVatValue <= 0 
                    ? (invoice.totalNetValue || invoice.totalAmount || 0)
                    : (invoice.totalGrossValue || invoice.totalAmount || 0),
                  currency
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default InvoiceCard;