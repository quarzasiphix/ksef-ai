
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Edit } from "lucide-react";
import { InvoiceItem, InvoiceType } from "@/types";
import { formatCurrency } from "@/lib/invoice-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductEditDialog } from "../ProductEditDialog";

interface InvoiceItemMobileCardProps {
  item: InvoiceItem;
  index: number;
  isReceipt: boolean;
  documentType: InvoiceType;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: string | null;
  currency?: string;
}

export const InvoiceItemMobileCard: React.FC<InvoiceItemMobileCardProps> = ({
  item,
  index,
  isReceipt,
  documentType,
  onRemoveItem,
  onUpdateItem,
  fakturaBezVAT,
  vatExemptionReason,
  currency = 'PLN',
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
    const vatRate = value === 'zw' ? -1 : Number(value);
    if (value !== 'zw' && isNaN(Number(value))) return;
    
    onUpdateItem(item.id, { vatRate });
  };

  return (
    <div key={item.id} className="border rounded-md p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">{index + 1}. {item.name}</span>
        <div className="flex items-center gap-1">
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
              onProductSaved={(product) => {
                onUpdateItem(item.id, {
                  name: product.name,
                  unitPrice: product.unitPrice,
                  vatRate: Number(product.vatRate),
                  unit: product.unit
                });
              }}
            />
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onRemoveItem(item.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <label className="text-xs text-muted-foreground">Ilość:</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={item.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="h-7 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Cena netto:</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => handleUnitPriceChange(e.target.value)}
            className="h-7 mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Wartość netto:</label>
          <p>{formatCurrency(item.totalNetValue || 0, currency)}</p>
        </div>
        {!isReceipt && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">VAT:</label>
              <Select 
                value={item.vatRate === -1 ? 'zw' : item.vatRate.toString()} 
                onValueChange={(value) => handleVatRateChange(value)}
              >
                <SelectTrigger className="h-7">
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
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Kwota VAT:</label>
              <p>{formatCurrency(item.totalVatValue || 0, currency)}</p>
            </div>
          </>
        )}
        <div className={isReceipt ? "col-span-2" : ""}>
          <label className="text-xs text-muted-foreground">Wartość brutto:</label>
          <p className="font-medium">{formatCurrency(item.totalGrossValue || 0, currency)}</p>
        </div>
      </div>
    </div>
  );
};
