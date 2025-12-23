
import React from "react";
import { formatCurrency } from "@/shared/lib/invoice-utils";

interface InvoiceItemsTableFooterProps {
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  isReceipt: boolean;
  fakturaBezVAT?: boolean;
  currency?: string;
}

export const InvoiceItemsTableFooter: React.FC<InvoiceItemsTableFooterProps> = ({
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  isReceipt,
  fakturaBezVAT = false,
  currency = 'PLN',
}) => {
  // If fakturaBezVAT is true, we treat it like a receipt for display purposes
  const shouldHideVat = isReceipt || fakturaBezVAT;
  return (
    <tfoot>
      <tr className="border-t border-t-gray-300 font-medium">
        <td colSpan={5} className="px-2 py-2 text-right">
          Razem:
        </td>
        <td className="px-2 py-2 text-right">{formatCurrency(totalNetValue, currency)}</td>
        {!shouldHideVat && (
          <>
            <td></td>
            <td className="px-2 py-2 text-right">{formatCurrency(totalVatValue, currency)}</td>
          </>
        )}
        <td className="px-2 py-2 text-right font-bold">
          {formatCurrency(totalGrossValue, currency)}
          {fakturaBezVAT && !isReceipt && (
            <div className="text-xs text-muted-foreground">
              Faktura bez VAT
            </div>
          )}
        </td>
        <td></td>
      </tr>
    </tfoot>
  );
};
