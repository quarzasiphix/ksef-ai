
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
import { Product } from "@/types";
import { Plus, Search, Package, CircleDollarSign, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/invoice-utils";
import { Badge } from "@/components/ui/badge";
import { useGlobalData } from "@/hooks/use-global-data";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <Link to={`/products/${product.id}`} className="block no-underline">
      <div className="bg-[#1A1F2C] text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-base truncate">{product.name}</h3>
          <Badge variant="outline" className="text-white border-white text-xs">{product.unit}</Badge>
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
  const queryClient = useQueryClient();
  useEffect(() => {
    // Invalidate products query on mount for background fetch
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }, [queryClient]);
  const { products: { data: products, isLoading } } = useGlobalData();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter products based on search term
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
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
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductList;
