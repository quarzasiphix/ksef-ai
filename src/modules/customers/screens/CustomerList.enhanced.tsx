import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { Customer } from "@/shared/types";
import { Plus, Search, User, MapPin, Phone, Mail, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { deleteCustomer } from '@/modules/customers/data/customerRepository';
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
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

const CLIENT_TYPE_LABELS: Record<string, string> = {
  odbiorca: "Odbiorca",
  sprzedawca: "Dostawca",
};

interface GroupedCustomers {
  businessProfileId: string | null;
  businessProfileName: string;
  customers: Customer[];
  isSelected: boolean;
  isOwnedProfile: boolean;
}

const CustomerList = () => {
  const { customers: { data: customers, isLoading }, refreshAllData } = useGlobalData();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const ownedProfileIds = useMemo(() => new Set(profiles?.map(profile => profile.id) ?? []), [profiles]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{visible: boolean, x: number, y: number, customer: Customer | null}>({visible: false, x: 0, y: 0, customer: null});
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  // Expose this function for triggering a customer refresh from outside (edit/new)
  React.useEffect(() => {
    window.triggerCustomersRefresh = async () => {
      setIsUpdating(true);
      await refreshAllData();
      setIsUpdating(false);
    };
  }, [refreshAllData]);

  // Group customers by business profile
  const groupedCustomers = useMemo(() => {
    // Debug: Log total customers received
    console.log('CustomerList: Total customers received:', customers.length);
    console.log('CustomerList: Customers with ba9bcb8a profile:', 
      customers.filter(c => c.business_profile_id === 'ba9bcb8a-6be7-4989-ab26-4ea234c892d4').length);
    
    // Filter by search and tab first
    const filtered = customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.taxId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (activeTab === "all") return true;
      if (activeTab === "odbiorca") return customer.customerType === "odbiorca";
      if (activeTab === "sprzedawca") return customer.customerType === "sprzedawca";
      return true;
    });

    // Group by business profile
    const groups = new Map<string | null, Customer[]>();
    
    filtered.forEach(customer => {
      const profileId = customer.business_profile_id || null;
      if (!groups.has(profileId)) {
        groups.set(profileId, []);
      }
      groups.get(profileId)!.push(customer);
    });

    // Convert to array and sort: selected profile first, then others
    const result: GroupedCustomers[] = [];
    
    groups.forEach((customers, profileId) => {
      const isOwnedProfile = profileId ? ownedProfileIds.has(profileId) : true;
      const profile = profiles?.find(p => p.id === profileId);
      const isSelected = isOwnedProfile && profileId === selectedProfileId;
      const businessProfileName = profileId
        ? (isOwnedProfile ? (profile?.name || 'Moja firma') : 'Firma połączona (inne konto)')
        : 'Nieprzypisane';
      
      result.push({
        businessProfileId: profileId,
        businessProfileName,
        customers: customers.sort((a, b) => a.name.localeCompare(b.name)),
        isSelected,
        isOwnedProfile,
      });
    });

    // Sort: selected first, then alphabetically
    return result.sort((a, b) => {
      if (a.isSelected) return -1;
      if (b.isSelected) return 1;
      if (a.isOwnedProfile && !b.isOwnedProfile) return -1;
      if (!a.isOwnedProfile && b.isOwnedProfile) return 1;
      return a.businessProfileName.localeCompare(b.businessProfileName);
    });
  }, [customers, searchTerm, activeTab, selectedProfileId, profiles]);

  const totalCustomers = useMemo(() => {
    return groupedCustomers.reduce((sum, group) => sum + group.customers.length, 0);
  }, [groupedCustomers]);

  const toggleGroup = (groupId: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroups(newCollapsed);
  };

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

  const handleContextMenu = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      customer,
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

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Klienci {isUpdating && <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj bazą klientów wszystkich firm
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
                Łączna liczba: {totalCustomers} klientów w {groupedCustomers.length} {groupedCustomers.length === 1 ? 'firmie' : 'firmach'}
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
          ) : groupedCustomers.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm.length > 0 ? "Brak wyników wyszukiwania" : "Brak klientów"}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedCustomers.map((group) => {
                const groupKey = group.businessProfileId
                  ? group.isOwnedProfile
                    ? group.businessProfileId
                    : `external-${group.businessProfileId}`
                  : group.isOwnedProfile
                    ? 'unassigned'
                    : 'external-unassigned';
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
                            {group.customers.length} {group.customers.length === 1 ? 'klient' : 'klientów'}
                          </p>
                        </div>
                      </div>
                      {group.isSelected && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                          Wybrana firma
                        </Badge>
                      )}
                      {!group.isOwnedProfile && (
                        <Badge variant="outline" className="border-amber-300 text-amber-500">
                          Połączone konto
                        </Badge>
                      )}
                    </div>

                    {/* Group Content */}
                    {!isCollapsed && (
                      <div className="rounded-md border ml-8">
                        <div className="divide-y">
                          {group.customers.map((customer) => (
                            <div
                              key={customer.id}
                              className="relative"
                              onContextMenu={(e) => handleContextMenu(e, customer)}
                            >
                              <Link
                                to={`/customers/${customer.id}`}
                                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted no-underline"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{customer.name}</span>
                                    {customer.taxId && (
                                      <Badge variant="outline" className="text-xs">NIP: {customer.taxId}</Badge>
                                    )}
                                    {customer.customerType && (
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${customer.customerType === 'odbiorca' ? 'border-green-600 text-green-700' : customer.customerType === 'sprzedawca' ? 'border-blue-600 text-blue-700' : 'border-yellow-600 text-yellow-700'}`}
                                      >
                                        {CLIENT_TYPE_LABELS[customer.customerType]}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground truncate">
                                    <span className="flex items-center gap-1 truncate">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span className="truncate">{customer.address}, {customer.postalCode} {customer.city}</span>
                                    </span>
                                    {customer.email && (
                                      <span className="flex items-center gap-1 truncate">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span className="truncate">{customer.email}</span>
                                      </span>
                                    )}
                                    {customer.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span>{customer.phone}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.customer && (
        <div
          ref={menuRef}
          className="fixed bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 z-50 py-1 w-48"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
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
      <AlertDialog open={!!customerToDelete} onOpenChange={open => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń klienta</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć klienta <b>{customerToDelete?.name}</b>? Tej operacji nie można cofnąć.
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
    </div>
  );
};

export default CustomerList;
