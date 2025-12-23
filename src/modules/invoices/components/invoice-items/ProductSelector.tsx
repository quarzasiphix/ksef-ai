
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { Product, InvoiceType, TransactionType } from "@/shared/types";
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
            <SelectValue placeholder="Wybierz produkt z katalogu" />
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
                Brak produktów w katalogu
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
        trigger={
          <Button type="button" variant="outline" size="sm" className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-1" />
            Dodaj do katalogu
          </Button>
        }
      />
    </div>
  );
};
