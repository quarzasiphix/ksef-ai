import React, { useState, useEffect } from "react";
import { CardHeader, CardTitle, CardContent, Card } from "@/components/ui/card";
import { EditableInvoiceItemsTable } from "@/components/invoices/EditableInvoiceItemsTable";
import { calculateItemValues } from "@/lib/invoice-utils";
import { InvoiceItem, InvoiceType, Product, VatExemptionReason } from "@/types";
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
  vatExemptionReason?: VatExemptionReason;
  currency?: string;
}

export const InvoiceItemsForm: React.FC<InvoiceItemsFormProps> = ({
  items,
  documentType,
  transactionType,
  onItemsChange,
  userId,
  fakturaBezVAT,
  vatExemptionReason,
  currency = 'PLN',
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Refetch products based on transaction type
  const refetchProducts = async () => {
    setProductsLoading(true);
    try {
      // For sales invoices, get income products; for expense invoices, get expense products
      const productType = transactionType === TransactionType.INCOME ? 'income' : 'expense';
      const productData = await getProducts(userId, productType);
      setProducts(productData);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Nie udało się załadować produktów");
    } finally {
      setProductsLoading(false);
    }
  };

  // Load products on mount and when transaction type changes
  useEffect(() => {
    refetchProducts();
  }, [userId, transactionType]);

  // Debug: log loaded products
  useEffect(() => {
    if (!productsLoading) {
      console.log('InvoiceItemsForm loaded products:', products);
    }
  }, [products, productsLoading]);

  const handleAddItem = (newItem: InvoiceItem) => {
    onItemsChange([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    onItemsChange(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };
          const calculatedItem = calculateItemValues(updatedItem);
          // Ensure the ID is preserved, as calculateItemValues might not return it
          return { ...calculatedItem, id: item.id };
        }
        return item;
      })
    );
  };

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Pozycje dokumentu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <EditableInvoiceItemsTable
          items={items}
          products={productsLoading ? [] : products}
          onRemoveItem={handleRemoveItem}
          onUpdateItem={handleUpdateItem}
          onAddItem={handleAddItem}
          documentType={documentType}
          transactionType={transactionType}
          refetchProducts={refetchProducts}
          userId={userId}
          fakturaBezVAT={fakturaBezVAT}
          vatExemptionReason={vatExemptionReason}
          currency={currency}
        />
        {productsLoading && (
          <div className="text-sm text-muted-foreground">Ładowanie produktów...</div>
        )}
      </CardContent>
    </Card>
  );
};
