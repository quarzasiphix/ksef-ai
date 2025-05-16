
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash } from "lucide-react";
import { Product } from "@/types";
import { getProducts } from "@/integrations/supabase/repositories/productRepository";
import ProductForm from "@/components/products/ProductForm";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const products = await getProducts();
        const foundProduct = products.find(p => p.id === id) || null;
        setProduct(foundProduct);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Błąd podczas wczytywania produktu");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id]);
  
  const handleEditClose = () => {
    setIsEditOpen(false);
  };
  
  const handleEditSuccess = (updatedProduct: Product) => {
    setProduct(updatedProduct);
    setIsEditOpen(false);
    toast.success('Produkt został zaktualizowany');
  };
  
  if (loading) {
    return (
      <div className="text-center py-8">
        Ładowanie...
      </div>
    );
  }
  
  if (!product) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Nie znaleziono produktu</h1>
        </div>
        <div className="text-center py-8">
          <p>Produkt o podanym ID nie istnieje.</p>
          <Button className="mt-4" onClick={() => navigate("/products")}>
            Wróć do listy produktów
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{product.name}</h1>
      </div>
      
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Nazwa</h3>
              <p className="text-base font-medium">{product.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Cena netto</h3>
              <p className="text-base font-medium">{product.unitPrice.toFixed(2)} zł</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Stawka VAT</h3>
              <p className="text-base font-medium">
                {product.vatRate === -1 ? "Zwolniony" : `${product.vatRate}%`}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Jednostka</h3>
              <p className="text-base font-medium">{product.unit}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edytuj
          </Button>
        </div>
      </div>
      
      {isEditOpen && product && (
        <ProductForm
          initialData={product}
          isOpen={isEditOpen}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default ProductDetail;
