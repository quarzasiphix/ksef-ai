import React, { useState } from "react";
import { InvoiceItem, InvoiceType, Product, VatType, VatExemptionReason } from "@/types";
import { calculateItemValues } from "@/lib/invoice-utils";
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
  refetchProducts: () => Promise<void>;
  onProductSavedAndSync?: (product: Product) => void;
  userId: string;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: VatExemptionReason | null;
}

export const EditableInvoiceItemsTable: React.FC<EditableInvoiceItemsTableProps> = ({
  items,
  onRemoveItem,
  onUpdateItem,
  onAddItem,
  documentType,
  products,
  refetchProducts,
  onProductSavedAndSync,
  userId,
  fakturaBezVAT,
  vatExemptionReason
}) => {
  const isReceipt = documentType === InvoiceType.RECEIPT;
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Calculate totals using defensive calculation
  const calculatedItems: InvoiceItem[] = items.map(calculateItemValues);
  const totalNetValue = calculatedItems.reduce((sum, item) => sum + (item.totalNetValue || 0), 0);
  const totalVatValue = calculatedItems.reduce((sum, item) => sum + (item.totalVatValue || 0), 0);
  const totalGrossValue = calculatedItems.reduce((sum, item) => sum + (item.totalGrossValue || 0), 0);
  
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
    
    // Handle VAT exemption
    let vatRate: number;
    if (value === 'zw') {
      vatRate = Number(VatType.ZW);
    } else {
      vatRate = Number(value);
      if (isNaN(vatRate)) return;
    }
    
    recalculateItemTotals(id, { vatRate });
  };

  const recalculateItemTotals = (id: string, updates: Partial<InvoiceItem>) => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    // Always use defensive calculation
    const updated = calculateItemValues({ ...item, ...updates });
    onUpdateItem(id, updated);
  };

  const handleProductSelected = (productId: string) => {
    if (!productId) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Handle VAT rate conversion
    const vatRate = product.vatRate;
    
    const quantity = 1;
    const unitPrice = product.unitPrice;
    const totalNetValue = unitPrice * quantity;
    const totalVatValue = isReceipt || vatRate === -1 ? 0 : totalNetValue * (vatRate / 100);
    const totalGrossValue = totalNetValue + totalVatValue;
    
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      description: product.description || '',
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
    // Handle VAT rate conversion
    const vatRate = product.vatRate;

    const quantity = 1;
    const unitPrice = product.unitPrice;
    const totalNetValue = unitPrice * quantity;
    const totalVatValue = isReceipt || vatRate === -1 ? 0 : totalNetValue * (vatRate / 100);
    const totalGrossValue = totalNetValue + totalVatValue;
    
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      productId: undefined,
      name: product.name,
      description: product.description || '',
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

  // NEW: when a product is edited, update all invoice items with matching productId instantly
  const handleProductSavedAndSync = (product: Product) => {
    items.forEach(item => {
      if (item.productId === product.id && item.name !== product.name) {
        onUpdateItem(item.id, { name: product.name });
      }
    });
    if (onProductSavedAndSync) onProductSavedAndSync(product);
  };

  return (
    <div>
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
          fakturaBezVAT={fakturaBezVAT}
          vatExemptionReason={vatExemptionReason}
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
          fakturaBezVAT={fakturaBezVAT}
          vatExemptionReason={vatExemptionReason}
        />
      )}
      <div className="pt-4">
        <ProductSelector 
          products={products}
          documentType={documentType}
          onProductSelected={handleProductSelected}
          onNewProductAdded={handleNewProductAdded}
          refetchProducts={refetchProducts}
          onProductSavedAndSync={handleProductSavedAndSync} // NEW: pass handler
          userId={userId}
        />
      </div>
    </div>
  );
};
