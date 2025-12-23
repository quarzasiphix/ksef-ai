import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Checkbox } from "@/shared/ui/checkbox";
import { XCircle, AlertTriangle } from "lucide-react";

export type RejectReason = 
  | "incorrect_nip"
  | "incorrect_items"
  | "duplicate"
  | "no_contract"
  | "wrong_company"
  | "other";

const rejectReasons: { value: RejectReason; label: string; description: string }[] = [
  { 
    value: "incorrect_nip", 
    label: "Błędny NIP / dane kontrahenta",
    description: "Nieprawidłowe dane identyfikacyjne wystawcy lub nabywcy"
  },
  { 
    value: "incorrect_items", 
    label: "Błędne pozycje / kwoty",
    description: "Nieprawidłowe pozycje faktury lub kwoty"
  },
  { 
    value: "duplicate", 
    label: "Faktura zdublowana",
    description: "Dokument został już wcześniej wystawiony"
  },
  { 
    value: "no_contract", 
    label: "Brak umowy / brak zamówienia",
    description: "Nie ma podstawy prawnej do wystawienia faktury"
  },
  { 
    value: "wrong_company", 
    label: "Nie nasza firma / nie dotyczy",
    description: "Faktura wystawiona na niewłaściwego odbiorcę"
  },
  { 
    value: "other", 
    label: "Inne",
    description: "Inny powód odrzucenia"
  }
];

interface RejectInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: RejectReason, comment: string, notifyCounterparty: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function RejectInvoiceModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false
}: RejectInvoiceModalProps) {
  const [selectedReason, setSelectedReason] = useState<RejectReason>("other");
  const [comment, setComment] = useState("");
  const [notifyCounterparty, setNotifyCounterparty] = useState(true);
  const [confirmReject, setConfirmReject] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() || !confirmReject) {
      return;
    }

    setProcessing(true);
    try {
      await onSubmit(selectedReason, comment, notifyCounterparty);
      // Reset form
      setSelectedReason("other");
      setComment("");
      setNotifyCounterparty(true);
      setConfirmReject(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error rejecting invoice:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setSelectedReason("other");
      setComment("");
      setNotifyCounterparty(true);
      setConfirmReject(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <XCircle className="h-6 w-6 text-red-600" />
            Odrzuć dokument
          </DialogTitle>
          <DialogDescription>
            Odrzucenie dokumentu jest operacją nieodwracalną. Jeśli dokument wymaga jedynie poprawek,
            użyj opcji "Wymagana korekta" zamiast odrzucenia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning */}
          <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Uwaga: Nieodwracalna operacja
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Odrzucenie dokumentu oznacza, że nie zostanie on zaakceptowany w obecnej formie.
                  Wystawca zostanie powiadomiony o odrzuceniu wraz z podanym powodem.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Kategoria powodu odrzucenia <span className="text-red-500">*</span>
            </Label>
            <RadioGroup value={selectedReason} onValueChange={(value) => setSelectedReason(value as RejectReason)}>
              <div className="space-y-3">
                {rejectReasons.map((reason) => (
                  <div key={reason.value} className="flex items-start space-x-3 space-y-0">
                    <RadioGroupItem value={reason.value} id={`reason-${reason.value}`} className="mt-1" />
                    <Label
                      htmlFor={`reason-${reason.value}`}
                      className="font-normal cursor-pointer flex-1"
                    >
                      <div>
                        <div className="font-semibold">{reason.label}</div>
                        <div className="text-sm text-muted-foreground">{reason.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <Label htmlFor="reject-comment" className="text-base font-semibold">
              Szczegółowy powód odrzucenia <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reject-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Podaj szczegółowy powód odrzucenia dokumentu..."
              rows={4}
              className="resize-none"
            />
            {!comment.trim() && (
              <p className="text-sm text-red-500">Opis powodu jest wymagany</p>
            )}
          </div>

          {/* Notification Option */}
          <div className="flex items-start space-x-3 space-y-0">
            <Checkbox
              id="notify-counterparty"
              checked={notifyCounterparty}
              onCheckedChange={(checked) => setNotifyCounterparty(checked as boolean)}
            />
            <Label
              htmlFor="notify-counterparty"
              className="font-normal cursor-pointer text-sm"
            >
              Powiadom kontrahenta natychmiast o odrzuceniu (zalecane)
            </Label>
          </div>

          {/* Confirmation Checkbox */}
          <div className="border-t pt-4">
            <div className="flex items-start space-x-3 space-y-0">
              <Checkbox
                id="confirm-reject"
                checked={confirmReject}
                onCheckedChange={(checked) => setConfirmReject(checked as boolean)}
              />
              <Label
                htmlFor="confirm-reject"
                className="font-semibold cursor-pointer text-sm"
              >
                Potwierdzam, że chcę odrzucić ten dokument (operacja nieodwracalna)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={processing || isLoading}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={processing || isLoading || !comment.trim() || !confirmReject}
            variant="destructive"
          >
            {processing || isLoading ? "Przetwarzanie..." : "Potwierdź odrzucenie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
