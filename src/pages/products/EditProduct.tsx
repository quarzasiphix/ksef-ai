
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Product } from "@/types";
import { getProducts } from "@/integrations/supabase/repositories/productRepository";
import ProductForm from "@/components/products/ProductForm";

const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id]);
  
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
        <Card>
          <CardContent className="text-center py-8">
            <p>Produkt o podanym ID nie istnieje.</p>
            <Button className="mt-4" asChild>
              <Link to="/products">Wróć do listy produktów</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edytuj produkt</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dane produktu</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm initialData={product} />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProduct;
