
import React, { useEffect, useState } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Product, InvoiceItem, InvoiceType } from "@/shared/types";
import { useAuth } from "@/shared/context/AuthContext";
import { getProducts } from "@/modules/products/data/productRepository";

interface ProductSelectorProps {
  onAddProduct: (product: InvoiceItem) => void;
  documentType: InvoiceType;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  onAddProduct,
  documentType,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProducts = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // Determine product type based on documentType
        let productType: 'income' | 'expense' | undefined = undefined;
        if (
          documentType === InvoiceType.RECEIPT ||
          documentType === InvoiceType.SALES ||
          documentType === InvoiceType.PROFORMA
        ) {
          productType = 'income';
        } else if (documentType === 'expense' as any) {
          productType = 'expense';
        }
        const products = await getProducts(user.id, productType);
        setProducts(products);
      } catch (err) {
        setError("Nie udało się załadować produktów");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [user?.id, documentType]);

  const handleAddProductToInvoice = () => {
    if (!selectedProductId) return;
    
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    
    const isReceipt = documentType === InvoiceType.RECEIPT;
    
    // For receipts, set VAT to 0%
    const vatRate = isReceipt ? 0 : product.vatRate;
    
    const quantity = 1;
    const unitPrice = product.unitPrice;
    const totalNetValue = unitPrice * quantity;
    const totalVatValue = isReceipt ? 0 : totalNetValue * (vatRate / 100);
    const totalGrossValue = totalNetValue + totalVatValue;
    
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(), // Temporary ID
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
    
    onAddProduct(newItem);
    setSelectedProductId("");
  };

  const handleAddNewProduct = () => {
    navigate("/products/new");
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Ładowanie produktów...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="font-medium text-sm">Dodaj produkt do dokumentu</div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select 
            value={selectedProductId} 
            onValueChange={setSelectedProductId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz produkt" />
            </SelectTrigger>
            <SelectContent>
              {products.length > 0 ? (
                products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{product.name}</span> - {product.unitPrice.toFixed(2)} zł
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
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleAddNewProduct}
          title="Dodaj nowy produkt"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button 
          onClick={handleAddProductToInvoice}
          disabled={!selectedProductId}
        >
          Dodaj
        </Button>
      </div>
    </div>
  );
};
