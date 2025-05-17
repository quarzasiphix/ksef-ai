
import React from "react";
import { InvoiceItem, InvoiceType } from "@/types";
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
}

export const MobileInvoiceItemsList: React.FC<MobileInvoiceItemsListProps> = ({
  items,
  documentType,
  isReceipt,
  totalNetValue,
  totalVatValue,
  totalGrossValue,
  onRemoveItem,
  onUpdateItem
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
          totalVatValue={totalVatValue}
          totalGrossValue={totalGrossValue}
          isReceipt={isReceipt}
        />
      )}
    </div>
  );
};
