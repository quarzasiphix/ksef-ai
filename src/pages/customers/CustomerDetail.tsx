
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/invoice-utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Edit, ArrowLeft, FileText, Plus, MessageCircle, Mail, Phone } from "lucide-react";
import { useGlobalData } from "@/hooks/use-global-data";
import { getCustomerWithLinkedProfile } from "@/integrations/supabase/repositories/customerRepository";
import InvoiceCard from "@/components/invoices/InvoiceCard";
import ReceivedInvoicesTab from "@/components/invoices/ReceivedInvoicesTab";
import { Customer } from "@/types";

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { invoices: { data: invoices, isLoading: invoicesLoading } } = useGlobalData();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const customerInvoices = invoices.filter(inv => inv.customerId === id);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const customerData = await getCustomerWithLinkedProfile(id);
        setCustomer(customerData);
      } catch (error) {
        console.error("Error fetching customer:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  if (isLoading || invoicesLoading) {
    return <div className="text-center py-8">Ładowanie...</div>;
  }

  if (!customer) {
    return <div className="text-center py-8">Klient nie został znaleziony</div>;
  }

  const totalRevenue = customerInvoices.reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0);
  const paidInvoices = customerInvoices.filter(inv => inv.isPaid);
  const unpaidInvoices = customerInvoices.filter(inv => !inv.isPaid);
  const isLinkedToUser = customer.linkedBusinessProfile?.user_id;

  return (
    <div className="space-y-6 max-w-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">{customer.name}</h1>
              {isLinkedToUser && (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                  Użytkownik aplikacji
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {customer.customerType === 'odbiorca' ? 'Odbiorca' : 
               customer.customerType === 'sprzedawca' ? 'Sprzedawca' : 'Odbiorca i Sprzedawca'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link to={`/customers/edit/${customer.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edytuj
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/income/new?customerId=${customer.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Nowa faktura
            </Link>
          </Button>
          {isLinkedToUser && (
            <Button variant="outline" asChild>
              <Link to={`/customers/${customer.id}/message`}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Wyślij wiadomość
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Łączne przychody
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zapłacone faktury
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {paidInvoices.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Niezapłacone faktury
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {unpaidInvoices.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Szczegóły klienta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Informacje podstawowe</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Nazwa:</span> {customer.name}
                </div>
                {customer.taxId && (
                  <div>
                    <span className="font-medium">NIP:</span> {customer.taxId}
                  </div>
                )}
                <div>
                  <span className="font-medium">Typ:</span>{" "}
                  {customer.customerType === 'odbiorca' ? 'Odbiorca' : 
                   customer.customerType === 'sprzedawca' ? 'Sprzedawca' : 'Odbiorca i Sprzedawca'}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Adres</h4>
              <div className="space-y-2 text-sm">
                <div>{customer.address}</div>
                <div>
                  {customer.postalCode} {customer.city}
                </div>
              </div>
            </div>
            
            {/* Enhanced contact section for linked users */}
            {isLinkedToUser && customer.linkedBusinessProfile && (
              <div>
                <h4 className="font-semibold mb-3">Kontakt (profil firmowy)</h4>
                <div className="space-y-2 text-sm">
                  {customer.linkedBusinessProfile.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span> 
                      <span>{customer.linkedBusinessProfile.email}</span>
                    </div>
                  )}
                  {customer.linkedBusinessProfile.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Telefon:</span> 
                      <span>{customer.linkedBusinessProfile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Standard contact for non-linked customers */}
            {!isLinkedToUser && (customer.email || customer.phone) && (
              <div>
                <h4 className="font-semibold mb-3">Kontakt</h4>
                <div className="space-y-2 text-sm">
                  {customer.email && (
                    <div>
                      <span className="font-medium">Email:</span> {customer.email}
                    </div>
                  )}
                  {customer.phone && (
                    <div>
                      <span className="font-medium">Telefon:</span> {customer.phone}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Faktury</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLinkedToUser ? (
            <Tabs defaultValue="issued" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="issued">Wystawione dla klienta</TabsTrigger>
                <TabsTrigger value="received">Otrzymane od klienta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="issued" className="mt-6">
                {customerInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Brak faktur dla tego klienta</p>
                    <Button asChild className="mt-4">
                      <Link to={`/income/new?customerId=${customer.id}`}>
                        Wystaw pierwszą fakturę
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customerInvoices.map((invoice) => (
                      <InvoiceCard key={invoice.id} invoice={invoice as any} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="received" className="mt-6">
                <ReceivedInvoicesTab />
              </TabsContent>
            </Tabs>
          ) : (
            // Simplified view for non-linked customers
            <div>
              <h3 className="text-lg font-semibold mb-4">Wystawione faktury</h3>
              {customerInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Brak faktur dla tego klienta</p>
                  <Button asChild className="mt-4">
                    <Link to={`/income/new?customerId=${customer.id}`}>
                      Wystaw pierwszą fakturę
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customerInvoices.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice as any} />
                  ))}
                </div>
              )}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Ten klient nie jest połączony z żadnym kontem w aplikacji. 
                  Nie możesz otrzymywać od niego faktur ani wysyłać wiadomości.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDetail;
