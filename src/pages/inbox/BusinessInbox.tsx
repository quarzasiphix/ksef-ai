import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Inbox,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquare,
  Eye,
  Clock,
  TrendingUp,
  FileText,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { formatCurrency } from "@/lib/utils";
import { getInvoices } from "@/integrations/supabase/repositories/invoiceRepository";
import { Invoice, InvoiceType, TransactionType, InvoiceStatus } from "@/types";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface InboxStats {
  received_count: number;
  pending_count: number;
  total_value_pending: number;
}

export const BusinessInbox = () => {
  const { user } = useAuth();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");

  const currentBusinessProfile = profiles.find(p => p.id === selectedProfileId);

  // Fetch received invoices (invoices sent TO this business)
  const { data: allInvoices = [], isLoading } = useQuery({
    queryKey: ["received-invoices", selectedProfileId, user?.id],
    queryFn: async () => {
      if (!user?.id || !currentBusinessProfile) return [];
      
      console.log('[BusinessInbox] Fetching received invoices for:', currentBusinessProfile.name, 'tax_id:', currentBusinessProfile.taxId);
      
      // Get all invoices accessible to this user via RLS
      const allInvoices = await getInvoices(user.id);
      
      console.log('[BusinessInbox] Total accessible invoices:', allInvoices.length);
      
      // Filter client-side to find invoices sent TO the current business profile
      // Match by: customer tax_id = current business tax_id AND not created by current business
      const receivedInvoices = allInvoices.filter(invoice => {
        // Skip invoices created by current business
        if (invoice.businessProfileId === currentBusinessProfile.id) {
          return false;
        }

        // Check if invoice buyer's tax_id matches current business tax_id
        // invoice.buyer is populated by getInvoices()
        // If buyer is missing (which shouldn't happen if RLS works), we can't verify ownership
        const buyerTaxId = invoice.buyer?.taxId;
        
        if (buyerTaxId === currentBusinessProfile.taxId) {
          console.log('[BusinessInbox] ✓ Received invoice:', invoice.number, 'from:', invoice.businessName);
          return true;
        }
        
        return false;
      });

      console.log('[BusinessInbox] Found', receivedInvoices.length, 'received invoices for', currentBusinessProfile.name);
      
      return receivedInvoices;
    },
    enabled: !!currentBusinessProfile && !!user?.id,
  });

  // Calculate stats
  const stats: InboxStats = {
    received_count: allInvoices.length,
    pending_count: allInvoices.filter(inv => !inv.isPaid).length,
    total_value_pending: allInvoices
      .filter(inv => !inv.isPaid)
      .reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0),
  };

  // Filter invoices by tab
  const filteredInvoices = activeTab === "pending" 
    ? allInvoices.filter(inv => !inv.isPaid)
    : allInvoices;

  const getPaymentStatusIcon = (isPaid: boolean) => {
    return isPaid 
      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
      : <Clock className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Inbox className="h-8 w-8" />
            Skrzynka Biznesowa
          </h1>
          <p className="text-muted-foreground mt-1">
            Faktury otrzymane od kontrahentów - negocjuj przed wysłaniem do KSeF
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Otrzymane faktury</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.received_count || 0}</div>
            <p className="text-xs text-muted-foreground">faktur otrzymanych</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Do zapłaty</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_count || 0}</div>
            <p className="text-xs text-muted-foreground">niezapłaconych</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dyskusje</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">aktywnych dyskusji</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartość do zapłaty</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_value_pending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">PLN do zapłaty</p>
          </CardContent>
        </Card>
      </div>

      {/* Inbox Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            Wszystkie
            <Badge className="ml-2">{allInvoices.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Do zapłaty
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
          ) : filteredInvoices.length > 0 ? (
            <div className="space-y-3">
              {filteredInvoices.map((invoice) => (
                <Card
                  key={invoice.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    selectedInvoice === invoice.id ? "ring-2 ring-primary" : ""
                  } ${
                    !invoice.isPaid ? "border-l-4 border-l-amber-500" : ""
                  }`}
                  onClick={() => setSelectedInvoice(invoice.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Invoice info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          {getPaymentStatusIcon(invoice.isPaid)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                Faktura {invoice.number}
                              </span>
                              <Badge variant={invoice.isPaid ? "outline" : "default"}>
                                {invoice.isPaid ? "Zapłacona" : "Do zapłaty"}
                              </Badge>
                              <Badge variant="secondary">
                                <ArrowDownCircle className="h-3 w-3 mr-1" />
                                Otrzymana
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              od: <span className="font-medium">{invoice.businessName}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: pl })}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Termin: {format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: pl })}
                          </div>
                          <div className="font-semibold text-foreground">
                            {formatCurrency(invoice.totalGrossValue)} PLN
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/invoices/${invoice.id}`;
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
                            window.location.href = `/invoices/${invoice.id}?section=discussion`;
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Dyskusja
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
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Brak dokumentów</h3>
                <p className="text-muted-foreground">
                  {activeTab === "pending"
                    ? "Wszystkie faktury zostały zapłacone"
                    : "Nie otrzymałeś jeszcze żadnych faktur"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Panel - TODO: Add invoice details modal */}
    </div>
  );
};

export default BusinessInbox;
