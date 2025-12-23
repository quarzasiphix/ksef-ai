import React from "react";
import { Card } from "@/shared/ui/card";
import { formatCurrency } from "@/shared/lib/invoice-utils";

interface TotalsSummaryProps {
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  type: InvoiceType;
  currency?: string;
}

import { InvoiceType } from "@/shared/types";

const TotalsSummary: React.FC<TotalsSummaryProps> = ({ totalNetValue, totalVatValue, totalGrossValue, type, currency = 'PLN' }) => (
  <div className="mt-6 font-semibold">
    <div className="flex flex-col items-end sm:flex-row sm:justify-end sm:items-center">
      {/* Net Value Section */}
      <div className="flex w-full justify-between py-1 sm:w-auto sm:justify-end">
        <span className="px-2 text-zinc-600 sm:px-4">Razem netto:</span>
        <span className="px-2 sm:px-4">{formatCurrency(totalNetValue, currency)}</span>
      </div>

      {/* VAT Value Section (Conditional) */}
      {type !== InvoiceType.RECEIPT && (
        <div className="flex w-full justify-between py-1 sm:w-auto sm:justify-end sm:ml-4">
          <span className="px-2 text-zinc-600 sm:px-4">Razem VAT:</span>
          <span className="px-2 sm:px-4">{formatCurrency(totalVatValue, currency)}</span>
        </div>
      )}

      {/* Gross Value Section */}
      <div className="flex w-full justify-between py-1 sm:w-auto sm:justify-end sm:ml-4">
        <span className="px-2 font-bold text-blue-600 sm:px-4">Do zapłaty (brutto):</span>
        <span className="px-2 font-bold text-blue-600 sm:px-4">{formatCurrency(totalGrossValue, currency)}</span>
      </div>
    </div>
  </div>
);

export default TotalsSummary;
