import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { createPublicShareLink, getExistingContractShare, listShares, deleteShare, PublicShare } from "@/modules/invoices/data/publicShareRepository";
import { getLinksForContract } from "@/modules/contracts/data/contractInvoiceLinkRepository";
import { useAuth } from "@/shared/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/shared/ui/badge";
import { Trash2 } from "lucide-react";

interface ShareContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractNumber: string;
}

const ShareContractDialog: React.FC<ShareContractDialogProps> = ({ isOpen, onClose, contractId, contractNumber }) => {
  const { user } = useAuth();
  const [viewOnce, setViewOnce] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();

  // Active shares for this contract
  const { data: activeShares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ["contractShares", contractId, user?.id],
    queryFn: async () => {
      const all = await listShares(user!.id);
      return all.filter((s) => s.contract_id === contractId);
    },
    enabled: isOpen && !!user?.id,
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => deleteShare(id),
    onSuccess: () => {
      toast.success("Link usunięty");
      queryClient.invalidateQueries({ queryKey: ["contractShares", contractId] });
    },
    onError: () => toast.error("Nie udało się usunąć linku"),
  });

  const fetchExisting = async () => {
    try {
      const share = await getExistingContractShare(contractId);
      if (share) {
        setGeneratedLink(`${window.location.origin}/share/${share.slug}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (isOpen) fetchExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleGenerateLink = async () => {
    if (!user?.id) {
      toast.error("Musisz być zalogowany");
      return;
    }
    setIsLoading(true);
    try {
      // Detect linked invoice (first one)
      let linkedInvoiceId: string | undefined;
      try {
        const links = await getLinksForContract(contractId);
        if (links.length) {
          linkedInvoiceId = links[0].invoiceId;
        }
      } catch (err) {
        console.error("Error fetching contract links", err);
      }

      const share = await createPublicShareLink({
        contractId,
        invoiceId: linkedInvoiceId,
        type: linkedInvoiceId ? "combo" : "contract",
        viewOnce,
      });
      const url = `${window.location.origin}/share/${share.slug}`;
      setGeneratedLink(url);
      await navigator.clipboard.writeText(url);
      toast.success("Link został skopiowany do schowka");
    } catch (err) {
      console.error("Error generating share link", err);
      toast.error("Nie udało się wygenerować linku");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Udostępnij umowę {contractNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="viewOnce">Tylko jednorazowe wyświetlenie</Label>
            <Switch id="viewOnce" checked={viewOnce} onCheckedChange={setViewOnce} />
          </div>
          <Button variant="outline" onClick={handleGenerateLink} disabled={isLoading}>
            {generatedLink ? (isLoading ? "Generowanie..." : "Generuj nowy link") : (isLoading ? "Generowanie..." : "Wygeneruj i skopiuj link")}
          </Button>
          {generatedLink && (
            <div className="flex items-center gap-2 bg-muted p-2 rounded text-sm">
              <span className="truncate flex-1">{generatedLink}</span>
              <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(generatedLink!)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Active links */}
          {sharesLoading ? (
            <div className="text-sm text-muted-foreground">Ładowanie aktywnych linków...</div>
          ) : activeShares.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium">Aktywne linki ({activeShares.length})</p>
              {activeShares.map((s: PublicShare) => (
                <div key={s.id} className="flex items-center gap-2 bg-muted/50 p-2 rounded">
                  <a
                    href={`/share/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline truncate flex-1"
                  >
                    {window.location.origin}/share/{s.slug}
                  </a>
                  {s.view_once && <Badge variant="secondary">Jednorazowy</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/share/${s.slug}`);
                      toast.success("Skopiowano");
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
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Zamknij</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareContractDialog;