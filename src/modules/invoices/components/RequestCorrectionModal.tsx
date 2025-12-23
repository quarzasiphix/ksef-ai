import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type CorrectionReason = 
  | "kwota"
  | "vat"
  | "dane"
  | "termin"
  | "pozycje"
  | "opis"
  | "waluta"
  | "inne";

const correctionReasons: { value: CorrectionReason; label: string }[] = [
  { value: "kwota", label: "Kwota" },
  { value: "vat", label: "VAT" },
  { value: "dane", label: "Dane kontrahenta" },
  { value: "termin", label: "Termin płatności" },
  { value: "pozycje", label: "Pozycje faktury" },
  { value: "opis", label: "Opis/uwagi" },
  { value: "waluta", label: "Waluta" },
  { value: "inne", label: "Inne" }
];

interface RequestCorrectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reasons: CorrectionReason[], comment: string) => Promise<void>;
  isLoading?: boolean;
}

export function RequestCorrectionModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false
}: RequestCorrectionModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<CorrectionReason[]>([]);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const toggleReason = (reason: CorrectionReason) => {
    setSelectedReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      return;
    }
    if (!comment.trim()) {
      return;
    }

    setProcessing(true);
    try {
      await onSubmit(selectedReasons, comment);
      // Reset form
      setSelectedReasons([]);
      setComment("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting correction request:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setSelectedReasons([]);
      setComment("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            Poproś o korektę
          </DialogTitle>
          <DialogDescription>
            Wskaż, co wymaga poprawienia i opisz szczegółowo wymagane zmiany.
            Wystawca otrzyma powiadomienie i będzie mógł wprowadzić poprawki.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Co wymaga poprawienia? <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Wybierz jedną lub więcej kategorii (kliknij, aby zaznaczyć)
            </p>
            <div className="flex flex-wrap gap-2">
              {correctionReasons.map((reason) => (
                <Badge
                  key={reason.value}
                  variant={selectedReasons.includes(reason.value) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    selectedReasons.includes(reason.value)
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "hover:bg-orange-50 hover:border-orange-300"
                  )}
                  onClick={() => toggleReason(reason.value)}
                >
                  {selectedReasons.includes(reason.value) && (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  {reason.label}
                </Badge>
              ))}
            </div>
            {selectedReasons.length === 0 && (
              <p className="text-sm text-red-500">Wybierz co najmniej jedną kategorię</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <Label htmlFor="correction-comment" className="text-base font-semibold">
              Opis wymaganych poprawek <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Opisz szczegółowo, co należy poprawić (1-2 zdania wystarczą)
            </p>
            <Textarea
              id="correction-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Np. Pozycja 3 powinna wynosić 1000 PLN zamiast 1200 PLN. Proszę o poprawienie kwoty netto i VAT."
              rows={4}
              className="resize-none"
            />
            {!comment.trim() && selectedReasons.length > 0 && (
              <p className="text-sm text-red-500">Opis jest wymagany</p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Co się stanie?</strong> Wystawca otrzyma powiadomienie z Twoją prośbą o korektę.
              Status dokumentu zmieni się na "Wymaga korekty". Po wprowadzeniu zmian przez wystawcę,
              otrzymasz powiadomienie o nowej wersji dokumentu.
            </p>
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
            disabled={processing || isLoading || selectedReasons.length === 0 || !comment.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {processing || isLoading ? "Wysyłanie..." : "Wyślij prośbę o korektę"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
