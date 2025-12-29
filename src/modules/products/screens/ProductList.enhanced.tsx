import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Product, AccountingBehavior, VatBehavior, ProductLifecycleState } from "@/shared/types";
import { Plus, Search, Package, CircleDollarSign, Percent, ShoppingCart, Receipt, Lock, Edit3, AlertTriangle, TrendingUp, Clock, Filter, X } from "lucide-react";
import { formatCurrency } from "@/shared/lib/invoice-utils";
import { Badge } from "@/shared/ui/badge";
import { getProducts, deleteProduct } from "@/modules/products/data/productRepository";
import { useAuth } from "@/shared/context/AuthContext";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

type ViewMode = 'catalog' | 'most_used' | 'recently_used';
type SmartFilter = {
  productType?: 'income' | 'expense';
  vatBehavior?: VatBehavior;
  priceRange?: 'free' | 'paid';
  usedThisMonth?: boolean;
  lifecycleState?: ProductLifecycleState;
};

// Helper functions for labels
const getAccountingBehaviorLabel = (behavior: AccountingBehavior): string => {
  const labels: Record<AccountingBehavior, string> = {
    przychod_operacyjny: 'Przychód operacyjny',
    pozostale_przychody: 'Pozostałe przychody',
    koszt_operacyjny: 'Koszt operacyjny',
    srodek_trwaly: 'Środek trwały',
  };
  return labels[behavior];
};

const getVatBehaviorLabel = (vat: VatBehavior): string => {
  const labels: Record<VatBehavior, string> = {
    '23': '23%',
    '8': '8%',
    '5': '5%',
    '0': '0%',
    'zw': 'Zw',
    'np': 'NP',
    'ue': 'UE',
  };
  return labels[vat];
};

const ProductCard = ({ 
  product, 
  onContextMenu, 
  onQuickAdd 
}: { 
  product: Product; 
  onContextMenu: (e: React.MouseEvent, product: Product) => void;
  onQuickAdd: (product: Product) => void;
}) => {
  const isArchived = product.lifecycle_state === 'archived';
  const isHidden = product.lifecycle_state === 'hidden';
  
  return (
    <div 
      className={cn(
        "group relative bg-[#1A1F2C] text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all h-full",
        isArchived && "opacity-50 grayscale",
        isHidden && "opacity-70"
      )}
      onContextMenu={(e) => onContextMenu(e, product)}
    >
      <Link to={`/products/${product.id}`} className="block no-underline">
        {/* Header with name and lifecycle badge */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg truncate flex-1 pr-2">{product.name}</h3>
          {(isArchived || isHidden) && (
            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400">
              {isArchived ? 'Archiwalny' : 'Ukryty'}
            </Badge>
          )}
        </div>
        
        {/* Semantic metadata row - stacked badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              product.product_type === 'income' 
                ? 'border-green-400 text-green-400' 
                : 'border-red-400 text-red-400'
            )}
          >
            {product.product_type === 'income' ? 'Sprzedaż' : 'Wydatek'}
          </Badge>
          
          <Badge variant="outline" className="text-white border-gray-500 text-xs">
            VAT: {getVatBehaviorLabel(product.vat_behavior)}
          </Badge>
          
          <Badge variant="outline" className="text-white border-gray-500 text-xs">
            Jedn.: {product.unit_behavior}
          </Badge>
        </div>
        
        {/* Price information */}
        <div className="space-y-2 text-sm mb-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <CircleDollarSign className="h-3 w-3" />
            <span>Netto: {formatCurrency(product.unitPrice)}</span>
          </div>
          
          <div className="pt-2 border-t border-gray-700">
            <span className="font-bold text-xl">
              {formatCurrency(
                product.vat_behavior === 'zw' || product.vat_behavior === 'np'
                  ? product.unitPrice 
                  : product.unitPrice * (1 + parseInt(product.vat_behavior) / 100)
              )}
            </span>
            <span className="text-xs text-gray-400 ml-1">brutto</span>
          </div>
        </div>
        
        {/* Price behavior indicators */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          {product.price_editable ? (
            <span className="flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              Edytowalna
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Cena stała
            </span>
          )}
          {product.vat_overridable && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              VAT ręczny
            </span>
          )}
        </div>
        
        {/* Usage stats */}
        {product.usage_count > 0 && (
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
            Użyto {product.usage_count}× {product.last_used_at && `• ${new Date(product.last_used_at).toLocaleDateString('pl-PL')}`}
          </div>
        )}
      </Link>
      
      {/* Quick Add Button - shows on hover */}
      {product.lifecycle_state === 'active' && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickAdd(product);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Dodaj do faktury
        </Button>
      )}
    </div>
  );
};

