import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { InvoiceItem, InvoiceType, Product, VatExemptionReason } from "@/shared/types";
import { TransactionType } from "@/shared/types/common";
import { Trash2, Plus } from "lucide-react";
import { ProductSelector } from "./invoice-items/ProductSelector";
import { InvoiceItemMobileCard } from "./invoice-items/InvoiceItemMobileCard";
import { formatCurrency, calculateInvoiceTotals } from "@/shared/lib/invoice-utils";

interface EditableInvoiceItemsTableProps {
  items: InvoiceItem[];
  products: Product[];
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  onAddItem: (item: InvoiceItem) => void;
  documentType: InvoiceType;
  transactionType: TransactionType;
  refetchProducts: () => Promise<void>;
  userId: string;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: VatExemptionReason;
  currency?: string;
}

export const EditableInvoiceItemsTable: React.FC<EditableInvoiceItemsTableProps> = ({
  items,
  products,
  onRemoveItem,
  onUpdateItem,
  onAddItem,
  documentType,
  transactionType,
  refetchProducts,
  userId,
  fakturaBezVAT,
  vatExemptionReason,
  currency = 'PLN',
}) => {
  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    vatRate: documentType === InvoiceType.RECEIPT ? 0 : 23,
    unit: "szt."
  });

  // Filter products based on document type
  const filteredProducts = products.filter(product => product.product_type === transactionType);

  const handleAddManualItem = () => {
    if (!newItem.name || !newItem.quantity || !newItem.unitPrice) return;

    const quantity = Number(newItem.quantity) || 0;
    const unitPrice = Number(newItem.unitPrice) || 0;
    const vatRate = Number(newItem.vatRate) || 0;

    const totalNetValue = quantity * unitPrice;
    const totalVatValue = (documentType === InvoiceType.RECEIPT || fakturaBezVAT || vatRate <= 0) ? 0 : (totalNetValue * vatRate) / 100;
    const totalGrossValue = totalNetValue + totalVatValue;

    const item: InvoiceItem = {
      id: crypto.randomUUID(),
      name: newItem.name,
      description: newItem.description || newItem.name,
      quantity,
      unitPrice,
      vatRate: fakturaBezVAT ? -1 : vatRate,
      unit: newItem.unit || "szt.",
      totalNetValue: Number(totalNetValue.toFixed(2)),
      totalVatValue: Number(totalVatValue.toFixed(2)),
      totalGrossValue: Number(totalGrossValue.toFixed(2))
    };

    onAddItem(item);

    // Reset form
    setNewItem({
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      vatRate: documentType === InvoiceType.RECEIPT ? 0 : 23,
      unit: "szt."
    });
  };

  const handleProductSelected = (productId: string) => {
    const product = filteredProducts.find(p => p.id === productId);
    if (!product) return;

    const quantity = 1;
    const unitPrice = product.unitPrice;
    const vatRate = fakturaBezVAT ? -1 : (documentType === InvoiceType.RECEIPT ? 0 : product.vatRate);

    const totalNetValue = quantity * unitPrice;
    const totalVatValue = (documentType === InvoiceType.RECEIPT || fakturaBezVAT || vatRate <= 0) ? 0 : (totalNetValue * vatRate) / 100;
    const totalGrossValue = totalNetValue + totalVatValue;

    const item: InvoiceItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      description: product.name,
      quantity,
      unitPrice,
      vatRate,
      unit: product.unit,
      totalNetValue: Number(totalNetValue.toFixed(2)),
      totalVatValue: Number(totalVatValue.toFixed(2)),
      totalGrossValue: Number(totalGrossValue.toFixed(2))
    };

    onAddItem(item);
  };

  const handleNewProductAdded = async (product: Omit<Product, 'id'> & { id?: string }) => {
    // Ensure we have latest products
    await refetchProducts();

    // Auto-add newly created product to the invoice
    const quantity = 1;
    const unitPrice = product.unitPrice;
    const vatRate = fakturaBezVAT ? -1 : (documentType === InvoiceType.RECEIPT ? 0 : Number(product.vatRate));

    const totalNetValue = quantity * unitPrice;
    const totalVatValue = (documentType === InvoiceType.RECEIPT || fakturaBezVAT || vatRate <= 0) ? 0 : (totalNetValue * vatRate) / 100;
    const totalGrossValue = totalNetValue + totalVatValue;

    const item: InvoiceItem = {
      id: crypto.randomUUID(),
      productId: product.id ?? undefined,
      name: product.name,
      description: product.name,
      quantity,
      unitPrice,
      vatRate,
      unit: product.unit,
      totalNetValue: Number(totalNetValue.toFixed(2)),
      totalVatValue: Number(totalVatValue.toFixed(2)),
      totalGrossValue: Number(totalGrossValue.toFixed(2)),
    } as InvoiceItem;

    onAddItem(item);
  };

  // Calculate totals using calculateInvoiceTotals for consistency
  const { totalNetValue: totalNet, totalVatValue: totalVat, totalGrossValue: totalGross } = calculateInvoiceTotals(items);

  return (
    <div className="space-y-6">
      {/* Product Catalog Section */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">📦</div>
            <span className="text-base font-bold text-blue-900 dark:text-blue-100">Z katalogu produktów (szybko)</span>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 ml-8">Wybierz zapisany produkt lub dodaj nowy do katalogu na przyszłość</p>
        </div>
        <ProductSelector
          products={filteredProducts}
          documentType={documentType}
          onProductSelected={handleProductSelected}
          onNewProductAdded={handleNewProductAdded}
          refetchProducts={refetchProducts}
          userId={userId}
        />
      </div>

      {/* One-off Items Section */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-bold">✏️</div>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">Jednorazowa pozycja na fakturze</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 ml-8">Dodaj pozycję ręcznie (nie zapisze się w katalogu)</p>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden space-y-4">
        {items.map((item, index) => (
          <InvoiceItemMobileCard
            key={item.id}
            item={item}
            index={index}
            isReceipt={documentType === InvoiceType.RECEIPT}
            documentType={documentType}
            onRemoveItem={onRemoveItem}
            onUpdateItem={onUpdateItem}
            fakturaBezVAT={fakturaBezVAT}
            vatExemptionReason={vatExemptionReason}
          />
        ))}
      </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-[#181C27] text-white">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2 font-medium">Nazwa</th>
                <th className="text-left p-2 font-medium">Ilość</th>
                <th className="text-left p-2 font-medium">Jedn.</th>
                <th className="px-2 py-2 text-left text-xs font-medium">Cena netto</th>
              {documentType !== InvoiceType.RECEIPT && !fakturaBezVAT && (
                <th className="px-2 py-2 text-left text-xs font-medium">VAT %</th>
              )}
                <th className="px-2 py-2 text-left text-xs font-medium">Wartość brutto</th>
                <th className="text-left p-2 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-700 bg-[#181C27]">
                  <td className="p-2">
                    <Textarea
                      value={item.name}
                      onChange={(e) => onUpdateItem(item.id, { name: e.target.value })}
                      className="min-w-[150px] min-h-[60px] bg-[#23283A] text-white border-gray-700 resize-none"
                      placeholder="Nazwa produktu"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(item.id, { quantity: Number(e.target.value) })}
                      className="w-20 bg-[#23283A] text-white border-gray-700"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={item.unit}
                      onChange={(e) => onUpdateItem(item.id, { unit: e.target.value })}
                      className="w-16 bg-[#23283A] text-white border-gray-700"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => onUpdateItem(item.id, { unitPrice: Number(e.target.value) })}
                      className="w-24 bg-[#23283A] text-white border-gray-700"
                      min="0"
                      step="0.01"
                    />
                  </td>
                {documentType !== InvoiceType.RECEIPT && !fakturaBezVAT && (
                    <td className="p-2">
                      <Select
                        value={item.vatRate?.toString()}
                        onValueChange={(value) => onUpdateItem(item.id, { vatRate: Number(value) })}
                      >
                        <SelectTrigger className="w-20 bg-[#23283A] text-white border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#23283A] text-white">
                          <SelectItem value="23">23%</SelectItem>
                          <SelectItem value="8">8%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="-1">zw</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                )}
                <td className="p-2 text-right font-semibold">{formatCurrency(item.totalGrossValue || 0, currency)}</td>
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}

              {/* Add new item row */}
              <tr className="border-b border-gray-700 bg-[#2A3142]">
                <td className="p-2">
                  <Input
                    placeholder="Jednorazowa pozycja (nie zapisze się w katalogu)"
                    value={newItem.name || ""}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="min-w-[150px] bg-[#23283A] text-white border-gray-700"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    placeholder="1"
                    value={newItem.quantity || ""}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className="w-20 bg-[#23283A] text-white border-gray-700"
                    min="0"
                    step="0.01"
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="szt."
                    value={newItem.unit || ""}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-16 bg-[#23283A] text-white border-gray-700"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({...newItem, unitPrice: Number(e.target.value)})}
                    className="h-7 w-24 bg-[#23283A] text-white border-gray-700"
                    placeholder="0.00"
                  />
                </td>
              {documentType !== InvoiceType.RECEIPT && !fakturaBezVAT && (
                  <td className="px-2 py-2">
                    <Select
                      value={newItem.vatRate?.toString() || '23'}
                      onValueChange={(value) => setNewItem({...newItem, vatRate: Number(value)})}
                    >
                      <SelectTrigger className="h-7 w-20 bg-[#23283A] text-white border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#23283A] text-white">
                        <SelectItem value="23">23%</SelectItem>
                        <SelectItem value="8">8%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="-1">zw</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
              )}
                <td className="px-2 py-2 text-right text-gray-400">
                  {newItem.quantity && newItem.unitPrice ? 
                    formatCurrency(
                      (Number(newItem.quantity) * Number(newItem.unitPrice)) * 
                      (1 + (documentType === InvoiceType.RECEIPT || fakturaBezVAT ? 0 : (Number(newItem.vatRate || 23) / 100))),
                      currency
                    ) : '—'
                  }
                </td>
                <td className="p-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddManualItem}
                    disabled={!newItem.name || !newItem.quantity || !newItem.unitPrice}
                    className="whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Dodaj
                  </Button>
                  {(!newItem.name || !newItem.quantity || !newItem.unitPrice) && (
                    <div className="text-xs text-gray-400 mt-1">Podaj nazwę i cenę</div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
          💡 Jeśli chcesz zapisać ten produkt na przyszłość → użyj "Dodaj do katalogu" powyżej
        </div>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="bg-gray-900 p-4 rounded-lg space-y-2 text-white">
          <div className="flex justify-between">
            <span>Suma netto:</span>
            <span className="font-medium">{formatCurrency(totalNet, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Suma VAT:</span>
            <span className="font-medium">{formatCurrency(totalVat, currency)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Suma brutto:</span>
            <span>{formatCurrency(totalGross, currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
