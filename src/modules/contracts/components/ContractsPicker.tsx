import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Contract } from "@/shared/types";
import { useAuth } from "@/shared/hooks/useAuth";

interface Props {
  selected: string[];
  onAdd: (id: string) => void;
  label?: string;
}

// Lightweight selector ( < 50 lines ) for choosing contracts
const ContractsPicker: React.FC<Props> = ({ selected, onAdd, label = "Dodaj umowę" }) => {
  const { user } = useAuth();
  const [contractId, setContractId] = useState("");

  const { data: contracts = [] } = useQuery({
    queryKey: ["allContracts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as Contract[];
      const { getContracts } = await import("@/integrations/supabase/repositories/contractRepository");
      return getContracts(user.id);
    },
    enabled: !!user?.id,
  });

  const available = contracts.filter((c) => !selected.includes(c.id));

  if (available.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Select value={contractId} onValueChange={setContractId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Wybierz umowę" />
        </SelectTrigger>
        <SelectContent>
          {available.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.number}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={!contractId} onClick={() => { onAdd(contractId); setContractId(""); }}>
        {label}
      </Button>
    </div>
  );
};

export default ContractsPicker; 