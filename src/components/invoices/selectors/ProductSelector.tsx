
import React, { useEffect, useState } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Product, InvoiceItem, InvoiceType } from "@/types";
import { useAuth } from "@/App";

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
      try {
        // Mock products for now
        const mockProducts: Product[] = [
          {
            id: "1",
            user_id: user?.id || "",
            name: "Konsultacje IT",
            unitPrice: 200,
            vatRate: 23,
            unit: "godz.",
            description: "Konsultacje informatyczne"
          },
          {
            id: "2",
            user_id: user?.id || "",
            name: "Projekt strony internetowej",
            unitPrice: 5000,
            vatRate: 23,
            unit: "szt.",
            description: "Projekt i wykonanie strony internetowej"
          }
        ];
        setProducts(mockProducts);
      } catch (err) {
        console.error("Error loading products:", err);
        setError("Nie udało się załadować produktów");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [user?.id]);

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
      description: product.description,
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
