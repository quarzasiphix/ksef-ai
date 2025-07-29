
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, InvoiceType, TransactionType } from "@/types";
import { ProductEditDialog } from "../ProductEditDialog";

interface ProductSelectorProps {
  products: Product[];
  documentType: InvoiceType;
  transactionType?: TransactionType;
  onProductSelected: (productId: string) => void;
  onNewProductAdded: (product: Omit<Product, 'id'> & { id?: string }) => void;
  refetchProducts: () => Promise<void>;
  onProductSavedAndSync?: (product: Product) => void;
  userId: string;
  currency?: string;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  products,
  documentType,
  transactionType,
  onProductSelected,
  onNewProductAdded,
  refetchProducts,
  onProductSavedAndSync,
  userId,
  currency = 'PLN',
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  
  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    onProductSelected(value);
  };

  const handleProductSaved = async (product: Omit<Product, 'id'> & { id?: string }) => {
    onNewProductAdded(product);
    await refetchProducts();
    // Clear selection after adding
    setSelectedProductId("");
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
                  <span style={{ whiteSpace: 'pre-wrap' }}>{product.name}</span> - {new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(product.unitPrice)}
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
        onProductSaved={handleProductSaved}
        onProductSavedAndSync={onProductSavedAndSync as any}
        refetchProducts={refetchProducts}
        userId={userId}
      />
    </div>
  );
};
