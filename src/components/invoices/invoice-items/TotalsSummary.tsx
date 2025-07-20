
import React from "react";
import { formatCurrency } from "@/lib/invoice-utils";

interface TotalsSummaryProps {
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  isReceipt: boolean;
  currency?: string;
}

export const TotalsSummary: React.FC<TotalsSummaryProps> = ({
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  isReceipt,
  currency = 'PLN',
}) => {
  return (
    <div className="bg-muted p-3 rounded-md border">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-right font-medium">Razem netto:</div>
        <div>{formatCurrency(totalNetValue, currency)}</div>
        
        {!isReceipt && (
          <>
            <div className="text-right font-medium">Razem VAT:</div>
            <div>{formatCurrency(totalVatValue, currency)}</div>
          </>
        )}
        
        <div className="text-right font-medium">Razem brutto:</div>
        <div className="font-bold">{formatCurrency(totalGrossValue, currency)}</div>
      </div>
    </div>
  );
};
