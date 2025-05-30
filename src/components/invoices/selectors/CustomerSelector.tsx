import React, { useEffect, useState } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useGlobalData } from "@/hooks/use-global-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CustomerForm from "@/components/customers/CustomerForm";

interface CustomerSelectorProps {
  value?: string;
  onChange: (value: string, name?: string) => void;
  showBusinessProfiles?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
  showBusinessProfiles = true // Default to true if not provided
}) => {
  const { customers: { data: customers, isLoading, error }, refreshAllData } = useGlobalData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Set first customer as default if no value and customers exist
    if (!value && customers.length > 0 && !isLoading) {
      onChange(customers[0].id, customers[0].name);
    }
  }, [customers, isLoading, value, onChange]);

  const handleAddCustomer = () => {
    setIsModalOpen(true);
  };

  const handleCustomerFormSuccess = async (customer: Customer) => {
    // After successfully creating a customer, refetch all data including the customer list
    await refreshAllData();
    // Select the newly created customer
    onChange(customer.id, customer.name);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Ładowanie klientów...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">Nie udało się załadować klientów</div>;
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Select 
          value={value} 
          onValueChange={(val) => {
            const customer = customers.find(c => c.id === val);
            onChange(val, customer?.name);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Wybierz klienta" />
          </SelectTrigger>
          <SelectContent>
            {customers.length > 0 ? (
              customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                Brak klientów
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <Button 
        type="button" // Changed to type="button" to prevent form submission
        variant="outline" 
        size="icon" 
        onClick={handleAddCustomer} 
        title="Dodaj nowego klienta"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* New Customer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj nowego klienta</DialogTitle>
          </DialogHeader>
          <CustomerForm 
            isOpen={isModalOpen} // Pass modal state
            onClose={() => setIsModalOpen(false)} // Function to close modal
            onSuccess={handleCustomerFormSuccess} // Function to handle successful customer creation
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
