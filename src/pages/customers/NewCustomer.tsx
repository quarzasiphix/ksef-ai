
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import CustomerForm from '@/components/customers/CustomerForm';
import { Customer } from '@/types';
import { toast } from 'sonner';

const NewCustomer = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  
  const handleClose = () => {
    navigate('/customers');
  };
  
  const handleSuccess = (customer: Customer) => {
    toast.success('Klient został utworzony');
    navigate(`/customers/${customer.id}`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nowy klient</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dane klienta</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            isOpen={isOpen}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCustomer;
