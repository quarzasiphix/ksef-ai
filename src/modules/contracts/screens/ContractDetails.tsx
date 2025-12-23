import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getContract } from "@/integrations/supabase/repositories/contractRepository";
import { getLinksForContract } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { Calendar, User, ArrowLeft, Edit, Send } from "lucide-react";
import ShareContractDialog from "@/modules/contracts/components/ShareContractDialog";
import { SendContractDialog } from "@/modules/contracts/components/SendContractDialog";

const ContractDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => (id ? getContract(id) : Promise.resolve(null)),
    enabled: !!id,
  });

  const { customers, invoices } = useGlobalData();
  const customerName = contract ? customers.data.find((c) => c.id === contract.customerId)?.name : "";

  // Linked invoices
  const { data: links = [] } = useQuery({
    queryKey: ["contractLinks", id],
    queryFn: () => (id ? getLinksForContract(id) : Promise.resolve([])),
    enabled: !!id,
  });

  const linkedInvoices = links.map((l) => invoices.data.find((inv) => inv.id === l.invoiceId)).filter(Boolean) as any[];

  const [shareOpen, setShareOpen] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);

  if (isLoading) return <div className="text-center py-8">Ładowanie...</div>;
  if (error || !contract) return <div className="text-center py-8">Nie znaleziono umowy</div>;

  return (
    <div className="space-y-6 p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 justify-between">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold truncate flex-1">{contract.number}</h1>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={() => setSendOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Wyślij umowę
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            Udostępnij
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Szczegóły umowy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Data: {new Date(contract.issueDate).toLocaleDateString("pl-PL")}</span>
          </div>
          {contract.validFrom && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Obowiązuje od: {new Date(contract.validFrom).toLocaleDateString("pl-PL")}</span>
            </div>
          )}
          {contract.validTo && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Obowiązuje do: {new Date(contract.validTo).toLocaleDateString("pl-PL")}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Kontrahent: {customerName || "-"}</span>
          </div>
          {contract.subject && (
            <div>
              <p className="font-medium">Temat:</p>
              <p>{contract.subject}</p>
            </div>
          )}
          {contract.content && (
            <div>
              <p className="font-medium">Treść:</p>
              <p className="whitespace-pre-line text-muted-foreground text-sm border p-3 rounded-md bg-muted/30">
                {contract.content}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked invoices */}
      {linkedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Powiązane faktury</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedInvoices.map((inv) => (
              <Link
                key={inv.id}
                to={`/${inv.transactionType === 'income' ? 'income' : 'expense'}/${inv.id}`}
                className="underline block"
              >
                {inv.number} • {inv.transactionType === 'income' ? 'Przychód' : 'Wydatek'}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link to={`/contracts/${contract.id}/edit`}><Edit className="h-4 w-4 mr-2" />Edytuj</Link>
        </Button>
        <Button asChild>
          <Link to={`/contracts/new?copy=${contract.id}`}>Duplikuj</Link>
        </Button>
      </div>

      <ShareContractDialog
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        contractId={contract.id}
        contractNumber={contract.number}
      />
      
      <SendContractDialog
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        contractId={contract.id}
        contractNumber={contract.number}
        onSuccess={() => {
          // Optionally refresh contract data or navigate
        }}
      />
    </div>
  );
};

export default ContractDetails;
