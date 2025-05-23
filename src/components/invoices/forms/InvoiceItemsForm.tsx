import React, { useState, useEffect } from "react";
import { CardHeader, CardTitle, CardContent, Card } from "@/components/ui/card";
import { EditableInvoiceItemsTable } from "@/components/invoices/EditableInvoiceItemsTable";
import { calculateItemValues } from "@/lib/invoice-utils";
import { InvoiceItem, InvoiceType, Product } from "@/types";
import { TransactionType } from "@/types/common";
import { getProducts } from "@/integrations/supabase/repositories/productRepository";
import { toast } from "sonner";

interface InvoiceItemsFormProps {
  items: InvoiceItem[];
  documentType: InvoiceType;
  transactionType: TransactionType;
  onItemsChange: (items: InvoiceItem[]) => void;
  userId: string;
  fakturaBezVAT?: boolean;
  vatExemptionReason?: string;
}

export const InvoiceItemsForm: React.FC<InvoiceItemsFormProps> = ({
  items,
  documentType,
  transactionType,
  onItemsChange,
  userId,
  fakturaBezVAT,
  vatExemptionReason
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Refetch products
  const refetchProducts = async () => {
    setProductsLoading(true);
    try {
      const productData = await getProducts(userId);
      setProducts(productData);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Nie udało się załadować produktów");
    } finally {
      setProductsLoading(false);
    }
  };

  // Load products on mount
  useEffect(() => {
    refetchProducts();
    // eslint-disable-next-line
  }, []);



  const handleAddItem = (newItem: InvoiceItem) => {
    onItemsChange([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    onItemsChange(items.map(item =>
      item.id === id ? calculateItemValues({ ...item, ...updates }) : calculateItemValues(item)
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
            refetchProducts={refetchProducts}
            userId={userId}
            fakturaBezVAT={fakturaBezVAT}
            vatExemptionReason={vatExemptionReason}
          />
        )}
      </CardContent>
    </Card>
  );
};
