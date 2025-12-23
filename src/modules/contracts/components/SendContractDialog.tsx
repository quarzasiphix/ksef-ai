import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Send, FileText, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useQuery } from "@tanstack/react-query";
import { getInvoices } from "@/integrations/supabase/repositories/invoiceRepository";
import { useAuth } from "@/shared/hooks/useAuth";

interface SendContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractNumber: string;
  onSuccess?: () => void;
}

export function SendContractDialog({
  isOpen,
  onClose,
  contractId,
  contractNumber,
  onSuccess
}: SendContractDialogProps) {
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  const [recipientTaxId, setRecipientTaxId] = useState("");
  const [message, setMessage] = useState("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showInvoicePicker, setShowInvoicePicker] = useState(false);

  // Fetch user's invoices for attachment
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", user?.id, selectedProfileId],
    queryFn: () => user?.id && selectedProfileId ? getInvoices(user.id, selectedProfileId) : Promise.resolve([]),
    enabled: !!user?.id && !!selectedProfileId && isOpen,
  });

  const handleSend = async () => {
    if (!recipientTaxId.trim()) {
      toast.error("Podaj NIP odbiorcy");
      return;
    }

    if (!selectedProfileId) {
      toast.error("Wybierz profil biznesowy");
      return;
    }

    setIsSending(true);
    try {
      // Find recipient by tax ID
      const { data: recipientData, error: recipientError } = await supabase.rpc('find_user_by_tax_id', {
        tax_id_param: recipientTaxId
      });

      if (recipientError || !recipientData || recipientData.length === 0) {
        toast.error("Nie znaleziono odbiorcy o podanym NIP");
        setIsSending(false);
        return;
      }

      const recipient = recipientData[0];

      // Send contract via RPC
      const { data: deliveryId, error: sendError } = await supabase.rpc('send_contract_delivery', {
        p_contract_id: contractId,
        p_sender_business_profile_id: selectedProfileId,
        p_recipient_business_profile_id: recipient.business_profile_id,
        p_attached_invoice_ids: selectedInvoiceIds,
        p_message: message || null
      });

      if (sendError) throw sendError;

      toast.success(
        selectedInvoiceIds.length > 0
          ? `Wysłano umowę z ${selectedInvoiceIds.length} załączoną fakturą/ami`
          : "Wysłano umowę"
      );
      
      onSuccess?.();
      onClose();
      
      // Reset form
      setRecipientTaxId("");
      setMessage("");
      setSelectedInvoiceIds([]);
    } catch (error) {
      console.error("Error sending contract:", error);
      toast.error("Nie udało się wysłać umowy");
    } finally {
      setIsSending(false);
    }
  };

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Wyślij umowę: {contractNumber}
          </DialogTitle>
          <DialogDescription>
            Wyślij umowę bezpośrednio do kontrahenta przez sieć KsięgaI.
            Możesz dołączyć faktury powiązane z tą umową.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="recipient-tax-id">
              NIP odbiorcy <span className="text-red-500">*</span>
            </Label>
            <Input
              id="recipient-tax-id"
              placeholder="1234567890"
              value={recipientTaxId}
              onChange={(e) => setRecipientTaxId(e.target.value)}
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              System znajdzie odbiorcę w sieci KsięgaI po NIP
            </p>
          </div>

          {/* Attached Invoices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Dołącz faktury (opcjonalnie)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInvoicePicker(!showInvoicePicker)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {showInvoicePicker ? "Ukryj" : "Wybierz faktury"}
              </Button>
            </div>

            {selectedInvoiceIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedInvoiceIds.map(id => {
                  const invoice = invoices.find(inv => inv.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-2">
                      <FileText className="h-3 w-3" />
                      {invoice?.number || id.slice(0, 8)}
                      <button
                        type="button"
                        onClick={() => toggleInvoice(id)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {showInvoicePicker && (
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Brak faktur do załączenia
                  </p>
                ) : (
                  invoices.map(invoice => (
                    <div
                      key={invoice.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => toggleInvoice(invoice.id)}
                    >
                      <Checkbox
                        checked={selectedInvoiceIds.includes(invoice.id)}
                        onCheckedChange={() => toggleInvoice(invoice.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{invoice.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.issueDate).toLocaleDateString("pl-PL")} •{" "}
                          {invoice.totalGrossValue?.toFixed(2)} PLN
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Wiadomość (opcjonalnie)</Label>
            <Textarea
              id="message"
              placeholder="Dodaj wiadomość do umowy..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Bezpieczne dostarczenie:</strong> Umowa zostanie dostarczona przez
              zweryfikowaną sieć KsięgaI. Odbiorca otrzyma powiadomienie i będzie mógł
              zaakceptować, zakwestionować lub odrzucić umowę przed podpisaniem.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !recipientTaxId.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              "Wysyłanie..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Wyślij umowę
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
