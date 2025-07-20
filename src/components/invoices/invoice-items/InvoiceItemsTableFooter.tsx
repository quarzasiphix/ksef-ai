
import React from "react";
import { formatCurrency } from "@/lib/invoice-utils";

interface InvoiceItemsTableFooterProps {
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  isReceipt: boolean;
  currency?: string;
}

export const InvoiceItemsTableFooter: React.FC<InvoiceItemsTableFooterProps> = ({
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  isReceipt,
  currency = 'PLN',
}) => {
  return (
    <tfoot>
      <tr className="border-t border-t-gray-300 font-medium">
        <td colSpan={5} className="px-2 py-2 text-right">
          Razem:
        </td>
        <td className="px-2 py-2 text-right">{formatCurrency(totalNetValue, currency)}</td>
        {!isReceipt && (
          <>
            <td></td>
            <td className="px-2 py-2 text-right">{formatCurrency(totalVatValue, currency)}</td>
          </>
        )}
        <td className="px-2 py-2 text-right font-bold">{formatCurrency(totalGrossValue, currency)}</td>
        <td></td>
      </tr>
    </tfoot>
  );
};
