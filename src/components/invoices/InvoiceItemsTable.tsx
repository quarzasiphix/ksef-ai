import React from "react";
import { InvoiceItem, InvoiceType } from "@/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/invoice-utils";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MobileInvoiceItemsList } from "./invoice-items/MobileInvoiceItemsList";

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  documentType: InvoiceType;
  readOnly?: boolean;
  currency?: string;
}

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  items,
  onRemoveItem,
  onUpdateItem,
  documentType,
  readOnly = false,
  currency = 'PLN',
}) => {
  const isReceipt = documentType === InvoiceType.RECEIPT;
  
  // Calculate totals
  const totalNetValue = items.reduce((sum, item) => sum + (item.totalNetValue || 0), 0);
  const totalVatValue = items.reduce((sum, item) => sum + (item.totalVatValue || 0), 0);
  const totalGrossValue = items.reduce((sum, item) => sum + (item.totalGrossValue || 0), 0);
  
  const handleQuantityChange = (id: string, value: string) => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    const quantity = Number(value);
    if (isNaN(quantity) || quantity < 0) return;
    
    const totalNetValue = item.unitPrice * quantity;
    const totalVatValue = isReceipt ? 0 : totalNetValue * (Number(item.vatRate) / 100);
    const totalGrossValue = totalNetValue + totalVatValue;
    
    onUpdateItem(id, {
      quantity,
      totalNetValue,
      totalVatValue,
      totalGrossValue
    });
  };
  
  // Mobile view
  if (window.innerWidth < 768) {
    return (
      <MobileInvoiceItemsList
        items={items}
        documentType={documentType}
        isReceipt={isReceipt}
        totalNetValue={totalNetValue}
        totalVatValue={totalVatValue}
        totalGrossValue={totalGrossValue}
        onRemoveItem={onRemoveItem}
        onUpdateItem={onUpdateItem}
        fakturaBezVAT={undefined}
        vatExemptionReason={undefined}
        currency={currency}
      />
    );
  }
  
  // Desktop view
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
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
            {!readOnly && (
              <th className="px-2 py-2 text-center text-xs font-medium w-16">Akcje</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="border-b">
              <td className="px-2 py-2 text-left">{index + 1}</td>
              <td className="px-2 py-2 text-left">{item.name}</td>
              <td className="px-2 py-2 text-right">
                {readOnly ? (
                  item.quantity
                ) : (
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    className="h-7 w-16 inline-block text-right"
                  />
                )}
              </td>
              <td className="px-2 py-2 text-right">{item.unit}</td>
              <td className="px-2 py-2 text-right">{formatCurrency(item.unitPrice, currency)}</td>
              <td className="px-2 py-2 text-right">{formatCurrency(item.totalNetValue || 0, currency)}</td>
              {!isReceipt && (
                <>
                  <td className="px-2 py-2 text-right">{item.vatRate}%</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(item.totalVatValue || 0, currency)}</td>
                </>
              )}
              <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.totalGrossValue || 0, currency)}</td>
              {!readOnly && (
                <td className="px-2 py-2 text-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onRemoveItem(item.id)}
                    className="h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
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
          <tfoot>
            <tr className="border-t border-t-gray-300 font-medium">
              <td colSpan={isReceipt ? 5 : 5} className="px-2 py-2 text-right">
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
              {!readOnly && <td></td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};
