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
import { Plus, Search, ChevronDown, Filter } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
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

type SmartFilter = 'all' | 'unpaid_issued' | 'paid_not_booked' | 'booked_not_reconciled' | 'overdue';

const InvoiceList = () => {
  const { invoices: { data: invoices, isLoading } } = useGlobalData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('all');
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
  
  // Filter invoices based on search term, selected type, and smart filter
  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (invoice) => {
        const matchesSearch = 
          invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (invoice.customerName || "").toLowerCase().includes(searchTerm.toLowerCase());
          
        const matchesType = selectedType === "all" || invoice.type === selectedType;
        
        // Smart filter logic
        let matchesSmartFilter = true;
        const invoiceAny = invoice as any;
        const isPaid = invoice.isPaid || invoice.paid;
        const isBooked = invoiceAny.booked_to_ledger;
        const isOverdue = new Date(invoice.dueDate) < new Date() && !isPaid;
        
        switch (smartFilter) {
          case 'unpaid_issued':
            matchesSmartFilter = !isPaid;
            break;
          case 'paid_not_booked':
            matchesSmartFilter = isPaid && !isBooked;
            break;
          case 'booked_not_reconciled':
            matchesSmartFilter = isBooked; // Could add reconciliation check later
            break;
          case 'overdue':
            matchesSmartFilter = isOverdue;
            break;
          case 'all':
          default:
            matchesSmartFilter = true;
        }
        
        return matchesSearch && matchesType && matchesSmartFilter;
      }
    );
  }, [invoices, searchTerm, selectedType, smartFilter]);
  
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
      
      {/* Smart Filters - Accounting Views */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Widoki księgowe
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant={smartFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter('all')}
          >
            Wszystkie
          </Button>
          <Button
            variant={smartFilter === 'unpaid_issued' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter('unpaid_issued')}
            className="gap-1"
          >
            <Badge variant="secondary" className="text-xs">⏳</Badge>
            Wystawione, nieopłacone
          </Button>
          <Button
            variant={smartFilter === 'paid_not_booked' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter('paid_not_booked')}
            className="gap-1"
          >
            <Badge variant="secondary" className="text-xs">⚠️</Badge>
            Opłacone, niezaksięgowane
          </Button>
          <Button
            variant={smartFilter === 'booked_not_reconciled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter('booked_not_reconciled')}
            className="gap-1"
          >
            <Badge variant="secondary" className="text-xs">📘</Badge>
            Zaksięgowane
          </Button>
          <Button
            variant={smartFilter === 'overdue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSmartFilter('overdue')}
            className="gap-1"
          >
            <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">🔴</Badge>
            Zaległe
          </Button>
        </CardContent>
      </Card>

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
