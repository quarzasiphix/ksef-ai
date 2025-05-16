
import React from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/invoice-utils";
import { Invoice } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, User, CreditCard } from "lucide-react";

type InvoiceCardProps = {
  invoice: Invoice;
};

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice }) => {
  // Helper function to determine status badge color
  const getStatusBadge = () => {
    if (invoice.isPaid) {
      return <Badge className="bg-green-500 text-xs">Zapłacono</Badge>;
    } else {
      if (new Date(invoice.dueDate) < new Date()) {
        return <Badge className="bg-red-500 text-xs">Zaległa</Badge>;
      } else {
        return <Badge className="bg-orange-500 text-xs">Oczekuje</Badge>;
      }
    }
  };

  return (
    <Link to={`/invoices/${invoice.id}`} className="block no-underline">
      <div className="bg-[#1A1F2C] text-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-sm">Faktura {invoice.number}</h3>
          {getStatusBadge()}
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <Calendar className="h-3 w-3" />
            <span>Data: {new Date(invoice.issueDate).toLocaleDateString("pl-PL")}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <User className="h-3 w-3" />
            <span className="truncate">{invoice.customerName || "Klient nieznany"}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <FileText className="h-3 w-3" />
            <span>{invoice.type === "sales" ? "Faktura sprzedaży" : 
                  invoice.type === "receipt" ? "Rachunek" : 
                  invoice.type === "proforma" ? "Faktura proforma" : "Faktura korygująca"}</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-300 text-xs">
            <CreditCard className="h-3 w-3" />
            <span>{invoice.paymentMethod === "transfer" ? "Przelew" : 
                  invoice.paymentMethod === "cash" ? "Gotówka" : 
                  invoice.paymentMethod === "card" ? "Karta" : "Inna"}</span>
          </div>
          
          <div className="pt-1.5 border-t border-gray-700 mt-1">
            <span className="font-bold text-base">{formatCurrency(invoice.totalGrossValue || 0)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default InvoiceCard;
