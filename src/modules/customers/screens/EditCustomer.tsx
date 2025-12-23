
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ArrowLeft } from "lucide-react";
import { Customer } from "@/shared/types";
import CustomerForm from "@/modules/customers/components/CustomerForm";
import { toast } from "sonner";
import { useGlobalData } from "@/shared/hooks/use-global-data";

const EditCustomer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const { customers: { data: customers, isLoading } } = useGlobalData();
  
  // Find the customer from the global data cache instead of refetching
  const customer = customers.find(c => c.id === id) || null;
  
  const handleClose = () => {
    navigate(`/customers/${id}`);
  };
  
  const handleSuccess = async (customer: Customer) => {
    toast.success('Klient został zaktualizowany');
    if (window.triggerCustomersRefresh) {
      try {
        await window.triggerCustomersRefresh();
      } catch (e) {
        // fail silently
      }
    }
    navigate(`/customers/${customer.id}`);
  };
  
  if (isLoading) {
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
          {customer && (
            <CustomerForm
              initialData={customer}
              isOpen={isOpen}
              onClose={handleClose}
              onSuccess={handleSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditCustomer;
