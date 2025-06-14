
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, InvoiceType, TransactionType } from "@/types";
import { ProductEditDialog } from "../ProductEditDialog";

interface ProductSelectorProps {
  products: Product[];
  documentType: InvoiceType;
  transactionType: TransactionType;
  onProductSelected: (productId: string) => void;
  onNewProductAdded: (product: Omit<Product, 'id'> & { id?: string }) => void;
  refetchProducts: () => Promise<void>;
  onProductSavedAndSync?: (product: Product) => void; // NEW: for instant UI update
  userId: string;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  products,
  documentType,
  transactionType,
  onProductSelected,
  onNewProductAdded,
  refetchProducts,
  onProductSavedAndSync, // FIX: destructure from props
  userId
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  
  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    onProductSelected(value);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex-1">
        <Select 
          value={selectedProductId} 
          onValueChange={handleProductChange}
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
        transactionType={transactionType}
        onProductSaved={async (product) => {
          onNewProductAdded(product);
          await refetchProducts();
        }}
        onProductSavedAndSync={onProductSavedAndSync as any}
        refetchProducts={refetchProducts}
        userId={userId}
      />
    </div>
  );
};
