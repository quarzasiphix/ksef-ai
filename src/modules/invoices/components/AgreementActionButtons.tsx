import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { CheckCircle2, XCircle, AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";

interface AgreementActionButtonsProps {
  invoiceId: string;
  currentStatus: string;
  onStatusChange: (newStatus: string, action: string, comment?: string) => Promise<void>;
  isLoading?: boolean;
}

export function AgreementActionButtons({
  invoiceId,
  currentStatus,
  onStatusChange,
  isLoading = false
}: AgreementActionButtonsProps) {
  const [showAgreeDialog, setShowAgreeDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleAgree = async () => {
    setProcessing(true);
    try {
      await onStatusChange('approved', 'approved', comment || undefined);
      toast.success("Dokument uzgodniony i zablokowany do księgowania");
      setShowAgreeDialog(false);
      setComment("");
    } catch (error) {
      toast.error("Nie udało się uzgodnić dokumentu");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error("Podaj powód odrzucenia");
      return;
    }
    
    setProcessing(true);
    try {
      await onStatusChange('rejected', 'rejected', comment);
      toast.success("Dokument odrzucony");
      setShowRejectDialog(false);
      setComment("");
    } catch (error) {
      toast.error("Nie udało się odrzucić dokumentu");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!comment.trim()) {
      toast.error("Opisz wymagane poprawki");
      return;
    }
    
    setProcessing(true);
    try {
      await onStatusChange('correction_needed', 'corrected', comment);
      toast.success("Wysłano prośbę o korektę");
      setShowCorrectionDialog(false);
      setComment("");
    } catch (error) {
      toast.error("Nie udało się wysłać prośby o korektę");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Only show buttons for received or under_discussion status
  if (!['received', 'under_discussion', 'correction_needed'].includes(currentStatus)) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Agree & Lock Button - Primary Action */}
        <Button
          onClick={() => setShowAgreeDialog(true)}
          disabled={isLoading || processing}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
          size="lg"
        >
          <Lock className="h-4 w-4 mr-2" />
          Uzgodnij i zablokuj do księgowania
        </Button>

        {/* Request Correction Button */}
        <Button
          onClick={() => setShowCorrectionDialog(true)}
          disabled={isLoading || processing}
          variant="outline"
          className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
          size="lg"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Wymagana korekta
        </Button>

        {/* Reject Button */}
        <Button
          onClick={() => setShowRejectDialog(true)}
          disabled={isLoading || processing}
          variant="outline"
          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
          size="lg"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Odrzuć
        </Button>
      </div>

      {/* Agree Dialog */}
      <Dialog open={showAgreeDialog} onOpenChange={setShowAgreeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              Uzgodnij i zablokuj do księgowania
            </DialogTitle>
            <DialogDescription>
              Po uzgodnieniu dokument zostanie zablokowany i automatycznie przekazany do systemu księgowego.
              Ta operacja jest nieodwracalna i stanowi potwierdzenie zgodności dokumentu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Efekt prawny:</strong> Uzgodnienie dokumentu stanowi potwierdzenie jego poprawności
                i zgodności z umową. Dokument zostanie automatycznie przekazany do księgowości.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Komentarz (opcjonalnie)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Dodatkowe uwagi do uzgodnienia..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAgreeDialog(false);
                setComment("");
              }}
              disabled={processing}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleAgree}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? "Przetwarzanie..." : "Potwierdź uzgodnienie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Correction Dialog */}
      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Wymagana korekta dokumentu
            </DialogTitle>
            <DialogDescription>
              Opisz szczegółowo wymagane poprawki. Wystawca otrzyma powiadomienie i będzie mógł wprowadzić zmiany.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Opis wymaganych poprawek <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Np. Pozycja 3 powinna wynosić 1000 PLN zamiast 1200 PLN..."
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCorrectionDialog(false);
                setComment("");
              }}
              disabled={processing}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleRequestCorrection}
              disabled={processing || !comment.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {processing ? "Wysyłanie..." : "Wyślij prośbę o korektę"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Odrzuć dokument
            </DialogTitle>
            <DialogDescription>
              Odrzucenie dokumentu jest operacją nieodwracalną. Wystawca zostanie powiadomiony o odrzuceniu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-900 dark:text-red-100">
                <strong>Uwaga:</strong> Odrzucenie dokumentu oznacza, że nie zostanie on zaakceptowany
                w obecnej formie. Jeśli dokument wymaga jedynie poprawek, użyj opcji "Wymagana korekta".
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Powód odrzucenia <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Podaj szczegółowy powód odrzucenia dokumentu..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setComment("");
              }}
              disabled={processing}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !comment.trim()}
              variant="destructive"
            >
              {processing ? "Przetwarzanie..." : "Potwierdź odrzucenie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
