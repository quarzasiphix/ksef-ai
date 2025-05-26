
import React from "react";
import { InvoiceItem, InvoiceType } from "@/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/invoice-utils";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  documentType: InvoiceType;
  readOnly?: boolean;
}

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  items,
  onRemoveItem,
  onUpdateItem,
  documentType,
  readOnly = false
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
    const totalVatValue = isReceipt ? 0 : totalNetValue * (item.vatRate / 100);
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
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="border rounded-md p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{index + 1}. {item.name}</span>
              {!readOnly && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onRemoveItem(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <label className="text-xs text-muted-foreground">Ilość:</label>
                {readOnly ? (
                  <p>{item.quantity} {item.unit}</p>
                ) : (
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    className="h-7 mt-1"
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cena netto:</label>
                <p>{formatCurrency(item.unitPrice)}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Wartość netto:</label>
                <p>{formatCurrency(item.totalNetValue || 0)}</p>
              </div>
              {!isReceipt && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">VAT:</label>
                    <p>{item.vatRate}%</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Kwota VAT:</label>
                    <p>{formatCurrency(item.totalVatValue || 0)}</p>
                  </div>
                </>
              )}
              <div className={isReceipt ? "col-span-2" : ""}>
                <label className="text-xs text-muted-foreground">Wartość brutto:</label>
                <p className="font-medium">{formatCurrency(item.totalGrossValue || 0)}</p>
              </div>
            </div>
          </div>
        ))}
        
        {items.length > 0 && (
          <div className="bg-slate-50 p-3 rounded-md border">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-right font-medium">Razem netto:</div>
              <div>{formatCurrency(totalNetValue)}</div>
              
              {!isReceipt && (
                <>
                  <div className="text-right font-medium">Razem VAT:</div>
                  <div>{formatCurrency(totalVatValue)}</div>
                </>
              )}
              
              <div className="text-right font-medium">Razem brutto:</div>
              <div className="font-bold">{formatCurrency(totalGrossValue)}</div>
            </div>
          </div>
        )}
        
        {items.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            Brak pozycji na dokumencie
          </div>
        )}
      </div>
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
              <td className="px-2 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
              <td className="px-2 py-2 text-right">{formatCurrency(item.totalNetValue || 0)}</td>
              {!isReceipt && (
                <>
                  <td className="px-2 py-2 text-right">{item.vatRate}%</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(item.totalVatValue || 0)}</td>
                </>
              )}
              <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.totalGrossValue || 0)}</td>
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
              <td className="px-2 py-2 text-right">{formatCurrency(totalNetValue)}</td>
              {!isReceipt && (
                <>
                  <td></td>
                  <td className="px-2 py-2 text-right">{formatCurrency(totalVatValue)}</td>
                </>
              )}
              <td className="px-2 py-2 text-right font-bold">{formatCurrency(totalGrossValue)}</td>
              {!readOnly && <td></td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};
