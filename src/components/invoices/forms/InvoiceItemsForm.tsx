
import React, { useState, useEffect } from "react";
import { CardHeader, CardTitle, CardContent, Card } from "@/components/ui/card";
import { EditableInvoiceItemsTable } from "@/components/invoices/EditableInvoiceItemsTable";
import { InvoiceItem, InvoiceType, Product } from "@/types";
import { getProducts } from "@/integrations/supabase/repositories/productRepository";
import { toast } from "sonner";

interface InvoiceItemsFormProps {
  items: InvoiceItem[];
  documentType: InvoiceType;
  onItemsChange: (items: InvoiceItem[]) => void;
}

export const InvoiceItemsForm: React.FC<InvoiceItemsFormProps> = ({
  items,
  documentType,
  onItemsChange
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productData = await getProducts();
        setProducts(productData);
      } catch (error) {
        console.error("Error loading products:", error);
        toast.error("Nie udało się załadować produktów");
      } finally {
        setProductsLoading(false);
      }
    };
    
    loadProducts();
  }, []);

  const handleAddItem = (newItem: InvoiceItem) => {
    onItemsChange([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    onItemsChange(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Pozycje dokumentu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {productsLoading ? (
          <div className="text-sm text-muted-foreground">Ładowanie produktów...</div>
        ) : (
          <EditableInvoiceItemsTable
            items={items}
            products={products}
            onRemoveItem={handleRemoveItem}
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            documentType={documentType}
          />
        )}
      </CardContent>
    </Card>
  );
};
