import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLinksForInvoice, addLink, removeLink } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Props {
  invoiceId: string;
}

const ContractsForInvoice: React.FC<Props> = ({ invoiceId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: links = [] } = useQuery({
    queryKey: ["invoiceLinks", invoiceId],
    queryFn: () => getLinksForInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  const { data: contractsData } = useQuery({
    queryKey: ["allContracts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { getContracts } = await import("@/integrations/supabase/repositories/contractRepository");
      return getContracts(user.id);
    },
    enabled: !!user?.id,
  });

  const availableContracts = (contractsData || []).filter(
    (c) => !links.find((l) => l.contractId === c.id)
  );

  const [selectedContractId, setSelectedContractId] = useState("");

  const addMutation = useMutation({
    mutationFn: () => addLink(user!.id, selectedContractId, invoiceId),
    onSuccess: () => {
      toast.success("Dodano powiązanie");
      queryClient.invalidateQueries({ queryKey: ["invoiceLinks", invoiceId] });
    },
    onError: () => toast.error("Nie udało się dodać powiązania"),
  });

  const removeMutation = useMutation({
    mutationFn: (linkId: string) => removeLink(linkId),
    onSuccess: () => {
      toast.success("Usunięto powiązanie");
      queryClient.invalidateQueries({ queryKey: ["invoiceLinks", invoiceId] });
    },
    onError: () => toast.error("Nie udało się usunąć powiązania"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Powiązane umowy ({links.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.length === 0 && (
          <p className="text-sm text-muted-foreground">Brak powiązanych umów</p>
        )}
        {links.map((link) => {
          const contract = contractsData?.find((c) => c.id === link.contractId);
          if (!contract) return null;
          return (
            <div
              key={link.id}
              className="flex justify-between items-center border p-2 rounded-md"
            >
              <Link to={`/contracts/${contract.id}`} className="underline truncate">
                {contract.number}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMutation.mutate(link.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        {availableContracts.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedContractId}
              onValueChange={setSelectedContractId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Wybierz umowę" />
              </SelectTrigger>
              <SelectContent>
                {availableContracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedContractId || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              Dodaj
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractsForInvoice; 