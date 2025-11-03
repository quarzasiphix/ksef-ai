import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { shareInvoiceWithUser } from "@/integrations/supabase/repositories/invoiceShareRepository";
import { useAuth } from "@/hooks/useAuth";
import { CustomerSelector } from "@/components/invoices/selectors/CustomerSelector";
import { useGlobalData } from "@/hooks/use-global-data";
import { createPublicShareLink, getExistingInvoiceShare, listShares, deleteShare, PublicShare } from "@/integrations/supabase/repositories/publicShareRepository";
import { getLinksForInvoice } from "@/integrations/supabase/repositories/contractInvoiceLinkRepository";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface ShareInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  defaultReceiverTaxId?: string;
  defaultCustomerId?: string;
}

const ShareInvoiceDialog: React.FC<ShareInvoiceDialogProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  defaultReceiverTaxId,
  defaultCustomerId,
}) => {
  const { user } = useAuth();
  const { customers: { data: customers } } = useGlobalData();
  const [receiverTaxId, setReceiverTaxId] = useState(defaultReceiverTaxId || "");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(defaultCustomerId);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [currentTab, setCurrentTab] = useState<'user' | 'link'>('user');

  const queryClient = useQueryClient();

  // Fetch active share links for this invoice
  const { data: activeShares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ["invoiceShares", invoiceId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const all = await listShares(user.id);
      return all.filter((s) => s.invoice_id === invoiceId);
    },
    enabled: isOpen && currentTab === 'link' && !!user?.id,
  });

  // Delete share mutation
  const delMutation = useMutation({
    mutationFn: async (shareId: string) => {
      // First try to delete by ID, then by slug if that fails
      try {
        await deleteShare(shareId);
      } catch (err) {
        console.error('Error deleting share:', err);
        throw err;
      }
    },
    onSuccess: () => {
      toast.success("Link usunięty");
      queryClient.invalidateQueries({ queryKey: ["invoiceShares", invoiceId] });
      setGeneratedLink(null);
    },
    onError: () => toast.error("Nie udało się usunąć linku"),
  });

  const handleCustomerChange = (id: string, _name?: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust?.taxId) {
      setReceiverTaxId(cust.taxId);
    }
  };

  const fetchExisting = async () => {
    if (!user?.id) return;
    
    // Check if share already exists
    const existing = await getExistingInvoiceShare(invoiceId);
    if (existing) {
      setGeneratedLink(`${window.location.origin}/share/${existing.slug}`);
      return;
    }
    
    // If no existing share, reset the generated link
    setGeneratedLink(null);
  };

  useEffect(() => {
    if (isOpen && currentTab==='link') fetchExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentTab]);

  const handleGenerateLink = async () => {
    if (!user?.id) {
      toast.error("Musisz być zalogowany");
      return;
    }
    try {
      let bankAccount: string | null = null;
      // Detect linked contract (first one)
      let linkedContractId: string | undefined;

      // Fetch invoice with related business profile to get bank account if payment method is transfer
      const { data: inv } = await (supabase as any)
        .from("invoices")
        .select("payment_method,business_profiles:business_profile_id(bank_account)")
        .eq("id", invoiceId)
        .single();

      if (inv?.payment_method === "transfer") {
        bankAccount = inv?.business_profiles?.bank_account || null;
      }

      // Fetch linked contract ID (if any)
      try {
        const links = await getLinksForInvoice(invoiceId);
        if (links.length) {
          linkedContractId = links[0].contractId;
        }
      } catch (err) {
        console.error("Error fetching invoice links", err);
      }

      const share = await createPublicShareLink({
        userId: user.id,
        invoiceId,
        contractId: linkedContractId,
        type: linkedContractId ? "combo" : "invoice",
        bankAccount,
        viewOnce,
      });
      const url = `${window.location.origin}/share/${share.slug}`;
      setGeneratedLink(url);
      await navigator.clipboard.writeText(url);
      toast.success("Link został skopiowany do schowka");
    } catch (err) {
      console.error("Error generating share link", err);
      toast.error("Nie udało się wygenerować linku");
    }
  };

  const handleShare = async () => {
    if (!user?.id) {
      toast.error("Musisz być zalogowany");
      return;
    }

    if (!receiverTaxId.trim()) {
      toast.error("Podaj NIP odbiorcy");
      return;
    }

    setIsLoading(true);
    try {
      await shareInvoiceWithUser(invoiceId, user.id, receiverTaxId.trim(), notes.trim() || undefined);
      toast.success("Faktura została udostępniona");
      onClose();
      setReceiverTaxId("");
      setNotes("");
    } catch (error) {
      console.error("Error sharing invoice:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Nie udało się udostępnić faktury");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[540px]"
        aria-describedby="share-invoice-description"
      >
        {/* Visually hidden description for a11y */}
        <span id="share-invoice-description" className="sr-only">
          Wybierz opcję udostępniania faktury: bezpośrednio do klienta w systemie lub poprzez publiczny link.
        </span>
        <DialogHeader>
          <DialogTitle>Udostępnij fakturę {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Tabs value={currentTab} onValueChange={(val) => setCurrentTab(val as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="user">Klient w systemie</TabsTrigger>
              <TabsTrigger value="link">Publiczny link</TabsTrigger>
            </TabsList>

            {/* ------- Share to user tab ------- */}
            <TabsContent value="user" className="space-y-4">
              <div className="space-y-2">
                <Label>Wybierz klienta</Label>
                <CustomerSelector
                  value={selectedCustomerId || ""}
                  onChange={(cid, name) => handleCustomerChange(cid, name)}
                  showBusinessProfiles={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiverTaxId">NIP odbiorcy</Label>
                <Input
                  id="receiverTaxId"
                  placeholder="Podaj NIP odbiorcy"
                  value={receiverTaxId}
                  onChange={(e) => setReceiverTaxId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notatka (opcjonalnie)</Label>
                <Textarea
                  id="notes"
                  placeholder="Dodaj notatkę..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* ------- Public link tab ------- */}
            <TabsContent value="link" className="space-y-4">
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

              {/* Existing active links */}
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
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
          {currentTab === 'user' && (
            <Button onClick={handleShare} disabled={isLoading}>
              {isLoading ? "Udostępnianie..." : "Wyślij klientowi"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareInvoiceDialog;
