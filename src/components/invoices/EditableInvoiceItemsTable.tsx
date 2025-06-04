import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceItem, InvoiceType, Product, VatExemptionReason } from "@/types";
import { TransactionType } from "@/types/common";
import { Trash2, Plus } from "lucide-react";
import { ProductSelector } from "./invoice-items/ProductSelector";
import { InvoiceItemMobileCard } from "./invoice-items/InvoiceItemMobileCard";

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
  vatExemptionReason
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

  // Debug logs
  console.log('EditableInvoiceItemsTable products:', products);
  console.log('EditableInvoiceItemsTable filteredProducts:', filteredProducts);

  const handleAddManualItem = () => {
    if (!newItem.name || !newItem.quantity || !newItem.unitPrice) return;

    const quantity = Number(newItem.quantity) || 0;
    const unitPrice = Number(newItem.unitPrice) || 0;
    const vatRate = Number(newItem.vatRate) || 0;

    const totalNetValue = quantity * unitPrice;
    const totalVatValue = documentType === InvoiceType.RECEIPT ? 0 : (totalNetValue * vatRate) / 100;
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
    const totalVatValue = documentType === InvoiceType.RECEIPT || fakturaBezVAT ? 0 : (totalNetValue * vatRate) / 100;
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
    await refetchProducts();
  };

  // Calculate totals
  const totalNet = items.reduce((sum, item) => sum + (item.totalNetValue || 0), 0);
  const totalVat = items.reduce((sum, item) => sum + (item.totalVatValue || 0), 0);
  const totalGross = items.reduce((sum, item) => sum + (item.totalGrossValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <ProductSelector
        products={filteredProducts}
        documentType={documentType}
        onProductSelected={handleProductSelected}
        onNewProductAdded={handleNewProductAdded}
        refetchProducts={refetchProducts}
        userId={userId}
      />

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
                <th className="text-left p-2 font-medium">Cena netto</th>
                <th className="text-left p-2 font-medium">VAT</th>
                <th className="text-left p-2 font-medium">Wartość netto</th>
                <th className="text-left p-2 font-medium">Wartość VAT</th>
                <th className="text-left p-2 font-medium">Wartość brutto</th>
                <th className="text-left p-2 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-700 bg-[#181C27]">
                  <td className="p-2">
                    <Input
                      value={item.name}
                      onChange={(e) => onUpdateItem(item.id, { name: e.target.value })}
                      className="min-w-[150px] bg-[#23283A] text-white border-gray-700"
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
                  <td className="p-2 text-right">{(item.totalNetValue || 0).toFixed(2)} zł</td>
                  <td className="p-2 text-right">{(item.totalVatValue || 0).toFixed(2)} zł</td>
                  <td className="p-2 text-right">{(item.totalGrossValue || 0).toFixed(2)} zł</td>
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
              <tr className="border-b border-gray-700 bg-[#23283A]">
                <td className="p-2">
                  <Input
                    placeholder="Nazwa produktu"
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
                <td className="p-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newItem.unitPrice || ""}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                    className="w-24 bg-[#23283A] text-white border-gray-700"
                    min="0"
                    step="0.01"
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={newItem.vatRate?.toString()}
                    onValueChange={(value) => setNewItem({ ...newItem, vatRate: Number(value) })}
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
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddManualItem}
                    disabled={!newItem.name || !newItem.quantity || !newItem.unitPrice}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="bg-gray-900 p-4 rounded-lg space-y-2 text-white">
          <div className="flex justify-between">
            <span>Suma netto:</span>
            <span className="font-medium">{totalNet.toFixed(2)} zł</span>
          </div>
          <div className="flex justify-between">
            <span>Suma VAT:</span>
            <span className="font-medium">{totalVat.toFixed(2)} zł</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Suma brutto:</span>
            <span>{totalGross.toFixed(2)} zł</span>
          </div>
        </div>
      )}
    </div>
  );
};
