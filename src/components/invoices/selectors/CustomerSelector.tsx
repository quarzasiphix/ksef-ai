
import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useGlobalData } from "@/hooks/use-global-data";
import { Customer } from "@/types";
import { Link } from "react-router-dom";

interface CustomerSelectorProps {
  value: string;
  onChange: (id: string, name?: string) => void;
  showBusinessProfiles?: boolean;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
  showBusinessProfiles = true,
}) => {
  const { customers: { data: customers }, businessProfiles: { data: businessProfiles } } = useGlobalData();
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Find selected customer when value changes
  useEffect(() => {
    if (value && customers.length > 0) {
      const customer = customers.find(c => c.id === value);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [value, customers]);

  const handleSelect = (customerId: string, customerName: string) => {
    onChange(customerId, customerName);
    setOpen(false);
  };

  const allOptions = [
    ...customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      type: 'customer' as const,
      isLinked: !!customer.linkedBusinessProfile,
      customer,
    })),
    ...(showBusinessProfiles ? businessProfiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      type: 'business' as const,
      isLinked: true,
      customer: null,
    })) : [])
  ];

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCustomer ? (
              <div className="flex items-center gap-2">
                <span className="truncate" style={{ whiteSpace: 'pre-wrap' }}>{selectedCustomer.name}</span>
                {selectedCustomer.linkedBusinessProfile && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    Połączony
                  </Badge>
                )}
              </div>
            ) : (
              "Wybierz klienta..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Szukaj klienta..." />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Nie znaleziono klientów</p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/customers/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Dodaj nowego klienta
                    </Link>
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {allOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => handleSelect(option.id, option.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="truncate" style={{ whiteSpace: 'pre-wrap' }}>{option.name}</span>
                        {option.type === 'business' && (
                          <Badge variant="secondary" className="text-xs">
                            Profil biznesowy
                          </Badge>
                        )}
                        {option.isLinked && option.type === 'customer' && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            <User className="mr-1 h-3 w-3" />
                            Połączony
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Display connection status below selector */}
      {selectedCustomer && (
        <div className="text-sm text-muted-foreground">
          {selectedCustomer.linkedBusinessProfile ? (
            <div className="flex items-center gap-2 text-green-600">
              <User className="h-4 w-4" />
              <span>Klient jest połączony z aplikacją - można wysyłać faktury</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-600">
              <User className="h-4 w-4" />
              <span>Klient nie jest połączony z aplikacją - tylko wystawianie faktur</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
