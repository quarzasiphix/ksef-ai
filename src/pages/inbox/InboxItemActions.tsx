import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DisputeReason, DISPUTE_REASON_LABELS } from "@/types/delivery";

interface InboxItemActionsProps {
  deliveryId: string;
  onActionComplete: () => void;
}

type ActionType = "accept" | "dispute" | "reject" | null;

export const InboxItemActions = ({ deliveryId, onActionComplete }: InboxItemActionsProps) => {
  const { user } = useAuth();
  const [actionType, setActionType] = useState<ActionType>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>("incorrect_amount");
  const [disputeMessage, setDisputeMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // Accept delivery
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("document_deliveries")
        .update({
          delivery_status: "accepted",
          responded_at: new Date().toISOString(),
          responded_by_user_id: user?.id,
        })
        .eq("id", deliveryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dokument zaakceptowany");
      setActionType(null);
      onActionComplete();
    },
    onError: (error) => {
      toast.error("Błąd podczas akceptacji dokumentu");
      console.error(error);
    },
  });

  // Dispute delivery
  const disputeMutation = useMutation({
    mutationFn: async () => {
      // Update delivery status
      const { error: deliveryError } = await supabase
        .from("document_deliveries")
        .update({
          delivery_status: "disputed",
          responded_at: new Date().toISOString(),
          responded_by_user_id: user?.id,
        })
        .eq("id", deliveryId);

      if (deliveryError) throw deliveryError;

      // Create dispute record
      const { error: disputeError } = await supabase.from("document_disputes").insert({
        delivery_id: deliveryId,
        dispute_reason: disputeReason,
        dispute_message: disputeMessage,
        disputed_by_user_id: user?.id,
      });

      if (disputeError) throw disputeError;
    },
    onSuccess: () => {
      toast.success("Dokument zakwestionowany");
      setActionType(null);
      setDisputeMessage("");
      onActionComplete();
    },
    onError: (error) => {
      toast.error("Błąd podczas kwestionowania dokumentu");
      console.error(error);
    },
  });

  // Reject delivery
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("document_deliveries")
        .update({
          delivery_status: "rejected",
          responded_at: new Date().toISOString(),
          responded_by_user_id: user?.id,
        })
        .eq("id", deliveryId);

      if (error) throw error;

      // Log rejection reason in thread
      if (rejectReason) {
        await supabase.from("document_threads").insert({
          delivery_id: deliveryId,
          message_type: "comment",
          message_text: `Dokument odrzucony: ${rejectReason}`,
          author_user_id: user?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Dokument odrzucony");
      setActionType(null);
      setRejectReason("");
      onActionComplete();
    },
    onError: (error) => {
      toast.error("Błąd podczas odrzucania dokumentu");
      console.error(error);
    },
  });

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => setActionType("accept")}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Akceptuj
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActionType("dispute")}
          className="border-orange-500 text-orange-600 hover:bg-orange-50"
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Kwestionuj
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActionType("reject")}
          className="border-red-500 text-red-600 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Odrzuć
        </Button>
      </div>

      {/* Accept Dialog */}
      <Dialog open={actionType === "accept"} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zaakceptuj dokument</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz zaakceptować ten dokument? Dokument zostanie oznaczony jako
              zaakceptowany i będzie gotowy do księgowania.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Anuluj
            </Button>
            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {acceptMutation.isPending ? "Akceptowanie..." : "Zaakceptuj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={actionType === "dispute"} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zakwestionuj dokument</DialogTitle>
            <DialogDescription>
              Wybierz powód zakwestionowania i opcjonalnie dodaj wiadomość dla nadawcy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Powód zakwestionowania</label>
              <Select
                value={disputeReason}
                onValueChange={(value) => setDisputeReason(value as DisputeReason)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DISPUTE_REASON_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Wiadomość (opcjonalnie)
                {disputeReason === "other" && (
                  <span className="text-red-500 ml-1">*wymagane dla "Inne"</span>
                )}
              </label>
              <Textarea
                value={disputeMessage}
                onChange={(e) => setDisputeMessage(e.target.value)}
                placeholder="Opisz szczegóły problemu..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Anuluj
            </Button>
            <Button
              onClick={() => disputeMutation.mutate()}
              disabled={
                disputeMutation.isPending ||
                (disputeReason === "other" && disputeMessage.trim().length < 10)
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              {disputeMutation.isPending ? "Kwestionowanie..." : "Zakwestionuj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === "reject"} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odrzuć dokument</DialogTitle>
            <DialogDescription>
              Odrzucenie dokumentu oznacza, że został wysłany do niewłaściwej firmy lub zawiera
              całkowicie błędne dane. Nadawca zostanie o tym powiadomiony.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Powód odrzucenia (opcjonalnie)</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Np. 'Dokument wysłany do niewłaściwej firmy' lub 'Nie zlecaliśmy tej usługi'"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Anuluj
            </Button>
            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              variant="destructive"
            >
              {rejectMutation.isPending ? "Odrzucanie..." : "Odrzuć"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
