import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface InvoiceEventHeaderProps {
  invoiceNumber: string;
  sellerName: string;
  buyerName: string;
  totalGross: number;
  currency: string;
  isPaid: boolean;
  dueDate?: string;
  isOverdue?: boolean;
}

const InvoiceEventHeader: React.FC<InvoiceEventHeaderProps> = ({
  invoiceNumber,
  sellerName,
  buyerName,
  totalGross,
  currency,
  isPaid,
  dueDate,
  isOverdue,
}) => {
  return (
    <div className="space-y-3">
      {/* Invoice Number */}
      <div className="text-2xl font-bold text-foreground">
        {invoiceNumber}
      </div>

      {/* Parties */}
      <div className="flex items-center gap-2 text-base text-muted-foreground">
        <span className="font-medium text-foreground">{sellerName}</span>
        <ArrowRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{buyerName}</span>
      </div>

      {/* Amount and Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-3xl font-bold text-foreground">
          {formatCurrency(totalGross, currency)}
        </div>
        <Badge variant={isPaid ? "default" : isOverdue ? "destructive" : "secondary"} className="text-sm">
          {isPaid ? "Opłacona" : isOverdue ? "Po terminie" : "Nieopłacona"}
        </Badge>
        {dueDate && !isPaid && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
            <span>Termin: {format(new Date(dueDate), "dd.MM.yyyy", { locale: pl })}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceEventHeader;
