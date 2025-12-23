
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { ArrowLeft } from "lucide-react";
import { Product } from "@/shared/types/index";
import { getProducts } from "@/modules/products/data/productRepository";
import ProductWithInventoryForm from "@/modules/products/components/ProductWithInventoryForm";
import { toast } from "sonner";
import { useAuth } from "@/shared/context/AuthContext";

const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id || !user) return;
      
      setLoading(true);
      try {
        const products = await getProducts(user.id);
        const foundProduct = products.find(p => p.id === id) || null;
        setProduct(foundProduct);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id, user]);
  
  const handleClose = () => {
    navigate('/products');
  };
  
  const handleSuccess = (product: Product) => {
    toast.success('Produkt został zaktualizowany');
    navigate('/products');
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
    <ProductWithInventoryForm
      initialData={product}
      isOpen={isOpen}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
};

export default EditProduct;
