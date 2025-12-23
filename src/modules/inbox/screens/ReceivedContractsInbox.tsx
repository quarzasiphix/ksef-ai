import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  ArrowDownCircle,
  TrendingUp,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface ReceivedContract {
  contract_id: string;
  contract_number: string;
  contract_subject: string;
  contract_type: string;
  valid_from: string;
  valid_to: string;
  agreement_status: string;
  sender_id: string;
  sender_name: string;
  sender_tax_id: string;
  delivery_id: string;
  delivery_status: string;
  sent_at: string;
  attached_invoice_count: number;
}

interface InboxStats {
  received_count: number;
  pending_count: number;
}

export const ReceivedContractsInbox = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");

  const { data: receivedContracts = [], isLoading } = useQuery({
    queryKey: ["received-contracts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_received_contracts_with_senders');
      
      if (error) {
        console.error('Error fetching received contracts:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  const stats: InboxStats = {
    received_count: receivedContracts.length,
    pending_count: receivedContracts.filter(
      (c: ReceivedContract) => ['received', 'under_discussion', 'correction_needed'].includes(c.agreement_status)
    ).length,
  };

  const filteredContracts = activeTab === "pending"
    ? receivedContracts.filter((c: ReceivedContract) => 
        ['received', 'under_discussion', 'correction_needed'].includes(c.agreement_status)
      )
    : receivedContracts;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      received: { label: "Otrzymano", variant: "default" },
      under_discussion: { label: "W dyskusji", variant: "secondary" },
      correction_needed: { label: "Wymaga korekty", variant: "outline" },
      approved: { label: "Zaakceptowano", variant: "default" },
      signed: { label: "Podpisano", variant: "default" },
      rejected: { label: "Odrzucono", variant: "destructive" },
    };

    const { label, variant } = config[status] || { label: status, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'signed' || status === 'approved') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Otrzymane umowy
          </h1>
          <p className="text-muted-foreground mt-1">
            Umowy otrzymane od kontrahentów - weryfikuj i akceptuj przed podpisaniem
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Otrzymane umowy</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.received_count}</div>
            <p className="text-xs text-muted-foreground">umów otrzymanych</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_count}</div>
            <p className="text-xs text-muted-foreground">do weryfikacji</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/inbox')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faktury</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Zobacz</div>
            <p className="text-xs text-muted-foreground">otrzymane faktury →</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            Wszystkie
            <Badge className="ml-2">{receivedContracts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Oczekujące
            <Badge className="ml-2">{stats.pending_count}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Ładowanie...
              </CardContent>
            </Card>
          ) : filteredContracts.length > 0 ? (
            <div className="space-y-3">
              {filteredContracts.map((contract: ReceivedContract) => (
                <Card
                  key={contract.contract_id}
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    ['received', 'under_discussion', 'correction_needed'].includes(contract.agreement_status)
                      ? "border-l-4 border-l-amber-500"
                      : ""
                  }`}
                  onClick={() => navigate(`/contracts/received/${contract.contract_id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Contract info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(contract.agreement_status)}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-lg">
                                Umowa {contract.contract_number}
                              </span>
                              {getStatusBadge(contract.agreement_status)}
                              <Badge variant="secondary">
                                <ArrowDownCircle className="h-3 w-3 mr-1" />
                                Otrzymana
                              </Badge>
                              {contract.attached_invoice_count > 0 && (
                                <Badge variant="outline">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {contract.attached_invoice_count} faktur
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              od: <span className="font-medium">{contract.sender_name}</span>
                            </p>
                          </div>
                        </div>

                        {contract.contract_subject && (
                          <p className="text-sm text-muted-foreground">
                            {contract.contract_subject}
                          </p>
                        )}

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(contract.sent_at), 'dd MMM yyyy', { locale: pl })}
                          </div>
                          {contract.valid_from && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Obowiązuje: {format(new Date(contract.valid_from), 'dd MMM yyyy', { locale: pl })}
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {contract.contract_type || 'general'}
                          </Badge>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contracts/received/${contract.contract_id}?section=details`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Szczegóły
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contracts/received/${contract.contract_id}?section=discussion`);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Dyskusja
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contracts/received/${contract.contract_id}?section=history`);
                          }}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Historia
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Brak umów</h3>
                <p className="text-muted-foreground">
                  {activeTab === "pending"
                    ? "Wszystkie umowy zostały zweryfikowane"
                    : "Nie otrzymałeś jeszcze żadnych umów"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReceivedContractsInbox;
