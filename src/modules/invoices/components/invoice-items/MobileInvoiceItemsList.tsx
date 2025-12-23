import React from "react";
import { InvoiceItem, InvoiceType } from "@/shared/types";
import { InvoiceItemMobileCard } from "./InvoiceItemMobileCard";
import { TotalsSummary } from "./TotalsSummary";

interface MobileInvoiceItemsListProps {
  items: InvoiceItem[];
  documentType: InvoiceType;
  isReceipt: boolean;
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: string | null;
  currency?: string;
}

export const MobileInvoiceItemsList: React.FC<MobileInvoiceItemsListProps> = ({
  items,
  documentType,
  isReceipt,
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  onRemoveItem,
  onUpdateItem,
  fakturaBezVAT,
  vatExemptionReason,
  currency = 'PLN',
}) => {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <InvoiceItemMobileCard
          key={item.id}
          item={item}
          index={index}
          isReceipt={isReceipt}
          documentType={documentType}
          onRemoveItem={onRemoveItem}
          onUpdateItem={onUpdateItem}
          fakturaBezVAT={fakturaBezVAT}
          vatExemptionReason={vatExemptionReason}
          currency={currency}
        />
      ))}
      
      {items.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          Brak pozycji na dokumencie
        </div>
      )}
      
      {items.length > 0 && (
        <TotalsSummary
          totalNetValue={totalNetValue}
          totalVatValue={fakturaBezVAT ? 0 : totalVatValue}
          totalGrossValue={totalGrossValue}
          isReceipt={isReceipt}
          fakturaBezVAT={fakturaBezVAT}
          currency={currency}
        />
      )}
    </div>
  );
};
