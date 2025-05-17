
import React, { useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useGlobalData } from "@/hooks/use-global-data";

interface CustomerSelectorProps {
  value?: string;
  onChange: (value: string, name?: string) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
}) => {
  const { customers: { data: customers, isLoading, error } } = useGlobalData();
  const navigate = useNavigate();

  useEffect(() => {
    // Set first customer as default if no value and customers exist
    if (!value && customers.length > 0 && !isLoading) {
      onChange(customers[0].id, customers[0].name);
    }
  }, [customers, isLoading, value, onChange]);

  const handleAddCustomer = () => {
    navigate("/customers/new");
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
        variant="outline" 
        size="icon" 
        onClick={handleAddCustomer} 
        title="Dodaj nowego klienta"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};
