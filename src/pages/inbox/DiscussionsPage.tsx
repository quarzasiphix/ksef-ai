import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessagesSquare,
  Search,
  ArrowRight,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface DiscussionThread {
  id: string;
  invoice_id: string;
  created_at: string;
  updated_at: string;
  invoice: {
    number: string;
    issue_date: string;
    total_gross_value: number;
    currency: string;
  };
  sender: {
    name: string;
  };
  buyer: {
    name: string;
  };
  message_count: number;
  last_message_at: string;
}

export const DiscussionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: discussions, isLoading } = useQuery({
    queryKey: ["active-discussions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch discussion threads with invoice and message info
      const { data, error } = await supabase
        .from("discussion_threads")
        .select(`
          id,
          invoice_id,
          created_at,
          updated_at,
          invoices!inner (
            number,
            issue_date,
            total_gross_value,
            currency,
            business_profile_id,
            customer_id
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching discussions:", error);
        return [];
      }

      // Fetch message counts for each thread
      const threadsWithCounts = await Promise.all(
        (data || []).map(async (thread: any) => {
          const { count } = await supabase
            .from("discussion_messages")
            .select("*", { count: "exact", head: true })
            .eq("thread_id", thread.id);

          const { data: lastMessage } = await supabase
            .from("discussion_messages")
            .select("created_at")
            .eq("thread_id", thread.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Fetch sender and buyer info
          const { data: sender } = await supabase
            .from("business_profiles")
            .select("name")
            .eq("id", thread.invoices.business_profile_id)
            .single();

          const { data: buyer } = await supabase
            .from("customers")
            .select("name")
            .eq("id", thread.invoices.customer_id)
            .single();

          return {
            id: thread.id,
            invoice_id: thread.invoice_id,
            created_at: thread.created_at,
            updated_at: thread.updated_at,
            invoice: {
              number: thread.invoices.number,
              issue_date: thread.invoices.issue_date,
              total_gross_value: thread.invoices.total_gross_value,
              currency: thread.invoices.currency,
            },
            sender: sender || { name: "Nieznany" },
            buyer: buyer || { name: "Nieznany" },
            message_count: count || 0,
            last_message_at: lastMessage?.created_at || thread.created_at,
          };
        })
      );

      return threadsWithCounts as DiscussionThread[];
    },
    enabled: !!user?.id,
  });

  const filteredDiscussions = discussions?.filter((discussion) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      discussion.invoice.number.toLowerCase().includes(search) ||
      discussion.sender.name.toLowerCase().includes(search) ||
      discussion.buyer.name.toLowerCase().includes(search)
    );
  });

  const handleDiscussionClick = (discussion: DiscussionThread) => {
    // Navigate to invoice detail with discussion section
    navigate(`/inbox/invoice/${discussion.invoice_id}?section=discussion`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie dyskusji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MessagesSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Aktywne dyskusje</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Wszystkie rozmowy dotyczące faktur z kontrahentami
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po numerze faktury lub nazwie kontrahenta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Discussions List */}
      {!filteredDiscussions || filteredDiscussions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessagesSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Brak aktywnych dyskusji</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nie znaleziono dyskusji pasujących do wyszukiwania"
                : "Rozpocznij dyskusję z kontrahentem w szczegółach faktury"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDiscussions.map((discussion) => (
            <Card
              key={discussion.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleDiscussionClick(discussion)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">
                        {discussion.invoice.number}
                      </CardTitle>
                      <Badge variant="secondary" className="gap-1">
                        <MessagesSquare className="h-3 w-3" />
                        {discussion.message_count}{" "}
                        {discussion.message_count === 1 ? "wiadomość" : "wiadomości"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span>Od: {discussion.sender.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span>Do: {discussion.buyer.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(discussion.invoice.issue_date), "dd MMM yyyy", {
                            locale: pl,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {formatCurrency(
                        discussion.invoice.total_gross_value,
                        discussion.invoice.currency
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="gap-2">
                      Zobacz
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>
                    Ostatnia aktywność:{" "}
                    {format(new Date(discussion.last_message_at), "dd MMM yyyy, HH:mm", {
                      locale: pl,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionsPage;
