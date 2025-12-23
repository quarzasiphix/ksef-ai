import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Card, CardContent } from "@/shared/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DeliveryWithContext, DELIVERY_STATUS_LABELS } from "@/modules/invoices/delivery";
import { Loader2, Building2, Calendar, Eye, MessageSquare } from "lucide-react";

interface InboxItemDetailsProps {
  deliveryId: string;
  onClose: () => void;
}

export const InboxItemDetails = ({ deliveryId, onClose }: InboxItemDetailsProps) => {
  // Fetch delivery details
  const { data: delivery, isLoading } = useQuery({
    queryKey: ["delivery-details", deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_deliveries")
        .select(
          `
          *,
          sender:sender_business_profile_id(id, name, tax_id, address, city),
          dispute:document_disputes(*),
          settlement:payment_settlements(*)
        `
        )
        .eq("id", deliveryId)
        .single();

      if (error) throw error;
      return data as DeliveryWithContext;
    },
  });

  // Fetch delivery events
  const { data: events } = useQuery({
    queryKey: ["delivery-events", deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_events")
        .select("*")
        .eq("delivery_id", deliveryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch thread messages
  const { data: messages } = useQuery({
    queryKey: ["delivery-thread", deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_threads")
        .select(
          `
          *,
          author:author_business_profile_id(name)
        `
        )
        .eq("delivery_id", deliveryId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return (
    <Sheet open={!!deliveryId} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : delivery ? (
          <>
            <SheetHeader>
              <SheetTitle>Szczegóły dostawy</SheetTitle>
              <SheetDescription>
                Pełne informacje o dostarczonym dokumencie
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Status */}
              <div>
                <h3 className="text-sm font-medium mb-2">Status</h3>
                <Badge>{DELIVERY_STATUS_LABELS[delivery.delivery_status]}</Badge>
              </div>

              <Separator />

              {/* Sender Info */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nadawca
                </h3>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">{delivery.sender?.name}</span>
                      </div>
                      {delivery.sender?.tax_id && (
                        <div className="text-muted-foreground">
                          NIP: {delivery.sender.tax_id}
                        </div>
                      )}
                      {delivery.sender?.address && (
                        <div className="text-muted-foreground">
                          {delivery.sender.address}
                          {delivery.sender.city && `, ${delivery.sender.city}`}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Delivery Info */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Informacje o dostawie
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wysłano:</span>
                    <span>{new Date(delivery.sent_at).toLocaleString("pl-PL")}</span>
                  </div>
                  {delivery.first_viewed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pierwsze wyświetlenie:</span>
                      <span>{new Date(delivery.first_viewed_at).toLocaleString("pl-PL")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liczba wyświetleń:</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {delivery.view_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Metoda dostawy:</span>
                    <span>
                      {delivery.delivery_method === "in_app"
                        ? "W aplikacji"
                        : "Link publiczny"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dispute Info */}
              {delivery.dispute && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-orange-600">
                      Zakwestionowanie
                    </h3>
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="pt-4">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Powód:</span>{" "}
                            {delivery.dispute.dispute_reason}
                          </div>
                          {delivery.dispute.dispute_message && (
                            <div>
                              <span className="font-medium">Wiadomość:</span>
                              <p className="mt-1 text-muted-foreground">
                                {delivery.dispute.dispute_message}
                              </p>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Status rozwiązania:</span>{" "}
                            <Badge variant="outline">
                              {delivery.dispute.resolution_status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Payment Info */}
              {delivery.settlement && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-green-600">Płatność</h3>
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">Kwota:</span>
                            <span className="font-bold">
                              {delivery.settlement.amount_paid} {delivery.settlement.currency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Status:</span>
                            <Badge>{delivery.settlement.payment_status}</Badge>
                          </div>
                          {delivery.settlement.paid_at && (
                            <div className="flex justify-between">
                              <span className="font-medium">Opłacono:</span>
                              <span>
                                {new Date(delivery.settlement.paid_at).toLocaleString("pl-PL")}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Thread Messages */}
              {messages && messages.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Komunikacja ({messages.length})
                    </h3>
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <Card key={message.id}>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {message.author?.name || "Nieznany"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(message.created_at).toLocaleString("pl-PL")}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {message.message_text}
                              </p>
                              {message.is_internal && (
                                <Badge variant="secondary" className="text-xs">
                                  Wiadomość wewnętrzna
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Event Timeline */}
              {events && events.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3">Historia zdarzeń</h3>
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between text-sm py-2 border-l-2 border-muted pl-3"
                        >
                          <span className="font-medium">{event.event_type}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(event.created_at).toLocaleString("pl-PL")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Nie znaleziono dostawy
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
