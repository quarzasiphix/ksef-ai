import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Invoice, InvoiceType } from "@/types";
import { Plus, Search, Filter, Trash2 } from "lucide-react";
import InvoiceCard from "@/components/invoices/InvoiceCard";
import { useGlobalData } from "@/hooks/use-global-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { deleteInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { useQueryClient } from "@tanstack/react-query";

const IncomeList = () => {
  const { invoices: { data: invoices, isLoading } } = useGlobalData();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, invoiceId: string | null}>({visible: false, x: 0, y: 0, invoiceId: null});
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get only document types that exist in the data
  const availableTypes = useMemo(() => {
    const typeMap = new Map<string, boolean>();
    typeMap.set('all', true); // Always include "all"
    
    invoices.forEach(invoice => {
      if (invoice.type === InvoiceType.SALES) typeMap.set('invoice', true);
      else if (invoice.type === InvoiceType.RECEIPT) typeMap.set('receipt', true);
      else if (invoice.type === InvoiceType.PROFORMA) typeMap.set('proforma', true);
      else if (invoice.type === InvoiceType.CORRECTION) typeMap.set('correction', true);
    });
    
    return Array.from(typeMap.keys());
  }, [invoices]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteInvoice(invoiceId);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Dokument został usunięty");
      setContextMenu({...contextMenu, visible: false});
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Wystąpił błąd podczas usuwania dokumentu");
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu({...contextMenu, visible: false});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, invoiceId: string) => {
    e.preventDefault();
    // Use the click position directly
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      invoiceId
    });
  };
  
  // Filter invoices based on search term, document type, and transaction type (income only)
  const filteredInvoices = invoices.filter(
    (invoice) => {
      // Only show income transactions
      if (invoice.transactionType !== 'income') return false;
      
      const matchesSearch = 
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.customerName || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by document type tab
      const matchesType = 
        activeTab === "all" || 
        (activeTab === "invoice" && invoice.type === InvoiceType.SALES) ||
        (activeTab === "receipt" && invoice.type === InvoiceType.RECEIPT) ||
        (activeTab === "proforma" && invoice.type === InvoiceType.PROFORMA) ||
        (activeTab === "correction" && invoice.type === InvoiceType.CORRECTION);
      
      return matchesSearch && matchesType;
    }
  );

  const getDocumentTypeName = (type: string) => {
    switch(type) {
      case "all": return "Wszystkie";
      case "invoice": return "Faktury VAT";
      case "receipt": return "Rachunki";
      case "proforma": return "Faktury proforma";
      case "correction": return "Faktury korygujące";
      default: return "Dokumenty";
    }
  };
  
  return (
    <div className="space-y-6 pb-20 md:pb-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Przychód</h1>
          <p className="text-muted-foreground">
            Zarządzaj fakturami i rachunkami
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nowy dokument
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=sales">
                  Faktura VAT
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=receipt">
                  Rachunek
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=proforma">
                  Faktura proforma
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/income/new?type=correction">
                  Faktura korygująca
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Dokumenty przychodowe</CardTitle>
              <CardDescription>
                {activeTab !== "all" ? getDocumentTypeName(activeTab) : "Wszystkie dokumenty"}: {filteredInvoices.length}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj dokumentów..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        
        <div className="px-6 pb-2">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 overflow-x-auto">
              {availableTypes.map(type => (
                <TabsTrigger key={type} value={type}>
                  {getDocumentTypeName(type)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              Ładowanie...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm.length > 0 || activeTab !== "all" ? "Brak wyników wyszukiwania" : "Brak dokumentów"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInvoices.map(invoice => (
                <div 
                  key={invoice.id} 
                  className="relative"
                  onContextMenu={(e) => handleContextMenu(e, invoice.id)}
                  onClick={() => navigate(`/income/${invoice.id}`)}
                >
                  <InvoiceCard invoice={invoice} />
                </div>
              ))}
              
              {/* Invoice Grid */}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Context Menu - Rendered at the root level */}
      {contextMenu.visible && (
        <div 
          ref={menuRef}
          className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-50 py-1 w-48"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
            onClick={() => contextMenu.invoiceId && handleDeleteInvoice(contextMenu.invoiceId)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń dokument
          </button>
        </div>
      )}
    </div>
  );
};

export default IncomeList;
