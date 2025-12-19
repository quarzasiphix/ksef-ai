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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import {
  DeliveryStatus,
  DeliveryWithContext,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
  getDeliveryStatusBadgeVariant,
  requiresRecipientAction,
  formatDeliveryDate,
} from "@/types/delivery";
import { InboxItemActions } from "./InboxItemActions";
import { InboxItemDetails } from "./InboxItemDetails";

interface InboxStats {
  pending_count: number;
  disputed_count: number;
  requires_action_count: number;
  total_value_pending: number;
}

export const BusinessInbox = () => {
  const { currentBusinessProfile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "disputed">("all");

  // Fetch inbox stats
  const { data: stats } = useQuery({
    queryKey: ["inbox-stats", currentBusinessProfile?.id],
    queryFn: async () => {
      if (!currentBusinessProfile?.id) return null;

      const { data, error } = await supabase.rpc("get_inbox_count", {
        profile_id: currentBusinessProfile.id,
      });

      if (error) throw error;
      return data as InboxStats;
    },
    enabled: !!currentBusinessProfile?.id,
  });

  // Fetch inbox items
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["business-inbox", currentBusinessProfile?.id, activeTab],
    queryFn: async () => {
      if (!currentBusinessProfile?.id) return [];

      let query = supabase
        .from("document_deliveries")
        .select(
          `
          *,
          sender:sender_business_profile_id(id, name, tax_id),
          dispute:document_disputes(*)
        `
        )
        .eq("recipient_business_profile_id", currentBusinessProfile.id)
        .order("sent_at", { ascending: false });

      // Filter by tab
      if (activeTab === "pending") {
        query = query.in("delivery_status", ["sent", "viewed"]);
      } else if (activeTab === "disputed") {
        query = query.eq("delivery_status", "disputed");
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DeliveryWithContext[];
    },
    enabled: !!currentBusinessProfile?.id,
  });

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case "accepted":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "disputed":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "viewed":
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      invoice: "Faktura",
      contract: "Umowa",
      offer: "Oferta",
      receipt: "Paragon",
    };
    return labels[type] || type;
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
            Dokumenty wysłane do Twojej firmy przez kontrahentów
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wymaga akcji</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.requires_action_count || 0}</div>
            <p className="text-xs text-muted-foreground">dokumentów do zaakceptowania</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_count || 0}</div>
            <p className="text-xs text-muted-foreground">nowych dokumentów</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zakwestionowane</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.disputed_count || 0}</div>
            <p className="text-xs text-muted-foreground">sporów do rozwiązania</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartość oczekująca</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_value_pending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">do zaakceptowania</p>
          </CardContent>
        </Card>
      </div>

      {/* Inbox Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            Wszystkie
            {deliveries && <Badge className="ml-2">{deliveries.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Oczekujące
            {stats && <Badge className="ml-2">{stats.pending_count}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="disputed">
            Zakwestionowane
            {stats && stats.disputed_count > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.disputed_count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Ładowanie...
              </CardContent>
            </Card>
          ) : deliveries && deliveries.length > 0 ? (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <Card
                  key={delivery.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    selectedDelivery === delivery.id ? "ring-2 ring-primary" : ""
                  } ${
                    requiresRecipientAction(delivery.delivery_status)
                      ? "border-l-4 border-l-amber-500"
                      : ""
                  }`}
                  onClick={() => setSelectedDelivery(delivery.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Document info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(delivery.delivery_status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                {getDocumentTypeLabel(delivery.document_type)}
                              </span>
                              <Badge
                                variant={getDeliveryStatusBadgeVariant(
                                  delivery.delivery_status
                                )}
                              >
                                {DELIVERY_STATUS_LABELS[delivery.delivery_status]}
                              </Badge>
                              {requiresRecipientAction(delivery.delivery_status) && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700">
                                  Wymaga akcji
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              od: <span className="font-medium">{delivery.sender?.name}</span>
                              {delivery.sender?.tax_id && (
                                <span className="ml-2">NIP: {delivery.sender.tax_id}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDeliveryDate(delivery.sent_at)}
                          </div>
                          {delivery.view_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Wyświetlono {delivery.view_count}x
                            </div>
                          )}
                          {delivery.dispute && (
                            <div className="flex items-center gap-1 text-orange-600">
                              <AlertCircle className="h-3 w-3" />
                              Spór otwarty
                            </div>
                          )}
                        </div>

                        {/* Quick preview of document details would go here */}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2">
                        {requiresRecipientAction(delivery.delivery_status) && (
                          <InboxItemActions
                            deliveryId={delivery.id}
                            onActionComplete={() => {
                              queryClient.invalidateQueries({
                                queryKey: ["business-inbox"],
                              });
                              queryClient.invalidateQueries({
                                queryKey: ["inbox-stats"],
                              });
                            }}
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDelivery(delivery.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Szczegóły
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
                    ? "Nie masz oczekujących dokumentów do zaakceptowania"
                    : activeTab === "disputed"
                    ? "Nie masz zakwestionowanych dokumentów"
                    : "Twoja skrzynka biznesowa jest pusta"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Panel */}
      {selectedDelivery && (
        <InboxItemDetails
          deliveryId={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
        />
      )}
    </div>
  );
};

export default BusinessInbox;
