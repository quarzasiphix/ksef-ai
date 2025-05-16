
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Customer } from "@/types";
import { getCustomers } from "@/integrations/supabase/repositories/customerRepository";
import CustomerForm from "@/components/customers/CustomerForm";

const EditCustomer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const customers = await getCustomers();
        const foundCustomer = customers.find(c => c.id === id) || null;
        setCustomer(foundCustomer);
      } catch (error) {
        console.error("Error fetching customer:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomer();
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
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to={`/customers/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edytuj klienta</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dane klienta</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm initialData={customer} />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditCustomer;
