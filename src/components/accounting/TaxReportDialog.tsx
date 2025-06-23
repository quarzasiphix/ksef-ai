import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TaxReport } from "./TaxReportsCard";
import type { FiledTaxForm } from "@/integrations/supabase/repositories/filedTaxFormsRepository";

interface TaxReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: TaxReport;
  monthLabel: string; // e.g. "06/2025"
  filed?: FiledTaxForm;
  monthIncome: number;
  monthExpenses: number;
  onGenerate: () => void | Promise<void>;
  onUpload?: (file: File) => void | Promise<void>;
  onMarkFiled?: () => void | Promise<void>;
}

const explanations: Record<string, string> = {
  "JPK_V7M": "Jednolity Plik Kontrolny VAT (miesięczny). Przekazywany do Ministerstwa Finansów, zawiera ewidencję sprzedaży i zakupów VAT.",
  "PIT zaliczka": "Miesięczna zaliczka na podatek dochodowy od osób fizycznych.",
  "Deklaracja ZUS (DRA)": "Deklaracja rozliczeniowa ZUS zawierająca składki społeczne i zdrowotne.",
};

export default function TaxReportDialog({ open, onOpenChange, report, monthLabel, filed, monthIncome, monthExpenses, onGenerate, onUpload, onMarkFiled }: TaxReportDialogProps) {
  const [isMarking, setIsMarking] = React.useState(false);

  const handleMarkFiled = async () => {
    if (!onMarkFiled) return;
    try {
      setIsMarking(true);
      await onMarkFiled();
      // Close dialog after successful mark to provide immediate feedback
      onOpenChange(false);
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{report.name} – {monthLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>{explanations[report.name] || "Deklaracja podatkowa."}</p>
          <div className="bg-muted rounded p-3 space-y-1 text-xs">
            <p><span className="font-medium">Przychody:</span> {monthIncome.toLocaleString("pl-PL")} PLN</p>
            <p><span className="font-medium">Wydatki:</span> {monthExpenses.toLocaleString("pl-PL")} PLN</p>
          </div>

          {filed ? (
            <div className="text-green-700 space-y-1">
              <p className="font-medium">Plik złożony:</p>
              <a href={filed.file_url} target="_blank" rel="noopener noreferrer" className="underline break-all text-sm">{filed.file_url}</a>
            </div>
          ) : (
            <p className="text-amber-700">Brak złożonego pliku.</p>
          )}
        </div>
        <DialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button onClick={onGenerate} size="sm">{filed ? "Ponownie generuj XML" : "Generuj XML"}</Button>
          {!filed && onUpload && (
            <label className="inline-flex items-center text-sm cursor-pointer">
              <input type="file" accept="application/xml" className="hidden" onChange={e => { const f=e.target.files?.[0]; if (f) onUpload(f); e.target.value=""; }} />
              <span className="px-3 py-2 border rounded-md">Wyślij złożony plik</span>
            </label>
          )}
          {filed && filed.status !== "filed" && onMarkFiled && (
            <Button variant="outline" size="sm" onClick={handleMarkFiled} disabled={isMarking}>
              {isMarking ? "Zapisywanie..." : "Oznacz jako złożone"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 