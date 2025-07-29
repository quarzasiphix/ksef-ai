import React from "react";
import { InvoiceItem, InvoiceType, VatExemptionReason } from "@/types";
import { InvoiceItemRow } from "./InvoiceItemRow";
import { InvoiceItemsTableFooter } from "./InvoiceItemsTableFooter";

interface DesktopInvoiceItemsTableProps {
  items: InvoiceItem[];
  documentType: InvoiceType;
  isReceipt: boolean;
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: VatExemptionReason | null;
}

export const DesktopInvoiceItemsTable: React.FC<DesktopInvoiceItemsTableProps> = ({
  items,
  documentType,
  isReceipt,
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  onRemoveItem,
  onUpdateItem,
  fakturaBezVAT,
  vatExemptionReason
}) => {
  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full min-w-full border-collapse">
        <thead>
          <tr className="bg-muted text-foreground">
            <th className="px-2 py-2 text-left text-xs font-medium w-10">Lp.</th>
            <th className="px-2 py-2 text-left text-xs font-medium">Nazwa</th>
            <th className="px-2 py-2 text-right text-xs font-medium w-20">Ilość</th>
            <th className="px-2 py-2 text-right text-xs font-medium w-20">Jedn.</th>
            <th className="px-2 py-2 text-right text-xs font-medium w-28">Cena netto</th>
            <th className="px-2 py-2 text-right text-xs font-medium w-28">Wartość netto</th>
            {!isReceipt && (
              <>
                <th className="px-2 py-2 text-right text-xs font-medium w-20">VAT</th>
                <th className="px-2 py-2 text-right text-xs font-medium w-28">Kwota VAT</th>
              </>
            )}
            <th className="px-2 py-2 text-right text-xs font-medium w-28">Wartość brutto</th>
            <th className="px-2 py-2 text-center text-xs font-medium w-20">Akcje</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <InvoiceItemRow
              key={item.id}
              item={item}
              index={index}
              isReceipt={isReceipt}
              documentType={documentType}
              onRemoveItem={onRemoveItem}
              onUpdateItem={onUpdateItem}
              fakturaBezVAT={fakturaBezVAT}
              vatExemptionReason={vatExemptionReason}
              userId={'' as any}
              onClick={() => {}}
            />
          ))}
          
          {items.length === 0 && (
            <tr>
              <td colSpan={isReceipt ? 7 : 9} className="px-2 py-4 text-center text-muted-foreground">
                Brak pozycji na dokumencie
              </td>
            </tr>
          )}
        </tbody>
        {items.length > 0 && (
          <InvoiceItemsTableFooter
            totalNetValue={totalNetValue}
            totalVatValue={totalVatValue}
            totalGrossValue={totalGrossValue}
            isReceipt={isReceipt}
          />
        )}
      </table>
    </div>
  );
};
