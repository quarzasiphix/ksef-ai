
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, InvoiceType } from "@/types";
import { ProductEditDialog } from "../ProductEditDialog";

interface ProductSelectorProps {
  products: Product[];
  documentType: InvoiceType;
  onProductSelected: (productId: string) => void;
  onNewProductAdded: (product: Product) => void;
  refetchProducts: () => Promise<void>;
  onProductSavedAndSync?: (product: Product) => void; // NEW: for instant UI update
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  products,
  documentType,
  onProductSelected,
  onNewProductAdded,
  refetchProducts,
  onProductSavedAndSync // FIX: destructure from props
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
        onProductSaved={async (product) => {
          onNewProductAdded(product);
          await refetchProducts();
        }}
        onProductSavedAndSync={onProductSavedAndSync} // NEW: pass down
        refetchProducts={refetchProducts}
      />
    </div>
  );
};
