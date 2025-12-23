import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Invoice, InvoiceType } from "@/shared/types";
import { Plus, Search, ChevronDown } from "lucide-react";
import InvoiceCard from "@/modules/invoices/components/InvoiceCard";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { useAuth } from "@/shared/context/AuthContext";
import { getInvoiceValueInPLN, formatCurrency } from '@/shared/lib/invoice-utils';

// Helper function to translate invoice type to Polish
const translateInvoiceType = (type: string): string => {
  switch (type) {
    case "sales":
      return "Faktura";
    case "receipt":
      return "Rachunek";
    case "proforma":
      return "Proforma";
    case "correction":
      return "Korekta";
    default:
      return type;
  }
};

const InvoiceList = () => {
  const { invoices: { data: invoices, isLoading } } = useGlobalData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const nonPLNInvoices = invoices.filter(inv => inv.currency && inv.currency !== 'PLN');
    if (nonPLNInvoices.length > 0) {
    } else {
    }
  }, [invoices]);
  
  // Get unique invoice types that exist in the data
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    types.add("all"); // Always include "all" option
    
    // Only add types that actually have documents
    invoices.forEach(invoice => {
      if (invoice.type) {
        types.add(invoice.type);
      }
    });
    
    return Array.from(types);
  }, [invoices]);
  
  // Filter invoices based on search term and selected type
  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (invoice) => {
        const matchesSearch = 
          invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (invoice.customerName || "").toLowerCase().includes(searchTerm.toLowerCase());
          
        const matchesType = selectedType === "all" || invoice.type === selectedType;
        
        return matchesSearch && matchesType;
      }
    );
  }, [invoices, searchTerm, selectedType]);
  
  // For mobile, show first 2 options on main bar, rest in dropdown
  const mainTypes = useMemo(() => {
    if (isMobile) {
      // On mobile, only show 2 options (including "all")
      return availableTypes.slice(0, Math.min(2, availableTypes.length));
    }
    return availableTypes;
  }, [availableTypes, isMobile]);
  
  const dropdownTypes = useMemo(() => {
    if (isMobile && availableTypes.length > 2) {
      // Extra types for dropdown on mobile
      return availableTypes.slice(2);
    }
    return [];
  }, [availableTypes, isMobile]);

  const { user } = useAuth();
  
  if (!user) {
    return (
      <div className="text-center py-8">
        Musisz być zalogowany, aby wyświetlić faktury.
      </div>
    );
  }
  
  return (
    <div className="space-y-6 px-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Faktury</h1>
          <p className="text-muted-foreground">
            Zarządzaj fakturami i rachunkami
          </p>
        </div>
        <Button asChild>
          <Link to="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            Nowa faktura
          </Link>
        </Button>
      </div>
      
      {/* Document Type Filter */}
      <div className="flex items-center gap-2 overflow-x-hidden">
        {mainTypes.map((type) => (
          <Button
            key={type}
            variant={selectedType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(type)}
            className="whitespace-nowrap"
          >
            {type === "all" ? "Wszystkie" : translateInvoiceType(type)}
          </Button>
        ))}
        
        {dropdownTypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Więcej <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dropdownTypes.map((type) => (
                <DropdownMenuItem 
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={selectedType === type ? "bg-muted" : ""}
                >
                  {translateInvoiceType(type)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>
                {selectedType === "all" 
                  ? "Wszystkie dokumenty" 
                  : `${translateInvoiceType(selectedType)}`}
              </CardTitle>
              <CardDescription>
                Łączna liczba: {filteredInvoices.length}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj faktur..."
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
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm.length > 0 ? "Brak wyników wyszukiwania" : "Brak dokumentów"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInvoices.map(invoice => {
                // Debug - sprawdź pierwszą fakturę
                if (invoice.number === 'F/16') {
                  console.log('First invoice details:', {
                    number: invoice.number,
                    currency: invoice.currency,
                    exchangeRate: invoice.exchangeRate,
                    totalGrossValue: invoice.totalGrossValue
                  });
                }
                
                const plnValue = getInvoiceValueInPLN(invoice);
                
                return (
                  <div key={invoice.id}>
                    <InvoiceCard invoice={invoice} />
                    <div className="text-sm text-right">
                      {invoice.exchangeRate && invoice.exchangeRate > 1 && (
                        <div className="text-green-600 font-semibold">
                          {formatCurrency(plnValue, 'PLN')} PLN
                        </div>
                      )}
                      <span>{formatCurrency(invoice.totalGrossValue, invoice.currency || 'PLN')} {invoice.currency || 'PLN'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceList;
