import React, { useState } from "react";
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

  const handleCustomerChange = (id: string, _name?: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust?.taxId) {
      setReceiverTaxId(cust.taxId);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Udostępnij fakturę {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
              placeholder="Dodaj notatkę do udostępnionej faktury..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button onClick={handleShare} disabled={isLoading}>
            {isLoading ? "Udostępnianie..." : "Udostępnij"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareInvoiceDialog;
