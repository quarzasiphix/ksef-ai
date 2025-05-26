import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Product, Invoice } from "@/types";
import { Plus, Search, Package, CircleDollarSign, Percent, MoreVertical, Trash } from "lucide-react";
import { formatCurrency } from "@/lib/invoice-utils";
import { Badge } from "@/components/ui/badge";
import { useGlobalData } from "@/hooks/use-global-data";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { deleteProduct } from "@/integrations/supabase/repositories/productRepository";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInvoices } from "@/integrations/supabase/repositories/invoiceRepository";
import { useAuth } from "@/App";

const ProductCard = ({ product, onDelete }: { product: Product; onDelete: (product: Product) => void }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUsedInInvoices, setIsUsedInInvoices] = useState(false);
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([]);
  const { user } = useAuth();

  const checkProductUsage = async () => {
    if (!user?.id) return;
    try {
      const invoices = await getInvoices(user.id);
      const related = invoices.filter(inv => 
        inv.items.some(item => item.productId === product.id)
      );
      console.log('Checking product usage:', {
        productId: product.id,
        relatedInvoices: related,
        allInvoices: invoices
      });
      setRelatedInvoices(related);
      setIsUsedInInvoices(related.length > 0);
    } catch (error) {
      console.error("Error checking product usage:", error);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await checkProductUsage();
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="relative group">
      <Link to={`/products/${product.id}`} className="block no-underline">
        <div className="bg-[#1A1F2C] text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all h-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-base truncate">{product.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-white border-white text-xs">{product.unit}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={handleDeleteClick}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Usuń
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <CircleDollarSign className="h-3.5 w-3.5" />
              <span>Cena netto: {formatCurrency(product.unitPrice)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-300">
              <Percent className="h-3.5 w-3.5" />
              <span>VAT: {product.vatRate === -1 ? 'Zw' : `${product.vatRate}%`}</span>
            </div>
            
            <div className="pt-2 border-t border-gray-700 mt-1">
              <span className="font-bold text-lg">
                {formatCurrency(product.vatRate === -1 ? product.unitPrice : product.unitPrice * (1 + product.vatRate / 100))}
              </span>
              <span className="text-xs text-gray-400 ml-1">brutto</span>
            </div>
          </div>
        </div>
      </Link>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isUsedInInvoices ? "Nie można usunąć produktu" : "Czy na pewno chcesz usunąć ten produkt?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isUsedInInvoices ? (
                <div className="space-y-4">
                  <p>Ten produkt jest używany w następujących fakturach i nie może zostać usunięty:</p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {relatedInvoices.map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="font-medium">{invoice.number}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/invoices/${invoice.id}`} onClick={() => setIsDeleteDialogOpen(false)}>
                            Zobacz
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Najpierw usuń lub edytuj faktury zawierające ten produkt.
                  </p>
                </div>
              ) : (
                "Tej operacji nie można cofnąć. Produkt zostanie trwale usunięty."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zamknij</AlertDialogCancel>
            {!isUsedInInvoices && (
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(product);
                  setIsDeleteDialogOpen(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Usuń
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ProductList = () => {
  const queryClient = useQueryClient();
  useEffect(() => {
    // Invalidate products query on mount for background fetch
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }, [queryClient]);
  const { products: { data: products, isLoading } } = useGlobalData();
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  
  const handleDelete = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      toast.success("Produkt został usunięty");
      // Update the products cache
      queryClient.setQueryData(["products"], (old: Product[] = []) => 
        old.filter(p => p.id !== product.id)
      );
    } catch (error) {
      console.error("Error deleting product:", error);
      if (error instanceof Error && error.message === "Product is used in invoices and cannot be deleted") {
        toast.error("Nie można usunąć produktu, który jest używany w fakturach");
      } else {
        toast.error("Wystąpił błąd podczas usuwania produktu");
      }
    }
  };
  
  // Filter products based on search term
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produkty</h1>
          <p className="text-muted-foreground">
            Zarządzaj produktami i usługami
          </p>
        </div>
        <Button asChild>
          <Link to="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Nowy produkt
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Wszystkie produkty</CardTitle>
              <CardDescription>
                Łączna liczba: {filteredProducts.length}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj produktów..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              Ładowanie...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm.length > 0 ? "Brak wyników wyszukiwania" : "Brak produktów"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductList; 