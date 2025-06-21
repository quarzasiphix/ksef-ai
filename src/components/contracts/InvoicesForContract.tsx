import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLinksForContract, addLink, removeLink } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalData } from "@/hooks/use-global-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Props { contractId: string; }

const InvoicesForContract: React.FC<Props> = ({ contractId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: links = [] } = useQuery({
    queryKey: ["contractLinks", contractId],
    queryFn: () => getLinksForContract(contractId),
    enabled: !!contractId,
  });

  const { invoices } = useGlobalData();
  const availableInvoices = invoices.data.filter((inv) => !links.find((l) => l.invoiceId === inv.id));

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  const addMutation = useMutation({
    mutationFn: () => addLink(user!.id, contractId, selectedInvoiceId),
    onSuccess: () => {
      toast.success("Powiązano fakturę");
      queryClient.invalidateQueries({ queryKey: ["contractLinks", contractId] });
    },
    onError: () => toast.error("Błąd dodawania powiązania"),
  });

  const removeMutation = useMutation({
    mutationFn: (linkId: string) => removeLink(linkId),
    onSuccess: () => {
      toast.success("Usunięto powiązanie");
      queryClient.invalidateQueries({ queryKey: ["contractLinks", contractId] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Powiązane faktury ({links.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.length === 0 && <p className="text-sm text-muted-foreground">Brak powiązanych faktur</p>}
        {links.map((link) => {
          const invoice = invoices.data.find((i) => i.id === link.invoiceId);
          if (!invoice) return null;
          return (
            <div key={link.id} className="flex justify-between items-center border p-2 rounded-md">
              <Link to={`/income/${invoice.id}`} className="underline">
                {invoice.number}
              </Link>
              <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(link.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        {/* Add new invoice */}
        {availableInvoices.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Wybierz fakturę" />
              </SelectTrigger>
              <SelectContent>
                {availableInvoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>{inv.number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!selectedInvoiceId || addMutation.isPending} onClick={() => addMutation.mutate()}>
              Dodaj
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoicesForContract; 