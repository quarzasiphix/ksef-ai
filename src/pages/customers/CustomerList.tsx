import React, { useState, useEffect, useRef } from "react";
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
import { Customer } from "@/types";
import { Plus, Search, User, MapPin, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGlobalData } from "@/hooks/use-global-data";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteCustomer } from '@/integrations/supabase/repositories/customerRepository';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from "sonner";

const CLIENT_TYPE_LABELS: Record<string, string> = {
  odbiorca: "Odbiorca",
  sprzedawca: "Dostawca",
};

const CustomerCard = ({ customer }: { customer: Customer }) => {
  const [showMenu, setShowMenu] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Right-click handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  // Hide menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  return (
    <div ref={cardRef} onContextMenu={handleContextMenu} className="relative">
      <Link to={`/customers/${customer.id}`} className="block no-underline">
        <div className="bg-[#1A1F2C] text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all h-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-base truncate">{customer.name}</h3>
            <div className="flex gap-2 items-center">
            {customer.taxId && (
                <Badge variant="outline" className="text-white border-white text-xs">NIP: {customer.taxId}</Badge>
              )}
              {customer.customerType && (
                <Badge variant="outline" className={`text-xs ${customer.customerType === 'odbiorca' ? 'border-green-400 text-green-400' : customer.customerType === 'sprzedawca' ? 'border-blue-400 text-blue-400' : 'border-yellow-400 text-yellow-400'}`}>{CLIENT_TYPE_LABELS[customer.customerType]}</Badge>
            )}
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{customer.address}, {customer.postalCode} {customer.city}</span>
            </div>
            
            {customer.email && (
              <div className="flex items-center gap-2 text-gray-300">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
            
            {customer.phone && (
              <div className="flex items-center gap-2 text-gray-300">
                <Phone className="h-3.5 w-3.5" />
                <span>{customer.phone}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

const CustomerList = () => {
  const { customers: { data: customers, isLoading }, refreshAllData } = useGlobalData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, customer: Customer | null}>({visible: false, x: 0, y: 0, customer: null});
  const menuRef = useRef<HTMLDivElement>(null);

  // Expose this function for triggering a customer refresh from outside (edit/new)
  React.useEffect(() => {
    window.triggerCustomersRefresh = async () => {
      setIsUpdating(true);
      await refreshAllData();
      setIsUpdating(false);
    };
  }, [refreshAllData]);

  // Filter customers based on search term and active tab
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.taxId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.city.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "odbiorca") return matchesSearch && customer.customerType === "odbiorca";
    if (activeTab === "sprzedawca") return matchesSearch && customer.customerType === "sprzedawca";
    return matchesSearch;
  });
  
  const handleDelete = async (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      toast.success('Klient został usunięty');
      setCustomerToDelete(null);
      if (window.triggerCustomersRefresh) await window.triggerCustomersRefresh();
    } catch (e) {
      toast.error('Nie udało się usunąć klienta');
    } finally {
      setIsDeleting(false);
    }
  };

  // Right-click handler for customer card
  const handleContextMenu = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      customer,
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

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">Klienci {isUpdating && <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />}</h1>
          <p className="text-muted-foreground">
            Zarządzaj bazą klientów
          </p>
        </div>
        <Button asChild>
          <Link to="/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            Nowy klient
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Wszyscy klienci</CardTitle>
              <CardDescription>
                Łączna liczba: {filteredCustomers.length}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj klientów..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {/* Tabs for client type */}
          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Wszyscy</TabsTrigger>
                <TabsTrigger value="odbiorca">Odbiorcy (sprzedaż)</TabsTrigger>
                <TabsTrigger value="sprzedawca">Dostawcy (zakup)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              Ładowanie...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm.length > 0 ? "Brak wyników wyszukiwania" : "Brak klientów"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="relative"
                  onContextMenu={e => handleContextMenu(e, customer)}
                >
                  <CustomerCard customer={customer} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Context Menu - Rendered at the root level */}
      {contextMenu.visible && contextMenu.customer && (
        <div
          ref={menuRef}
          className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-50 py-1 w-48"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
            onClick={() => {
              setCustomerToDelete(contextMenu.customer);
              setContextMenu({...contextMenu, visible: false});
            }}
          >
            Usuń klienta
          </button>
        </div>
      )}
      {/* Delete confirmation dialog */}
      <Dialog open={!!customerToDelete} onOpenChange={open => !open && setCustomerToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń klienta</DialogTitle>
          </DialogHeader>
          <div className="py-4">Czy na pewno chcesz usunąć klienta <b>{customerToDelete?.name}</b>? Tej operacji nie można cofnąć.</div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setCustomerToDelete(null)} disabled={isDeleting}>Anuluj</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>Usuń</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerList;
