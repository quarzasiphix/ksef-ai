
import React from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/invoice-utils";
import { Invoice, InvoiceType } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, User, CreditCard } from "lucide-react";

type InvoiceCardProps = {
  invoice: Invoice;
};

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice }) => {
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

  return (
    <Link to={getInvoiceRoute()} className="block no-underline">
      <div className={`${getCardColorClass()} text-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all h-full`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-sm">{invoice.number}</h3>
          {getStatusBadge()}
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
                <span className="text-xs text-gray-300">VAT: {formatCurrency(invoice.totalVatValue)}</span>
              )}
              <span className="font-bold text-base">
                {formatCurrency(invoice.totalGrossValue || invoice.totalAmount || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default InvoiceCard;
