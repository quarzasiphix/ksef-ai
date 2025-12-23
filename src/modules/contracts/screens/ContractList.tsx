// ContractList component
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getContracts } from "@/integrations/supabase/repositories/contractRepository";
import { useAuth } from "@/shared/hooks/useAuth";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { Contract } from "@/shared/types";
import ContractCard from "@/modules/inbox/components/ContractCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";

const ContractList: React.FC = () => {
  const { user } = useAuth();
  const { data: contracts = [], isLoading, error } = useQuery({
    queryKey: ["contracts", user?.id],
    queryFn: () => (user?.id ? getContracts(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
  });

  const { customers } = useGlobalData();
  const getCustomerName = (customerId?: string) => {
    if (!customerId) return "-";
    const customer = customers.data.find((c) => c.id === customerId);
    return customer ? customer.name : "-";
  };

  if (error) return <div className="text-center py-8">Błąd ładowania umów.</div>;

  return (
    <div className="space-y-6 px-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Umowy</h1>
          <p className="text-muted-foreground">Zarządzaj swoimi umowami</p>
        </div>
        <Button asChild>
          <Link to="/contracts/new">
            <Plus className="mr-2 h-4 w-4" /> Nowa umowa
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista umów ({contracts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8">Brak umów</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {contracts.map((contract: Contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  customerName={getCustomerName(contract.customerId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractList;
