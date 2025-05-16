
import React from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/invoice-utils";
import { Invoice } from "@/types";
import { Badge } from "@/components/ui/badge";

type InvoiceCardProps = {
  invoice: Invoice;
};

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice }) => {
  // Helper function to determine status badge color
  const getStatusBadge = () => {
    if (invoice.isPaid) {
      return <Badge className="bg-green-500">Zapłacono</Badge>;
    } else {
      if (new Date(invoice.dueDate) < new Date()) {
        return <Badge className="bg-red-500">Zaległa</Badge>;
      } else {
        return <Badge className="bg-orange-500">Oczekuje</Badge>;
      }
    }
  };

  return (
    <Link to={`/invoices/${invoice.id}`} className="block no-underline">
      <div className="bg-[#1A1F2C] text-white rounded-lg p-4 shadow-md mb-4 hover:shadow-lg transition-all">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Faktura {invoice.number}</h3>
          <span className="text-sm text-gray-300">
            {new Date(invoice.issueDate).toLocaleDateString("pl-PL")}
          </span>
        </div>
        
        <div className="mt-2 truncate">
          <p className="text-gray-300">{invoice.customerName || "Klient nieznany"}</p>
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <span className="font-bold">{formatCurrency(invoice.totalGrossValue || 0)}</span>
          {getStatusBadge()}
        </div>
      </div>
    </Link>
  );
};

export default InvoiceCard;
