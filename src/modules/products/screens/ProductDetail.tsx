import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, Edit, Trash } from "lucide-react";
import { Product } from "@/shared/types";
import { getProducts, deleteProduct } from "@/modules/products/data/productRepository";
import ProductForm from "@/modules/products/components/ProductForm";
import { toast } from "sonner";
import { useAuth } from "@/shared/context/AuthContext";
import { getInvoices } from "@/modules/invoices/data/invoiceRepository";
import { Invoice } from "@/shared/types";
import InvoiceCard from "@/modules/invoices/components/InvoiceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [product, setProduct] = useState<Product | null>(null);
  const [productInvoices, setProductInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user?.id) return;
      
      setLoading(true);
      try {
        const products = await getProducts(user.id);
        const foundProduct = products.find(p => p.id === id) || null;
        setProduct(foundProduct);

        if (foundProduct) {
          const allInvoices = await getInvoices(user.id);
          const filteredInvoices = allInvoices.filter(inv =>
            inv.items.some(item => item.productId === foundProduct.id)
          );
          setProductInvoices(filteredInvoices);
        }

      } catch (error) {
        console.error("Error fetching product data:", error);
        toast.error("Błąd podczas wczytywania danych produktu");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, user?.id]);
  
  const handleEditClose = () => {
    setIsEditOpen(false);
  };
  
  const handleEditSuccess = (updatedProduct: Product) => {
    setProduct(updatedProduct);
    setIsEditOpen(false);
    toast.success('Produkt został zaktualizowany');
  };

  const handleDelete = async () => {
    if (!product) return;
    
    try {
      // Double check if product is used in any invoices
      const invoices = await getInvoices(user?.id || '');
      const isUsed = invoices.some(inv => 
        inv.items.some(item => item.productId === product.id)
      );

      if (isUsed) {
        toast.error("Nie można usunąć produktu, który jest używany w fakturach");
        setIsDeleteDialogOpen(false);
        return;
      }

      await deleteProduct(product.id);
      toast.success("Produkt został usunięty");
      // Update the products cache
      queryClient.setQueryData(["products"], (old: Product[] = []) => 
        old.filter(p => p.id !== product.id)
      );
      navigate("/products");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Wystąpił błąd podczas usuwania produktu");
      setIsDeleteDialogOpen(false);
    }
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
    <div className="pb-20">
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
          <Button 
            variant="destructive" 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Trash className="h-4 w-4" />
            Usuń
          </Button>
          <Button variant="outline" onClick={() => setIsEditOpen(true)} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edytuj
          </Button>
        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Faktury zawierające ten produkt</CardTitle>
        </CardHeader>
        <CardContent>
          {productInvoices.length === 0 ? (
            <div className="text-center py-4">
              <p>Brak faktur zawierających ten produkt.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {productInvoices.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {isEditOpen && product && (
        <ProductForm
          initialData={product}
          isOpen={isEditOpen}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {productInvoices.length > 0 ? "Nie można usunąć produktu" : "Czy na pewno chcesz usunąć ten produkt?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {productInvoices.length > 0 
                ? "Ten produkt jest używany w istniejących fakturach i nie może zostać usunięty. Najpierw usuń lub edytuj faktury zawierające ten produkt."
                : "Tej operacji nie można cofnąć. Produkt zostanie trwale usunięty."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zamknij</AlertDialogCancel>
            {productInvoices.length === 0 && (
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Usuń
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductDetail;
