
import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, Invoice } from "@/types";
import { getCustomers } from "@/integrations/supabase/repositories/customerRepository";
import { getInvoices } from "@/integrations/supabase/repositories/invoiceRepository";
import { ArrowLeft, User, Mail, Phone, MapPin, Building, FileText, Edit, Plus } from "lucide-react";
import InvoiceCard from "@/components/invoices/InvoiceCard";

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Get all customers and find the one with matching ID
        const customers = await getCustomers();
        const foundCustomer = customers.find(c => c.id === id) || null;
        setCustomer(foundCustomer);
        
        // Get invoices for this customer
        if (foundCustomer) {
          const allInvoices = await getInvoices();
          const filteredInvoices = allInvoices.filter(inv => inv.customerId === id);
          setCustomerInvoices(filteredInvoices);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (loading) {
    return (
      <div className="text-center py-8">
        Ładowanie...
      </div>
    );
  }
  
  if (!customer) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Nie znaleziono klienta</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p>Klient o podanym ID nie istnieje.</p>
            <Button className="mt-4" asChild>
              <Link to="/customers">Wróć do listy klientów</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            {customer.taxId && <p className="text-muted-foreground">NIP: {customer.taxId}</p>}
          </div>
        </div>
        
        <Button asChild>
          <Link to={`/customers/edit/${customer.id}`}>
            <Edit className="mr-2 h-4 w-4" />
            Edytuj klienta
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Informacje o kliencie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{customer.name}</p>
                  {customer.taxId && <p className="text-sm text-muted-foreground">NIP: {customer.taxId}</p>}
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p>{customer.address}</p>
                  <p>{customer.postalCode} {customer.city}</p>
                </div>
              </div>
              
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <p>{customer.email}</p>
                </div>
              )}
              
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <p>{customer.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle>Faktury klienta</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/invoices/new?customerId=${customer.id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nowa faktura
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {customerInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <p>Brak faktur dla tego klienta</p>
                  <Button className="mt-4" asChild>
                    <Link to={`/invoices/new?customerId=${customer.id}`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Wystaw fakturę
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customerInvoices.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