const ProductList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("income");
  const [viewMode, setViewMode] = useState<ViewMode>('catalog');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>({});
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

  // Filter and sort products based on view mode and filters
  const processedProducts = useMemo(() => {
    let filtered = allProducts;
    
    // Apply lifecycle filter (default: show only active)
    if (!smartFilter.lifecycleState) {
      filtered = filtered.filter(p => p.lifecycle_state === 'active');
    } else {
      filtered = filtered.filter(p => p.lifecycle_state === smartFilter.lifecycleState);
    }
    
    // Apply product type filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.product_type === activeTab);
    }
    
    // Apply smart filters
    if (smartFilter.vatBehavior) {
      filtered = filtered.filter(p => p.vat_behavior === smartFilter.vatBehavior);
    }
    
    if (smartFilter.priceRange === 'free') {
      filtered = filtered.filter(p => p.unitPrice === 0);
    } else if (smartFilter.priceRange === 'paid') {
      filtered = filtered.filter(p => p.unitPrice > 0);
    }
    
    if (smartFilter.usedThisMonth) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => 
        p.last_used_at && new Date(p.last_used_at) >= thisMonth
      );
    }
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.unit_behavior.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort based on view mode
    switch (viewMode) {
      case 'most_used':
        return [...filtered].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
      case 'recently_used':
        return [...filtered].sort((a, b) => {
          if (!a.last_used_at) return 1;
          if (!b.last_used_at) return -1;
          return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
        });
      default:
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [allProducts, activeTab, viewMode, smartFilter, searchTerm]);

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

  const handleQuickAdd = (product: Product) => {
    // Navigate to new invoice with product pre-filled
    navigate(`/income/new?productId=${product.id}`);
    toast.success(`Dodano ${product.name} do nowej faktury`);
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

  const clearFilters = () => {
    setSmartFilter({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.keys(smartFilter).length > 0 || searchTerm.length > 0;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produkty</h1>
          <p className="text-muted-foreground">
            Szablony księgowe dla faktur i wydatków
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy produkt
        </Button>
      </div>

      {/* View Mode Toggle */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium mr-2">Widok:</span>
            <Button
              variant={viewMode === 'catalog' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('catalog')}
            >
              <Package className="h-4 w-4 mr-1" />
              Katalog
            </Button>
            <Button
              variant={viewMode === 'most_used' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('most_used')}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Najczęściej używane
            </Button>
            <Button
              variant={viewMode === 'recently_used' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('recently_used')}
            >
              <Clock className="h-4 w-4 mr-1" />
              Ostatnio używane
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtry inteligentne</span>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Wyczyść
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant={smartFilter.vatBehavior === '23' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter(prev => ({ ...prev, vatBehavior: prev.vatBehavior === '23' ? undefined : '23' }))}
          >
            VAT: 23%
          </Button>
          <Button
            variant={smartFilter.vatBehavior === '8' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter(prev => ({ ...prev, vatBehavior: prev.vatBehavior === '8' ? undefined : '8' }))}
          >
            VAT: 8%
          </Button>
          <Button
            variant={smartFilter.vatBehavior === '0' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter(prev => ({ ...prev, vatBehavior: prev.vatBehavior === '0' ? undefined : '0' }))}
          >
            VAT: 0%
          </Button>
          <Button
            variant={smartFilter.vatBehavior === 'zw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter(prev => ({ ...prev, vatBehavior: prev.vatBehavior === 'zw' ? undefined : 'zw' }))}
          >
            VAT: Zw
          </Button>
          <Button
            variant={smartFilter.priceRange === 'free' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter(prev => ({ ...prev, priceRange: prev.priceRange === 'free' ? undefined : 'free' }))}
          >
            Cena: 0 zł
          </Button>
          <Button
            variant={smartFilter.usedThisMonth ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter(prev => ({ ...prev, usedThisMonth: !prev.usedThisMonth }))}
          >
            Używane w tym miesiącu
          </Button>
          <Button
            variant={smartFilter.lifecycleState === 'archived' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter(prev => ({ ...prev, lifecycleState: prev.lifecycleState === 'archived' ? undefined : 'archived' }))}
          >
            Archiwalne
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>
                {viewMode === 'most_used' ? 'Najczęściej używane' : 
                 viewMode === 'recently_used' ? 'Ostatnio używane' : 
                 'Katalog produktów'}
              </CardTitle>
              <CardDescription>
                Łącznie: {processedProducts.length} produktów
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Wszystkie ({allProducts.length})
              </TabsTrigger>
              <TabsTrigger value="income" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Sprzedaż
              </TabsTrigger>
              <TabsTrigger value="expense" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Wydatki
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">Ładowanie...</div>
              ) : processedProducts.length === 0 ? (
                <div className="text-center py-8">
                  {searchTerm || hasActiveFilters ? "Brak wyników wyszukiwania" : "Brak produktów"}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {processedProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onContextMenu={handleContextMenu}
                      onQuickAdd={handleQuickAdd}
                    />
                  ))}
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
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => {
              handleQuickAdd(contextMenu.product!);
              setContextMenu({...contextMenu, visible: false});
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj do faktury
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={() => {
              navigate(`/products/${contextMenu.product!.id}`);
              setContextMenu({...contextMenu, visible: false});
            }}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edytuj
          </button>
          <DropdownMenuSeparator />
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
