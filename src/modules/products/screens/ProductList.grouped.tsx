import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Product } from "@/shared/types";
import { Plus, Search, Package, CircleDollarSign, Percent, ShoppingCart, Receipt, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { Badge } from "@/shared/ui/badge";
import { getProducts, deleteProduct } from "@/modules/products/data/productRepository";
import { useAuth } from "@/shared/context/AuthContext";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { toast } from "sonner";
import ProductForm from "@/modules/products/components/ProductForm";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/ui/alert-dialog";
import { cn } from "@/shared/lib/utils";

interface GroupedProducts {
  businessProfileId: string | null;
  businessProfileName: string;
  products: Product[];
  isSelected: boolean;
}

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
  const { selectedProfileId, profiles } = useBusinessProfile();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("income");
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, product: Product | null}>({visible: false, x: 0, y: 0, product: null});
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
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

  // Group products by business profile
  const groupedProducts = useMemo(() => {
    // Filter by search and tab first
    const filtered = allProducts.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.unit.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (activeTab === "income") return product.product_type === 'income';
      if (activeTab === "expense") return product.product_type === 'expense';
      return true;
    });

    // Group by business profile
    const groups = new Map<string | null, Product[]>();
    
    filtered.forEach(product => {
      const profileId = product.business_profile_id || null;
      if (!groups.has(profileId)) {
        groups.set(profileId, []);
      }
      groups.get(profileId)!.push(product);
    });

    // Convert to array and sort: selected profile first, then others
    const result: GroupedProducts[] = [];
    
    groups.forEach((products, profileId) => {
      const profile = profiles?.find(p => p.id === profileId);
      const isSelected = profileId === selectedProfileId;
      
      result.push({
        businessProfileId: profileId,
        businessProfileName: profile?.name || 'Nieprzypisane',
        products: products.sort((a, b) => a.name.localeCompare(b.name)),
        isSelected,
      });
    });

    // Sort: selected first, then alphabetically
    return result.sort((a, b) => {
      if (a.isSelected) return -1;
      if (b.isSelected) return 1;
      return a.businessProfileName.localeCompare(b.businessProfileName);
    });
  }, [allProducts, searchTerm, activeTab, selectedProfileId, profiles]);

  const totalProducts = useMemo(() => {
    return groupedProducts.reduce((sum, group) => sum + group.products.length, 0);
  }, [groupedProducts]);

  const incomeProducts = allProducts.filter(product => product.product_type === 'income');
  const expenseProducts = allProducts.filter(product => product.product_type === 'expense');

  const toggleGroup = (groupId: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleProductSaved = (product: Product) => {
    loadProducts();
    setIsFormOpen(false);
  };

  const handleContextMenu = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      product,
    });
  };

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

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produkty</h1>
          <p className="text-muted-foreground">
            Zarządzaj produktami wszystkich firm
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
                Łącznie: {totalProducts} produktów w {groupedProducts.length} {groupedProducts.length === 1 ? 'firmie' : 'firmach'}
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
            
            <div className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">Ładowanie...</div>
              ) : groupedProducts.length === 0 ? (
                <div className="text-center py-8">
                  {searchTerm ? "Brak wyników wyszukiwania" : "Brak produktów"}
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedProducts.map((group) => {
                    const groupKey = group.businessProfileId || 'unassigned';
                    const isCollapsed = collapsedGroups.has(groupKey);
                    
                    return (
                      <div key={groupKey} className="space-y-2">
                        {/* Group Header */}
                        <div 
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                            group.isSelected 
                              ? "bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800" 
                              : "bg-muted/50 hover:bg-muted"
                          )}
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <div className="flex items-center gap-3">
                            <button className="p-1 hover:bg-background rounded">
                              {isCollapsed ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </button>
                            <Building2 className={cn(
                              "h-5 w-5",
                              group.isSelected ? "text-blue-600" : "text-muted-foreground"
                            )} />
                            <div>
                              <h3 className={cn(
                                "font-semibold",
                                group.isSelected && "text-blue-900 dark:text-blue-100"
                              )}>
                                {group.businessProfileName}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {group.products.length} {group.products.length === 1 ? 'produkt' : 'produktów'}
                              </p>
                            </div>
                          </div>
                          {group.isSelected && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                              Wybrana firma
                            </Badge>
                          )}
                        </div>

                        {/* Group Content */}
                        {!isCollapsed && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ml-8">
                            {group.products.map(product => (
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
                  })}
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.product && (
        <div
          ref={menuRef}
          className="fixed bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 z-50 py-1 w-48"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
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
      <AlertDialog open={!!productToDelete} onOpenChange={open => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń produkt</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć produkt <b>{productToDelete?.name}</b>? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleProductSaved}
      />
    </div>
  );
};

export default ProductList;
