
import React, { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, User, Building2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { Badge } from "@/shared/ui/badge";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { Customer } from "@/shared/types";
import { Link } from "react-router-dom";

interface CustomerSelectorProps {
  value: string;
  onChange: (id: string, name?: string) => void;
  showBusinessProfiles?: boolean;
  onBusinessProfileSelect?: (id: string, name: string) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
  showBusinessProfiles = true,
  onBusinessProfileSelect,
}) => {
  const { customers: { data: customers }, businessProfiles: { data: businessProfiles } } = useGlobalData();
  const { selectedProfileId, profiles } = useBusinessProfile();
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

  // Group customers by business profile
  const groupedCustomers = useMemo(() => {
    const groups = new Map<string | null, Customer[]>();
    
    customers.forEach(customer => {
      const profileId = customer.business_profile_id || null;
      if (!groups.has(profileId)) {
        groups.set(profileId, []);
      }
      groups.get(profileId)!.push(customer);
    });

    // Convert to array and sort: selected profile first, then others
    const result: Array<{
      profileId: string | null;
      profileName: string;
      customers: Customer[];
      isSelected: boolean;
    }> = [];
    
    groups.forEach((customers, profileId) => {
      const profile = profiles?.find(p => p.id === profileId);
      const isSelected = profileId === selectedProfileId;
      const profileName = profileId
        ? (profile?.name || 'Moja firma')
        : 'Nieprzypisane';
      
      result.push({
        profileId,
        profileName,
        customers: customers.sort((a, b) => a.name.localeCompare(b.name)),
        isSelected,
      });
    });

    // Sort: selected first, then alphabetically
    return result.sort((a, b) => {
      if (a.isSelected) return -1;
      if (b.isSelected) return 1;
      return a.profileName.localeCompare(b.profileName);
    });
  }, [customers, selectedProfileId, profiles]);

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
              
              {/* Business profiles (if enabled) */}
              {showBusinessProfiles && onBusinessProfileSelect && businessProfiles.length > 0 && (
                <CommandGroup heading="Profile biznesowe">
                  {businessProfiles.map((profile) => (
                    <CommandItem
                      key={profile.id}
                      value={profile.name}
                      onSelect={() => {
                        onBusinessProfileSelect(profile.id, profile.name);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === profile.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <span className="truncate">{profile.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          Profil biznesowy
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {/* Grouped customers by business profile */}
              {groupedCustomers.map((group) => (
                <CommandGroup 
                  key={group.profileId || 'unassigned'}
                  heading={
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{group.profileName}</span>
                      {group.isSelected && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          Wybrana firma
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">({group.customers.length})</span>
                    </div>
                  }
                >
                  {group.customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.name}
                      onSelect={() => handleSelect(customer.id, customer.name)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <span className="truncate">{customer.name}</span>
                        {customer.linkedBusinessProfile && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            <User className="mr-1 h-3 w-3" />
                            Połączony
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Display connection status below selector */}
      {selectedCustomer && selectedCustomer.linkedBusinessProfile && (
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-green-600">
            <User className="h-4 w-4" />
            <span>Klient jest połączony z aplikacją - można wysyłać faktury</span>
          </div>
        </div>
      )}
    </div>
  );
};
