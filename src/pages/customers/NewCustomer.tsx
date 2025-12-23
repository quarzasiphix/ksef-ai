
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import CustomerForm from '@/components/customers/CustomerForm';
import { Customer } from '@/types';
import { toast } from 'sonner';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { logCreationEvent, shouldLogEvents } from '@/utils/eventLogging';

const NewCustomer = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const { selectedProfileId, profiles } = useBusinessProfile();
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  
  const handleClose = () => {
    navigate('/customers');
  };
  
  const handleSuccess = async (customer: Customer) => {
    // Log event for Spółki
    if (shouldLogEvents(selectedProfile?.entityType)) {
      await logCreationEvent({
        businessProfileId: selectedProfileId!,
        eventType: 'document_uploaded',
        entityType: 'customer',
        entityId: customer.id,
        entityReference: customer.name,
        actionSummary: `Dodano kontrahenta: ${customer.name}`,
        changes: {
          name: customer.name,
        },
      });
    }
    
    toast.success('Klient został utworzony');
    if (window.triggerCustomersRefresh) {
      try {
        await window.triggerCustomersRefresh();
      } catch (e) {
        // fail silently
      }
    }
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
