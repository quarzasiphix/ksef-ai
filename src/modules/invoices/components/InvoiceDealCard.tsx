import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { Building2, User } from 'lucide-react';

interface Party {
  name: string;
  taxId?: string;
}

interface InvoiceDealCardProps {
  seller: Party;
  buyer: Party;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  currency: string;
  isVatExempt?: boolean;
}

const InvoiceDealCard: React.FC<InvoiceDealCardProps> = ({
  seller,
  buyer,
  totalNet,
  totalVat,
  totalGross,
  currency,
  isVatExempt,
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parties */}
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Sprzedawca</div>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">{seller.name}</div>
                  {seller.taxId && (
                    <div className="text-sm text-muted-foreground">NIP: {seller.taxId}</div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Nabywca</div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">{buyer.name}</div>
                  {buyer.taxId && (
                    <div className="text-sm text-muted-foreground">NIP: {buyer.taxId}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-3">Kwota</div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Netto:</span>
                <span className="font-medium">{formatCurrency(totalNet, currency)}</span>
              </div>
              {!isVatExempt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT:</span>
                  <span className="font-medium">{formatCurrency(totalVat, currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Brutto:</span>
                <span className="text-lg font-bold">{formatCurrency(totalGross, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceDealCard;
