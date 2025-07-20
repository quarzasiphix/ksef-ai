import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { InvoiceItem, InvoiceType, VatType, Product } from "@/types";
import { formatCurrency, calculateItemValues } from "@/lib/invoice-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductEditDialog } from "../ProductEditDialog";
import { Checkbox } from "@/components/ui/checkbox";

interface InvoiceItemRowProps {
  item: InvoiceItem;
  index: number;
  isReceipt: boolean;
  documentType: InvoiceType;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  userId: string;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: string | null;
  onClick?: (event: React.MouseEvent<HTMLTableRowElement, MouseEvent>) => void;
  currency?: string;
}

export const InvoiceItemRow: React.FC<InvoiceItemRowProps> = ({
  item,
  index,
  isReceipt,
  documentType,
  onRemoveItem,
  onUpdateItem,
  userId,
  fakturaBezVAT,
  vatExemptionReason,
  onClick,
  currency = 'PLN',
}) => {
  const handleQuantityChange = (value: string) => {
    const quantity = Number(value);
    if (isNaN(quantity) || quantity < 0) return;
    
    const updated = calculateItemValues({ ...item, quantity });
    onUpdateItem(item.id, updated);
  };

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = Number(value);
    if (isNaN(unitPrice) || unitPrice < 0) return;
    
    const updated = calculateItemValues({ ...item, unitPrice });
    onUpdateItem(item.id, updated);
  };

  const handleVatRateChange = (value: string) => {
    // Handle VAT exemption
    const vatRate = value === 'zw' ? -1 : Number(value);
    if (value !== 'zw' && isNaN(Number(value))) return;
    // Update the item with the new VAT rate
    const updated = calculateItemValues({ ...item, vatRate: Number(vatRate) });
    onUpdateItem(item.id, updated);
  };

  // Ensure VAT-exempt items are handled correctly on initial load
  React.useEffect(() => {
    if (item.vatRate === -1) {
      const updated = calculateItemValues({ ...item, vatRate: -1 });
      onUpdateItem(item.id, updated);
    }
  }, [item.id]);

  const handleZwolnionyZVATChange = (checked: boolean | string) => {
    const isChecked = typeof checked === 'string' ? checked === 'true' : checked;
    const vatRate = isChecked ? -1 : 23; // Default to 23% if not exempt
    const updated = calculateItemValues({ ...item, vatRate: Number(vatRate) });
    onUpdateItem(item.id, updated);
  };
  
  return (
    <tr key={item.id} className="border-b" onClick={onClick}>
      <td className="px-2 py-2 text-left">{index + 1}</td>
      <td className="px-2 py-2 text-left">
        {item.name}
      </td>
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
      <td className="px-2 py-2 text-right">{formatCurrency(item.totalNetValue || 0, currency)}</td>
      {!isReceipt && (
        <>
          <td className="px-2 py-2 text-right">
            <Select 
              value={item.vatRate === -1 ? 'zw' : item.vatRate.toString()} 
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
                <SelectItem value="zw">zw</SelectItem>
              </SelectContent>
            </Select>
          </td>
          <td className="px-2 py-2 text-right">{formatCurrency(item.totalVatValue || 0, currency)}</td>
        </>
      )}
      <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.totalGrossValue || 0, currency)}</td>
      <td className="px-2 py-2 text-center">
        <div className="flex justify-center items-center gap-1">
          {item.productId && (
            <ProductEditDialog
              mode="edit"
              initialProduct={{
                id: item.productId,
                name: item.name,
                unitPrice: item.unitPrice,
                vatRate: Number(item.vatRate),
                unit: item.unit
              }}
              documentType={documentType}
              onProductSaved={(product: Product) => {
                let vatRate: number;
                if (typeof product.vatRate === 'string') {
                  vatRate = product.vatRate === 'zw' ? -1 : Number(product.vatRate);
                } else {
                  vatRate = product.vatRate === -1 ? -1 : product.vatRate;
                }
                onUpdateItem(item.id, {
                  ...calculateItemValues({
                    ...item,
                    name: product.name,
                    unitPrice: product.unitPrice,
                    vatRate: Number(vatRate),
                    unit: product.unit
                  })
                });
              }}
              userId={userId}
            />
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onRemoveItem(item.id);
            }}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};