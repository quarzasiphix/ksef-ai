
import React, { useState } from "react";
import { InvoiceItem, InvoiceType, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/invoice-utils";
import { Edit, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductEditDialog } from "./ProductEditDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableInvoiceItemsTableProps {
  items: InvoiceItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  onAddItem: (item: InvoiceItem) => void;
  documentType: InvoiceType;
  products: Product[];
}

export const EditableInvoiceItemsTable: React.FC<EditableInvoiceItemsTableProps> = ({
  items,
  onRemoveItem,
  onUpdateItem,
  onAddItem,
  documentType,
  products
}) => {
  const isReceipt = documentType === InvoiceType.RECEIPT;
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  
  // Calculate totals
  const totalNetValue = items.reduce((sum, item) => sum + (item.totalNetValue || 0), 0);
  const totalVatValue = items.reduce((sum, item) => sum + (item.totalVatValue || 0), 0);
  const totalGrossValue = items.reduce((sum, item) => sum + (item.totalGrossValue || 0), 0);
  
  const handleQuantityChange = (id: string, value: string) => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    const quantity = Number(value);
    if (isNaN(quantity) || quantity < 0) return;
    
    recalculateItemTotals(id, { quantity });
  };

  const handleUnitPriceChange = (id: string, value: string) => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    const unitPrice = Number(value);
    if (isNaN(unitPrice) || unitPrice < 0) return;
    
    recalculateItemTotals(id, { unitPrice });
  };

  const handleVatRateChange = (id: string, value: string) => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    const vatRate = Number(value);
    if (isNaN(vatRate) || vatRate < 0) return;
    
    recalculateItemTotals(id, { vatRate });
  };

  const recalculateItemTotals = (id: string, updates: Partial<InvoiceItem>) => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    const quantity = updates.quantity !== undefined ? updates.quantity : item.quantity;
    const unitPrice = updates.unitPrice !== undefined ? updates.unitPrice : item.unitPrice;
    const vatRate = updates.vatRate !== undefined ? updates.vatRate : item.vatRate;
    
    const totalNetValue = unitPrice * quantity;
    const totalVatValue = isReceipt ? 0 : totalNetValue * (vatRate / 100);
    const totalGrossValue = totalNetValue + totalVatValue;
    
    onUpdateItem(id, {
      ...updates,
      totalNetValue,
      totalVatValue,
      totalGrossValue
    });
  };

  const handleProductSelected = (productId: string) => {
    if (!productId) return;
    setSelectedProductId("");
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const vatRate = isReceipt ? 0 : product.vatRate;
    const quantity = 1;
    const unitPrice = product.unitPrice;
    const totalNetValue = unitPrice * quantity;
    const totalVatValue = isReceipt ? 0 : totalNetValue * (vatRate / 100);
    const totalGrossValue = totalNetValue + totalVatValue;
    
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice,
      vatRate,
      unit: product.unit,
      totalNetValue,
      totalVatValue,
      totalGrossValue
    };
    
    onAddItem(newItem);
  };

  const handleNewProductAdded = (product: Product) => {
    const vatRate = isReceipt ? 0 : product.vatRate;
    const quantity = 1;
    const unitPrice = product.unitPrice;
    const totalNetValue = unitPrice * quantity;
    const totalVatValue = isReceipt ? 0 : totalNetValue * (vatRate / 100);
    const totalGrossValue = totalNetValue + totalVatValue;
    
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      productId: undefined,
      name: product.name,
      quantity,
      unitPrice,
      vatRate,
      unit: product.unit,
      totalNetValue,
      totalVatValue,
      totalGrossValue
    };
    
    onAddItem(newItem);
  };

  // Mobile view
  if (window.innerWidth < 768) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1">
            <Select 
              value={selectedProductId} 
              onValueChange={handleProductSelected}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz produkt" />
              </SelectTrigger>
              <SelectContent>
                {products.length > 0 ? (
                  products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.unitPrice.toFixed(2)} zł
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Brak produktów
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <ProductEditDialog 
            mode="create" 
            documentType={documentType}
            onProductSaved={handleNewProductAdded}
          />
        </div>

        {items.map((item, index) => (
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
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
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
                  onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                  className="h-7 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Wartość netto:</label>
                <p>{formatCurrency(item.totalNetValue || 0)}</p>
              </div>
              {!isReceipt && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">VAT:</label>
                    <Select 
                      value={item.vatRate.toString()} 
                      onValueChange={(value) => handleVatRateChange(item.id, value)}
                    >
                      <SelectTrigger className="h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="23">23%</SelectItem>
                        <SelectItem value="8">8%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="0">0%</SelectItem>
                      </SelectContent>
                    </Select>
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1">
          <Select 
            value={selectedProductId} 
            onValueChange={handleProductSelected}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz produkt" />
            </SelectTrigger>
            <SelectContent>
              {products.length > 0 ? (
                products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {product.unitPrice.toFixed(2)} zł
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  Brak produktów
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <ProductEditDialog 
          mode="create" 
          documentType={documentType}
          onProductSaved={handleNewProductAdded}
        />
      </div>

      <div className="overflow-x-auto border rounded-md">
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
              <th className="px-2 py-2 text-center text-xs font-medium w-20">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b">
                <td className="px-2 py-2 text-left">{index + 1}</td>
                <td className="px-2 py-2 text-left">{item.name}</td>
                <td className="px-2 py-2 text-right">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
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
                    onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                    className="h-7 w-24 inline-block text-right"
                  />
                </td>
                <td className="px-2 py-2 text-right">{formatCurrency(item.totalNetValue || 0)}</td>
                {!isReceipt && (
                  <>
                    <td className="px-2 py-2 text-right">
                      <Select 
                        value={item.vatRate.toString()} 
                        onValueChange={(value) => handleVatRateChange(item.id, value)}
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
          )}
        </table>
      </div>
    </div>
  );
};
