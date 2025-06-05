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
import { Customer } from "@/types";
import { Plus, Search, User, MapPin, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGlobalData } from "@/hooks/use-global-data";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CLIENT_TYPE_LABELS: Record<string, string> = {
  odbiorca: "Odbiorca",
  sprzedawca: "Dostawca",
};

const CustomerCard = ({ customer }: { customer: Customer }) => {
  return (
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
  );
};

const CustomerList = () => {
  const { customers: { data: customers, isLoading }, refreshAllData } = useGlobalData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

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
  
  return (
    <div className="space-y-6">
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
                <CustomerCard key={customer.id} customer={customer} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerList;
