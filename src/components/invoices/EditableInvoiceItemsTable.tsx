
import React, { useState } from "react";
import { InvoiceItem, InvoiceType, Product } from "@/types";
import { useMediaQuery } from "@/hooks/use-mobile";
import { ProductSelector } from "./invoice-items/ProductSelector";
import { DesktopInvoiceItemsTable } from "./invoice-items/DesktopInvoiceItemsTable";
import { MobileInvoiceItemsList } from "./invoice-items/MobileInvoiceItemsList";

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
  const isMobile = useMediaQuery("(max-width: 768px)");

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
    
    let vatRate = Number(value);
    if (isNaN(vatRate) || vatRate < 0) vatRate = 0;
    
    recalculateItemTotals(id, { vatRate });
  };


  const recalculateItemTotals = (id: string, updates: Partial<InvoiceItem>) => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    const quantity = updates.quantity !== undefined ? updates.quantity : item.quantity;
    const unitPrice = updates.unitPrice !== undefined ? updates.unitPrice : item.unitPrice;
    let vatRate = updates.vatRate !== undefined ? updates.vatRate : item.vatRate;
    if (isNaN(vatRate) || vatRate < 0) vatRate = 0;

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
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    let vatRate = isReceipt ? 0 : product.vatRate;
    if (isNaN(vatRate) || vatRate < 0) vatRate = 0;
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
    let vatRate = isReceipt ? 0 : product.vatRate;
    if (isNaN(vatRate) || vatRate < 0) vatRate = 0;
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


  return (
    <div className="space-y-4">
      <ProductSelector
        products={products}
        documentType={documentType}
        onProductSelected={handleProductSelected}
        onNewProductAdded={handleNewProductAdded}
      />

      {isMobile ? (
        <MobileInvoiceItemsList
          items={items}
          documentType={documentType}
          isReceipt={isReceipt}
          totalNetValue={totalNetValue}
          totalVatValue={totalVatValue}
          totalGrossValue={totalGrossValue}
          onRemoveItem={onRemoveItem}
          onUpdateItem={onUpdateItem}
        />
      ) : (
        <DesktopInvoiceItemsTable
          items={items}
          documentType={documentType}
          isReceipt={isReceipt}
          totalNetValue={totalNetValue}
          totalVatValue={totalVatValue}
          totalGrossValue={totalGrossValue}
          onRemoveItem={onRemoveItem}
          onUpdateItem={onUpdateItem}
        />
      )}
    </div>
  );
};
