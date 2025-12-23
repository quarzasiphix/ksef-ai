
import React from "react";
import { formatCurrency } from "@/shared/lib/invoice-utils";

interface TotalsSummaryProps {
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  isReceipt: boolean;
  fakturaBezVAT?: boolean;
  currency?: string;
}

export const TotalsSummary: React.FC<TotalsSummaryProps> = ({
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  isReceipt,
  fakturaBezVAT = false,
  currency = 'PLN',
}) => {
  // Hide VAT for receipts or when fakturaBezVAT is true
  const shouldHideVat = isReceipt || fakturaBezVAT;
  return (
    <div className="bg-muted p-3 rounded-md border">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-right font-medium">Razem netto:</div>
        <div>{formatCurrency(totalNetValue, currency)}</div>
        
        {/* Hide VAT row for receipts or VAT-exempt invoices */}
        {!shouldHideVat ? (
          <>
            <div className="text-right font-medium">Razem VAT:</div>
            <div>{formatCurrency(totalVatValue, currency)}</div>
          </>
        ) : null}
        
        <div className="text-right font-medium">Razem brutto:</div>
        <div className="font-bold">
          {formatCurrency(shouldHideVat ? totalNetValue : totalGrossValue, currency)}
          {fakturaBezVAT && !isReceipt && (
            <div className="text-xs text-muted-foreground">
              Faktura bez VAT
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
