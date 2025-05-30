
import React from "react";
import { formatCurrency } from "@/lib/invoice-utils";

interface InvoiceItemsTableFooterProps {
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  isReceipt: boolean;
}

export const InvoiceItemsTableFooter: React.FC<InvoiceItemsTableFooterProps> = ({
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  isReceipt
}) => {
  return (
    <tfoot>
      <tr className="border-t border-t-gray-300 font-medium">
        <td colSpan={5} className="px-2 py-2 text-right">
          Razem:
        </td>
        <td className="px-2 py-2 text-right">{formatCurrency(totalNetValue)}</td>
        {!isReceipt && (
          <>
            <td></td>
            <td className="px-2 py-2 text-right">{formatCurrency(totalVatValue)}</td>
          </>
        )}
        <td className="px-2 py-2 text-right font-bold">{formatCurrency(totalGrossValue)}</td>
        <td></td>
      </tr>
    </tfoot>
  );
};
