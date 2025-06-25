import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listShares, deleteShare, PublicShare } from "@/integrations/supabase/repositories/publicShareRepository";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalData } from "@/hooks/use-global-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const ShareTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, string> = {
    invoice: "Faktura",
    contract: "Umowa",
    combo: "Dokumenty",
  };
  return <Badge variant="outline">{map[type] || type}</Badge>;
};

const SharedLinksPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { invoices: { data: invoices } } = useGlobalData();

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["shares"],
    queryFn: () => listShares(),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteShare(id),
    onSuccess: () => {
      toast.success("Udostępnienie zostało usunięte");
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
    onError: () => toast.error("Nie udało się usunąć linku"),
  });

  const getDocLabel = async (share: PublicShare): Promise<string> => {
    if (share.invoice_id) {
      const inv = invoices.find((i) => i.id === share.invoice_id);
      if (inv) return inv.number;
    }
    if (share.contract_id) {
      const { data } = await (supabase as any)
        .from("contracts")
        .select("number")
        .eq("id", share.contract_id)
        .single();
      if (data?.number) return data.number as string;
    }
    return "—";
  };

  if (!user) {
    return <div className="text-center py-8">Musisz być zalogowany.</div>;
  }

  return (
    <div className="space-y-6 px-2">
      <div>
        <h1 className="text-3xl font-bold">Udostępnione linki</h1>
        <p className="text-muted-foreground">Zarządzaj aktywnymi linkami publicznymi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktywne linki ({shares.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8">Brak aktywnych linków</div>
          ) : (
            <div className="space-y-2">
              {shares.map((s: PublicShare) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border p-3 rounded-md"
                >
                  <div className="flex-1 space-y-1">
                    <a
                      href={`/share/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline break-all"
                    >
                      {window.location.origin}/share/{s.slug}
                    </a>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <ShareTypeBadge type={s.share_type} />
                      <span className="font-medium">
                        <React.Suspense fallback="...">
                          <AsyncLabel share={s} getter={getDocLabel} />
                        </React.Suspense>
                      </span>
                      <span>• Utworzono {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
                      {s.view_once && <Badge variant="secondary">Jednorazowy</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/share/${s.slug}`);
                        toast.success("Skopiowano link");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => delMutation.mutate(s.id)}
                      disabled={delMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SharedLinksPage;

// Async label component using suspense
const AsyncLabel: React.FC<{ share: PublicShare; getter: (s: PublicShare)=>Promise<string>; }> = ({ share, getter }) => {
  const { data } = useQuery({
    queryKey: ["share-label", share.id],
    queryFn: () => getter(share),
  });
  return <>{data || "—"}</>;
}; 