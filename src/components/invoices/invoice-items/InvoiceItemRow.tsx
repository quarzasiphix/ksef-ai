
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { InvoiceItem, InvoiceType } from "@/types";
import { formatCurrency } from "@/lib/invoice-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductEditDialog } from "../ProductEditDialog";

interface InvoiceItemRowProps {
  item: InvoiceItem;
  index: number;
  isReceipt: boolean;
  documentType: InvoiceType;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
}

export const InvoiceItemRow: React.FC<InvoiceItemRowProps> = ({
  item,
  index,
  isReceipt,
  documentType,
  onRemoveItem,
  onUpdateItem
}) => {
  const handleQuantityChange = (value: string) => {
    const quantity = Number(value);
    if (isNaN(quantity) || quantity < 0) return;
    
    onUpdateItem(item.id, { quantity });
  };

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = Number(value);
    if (isNaN(unitPrice) || unitPrice < 0) return;
    
    onUpdateItem(item.id, { unitPrice });
  };

  const handleVatRateChange = (value: string) => {
    const vatRate = Number(value);
    if (isNaN(vatRate) || vatRate < 0) return;
    
    onUpdateItem(item.id, { vatRate });
  };

  return (
    <tr key={item.id} className="border-b">
      <td className="px-2 py-2 text-left">{index + 1}</td>
      <td className="px-2 py-2 text-left">{item.name}</td>
      <td className="px-2 py-2 text-right">
        <Input
          type="number"
          min="0"
          step="1"
          value={item.quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          className="h-7 w-16 inline-block text-right"
        />
      </td>
      <td className="px-2 py-2 text-right">{item.unit}</td>
      <td className="px-2 py-2 text-right">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => handleUnitPriceChange(e.target.value)}
          className="h-7 w-24 inline-block text-right"
        />
      </td>
      <td className="px-2 py-2 text-right">{formatCurrency(item.totalNetValue || 0)}</td>
      {!isReceipt && (
        <>
          <td className="px-2 py-2 text-right">
            <Select 
              value={item.vatRate.toString()} 
              onValueChange={handleVatRateChange}
            >
              <SelectTrigger className="h-7 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="23">23%</SelectItem>
                <SelectItem value="8">8%</SelectItem>
                <SelectItem value="5">5%</SelectItem>
                <SelectItem value="0">0%</SelectItem>
              </SelectContent>
            </Select>
          </td>
          <td className="px-2 py-2 text-right">{formatCurrency(item.totalVatValue || 0)}</td>
        </>
      )}
      <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.totalGrossValue || 0)}</td>
      <td className="px-2 py-2 text-center">
        <div className="flex justify-center items-center gap-1">
          {item.productId && (
            <ProductEditDialog
              mode="edit"
              initialProduct={{
                id: item.productId,
                name: item.name,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate,
                unit: item.unit
              }}
              documentType={documentType}
              onProductSaved={(product) => {
                // Optional: Update this item with the updated product data
              }}
            />
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onRemoveItem(item.id)}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
