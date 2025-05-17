
import React, { useEffect, useState } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer } from "@/types";
import { getCustomers } from "@/integrations/supabase/repositories/customerRepository";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

interface CustomerSelectorProps {
  value?: string;
  onChange: (value: string, name?: string) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await getCustomers();
        setCustomers(data);
        
        // Set first customer as default if no value and customers exist
        if (!value && data.length > 0) {
          onChange(data[0].id, data[0].name);
        }
      } catch (err) {
        console.error("Error loading customers:", err);
        setError("Nie udało się załadować klientów");
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [onChange, value]);

  const handleAddCustomer = () => {
    navigate("/customers/new");
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Ładowanie klientów...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
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
