import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Product } from "@/types";
import { Plus, Search, Package, CircleDollarSign, Percent, ShoppingCart, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/invoice-utils";
import { Badge } from "@/components/ui/badge";
import { getProducts, deleteProduct } from "@/integrations/supabase/repositories/productRepository";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ProductForm from "@/components/products/ProductForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <Link to={`/products/${product.id}`} className="block no-underline">
      <div className="bg-[#1A1F2C] text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-base truncate">{product.name}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-white border-white text-xs">
              {product.unit}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                product.product_type === 'income' 
                  ? 'border-green-400 text-green-400' 
                  : 'border-red-400 text-red-400'
              }`}
            >
              {product.product_type === 'income' ? 'Sprzedaż' : 'Wydatek'}
            </Badge>
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
  );
};

const ProductList = () => {
  const { user } = useAuth();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("income");
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, product: Product | null}>({visible: false, x: 0, y: 0, product: null});
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const loadProducts = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const products = await getProducts(user.id);
      setAllProducts(products);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Nie udało się załadować produktów");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [user?.id]);

  const incomeProducts = allProducts.filter(product => product.product_type === 'income');
  const expenseProducts = allProducts.filter(product => product.product_type === 'expense');

  const getFilteredProducts = (products: Product[]) => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.unit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredIncomeProducts = getFilteredProducts(incomeProducts);
  const filteredExpenseProducts = getFilteredProducts(expenseProducts);

  const handleProductSaved = (product: Product) => {
    loadProducts(); // Reload products after saving
    setIsFormOpen(false);
  };

  // Right-click handler for product card
  const handleContextMenu = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      product,
    });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu({...contextMenu, visible: false});
      }
    };
    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      toast.success('Produkt został usunięty');
      setProductToDelete(null);
      loadProducts();
    } catch (error) {
      toast.error('Nie udało się usunąć produktu');
    } finally {
      setIsDeleting(false);
    }
  };

  const ProductGrid = ({ products, emptyMessage }: { products: Product[], emptyMessage: string }) => (
    <div>
      {isLoading ? (
        <div className="text-center py-8">Ładowanie...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <div
              key={product.id}
              className="relative"
              onContextMenu={e => handleContextMenu(e, product)}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produkty</h1>
          <p className="text-muted-foreground">
            Zarządzaj produktami sprzedaży i wydatkami
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy produkt
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Katalog produktów</CardTitle>
              <CardDescription>
                Łącznie: {allProducts.length} produktów
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Sprzedaż ({incomeProducts.length})
              </TabsTrigger>
              <TabsTrigger value="expense" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Wydatki ({expenseProducts.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="income" className="mt-6">
              <ProductGrid 
                products={filteredIncomeProducts}
                emptyMessage={searchTerm ? "Brak wyników wyszukiwania w produktach sprzedaży" : "Brak produktów sprzedaży"}
              />
            </TabsContent>
            
            <TabsContent value="expense" className="mt-6">
              <ProductGrid 
                products={filteredExpenseProducts}
                emptyMessage={searchTerm ? "Brak wyników wyszukiwania w wydatkach" : "Brak produktów wydatkowych"}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Context Menu - Rendered at the root level */}
      {contextMenu.visible && contextMenu.product && (
        <div
          ref={menuRef}
          className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-50 py-1 w-48"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
            onClick={() => {
              setProductToDelete(contextMenu.product);
              setContextMenu({...contextMenu, visible: false});
            }}
          >
            Usuń produkt
          </button>
        </div>
      )}
      {/* Delete confirmation dialog */}
      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleProductSaved}
      />
      <Dialog open={!!productToDelete} onOpenChange={open => !open && setProductToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń produkt</DialogTitle>
          </DialogHeader>
          <div className="py-4">Czy na pewno chcesz usunąć produkt <b>{productToDelete?.name}</b>? Tej operacji nie można cofnąć.</div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setProductToDelete(null)} disabled={isDeleting}>Anuluj</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>Usuń</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductList;
